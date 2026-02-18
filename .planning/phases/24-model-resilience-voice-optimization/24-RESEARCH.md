# Phase 24: Model Resilience & Voice Optimization - Research

**Researched:** 2026-02-18
**Domain:** AI provider resilience, TTS caching, streaming audio optimization
**Confidence:** HIGH

## Summary

This phase addresses two complementary concerns: making the AI chat pipeline survive OpenRouter outages/rate-limits gracefully, and reducing ElevenLabs TTS costs through caching and streaming improvements. The codebase already has a solid resilience foundation -- circuit breakers, retry with exponential backoff, and model-level fallbacks via OpenRouter's `models` array in `extraBody`. What is missing is: (1) parsing OpenRouter's rate-limit response headers to avoid hammering a rate-limited provider, (2) a true secondary AI provider for when OpenRouter itself is completely down, (3) per-segment error isolation in collaborative voice mode, (4) TTS audio caching to avoid regenerating identical audio, and (5) an active OpenRouter health probe in the health check endpoint.

The existing `lib/resilience.ts` module is well-structured with `withCircuitBreaker`, `withRetry`, `recordCircuitSuccess`/`recordCircuitFailure`, and pre-configured wrappers. The chat route already uses the circuit breaker pattern manually (checking `isCircuitOpen("ai-gateway")` before streaming). The voice routes (`/api/voice` and `/api/realtime/stream`) use `withElevenLabsResilience` for TTS calls. The realtime route has a critical issue: it converts audio to base64 data URLs (`data:audio/mpeg;base64,...`), which bloats JSON response size by ~33% and prevents browser caching.

For TTS caching, Vercel Blob (already in the project as `@vercel/blob`) is the natural choice -- store audio keyed by a hash of (text + voiceId + modelId + voice_settings), serve via CDN with immutable caching. This eliminates redundant ElevenLabs API calls for repeated voice playback of the same message. For the secondary AI provider, since OpenRouter already provides model-level fallback within its own routing, a true secondary means a direct Google Gemini or Anthropic API key that bypasses OpenRouter entirely -- or using the `ai-fallback` library to wrap the provider chain at the AI SDK level.

**Primary recommendation:** Layer three improvements on the existing resilience infrastructure: (1) add retry-after header parsing to the chat route's error handler, (2) add a direct Gemini provider as secondary fallback using `ai-fallback`, (3) implement Vercel Blob-backed TTS cache with SHA-256 content hashing.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@openrouter/ai-sdk-provider` | ^1.5.4 | OpenRouter AI gateway | Already the primary AI provider |
| `ai` | ^5.0.118 | Vercel AI SDK | Already handles streaming, tools, model wrapping |
| `@vercel/blob` | ^0.24.1 | Blob storage with CDN | Already installed, ideal for audio cache |
| `redis` | ^5.0.0 | Rate limiting, cache metadata | Already used for rate limiting |
| `zod` | ^3.25.76 | Schema validation | Already used throughout |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@ai-sdk/google` | latest | Direct Google Gemini provider | Secondary fallback when OpenRouter is down |
| `ai-fallback` | latest | Provider-level fallback chain | Wraps primary + secondary providers with automatic failover |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ai-fallback` | Manual try/catch fallback | `ai-fallback` handles streaming correctly, manual is error-prone for stream interruption |
| `@ai-sdk/google` (direct) | `@ai-sdk/anthropic` (direct) | Google Gemini is cheaper and the project already uses Gemini models via OpenRouter |
| Vercel Blob for TTS cache | Supabase Storage | Vercel Blob has built-in CDN, lower latency for Vercel-hosted apps |
| Vercel Blob for TTS cache | Redis for small audio | Audio files are 50KB-500KB, too large for Redis; Blob is purpose-built |

**Installation:**
```bash
pnpm add @ai-sdk/google ai-fallback
```

## Architecture Patterns

### Recommended File Structure
```
lib/
├── ai/
│   ├── providers.ts           # MODIFY: add secondary Gemini provider + fallback chain
│   └── voice-config.ts        # EXISTING: voice settings (no changes needed)
├── resilience.ts              # MODIFY: add retry-after parsing, fix error classification
├── tts-cache.ts               # NEW: TTS cache with Vercel Blob + hash keys
└── voice/
    └── strip-markdown-tts.ts  # EXISTING: markdown stripping (no changes needed)
app/
├── (chat)/api/
│   ├── chat/route.ts          # MODIFY: add retry-after header respect
│   ├── voice/route.ts         # MODIFY: add TTS cache lookup, per-segment error isolation
│   └── realtime/
│       ├── route.ts           # MODIFY: return audio URL instead of base64
│       └── stream/route.ts    # MODIFY: add rate limiting, return audio URL instead of base64
└── api/
    └── health/route.ts        # MODIFY: add OpenRouter probe
```

### Pattern 1: Retry-After Header Parsing
**What:** Parse OpenRouter's rate-limit headers from error responses and delay retries accordingly
**When to use:** On 429 responses from OpenRouter
**Example:**
```typescript
// In lib/resilience.ts - enhance withRetry to support retry-after
interface RetryOptions {
  // ... existing fields ...
  respectRetryAfter?: boolean; // NEW: parse Retry-After from response headers
}

// When catching errors, check for retry-after metadata
function getRetryAfterMs(error: unknown): number | null {
  // OpenRouter includes rate limit info in error metadata
  // The AI SDK wraps errors; check for response headers
  if (error instanceof Error && 'responseHeaders' in error) {
    const headers = (error as any).responseHeaders;
    const retryAfter = headers?.get?.('retry-after');
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (!isNaN(seconds)) return seconds * 1000;
      // Could also be an HTTP date
      const date = new Date(retryAfter);
      if (!isNaN(date.getTime())) return date.getTime() - Date.now();
    }
    // Also check x-ratelimit-reset (epoch ms)
    const resetMs = headers?.get?.('x-ratelimit-reset');
    if (resetMs) {
      const resetTime = Number(resetMs);
      if (!isNaN(resetTime)) {
        return Math.max(0, resetTime - Date.now());
      }
    }
  }
  return null;
}
```

### Pattern 2: Provider Fallback Chain
**What:** Use `ai-fallback` to create a model that tries OpenRouter first, then direct Gemini
**When to use:** When OpenRouter is completely down (not just rate-limited)
**Example:**
```typescript
// In lib/ai/providers.ts
import { createFallback } from 'ai-fallback';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const googleDirect = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || '',
});

// Create fallback-wrapped model
const chatModelWithFallback = createFallback({
  models: [
    openrouter("google/gemini-2.5-flash", {
      extraBody: {
        models: ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"],
      },
    }),
    googleDirect("gemini-2.0-flash"), // Direct fallback bypassing OpenRouter
  ],
  onError: (error, modelId) => {
    logger.warn({ err: error, modelId }, 'AI model failed, trying fallback');
  },
  modelResetInterval: 60000, // Try primary again after 1 minute
});
```

### Pattern 3: TTS Cache with Content-Addressable Hashing
**What:** Hash TTS parameters to create cache keys, store audio in Vercel Blob
**When to use:** Every TTS request -- check cache before calling ElevenLabs
**Example:**
```typescript
// In lib/tts-cache.ts
import { put, head } from '@vercel/blob';
import { createHash } from 'crypto';

interface TTSCacheParams {
  text: string;
  voiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
}

function generateCacheKey(params: TTSCacheParams): string {
  const hash = createHash('sha256')
    .update(JSON.stringify({
      text: params.text,
      voiceId: params.voiceId,
      modelId: params.modelId,
      stability: params.stability,
      similarityBoost: params.similarityBoost,
    }))
    .digest('hex');
  return `tts-cache/${hash}.mp3`;
}

export async function getCachedAudio(params: TTSCacheParams): Promise<string | null> {
  const key = generateCacheKey(params);
  try {
    const blob = await head(key);
    return blob?.url ?? null;
  } catch {
    return null; // Cache miss
  }
}

export async function cacheAudio(params: TTSCacheParams, audioBuffer: ArrayBuffer): Promise<string> {
  const key = generateCacheKey(params);
  const blob = await put(key, new Uint8Array(audioBuffer), {
    access: 'public',
    contentType: 'audio/mpeg',
    addRandomSuffix: false, // Use deterministic path for cache hits
  });
  return blob.url;
}
```

### Pattern 4: Per-Segment Error Isolation for Collaborative Voice
**What:** Wrap each segment's TTS generation in try/catch, continue with remaining segments on failure
**When to use:** Collaborative mode with multiple speakers
**Example:**
```typescript
// In voice route - collaborative segment generation
const audioBuffers: ArrayBuffer[] = [];
const previousRequestIds: string[] = [];
const failedSegments: number[] = [];

for (let i = 0; i < validSegments.length; i++) {
  const segment = validSegments[i];
  try {
    const voiceConfig = getVoiceConfig(segment.speaker);
    const result = await generateAudioForSegment(
      segment.text,
      voiceConfig,
      apiKey,
      previousRequestIds,
    );
    audioBuffers.push(result.buffer);
    if (result.requestId) {
      previousRequestIds.push(result.requestId);
    }
  } catch (err) {
    logger.warn({ err, segmentIndex: i, speaker: segment.speaker },
      'Collaborative segment TTS failed, skipping');
    failedSegments.push(i);
    // Continue with remaining segments -- don't let one failure kill the response
  }
}

if (audioBuffers.length === 0) {
  // All segments failed -- return text-only response or error
  return Response.json({ error: 'Voice generation failed for all segments' }, { status: 503 });
}
```

### Pattern 5: OpenRouter Health Probe
**What:** Make a lightweight request to OpenRouter's `/api/v1/key` endpoint to verify reachability
**When to use:** In the health check endpoint
**Example:**
```typescript
// In app/api/health/route.ts
async function probeOpenRouter(): Promise<{ status: 'up' | 'down'; latencyMs?: number }> {
  if (!process.env.OPENROUTER_API_KEY) {
    return { status: 'down' };
  }
  const start = Date.now();
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000); // 5s timeout
    const res = await fetch('https://openrouter.ai/api/v1/key', {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
      signal: controller.signal,
    });
    const latencyMs = Date.now() - start;
    return { status: res.ok ? 'up' : 'down', latencyMs };
  } catch {
    return { status: 'down' };
  }
}
```

### Anti-Patterns to Avoid
- **Retrying non-transient errors:** The current `recordCircuitFailure` in the chat route's `onError` records ALL errors, including 400-level client errors. Only 429, 5xx, and network errors should open the circuit breaker. (RESIL-06)
- **Base64 data URLs for audio:** The realtime route currently converts audio to `data:audio/mpeg;base64,...`. This bloats response size by 33%, prevents browser caching, and wastes memory. Return a URL to cached audio instead.
- **Sequential segment generation without error isolation:** Currently, if any segment fails in collaborative mode, the `for` loop throws and the entire response fails. Each segment should be independently fault-tolerant.
- **Hammering rate-limited providers:** Without retry-after parsing, the exponential backoff may retry too aggressively during rate-limiting windows.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Provider failover | Custom try/catch chain for each model call | `ai-fallback` library | Handles streaming correctly, resets to primary after interval, battle-tested |
| Content-addressable audio storage | Custom file system or S3 integration | Vercel Blob (`@vercel/blob`) | Already installed, CDN-backed, deterministic paths with `addRandomSuffix: false` |
| Rate limit header parsing | Custom header parsing per-provider | Standard `Retry-After` and `X-RateLimit-*` parsing | HTTP standard, well-defined semantics |
| OpenRouter health monitoring | Polling external status page | Direct `/api/v1/key` probe | Lightweight, auth-gated, returns rate limit info too |

**Key insight:** The resilience infrastructure already exists (`lib/resilience.ts`). This phase enhances it rather than rebuilding it. The biggest wins come from: (1) teaching the retry system to respect server-provided backoff times, (2) adding a fallback that completely bypasses OpenRouter, and (3) eliminating redundant TTS API calls through caching.

## Common Pitfalls

### Pitfall 1: Circuit Breaker Counting Non-Transient Errors
**What goes wrong:** A burst of 400 Bad Request errors (user input issues) opens the circuit breaker, blocking all subsequent valid requests for 30 seconds.
**Why it happens:** `recordCircuitFailure("ai-gateway")` is called in the chat route's `onError` callback without distinguishing error types.
**How to avoid:** Classify errors before recording. Only record 429, 5xx, network timeout, and connection errors as circuit breaker failures. 400, 401, 403 are client errors and should NOT open the circuit.
**Warning signs:** Circuit breaker opens during normal traffic with no actual provider outage.

### Pitfall 2: Vercel Blob Cache Key Collisions
**What goes wrong:** Different voice settings produce the same cache key, returning wrong audio.
**Why it happens:** Cache key hash doesn't include all relevant parameters (stability, similarity_boost, style, speaker_boost).
**How to avoid:** Include ALL voice config parameters in the hash input. Use a canonical JSON serialization (sorted keys) to ensure deterministic hashing.
**Warning signs:** Audio sounds wrong for specific voice configurations after cache implementation.

### Pitfall 3: Retry-After Header Ignored During Streaming
**What goes wrong:** The streaming chat route uses `streamText` which handles its own connection. Rate limit headers from the initial response may not propagate through the AI SDK's error handling.
**Why it happens:** The AI SDK abstracts away HTTP details. Error objects may not include raw response headers.
**How to avoid:** Check the AI SDK error object's structure. If it includes response metadata, extract headers. If not, use the circuit breaker as the fallback mechanism (the retry-after parsing applies to the resilience wrapper, not the streaming path directly).
**Warning signs:** Rate-limited requests retry immediately instead of waiting.

### Pitfall 4: TTS Cache Grows Unbounded
**What goes wrong:** Vercel Blob storage costs increase steadily as unique TTS requests accumulate.
**Why it happens:** Every unique text+voice combination creates a new cached blob that never expires.
**How to avoid:** Implement TTL-based cleanup. Store cache metadata (creation date, last accessed) in Redis or a simple DB table. Run periodic cleanup to delete blobs older than 30 days.
**Warning signs:** Blob storage usage grows linearly with no plateau.

### Pitfall 5: Secondary Provider Missing API Key
**What goes wrong:** The fallback to direct Google Gemini silently fails because `GOOGLE_AI_API_KEY` is not configured in production.
**Why it happens:** The secondary provider is added in code but the environment variable is not set on Vercel.
**How to avoid:** Log a warning at startup if the secondary provider key is missing. The health check should report the secondary provider status. The app should still function with just OpenRouter.
**Warning signs:** Fallback never activates during testing; first real outage reveals the missing key.

### Pitfall 6: Base64 Audio URL Memory Pressure
**What goes wrong:** The realtime route creates `data:audio/mpeg;base64,...` strings that can be 200KB+ per response, consuming significant server memory when under load.
**Why it happens:** `Buffer.from(audioData).toString("base64")` creates a large string that lives in the JSON response body.
**How to avoid:** Store audio in Vercel Blob and return the CDN URL. Client fetches audio separately. This also enables browser caching of audio.
**Warning signs:** Memory pressure on serverless functions, slow JSON serialization for voice responses.

## Code Examples

### Verified: OpenRouter Model Fallback (Already in Codebase)
```typescript
// Source: lib/ai/providers.ts (existing pattern)
// OpenRouter's native fallback - tries models in order
openrouter("google/gemini-2.5-flash", {
  extraBody: {
    models: [
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite",
    ],
  },
}),
```

### Verified: OpenRouter Key Check Endpoint
```typescript
// Source: https://openrouter.ai/docs/api/api-reference/credits/get-credits
// Health probe - lightweight check that OpenRouter is reachable
const res = await fetch('https://openrouter.ai/api/v1/key', {
  headers: { Authorization: `Bearer ${apiKey}` },
});
// Returns: { label, usage, limit, is_free_tier, rate_limit: { requests, interval } }
```

### Verified: Vercel Blob Put with Deterministic Path
```typescript
// Source: https://vercel.com/docs/vercel-blob/using-blob-sdk
import { put, head } from '@vercel/blob';

// Store with deterministic path (no random suffix)
const blob = await put('tts-cache/abc123.mp3', audioBuffer, {
  access: 'public',
  contentType: 'audio/mpeg',
  addRandomSuffix: false, // Critical: enables cache lookup by path
});
// blob.url = CDN URL, globally cached
```

### Verified: ai-fallback Library Usage
```typescript
// Source: https://github.com/remorses/ai-fallback
import { createFallback } from 'ai-fallback';

const model = createFallback({
  models: [primaryModel, secondaryModel],
  onError: (error, modelId) => {
    logger.warn({ err: error, modelId }, 'Model failed, trying fallback');
  },
  modelResetInterval: 60000, // Reset to primary after 1 min
});

// Works with streamText
const stream = await streamText({ model, system: '...', messages: [...] });
```

### Zod Validation for Conversation Summarizer
```typescript
// Source: RESIL-04 requirement - validate AI JSON output with Zod
import { z } from 'zod';

const summarySchema = z.object({
  summary: z.string().min(1).max(1000),
  topics: z.array(z.string()).min(1).max(10),
  importance: z.number().int().min(1).max(10),
});

// In generateConversationSummary, replace JSON.parse with:
const jsonMatch = result.text.match(/\{[\s\S]*\}/);
if (!jsonMatch) return null;

const parseResult = summarySchema.safeParse(JSON.parse(jsonMatch[0]));
if (!parseResult.success) {
  logger.warn({ errors: parseResult.error.issues }, 'Summarizer returned invalid JSON');
  return null;
}
return {
  text: parseResult.data.summary,
  topics: parseResult.data.topics,
  importance: parseResult.data.importance,
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual try/catch for provider failover | `ai-fallback` library for automatic model failover | 2024 | Clean abstraction, handles streaming edge cases |
| OpenRouter only via single provider | OpenRouter `models` array + direct provider fallback | 2024-2025 | Multi-layer resilience: within-OpenRouter + beyond-OpenRouter |
| Regenerate TTS every request | Content-addressable TTS cache in Blob storage | Current best practice | 90%+ cost reduction for repeated playback |
| Base64 data URLs for audio | CDN-hosted audio with URL reference | Current best practice | 33% smaller responses, browser caching, lower memory |
| Fixed exponential backoff | Retry-After header-aware backoff | HTTP standard | Provider-cooperative rate limiting |

**Deprecated/outdated:**
- The `@openrouter/ai-sdk-provider` v1.x is being superseded by v2.x for AI SDK 6. Current project uses v1.5.4 which is correct for AI SDK 5.x.
- OpenRouter's older model fallback syntax (separate field) has been consolidated into the `models` array in `extraBody`.

## Open Questions

1. **Does the AI SDK 5 error object expose response headers from OpenRouter?**
   - What we know: The AI SDK abstracts HTTP details. The `@openrouter/ai-sdk-provider` does not document header exposure.
   - What's unclear: Whether 429 errors from OpenRouter include `Retry-After` or `X-RateLimit-Reset` headers accessible from the error object.
   - Recommendation: Test empirically by triggering a rate limit. If headers are not accessible, fall back to using the circuit breaker timeout as the backoff mechanism. The `/api/v1/key` endpoint can also be polled to check rate limit status.

2. **Google AI API key availability for secondary fallback**
   - What we know: The project currently uses only OpenRouter. A direct Google Gemini API key would bypass OpenRouter entirely.
   - What's unclear: Whether Fawzi has or wants to set up a separate Google AI API key.
   - Recommendation: Implement the secondary provider as opt-in. If `GOOGLE_AI_API_KEY` is not set, skip the fallback and rely on OpenRouter's internal model fallback. Log a warning at startup.

3. **Vercel Blob storage limits and pricing for TTS cache**
   - What we know: Vercel Blob pricing is usage-based. TTS audio files are typically 50KB-500KB. Blobs under 512MB are CDN-cached.
   - What's unclear: Expected volume of unique TTS requests per month and resulting storage costs.
   - Recommendation: Implement cache with a 30-day TTL. Monitor blob count and storage usage. Add a cleanup cron or edge function if needed.

4. **`ai-fallback` compatibility with AI SDK 5 and `wrapLanguageModel`**
   - What we know: `ai-fallback` works with AI SDK's `generateText` and `streamText`. The project wraps models with `safetyMiddleware`.
   - What's unclear: Whether `createFallback` works correctly with models already wrapped by `wrapLanguageModel`.
   - Recommendation: Test the combination. The fallback should wrap the already-wrapped models (middleware applied before fallback).

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `lib/ai/providers.ts`, `lib/resilience.ts`, `app/(chat)/api/chat/route.ts`, `app/(chat)/api/voice/route.ts`, `app/(chat)/api/realtime/route.ts`, `app/(chat)/api/realtime/stream/route.ts`, `app/api/health/route.ts`, `lib/ai/conversation-summarizer.ts`
- [OpenRouter Model Fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks) - models array, automatic failover
- [OpenRouter Rate Limits](https://openrouter.ai/docs/api/reference/limits) - rate limit structure
- [OpenRouter API Key Check](https://openrouter.ai/docs/api/api-reference/credits/get-credits) - `/api/v1/key` endpoint
- [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk) - `put`, `head`, `addRandomSuffix`
- [ai-fallback GitHub](https://github.com/remorses/ai-fallback) - `createFallback` API, streaming support

### Secondary (MEDIUM confidence)
- [OpenRouter Error Handling](https://openrouter.ai/docs/api/reference/errors-and-debugging) - 429 error format
- [ElevenLabs Best Practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices) - TTS optimization
- [AI SDK Provider Management](https://ai-sdk.dev/docs/ai-sdk-core/provider-management) - `customProvider`, `fallbackProvider`
- [ElevenLabs Streaming and Caching](https://elevenlabs.io/docs/cookbooks/text-to-speech/streaming-and-caching-with-supabase) - cache architecture pattern

### Tertiary (LOW confidence)
- OpenRouter's exact `Retry-After` header format -- documentation is sparse, needs empirical testing
- `ai-fallback` compatibility with `wrapLanguageModel` middleware -- not documented, needs testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all core libraries already installed, only two new dependencies
- Architecture: HIGH - patterns well-established, codebase patterns clear from inspection
- Pitfalls: HIGH - most identified from direct codebase inspection (circuit breaker error classification, base64 bloat, missing error isolation)
- Retry-After parsing: MEDIUM - OpenRouter docs don't explicitly document the header, but HTTP standard applies
- `ai-fallback` integration: MEDIUM - library is simple but untested with this specific stack combination

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (30 days - stable domain, existing infrastructure)
