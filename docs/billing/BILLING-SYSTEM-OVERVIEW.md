# Billing System Overview

> **For Alexandria:** When you change a user's subscription type in the admin panel, this ONLY updates the database. It does NOT create a Stripe subscription or trigger any charges. The platform's admin panel is completely separate from Stripe billing.

## Executive Summary

The AI Boss Brainz platform has **two separate billing systems** that work independently:

1. **Platform Stripe Checkout** - For new users signing up through the pricing page. This DOES create real Stripe subscriptions and charge users.

2. **Admin Panel Editing** - For manual user management. This ONLY updates the local database. It does NOT connect to Stripe or charge anyone.

Understanding this distinction is critical for managing users like Dagmar and Becky who may have legacy Stripe subscriptions that exist separately from their admin panel status.

---

## The Two Billing Systems Explained

### Comparison Table

| Feature | Platform Stripe Checkout | Admin Panel Editing |
|---------|--------------------------|---------------------|
| **Triggers when** | User signs up via /pricing | Admin changes subscription in panel |
| **Creates Stripe Customer?** | YES | NO |
| **Creates Stripe Subscription?** | YES | NO |
| **Triggers charges?** | YES (automatic billing) | NO (never charges) |
| **stripeCustomerId field** | Set to Stripe ID | Remains NULL |
| **stripeSubscriptionId field** | Set to Stripe ID | Remains NULL |
| **Auto-renewal** | YES (managed by Stripe) | NO (manual tracking only) |
| **Use case** | Self-service signups | Manual user additions |

---

## What Admin Panel Subscription Changes Do

When you edit a user's subscription in the admin panel (e.g., changing from "trial" to "monthly"):

### What HAPPENS:
- The `subscriptionType` field in the database is updated
- The `subscriptionStatus` is set to "active"
- The `subscriptionStartDate` is set to today
- The `subscriptionEndDate` is calculated based on subscription type:
  - **Monthly:** 30 days from today
  - **Annual:** 365 days from today
  - **Lifetime:** Far future date (essentially permanent)

### What Does NOT Happen:
- NO Stripe Customer is created
- NO Stripe Subscription is created
- NO payment is collected
- NO recurring charges are set up
- The user's `stripeCustomerId` stays NULL
- The user's `stripeSubscriptionId` stays NULL

### Practical Meaning:
When you set someone to "Monthly" in the admin panel, they get platform access for 30 days. After that, their access expires unless you manually renew them. There is NO automatic billing.

---

## What Platform Stripe Checkout Does

When a user signs up through the normal checkout flow (/pricing page):

### What HAPPENS:
1. User selects a plan on the pricing page
2. User is redirected to Stripe Checkout
3. Stripe creates a Customer record for this user
4. Stripe creates a Subscription (with 7-day trial for monthly)
5. Payment information is collected
6. Stripe webhooks notify the platform of status changes
7. Database is updated with Stripe IDs and subscription status

### Key Behaviors:
- **Monthly subscriptions:** Stripe charges automatically every month
- **Annual subscriptions:** Stripe charges once, set to not renew (one-time purchase)
- **Lifetime subscriptions:** Stripe charges once, never renews
- **Webhook sync:** When Stripe status changes (renewal, cancellation, failure), the platform database is updated automatically

### Practical Meaning:
Users who sign up through the normal checkout are fully managed by Stripe. They are charged automatically. You can see their subscriptions in the Stripe Dashboard.

---

## How to Tell Which System a User Is On

### Quick Check:
Look at the user's `stripeCustomerId` in the admin panel:

| stripeCustomerId Value | What It Means |
|------------------------|---------------|
| **NULL** (empty) | User was added via admin panel. NO Stripe billing. |
| **Has a value** (cus_...) | User signed up through platform checkout. Stripe is billing them. |

### Examples:

**Admin-Added User (No Stripe Billing):**
```
Email: dagmar@insidesmatch.com
stripeCustomerId: NULL
stripeSubscriptionId: NULL
subscriptionType: monthly
subscriptionStatus: active
```
This user has platform access but is NOT being charged by the platform's Stripe. If they have legacy charges, those are coming from a separate Stripe account.

**Platform Checkout User (Has Stripe Billing):**
```
Email: newuser@example.com
stripeCustomerId: cus_abc123
stripeSubscriptionId: sub_def456
subscriptionType: monthly
subscriptionStatus: active
```
This user IS being charged by Stripe every month automatically.

---

## Important Notes for User Management

### For Admin-Added Users:
- They get platform access based on their `subscriptionEndDate`
- When that date passes, their status changes to "expired"
- To renew them, you manually update their subscription in the admin panel
- They are never charged by the platform

### For Checkout Users:
- Stripe handles everything automatically
- Do NOT manually change their subscription in admin panel (it will create inconsistency)
- Use Stripe Dashboard to manage their billing
- The platform syncs automatically via webhooks

### For Legacy Users (Dagmar/Becky):
- They may have SEPARATE legacy Stripe subscriptions in Alexandria's original Stripe account
- These legacy subscriptions are NOT connected to the platform
- The admin panel shows their status, but that status is NOT linked to Stripe
- To resolve double-billing risk, see: [USER-RESOLUTION-PLAN.md](./USER-RESOLUTION-PLAN.md)

---

## Frequently Asked Questions

### Does changing a user to "Monthly" in the admin panel trigger charges?

**No.** Changing subscription type in the admin panel only updates the database. No Stripe Customer or Subscription is created. No payment is collected.

### How do admin-added users get billed?

**They don't get billed by the platform.** If you added a user through the admin panel, they receive free access for the duration you set. To actually bill them, they would need to go through the normal checkout flow on /pricing.

### What about legacy users like Dagmar and Becky?

Legacy users may have Stripe subscriptions that were created manually in Alexandria's original Stripe account - completely separate from this platform. Their admin panel status does NOT affect those legacy subscriptions.

**To resolve this:**
1. Check if they have legacy Stripe subscriptions (in Alexandria's original Stripe account)
2. Decide whether to cancel the legacy subscription or keep it
3. See [USER-RESOLUTION-PLAN.md](./USER-RESOLUTION-PLAN.md) for detailed steps

### If I want a user to be billed automatically, how do I set that up?

The user needs to go through the normal checkout flow:
1. Have them visit the /pricing page
2. They select their plan and complete checkout
3. Stripe creates their subscription
4. Automatic billing begins

Admin panel subscription changes do NOT enable automatic billing.

### Can I see which users have real Stripe subscriptions?

Yes. In the admin panel, look for users where `stripeCustomerId` is NOT null. Those users have real Stripe subscriptions managed by the platform.

### What happens when an admin-added user's subscription expires?

Their `subscriptionStatus` changes to "expired" and they lose platform access. To restore access, you manually update their subscription in the admin panel to give them a new period.

### Is the platform doing anything wrong with billing?

**No.** The platform billing system works correctly. The confusion arises because:
1. Admin-added users don't have Stripe subscriptions (by design)
2. Legacy users may have separate Stripe subscriptions from before the platform existed
3. These are completely independent systems

---

## Technical Details (For Reference)

### Database Fields

| Field | Description |
|-------|-------------|
| `subscriptionType` | pending, trial, monthly, annual, lifetime |
| `subscriptionStatus` | pending, active, trialing, expired, cancelled |
| `subscriptionStartDate` | When current period started |
| `subscriptionEndDate` | When current period ends |
| `stripeCustomerId` | Stripe Customer ID (NULL if admin-added) |
| `stripeSubscriptionId` | Stripe Subscription ID (NULL if admin-added) |

### Code Paths

**Admin Panel Subscription Update:**
- `app/(admin)/admin/users/page.tsx` calls `updateUserSubscription()`
- `lib/admin/queries.ts::updateUserSubscription()` updates database only
- NO Stripe API calls are made

**Platform Checkout:**
- `app/api/stripe/checkout/route.ts` creates Stripe Checkout session
- Stripe creates Customer and Subscription
- `app/api/stripe/webhook/route.ts` receives Stripe events
- Database is updated to match Stripe status

---

## Summary

| If you want to... | Do this... |
|-------------------|------------|
| Give someone free access | Use admin panel to add them with desired subscription type |
| Bill someone automatically | Have them sign up through /pricing checkout |
| Check if someone has real billing | Look for non-null `stripeCustomerId` |
| Resolve legacy billing confusion | See [USER-RESOLUTION-PLAN.md](./USER-RESOLUTION-PLAN.md) |

---

*Last updated: 2026-02-02*
*For questions about specific user situations, consult the USER-RESOLUTION-PLAN.md*
