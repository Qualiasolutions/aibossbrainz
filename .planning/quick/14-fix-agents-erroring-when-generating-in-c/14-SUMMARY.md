# Quick Task 14 Summary

## Fix: Content calendar tool errors when agents generate posts

**Date:** 2026-03-04
**Commit:** 2aabe0f
**Status:** Complete

## Problem

AI agents (Alexandria/Kim/Collaborative) consistently failed when trying to save social media posts to the ContentCalendar table. Zero records were ever inserted despite the table existing with correct schema and RLS policies.

## Root Cause

The Zod `inputSchema` used strict `.regex()` patterns on `scheduledDate` (`/^\d{4}-\d{2}-\d{2}$/`) and `scheduledTime` (`/^\d{2}:\d{2}$/`). When Gemini 2.5 Flash generated dates/times in any variant format (single-digit month/day, natural language dates, AM/PM times), the Zod validation failed **before** `execute()` ran. With `stepCountIs(3)`, the model had only 3 retry attempts, all of which could fail validation.

## Changes

### `lib/ai/tools/content-calendar.ts`
- Removed `.regex()` from `scheduledDate` and `scheduledTime` — replaced with `.string()` + descriptive `.describe()`
- Added `normalizeDate()` — handles YYYY-MM-DD, single-digit variants (2026-3-15), natural dates (March 15, 2026)
- Added `normalizeTime()` — handles HH:MM, single-digit hour (9:30), 12-hour AM/PM (3:30 PM)
- Error messages now include specific details about what failed

### `lib/db/queries/content-calendar.ts`
- Replaced `getClient()` helper with `fromCalendar()` — cleaner single-purpose helper
- Removed redundant intermediate variable assignment pattern

## Verification

- TypeScript: `npx tsc --noEmit` passes
- Build: Vercel production build succeeded
- Deploy: bossbrainz.aleccimedia.com — HTTP 200, API healthy
- Post-deploy: All 4 verification checks pass
