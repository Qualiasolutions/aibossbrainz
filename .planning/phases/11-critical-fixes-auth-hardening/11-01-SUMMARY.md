---
phase: 11-critical-fixes-auth-hardening
plan: 01
subsystem: auth
tags: [supabase-auth, zod, rate-limiting, password-ux, react]

# Dependency graph
requires:
  - phase: none
    provides: first plan in v1.2
provides:
  - Fixed auth rate limiting (signup and password reset no longer crash)
  - Consistent 8-character password minimum across Zod schemas, HTML, and toasts
  - Reusable PasswordInput component with show/hide toggle
affects: [auth, signup, login, reset-password]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PasswordInput wrapper component for all password fields"
    - "Consistent variable naming (headersList) for Next.js headers() in server actions"

key-files:
  created:
    - components/password-input.tsx
  modified:
    - app/(auth)/actions.ts
    - components/auth-form.tsx
    - app/(auth)/reset-password/page.tsx
    - app/(auth)/signup/page.tsx

key-decisions:
  - "Used button with type=button and tabIndex={-1} for toggle (avoids form submission, keeps focus on input)"
  - "PasswordInput uses forwardRef for compatibility with form libraries"

patterns-established:
  - "PasswordInput: all password fields must use PasswordInput, never plain Input with type=password"

# Metrics
duration: 2min
completed: 2026-02-11
---

# Phase 11 Plan 01: Auth Rate Limiting Fix, Password Min Length, Password Show/Hide Toggle Summary

**Fixed auth rate-limit crash from undefined headersList variable, enforced 8-char minimums in Zod/HTML/toasts, and created reusable PasswordInput with eye toggle**

## Performance

- **Duration:** 2 min (verification-only -- code already committed)
- **Started:** 2026-02-11T14:39:26Z
- **Completed:** 2026-02-11T14:41:15Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Signup and password reset no longer crash from undefined `requestHeaders` variable (renamed to `headersList`)
- All Zod password schemas enforce `.min(8)` consistently (was `.min(6)`)
- Reusable `PasswordInput` component with Eye/EyeOff toggle integrated into login, signup, and reset-password pages
- Both reset-password fields use `minLength={8}` HTML validation
- Signup error toast updated to say "min 8 characters"

## Task Commits

Code changes were committed atomically prior to plan execution:

1. **Task 1 + Task 2: All auth fixes** - `0cd3e29` (fix) -- Rate-limit variable fix, Zod min(8), PasswordInput creation and integration

**Plan metadata:** (pending final commit)

_Note: All code changes were delivered in a single prior commit. Plan execution verified correctness and created documentation._

## Files Created/Modified
- `app/(auth)/actions.ts` - Fixed `requestHeaders` -> `headersList` in signup and requestPasswordReset; changed `.min(6)` to `.min(8)` on all password Zod schemas
- `components/password-input.tsx` - New reusable component wrapping Input with show/hide password toggle (Eye/EyeOff icons)
- `components/auth-form.tsx` - Replaced plain `Input` with `PasswordInput` for password field
- `app/(auth)/reset-password/page.tsx` - Uses `PasswordInput` for both password fields; both have `minLength={8}`
- `app/(auth)/signup/page.tsx` - Toast text updated from "min 6 characters" to "min 8 characters"

## Decisions Made
- Used `<button type="button">` with `tabIndex={-1}` for the toggle icon -- avoids accidental form submission and keeps keyboard focus on the input field
- `PasswordInput` uses `React.forwardRef` for compatibility with form libraries and ref-based focus management
- Omits `type` from accepted props (`Omit<..., "type">`) since the component manages type internally

## Deviations from Plan

None - plan executed exactly as written. All code was already in place from commit `0cd3e29`.

## Issues Encountered
- `pnpm build` fails due to missing environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) in the development environment. This is unrelated to auth code changes. TypeScript compilation (`tsc --noEmit`) passes cleanly with zero errors, confirming all auth files are syntactically and type-correct.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Auth actions are stable -- signup and password reset work without crashes
- Password UX is consistent across all auth pages
- Ready for Plan 11-02 (chat error recovery) and subsequent phases

## Self-Check: PASSED

All 5 source files verified present. Commit `0cd3e29` verified in git log. SUMMARY file created.

---
*Phase: 11-critical-fixes-auth-hardening*
*Completed: 2026-02-11*
