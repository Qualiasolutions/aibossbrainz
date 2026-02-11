---
phase: 14-homepage-seo
plan: 01
subsystem: ui
tags: [react, tailwind, cms, supabase, landing-page, framer-motion]

# Dependency graph
requires:
  - phase: 12-landing-page-cms
    provides: CMS architecture, LandingPageContent table, admin editor
provides:
  - Plain text executive bio descriptions with CMS-editable fields
  - Red-styled Sales & Marketing Checkup section with 3 value items
  - Updated footer social icons (Globe + Facebook + LinkedIn)
  - Admin CMS Checkup tab and executive description textareas
affects: [14-homepage-seo, landing-page, admin]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CMS section extension pattern: add type + defaults + merger + SQL in sync"
    - "Checkup section with ascending value ordering"

key-files:
  created:
    - supabase/migrations/20260211_phase14_homepage_cms_fields.sql
  modified:
    - lib/cms/landing-page-types.ts
    - lib/cms/landing-page.ts
    - lib/supabase/types.ts
    - app/(marketing)/landing-page-client.tsx
    - app/(marketing)/marketing-layout-client.tsx
    - app/(admin)/admin/landing-page/page.tsx

key-decisions:
  - "Executive bios use simple 2-col grid cards instead of chat-bubble window chrome"
  - "CheckupSection placed between ExecutiveCards and BenefitsGrid for content flow"
  - "Footer social icons: Globe (aleccimedia.com) + Facebook + LinkedIn, X/Twitter removed"

patterns-established:
  - "CMS extension: type interface + defaultContent + merger line + SQL INSERT with ON CONFLICT DO NOTHING"

# Metrics
duration: 5min
completed: 2026-02-11
---

# Phase 14 Plan 01: Homepage Layout - Executive Bios, Social Icons, Checkup Section

**Plain text executive bios with CMS descriptions, red-styled checkup section with ascending value items, and updated footer social icons (Globe + Facebook, no X/Twitter)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-11T21:06:16Z
- **Completed:** 2026-02-11T21:11:15Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Rewrote ExecutiveCards from chat-bubble window chrome to clean text description cards using CMS-driven alex_description/kim_description
- Added CheckupSection component with red gradient background, 3 items ordered lowest to highest value ($97, $1,000+, $6,000)
- Replaced X/Twitter footer icon with Globe (aleccimedia.com) and Facebook icons
- Extended CMS with checkup section type, defaults, merger, SQL migration, and admin tab

## Task Commits

Each task was committed atomically:

1. **Task 1: CMS types, defaults, merger, and SQL migration** - `7be08a0` (feat)
2. **Task 2: Rewrite ExecutiveCards, add CheckupSection, update footer, update admin CMS** - `8a967a6` (feat)

## Files Created/Modified
- `lib/cms/landing-page-types.ts` - Added alex_description, kim_description, checkup section type and defaults
- `lib/cms/landing-page.ts` - Added checkup merge line in fetch function
- `lib/supabase/types.ts` - Added "checkup" to LandingPageSection union
- `supabase/migrations/20260211_phase14_homepage_cms_fields.sql` - Idempotent INSERT for 9 new CMS rows
- `app/(marketing)/landing-page-client.tsx` - Rewrote ExecutiveCards, added CheckupSection
- `app/(marketing)/marketing-layout-client.tsx` - Updated footer social icons
- `app/(admin)/admin/landing-page/page.tsx` - Added Checkup tab, executive description textareas

## Decisions Made
- Used 2-column grid layout for executive cards instead of single-box chat style -- cleaner, more professional look without window chrome
- Placed CheckupSection between ExecutiveCards and BenefitsGrid to create a natural content flow from team -> value proposition -> features
- Used white/transparent cards on red gradient for checkup items instead of solid cards for visual contrast

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**SQL migration must be run in Supabase Dashboard SQL Editor:**
- File: `supabase/migrations/20260211_phase14_homepage_cms_fields.sql`
- This inserts 9 new CMS rows (2 executive descriptions + 7 checkup fields)
- Uses ON CONFLICT DO NOTHING for idempotency

## Next Phase Readiness
- All LAND-01, LAND-03, LAND-04 requirements complete
- Ready for LAND-02 (pricing/about page updates) in plan 02
- SQL migration needs to be applied to production Supabase

---
*Phase: 14-homepage-seo*
*Completed: 2026-02-11*
