import { generateText } from "ai";
import { getKnowledgeBaseContent } from "@/lib/ai/knowledge-base";
import { systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import {
  getVoiceConfig,
  MAX_TTS_TEXT_LENGTH,
  type VoiceConfig,
} from "@/lib/ai/voice-config";
import type { BotType } from "@/lib/bot-personalities";
import { ChatSDKError } from "@/lib/errors";
import { withElevenLabsResilience } from "@/lib/resilience";
import {
  checkRateLimit,
  getRateLimitHeaders,
} from "@/lib/security/rate-limiter";
import { createClient } from "@/lib/supabase/server";
import { saveMessages } from "@/lib/db/queries/message";
import type { DBMessage } from "@/lib/supabase/types";

export const maxDuration = 60;

// Rate limits for realtime API
const MAX_REALTIME_REQUESTS_PER_DAY = 200;

// Precompiled regex patterns for markdown stripping
const MARKDOWN_PATTERNS = {
  executiveAlexandria: /\*\*Alexandria\s*(?:\(CMO\))?\s*:?\*\*\s*:?\s*/gi,
  executiveKim: /\*\*Kim\s*(?:\(CSO\))?\s*:?\*\*\s*:?\s*/gi,
  jointStrategy: /\*\*Joint\s+Strategy\s*:?\*\*\s*:?\s*/gi,
  standaloneAlexandria: /^Alexandria\s*(?:\(CMO\))?\s*:\s*/gim,
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
  tableRows: /^\|[^\n]+\|$/gm,
  tableSeparators: /^[-|:\s]+$/gm,
  multipleNewlines: /\n{3,}/g,
  suggestions: /```suggestions[\s\S]*?```/g,
};

interface SpeakerSegment {
  speaker: "alexandria" | "kim";
  text: string;
}

function stripMarkdown(text: string): string {
  const result = text
    .replace(MARKDOWN_PATTERNS.suggestions, "")
    .replace(MARKDOWN_PATTERNS.executiveAlexandria, "")
    .replace(MARKDOWN_PATTERNS.executiveKim, "")
    .replace(MARKDOWN_PATTERNS.jointStrategy, "")
    .replace(MARKDOWN_PATTERNS.standaloneAlexandria, "")
    .replace(MARKDOWN_PATTERNS.standaloneKim, "")
    .replace(MARKDOWN_PATTERNS.headers, "")
    .replace(MARKDOWN_PATTERNS.bold, "$1")
    .replace(MARKDOWN_PATTERNS.italic, "$1")
    .replace(MARKDOWN_PATTERNS.boldAlt, "$1")
    .replace(MARKDOWN_PATTERNS.italicAlt, "$1")
    .replace(MARKDOWN_PATTERNS.links, "$1")
    .replace(MARKDOWN_PATTERNS.images, "")
    .replace(MARKDOWN_PATTERNS.codeBlocks, "")
    .replace(MARKDOWN_PATTERNS.inlineCode, "$1")
    .replace(MARKDOWN_PATTERNS.blockquotes, "")
    .replace(MARKDOWN_PATTERNS.horizontalRules, "")
    .replace(MARKDOWN_PATTERNS.tableRows, "")
    .replace(MARKDOWN_PATTERNS.tableSeparators, "");

  return result.replace(MARKDOWN_PATTERNS.multipleNewlines, "\n\n").trim();
}

function parseCollaborativeSegments(text: string): SpeakerSegment[] {
  const segments: SpeakerSegment[] = [];
  const speakerPatterns = [
    /\*\*Alexandria\s*(?:\(CMO\))?\s*:?\*\*\s*:?/gi,
    /\*\*Kim\s*(?:\(CSO\))?\s*:?\*\*\s*:?/gi,
    /\*\*Joint\s+Strategy\s*:?\*\*\s*:?/gi,
    /(?:^|\n)Alexandria\s*(?:\(CMO\))?\s*:/gim,
    /(?:^|\n)Kim\s*(?:\(CSO\))?\s*:/gim,
  ];

  const markers: {
    index: number;
    speaker: "alexandria" | "kim" | "joint";
    length: number;
  }[] = [];

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

      const existsAtPosition = markers.some(
        (m) => Math.abs(m.index - (match?.index ?? 0)) < 5,
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

  markers.sort((a, b) => a.index - b.index);

  if (markers.length === 0) {
    return [{ speaker: "alexandria", text }];
  }

  if (markers[0].index > 0) {
    const beforeText = text.slice(0, markers[0].index).trim();
    if (beforeText) {
      segments.push({ speaker: "alexandria", text: beforeText });
    }
  }

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    const startIndex = marker.index + marker.length;
    const endIndex = markers[i + 1]?.index ?? text.length;
    const sectionText = text.slice(startIndex, endIndex).trim();

    if (sectionText) {
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

async function generateAudioForSegment(
  text: string,
  voiceConfig: VoiceConfig,
  apiKey: string,
): Promise<ArrayBuffer> {
  const response = await withElevenLabsResilience(async () => {
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
      },
    );

    if (!res.ok) {
      console.error("ElevenLabs API error:", res.status, res.statusText);
      if (res.status === 401) {
        throw new Error("INVALID_API_KEY");
      }
      throw new Error(`ElevenLabs API error: ${res.status}`);
    }

    return res;
  });

  return response.arrayBuffer();
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(
      `realtime:${user.id}`,
      MAX_REALTIME_REQUESTS_PER_DAY,
    );

    if (rateLimitResult.source === "redis" && !rateLimitResult.allowed) {
      const response = new ChatSDKError("rate_limit:chat").toResponse();
      const headers = getRateLimitHeaders(
        rateLimitResult.remaining,
        MAX_REALTIME_REQUESTS_PER_DAY,
        rateLimitResult.reset,
      );
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }
      return response;
    }

    const { message, botType = "collaborative" } = await request.json();

    if (!message || typeof message !== "string") {
      return new ChatSDKError("bad_request:api").toResponse();
    }

    if (!["alexandria", "kim", "collaborative"].includes(botType)) {
      return new ChatSDKError("bad_request:api").toResponse();
    }

    // Get knowledge base content
    const knowledgeBaseContent = await getKnowledgeBaseContent(
      botType as BotType,
    );

    // Build system prompt with realtime-specific instructions
    const systemPromptText = await systemPrompt({
      selectedChatModel: "chat-model",
      requestHints: {
        latitude: undefined,
        longitude: undefined,
        city: undefined,
        country: undefined,
      },
      botType: botType as BotType,
      knowledgeBaseContent,
    });

    // Add realtime-specific instructions
    const realtimePrompt = `${systemPromptText}

## VOICE CONVERSATION MODE
You are in a real-time voice call. Keep responses:
- Concise (2-4 sentences max for simple questions)
- Conversational and natural
- Without markdown formatting
- Without bullet points or numbered lists (use natural speech)
- Do NOT include the suggestions JSON block
- Speak as if talking to someone on the phone

Remember: This is a voice call, not a text chat. Be direct and conversational.`;

    // Generate AI response (optimized for voice)
    const result = await generateText({
      model: myProvider.languageModel("chat-model"),
      system: realtimePrompt,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
      maxOutputTokens: 400, // Shorter for voice
    });

    const responseText = result.text;

    // Generate audio
    let audioUrl: string | null = null;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (apiKey && responseText) {
      try {
        const truncatedText = responseText.slice(0, MAX_TTS_TEXT_LENGTH);

        // Handle collaborative mode with multiple speakers
        if (botType === "collaborative") {
          const segments = parseCollaborativeSegments(truncatedText);
          const validSegments = segments
            .map((s) => ({ ...s, text: stripMarkdown(s.text) }))
            .filter((s) => s.text.trim());

          if (validSegments.length > 0) {
            const audioBuffers = await Promise.all(
              validSegments.map(async (segment) => {
                const voiceConfig = getVoiceConfig(segment.speaker);
                return generateAudioForSegment(
                  segment.text,
                  voiceConfig,
                  apiKey,
                );
              }),
            );

            // Concatenate audio
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

            const base64Audio = Buffer.from(combined).toString("base64");
            audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
          }
        } else {
          // Single voice
          const cleanText = stripMarkdown(truncatedText);
          if (cleanText.trim()) {
            const voiceConfig = getVoiceConfig(botType as BotType);
            const audioData = await generateAudioForSegment(
              cleanText,
              voiceConfig,
              apiKey,
            );
            const base64Audio = Buffer.from(audioData).toString("base64");
            audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
          }
        }
      } catch (error) {
        console.error("TTS error:", error);
        // Continue without audio
      }
    }

    // Save messages to chat history for real-time calls
    // Create or use a dedicated "Voice Call" chat for this user
    let savedChatId: string | null = null;
    try {
      const supabase = await createClient();

      // Get or create voice call chat for this user
      const { data: existingChat, error: fetchError } = await supabase
        .from("Chat")
        .select("id")
        .eq("userId", user.id)
        .eq("title", "Voice Call")
        .maybeSingle();

      const chatId = existingChat?.id || crypto.randomUUID();
      savedChatId = chatId;

      // If chat doesn't exist, create it first
      if (!existingChat) {
        const { error: insertError } = await supabase.from("Chat").insert({
          id: chatId,
          userId: user.id,
          title: "Voice Call",
          botType: botType as BotType,
        });
        if (insertError) {
          console.error("Failed to create voice call chat:", insertError);
        }
      }

      const now = new Date().toISOString();

      // Save both user and assistant messages with all required fields
      const messages: DBMessage[] = [
        {
          id: crypto.randomUUID(),
          chatId,
          role: "user",
          parts: [{ type: "text", text: message }],
          attachments: null,
          botType: null,
          deletedAt: null,
          createdAt: now,
        },
        {
          id: crypto.randomUUID(),
          chatId,
          role: "assistant",
          parts: [{ type: "text", text: responseText }],
          attachments: null,
          botType: botType as BotType,
          deletedAt: null,
          createdAt: now,
        },
      ];

      const saveResult = await saveMessages({ messages });
      console.log("Voice call messages saved to chat:", chatId);
    } catch (saveError) {
      console.error("Failed to save voice call messages:", saveError);
      // Continue anyway - audio response is primary
    }

    return Response.json({
      text: responseText,
      audioUrl,
      chatId: savedChatId, // Return chatId so frontend can redirect
    });
  } catch (error) {
    console.error("Realtime stream API error:", error);

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    return new ChatSDKError("offline:chat").toResponse();
  }
}
