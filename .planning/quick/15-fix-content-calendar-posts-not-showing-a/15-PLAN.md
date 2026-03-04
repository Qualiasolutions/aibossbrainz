# Plan: 15 — Fix content calendar posts not showing after AI tool creates them

**Mode:** quick
**Created:** 2026-03-04

## Root Cause

The AI model generates posts with **2024 dates** because neither the system prompt nor the tool description tells it the current date. All 10 posts in the DB have scheduledDate in 2024, while the calendar views March 2026.

## Task 1: Add current date to content calendar tool description

**What:** Inject `new Date().toISOString().split('T')[0]` into the tool description so the AI model knows today's date and generates future/current dates.
**Files:** `lib/ai/tools/content-calendar.ts`
**Done when:** Tool description includes dynamic current date

## Task 2: Add current date to system prompt

**What:** Add the current date to the system prompt builder so ALL tools and the model itself knows the date.
**Files:** `lib/ai/prompts.ts`
**Done when:** System prompt includes today's date

## Task 3: Clean up bad test data

**What:** Delete all ContentCalendar rows with 2024 dates from production DB (they're test data with wrong dates).
**Done when:** No 2024-dated posts remain in ContentCalendar table
