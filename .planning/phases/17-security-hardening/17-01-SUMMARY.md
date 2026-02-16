---
phase: 17-security-hardening
plan: 01
subsystem: security
tags: [xss, next-script, middleware, auth-bypass, allowlist, defense-in-depth]

# Dependency graph
requires:
  - phase: 16-model-resilience
    provides: stable AI layer and tool hardening foundation
provides:
  - XSS-free root layout using next/script with beforeInteractive strategy
  - Middleware API route allowlist (new routes default to requiring auth)
affects: [17-02 (health endpoint is in the allowlist), 18-safety-rails, 20-observability]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "next/script with inline children for trusted init scripts (no dangerouslySetInnerHTML)"
    - "Explicit publicApiRoutes allowlist in middleware -- new API routes require auth by default"

key-files:
  created: []
  modified:
    - app/layout.tsx
    - lib/supabase/middleware.ts

key-decisions:
  - "beforeInteractive strategy for theme-color script to prevent chrome color flash"
  - "Allowlist approach over blocklist -- new routes default to protected"
  - "/api/admin/landing-page kept public (GET serves public content, POST has own isUserAdmin check)"

patterns-established:
  - "Use next/script with id prop for any inline scripts in root layout"
  - "Add new public API routes to publicApiRoutes array in middleware.ts -- everything else is auth-gated"

# Metrics
duration: 2min
completed: 2026-02-16
---

# Phase 17 Plan 01: XSS Removal & Middleware Allowlist Summary

**Replaced dangerouslySetInnerHTML XSS vector with next/script and converted blanket /api/ middleware bypass to explicit allowlist of 6 public routes**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-16T19:28:01Z
- **Completed:** 2026-02-16T19:29:53Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Eliminated the only dangerouslySetInnerHTML in layout files (SEC-01 from production audit finding C-8)
- Theme-color initialization still runs before paint via Script strategy="beforeInteractive"
- Middleware now requires authentication for all /api/ routes except 6 explicitly listed ones (SEC-02 from audit finding H-2)
- New API routes automatically require auth -- defense-in-depth prevents accidental exposure

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace dangerouslySetInnerHTML with next/script (SEC-01)** - `c33c22c` (fix)
2. **Task 2: Convert middleware to API route allowlist (SEC-02)** - `06e80bf` (fix)

## Files Created/Modified

- `app/layout.tsx` - Replaced `<head><script dangerouslySetInnerHTML>` with `<Script id="theme-color-init" strategy="beforeInteractive">`, removed biome-ignore suppression
- `lib/supabase/middleware.ts` - Added publicApiRoutes allowlist, replaced blanket `/api/` startsWith bypass with isPublicApiRoute check

## Decisions Made

- **beforeInteractive placement:** Script placed inside `<body>` before ThemeProvider -- `beforeInteractive` auto-injects into `<head>` regardless of JSX position in root layout
- **Allowlist over blocklist:** Defense-in-depth -- new routes default to requiring auth instead of being accidentally public
- **6 public API routes:** /api/auth, /api/stripe/webhook, /api/health, /api/demo/chat, /api/admin/landing-page, /api/cron/ -- each has its own secondary auth (Stripe signatures, CRON_SECRET, isUserAdmin)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SEC-01 and SEC-02 closed -- ready for 17-02 (realtime Zod validation and health endpoint two-tier response)
- /api/health is in the public allowlist, ready for SEC-04 two-tier response in plan 02
- No blockers

## Self-Check: PASSED

- FOUND: app/layout.tsx
- FOUND: lib/supabase/middleware.ts
- FOUND: 17-01-SUMMARY.md
- FOUND: c33c22c (Task 1)
- FOUND: 06e80bf (Task 2)

---
*Phase: 17-security-hardening*
*Completed: 2026-02-16*
