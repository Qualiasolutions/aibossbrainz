---
phase: 22-auth-subscription-guards
verified: 2026-02-18T17:29:38Z
status: passed
score: 7/7 must-haves verified
re_verification: false
---

# Phase 22: Auth & Subscription Guards Verification Report

**Phase Goal:** Expired/unauthorized users cannot consume paid voice and realtime resources
**Verified:** 2026-02-18T17:29:38Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                          | Status     | Evidence                                                                                                                                               |
|----|-----------------------------------------------------------------------------------------------|------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1  | Voice TTS endpoint rejects expired subscriptions (returns subscription_expired error)         | VERIFIED   | `voice/route.ts` line 51-54: calls `checkUserSubscription(user.id)`, returns `new ChatSDKError("subscription_expired:chat").toResponse()` if `!isActive` |
| 2  | Realtime voice endpoints reject expired subscriptions (returns subscription_expired error)    | VERIFIED   | `realtime/route.ts` lines 46-49 and `realtime/stream/route.ts` lines 123-126: same pattern in both routes                                             |
| 3  | Voice rate limit DB fallback queries UserAnalytics (not Message_v2)                          | VERIFIED   | `voice/route.ts` lines 77-97: `rateLimit.source === "redis"` branch; else queries `UserAnalytics.voiceMinutes` with `Number()` cast                   |
| 4  | Realtime stream rate limit DB fallback queries UserAnalytics (not Message_v2)                | VERIFIED   | `realtime/stream/route.ts` lines 149-168: same `rateLimit.source === "redis"` branching with `UserAnalytics.voiceMinutes` query                       |
| 5  | Export rate limiting works without Redis (queries AuditLog for DATA_EXPORT actions)          | VERIFIED   | `export-user-data/route.ts` lines 56-94: `rateLimit.source === "redis"` branching; else queries `AuditLog` with `.eq("action", "DATA_EXPORT")` and 24h cutoff |
| 6  | Demo chat endpoint validates CSRF tokens on POST requests                                     | VERIFIED   | `app/api/demo/chat/route.ts` line 78: `export const POST = withCsrf(async (request: Request) => {` — full `withCsrf` wrapper                          |
| 7  | Demo chat still works for unauthenticated visitors (CSRF token obtainable without auth)       | VERIFIED   | `middleware.ts` line 135: `"/api/csrf"` in `publicApiRoutes` array; `interactive-chat-demo.tsx` line 46: `const { csrfFetch } = useCsrf()` and line 85: `csrfFetch("/api/demo/chat", ...)` |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact                                              | Expected                                              | Status      | Details                                                                 |
|------------------------------------------------------|-------------------------------------------------------|-------------|-------------------------------------------------------------------------|
| `app/(chat)/api/voice/route.ts`                      | Subscription check + correct voice rate limit DB fallback | VERIFIED | 360 lines, substantive; imports `checkUserSubscription`, `createServiceClient`; queries `UserAnalytics` in DB fallback |
| `app/(chat)/api/realtime/route.ts`                   | Subscription check before AI generation and TTS       | VERIFIED    | 182 lines; imports `checkUserSubscription`; check at line 46, before `apiLog.start` |
| `app/(chat)/api/realtime/stream/route.ts`            | Subscription check + correct voice rate limit DB fallback | VERIFIED | 382 lines; imports `checkUserSubscription`, `createServiceClient`; DB fallback queries `UserAnalytics` |
| `app/(chat)/api/export-user-data/route.ts`           | AuditLog-based DB fallback for rate limiting          | VERIFIED    | 277 lines; `rateLimit.source === "redis"` branching with `AuditLog` query in else branch |
| `app/api/demo/chat/route.ts`                         | CSRF-protected demo chat                              | VERIFIED    | 209 lines; `withCsrf` import at line 21, `export const POST = withCsrf(...)` at line 78 |
| `components/landing/interactive-chat-demo.tsx`       | CSRF token fetch and header injection for demo chat   | VERIFIED    | 689 lines; `useCsrf` import at line 8, `csrfFetch` destructured at line 46, used at line 85 in `sendMessage` callback; `csrfFetch` in useCallback deps at line 183 |
| `lib/supabase/middleware.ts`                         | Public access to /api/csrf for unauthenticated CSRF   | VERIFIED    | `"/api/csrf"` at line 135 in `publicApiRoutes` array |

### Key Link Verification

| From                                           | To                           | Via                                | Status  | Details                                                                                          |
|-----------------------------------------------|------------------------------|------------------------------------|---------|--------------------------------------------------------------------------------------------------|
| `app/(chat)/api/voice/route.ts`               | `lib/db/queries/user.ts`     | `checkUserSubscription` import     | WIRED   | Imported via `@/lib/db/queries` barrel (index.ts exports `checkUserSubscription` from `./user`) |
| `app/(chat)/api/voice/route.ts`               | `UserAnalytics` table        | `createServiceClient` DB query     | WIRED   | `supabaseService.from("UserAnalytics").select("voiceMinutes")` in else branch                   |
| `app/(chat)/api/export-user-data/route.ts`    | `AuditLog` table             | `createServiceClient` DB query     | WIRED   | `supabaseService.from("AuditLog").select("*").eq("action", "DATA_EXPORT")` in else branch        |
| `components/landing/interactive-chat-demo.tsx`| `app/api/demo/chat/route.ts` | `csrfFetch` with X-CSRF-Token      | WIRED   | `csrfFetch("/api/demo/chat", { method: "POST", ... })` at line 85                               |
| `app/api/demo/chat/route.ts`                  | `lib/security/with-csrf.ts`  | `withCsrf` wrapper                 | WIRED   | `import { withCsrf }` at line 21, handler wrapped at line 78                                    |

### Requirements Coverage

| Requirement | Status    | Blocking Issue |
|-------------|-----------|----------------|
| AUTH-01     | SATISFIED | None — `checkUserSubscription` in voice route before ElevenLabs call |
| AUTH-02     | SATISFIED | None — `checkUserSubscription` in both `realtime/route.ts` and `realtime/stream/route.ts` |
| AUTH-03     | SATISFIED | None — `UserAnalytics.voiceMinutes` DB fallback in voice and realtime/stream routes; `getMessageCountByUserId` removed |
| AUTH-04     | SATISFIED | None — `withCsrf` on demo route, `csrfFetch` in client, `/api/csrf` public in middleware |
| AUTH-05     | SATISFIED | None — `AuditLog` DB fallback in export route; `requiresDatabaseCheck` pattern removed |

### Anti-Patterns Found

None detected across all 7 modified files. No TODO/FIXME/placeholder comments. No stub returns. No orphaned code.

Notable: `getMessageCountByUserId` is absent from `voice/route.ts` and `realtime/stream/route.ts` (correctly replaced). `requiresDatabaseCheck` is absent from `export-user-data/route.ts` (correctly replaced with `rateLimit.source === "redis"` branching).

### Human Verification Required

None required. All truths are verifiable programmatically from code inspection.

Items that would be tested in production smoke testing (not blocking):
1. **Expired subscription rejection flow** — Test with a real user whose subscription is expired to confirm the 402/403 response renders correctly in the client.
2. **Demo CSRF in production** — Confirm unauthenticated visitors can load the landing page, obtain a CSRF token via `GET /api/csrf`, and successfully POST to `/api/demo/chat`.

### Gaps Summary

No gaps. All 7 truths are fully verified. All artifacts exist, are substantive, and are correctly wired. All key links check out. Phase goal is achieved: expired/unauthorized users cannot consume paid voice and realtime resources.

---

_Verified: 2026-02-18T17:29:38Z_
_Verifier: Claude (gsd-verifier)_
