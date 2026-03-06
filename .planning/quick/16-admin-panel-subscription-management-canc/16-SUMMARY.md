# Summary: 16 — Admin Panel Subscription Management (Cancel/Change via Stripe)

**Status:** Complete
**Commit:** 271b362

## What was done

### Backend: `cancelSubscriptionByAdmin()` in `lib/admin/queries.ts`
- Retrieves user's Stripe subscription ID
- Cancels in Stripe via API (if connected and not already cancelled)
- Updates DB: sets status to "cancelled", clears stripeSubscriptionId
- Gracefully handles already-cancelled or missing Stripe subscriptions

### Users Table (`components/admin/users-table.tsx`)
- Added "Cancel Subscription" dropdown menu item (only shows for active/trialing users)
- Orange-styled confirmation dialog with clear consequences listed
- Cancel action calls new `cancelSubscriptionByAdmin` server action

### User Detail Page (`app/(admin)/admin/users/[id]/page.tsx`)
- Replaced static subscription card with interactive `SubscriptionManager` component
- Added Change Plan and Cancel Subscription action buttons
- Added Stripe dashboard deep links for Customer ID and Subscription ID

### New Component: `components/admin/subscription-manager.tsx`
- Displays all subscription info (plan, status, dates, Stripe IDs)
- Change Plan dialog: select new plan type, cancels existing Stripe sub, resets dates
- Cancel Subscription dialog: cancels in Stripe + updates DB status
- Stripe Customer/Subscription IDs link directly to Stripe Dashboard

## Files changed
- `lib/admin/queries.ts` — added `cancelSubscriptionByAdmin()`
- `app/(admin)/admin/users/page.tsx` — added cancel server action + prop
- `components/admin/users-table.tsx` — added cancel dropdown item + dialog
- `app/(admin)/admin/users/[id]/page.tsx` — integrated SubscriptionManager component
- `components/admin/subscription-manager.tsx` — new component (created)
