# Summary: Quick Task 17

**Task:** fix: trial cancellation sets cancelled status instead of expired in webhook
**Date:** 2026-03-06
**Status:** Complete

## Changes

### `lib/stripe/actions.ts`
- Added optional `status` parameter to `expireSubscription()` with default `"expired"`
- Function now accepts `"expired" | "cancelled"` and passes it through to the DB update

### `app/api/stripe/webhook/route.ts`
- In `customer.subscription.deleted` handler, added check for `subscription.cancellation_details?.reason === "cancellation_requested"`
- Explicit cancellations (user or admin initiated) now set status to `"cancelled"`
- Natural expirations (payment failure, end of period) still set `"expired"`

## Root Cause

The webhook handler always called `expireSubscription()` which hardcoded `subscriptionStatus: "expired"`. When a trial user cancels, Stripe fires `customer.subscription.deleted` with `cancellation_details.reason: "cancellation_requested"`, but the handler ignored this field and set "expired" regardless.

## Verification

- TypeScript check passes (`npx tsc --noEmit`)
- Admin panel already handles both "expired" and "cancelled" display (confirmed in `components/admin/users-table.tsx` lines 384-389)
