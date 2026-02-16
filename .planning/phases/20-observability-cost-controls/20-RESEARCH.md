# Phase 20: Observability & Cost Controls - Research

**Researched:** 2026-02-17
**Domain:** Structured logging migration, AI token cost tracking, spend alerting
**Confidence:** HIGH

## Summary

The codebase already has a solid foundation for structured logging via `pino` (v10.2) with a `lib/logger.ts` module and an `apiRequestLogger` utility in `lib/api-logging.ts`. However, adoption is minimal: only ~37 structured `logger.*` calls exist compared to ~223 `console.log/error/warn` calls across 79 files. The Stripe webhook handler alone has 33 `console.*` calls and zero structured logging.

For cost tracking, the project already uses `tokenlens` (v1.3.0) which provides `estimateCost()` and `getTokenCosts()` functions that return `inputUSD`, `outputUSD`, and `totalUSD` values. The chat route already calls `getUsage()` from tokenlens and stores the result in `Chat.lastContext` as JSONB. The `UserAnalytics` table tracks daily `tokenUsage` per user. What's missing is: (a) actually extracting and persisting the USD cost data from tokenlens, (b) aggregation queries for cost dashboards, and (c) threshold-based alerting.

**Primary recommendation:** Migrate server-side `console.*` calls to structured `logger.*` (leave client components as-is since pino is server-only), enhance the existing tokenlens integration to persist cost data per-request, add a daily cost aggregation cron job that alerts admins when spend exceeds configurable thresholds, and expose a cost dashboard API endpoint for the admin panel.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pino | 10.2.0 | Structured JSON logging | Already installed; industry standard for Node.js structured logging; JSON output works with Vercel log drain |
| pino-pretty | 13.1.3 | Dev-mode log formatting | Already installed; companion to pino for readable dev output |
| tokenlens | 1.3.0 | AI model cost calculation | Already installed; provides `estimateCost()` and `getTokenCosts()` with live model catalog |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Mandrill (via lib/email) | existing | Admin email alerts | For spend threshold breach notifications |
| Supabase | existing | Cost data persistence | Store per-request cost records and aggregations |
| Vercel Cron | existing | Scheduled cost checks | Daily spend aggregation and alerting |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pino | winston | pino already installed and configured; no reason to switch |
| Custom cost calc | tokenlens | tokenlens already installed with live pricing catalog; handles cache read/write tokens |
| Datadog/LogTail | Vercel log drain + pino JSON | External services add cost; pino JSON format is already compatible with any drain |

**Installation:**
No new packages needed. Everything required is already installed.

## Architecture Patterns

### Recommended Project Structure
```
lib/
  logger.ts              # EXISTS - pino base logger + createRequestLogger
  api-logging.ts         # EXISTS - apiRequestLogger utility
  cost/
    tracker.ts           # NEW - cost recording and threshold checking
    pricing.ts           # NEW - model pricing constants (fallback when tokenlens catalog unavailable)
    queries.ts           # NEW - Supabase queries for cost data
app/
  api/
    cron/
      cost-check/
        route.ts         # NEW - daily cost aggregation + alerting cron
  (chat)/
    api/
      admin-costs/
        route.ts         # NEW - cost dashboard API endpoint
  (admin)/
    admin/
      costs/
        page.tsx         # NEW - admin cost dashboard page (optional, could be API-only)
```

### Pattern 1: Request-Scoped Structured Logging
**What:** Every API route handler creates a child logger with request context using `apiRequestLogger()` or `createRequestLogger()`.
**When to use:** All server-side API route handlers.
**Example:**
```typescript
// Source: existing lib/api-logging.ts pattern
import { apiRequestLogger } from "@/lib/api-logging";

export async function POST(request: Request) {
  const apiLog = apiRequestLogger("/api/stripe/webhook");
  apiLog.start({ requestId: eventId, userId });

  // Instead of: console.log(`[Stripe Webhook] Processing event: ${event.type}`);
  apiLog.info("Processing webhook event", { eventType: event.type });

  // Instead of: console.error("[Stripe Webhook] Error:", error);
  apiLog.error(error, { phase: "event_processing", eventType: event.type });
}
```

### Pattern 2: AI Cost Tracking Per Request
**What:** After each AI response, extract cost data from tokenlens and persist it alongside token counts.
**When to use:** Every AI chat response in `onFinish` callback.
**Example:**
```typescript
// Source: existing chat route pattern enhanced with cost data
import { getTokenCosts } from "tokenlens/context";

// In streamText onFinish:
onFinish: async ({ usage }) => {
  const catalog = await getTokenlensCatalog();
  const modelId = myProvider.languageModel(selectedChatModel).modelId;

  // Get cost breakdown from tokenlens
  const costs = catalog
    ? getTokenCosts({ modelId, usage, providers: catalog })
    : null;

  // Persist cost data
  await recordAICost({
    userId: user.id,
    chatId: id,
    modelId,
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    inputCostUSD: costs?.inputUSD ?? 0,
    outputCostUSD: costs?.outputUSD ?? 0,
    totalCostUSD: costs?.totalUSD ?? 0,
  });
}
```

### Pattern 3: Threshold-Based Cost Alerting
**What:** A daily cron job aggregates costs and compares against configurable thresholds. When breached, sends admin email notification.
**When to use:** Vercel Cron, runs daily (or more frequently if needed).
**Example:**
```typescript
// Configurable via environment variable
const DAILY_COST_THRESHOLD_USD = Number(process.env.AI_DAILY_COST_THRESHOLD_USD) || 10;

// In cron handler:
const dailyCost = await getDailyAICostTotal();
if (dailyCost > DAILY_COST_THRESHOLD_USD) {
  await sendAdminNotification({
    subject: `AI Daily Spend Alert: $${dailyCost.toFixed(2)}`,
    message: `Daily AI spend ($${dailyCost.toFixed(2)}) exceeded threshold ($${DAILY_COST_THRESHOLD_USD}).`,
    type: "alert",
  });
}
```

### Anti-Patterns to Avoid
- **Logging in client components with pino:** Pino is server-only. Client-side `console.*` calls in `"use client"` components are expected and should NOT be migrated. The 80% target applies to server-side code only.
- **Logging sensitive data:** Never log full user emails, tokens, or API keys in structured logs. Log user IDs only.
- **Synchronous cost tracking blocking response:** Cost recording must happen in `after()` or as fire-and-forget to avoid adding latency to chat responses.
- **Hardcoding model prices:** Use tokenlens live catalog as primary source; only use hardcoded fallback prices when catalog is unavailable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Model pricing lookup | Custom price table per model | `tokenlens.getTokenCosts()` | Tokenlens fetches live pricing from OpenRouter catalog; handles cache tokens, reasoning tokens |
| JSON structured logging | Custom JSON formatter | `pino` with existing `lib/logger.ts` | Pino handles log levels, child loggers, JSON serialization, timestamps |
| Request ID generation | Custom ID scheme | `crypto.randomUUID()` via existing `apiRequestLogger` | Already implemented, just needs adoption |
| Admin email notifications | Custom SMTP | `sendAdminNotification()` in `lib/email/admin-notifications.ts` | Already built with Mandrill, styled HTML templates |
| Cron job auth | Custom auth | `CRON_SECRET` bearer token pattern (existing) | Already implemented in `expire-subscriptions` cron |

**Key insight:** Nearly all infrastructure needed for this phase already exists. The main work is *adoption* (replacing console.* with logger.*) and *wiring* (connecting tokenlens cost data to persistence and alerting).

## Common Pitfalls

### Pitfall 1: Client Component Logger Import
**What goes wrong:** Importing `pino` or `lib/logger.ts` in a `"use client"` component causes build failures or runtime errors.
**Why it happens:** Pino uses Node.js APIs not available in the browser.
**How to avoid:** Only migrate server-side files (route handlers, server components, lib/ files without `"use client"`). The 21 client files with `console.*` should stay as-is.
**Warning signs:** Build errors mentioning `stream`, `os`, or `process` in client bundles.

### Pitfall 2: TokenLens Catalog Unavailability
**What goes wrong:** `fetchModels()` network call fails (OpenRouter API down), resulting in no cost data.
**Why it happens:** External API dependency in a cost calculation path.
**How to avoid:** The existing code already caches the catalog for 24h via `unstable_cache`. Add a hardcoded fallback pricing map for Gemini 2.5 Flash ($0.30/M input, $2.50/M output) when catalog is null.
**Warning signs:** Cost records with `totalCostUSD: 0` when tokens > 0.

### Pitfall 3: Double-Counting Costs
**What goes wrong:** Token usage recorded twice for the same request (e.g., in both `streamText.onFinish` and `createUIMessageStream.onFinish`).
**Why it happens:** The chat route has two nested `onFinish` callbacks.
**How to avoid:** Record cost data only once, in the outer `createUIMessageStream.onFinish` where `finalMergedUsage` is available and already enriched with tokenlens data.
**Warning signs:** Daily cost totals 2x higher than expected from OpenRouter dashboard.

### Pitfall 4: Logging Migration Breaking Error Handling
**What goes wrong:** Replacing `console.error` with `logger.error` in a catch block changes the error object serialization, losing stack traces.
**Why it happens:** Pino serializes errors differently than `console.error`. Pino expects `{ err: error }` pattern for proper stack trace logging.
**How to avoid:** Always use `logger.error({ err: error, ...context }, "message")` pattern for Error objects. Never pass Error as the message string.
**Warning signs:** Error logs without stack traces in production.

### Pitfall 5: Cost Tracking Table Missing Indexes
**What goes wrong:** Daily cost aggregation query is slow when scanning across many rows.
**Why it happens:** The existing `UserAnalytics` table stores costs as JSONB, and aggregation requires scanning all rows for a date range.
**How to avoid:** Either add a dedicated `AICostLog` table with proper numeric columns and date indexes, or add a `costUSD` numeric column to `UserAnalytics` for fast aggregation.
**Warning signs:** Cron job timeout on cost aggregation queries.

## Code Examples

### Example 1: Migrating Stripe Webhook to Structured Logging
```typescript
// BEFORE (current):
console.log(`[Stripe Webhook] Processing event: ${event.type}`);
console.error("[Stripe Webhook] Signature verification failed");
console.log(`[Stripe Webhook] Activated ${subscriptionType} subscription for user ${userId}`);

// AFTER (structured):
import { createRequestLogger } from "@/lib/logger";

const reqLogger = createRequestLogger(event.id, userId);
reqLogger.info({ eventType: event.type }, "Processing Stripe webhook event");
reqLogger.error({ phase: "signature_verification" }, "Stripe signature verification failed");
reqLogger.info({ subscriptionType, eventType: event.type }, "Subscription activated via webhook");
```

### Example 2: Cost Data Recording
```typescript
// In lib/cost/tracker.ts
import { createServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface AICostRecord {
  userId: string;
  chatId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  inputCostUSD: number;
  outputCostUSD: number;
  totalCostUSD: number;
}

export async function recordAICost(record: AICostRecord): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("AICostLog").insert({
      userId: record.userId,
      chatId: record.chatId,
      modelId: record.modelId,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      costUSD: record.totalCostUSD,
      createdAt: new Date().toISOString(),
    });

    logger.debug({
      userId: record.userId,
      modelId: record.modelId,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      costUSD: record.totalCostUSD,
    }, "AI cost recorded");
  } catch (err) {
    logger.warn({ err }, "Failed to record AI cost (non-blocking)");
  }
}
```

### Example 3: Daily Cost Aggregation Query
```sql
-- Supabase RPC function for daily cost aggregation
CREATE OR REPLACE FUNCTION get_daily_ai_cost(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  total_cost_usd NUMERIC,
  total_input_tokens BIGINT,
  total_output_tokens BIGINT,
  unique_users BIGINT,
  request_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM("costUSD"), 0) as total_cost_usd,
    COALESCE(SUM("inputTokens"), 0) as total_input_tokens,
    COALESCE(SUM("outputTokens"), 0) as total_output_tokens,
    COUNT(DISTINCT "userId") as unique_users,
    COUNT(*) as request_count
  FROM "AICostLog"
  WHERE DATE("createdAt") = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Example 4: Monthly Cost Dashboard API
```typescript
// In app/(chat)/api/admin-costs/route.ts
export async function GET(request: Request) {
  // Auth check (admin only)
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("AICostLog")
    .select("userId, modelId, inputTokens, outputTokens, costUSD, createdAt")
    .gte("createdAt", startOfMonth.toISOString())
    .lte("createdAt", endOfMonth.toISOString());

  const summary = {
    totalCostUSD: data?.reduce((sum, r) => sum + (r.costUSD || 0), 0) ?? 0,
    totalInputTokens: data?.reduce((sum, r) => sum + (r.inputTokens || 0), 0) ?? 0,
    totalOutputTokens: data?.reduce((sum, r) => sum + (r.outputTokens || 0), 0) ?? 0,
    uniqueUsers: new Set(data?.map(r => r.userId)).size,
    requestCount: data?.length ?? 0,
  };

  return Response.json(summary);
}
```

## Existing Infrastructure Inventory

### What Already Exists (HIGH confidence)
| Component | Location | Status |
|-----------|----------|--------|
| Pino logger | `lib/logger.ts` | Configured, minimally adopted (~37 calls) |
| API request logger | `lib/api-logging.ts` | Built, used only in chat route |
| TokenLens integration | `app/(chat)/api/chat/route.ts` | Working - enriches usage with `getUsage()`, stores in `lastContext` |
| UserAnalytics table | Supabase `UserAnalytics` | Tracks daily tokenUsage per user (raw token counts, no USD) |
| Admin notifications | `lib/email/admin-notifications.ts` | Working Mandrill integration with styled HTML |
| Cron infrastructure | `vercel.json` + `CRON_SECRET` | Two crons running; pattern established |
| Error typing | `lib/errors.ts` | `ChatSDKError` already uses `logger.error` |
| Audit logging | `lib/audit/logger.ts` | DB-backed audit trail (still uses `console.error` internally) |

### What Needs Building
| Component | Effort | Notes |
|-----------|--------|-------|
| Console.log migration (58 server files) | Medium | Mechanical but widespread; 33 calls in webhook alone |
| AICostLog table + migration | Low | Simple schema, one migration |
| Cost recording function | Low | Wire tokenlens `getTokenCosts()` to DB insert |
| Daily cost cron job | Low | Follow existing cron pattern |
| Cost dashboard API | Low | Aggregate query over AICostLog |
| Threshold alerting | Low | Compare daily total vs env var threshold |

## Console.log Migration Scope

### Server-side files needing migration (priority order)

**Critical (OBS-01):**
- `app/api/stripe/webhook/route.ts` - 33 calls (explicit requirement)

**High Priority (OBS-02, OBS-04):**
- `app/auth/callback/route.ts` - 10 calls
- `lib/stripe/actions.ts` - 8 calls
- `lib/db/support-queries.ts` - 8 calls
- `app/(auth)/actions.ts` - 7 calls
- `lib/email/mandrill.ts` - 6 calls
- `app/(admin)/admin/page.tsx` - 6 calls
- `lib/analytics/queries.ts` - 5 calls

**Medium Priority:**
- `app/(chat)/api/chat/route.ts` - 5 calls (partially migrated)
- `app/(chat)/api/realtime/stream/route.ts` - 4 calls
- `app/(chat)/api/reactions/route.ts` - 4 calls
- `app/api/admin/knowledge-base/fireflies/route.ts` - 4 calls
- Remaining ~28 server files with 1-3 calls each

**Out of scope (client components, 21 files):**
- All `"use client"` components keep their `console.*` calls
- These include hooks, UI components, error boundaries

### Migration Math
- Total `console.*` calls: ~223 across 79 files
- Server-side `console.*` calls: ~179 across 58 files
- Client-side `console.*` calls: ~44 across 21 files
- Existing `logger.*` calls: ~37
- Target for 80%: need ~178 of 223 total calls to be structured
  - After migrating all 179 server-side calls: 37 + 179 = 216 structured vs 44 client = 216/(216+44) = 83%
  - This means migrating ALL server-side calls achieves the 80% target

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `console.log` with prefix strings | `pino` child loggers with structured JSON | Already in codebase | JSON logs are filterable, searchable, can be drained to external services |
| Manual token counting | `tokenlens` with live catalog | Already in codebase | Automatic pricing for 300+ models including cache/reasoning tokens |
| No cost visibility | Per-request cost tracking | This phase | Enables spend alerting and cost optimization |

**Current model pricing (Gemini 2.5 Flash via OpenRouter):**
- Input: $0.30 per million tokens ($0.0000003/token)
- Output: $2.50 per million tokens ($0.0000025/token)
- Reasoning: $2.50 per million tokens
- Cache read: $0.03 per million tokens

## Open Questions

1. **AICostLog table vs extending UserAnalytics**
   - What we know: UserAnalytics already has `tokenUsage` (JSONB) per user per day. AICostLog would be per-request.
   - What's unclear: Whether per-request granularity is needed for the dashboard, or if daily aggregates suffice.
   - Recommendation: Create AICostLog for per-request data (enables per-chat cost analysis). Keep UserAnalytics for backward compatibility. The cron job can aggregate from AICostLog.

2. **Cost threshold configuration**
   - What we know: Needs to be configurable.
   - What's unclear: What dollar amount makes sense as default threshold.
   - Recommendation: Use `AI_DAILY_COST_THRESHOLD_USD` env var with default of $10/day. At current pricing (~$0.003 per typical chat response), this represents ~3,300 responses/day.

3. **Admin cost dashboard: API-only vs full page**
   - What we know: Admin panel exists at `/admin` with existing dashboard grid. Success criteria says "dashboard or API endpoint."
   - What's unclear: Whether a visual dashboard is needed or API is sufficient.
   - Recommendation: Build API endpoint first (COST-02 requirement). UI widget on admin dashboard is a nice-to-have that can be added to the existing `DashboardGrid`.

## Database Schema Recommendation

```sql
-- New table for per-request AI cost tracking
CREATE TABLE IF NOT EXISTS "AICostLog" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "chatId" TEXT REFERENCES "Chat"(id) ON DELETE SET NULL,
    "modelId" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costUSD" NUMERIC(10, 8) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for aggregation queries
CREATE INDEX idx_aicostlog_userid ON "AICostLog"("userId");
CREATE INDEX idx_aicostlog_createdat ON "AICostLog"("createdAt");
CREATE INDEX idx_aicostlog_date ON "AICostLog"(DATE("createdAt"));

-- RLS
ALTER TABLE "AICostLog" ENABLE ROW LEVEL SECURITY;
-- Service role only (admin/cron access)
CREATE POLICY "Service role full access" ON "AICostLog"
    FOR ALL USING (auth.role() = 'service_role');
```

## Sources

### Primary (HIGH confidence)
- `lib/logger.ts` - Existing pino configuration, verified v10.2.0
- `lib/api-logging.ts` - Existing apiRequestLogger pattern
- `app/(chat)/api/chat/route.ts` - Existing tokenlens integration and usage tracking
- `node_modules/tokenlens/dist/context.d.ts` - TokenCosts type: `{ inputUSD, outputUSD, totalUSD, reasoningUSD, cacheReadUSD, cacheWriteUSD }`
- `lib/email/admin-notifications.ts` - Existing admin email notification system
- `app/api/cron/expire-subscriptions/route.ts` - Existing cron job pattern
- `vercel.json` - Existing cron configuration

### Secondary (MEDIUM confidence)
- [OpenRouter Gemini 2.5 Flash pricing](https://openrouter.ai/google/gemini-2.5-flash) - $0.30/M input, $2.50/M output
- pino v10.x documentation - child logger pattern, error serialization

### Tertiary (LOW confidence)
- None - all findings verified against codebase and official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and partially configured
- Architecture: HIGH - patterns verified against existing codebase implementations
- Pitfalls: HIGH - derived from direct codebase analysis (client vs server split, tokenlens API)
- Cost tracking: HIGH - tokenlens types verified, pricing verified against OpenRouter

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable; tokenlens catalog pricing may change but approach is stable)
