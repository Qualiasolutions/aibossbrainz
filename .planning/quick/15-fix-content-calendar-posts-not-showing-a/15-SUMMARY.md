# Summary: 15 — Fix content calendar posts not showing after AI tool creates them

**Status:** Complete
**Date:** 2026-03-04
**Commit:** 92dd443

## Root Cause

The AI model (Gemini 3 Flash) had no knowledge of the current date. Neither the system prompt nor the content calendar tool description provided today's date. As a result, the model generated posts with **2024 dates** (from its training data), while the calendar UI displayed **March 2026**. Posts existed in the database but were invisible because the date range didn't match.

## Changes Made

### 1. `lib/ai/prompts.ts`
- Added `Today's date is ${today}.` to the system prompt so all AI tools and responses have current date context

### 2. `lib/ai/tools/content-calendar.ts`
- Added dynamic `TODAY'S DATE: ${today}` to the tool description
- Added rule: "All scheduled dates MUST be today or later. Never use past dates."
- Added rule 5: "Schedule posts starting from today or future dates. NEVER use dates before today."

### 3. Database cleanup
- Deleted 10 test rows from ContentCalendar table that had 2024 dates (May/June 2024)

## Verification

- TypeScript: `npx tsc --noEmit` passes
- Deployed to Vercel production
- HTTP 200: bossbrainz.aleccimedia.com responds correctly
- Latency: 673ms (under 1s threshold)
