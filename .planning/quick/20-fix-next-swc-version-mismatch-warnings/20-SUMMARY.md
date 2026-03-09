# Quick Task 20: Fix @next/swc version mismatch warnings

**Date:** 2026-03-10
**Commit:** e51c577

## What was done

Bumped `next` from 15.5.11 to 15.5.12.

## Root cause

`next@15.5.11` ships with `@next/swc@15.5.7` as its optional dependency (no @next/swc@15.5.11 exists on npm). Next.js compares its own version against the SWC binary version and prints a misleading warning. `next@15.5.12` ships with `@next/swc@15.5.12` — versions match, warning gone.

## Verification

- `pnpm build` passes with zero SWC warnings
- Bundle sizes unchanged (429KB for /new and /chat/[id])
- No TypeScript errors
