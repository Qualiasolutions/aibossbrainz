# Phase 8: Billing Documentation - Research

**Researched:** 2026-02-02
**Domain:** Billing system behavior, Stripe integration, subscription management
**Confidence:** HIGH (based on comprehensive codebase investigation)

## Summary

This phase is an **investigation and documentation** task, not a code implementation. The AI Boss Brainz platform has a fully implemented Stripe billing system that works correctly for users who sign up through the normal checkout flow. However, there's a critical gap: **the admin panel's subscription editing feature only updates the local database - it does NOT interact with Stripe**.

**Key finding:** When an admin changes a user's subscription type (e.g., from "trial" to "monthly") via the admin panel, this ONLY updates the `subscriptionType`, `subscriptionStatus`, `subscriptionStartDate`, and `subscriptionEndDate` fields in the local database. **NO Stripe subscription is created, modified, or charged.**

**Primary recommendation:** Document this behavior clearly and resolve Dagmar/Becky's double-billing risk by either (A) canceling their legacy Stripe subscriptions and leaving the platform to track status-only, or (B) leaving legacy Stripe active and setting admin panel status to "informational only" with clear documentation.

## Key Findings: Platform Billing Architecture

### How Stripe Integration Actually Works

The platform has **two completely separate billing systems** that are NOT connected:

| System | Triggers Charges? | Used For |
|--------|-------------------|----------|
| **Stripe Checkout Flow** | YES | New users signing up via `/pricing` page |
| **Admin Panel Editing** | NO | Manual user management by Alexandria |

#### 1. Stripe Checkout Flow (DOES Charge)

Users who sign up through the normal flow:

```
/pricing -> Select Plan -> /api/stripe/checkout -> Stripe Checkout -> Webhook -> DB Update
```

**Key code path:** `app/api/stripe/checkout/route.ts` -> `lib/stripe/actions.ts`

- Creates Stripe Customer (stored in `stripeCustomerId`)
- Creates Stripe Subscription with 7-day trial (stored in `stripeSubscriptionId`)
- Webhooks from Stripe update local database automatically
- Monthly users ARE auto-charged by Stripe
- Annual/Lifetime users are set to `cancel_at_period_end` after first payment (no renewal)

#### 2. Admin Panel Subscription Editing (Does NOT Charge)

When an admin edits a user's subscription via `/admin/users`:

```
Admin Panel -> updateUserSubscription() -> Direct DB update only
```

**Key code path:** `app/(admin)/admin/users/page.tsx` -> `lib/admin/queries.ts::updateUserSubscription()`

```typescript
// From lib/admin/queries.ts:227-251
export async function updateUserSubscription(
  userId: string,
  subscriptionType: SubscriptionType,
) {
  const supabase = createServiceClient();
  const startDate = new Date();
  const endDate = calculateSubscriptionEndDate(startDate, subscriptionType);

  const { data, error } = await supabase
    .from("User")
    .update({
      subscriptionType,
      subscriptionStartDate: startDate.toISOString(),
      subscriptionEndDate: endDate.toISOString(),
      subscriptionStatus: "active" as SubscriptionStatus,
      profileUpdatedAt: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single();

  // NOTE: NO STRIPE API CALLS - This only updates the database!
}
```

**This means:**
- Changing a user to "Monthly" in admin panel = local status change only
- User gets platform access based on `subscriptionEndDate`
- NO Stripe customer or subscription is created
- NO charges are triggered
- `stripeCustomerId` and `stripeSubscriptionId` remain NULL

### Database Schema (Billing Fields)

```sql
-- User table billing columns
"subscriptionType"      -- 'pending', 'trial', 'monthly', 'annual', 'lifetime'
"subscriptionStatus"    -- 'pending', 'active', 'trialing', 'expired', 'cancelled'
"subscriptionStartDate" -- Start of current period
"subscriptionEndDate"   -- End of current period (auto-calculated)
"stripeCustomerId"      -- Stripe Customer ID (NULL for admin-added users)
"stripeSubscriptionId"  -- Stripe Subscription ID (NULL for admin-added users)
```

### Double-Billing Risk Analysis

**For Dagmar and Becky:**

They have:
1. **Legacy Stripe subscription** - Created manually by Alexandria in her personal/original Stripe account
2. **Platform subscription** - Added manually via admin panel (Monthly status)

**Current state:**
- Legacy Stripe: WILL charge them on renewal
- Platform admin: WILL NOT charge them (no Stripe connection)

**Risk:** Legacy Stripe continues charging. No double-billing FROM the platform, but confusion exists.

## Architecture Patterns

### Subscription State Machine

```
                                    ┌─────────────────────┐
                                    │                     │
    ┌─────────┐  checkout  ┌───────▼───────┐  trial_end  ┌─────────────┐
    │ pending │ ──────────►│   trialing    │ ──────────► │   active    │
    └─────────┘            └───────────────┘             └─────────────┘
         │                                                     │
         │  admin_create                                       │
         ▼                                                     ▼
    ┌─────────────┐                                     ┌─────────────┐
    │   active    │ ──────────────────────────────────► │   expired   │
    │ (no stripe) │        (end_date passed)            └─────────────┘
    └─────────────┘
```

### Platform Flow vs Admin Flow

**Platform (Stripe-connected):**
```
Sign up → Checkout → Stripe webhook → DB update
Renewal → Stripe invoice.paid → DB renewal
Cancel  → Stripe subscription.deleted → DB expire
```

**Admin Panel (Database-only):**
```
Admin adds user → DB insert (no Stripe)
Admin edits subscription → DB update (no Stripe)
Expiration → Cron job checks subscriptionEndDate → DB expire
```

## Don't Hand-Roll

This phase is documentation/investigation, not implementation. However:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Syncing legacy Stripe | Custom migration script | Manual resolution | 2 users, too risky to automate |
| Real-time billing dashboard | Custom Stripe integration | Stripe Dashboard directly | Already built, more accurate |
| Automatic conflict detection | Custom reconciliation | Document + manual check | Low volume, manual is safer |

## Common Pitfalls

### Pitfall 1: Assuming Admin Panel Creates Stripe Subscriptions
**What goes wrong:** Admin thinks changing user to "Monthly" starts billing
**Why it happens:** UI looks like it controls billing
**How to avoid:** Document clearly, add warning in UI (optional)
**Warning signs:** User has NULL `stripeCustomerId` but "active" subscription

### Pitfall 2: Not Checking Stripe Customer ID
**What goes wrong:** Trying to migrate user to platform billing without Stripe customer
**Why it happens:** User was added via admin panel, has no Stripe link
**How to avoid:** Always check `stripeCustomerId` before Stripe operations
**Warning signs:** `stripeCustomerId` is NULL

### Pitfall 3: Canceling Wrong Stripe Subscription
**What goes wrong:** Canceling platform subscription instead of legacy
**Why it happens:** Multiple Stripe accounts/subscriptions exist
**How to avoid:** Verify which Stripe account owns the subscription
**Warning signs:** User still getting charged after "cancellation"

## Resolution Options for Dagmar/Becky

### Option A: Cancel Legacy Stripe (Recommended)

**Steps:**
1. Login to Alexandria's **legacy/original** Stripe account (not platform Stripe)
2. Find subscriptions for dagmar@insidesmatch.com and Becky's email
3. Cancel those subscriptions (immediate or at period end)
4. Leave admin panel subscription as-is (platform tracks status, no charges)

**Pros:** Single source of truth (platform), no Stripe charges
**Cons:** Must manually track renewals, no auto-renewal

### Option B: Keep Legacy Stripe Active

**Steps:**
1. Leave legacy Stripe subscriptions active (they auto-renew)
2. In admin panel, document that subscription status is "informational only"
3. Optionally add `[LEGACY BILLING]` note to user profile

**Pros:** Billing continues unchanged
**Cons:** Platform status may drift from actual Stripe status

### Option C: Migrate to Platform Stripe

**Steps:**
1. Have user go through `/pricing` -> checkout flow
2. Platform creates new Stripe subscription
3. Cancel legacy Stripe subscription

**Pros:** Full platform integration
**Cons:** User charged twice temporarily, complex coordination

## Documentation Deliverables

Phase 8 should produce:

1. **BILLING-BEHAVIOR.md** - Document explaining how billing works
2. **USER-RESOLUTION-PLAN.md** - Specific actions for Dagmar and Becky
3. **Admin Panel Audit** - Verify Dagmar/Becky's current state

### Recommended Document Structure

```
docs/
└── billing/
    ├── BILLING-SYSTEM-OVERVIEW.md    # How platform billing works
    ├── ADMIN-PANEL-VS-STRIPE.md      # What admin panel does vs Stripe
    └── LEGACY-USER-RESOLUTION.md     # Dagmar/Becky resolution
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual invoices | Stripe Checkout | Platform v1.0 | Auto-billing for new users |
| Direct DB edits | Admin panel | Platform v1.1 | Easier user management |

**Not implemented:**
- Stripe Customer Portal for self-service (exists but rarely used)
- Billing sync between admin panel and Stripe
- Migration tools for legacy users

## Open Questions

### 1. Becky's Email Address
**What we know:** She exists in legacy Stripe, was manually added to admin
**What's unclear:** Exact email address (not in provided reference)
**Recommendation:** Check admin panel users list for "Becky"

### 2. Legacy Stripe Account Access
**What we know:** Alexandria has a separate/original Stripe account
**What's unclear:** Whether this is the same Stripe account the platform uses
**Recommendation:** Clarify with Alexandria which Stripe account has the legacy subscriptions

### 3. Desired Billing Behavior Going Forward
**What we know:** Platform CAN handle billing automatically
**What's unclear:** Does Alexandria want to migrate all users or keep manual?
**Recommendation:** Document current behavior, leave migration as future decision

## Sources

### Primary (HIGH confidence)
- `/home/qualia/Desktop/Projects/aiagents/ai-bossy-brainz/lib/admin/queries.ts` - Admin subscription functions
- `/home/qualia/Desktop/Projects/aiagents/ai-bossy-brainz/lib/stripe/actions.ts` - Stripe integration
- `/home/qualia/Desktop/Projects/aiagents/ai-bossy-brainz/app/api/stripe/webhook/route.ts` - Webhook handlers
- `/home/qualia/Desktop/Projects/aiagents/ai-bossy-brainz/app/api/stripe/checkout/route.ts` - Checkout flow
- `/home/qualia/Desktop/Projects/aiagents/ai-bossy-brainz/supabase/migrations/20260119_add_stripe_fields.sql` - DB schema

### Secondary (MEDIUM confidence)
- `/home/qualia/Downloads/alexandria-requests-ai-boss-brainz.md` - Original requirements

## Metadata

**Confidence breakdown:**
- Billing architecture: HIGH - Direct codebase investigation
- Admin panel behavior: HIGH - Code path verified
- Legacy Stripe details: MEDIUM - Based on requirements doc, needs verification
- Resolution options: HIGH - Based on code analysis

**Research date:** 2026-02-02
**Valid until:** Indefinite (behavior is stable unless code changes)

---

## Quick Reference: Admin Panel Does NOT Trigger Stripe

When you see this dialog in the admin panel:

```
┌─────────────────────────────────────────────┐
│         Change Subscription                 │
├─────────────────────────────────────────────┤
│ Subscription Type                           │
│ ┌─────────────────────────────────────────┐ │
│ │ Monthly                              ▼  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ What happens:                               │
│ • Subscription starts from today            │
│ • Previous subscription period is replaced  │
│ • User will have immediate access           │
│                                             │
│ [Cancel]                    [Update Sub]    │
└─────────────────────────────────────────────┘
```

**Remember:** This ONLY updates the database. No Stripe charges are triggered.
