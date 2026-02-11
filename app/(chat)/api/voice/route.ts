import { after } from "next/server";
import { z } from "zod";
import { getVoiceConfig, MAX_TTS_TEXT_LENGTH } from "@/lib/ai/voice-config";
import { recordAnalytics } from "@/lib/analytics/queries";
import { apiRequestLogger } from "@/lib/api-logging";
import { getMessageCountByUserId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import {
  CircuitBreakerError,
  withElevenLabsResilience,
} from "@/lib/resilience";
import {
  checkRateLimit,
  getRateLimitHeaders,
} from "@/lib/security/rate-limiter";
import { withCsrf } from "@/lib/security/with-csrf";
import { voiceBreadcrumb } from "@/lib/sentry";
import { createClient } from "@/lib/supabase/server";
import {
  parseCollaborativeSegments,
  stripMarkdownForTTS,
} from "@/lib/voice/strip-markdown-tts";

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
          .map((s) => ({ ...s, text: stripMarkdownForTTS(s.text) }))
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
        const totalTextLength = validSegments.reduce(
          (sum, s) => sum + s.text.length,
          0,
        );
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
    const cleanText = stripMarkdownForTTS(truncatedText);

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
