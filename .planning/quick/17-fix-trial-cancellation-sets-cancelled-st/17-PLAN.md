# Plan: 17 — fix: trial cancellation sets cancelled status instead of expired in webhook

**Mode:** quick (no-plan)
**Created:** 2026-03-06

## Task 1: Distinguish cancellation from expiration in webhook

**What:** When `customer.subscription.deleted` fires, check Stripe's `cancellation_details.reason` to determine if the user explicitly cancelled vs the subscription naturally expired. Pass the correct status ("cancelled" or "expired") to the DB update.

**Files:**
- `lib/stripe/actions.ts` — Add optional `status` param to `expireSubscription()`
- `app/api/stripe/webhook/route.ts` — Check `cancellation_details.reason === "cancellation_requested"` before calling `expireSubscription()`

**Done when:** Trial cancellations show "Cancelled" (not "Expired") in admin panel
