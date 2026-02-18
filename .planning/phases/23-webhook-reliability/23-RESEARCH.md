# Phase 23: Webhook Reliability - Research

**Researched:** 2026-02-18
**Domain:** Stripe webhook idempotency, race condition prevention, failure resilience on Vercel/Supabase
**Confidence:** HIGH

## Summary

Phase 23 addresses seven specific deficiencies in the Stripe webhook handler (`app/api/stripe/webhook/route.ts`) identified by the production audit. The current implementation has status-based idempotency via `isAlreadyProcessed()` (checks user state, not event IDs), no `maxDuration` export (risks Vercel timeout), no database locking for concurrent events, no persistent failure tracking, and no rate limiting on the webhook endpoint. The `customer.subscription.updated` and `invoice.paid` handlers lack any idempotency checks at all.

The fixes are straightforward database-and-config changes that do not require new external dependencies. The core pattern is: (1) add `maxDuration = 30` export, (2) create a `StripeWebhookEvent` table for event-ID deduplication with a unique constraint on `eventId`, (3) wrap critical-section logic in a Postgres RPC function that uses `pg_advisory_xact_lock` for serialization, (4) create a `WebhookDeadLetter` table for failed events, and (5) add IP-based rate limiting using the existing `checkAuthRateLimit` pattern.

**Primary recommendation:** Use Postgres advisory locks via a single RPC function for both deduplication and race condition prevention -- check-then-insert the event ID under a lock keyed on the user ID, so concurrent events for the same user are serialized and duplicate event IDs are rejected atomically.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | ^20.2.0 | Stripe API + webhook signature verification | Already in use, v20 supports all needed event fields |
| @supabase/supabase-js | ^2.89.0 | Database access via service role client | Already in use for all webhook DB operations |
| next/server | 15.5.11 | `after()` for non-blocking post-response work | Already used in webhook for Mailchimp tagging |
| redis | ^5.0.0 | Rate limiting (with DB fallback) | Already in use via `checkAuthRateLimit` |
| pino | ^10.2.0 | Structured logging | Already in use via `lib/logger.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^3.25.76 | Schema validation for webhook payloads | Already in use project-wide |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Postgres advisory locks | Redis distributed locks (Redlock) | Advisory locks are simpler, no extra dependency, and this project already uses Supabase RPC pattern |
| DB-based event dedup table | Redis SET with TTL | DB is the source of truth for subscription state; keeping dedup in same DB ensures transactional consistency |
| In-route rate limiting | Vercel WAF / Cloudflare rate rules | External WAF is better long-term but out of scope; in-route approach matches existing patterns |

**Installation:**
```bash
# No new dependencies required -- all libraries already installed
```

## Architecture Patterns

### Recommended Project Structure
```
app/api/stripe/webhook/
  route.ts                  # Webhook handler (modified)
lib/stripe/
  actions.ts                # Subscription DB actions (existing)
  config.ts                 # Stripe config (existing)
  webhook-dedup.ts          # NEW: Event dedup + advisory lock logic
supabase/migrations/
  YYYYMMDD_webhook_reliability.sql  # NEW: StripeWebhookEvent + WebhookDeadLetter tables + RPC
```

### Pattern 1: Event-ID Deduplication via Database
**What:** Store processed Stripe event IDs in a `StripeWebhookEvent` table. Before processing, attempt INSERT with unique constraint -- if it succeeds, event is new; if it violates uniqueness, event is a duplicate.
**When to use:** Every webhook event, as the first check after signature verification.
**Example:**
```typescript
// Source: Stripe webhook best practices + codebase pattern
async function markEventProcessed(eventId: string, eventType: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("StripeWebhookEvent")
    .insert({ eventId, eventType, processedAt: new Date().toISOString() });

  if (error?.code === "23505") {
    // Unique constraint violation = already processed
    return false;
  }
  if (error) {
    throw error; // Unexpected DB error
  }
  return true; // Successfully marked as new
}
```

### Pattern 2: Advisory Lock via Supabase RPC for Race Condition Prevention
**What:** Create a Postgres function that acquires a transaction-scoped advisory lock keyed on the user ID hash, checks for duplicate event ID, inserts the event record, and returns whether processing should proceed. All within one atomic transaction.
**When to use:** For events that mutate user subscription state (checkout.session.completed, customer.subscription.created, customer.subscription.updated, invoice.paid, customer.subscription.deleted).
**Example:**
```sql
-- Source: PostgreSQL docs on pg_advisory_xact_lock + Supabase RPC pattern
CREATE OR REPLACE FUNCTION process_webhook_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_user_id TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key BIGINT;
BEGIN
  -- Acquire advisory lock scoped to user (or global if no user)
  IF p_user_id IS NOT NULL THEN
    v_lock_key := hashtext('webhook:' || p_user_id);
    PERFORM pg_advisory_xact_lock(v_lock_key);
  END IF;

  -- Check if event already processed
  IF EXISTS (SELECT 1 FROM "StripeWebhookEvent" WHERE "eventId" = p_event_id) THEN
    RETURN FALSE;  -- Duplicate, skip
  END IF;

  -- Mark as processing
  INSERT INTO "StripeWebhookEvent" ("eventId", "eventType", "userId", "processedAt")
  VALUES (p_event_id, p_event_type, p_user_id, NOW());

  RETURN TRUE;  -- Proceed with processing
END;
$$;
```

```typescript
// Source: Existing RPC pattern from lib/db/queries/*.ts
async function shouldProcessEvent(
  eventId: string,
  eventType: string,
  userId: string | null
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("process_webhook_event", {
    p_event_id: eventId,
    p_event_type: eventType,
    p_user_id: userId,
  });

  if (error) {
    logger.error({ err: error, eventId }, "Failed to check webhook dedup");
    throw error;
  }

  return data === true;
}
```

### Pattern 3: Dead-Letter Queue for Failed Events
**What:** When webhook processing throws an error, persist the event to a `WebhookDeadLetter` table before returning 500. This preserves the event payload for manual inspection and replay.
**When to use:** In the catch block of the main webhook handler.
**Example:**
```typescript
// Source: Audit requirement L-9
async function persistFailedEvent(
  event: Stripe.Event,
  error: unknown,
): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("WebhookDeadLetter").insert({
      eventId: event.id,
      eventType: event.type,
      payload: event as unknown as Json,
      error: error instanceof Error ? error.message : String(error),
      failedAt: new Date().toISOString(),
    });
  } catch (dlqError) {
    logger.error({ err: dlqError, eventId: event.id }, "Failed to persist dead-letter event");
  }
}
```

### Pattern 4: maxDuration Export
**What:** Export `maxDuration = 30` from the webhook route to prevent Vercel timeout.
**When to use:** Always -- this is a one-line config fix.
**Example:**
```typescript
// Source: Vercel docs + existing pattern in other route files
export const maxDuration = 30; // Stripe client has 30s timeout + 2 retries
```

### Anti-Patterns to Avoid
- **Status-based idempotency alone:** The current `isAlreadyProcessed()` checks if user is already in the target state. This fails when intermediate state changes happen between retries. Use event-ID-based dedup instead.
- **Read-then-write without locking:** Checking a condition and then acting on it in separate queries creates a TOCTOU race. Use advisory locks or INSERT-with-unique-constraint for atomicity.
- **Returning 200 on internal errors to stop retries:** Stripe retries on non-2xx. If processing fails but you return 200, the event is silently lost. Return 500 to trigger retry, but persist the failure in a dead-letter table.
- **Heavy processing before responding:** Stripe expects a 2xx within ~20 seconds. The current implementation does all processing synchronously. Non-critical work (Mailchimp tags, emails) is already in `after()` -- keep it that way.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Distributed locking | Custom Redis/flag-based locks | `pg_advisory_xact_lock` via RPC | Automatic cleanup on transaction end, no orphaned locks |
| Event dedup store | In-memory Set or Redis TTL | Postgres table with unique constraint | Survives restarts, consistent with subscription state DB |
| Rate limiting | Custom IP tracking middleware | Existing `checkAuthRateLimit()` from `lib/security/rate-limiter.ts` | Already handles Redis primary + in-memory fallback |
| Webhook signature verification | Manual HMAC comparison | `stripe.webhooks.constructEvent()` | Already in use, handles timing-safe comparison and replay protection |

**Key insight:** The entire webhook reliability stack can be built on Postgres features (advisory locks, unique constraints, tables for dedup and dead-letter) plus existing rate limiting infrastructure. No new external services or dependencies needed.

## Common Pitfalls

### Pitfall 1: Advisory Lock Key Collision
**What goes wrong:** Using `hashtext()` can theoretically produce collisions -- two different user IDs could hash to the same lock key, causing unnecessary serialization.
**Why it happens:** `hashtext` returns a 32-bit integer, so the collision space is ~4 billion values. With a small user base, this is practically zero risk.
**How to avoid:** For this application's scale (subscription SaaS, not millions of concurrent webhooks), `hashtext` is fine. If scale increases, use two-key `pg_advisory_xact_lock(key1, key2)` with separate hash components.
**Warning signs:** Unexplained webhook processing delays in logs for unrelated users.

### Pitfall 2: Supabase RPC Transaction Scope
**What goes wrong:** Each `supabase.rpc()` call is a single transaction via PostgREST. If you acquire an advisory lock in one RPC call and then do work in separate Supabase queries, the lock is released after the RPC returns -- before your work is done.
**Why it happens:** PostgREST wraps each request in its own transaction. The advisory lock only lives for the duration of the RPC function.
**How to avoid:** Put ALL critical-section logic inside the RPC function itself. The RPC should: acquire lock, check dedup, insert event record, and optionally update user subscription state -- all in one function. Alternatively, separate the locking from processing: use the RPC to acquire lock + check dedup, then do processing, then the lock is released (acceptable if the dedup INSERT prevents re-processing by concurrent requests that wait on the lock).
**Warning signs:** Race conditions still occurring despite advisory locks being in place.

### Pitfall 3: Dead-Letter Table Growth
**What goes wrong:** The `WebhookDeadLetter` table grows without bound if failed events accumulate.
**Why it happens:** No cleanup mechanism for resolved/replayed events.
**How to avoid:** Add a `resolvedAt` column. Add to the existing cleanup cron job (`/api/cron/cleanup-deleted-data`) to purge resolved entries older than 30 days. Add monitoring for unresolved entries.
**Warning signs:** Table size growing in Supabase dashboard.

### Pitfall 4: Rate Limiting Legitimate Stripe Traffic
**What goes wrong:** Setting rate limits too low blocks legitimate Stripe retry bursts (e.g., subscription renewal wave).
**Why it happens:** Stripe can send bursts of events during billing cycles.
**How to avoid:** Set webhook rate limit high enough for legitimate traffic (e.g., 100 requests per 15-minute window per IP). Stripe IPs are well-known and consistent. The primary defense is signature verification, not rate limiting.
**Warning signs:** 429 responses to legitimate Stripe events visible in logs.

### Pitfall 5: maxDuration vs Stripe Client Timeout Mismatch
**What goes wrong:** The Stripe client has `timeout: 30000` (30s) and `maxNetworkRetries: 2`. A single API call with 2 retries could take up to 90 seconds.
**Why it happens:** The Stripe SDK retries internally, and each retry resets the 30s timeout.
**How to avoid:** Set `maxDuration = 60` (not 30) to accommodate worst-case Stripe API retries. The webhook handler calls `getStripe().subscriptions.retrieve()` which triggers these retries. 60s gives enough headroom. On Vercel Pro with Fluid Compute, the default is 300s, but explicit is better than implicit.
**Warning signs:** 504 FUNCTION_INVOCATION_TIMEOUT errors in Vercel logs for webhook route.

### Pitfall 6: Forgetting to Update Supabase Types
**What goes wrong:** New tables (`StripeWebhookEvent`, `WebhookDeadLetter`) are created in migration but TypeScript types are not regenerated.
**Why it happens:** `lib/supabase/database.types.ts` is auto-generated by `pnpm gen:types`.
**How to avoid:** After applying migration, run `pnpm gen:types` to regenerate types. Add type exports to `lib/supabase/types.ts`.
**Warning signs:** TypeScript errors on `.from("StripeWebhookEvent")` calls.

## Code Examples

Verified patterns from the existing codebase:

### Existing isAlreadyProcessed (to be replaced)
```typescript
// Source: app/api/stripe/webhook/route.ts:70-86
// PROBLEM: Status-based, not event-ID-based. Read-then-write without locking.
async function isAlreadyProcessed(
  userId: string,
  targetStatus: "trialing" | "active",
  stripeSubscriptionId: string,
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("User")
    .select("subscriptionStatus, stripeSubscriptionId")
    .eq("id", userId)
    .single();
  return (
    data?.subscriptionStatus === targetStatus &&
    data?.stripeSubscriptionId === stripeSubscriptionId
  );
}
```

### Existing RPC Call Pattern (for reference)
```typescript
// Source: lib/db/queries/message.ts:88
const { data, error } = await supabase.rpc("get_bounded_messages", {
  p_chat_id: chatId,
  p_limit: limit,
});
```

### Existing Rate Limit Pattern (for webhook rate limiting)
```typescript
// Source: lib/security/rate-limiter.ts:263-304
// checkAuthRateLimit uses IP-based rate limiting with Redis + in-memory fallback.
// Webhook rate limiting should follow this pattern with a custom window/limit.
export async function checkAuthRateLimit(
  ip: string,
  action: "login" | "signup" | "reset",
  maxAttempts: number = 5,
): Promise<{ allowed: boolean; remaining: number; current: number; reset: Date }> {
  // ...Redis primary, in-memory fallback
}
```

### Migration Pattern for New Tables
```sql
-- Source: supabase/migrations/20260115000100_add_audit_log.sql (existing pattern)
-- This project uses quoted camelCase column names, gen_random_uuid() for UUIDs,
-- TIMESTAMPTZ DEFAULT NOW() for timestamps, and CASCADE on FK references.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Status-based idempotency (`isAlreadyProcessed`) | Event-ID-based dedup table + advisory locks | This phase | Eliminates all duplicate processing and race conditions |
| No maxDuration on webhook | Explicit `maxDuration = 60` | This phase | Prevents Vercel timeout on slow Stripe API calls |
| Silent failure (log + 500) | Dead-letter table + structured failure tracking | This phase | Failed events can be inspected and replayed |
| No webhook rate limiting | IP-based rate limiting (100/15min) | This phase | Prevents DoS via compromised webhook secret |
| Stripe snapshot events | Thin events (Stripe 2025) | 2025 | Not applicable yet -- project uses snapshot events via constructEvent |

**Deprecated/outdated:**
- `isAlreadyProcessed()` function: Will be replaced by event-ID dedup. Can be removed entirely.

## Open Questions

1. **RPC function scope: dedup only vs dedup + subscription update?**
   - What we know: The RPC function must at minimum acquire advisory lock + check/insert event ID. Subscription state updates (`activateSubscription`, `startTrial`, etc.) are currently separate TypeScript functions in `lib/stripe/actions.ts`.
   - What's unclear: Should subscription updates also be moved into the RPC function for full transactional atomicity? Or is dedup-then-update (two separate DB calls) safe enough given the dedup prevents re-entry?
   - Recommendation: Keep the RPC function focused on dedup only. The dedup INSERT with unique constraint prevents re-processing even after the advisory lock is released. Moving all subscription logic into SQL would be a large refactor with little additional safety benefit. The advisory lock ensures serialization; the dedup INSERT ensures idempotency.

2. **Event cleanup interval for StripeWebhookEvent table**
   - What we know: Stripe retries for up to 3 days. Events older than 3 days cannot be retried by Stripe.
   - What's unclear: How long to retain event records for auditing purposes.
   - Recommendation: Retain for 90 days, then auto-cleanup via the existing cron job. Add a `createdAt` index for efficient cleanup queries.

3. **Vercel plan tier and Fluid Compute status**
   - What we know: The project uses Vercel Pro (based on `maxDuration = 60` in chat route). With Fluid Compute (enabled by default on Pro), the default maxDuration is 300s.
   - What's unclear: Whether Fluid Compute is actually enabled for this project.
   - Recommendation: Set explicit `maxDuration = 60` regardless. Explicit is better than relying on defaults. 60s accommodates worst-case Stripe SDK retry scenarios.

## Sources

### Primary (HIGH confidence)
- **Vercel maxDuration docs** - https://vercel.com/docs/functions/configuring-functions/duration - Default 300s with Fluid Compute on Pro, 15s without. Verified in-file export pattern for Next.js App Router.
- **Stripe webhook best practices** - https://docs.stripe.com/webhooks - "Log event IDs you've processed, then not processing already-logged events." Retries for up to 3 days. Expects 2xx within ~20 seconds.
- **PostgreSQL advisory locks docs** - https://www.postgresql.org/docs/current/explicit-locking.html - `pg_advisory_xact_lock` automatically released at transaction end.
- **Existing codebase** - Verified all patterns against actual code in `app/api/stripe/webhook/route.ts`, `lib/stripe/actions.ts`, `lib/security/rate-limiter.ts`, `lib/supabase/server.ts`.

### Secondary (MEDIUM confidence)
- **Supabase RPC + advisory locks** - https://supaexplorer.com/best-practices/supabase-postgres/lock-advisory/ - Each `rpc()` call is a single PostgREST transaction, so `pg_advisory_xact_lock` is released when the RPC returns. Verified pattern matches existing `.rpc()` usage in codebase.
- **Stripe event deduplication patterns** - https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks - Real-world patterns for dedup table with unique constraint. Confirmed by Stripe's own docs.

### Tertiary (LOW confidence)
- **Stripe v20 thin events** - https://docs.stripe.com/webhooks/migrate-snapshot-to-thin-events - New in 2025, not yet relevant to this project (uses snapshot events). Flagged for future consideration.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, no new deps needed
- Architecture: HIGH - Patterns verified against PostgreSQL docs and existing codebase RPC usage
- Pitfalls: HIGH - Based on actual code analysis (e.g., Stripe timeout config in `lib/stripe/config.ts` showing 30s + 2 retries)
- maxDuration value: MEDIUM - 60s is conservative; depends on whether Fluid Compute is enabled (300s default if so)

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (30 days -- Stripe SDK and Vercel platform are stable)
