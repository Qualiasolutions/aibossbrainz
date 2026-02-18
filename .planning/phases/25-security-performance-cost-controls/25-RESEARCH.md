# Phase 25: Security, Performance & Cost Controls - Research

**Researched:** 2026-02-18
**Domain:** API security hardening, chat performance optimization, AI cost observability
**Confidence:** HIGH

## Summary

This phase addresses 10 specific requirements across three domains: security validation hardening (SEC-01 to SEC-03), chat performance optimization (PERF-01 to PERF-03), and AI cost controls (COST-01 to COST-04). Research reveals that the codebase already has strong foundations in each area -- the work is primarily about closing gaps, not building from scratch.

**Security:** The main chat route already handles Zod errors correctly (catches and returns generic `ChatSDKError`), but 7 other routes leak `error.flatten()` or `error.errors` details to clients. The demo chat route explicitly sends `details: error.errors` in its ZodError catch block. CSP currently uses `'unsafe-inline'` for `script-src` in `vercel.json` -- moving to nonces requires middleware-based dynamic CSP headers and forces all pages to dynamic rendering, which is a significant architectural change. The `ajv` vulnerability (ReDoS, moderate severity) comes through `@sentry/nextjs > @sentry/webpack-plugin > webpack > schema-utils > ajv@8.17.1` and needs `>=8.18.0`.

**Performance:** The chat page server component (`app/(chat)/chat/[id]/page.tsx` line 48) loads ALL messages without a limit, while the API route already uses bounded messages (`limit: MAX_CONTEXT_MESSAGES`). Pagination requires both server-side changes (paginated query endpoint) and client-side changes (scroll-to-load with `setMessages`). Conversation summaries are generated on EVERY chat completion (when messages >= 4), with no interval throttling. Stream failure cleanup is partially handled (the `onError` callback restores input), but dangling assistant messages saved during streaming are not rolled back.

**Cost:** Cost tracking infrastructure (`AICostLog` table, `recordAICost`, daily cron, admin alerts) already exists and works. The demo chat route does NOT log any cost data. Model versioning has a documentation mismatch: `models.ts` says "Gemini 3 Flash Pro" while `providers.ts` uses `google/gemini-2.5-flash`. OpenRouter supports date-pinned model slugs like `google/gemini-2.5-flash-preview-09-2025`, but the current `google/gemini-2.5-flash` is the stable alias. Per-user spending alerts do not exist yet -- only global daily totals are tracked.

**Primary recommendation:** Fix the Zod error leaks first (quick, high-security-impact), then address model documentation alignment and demo cost tracking (quick wins), then tackle pagination and per-user spending (larger efforts). Defer CSP nonce migration to a separate phase due to its architectural impact.

## Standard Stack

### Core (Already in Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | ^3.25.76 | Request validation | Already used everywhere; `.flatten()` output must NOT reach clients |
| next | 15.5.11 | Framework | Middleware for CSP nonces; `after()` for background cost tracking |
| @sentry/nextjs | ^10.32.1 | Error monitoring | Source of transitive ajv vulnerability |
| tokenlens | 1.3.0 | Token cost calculation | Already integrated for cost enrichment in chat route |
| pino | ^10.2.0 | Structured logging | Already used for all cost/security logging |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @openrouter/ai-sdk-provider | ^1.5.4 | OpenRouter integration | Model slug configuration for pinning |
| ai | ^5.0.118 | Vercel AI SDK | `useChat` + `setMessages` for pagination |
| redis | ^5.0.0 | Rate limiting cache | Could extend for per-user cost caching |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSP nonces via middleware | Keep `unsafe-inline` + SRI | Nonces force dynamic rendering for all pages; SRI is less strict but no perf penalty |
| Custom per-user cost alerts | PostHog/Sentry cost events | External tools add dependency; custom is simpler given existing AICostLog |
| Client-side message pagination | Server-sent pagination via SSE | SSE pagination adds complexity; simple REST endpoint + `setMessages` is simpler |

## Architecture Patterns

### Pattern 1: Sanitized Zod Error Responses
**What:** Replace all `error.flatten()` / `error.errors` responses with generic error messages
**When to use:** Every API route that uses Zod validation

**Affected routes (7 routes leak details):**
```
app/api/demo/chat/route.ts:200-201       -> details: error.errors
app/(chat)/api/document/route.ts:90      -> error: parsed.error.flatten()
app/(chat)/api/vote/route.ts:67          -> error: parsed.error.flatten()
app/(chat)/api/subscription/route.ts:196 -> error: parsed.error.flatten()
app/(chat)/api/support/route.ts:55       -> error: parsed.error.flatten()
app/(chat)/api/support/[ticketId]/messages/route.ts:33 -> error: parsed.error.flatten()
app/(chat)/api/profile/route.ts:150      -> details: parseResult.error.flatten()
app/(chat)/api/canvas/route.ts:90        -> error: parseResult.error.flatten()
```

**Correct pattern (already used in main chat route and stripe checkout):**
```typescript
// Source: app/(chat)/api/chat/route.ts lines 127-134
try {
    requestBody = postRequestBodySchema.parse(json);
} catch (error) {
    apiLog.error(error, { phase: "validation" });
    return new ChatSDKError("bad_request:api").toResponse();
}

// For routes using safeParse:
const parsed = schema.safeParse(body);
if (!parsed.success) {
    logger.warn({ errors: parsed.error.flatten() }, "Validation failed");
    return new ChatSDKError("bad_request:api").toResponse();
}
```

**Key insight:** Log the Zod details server-side (for debugging), return generic error to client.

### Pattern 2: Message Pagination for Chat Page
**What:** Load initial N messages on page load, fetch older messages on scroll-up
**When to use:** Chat page with long conversation history

```
Server Component (page.tsx)
    |
    v
getMessagesByChatId({ id, limit: 50 })  // Initial load: last 50
    |
    v
Chat component receives initialMessages (50 messages)
    |
    v
User scrolls to top -> GET /api/chat/messages?chatId=X&before=<oldest_createdAt>&limit=50
    |
    v
setMessages(prevMessages => [...olderMessages, ...prevMessages])
```

**Database query pattern:**
```typescript
// New paginated query function
export async function getMessagesByChatIdPaginated({
    id,
    limit = 50,
    before,
}: {
    id: string;
    limit?: number;
    before?: string; // ISO timestamp cursor
}) {
    const supabase = await createClient();
    let query = supabase
        .from("Message_v2")
        .select("*")
        .eq("chatId", id)
        .is("deletedAt", null)
        .order("createdAt", { ascending: false })
        .limit(limit);

    if (before) {
        query = query.lt("createdAt", before);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).reverse(); // Return in ascending order
}
```

### Pattern 3: Interval-Based Summary Generation
**What:** Only regenerate conversation summaries every N messages, not every single response
**When to use:** Background summary generation in chat `onFinish`

```typescript
// Current: summarizes on EVERY response when messages >= 4
// Improved: summarize every 10th message OR when messages reach key thresholds
const SUMMARY_INTERVAL = 10;
const shouldSummarize = finishedMessages.length >= 4 &&
    (finishedMessages.length % SUMMARY_INTERVAL === 0 ||
     finishedMessages.length === 4); // First summary at 4 messages
```

### Pattern 4: Model Version Pinning
**What:** Use explicit version identifiers in model configuration
**When to use:** Production model configuration in `providers.ts`

**Current state:**
- `providers.ts` uses `google/gemini-2.5-flash` (OpenRouter stable alias)
- `models.ts` says `"Gemini 3 Flash Pro"` (incorrect -- this model does not exist on OpenRouter)
- Fallback uses `gemini-2.0-flash` (Google direct)

**OpenRouter model slug options:**
| Slug | Behavior |
|------|----------|
| `google/gemini-2.5-flash` | Stable alias, may silently update when Google promotes new versions |
| `google/gemini-2.5-flash-preview-09-2025` | Pinned to September 2025 checkpoint |

**Recommendation:** Keep `google/gemini-2.5-flash` (stable alias) but add a version comment and monitoring. Date-pinned previews are for testing, not production. Instead, add a `MODEL_VERSION_CONFIG` constant that documents the expected model and can be compared against what OpenRouter actually routes to (via response headers).

### Anti-Patterns to Avoid
- **Leaking validation internals:** Never return `error.flatten()`, `error.errors`, or `error.issues` to clients. These reveal field names, types, and constraints that help attackers.
- **Loading all messages on page load:** The chat page currently calls `getMessagesByChatId({ id })` without a limit, loading potentially hundreds of messages into server component memory.
- **Summarizing on every message:** Generates unnecessary AI API calls and costs tokens on every response after the 4th message.
- **CSP nonces in vercel.json:** `vercel.json` headers are static and cannot contain per-request nonces. Nonces MUST be generated in middleware.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token cost calculation | Custom price tables | `tokenlens` (already installed) | Prices change frequently; tokenlens maintains a catalog |
| Error sanitization | Custom error filtering per route | `ChatSDKError("bad_request:api").toResponse()` | Already built, consistent, logs internally |
| CSP header generation | String concatenation | Next.js middleware `headers()` API | Nonce injection is error-prone with string building |
| Dependency vulnerability scanning | Manual version checking | `pnpm audit` / `pnpm update` | Automated, comprehensive |

**Key insight:** The existing `ChatSDKError` system is well-designed and already handles the "log details, return generic error" pattern perfectly. The Zod leak fix is just about consistently using it.

## Common Pitfalls

### Pitfall 1: CSP Nonce Forces Dynamic Rendering
**What goes wrong:** Moving from `unsafe-inline` to nonce-based CSP forces all pages to use dynamic rendering, disabling static optimization, ISR, and CDN caching.
**Why it happens:** Nonces must be unique per-request, which is incompatible with pre-rendered pages.
**How to avoid:** Evaluate the actual security benefit vs. performance cost. For this app (authenticated SaaS, not a public content site), dynamic rendering is already the norm for chat pages. Static pages (landing, pricing) would be affected.
**Warning signs:** Build times increase, TTFB increases for static pages, Vercel bill increases.
**Recommendation:** Defer full CSP nonce migration. Instead, tighten the CSP by:
1. Removing domains no longer needed from `connect-src`
2. Adding `upgrade-insecure-requests` directive
3. Documenting why `unsafe-inline` is currently acceptable (all scripts are first-party or from trusted CDNs)

### Pitfall 2: Pagination Breaks Message Continuity
**What goes wrong:** When loading older messages via pagination, the message IDs and ordering can conflict with the AI SDK's internal message state.
**Why it happens:** `useChat` manages messages as a flat array; prepending messages changes indices.
**How to avoid:** Use `setMessages` to update the full array atomically. Never modify the array in place.
**Warning signs:** Messages appear out of order, duplicate messages, streaming breaks after loading older messages.

### Pitfall 3: ajv Override Breaks Sentry
**What goes wrong:** Overriding ajv to >=8.18.0 in pnpm overrides might break webpack/schema-utils which depends on ajv@8.x.
**Why it happens:** schema-utils specifies `^8.0.0` which includes 8.18.0, but internal API changes between patch versions can cause issues.
**How to avoid:** Add `"ajv": ">=8.18.0"` to pnpm overrides, run build, and verify Sentry source map upload still works.
**Warning signs:** Build fails with schema validation errors, Sentry source maps not uploaded.

### Pitfall 4: Per-User Cost Tracking at Scale
**What goes wrong:** Querying AICostLog for per-user aggregation on every request becomes slow as the table grows.
**Why it happens:** No userId index on AICostLog, and aggregation queries scan large date ranges.
**How to avoid:** Add a `userId` index to AICostLog. Consider a materialized daily summary table or use the daily cron to pre-compute per-user totals.
**Warning signs:** Cost-check cron takes >10s, dashboard queries timeout.

### Pitfall 5: Stream Failure Dangling Messages
**What goes wrong:** When a stream fails mid-response, the user message was already saved to the database (line 282-297 in chat route), but no assistant message is saved. On reload, the user sees their message without a response.
**Why it happens:** `saveMessages` for the user message runs before streaming starts (for immediate persistence), but the assistant message is only saved in `onFinish`.
**How to avoid:** On stream error, either: (a) soft-delete the last user message, or (b) mark it with a `streamFailed` flag so the UI can show a retry option.
**Warning signs:** Users see "ghost" messages with no response when they reload after an error.

## Code Examples

### SEC-01: Fix Zod Error Leak (Generic Pattern)
```typescript
// BEFORE (leaks schema details to client):
const parsed = ticketSchema.safeParse(body);
if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
}

// AFTER (logs details, returns generic error):
const parsed = ticketSchema.safeParse(body);
if (!parsed.success) {
    logger.warn({ errors: parsed.error.flatten() }, "Validation failed");
    return new ChatSDKError("bad_request:api").toResponse();
}
```

### SEC-03: Fix ajv Vulnerability via pnpm Override
```jsonc
// package.json pnpm.overrides section
{
    "pnpm": {
        "overrides": {
            "lodash-es": ">=4.17.23",
            "undici": ">=6.23.0",
            "@isaacs/brace-expansion": ">=5.0.1",
            "markdown-it": ">=14.1.1",
            "qs": ">=6.14.2",
            "ajv": ">=8.18.0"  // Fix ReDoS vulnerability (GHSA-2g4f-4pwh-qvx6)
        }
    }
}
```

### PERF-01: Chat Page with Initial Pagination
```typescript
// app/(chat)/chat/[id]/page.tsx - Load limited messages
const INITIAL_MESSAGE_LIMIT = 50;

const messagesFromDb = await getMessagesByChatId({
    id,
    limit: INITIAL_MESSAGE_LIMIT,
});

// Pass total count so client knows if pagination is needed
const totalMessageCount = await getMessageCountByChatId({ id });
```

### PERF-03: Stream Failure Message Cleanup
```typescript
// In the chat component onError handler, delete dangling user message
onError: async (error) => {
    if (lastSentMessage) {
        // Clean up the dangling message from the database
        try {
            await fetch(`/api/chat/messages/${lastSentMessage.id}`, {
                method: 'DELETE',
            });
        } catch {
            // Non-blocking cleanup
        }
    }
}
```

### COST-01: Model Version Documentation
```typescript
// lib/ai/providers.ts - Add version tracking comments
/**
 * Model Version Configuration
 *
 * OpenRouter stable alias: google/gemini-2.5-flash
 * Expected model: Gemini 2.5 Flash (stable, GA since June 2025)
 * Fallback: gemini-2.0-flash (Google direct)
 *
 * The stable alias auto-updates when Google promotes new versions.
 * Monitor via OpenRouter response headers: x-model-id
 *
 * For pinned versions (testing only):
 *   google/gemini-2.5-flash-preview-09-2025
 *
 * Last verified: 2026-02-18
 */
```

### COST-03: Demo Chat Cost Logging
```typescript
// app/api/demo/chat/route.ts - Add cost tracking in onFinish
onFinish: async ({ messages: finishedMessages }) => {
    recordCircuitSuccess("ai-gateway");

    // Log token usage for demo chat (no userId, use "demo" identifier)
    after(() =>
        recordAICost({
            userId: "demo-anonymous",
            chatId: `demo-${Date.now()}`,
            modelId: "google/gemini-2.5-flash",
            inputTokens: 0, // Need to capture from streamText result
            outputTokens: 0,
            costUSD: 0,
        }),
    );
    // ... existing safety scans
}
```

### COST-04: Per-User Daily Cost Query
```typescript
// lib/cost/tracker.ts - New function
export async function getUserDailyCost(
    userId: string,
    date?: Date,
): Promise<{ totalCostUSD: number; requestCount: number }> {
    const targetDate = date ?? new Date();
    const dateStr = targetDate.toISOString().split("T")[0];

    const supabase = createServiceClient();
    const { data, error } = await (supabase.from as any)("AICostLog")
        .select("costUSD")
        .eq("userId", userId)
        .gte("createdAt", `${dateStr}T00:00:00.000Z`)
        .lt("createdAt", `${dateStr}T23:59:59.999Z`);

    if (error) throw error;
    const rows = data ?? [];

    return {
        totalCostUSD: rows.reduce((sum: number, r: any) => sum + Number(r.costUSD ?? 0), 0),
        requestCount: rows.length,
    };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `unsafe-inline` CSP everywhere | Nonce-based CSP via middleware | Next.js 13+ (2023) | Requires dynamic rendering; not universally adopted |
| Load all messages on page load | Cursor-based pagination | Standard practice | Reduces initial load time for long conversations |
| Unversioned model aliases | Pinned model versions + monitoring | OpenRouter 2025 | Prevents silent behavior changes from model updates |
| No AI cost tracking | Per-request cost logging | Industry standard 2025 | Essential for budget management with LLM APIs |

**Deprecated/outdated:**
- `models.ts` references "Gemini 3 Flash Pro" which does not match any real model identifier. The actual model used is `google/gemini-2.5-flash` per `providers.ts`.

## Open Questions

1. **CSP nonce scope and timing**
   - What we know: Moving from `unsafe-inline` to nonces requires middleware changes and forces dynamic rendering
   - What's unclear: Whether the landing page and other static-optimized pages would be significantly impacted
   - Recommendation: Defer full nonce migration. For Phase 25, just document the current CSP posture and make minor tightening improvements (remove unused domains, add `upgrade-insecure-requests`). A dedicated security phase can tackle nonces later.

2. **Per-user spending alert thresholds**
   - What we know: Global daily threshold exists (`AI_DAILY_COST_THRESHOLD_USD`, defaults to $10)
   - What's unclear: What per-user thresholds make sense, whether alerts should go to users or just admins
   - Recommendation: Start with admin-only per-user alerts. Add a `getUserDailyCost` function and flag users exceeding 10x the average daily cost.

3. **AICostLog missing userId index**
   - What we know: Table has indexes on `createdAt` and `DATE(createdAt)` but NOT on `userId`
   - What's unclear: Current table size and query performance
   - Recommendation: Add `userId` index proactively before implementing per-user queries.

4. **Demo chat cost capture**
   - What we know: Demo chat does NOT log any cost data; it doesn't access `usage` from `streamText` result
   - What's unclear: Whether to track demo costs per-IP or as aggregate
   - Recommendation: Track as aggregate with a sentinel userId ("demo-anonymous"). Need to refactor demo route to capture `usage` from `streamText.onFinish`.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** - Direct reading of all 10+ API routes, providers.ts, cost tracker, chat page, message queries
- **pnpm audit output** - Verified ajv@8.17.1 vulnerability (GHSA-2g4f-4pwh-qvx6), patched in >=8.18.0
- **OpenRouter model pages** - Verified `google/gemini-2.5-flash` is stable alias, `google/gemini-2.5-flash-preview-09-2025` is date-pinned variant
- **Next.js CSP documentation** - https://nextjs.org/docs/app/guides/content-security-policy

### Secondary (MEDIUM confidence)
- **OpenRouter documentation** - https://openrouter.ai/docs/guides/overview/models - Model slug system and variant suffixes
- **Next.js CSP nonce discussions** - https://github.com/vercel/next.js/discussions/81703 - Confirms `unsafe-inline` requirement without nonces
- **Vercel AI SDK** - https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence - No built-in pagination; manual implementation required

### Tertiary (LOW confidence)
- **CSP nonce + cacheComponents compatibility** - https://github.com/vercel/next.js/issues/89754 - Active issue, may affect future Next.js versions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, versions verified from package.json
- Architecture: HIGH - Patterns derived from actual codebase analysis, not external recommendations
- Security (Zod leaks): HIGH - Every affected route identified by grep, fix pattern verified from existing correct implementations
- Security (CSP): MEDIUM - Nonce approach well-documented but architectural impact needs project-specific evaluation
- Performance (pagination): MEDIUM - Pattern is standard but Vercel AI SDK integration needs careful implementation
- Cost tracking: HIGH - Existing infrastructure verified, gaps clearly identified
- ajv fix: HIGH - Vulnerability confirmed by pnpm audit, fix is standard pnpm override

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (30 days - stable domain, no fast-moving dependencies)
