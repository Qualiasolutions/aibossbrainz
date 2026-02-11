import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  streamText,
} from "ai";
import { headers } from "next/headers";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import type { BotType } from "@/lib/bot-personalities";
import { getSystemPrompt } from "@/lib/bot-personalities";
import { isProductionEnvironment } from "@/lib/constants";
import { generateUUID } from "@/lib/utils";
import { checkDemoRateLimit } from "./rate-limit";

export const maxDuration = 30;

// Simplified schema for demo - no file uploads, no complex features
const demoMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user"]),
  parts: z.array(
    z.object({
      type: z.enum(["text"]),
      text: z.string().min(1).max(500), // Shorter limit for demo
    }),
  ),
});

const demoRequestSchema = z.object({
  messages: z.array(
    z.union([
      demoMessageSchema,
      z.object({
        id: z.string().uuid(),
        role: z.enum(["assistant"]),
        parts: z.array(z.any()),
      }),
    ]),
  ),
  botType: z
    .enum(["alexandria", "kim", "collaborative"])
    .default("collaborative"),
});

// Simplified demo prompt - no tools, no artifacts, just personality
function getDemoSystemPrompt(botType: BotType): string {
  const basePrompt = getSystemPrompt(botType, "default");

  // Add demo-specific constraints
  return `${basePrompt}

## DEMO MODE CONSTRAINTS
This is a demo conversation on the landing page. Keep responses:
- Concise (2-4 sentences for simple questions, 1-2 paragraphs max for complex ones)
- Engaging and impressive to showcase value
- Focused on business strategy questions
- Professional but approachable

After 2-3 exchanges, gently encourage the user to sign up for the full experience:
"Want to dive deeper? Sign up for free to unlock unlimited conversations, document creation, and more advanced features."

Do NOT use any tools or create documents - just provide helpful advice directly.`;
}

export async function POST(request: Request) {
  try {
    // Get IP for rate limiting
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ip = forwardedFor?.split(",")[0] || realIp || "unknown";

    // Check rate limit (5 messages per hour for anonymous demo users)
    const rateLimitResult = await checkDemoRateLimit(ip);
    if (!rateLimitResult.allowed) {
      return Response.json(
        {
          error: "Rate limit exceeded",
          message:
            "You've reached the demo limit. Sign up for free to continue chatting!",
          reset: rateLimitResult.reset,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(
              Math.floor(rateLimitResult.reset.getTime() / 1000),
            ),
          },
        },
      );
    }

    // Parse request
    const json = await request.json();
    const { messages, botType } = demoRequestSchema.parse(json);

    // Limit conversation history for demo (max 6 messages)
    const recentMessages = messages.slice(-6);

    // Build system prompt
    const systemPromptText = getDemoSystemPrompt(botType);

    // Stream response
    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: myProvider.languageModel("chat-model"),
          system: systemPromptText,
          messages: convertToModelMessages(recentMessages),
          maxOutputTokens: 1024, // Shorter responses for demo
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "demo-stream-text",
          },
        });

        result.consumeStream();
        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: false,
          }),
        );
      },
      generateId: generateUUID,
      onError: () => "Oops, something went wrong! Please try again.",
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {
      headers: {
        "X-RateLimit-Remaining": String(rateLimitResult.remaining),
      },
    });
  } catch (error) {
    console.error("[Demo Chat API] Error:", error);

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 },
      );
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
