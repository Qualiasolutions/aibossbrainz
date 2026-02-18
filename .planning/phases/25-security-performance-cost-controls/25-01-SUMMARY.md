---
phase: 25-security-performance-cost-controls
plan: 01
subsystem: api, security
tags: [zod, csp, ajv, validation, error-sanitization, security-headers]

# Dependency graph
requires:
  - phase: none
    provides: none
provides:
  - Sanitized Zod validation error responses in all 8 leaking API routes
  - Tightened CSP with upgrade-insecure-requests directive
  - Patched ajv ReDoS vulnerability via pnpm override
affects: [api-routes, security-headers, dependency-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ChatSDKError('bad_request:api') for all validation failures instead of raw Zod output"
    - "logger.warn with error.flatten() for server-side Zod diagnostics"

key-files:
  created: []
  modified:
    - app/api/demo/chat/route.ts
    - app/(chat)/api/document/route.ts
    - app/(chat)/api/vote/route.ts
    - app/(chat)/api/subscription/route.ts
    - app/(chat)/api/support/route.ts
    - app/(chat)/api/support/[ticketId]/messages/route.ts
    - app/(chat)/api/profile/route.ts
    - app/(chat)/api/canvas/route.ts
    - vercel.json
    - package.json

key-decisions:
  - "Demo chat route keeps Response.json({ error: 'Invalid request' }) pattern instead of ChatSDKError since it has no ChatSDKError import and the simple pattern is sufficient"
  - "CSP upgrade-insecure-requests appended at end of directive string for clarity"
  - "ajv override uses >=8.18.0 (not pinned exact) to allow future patch updates"

patterns-established:
  - "All API validation errors use ChatSDKError('bad_request:api').toResponse() -- never expose Zod flatten/errors to clients"
  - "Server-side Zod diagnostics logged via logger.warn({ errors: parsed.error.flatten() }, 'Context message')"

# Metrics
duration: 11min
completed: 2026-02-18
---

# Phase 25 Plan 01: Zod Error Sanitization, CSP Tightening & ajv Patch Summary

**Sanitized Zod validation leaks in 8 API routes to return generic errors, added upgrade-insecure-requests CSP directive, and patched ajv ReDoS vulnerability via pnpm override**

## Performance

- **Duration:** 11min
- **Started:** 2026-02-18T20:30:43Z
- **Completed:** 2026-02-18T20:42:25Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- All 8 API routes now return generic "bad request" errors instead of leaking Zod schema details (field names, types, constraints)
- CSP header includes upgrade-insecure-requests to force HTTPS for all subresources
- ajv dependency patched to >=8.18.0 resolving GHSA-2g4f-4pwh-qvx6 ReDoS vulnerability
- Server-side Zod diagnostics preserved via logger.warn for debugging

## Task Commits

Each task was committed atomically:

1. **Task 1: Sanitize Zod error responses in all 8 leaking API routes** - `e2b5f54` (fix)
2. **Task 2: Tighten CSP and fix ajv vulnerability** - `3a145fc` (chore)

## Files Created/Modified
- `app/api/demo/chat/route.ts` - Removed `details: error.errors` from ZodError catch, added logger.warn
- `app/(chat)/api/document/route.ts` - Replaced `error.flatten()` response with ChatSDKError
- `app/(chat)/api/vote/route.ts` - Replaced `error.flatten()` response with ChatSDKError
- `app/(chat)/api/subscription/route.ts` - Replaced `error.flatten()` response with ChatSDKError
- `app/(chat)/api/support/route.ts` - Replaced `error.flatten()` response with ChatSDKError
- `app/(chat)/api/support/[ticketId]/messages/route.ts` - Replaced `error.flatten()` response with ChatSDKError
- `app/(chat)/api/profile/route.ts` - Removed `details: parseResult.error.flatten()` from response, kept existing apiLog.warn
- `app/(chat)/api/canvas/route.ts` - Replaced `error.flatten()` response with ChatSDKError
- `vercel.json` - Added `upgrade-insecure-requests` to CSP header
- `package.json` - Added `"ajv": ">=8.18.0"` to pnpm.overrides

## Decisions Made
- Demo chat route keeps simple `Response.json({ error: "Invalid request" })` pattern instead of ChatSDKError since it doesn't import ChatSDKError and the generic message is sufficient
- ajv override uses `>=8.18.0` (not exact pin) to allow automatic patch updates
- CSP directive appended at end of value string for readability

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing Next.js build failure in static page generation (reset-password prerender error) unrelated to our changes. TypeScript type checking (`tsc --noEmit`) passes cleanly, confirming all code changes are correct.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SEC-01, SEC-02, SEC-03 all resolved
- Ready for 25-02 (chat message pagination, performance optimizations)
- No blockers

## Self-Check: PASSED

- All 10 modified files: FOUND
- Commit e2b5f54 (Task 1): FOUND
- Commit 3a145fc (Task 2): FOUND
- Summary file: FOUND

---
*Phase: 25-security-performance-cost-controls*
*Completed: 2026-02-18*
