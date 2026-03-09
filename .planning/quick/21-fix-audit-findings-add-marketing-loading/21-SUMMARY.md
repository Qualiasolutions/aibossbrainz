# Summary: 21 — Fix Audit Findings

**Date:** 2026-03-09
**Status:** Complete

## Changes

### Task 1: Marketing loading.tsx (FIXED)
- Created `app/(marketing)/loading.tsx` using `PremiumLoader` component
- Marketing routes (/, /about, /pricing, /contact, /terms, /privacy) now show branded loading state during ISR revalidation
- Matches existing pattern in `app/(chat)/loading.tsx`

### Task 2: Homepage latency (NO FIX NEEDED)
- Investigation: 3 consecutive requests showed 825ms → 581ms → 540ms
- `x-vercel-cache: HIT` confirms ISR caching works correctly
- Initial 1.2s was cold start + TLS negotiation, subsequent requests well under 1s
- DNS: ~10ms, Connect: ~80ms, TLS: ~180ms — all healthy

### Task 3: Chat bundle (NO FIX NEEDED)
- `/chat/[id]` and `/new` at 429KB First Load JS (down from 1.06MB after quick-19)
- Route-specific JS is tiny (620 bytes) — the 429KB is 226KB shared + ~203KB chat-specific shared chunks
- Remaining 203KB is core chat infrastructure (AI SDK, data streaming, Supabase realtime) — cannot be meaningfully split further
- 429KB is reasonable for a full-featured AI chat app

## Files Changed
- `app/(marketing)/loading.tsx` (new)
