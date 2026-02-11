import { z } from "zod";
import { getVoiceConfig, MAX_TTS_TEXT_LENGTH } from "@/lib/ai/voice-config";
import { getMessageCountByUserId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { apiRequestLogger } from "@/lib/api-logging";
import { recordAnalytics } from "@/lib/analytics/queries";
import { voiceBreadcrumb } from "@/lib/sentry";
import { after } from "next/server";
import {
  CircuitBreakerError,
  withElevenLabsResilience,
} from "@/lib/resilience";
import {
  checkRateLimit,
  getRateLimitHeaders,
} from "@/lib/security/rate-limiter";
import { withCsrf } from "@/lib/security/with-csrf";
import { createClient } from "@/lib/supabase/server";

// Zod schema for voice API input validation
const voiceRequestSchema = z.object({
  text: z.string().min(1, "Text is required").max(MAX_TTS_TEXT_LENGTH),
  botType: z.enum(["alexandria", "kim", "collaborative"]),
});

export const maxDuration = 60; // Increased for collaborative multi-voice

// Max voice requests per day (separate from chat limit)
const MAX_VOICE_REQUESTS_PER_DAY = 500;

export const POST = withCsrf(async (request: Request) => {
  const apiLog = apiRequestLogger("/api/voice");
  apiLog.start();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    // Rate limit voice API to prevent abuse
    // Skip rate limiting if Redis not available (allows voice to work without Redis)
    const rateLimitResult = await checkRateLimit(
      `voice:${user.id}`,
      MAX_VOICE_REQUESTS_PER_DAY,
    );

    if (rateLimitResult.source === "redis") {
      // Redis is available, use its result
      if (!rateLimitResult.allowed) {
        const response = new ChatSDKError("rate_limit:chat").toResponse();
        const headers = getRateLimitHeaders(
          rateLimitResult.remaining,
          MAX_VOICE_REQUESTS_PER_DAY,
          rateLimitResult.reset,
        );
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
        return response;
      }
    } else {
      // SECURITY: Redis unavailable - verify via database (fail closed)
      // Voice API is expensive (ElevenLabs costs), so we must enforce limits
      const messageCount = await getMessageCountByUserId({
        id: user.id,
        differenceInHours: 24,
      });

      if (messageCount >= MAX_VOICE_REQUESTS_PER_DAY) {
        return new ChatSDKError("rate_limit:chat").toResponse();
      }
    }

    // Validate input with Zod schema
    const parseResult = voiceRequestSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return new ChatSDKError("bad_request:api").toResponse();
    }

    const { text, botType } = parseResult.data;

    // Track voice request breadcrumb
    voiceBreadcrumb.ttsRequested(botType);

    // Truncate text if too long (schema already validates max, but truncate for safety)
    const truncatedText = text.slice(0, MAX_TTS_TEXT_LENGTH);

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.error("[Voice API] ELEVENLABS_API_KEY not found in environment");
      return Response.json(
        { error: "Voice service not configured" },
        { status: 503 },
      );
    }

    // For collaborative mode, parse speaker segments BEFORE stripping markdown
    // (stripMarkdown removes the speaker markers, so we must parse first)
    if (botType === "collaborative") {
      const segments = parseCollaborativeSegments(truncatedText);

      // If we have multiple speakers, generate audio for each segment
      if (
        segments.length > 1 ||
        (segments.length === 1 && segments[0].speaker !== "alexandria")
      ) {
        // Filter out empty segments, strip markdown from each, and generate audio in parallel
        const validSegments = segments
          .map((s) => ({ ...s, text: stripMarkdown(s.text) }))
          .filter((s) => s.text.trim());

        if (validSegments.length === 0) {
          return new ChatSDKError("bad_request:api").toResponse();
        }

        // Use AbortController to cancel remaining requests if one fails
        const controller = new AbortController();
        const audioBuffers = await Promise.all(
          validSegments.map(async (segment) => {
            const voiceConfig = getVoiceConfig(segment.speaker);
            return generateAudioForSegment(
              segment.text,
              voiceConfig,
              apiKey,
              controller.signal,
            );
          }),
        ).catch((err) => {
          controller.abort();
          throw err;
        });

        // Concatenate all audio buffers
        const totalLength = audioBuffers.reduce(
          (sum, buf) => sum + buf.byteLength,
          0,
        );
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const buffer of audioBuffers) {
          combined.set(new Uint8Array(buffer), offset);
          offset += buffer.byteLength;
        }

        // Record voice analytics for collaborative mode
        const totalTextLength = validSegments.reduce((sum, s) => sum + s.text.length, 0);
        const estimatedMinutes = Math.max(1, Math.ceil(totalTextLength / 750));
        after(() => recordAnalytics(user.id, "voice", estimatedMinutes));

        return new Response(combined, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-cache",
          },
        });
      }
    }

    // Strip markdown formatting for cleaner speech (single voice path)
    const cleanText = stripMarkdown(truncatedText);

    if (!cleanText.trim()) {
      return new ChatSDKError("bad_request:api").toResponse();
    }

    // Single voice path (non-collaborative or single speaker)
    const voiceConfig = getVoiceConfig(botType);

    // Use resilience wrapper for ElevenLabs API calls
    const response = await withElevenLabsResilience(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

      try {
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}/stream`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            body: JSON.stringify({
              text: cleanText,
              model_id: voiceConfig.modelId,
              voice_settings: {
                stability: voiceConfig.settings.stability,
                similarity_boost: voiceConfig.settings.similarityBoost,
                style: voiceConfig.settings.style ?? 0,
                use_speaker_boost: voiceConfig.settings.useSpeakerBoost ?? true,
              },
            }),
            signal: controller.signal,
          },
        );
        clearTimeout(timeoutId);

        if (!res.ok) {
          console.error("ElevenLabs API error:", res.status, res.statusText);
          if (res.status === 401) {
            throw new Error("INVALID_API_KEY");
          }
          throw new Error(`ElevenLabs API error: ${res.status}`);
        }

        return res;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    });

    // Stream the audio response
    apiLog.success({ botType, textLength: cleanText.length });

    // Record voice analytics (estimate minutes from text length)
    // Average speaking rate is ~150 words per minute, average word is 5 characters
    const estimatedMinutes = Math.max(1, Math.ceil(cleanText.length / 750));
    after(() => recordAnalytics(user.id, "voice", estimatedMinutes));

    return new Response(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    // Handle circuit breaker errors gracefully
    if (error instanceof CircuitBreakerError) {
      apiLog.error(error, { errorType: "circuit_breaker" });
      return Response.json(
        {
          error:
            "Voice service temporarily unavailable. Please try again later.",
        },
        { status: 503 },
      );
    }

    // Handle invalid API key
    if (error instanceof Error && error.message === "INVALID_API_KEY") {
      apiLog.error(error, { errorType: "invalid_api_key" });
      return Response.json(
        { error: "Voice service configuration error" },
        { status: 503 },
      );
    }

    apiLog.error(error);
    return Response.json(
      { error: "Voice service unavailable" },
      { status: 503 },
    );
  }
});

// Precompiled regex patterns for better performance
// Flexible patterns to handle various AI-generated formats
const MARKDOWN_PATTERNS = {
  // Match **Alexandria (CMO):** or **Alexandria (CMO)**: or **Alexandria:** etc.
  executiveAlexandria: /\*\*Alexandria\s*(?:\(CMO\))?\s*:?\*\*\s*:?\s*/gi,
  // Match **Kim (CSO):** or **Kim (CSO)**: or **Kim:** etc.
  executiveKim: /\*\*Kim\s*(?:\(CSO\))?\s*:?\*\*\s*:?\s*/gi,
  // Match **Joint Strategy:** or **Joint Strategy**: etc.
  jointStrategy: /\*\*Joint\s+Strategy\s*:?\*\*\s*:?\s*/gi,
  // Match standalone Alexandria: or Alexandria (CMO):
  standaloneAlexandria: /^Alexandria\s*(?:\(CMO\))?\s*:\s*/gim,
  // Match standalone Kim: or Kim (CSO):
  standaloneKim: /^Kim\s*(?:\(CSO\))?\s*:\s*/gim,
  headers: /^#{1,6}\s+/gm,
  bold: /\*\*([^*]+)\*\*/g,
  italic: /\*([^*]+)\*/g,
  boldAlt: /__([^_]+)__/g,
  italicAlt: /_([^_]+)_/g,
  links: /\[([^\]]+)\]\([^)]+\)/g,
  images: /!\[([^\]]*)\]\([^)]+\)/g,
  codeBlocks: /```[\s\S]*?```/g,
  inlineCode: /`([^`]+)`/g,
  blockquotes: /^>\s+/gm,
  horizontalRules: /^---+$/gm,
  // Table patterns - skip entire tables instead of just removing pipes
  tableRows: /^\|[^\n]+\|$/gm,
  tableSeparators: /^[-|:\s]+$/gm,
  multipleNewlines: /\n{3,}/g,
};

// Types for collaborative voice segments
interface SpeakerSegment {
  speaker: "alexandria" | "kim";
  text: string;
}

/**
 * Parse collaborative mode text into speaker segments.
 * Identifies sections by various formats of executive markers.
 * Joint Strategy sections alternate between voices for variety.
 *
 * Supported formats:
 * - **Alexandria (CMO):** (colon inside bold)
 * - **Alexandria (CMO)**: (colon outside bold)
 * - **Alexandria:** (without role)
 * - Alexandria (CMO): (without bold)
 * - Same variations for Kim and Joint Strategy
 */
function parseCollaborativeSegments(text: string): SpeakerSegment[] {
  const segments: SpeakerSegment[] = [];

  // More flexible patterns to match speaker markers in various formats
  // Handles: **Name (Role):** OR **Name (Role)**: OR **Name:** OR Name (Role): OR Name:
  const speakerPatterns = [
    // **Alexandria (CMO):** or **Alexandria (CMO)**: (with or without colon inside bold)
    /\*\*Alexandria\s*(?:\(CMO\))?\s*:?\*\*\s*:?/gi,
    // **Kim (CSO):** or **Kim (CSO)**: (with or without colon inside bold)
    /\*\*Kim\s*(?:\(CSO\))?\s*:?\*\*\s*:?/gi,
    // **Joint Strategy:** or **Joint Strategy**:
    /\*\*Joint\s+Strategy\s*:?\*\*\s*:?/gi,
    // Non-bold versions: Alexandria (CMO): or Alexandria:
    /(?:^|\n)Alexandria\s*(?:\(CMO\))?\s*:/gim,
    // Non-bold versions: Kim (CSO): or Kim:
    /(?:^|\n)Kim\s*(?:\(CSO\))?\s*:/gim,
  ];

  // Find all speaker markers and their positions
  const markers: {
    index: number;
    speaker: "alexandria" | "kim" | "joint";
    length: number;
  }[] = [];

  // Search with each pattern
  for (const pattern of speakerPatterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const markerText = match[0].toLowerCase();
      let speaker: "alexandria" | "kim" | "joint";

      if (markerText.includes("alexandria")) {
        speaker = "alexandria";
      } else if (markerText.includes("kim")) {
        speaker = "kim";
      } else {
        speaker = "joint";
      }

      // Avoid duplicates at the same position
      const existsAtPosition = markers.some(
        (m) => Math.abs(m.index - match!.index) < 5,
      );
      if (!existsAtPosition) {
        markers.push({
          index: match.index,
          speaker,
          length: match[0].length,
        });
      }
    }
  }

  // Sort markers by position
  markers.sort((a, b) => a.index - b.index);

  // If no markers found, return the whole text as alexandria (default)
  if (markers.length === 0) {
    return [{ speaker: "alexandria", text }];
  }

  // Extract text before first marker if any
  if (markers[0].index > 0) {
    const beforeText = text.slice(0, markers[0].index).trim();
    if (beforeText) {
      segments.push({ speaker: "alexandria", text: beforeText });
    }
  }

  // Extract text for each marker section
  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const startIndex = marker.index + marker.length;
    const endIndex = markers[i + 1]?.index ?? text.length;
    const sectionText = text.slice(startIndex, endIndex).trim();

    if (sectionText) {
      // Joint Strategy alternates voices, starting with Alexandria
      const speaker =
        marker.speaker === "joint"
          ? segments.length % 2 === 0
            ? "alexandria"
            : "kim"
          : marker.speaker;

      segments.push({ speaker, text: sectionText });
    }
  }

  return segments;
}

/**
 * Generate audio for a single segment using ElevenLabs API.
 */
async function generateAudioForSegment(
  text: string,
  voiceConfig: {
    voiceId: string;
    modelId: string;
    settings: {
      stability: number;
      similarityBoost: number;
      style?: number;
      useSpeakerBoost?: boolean;
    };
  },
  apiKey: string,
  externalSignal?: AbortSignal,
): Promise<ArrayBuffer> {
  const response = await withElevenLabsResilience(async () => {
    // Combine external signal with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

    // Handle external abort signal if provided
    if (externalSignal) {
      externalSignal.addEventListener("abort", () => controller.abort());
    }

    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: voiceConfig.modelId,
            voice_settings: {
              stability: voiceConfig.settings.stability,
              similarity_boost: voiceConfig.settings.similarityBoost,
              style: voiceConfig.settings.style ?? 0,
              use_speaker_boost: voiceConfig.settings.useSpeakerBoost ?? true,
            },
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!res.ok) {
        console.error("ElevenLabs API error:", res.status, res.statusText);
        if (res.status === 401) {
          throw new Error("INVALID_API_KEY");
        }
        throw new Error(`ElevenLabs API error: ${res.status}`);
      }

      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  });

  return response.arrayBuffer();
}

// Helper function to strip markdown for cleaner TTS
function stripMarkdown(text: string): string {
  let result = text
    // Remove executive name prefixes (collaborative mode)
    .replace(MARKDOWN_PATTERNS.executiveAlexandria, "")
    .replace(MARKDOWN_PATTERNS.executiveKim, "")
    .replace(MARKDOWN_PATTERNS.jointStrategy, "")
    // Remove standalone executive names at start of lines
    .replace(MARKDOWN_PATTERNS.standaloneAlexandria, "")
    .replace(MARKDOWN_PATTERNS.standaloneKim, "")
    // Remove headers
    .replace(MARKDOWN_PATTERNS.headers, "")
    // Remove bold/italic
    .replace(MARKDOWN_PATTERNS.bold, "$1")
    .replace(MARKDOWN_PATTERNS.italic, "$1")
    .replace(MARKDOWN_PATTERNS.boldAlt, "$1")
    .replace(MARKDOWN_PATTERNS.italicAlt, "$1")
    // Remove links but keep text
    .replace(MARKDOWN_PATTERNS.links, "$1")
    // Remove images
    .replace(MARKDOWN_PATTERNS.images, "")
    // Remove code blocks entirely - don't reference them verbally as it confuses users
    .replace(MARKDOWN_PATTERNS.codeBlocks, "")
    // Remove inline code
    .replace(MARKDOWN_PATTERNS.inlineCode, "$1")
    // Remove blockquotes
    .replace(MARKDOWN_PATTERNS.blockquotes, "")
    // Remove horizontal rules
    .replace(MARKDOWN_PATTERNS.horizontalRules, "");

  // Remove tables entirely - don't reference them verbally as it confuses users
  result = result
    .replace(MARKDOWN_PATTERNS.tableRows, "")
    .replace(MARKDOWN_PATTERNS.tableSeparators, "");

  // Clean up multiple newlines
  return result.replace(MARKDOWN_PATTERNS.multipleNewlines, "\n\n").trim();
}
