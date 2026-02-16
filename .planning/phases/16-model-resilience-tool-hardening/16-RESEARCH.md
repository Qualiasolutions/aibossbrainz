# Phase 16: Model Resilience & Tool Hardening - Research

**Researched:** 2026-02-16
**Domain:** AI model resilience, tool error handling, Vercel AI SDK 5.x, OpenRouter provider
**Confidence:** HIGH

## Summary

This phase hardens the AI chat system against model outages and tool failures. The codebase currently uses `google/gemini-3-flash-preview` for ALL four model slots (chat, reasoning, title, artifact) via OpenRouter with zero fallback. The `generateTitleFromUserMessage` and `generateConversationSummary` functions call `generateText` with no timeout, no retry, no circuit breaker. The weather tool has no `response.ok` check on its main fetch. The `requestSuggestions` tool does not verify document ownership (RLS hides data but leaks existence via null vs error). The `strategyCanvas` tool has a generic error handler that masks specific failures.

The Vercel AI SDK 5.x (installed: `ai@5.0.118`) natively supports `timeout` parameter (object with `totalMs`/`stepMs`/`chunkMs`) and `abortSignal` on both `generateText` and `streamText`. The existing `lib/resilience.ts` module provides `withCircuitBreaker`, `withRetry`, and `withResilience` (combined) wrappers, plus record-style functions (`recordCircuitSuccess`/`recordCircuitFailure`) for streaming contexts. The `withAIGatewayResilience` wrapper is already pre-configured but unused for title/summary generation. OpenRouter supports a `models` array for automatic server-side fallback, passable via `extraBody` on the `@openrouter/ai-sdk-provider@1.5.4`.

**Primary recommendation:** Use OpenRouter's native `models` array fallback (via `extraBody`) for model resilience, AI SDK's built-in `timeout` parameter for all `generateText`/`streamText` calls, and the existing `withAIGatewayResilience` wrapper for title/summary generation.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` (Vercel AI SDK) | 5.0.118 | `streamText`, `generateText`, `tool`, `customProvider` | Already installed; provides native `timeout` + `abortSignal` |
| `@openrouter/ai-sdk-provider` | 1.5.4 | OpenRouter integration with `extraBody` support | Already installed; supports `models` array fallback |
| `lib/resilience.ts` | local | Circuit breaker + retry + combined wrappers | Already built and tested in codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 3.25.76 | Response schema validation for weather API | Already installed; validate weather API response shape |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OpenRouter `models` array | Application-level try-catch fallback | OpenRouter fallback is simpler (server-side, transparent), but less control over which errors trigger fallback |
| AI SDK `timeout` param | Manual `AbortController` + `setTimeout` | AI SDK `timeout` is cleaner and handles cleanup; manual approach needed only for non-AI-SDK fetches |

**Installation:**
```bash
# No new dependencies needed - all libraries already installed
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── ai/
│   ├── providers.ts          # Model definitions with fallback chain + stable IDs
│   ├── conversation-summarizer.ts  # Wrapped in withAIGatewayResilience + timeout
│   ├── tools/
│   │   ├── get-weather.ts    # response.ok + schema validation + try/catch + AbortController
│   │   ├── request-suggestions.ts  # Auth check before DB query
│   │   └── strategy-canvas.ts      # Fast-fail auth before DB write
├── resilience.ts             # Existing - no changes needed
app/(chat)/
├── api/chat/route.ts         # streamText with timeout param
├── actions.ts                # generateTitleFromUserMessage with resilience wrapper
```

### Pattern 1: OpenRouter Model Fallback via extraBody
**What:** Pass a `models` array to OpenRouter so it automatically tries fallback models if the primary is down, rate-limited, or content-moderated.
**When to use:** For ALL model definitions in `providers.ts`.
**Example:**
```typescript
// Source: https://openrouter.ai/docs/guides/routing/model-fallbacks
// Source: https://github.com/OpenRouterTeam/ai-sdk-provider README (extraBody)

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { customProvider } from "ai";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

// Primary: Gemini 2.5 Flash (stable, production)
// Fallback: Gemini 2.5 Flash Lite (cheaper, still capable)
export const myProvider = customProvider({
  languageModels: {
    "chat-model": openrouter("google/gemini-2.5-flash", {
      extraBody: {
        models: [
          "google/gemini-2.5-flash",
          "google/gemini-2.5-flash-lite",
        ],
      },
    }),
    "title-model": openrouter("google/gemini-2.5-flash", {
      extraBody: {
        models: [
          "google/gemini-2.5-flash",
          "google/gemini-2.5-flash-lite",
        ],
      },
    }),
    // ... same pattern for other models
  },
});
```

### Pattern 2: AI SDK Native Timeout for generateText
**What:** Use the built-in `timeout` parameter instead of manual AbortController for AI SDK calls.
**When to use:** For `generateTitleFromUserMessage`, `generateConversationSummary`, and the main `streamText` call.
**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text
// Source: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text

// For generateText (title, summary):
const { text } = await generateText({
  model: myProvider.languageModel("title-model"),
  system: "...",
  prompt: "...",
  timeout: { totalMs: 10_000 }, // 10 second hard timeout
});

// For streamText (main chat):
const result = streamText({
  model: myProvider.languageModel(selectedChatModel),
  system: systemPromptText,
  messages: convertToModelMessages(uiMessages),
  timeout: {
    totalMs: 55_000,  // Under Vercel's 60s limit
    chunkMs: 15_000,  // Detect stalled streams
  },
  abortSignal: request.signal, // Forward client disconnect
  // ...
});
```

### Pattern 3: Resilience Wrapper for Title/Summary Generation
**What:** Wrap `generateText` calls in the existing `withAIGatewayResilience` + AI SDK timeout.
**When to use:** For `generateTitleFromUserMessage` and `generateConversationSummary`.
**Example:**
```typescript
// Source: lib/resilience.ts (existing codebase)

import { withAIGatewayResilience } from "@/lib/resilience";

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}): Promise<string> {
  try {
    return await withAIGatewayResilience(async () => {
      const { text } = await generateText({
        model: myProvider.languageModel("title-model"),
        system: "...",
        prompt: JSON.stringify(message),
        timeout: { totalMs: 10_000 },
      });
      return text;
    });
  } catch (error) {
    console.warn("Title generation failed, using fallback:", error);
    return "New conversation"; // Graceful fallback
  }
}
```

### Pattern 4: Tool Authorization Without Leaking Existence
**What:** Check document ownership explicitly before returning results. Return the same error message whether the document does not exist or belongs to another user.
**When to use:** For `requestSuggestions` and `strategyCanvas` tools.
**Example:**
```typescript
// For requestSuggestions:
execute: async ({ documentId }) => {
  // Fast-fail auth check
  if (!session?.user?.id) {
    return { error: "You must be logged in to request suggestions." };
  }

  const document = await getDocumentById({ id: documentId });

  // Uniform error: don't differentiate "not found" from "not yours"
  if (!document || !document.content || document.userId !== session.user.id) {
    return { error: "Document not found or access denied." };
  }

  // ... proceed with suggestions
},
```

### Anti-Patterns to Avoid
- **Separate AbortController for AI SDK calls:** The AI SDK `timeout` parameter handles this internally. Only use manual AbortController for non-AI-SDK fetch calls (weather API).
- **Generic catch-all error messages in tools:** Each tool failure mode should have a specific, user-friendly message. "Something went wrong" tells the user nothing.
- **Using preview model IDs in production:** `google/gemini-3-flash-preview` can change without notice. Always use stable versioned IDs.
- **Swallowing errors silently in background tasks:** Even `after()` callbacks should log errors with structured logging.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Model fallback chain | Custom try-catch-retry with different models | OpenRouter `models` array via `extraBody` | Server-side, handles rate limits + downtime + content moderation automatically |
| Timeout for AI calls | Manual `AbortController` + `setTimeout` + cleanup | AI SDK `timeout: { totalMs, chunkMs }` | Built-in, handles stream chunk stalls, proper cleanup |
| Circuit breaker | New circuit breaker implementation | Existing `lib/resilience.ts` `withCircuitBreaker` | Already built, tested, has cleanup logic |
| Retry with backoff | Custom retry loop | Existing `lib/resilience.ts` `withRetry` | Already built with jitter, configurable, retryable error detection |

**Key insight:** The codebase already has a resilience module (`lib/resilience.ts`) with circuit breaker, retry, and combined wrappers. The problem is not missing infrastructure -- it is that `generateTitleFromUserMessage` and `generateConversationSummary` don't use it, and the AI SDK's native timeout support is not leveraged.

## Common Pitfalls

### Pitfall 1: AbortController Timeout Leak
**What goes wrong:** Creating an `AbortController` with `setTimeout` but not clearing the timeout on success, leaving orphan timers.
**Why it happens:** Developer focuses on the abort case and forgets cleanup.
**How to avoid:** Use AI SDK's built-in `timeout` parameter which handles cleanup automatically. For manual cases (weather fetch), always `clearTimeout` in both success and error paths.
**Warning signs:** Memory usage creeping up over time in production; timer warnings in tests.

### Pitfall 2: Fallback Model Returning Different Response Format
**What goes wrong:** Primary model returns structured JSON but fallback model formats differently, breaking parsing.
**Why it happens:** Different models have different response styles, especially for structured output.
**How to avoid:** Keep fallback models in the same family (Gemini 2.5 Flash -> Gemini 2.5 Flash Lite). Both follow the same instruction-tuning patterns. For title generation and summaries, the output is simple enough that cross-family differences are negligible.
**Warning signs:** JSON parse errors in conversation summary generation when fallback model is active.

### Pitfall 3: Circuit Breaker Shared Between Unrelated Calls
**What goes wrong:** Title generation failure opens the circuit breaker for the main chat.
**Why it happens:** Both use the same "ai-gateway" circuit breaker name.
**How to avoid:** Use the same circuit breaker name for title/summary/chat since they all go through OpenRouter to the same model family. If one is down, the others likely are too. The OpenRouter fallback will kick in before the circuit opens.
**Warning signs:** Chat failing when it shouldn't because a background title generation opened the circuit.

### Pitfall 4: Weather Tool Returning Error Object Instead of User-Friendly Message
**What goes wrong:** Tool returns `{ error: "NetworkError" }` which the AI model passes through verbatim to the user.
**Why it happens:** The AI model doesn't know how to interpret raw error objects.
**How to avoid:** Return human-readable error messages that the AI can incorporate naturally: `{ error: "I couldn't fetch the weather right now. The weather service seems to be temporarily unavailable." }`
**Warning signs:** Users seeing technical error messages in chat responses.

### Pitfall 5: Timeout Too Short for streamText
**What goes wrong:** Setting `totalMs: 10000` on `streamText` kills legitimate long responses.
**Why it happens:** Confusing `generateText` timeout needs (10s for short tasks) with `streamText` timeout needs (longer for full responses).
**How to avoid:** Use `chunkMs` for stall detection (15s between chunks) and keep `totalMs` under the Vercel limit (55s for 60s function). Only use short `totalMs` for `generateText` tasks (title, summary).
**Warning signs:** Long chat responses being cut off mid-stream.

### Pitfall 6: RLS Masking Authorization Bugs
**What goes wrong:** Code works in testing because RLS silently filters unauthorized rows, but the tool returns "not found" for unauthorized access, leaking that the resource ID is valid.
**Why it happens:** Supabase RLS returns empty results for unauthorized queries, not errors.
**How to avoid:** Add explicit ownership check in application code: compare `document.userId` with `session.user.id`. Return uniform error message regardless of whether document doesn't exist or isn't owned by the user.
**Warning signs:** Tool returning "Document not found" for documents that exist but belong to other users.

## Code Examples

Verified patterns from official sources:

### 1. OpenRouter Fallback Model Configuration
```typescript
// Source: https://openrouter.ai/docs/guides/routing/model-fallbacks
// Source: @openrouter/ai-sdk-provider README (extraBody docs)

// When the primary model (first in array) is unavailable, OpenRouter
// automatically tries the next model. Pricing is based on whichever
// model actually processes the request.
const chatModel = openrouter("google/gemini-2.5-flash", {
  extraBody: {
    models: [
      "google/gemini-2.5-flash",       // Primary: stable production model
      "google/gemini-2.5-flash-lite",   // Fallback: lighter but capable
    ],
  },
});
```

### 2. AI SDK Timeout for generateText
```typescript
// Source: https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text

const { text } = await generateText({
  model: myProvider.languageModel("title-model"),
  system: "Generate a short title...",
  prompt: JSON.stringify(message),
  timeout: { totalMs: 10_000 }, // 10s hard timeout
});
```

### 3. AI SDK Timeout for streamText (with chunk stall detection)
```typescript
// Source: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text

const result = streamText({
  model: myProvider.languageModel(selectedChatModel),
  system: systemPromptText,
  messages: convertToModelMessages(uiMessages),
  timeout: {
    totalMs: 55_000,  // Just under Vercel 60s limit
    chunkMs: 15_000,  // Abort if no chunk for 15s (stalled stream)
  },
  abortSignal: request.signal, // Propagate client disconnect
  tools: { /* ... */ },
});
```

### 4. Weather Tool with Full Error Handling
```typescript
// Pattern: try/catch + AbortController + response.ok + schema validation

execute: async (input) => {
  let latitude: number;
  let longitude: number;

  if ("city" in input) {
    const coords = await geocodeCity(input.city);
    if (!coords) {
      return {
        error: `I couldn't find the location "${input.city}". Could you check the spelling?`,
      };
    }
    latitude = coords.latitude;
    longitude = coords.longitude;
  } else {
    latitude = input.latitude;
    longitude = input.longitude;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
      { signal: controller.signal },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        error: "The weather service is temporarily unavailable. Please try again in a moment.",
      };
    }

    const weatherData = await response.json();

    // Validate expected response structure
    if (!weatherData.current || typeof weatherData.current.temperature_2m !== "number") {
      return {
        error: "Received unexpected data from the weather service. Please try again.",
      };
    }

    if ("city" in input) {
      weatherData.cityName = input.city;
    }

    return weatherData;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        error: "The weather request timed out. The service may be slow right now.",
      };
    }
    return {
      error: "I couldn't fetch the weather right now. Please try again later.",
    };
  }
},
```

### 5. Tool Authorization Pattern (requestSuggestions)
```typescript
// Pattern: Uniform error response that doesn't leak resource existence

execute: async ({ documentId }) => {
  if (!session?.user?.id) {
    return { error: "You must be logged in to request suggestions." };
  }

  const document = await getDocumentById({ id: documentId });

  // Same error whether document doesn't exist or isn't owned by user
  if (!document || !document.content || document.userId !== session.user.id) {
    return { error: "Document not found or access denied." };
  }

  // ... proceed with generating suggestions
},
```

### 6. Strategy Canvas Fast-Fail Auth
```typescript
// Pattern: Auth check before any DB operations

execute: async ({ action, section, items }: StrategyCanvasInput) => {
  // Fast-fail: auth check FIRST
  if (!session?.user?.id) {
    return {
      success: false,
      message: "You must be logged in to use the Strategy Canvas.",
    };
  }

  // Validate inputs before DB
  if (action !== "populate" || !section || !items || items.length === 0) {
    return { success: false, message: "Invalid action or missing section/items." };
  }

  const canvasType = sectionToCanvasType[section];
  if (!canvasType) {
    return {
      success: false,
      message: `Unknown section: ${section}. Valid sections are: ${Object.keys(sectionToCanvasType).join(", ")}`,
    };
  }

  try {
    // ... DB operations
  } catch (error) {
    // Specific error handling instead of generic
    if (error instanceof ChatSDKError) {
      return { success: false, message: "Database error while saving canvas." };
    }
    console.error("[Strategy Canvas] Unexpected error:", error);
    return { success: false, message: "An unexpected error occurred. Please try again." };
  }
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `google/gemini-3-flash-preview` (preview) | `google/gemini-2.5-flash` (stable) | Gemini 2.5 Flash GA: June 2025 | Stable model ID, predictable pricing ($0.30/$2.50 per M tokens) |
| Manual `AbortController` + `setTimeout` | AI SDK `timeout: { totalMs, stepMs, chunkMs }` | AI SDK 5.x | Built-in cleanup, chunk stall detection |
| No fallback | OpenRouter `models` array | OpenRouter feature (stable) | Automatic server-side failover, transparent to client |
| `withCircuitBreaker` only | `withAIGatewayResilience` (circuit + retry) | Already in codebase | Combined resilience, pre-configured for AI gateway |

**Deprecated/outdated:**
- `google/gemini-3-flash-preview`: Preview model, not versioned, can change without notice. Replace with `google/gemini-2.5-flash` (stable) as primary.
- Manual `AbortController` timeout for AI SDK calls: Use the native `timeout` parameter instead. Manual `AbortController` is still appropriate for raw `fetch` calls (weather API).

## Open Questions

1. **Gemini 3 Flash stable release timing**
   - What we know: `google/gemini-3-flash-preview` exists on OpenRouter but is explicitly preview. `google/gemini-2.5-flash` is stable (GA June 2025).
   - What's unclear: When Gemini 3 Flash will have a stable ID on OpenRouter.
   - Recommendation: Switch to `google/gemini-2.5-flash` now (stable, cheaper at $0.30/$2.50 vs $0.50/$3.00). When Gemini 3 Flash goes GA, upgrade intentionally.

2. **Document RLS policy scope**
   - What we know: `getDocumentById` uses Supabase client which applies RLS. The Document table has RLS enabled.
   - What's unclear: Whether RLS policy filters by `userId` (meaning unauthorized queries return null) or uses a different mechanism.
   - Recommendation: Add explicit `document.userId !== session.user.id` check in application code regardless. Defense in depth.

3. **Circuit breaker naming strategy for background tasks**
   - What we know: The main chat route uses `recordCircuitSuccess/Failure("ai-gateway")`. Title generation and summary generation also use OpenRouter.
   - What's unclear: Whether title/summary failures should affect the "ai-gateway" circuit breaker for the main chat flow.
   - Recommendation: Use the same "ai-gateway" circuit name since all calls go through OpenRouter. If OpenRouter is down, they all fail. The OpenRouter fallback model will engage before the circuit opens (5 failures threshold).

## Sources

### Primary (HIGH confidence)
- `ai@5.0.118` package - `timeout` parameter on `generateText` and `streamText`
  - https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
  - https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text
- `@openrouter/ai-sdk-provider@1.5.4` - `extraBody` configuration for models array
  - https://github.com/OpenRouterTeam/ai-sdk-provider (README)
- OpenRouter Model Fallbacks documentation
  - https://openrouter.ai/docs/guides/routing/model-fallbacks
- OpenRouter model pages (verified model IDs and pricing)
  - https://openrouter.ai/google/gemini-2.5-flash (stable, GA June 2025, $0.30/$2.50)
  - https://openrouter.ai/google/gemini-2.5-flash-lite (stable, lighter variant)
  - https://openrouter.ai/google/gemini-3-flash-preview (preview, not stable)
- Codebase files (direct reads):
  - `lib/resilience.ts` - circuit breaker, retry, combined wrappers
  - `lib/ai/providers.ts` - current model configuration
  - `lib/ai/tools/get-weather.ts` - current weather tool
  - `lib/ai/tools/request-suggestions.ts` - current suggestions tool
  - `lib/ai/tools/strategy-canvas.ts` - current canvas tool
  - `lib/ai/conversation-summarizer.ts` - current summarizer
  - `app/(chat)/actions.ts` - `generateTitleFromUserMessage`
  - `app/(chat)/api/chat/route.ts` - main chat route

### Secondary (MEDIUM confidence)
- AI SDK Provider Management docs - `customProvider` with `fallbackProvider`
  - https://ai-sdk.dev/docs/ai-sdk-core/provider-management
- AI SDK Middleware docs - `wrapLanguageModel` for custom middleware
  - https://ai-sdk.dev/docs/ai-sdk-core/middleware

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and verified in package.json
- Architecture: HIGH - Patterns verified against official AI SDK and OpenRouter docs
- Pitfalls: HIGH - Identified from direct codebase analysis and audit findings

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (30 days - stable libraries, no breaking changes expected)
