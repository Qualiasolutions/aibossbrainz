# Phase 22: Auth & Subscription Guards - Research

**Researched:** 2026-02-18
**Domain:** API access control, subscription enforcement, rate limiting, CSRF protection
**Confidence:** HIGH

## Summary

This phase addresses five security findings from the AI Production Audit (AUTH-01 through AUTH-05) that allow expired or unauthorized users to consume paid resources, or leave rate limiting gaps when Redis is unavailable. The work is entirely within existing codebase patterns -- every fix has a working reference implementation in the same project.

The chat route (`/api/chat`) already implements the complete pattern: auth check, subscription check via `checkUserSubscription()`, entitlement-based rate limiting with Redis-primary and DB-fallback. The voice and realtime routes skipped the subscription step. The demo route skipped CSRF. The export route skipped the DB-fallback branch. These are all copy-and-adapt fixes, not architectural changes.

**Primary recommendation:** Apply the existing `checkUserSubscription()` + `ChatSDKError("subscription_expired:chat")` pattern from the chat route to the voice and realtime routes. Fix DB fallback paths by querying the appropriate data source (AuditLog for exports, a dedicated counter or analytics for voice). Add `withCsrf()` wrapper to the demo chat route.

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase JS | 2.x | Database queries, auth | Already used for all DB access |
| Zod | 3.x | Input validation | Already used in all route handlers |
| Redis (node) | 4.x | Rate limiting primary | Already configured in `lib/security/rate-limiter.ts` |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lib/security/with-csrf.ts` | N/A | CSRF wrapper HOF | All state-changing POST routes |
| `lib/security/rate-limiter.ts` | N/A | Redis + DB fallback rate limiting | All API routes with cost implications |
| `lib/db/queries/user.ts` | N/A | `checkUserSubscription()` | Before any paid resource access |
| `lib/errors.ts` | N/A | `ChatSDKError` with typed codes | All API error responses |

### No New Dependencies Required

All five fixes use existing project infrastructure. No `npm install` needed.

## Architecture Patterns

### Pattern 1: Subscription Guard (from chat route)
**What:** Check subscription status after auth, before any paid resource consumption
**When to use:** Any route that incurs cost (AI tokens, ElevenLabs TTS, etc.)
**Reference:** `app/(chat)/api/chat/route.ts:158-166`
```typescript
// Source: app/(chat)/api/chat/route.ts (existing implementation)
const subscriptionStatus = await checkUserSubscription(user.id);

if (!subscriptionStatus.isActive) {
  return new ChatSDKError("subscription_expired:chat").toResponse();
}
```

### Pattern 2: Rate Limit with DB Fallback (from chat route)
**What:** Try Redis first, fall back to database query when Redis unavailable
**When to use:** All rate-limited routes
**Reference:** `app/(chat)/api/chat/route.ts:175-202`
```typescript
// Source: app/(chat)/api/chat/route.ts (existing implementation)
const rateLimitResult = await checkRateLimit(userId, maxRequests);

if (rateLimitResult.source === "redis") {
  if (!rateLimitResult.allowed) {
    return new ChatSDKError("rate_limit:chat").toResponse();
  }
} else {
  // SECURITY: Redis unavailable - verify via database (fail closed)
  const count = await getRelevantCount(userId); // DB query
  if (count >= maxRequests) {
    return new ChatSDKError("rate_limit:chat").toResponse();
  }
}
```

### Pattern 3: CSRF Wrapper (from voice/chat routes)
**What:** Wrap POST handler with `withCsrf()` HOF
**When to use:** All state-changing endpoints
**Reference:** `app/(chat)/api/voice/route.ts:36`
```typescript
// Source: app/(chat)/api/voice/route.ts (existing implementation)
export const POST = withCsrf(async (request: Request) => {
  // Handler logic - CSRF already validated
});
```

### Anti-Patterns to Avoid
- **Allowing requests through when Redis is down:** The rate limiter returns `source: "database"` and `requiresDatabaseCheck: true` when Redis is unavailable. Callers MUST perform their own DB-based check. Never assume allowed=true.
- **Counting wrong resource for rate limits:** Voice requests do not create chat messages. Using `getMessageCountByUserId()` for voice rate limit fallback always returns 0, effectively disabling the limit.
- **Subscription check after expensive operations:** Always check subscription BEFORE calling ElevenLabs or generating AI text. Never consume resources then check.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Subscription checking | Custom DB queries | `checkUserSubscription()` from `lib/db/queries/user.ts` | Already handles caching (60s TTL), admin bypass, expiry detection, status update |
| Error responses | Manual `Response.json()` | `ChatSDKError` with typed codes | Consistent status codes, messages, visibility rules |
| CSRF validation | Custom header checking | `withCsrf()` from `lib/security/with-csrf.ts` | Handles cookie + header comparison, timing-safe comparison |
| Rate limiting | Custom counters | `checkRateLimit()` from `lib/security/rate-limiter.ts` | Redis primary with automatic DB signal when Redis down |

**Key insight:** Every security pattern needed already exists in the codebase. This phase is about applying established patterns to routes that were missed.

## Common Pitfalls

### Pitfall 1: Voice Rate Limit DB Fallback Counts Wrong Table
**What goes wrong:** When Redis is down, `app/(chat)/api/voice/route.ts:74` falls back to `getMessageCountByUserId()`, which counts rows in `Message_v2` for the user. Voice TTS requests never create message records, so the count is always 0 or reflects only chat usage, not voice usage.
**Why it happens:** Original implementation copied the chat route's fallback pattern without adapting the query to voice-specific data.
**How to avoid:** Query a voice-specific data source. Options: (a) count `UserAnalytics` rows where `metricType = 'voice'` in the last 24h, (b) count rows in `AICostLog` table, or (c) use `recordAnalytics` to track voice calls and query those.
**Warning signs:** During Redis outage, voice API has no effective rate limiting.

### Pitfall 2: Export Rate Limit Silently Passes When Redis Down
**What goes wrong:** `app/(chat)/api/export-user-data/route.ts:55` checks `!rateLimit.allowed && !rateLimit.requiresDatabaseCheck` but when `requiresDatabaseCheck` is true, neither branch rate-limits -- the request proceeds unchecked.
**Why it happens:** The conditional logic short-circuits: when `requiresDatabaseCheck` is true, `allowed` is false BUT `requiresDatabaseCheck` is also true, so `!false && !true = false` -- the rate limit block is skipped.
**How to avoid:** Add explicit handling for `requiresDatabaseCheck === true`: query `AuditLog` for `DATA_EXPORT` actions by this user in the last 24 hours and compare against the limit.
**Warning signs:** During Redis outage, export API has no rate limiting.

### Pitfall 3: Demo CSRF May Break Anonymous Access
**What goes wrong:** Adding `withCsrf()` to the demo route requires the client to have a CSRF cookie and send a matching header. The demo page is used by unauthenticated visitors who may not have a CSRF cookie.
**Why it happens:** CSRF cookies are typically set during page load for authenticated routes. The demo page may need a different CSRF distribution mechanism.
**How to avoid:** Ensure the demo page component fetches a CSRF token on mount (via `GET /api/csrf`), or use the existing `useCsrf()` hook. Check the demo page's client-side code to confirm CSRF token availability.
**Warning signs:** Demo chat stops working for first-time visitors after adding CSRF.

### Pitfall 4: Subscription Check on Realtime Route (No Rate Limit)
**What goes wrong:** The `/api/realtime` route (not `/api/realtime/stream`) has no rate limiting at all -- only auth and CSRF. Adding subscription check alone still leaves it open to unbounded usage by active subscribers.
**Why it happens:** This was flagged separately as M-16 in the audit, but AUTH-02 only covers subscription checks. The planner should be aware that AUTH-02 handles subscription enforcement, while VOICE-02 (separate phase) handles rate limiting.
**Warning signs:** High AI token and ElevenLabs costs from a single active user hammering the realtime endpoint.

## Code Examples

### AUTH-01: Add Subscription Check to Voice API
```typescript
// File: app/(chat)/api/voice/route.ts
// Insert after auth check (line ~48), before rate limiting

// Check subscription status
const subscriptionStatus = await checkUserSubscription(user.id);
if (!subscriptionStatus.isActive) {
  return new ChatSDKError("subscription_expired:chat").toResponse();
}
```
Required import: `import { checkUserSubscription } from "@/lib/db/queries";` (already in scope via existing imports)

### AUTH-02: Add Subscription Check to Realtime Endpoints
```typescript
// File: app/(chat)/api/realtime/route.ts
// Insert after auth check (line ~43), before body parsing

import { checkUserSubscription } from "@/lib/db/queries";

const subscriptionStatus = await checkUserSubscription(user.id);
if (!subscriptionStatus.isActive) {
  return new ChatSDKError("subscription_expired:chat").toResponse();
}
```
Same pattern applies to `app/(chat)/api/realtime/stream/route.ts` after line ~119.

### AUTH-03: Fix Voice Rate Limit DB Fallback
```typescript
// File: app/(chat)/api/voice/route.ts
// Replace the DB fallback block (lines 72-82)

} else {
  // SECURITY: Redis unavailable - verify via database (fail closed)
  // Voice requests are tracked in UserAnalytics with metricType='voice'
  const supabaseService = createServiceClient();
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseService
    .from("UserAnalytics")
    .select("*", { count: "exact", head: true })
    .eq("userId", user.id)
    .eq("metricType", "voice")
    .gte("date", cutoffTime);

  if (error) {
    // Fail closed - deny on error
    return new ChatSDKError("rate_limit:chat").toResponse();
  }

  if ((count ?? 0) >= MAX_VOICE_REQUESTS_PER_DAY) {
    return new ChatSDKError("rate_limit:chat").toResponse();
  }
}
```

### AUTH-04: Add CSRF to Demo Chat
```typescript
// File: app/api/demo/chat/route.ts
// Change the export from plain function to withCsrf-wrapped

import { withCsrf } from "@/lib/security/with-csrf";

// Before: export async function POST(request: Request) {
// After:
export const POST = withCsrf(async (request: Request) => {
  // ... existing handler body (unchanged) ...
});
```
NOTE: Must verify demo page client code sends CSRF token. Check if `/demo` page uses `useCsrf()` hook or equivalent.

### AUTH-05: Fix Export Rate Limit DB Fallback
```typescript
// File: app/(chat)/api/export-user-data/route.ts
// Replace the rate limit check (lines 53-67)

const rateLimit = await checkRateLimit(user.id, EXPORT_RATE_LIMIT, "export");

if (rateLimit.source === "redis") {
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many export requests. Please try again tomorrow." },
      {
        status: 429,
        headers: getRateLimitHeaders(
          rateLimit.remaining,
          EXPORT_RATE_LIMIT,
          rateLimit.reset,
        ),
      },
    );
  }
} else {
  // SECURITY: Redis unavailable - verify via AuditLog (fail closed)
  const supabaseService = createServiceClient();
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseService
    .from("AuditLog")
    .select("*", { count: "exact", head: true })
    .eq("userId", user.id)
    .eq("action", "DATA_EXPORT")
    .gte("createdAt", cutoffTime);

  if (error) {
    // Fail closed
    return Response.json(
      { error: "Unable to verify export limit. Please try again." },
      { status: 503 },
    );
  }

  if ((count ?? 0) >= EXPORT_RATE_LIMIT) {
    return Response.json(
      { error: "Too many export requests. Please try again tomorrow." },
      { status: 429 },
    );
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No subscription check on voice routes | Chat route already has subscription guard | Existed since subscription system was built | Voice/realtime routes were missed |
| In-memory-only demo rate limiting | Other routes use Redis + DB fallback | Existed since security hardening phases | Demo route was written before security patterns were standardized |

**Deprecated/outdated:**
- Nothing deprecated. All patterns in use are current.

## Key Files to Modify

| File | Requirement | Change |
|------|-------------|--------|
| `app/(chat)/api/voice/route.ts` | AUTH-01, AUTH-03 | Add subscription check + fix DB fallback query |
| `app/(chat)/api/realtime/route.ts` | AUTH-02 | Add subscription check |
| `app/(chat)/api/realtime/stream/route.ts` | AUTH-02, AUTH-03 | Add subscription check + fix DB fallback query |
| `app/api/demo/chat/route.ts` | AUTH-04 | Wrap with `withCsrf()` |
| `app/(chat)/api/export-user-data/route.ts` | AUTH-05 | Add AuditLog-based DB fallback |

### Client-Side Files to Check
| File | Reason |
|------|--------|
| `app/(auth)/demo/page.tsx` or equivalent | Must send CSRF token for AUTH-04 |
| Any demo chat component | Must use `useCsrf()` hook or `csrfFetch()` |

## DB Schema Notes

### UserAnalytics Table (for AUTH-03 voice fallback)
- Has `userId`, `metricType`, `metricValue`, `date` columns
- Voice usage already tracked via `recordAnalytics(user.id, "voice", estimatedMinutes)` in voice route
- Can query count of voice entries in last 24h as rate limit fallback

### AuditLog Table (for AUTH-05 export fallback)
- Has `userId`, `action`, `createdAt` columns
- Export action already logged via `logAuditWithRequest()` with `AuditActions.DATA_EXPORT`
- Index exists: `idx_audit_log_user_created ON "AuditLog"("userId", "createdAt" DESC)`
- Index exists: `idx_audit_log_action ON "AuditLog"("action", "createdAt" DESC)`
- Queries will be efficient using existing indexes

## Open Questions

1. **Demo page CSRF token distribution**
   - What we know: The `useCsrf()` hook exists and is used by authenticated pages. The `/api/csrf` route sets cookies.
   - What's unclear: Whether the demo page (public/unauthenticated) already loads a CSRF token, or if this needs to be added.
   - Recommendation: Check the demo page component during implementation. If no CSRF setup exists, add a `useCsrf()` call or equivalent `useEffect` that fetches `/api/csrf` on mount.

2. **UserAnalytics granularity for voice rate limiting**
   - What we know: Voice usage is recorded via `recordAnalytics(user.id, "voice", estimatedMinutes)` using `after()` (non-blocking).
   - What's unclear: Whether `UserAnalytics` records one row per voice request or aggregates. Need to check the `recordAnalytics` function.
   - Recommendation: Verify during implementation. If aggregated daily, may need to query differently or use a count column.

## Sources

### Primary (HIGH confidence)
- `app/(chat)/api/chat/route.ts` - Reference implementation for subscription check + rate limit pattern
- `app/(chat)/api/voice/route.ts` - Current voice route (target for AUTH-01, AUTH-03)
- `app/(chat)/api/realtime/route.ts` - Current realtime route (target for AUTH-02)
- `app/(chat)/api/realtime/stream/route.ts` - Current realtime stream route (target for AUTH-02, AUTH-03)
- `app/api/demo/chat/route.ts` - Current demo route (target for AUTH-04)
- `app/(chat)/api/export-user-data/route.ts` - Current export route (target for AUTH-05)
- `lib/db/queries/user.ts` - `checkUserSubscription()` implementation
- `lib/security/rate-limiter.ts` - Rate limiting with Redis/DB fallback
- `lib/security/with-csrf.ts` - CSRF wrapper HOF
- `lib/errors.ts` - Error code definitions including `subscription_expired`
- `AI-PRODUCTION-AUDIT.md` - Findings M-6, M-7, L-5, L-6, L-7

### Secondary (MEDIUM confidence)
- `supabase/migrations/20260115000100_add_audit_log.sql` - AuditLog schema and indexes
- `lib/audit/logger.ts` - Audit action constants (`AuditActions.DATA_EXPORT`)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, no new deps
- Architecture: HIGH - All patterns already implemented in chat route, copy-and-adapt
- Pitfalls: HIGH - Identified from direct code reading, especially the boolean logic bug in export fallback
- Code examples: HIGH - All examples derived from existing codebase patterns

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable patterns, no external dependency changes expected)
