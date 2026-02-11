---
phase: 14-homepage-seo
plan: 02
subsystem: ui, seo
tags: [next-metadata, opengraph, twitter-card, cms, hero-media, csp, vercel-blob]

# Dependency graph
requires:
  - phase: 14-homepage-seo plan 01
    provides: CMS types and admin page base for landing page
provides:
  - Correct SEO link preview meta-data (title + description)
  - Contact page tagline "Sales and Marketing Strategy 24/7"
  - CMS-driven hero media swap (none/image/video) without code changes
  - CSP frame-src for YouTube/Vimeo embeds
  - Vercel Blob image host allowlist
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional hero media rendering based on CMS media_type field"
    - "CSP frame-src managed in vercel.json (single source of truth)"

key-files:
  created:
    - supabase/migrations/20260211_phase14_hero_media_cms.sql
  modified:
    - app/layout.tsx
    - app/(marketing)/contact/page.tsx
    - app/(marketing)/landing-page-client.tsx
    - lib/cms/landing-page-types.ts
    - app/(admin)/admin/landing-page/page.tsx
    - next.config.ts
    - vercel.json

key-decisions:
  - "CSP frame-src updated in vercel.json (not next.config.ts) since that is the single source of truth for security headers"
  - "Hero media_type defaults to 'none' so existing InteractiveChatDemo renders by default with zero behavior change"

patterns-established:
  - "Hero media conditional: none=demo, image=next/image, video=iframe(youtube/vimeo) or native video"

# Metrics
duration: 3min
completed: 2026-02-11
---

# Phase 14 Plan 02: SEO Meta-Data, Contact Tagline & Hero Media CMS Summary

**Updated link preview description to "Your Sales and Marketing Secret Weapon", added contact tagline, and built CMS-driven hero media swap (image/video/demo) with admin controls**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-11T21:06:15Z
- **Completed:** 2026-02-11T21:08:54Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- SEO description updated in all 3 metadata locations (description, openGraph, twitter) to "Your Sales and Marketing Secret Weapon"
- Contact page hero displays "Sales and Marketing Strategy 24/7" as prominent tagline
- Hero section conditionally renders image, video embed (YouTube/Vimeo iframe or native video), or interactive chat demo based on CMS `media_type` field
- Admin CMS editor has Media Type selector and conditional URL input in Hero tab
- Vercel Blob hostname added to Next.js image remote patterns
- YouTube/Vimeo added to CSP frame-src in vercel.json
- Idempotent SQL migration for hero media CMS rows

## Task Commits

Each task was committed atomically:

1. **Task 1: SEO meta-data update and contact page tagline** - `7be08a0` (feat)
2. **Task 2: Hero media CMS (types, conditional rendering, admin editor, config)** - `06bbbd2` (feat)

## Files Created/Modified
- `app/layout.tsx` - Updated description in metadata, openGraph, twitter
- `app/(marketing)/contact/page.tsx` - Added "Sales and Marketing Strategy 24/7" tagline
- `app/(marketing)/landing-page-client.tsx` - Conditional hero media rendering (none/image/video)
- `lib/cms/landing-page-types.ts` - Added media_type and media_url to hero type and defaults
- `app/(admin)/admin/landing-page/page.tsx` - Hero Media card with type selector and URL input
- `next.config.ts` - Added Vercel Blob hostname to remotePatterns
- `vercel.json` - Added YouTube/Vimeo to CSP frame-src
- `supabase/migrations/20260211_phase14_hero_media_cms.sql` - Hero media CMS rows INSERT

## Decisions Made
- CSP frame-src updated in `vercel.json` instead of `next.config.ts` as plan suggested, because vercel.json is the single source of truth for security headers (per existing comment in next.config.ts)
- Hero `media_type` defaults to `"none"` so InteractiveChatDemo renders by default with zero behavior change until admin explicitly sets media

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] CSP frame-src location corrected from next.config.ts to vercel.json**
- **Found during:** Task 2 (Step D - CSP update)
- **Issue:** Plan instructed adding YouTube/Vimeo to frame-src in `next.config.ts`, but CSP headers are defined in `vercel.json` (single source of truth per existing code comment)
- **Fix:** Updated frame-src in `vercel.json` instead
- **Files modified:** vercel.json
- **Verification:** Grep confirms youtube.com in vercel.json frame-src
- **Committed in:** 06bbbd2 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking - wrong file location)
**Impact on plan:** Corrected target file for CSP update. No scope creep.

## Issues Encountered
None

## User Setup Required
- Run SQL migration `20260211_phase14_hero_media_cms.sql` in Supabase Dashboard SQL Editor to add hero media CMS rows

## Next Phase Readiness
- Phase 14 complete (both plans executed)
- All SEO and homepage requirements from client feedback addressed
- Hero media is fully swappable through admin CMS

## Self-Check: PASSED

All 9 files verified present. Both task commits (fefacf8, 06bbbd2) confirmed in git log. TypeScript compiles clean.

---
*Phase: 14-homepage-seo*
*Completed: 2026-02-11*
