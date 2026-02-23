---
phase: quick-8
plan: 01
subsystem: security, safety, api
tags: [system-prompts, canary-tokens, input-validation, voice-analytics, jspdf, rate-limiting]

requires:
  - phase: 25-production-audit
    provides: "AI Production Audit findings (CRIT-2, HIGH-1, HIGH-2, MED-1, MED-2, MED-3, MED-7, MED-8)"
provides:
  - "Harmful content refusal rules in system prompts (CRIT-2)"
  - "Professional advice disclaimers in system prompts (HIGH-2)"
  - "Updated jsPDF to ^4.2.0 (HIGH-1)"
  - "Extended canary token hash to 16 hex chars (MED-1)"
  - "Full sanitizePromptContent on web search results (MED-2)"
  - "Bounded strategy canvas input validation (MED-3)"
  - "Voice analytics tracking on all realtime routes (MED-7)"
  - "Correct voiceRequestCount DB fallback for rate limiting (MED-8)"
affects: [voice, analytics, system-prompts, security]

tech-stack:
  added: []
  patterns:
    - "voiceRequestCount column for accurate voice rate limit DB fallback"
    - "Record<string, unknown> cast for forward-compatible DB column access"

key-files:
  created:
    - supabase/migrations/20260223000100_add_voice_request_count.sql
  modified:
    - lib/bot-personalities.ts
    - lib/safety/canary.ts
    - lib/ai/tools/web-search.ts
    - lib/ai/tools/strategy-canvas.ts
    - lib/analytics/queries.ts
    - app/(chat)/api/realtime/route.ts
    - app/(chat)/api/realtime/stream/route.ts
    - app/(chat)/api/voice/route.ts
    - package.json

key-decisions:
  - "Record<string, unknown> cast for voiceRequestCount access pre-migration (type-safe with fallback to voiceMinutes)"

patterns-established:
  - "voice_request analytics type tracked separately from voice minutes for accurate request-based rate limiting"

duration: 7min
completed: 2026-02-23
---

# Quick Task 8: Fix 8 Audit Findings Summary

**Harmful content refusal + professional disclaimers in system prompts, jsPDF update, canary hash extension, web search sanitization, strategy canvas validation, voice analytics on realtime routes, and voiceRequestCount rate limit fallback**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-23T21:44:07Z
- **Completed:** 2026-02-23T21:52:02Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- CRIT-2: System prompts now explicitly refuse harmful content (malware, self-harm, weapons, CSAM, fraud, etc.)
- HIGH-2: Professional advice disclaimers for legal/financial/medical questions
- HIGH-1: jsPDF updated from 4.1.0 to 4.2.0 (no known vulnerabilities)
- MED-1: Canary token hash extended from 8 to 16 hex chars (2^64 keyspace)
- MED-2: Web search results sanitized with full sanitizePromptContent instead of minimal regex
- MED-3: Strategy canvas items bounded to max 500 chars per string, max 10 items per array
- MED-7: Both realtime routes now record voice analytics via after() callbacks
- MED-8: All three voice routes use voiceRequestCount for DB fallback rate limiting

## Task Commits

Each task was committed atomically:

1. **Task 1: System prompt safety + dependency update + quick code fixes** - `ae33ab2` (feat)
2. **Task 2: Voice analytics tracking + rate limit DB fallback fix** - `4f068b0` (feat)

## Files Created/Modified
- `lib/bot-personalities.ts` - Added CONTENT SAFETY RULES and PROFESSIONAL ADVICE DISCLAIMERS to IDENTITY_RULES
- `lib/safety/canary.ts` - Extended canary hash from .slice(0, 8) to .slice(0, 16)
- `lib/ai/tools/web-search.ts` - Replaced sanitizeSnippet with sanitizePromptContent from prompts.ts
- `lib/ai/tools/strategy-canvas.ts` - Added .max(500) per string and .max(10) on items array
- `lib/analytics/queries.ts` - Added "voice_request" type and p_voice_request_count RPC param
- `app/(chat)/api/realtime/route.ts` - Added voice analytics after() + voiceRequestCount DB fallback
- `app/(chat)/api/realtime/stream/route.ts` - Added voice analytics after() + voiceRequestCount DB fallback
- `app/(chat)/api/voice/route.ts` - Updated 3 analytics calls to also track voice_request + voiceRequestCount DB fallback
- `supabase/migrations/20260223000100_add_voice_request_count.sql` - New column + updated RPC
- `package.json` - jsPDF ^4.1.0 -> ^4.2.0

## Decisions Made
- Used `Record<string, unknown>` cast to access `voiceRequestCount` column before migration is applied, with graceful fallback to `voiceMinutes` if column doesn't exist yet. This avoids TypeScript errors from generated Supabase types while maintaining type safety.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript type error for voiceRequestCount column**
- **Found during:** Task 2 (voice analytics + rate limit fix)
- **Issue:** Generated Supabase types don't include `voiceRequestCount` since migration hasn't been applied yet. Build failed with `Property 'voiceRequestCount' does not exist on type`.
- **Fix:** Used `Record<string, unknown>` cast with nullish coalescing fallback to `voiceMinutes`. Code reads: `Number((data as Record<string, unknown>)?.voiceRequestCount ?? data?.voiceMinutes) || 0`
- **Files modified:** realtime/route.ts, realtime/stream/route.ts, voice/route.ts
- **Verification:** Build passes cleanly
- **Committed in:** 4f068b0 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential type-safety fix for pre-migration deployment. No scope creep.

## Issues Encountered
None beyond the auto-fixed type error above.

## User Setup Required

**Migration needs to be applied via Supabase Dashboard SQL Editor:**
- Run `supabase/migrations/20260223000100_add_voice_request_count.sql`
- This adds the `voiceRequestCount` column and updates the `record_user_analytics` RPC

## Next Phase Readiness
- All 8 audit findings resolved
- Production audit score should move from ~88 toward 95+
- After migration is applied, regenerate Supabase types to remove the Record cast workaround

---
*Quick Task: 8-fix-8-audit-findings-harmful-content-ref*
*Completed: 2026-02-23*
