# Plan: 21 — Fix Audit Findings

**Mode:** quick
**Created:** 2026-03-09

## Task 1: Add marketing route loading.tsx

**What:** Add `loading.tsx` to `app/(marketing)/` route group so users see a branded loading state instead of blank screen during ISR revalidation or layout CMS fetch.
**Files:** `app/(marketing)/loading.tsx` (new)
**Done when:** File exists, uses PremiumLoader, build passes

## Task 2: Investigate homepage latency

**What:** Verify whether 1.2s homepage response is cold start vs consistent. Check if ISR cache is working. Check middleware overhead.
**Files:** Investigation only — may produce no code changes
**Done when:** Root cause identified, fix applied if actionable

## Task 3: Review chat bundle for further optimization

**What:** Check what's still contributing to 429KB on /chat/[id] and /new. Identify if further dynamic imports are possible.
**Files:** Investigation only
**Done when:** Findings documented, actionable items identified
