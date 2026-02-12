import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  stepCountIs,
  streamText,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import type { VisibilityType } from "@/components/visibility-selector";
import { formatCanvasContext } from "@/lib/ai/canvas-context";
import { generateConversationSummary } from "@/lib/ai/conversation-summarizer";
import { entitlementsByUserType, type UserType } from "@/lib/ai/entitlements";
import { getKnowledgeBaseContent } from "@/lib/ai/knowledge-base";
import type { ChatModel } from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { strategyCanvas } from "@/lib/ai/tools/strategy-canvas";
import { webSearch } from "@/lib/ai/tools/web-search";
import { classifyTopic } from "@/lib/ai/topic-classifier";
import { recordAnalytics } from "@/lib/analytics/queries";
import { apiRequestLogger, getApiLogger } from "@/lib/api-logging";
import type { Session } from "@/lib/artifacts/server";
import type { BotType, FocusMode } from "@/lib/bot-personalities";
import { isProductionEnvironment } from "@/lib/constants";
import {
  checkUserSubscription,
  createStreamId,
  deleteChatById,
  ensureUserExists,
  getAllUserCanvases,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveConversationSummary,
  saveMessages,
  updateChatLastContextById,
  updateChatPinStatus,
  updateChatTitle,
  updateChatTopic,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  CircuitBreakerError,
  isCircuitOpen,
  recordCircuitFailure,
  recordCircuitSuccess,
} from "@/lib/resilience";
import {
  checkRateLimit,
  getRateLimitHeaders,
} from "@/lib/security/rate-limiter";
import { withCsrf } from "@/lib/security/with-csrf";
import { chatBreadcrumb } from "@/lib/sentry";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

// Maximum number of messages to keep in context (prevents context overflow)
// Keeps first message + last N messages for continuity via DB-level bounded fetch
const MAX_CONTEXT_MESSAGES = 60;

export const maxDuration = 60; // Vercel Pro limit is 60s - must match to avoid 504

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err,
      );
      return; // tokenlens helpers will fall back to defaultCatalog
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 }, // 24 hours
);

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("REDIS_URL")) {
        logger.info("Resumable streams disabled due to missing REDIS_URL");
      } else {
        logger.error({ err: error }, "Stream context initialization failed");
      }
    }
  }

  return globalStreamContext;
}

export const POST = withCsrf(async (request: Request) => {
  // Create request-scoped logger
  const apiLog = apiRequestLogger("/api/chat");
  apiLog.start();

  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    apiLog.logger().debug({ body: json }, "Chat API request received");
    requestBody = postRequestBodySchema.parse(json);
  } catch (error) {
    apiLog.error(error, { phase: "validation" });
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
      selectedBotType = "collaborative",
      focusMode = "default",
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel["id"];
      selectedVisibilityType: VisibilityType;
      selectedBotType: BotType;
      focusMode: FocusMode;
    } = requestBody;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    // PERF: Run user existence check and subscription check in parallel
    const [, subscriptionStatus] = await Promise.all([
      ensureUserExists({ id: user.id, email: user.email || "" }),
      checkUserSubscription(user.id),
    ]);

    if (!subscriptionStatus.isActive) {
      return new ChatSDKError("subscription_expired:chat").toResponse();
    }

    // Get entitlements based on subscription type
    const userType: UserType =
      (subscriptionStatus.subscriptionType as UserType) || "trial";
    const maxMessages =
      entitlementsByUserType[userType]?.maxMessagesPerDay ?? 100;

    // Try Redis-based rate limiting first (faster)
    const rateLimitResult = await checkRateLimit(user.id, maxMessages);

    if (rateLimitResult.source === "redis") {
      // Redis is available, use its result
      if (!rateLimitResult.allowed) {
        const response = new ChatSDKError("rate_limit:chat").toResponse();
        const headers = getRateLimitHeaders(
          rateLimitResult.remaining,
          maxMessages,
          rateLimitResult.reset,
        );
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
        return response;
      }
    } else {
      // SECURITY: Redis unavailable - MUST verify via database (fail closed)
      // This ensures rate limiting is enforced even when Redis is down
      const messageCount = await getMessageCountByUserId({
        id: user.id,
        differenceInHours: 24,
      });

      if (messageCount >= maxMessages) {
        return new ChatSDKError("rate_limit:chat").toResponse();
      }
    }

    // Fetch chat and bounded messages in parallel to reduce latency
    // Uses DB-level bounded fetch (first + last N-1 messages) to prevent unbounded memory usage
    const [chat, messagesFromDb] = await Promise.all([
      getChatById({ id }),
      getMessagesByChatId({ id, limit: MAX_CONTEXT_MESSAGES }),
    ]);

    if (chat) {
      if (chat.userId !== user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
    } else {
      // Create chat with placeholder title - generate real title in background
      await saveChat({
        id,
        userId: user.id,
        title: "New conversation",
        visibility: selectedVisibilityType,
      });
      chatBreadcrumb.chatCreated(id);

      // Generate title and classify topic in background (non-blocking)
      after(async () => {
        try {
          const title = await generateTitleFromUserMessage({ message });
          await updateChatTitle({ chatId: id, title });

          // Classify topic based on title and first message
          const firstMessageText = message.parts
            .filter((part) => part.type === "text")
            .map((part) => (part as { type: "text"; text: string }).text)
            .join(" ");

          const topicResult = classifyTopic(title, firstMessageText);
          if (topicResult) {
            await updateChatTopic({
              chatId: id,
              topic: topicResult.topic,
              topicColor: topicResult.color,
            });
          }
        } catch (err) {
          console.warn("Background title generation failed:", err);
        }
      });
    }
    // Messages already bounded at DB level, just convert and append new message
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    // Extract message text early for simple message detection
    const messageText = message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part as { type: "text"; text: string }).text)
      .join(" ");

    // PERF: Detect simple messages to skip heavy context loading
    const isSimple =
      messagesFromDb.length <= 1 && messageText.trim().length < 30;

    // Run knowledge base loading, canvas fetch, message save, and stream ID creation in parallel
    // PERF: Skip knowledge base and canvas loading for simple greetings
    const streamId = generateUUID();
    const [knowledgeBaseContent, userCanvases] = await Promise.all([
      isSimple ? Promise.resolve("") : getKnowledgeBaseContent(selectedBotType),
      isSimple
        ? Promise.resolve([])
        : getAllUserCanvases({ userId: user.id }),
      saveMessages({
        messages: [
          {
            chatId: id,
            id: message.id,
            role: "user",
            parts: message.parts as unknown as Json,
            attachments: [] as unknown as Json,
            createdAt: new Date().toISOString(),
            botType: null,
            deletedAt: null,
          },
        ],
      }),
      createStreamId({ streamId, chatId: id }),
    ]);

    // Track message sent breadcrumb
    chatBreadcrumb.messageSent(id, selectedBotType);

    // Format canvas context for AI consumption
    const canvasContext = formatCanvasContext(
      userCanvases.map((c) => ({
        canvasType: c.canvasType as "swot" | "bmc" | "journey" | "brainstorm",
        data: c.data,
      })),
    );

    // Build system prompt with personalization (now async)
    // PERF: Pass messageText and messageCount so we can skip expensive
    // personalization queries for simple messages like "hi"
    const systemPromptText = await systemPrompt({
      selectedChatModel,
      requestHints,
      botType: selectedBotType,
      focusMode: focusMode,
      knowledgeBaseContent,
      canvasContext,
      userId: user.id,
      messageText,
      messageCount: messagesFromDb.length,
    });

    // Circuit breaker: fail fast if OpenRouter is down
    if (isCircuitOpen("ai-gateway")) {
      return new ChatSDKError("offline:chat").toResponse();
    }

    let finalMergedUsage: AppUsage | undefined;

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPromptText,
          messages: convertToModelMessages(uiMessages),
          maxOutputTokens: isSimple ? 500 : 4096, // PERF: Limit output for greetings
          stopWhen: stepCountIs(3), // Reduced from 5 to 3 - prevents deep recursion latency
          // Temporarily disabled tools and transforms for OpenRouter compatibility
          // experimental_activeTools: [
          //   "getWeather",
          //   "createDocument",
          //   "updateDocument",
          //   "requestSuggestions",
          //   "webSearch",
          // ],
          // experimental_transform: smoothStream({ chunking: "line" }),
          tools: {
            getWeather,
            requestSuggestions: requestSuggestions({
              session: { user } satisfies Session,
              dataStream,
            }),
            webSearch,
            strategyCanvas: strategyCanvas({
              session: { user } satisfies Session,
            }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
          onFinish: async ({ usage }) => {
            try {
              const providers = await getTokenlensCatalog();
              const modelId =
                myProvider.languageModel(selectedChatModel).modelId;
              if (!modelId) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              if (!providers) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              const summary = getUsage({ modelId, usage, providers });
              finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            } catch (err) {
              console.warn("TokenLens enrichment failed", err);
              finalMergedUsage = usage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            }
          },
        });

        result.consumeStream();
        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        // Record success for AI gateway circuit breaker
        recordCircuitSuccess("ai-gateway");

        apiLog.success({
          phase: "streaming_complete",
          messageCount: messages.length,
        });

        // Track message received breadcrumb
        chatBreadcrumb.messageReceived(id, selectedBotType);

        await saveMessages({
          messages: messages.map((currentMessage) => {
            // Safely extract botType from message metadata
            const messageMetadata =
              "metadata" in currentMessage
                ? (currentMessage.metadata as { botType?: BotType } | undefined)
                : undefined;

            return {
              id: currentMessage.id,
              role: currentMessage.role,
              parts: currentMessage.parts as unknown as Json,
              createdAt: new Date().toISOString(),
              attachments: [] as unknown as Json,
              chatId: id,
              botType:
                currentMessage.role === "assistant"
                  ? messageMetadata?.botType || selectedBotType
                  : null,
              deletedAt: null,
            };
          }),
        });

        if (finalMergedUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            });
            // Record token usage analytics
            const inputTokens = finalMergedUsage.inputTokens || 0;
            const outputTokens = finalMergedUsage.outputTokens || 0;
            const totalTokens = inputTokens + outputTokens;
            if (totalTokens > 0) {
              after(() => recordAnalytics(user.id, "token", totalTokens));
            }
          } catch (err) {
            console.warn("Unable to persist last usage for chat", id, err);
          }
        }

        // Record message analytics
        after(() => recordAnalytics(user.id, "message", messages.length));

        // Generate conversation summary for cross-chat memory (in background)
        // Use messages from onFinish callback instead of re-fetching from DB
        const finishedMessages = messages;
        after(async () => {
          try {
            // Only summarize if conversation has substantive content (4+ messages)
            if (finishedMessages.length >= 4) {
              const summary = await generateConversationSummary(
                finishedMessages.map((m) => ({
                  role: m.role,
                  parts: m.parts as unknown[],
                })),
              );
              if (summary) {
                await saveConversationSummary({
                  userId: user.id,
                  chatId: id,
                  summary: summary.text,
                  topics: summary.topics,
                  importance: summary.importance,
                });
              }
            }
          } catch (err) {
            console.warn("Failed to generate conversation summary:", err);
          }
        });
      },
      onError: () => {
        // Record failure for AI gateway circuit breaker
        recordCircuitFailure("ai-gateway");
        apiLog.warn("Stream onError callback triggered");
        return "Something went wrong generating a response. Please try again.";
      },
    });

    // const streamContext = getStreamContext();

    // if (streamContext) {
    //   return new Response(
    //     await streamContext.resumableStream(streamId, () =>
    //       stream.pipeThrough(new JsonToSseTransformStream())
    //     )
    //   );
    // }

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error: unknown) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    apiLog.error(error, {
      phase: "streaming",
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
    });
    return new ChatSDKError("offline:chat").toResponse();
  }
});

export const DELETE = withCsrf(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  chatBreadcrumb.chatDeleted(id);

  return Response.json(deletedChat, { status: 200 });
});

export const PATCH = withCsrf(async (request: Request) => {
  try {
    const { id, isPinned } = await request.json();

    if (!id || typeof isPinned !== "boolean") {
      return new ChatSDKError("bad_request:api").toResponse();
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      return new ChatSDKError("not_found:chat").toResponse();
    }

    if (chat.userId !== user.id) {
      return new ChatSDKError("forbidden:chat").toResponse();
    }

    await updateChatPinStatus({ chatId: id, isPinned });

    return Response.json({ success: true, isPinned }, { status: 200 });
  } catch (_error) {
    return new ChatSDKError("bad_request:api").toResponse();
  }
});
