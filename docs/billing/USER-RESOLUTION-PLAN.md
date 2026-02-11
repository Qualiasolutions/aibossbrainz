# User Resolution Plan: Dagmar and Becky

> **Purpose:** Resolve potential double-billing confusion for legacy users who may have separate Stripe subscriptions outside the platform.

---

## Situation Summary

**Dagmar** (dagmar@insidesmatch.com) and **Becky** were added to the AI Boss Brainz platform manually through the admin panel. They may also have legacy Stripe subscriptions in Alexandria's original Stripe account that were created before the platform existed.

### Key Points:

1. **Admin Panel Status:** Shows them as "Monthly" or similar - but this is database-only
2. **Platform Stripe:** Does NOT charge them (admin-added users have no Stripe connection)
3. **Legacy Stripe:** MAY continue charging them (if subscriptions exist in Alexandria's original Stripe account)

**The platform is NOT double-billing anyone.** The risk is that legacy Stripe subscriptions (created separately) may continue charging while the platform also shows an "active" subscription status.

See [BILLING-SYSTEM-OVERVIEW.md](./BILLING-SYSTEM-OVERVIEW.md) for full explanation of how the billing systems work.

---

## Risk Assessment

| System | Is Charging? | Action Needed? |
|--------|--------------|----------------|
| **Platform (admin panel)** | NO | None - database only |
| **Legacy Stripe (Alexandria's original account)** | MAYBE | Check and decide |

**If legacy Stripe subscriptions exist and are still active:**
- User is being charged by legacy Stripe
- Platform shows them as "active" but is NOT charging
- Need to choose: cancel legacy OR keep legacy as billing source

---

## Resolution Options

### Option A: Cancel Legacy Stripe Subscriptions (Recommended)

**Best for:** Users you want to manage entirely through the platform admin panel

**What happens:**
- Legacy Stripe subscription is canceled
- User stops being charged
- Platform admin panel continues tracking their access
- You manually manage renewals through admin panel

**Steps:**

1. Log into Alexandria's **legacy/original Stripe account** (not the platform's Stripe account)
2. Go to Customers > Search for the user's email
3. Find their active subscription
4. Click on the subscription
5. Choose "Cancel subscription"
   - **Immediate:** Access ends now
   - **At period end:** Access continues until current period ends, then stops

6. Return to platform admin panel
7. Verify user's subscription dates match your intended access period

**Pros:**
- Clean, single source of truth
- No more legacy billing to track
- Platform status accurately reflects access

**Cons:**
- No automatic renewal - must manually update admin panel when period ends
- User would need to go through /pricing to get automatic billing

---

### Option B: Keep Legacy Stripe Active

**Best for:** Users where you want Stripe to continue handling billing automatically

**What happens:**
- Legacy Stripe subscription continues charging
- Platform admin panel shows status (but may drift over time)
- You have two places tracking the same user

**Steps:**

1. Verify legacy Stripe subscription details match intended billing (amount, frequency)
2. In platform admin panel, optionally add a note: "Billing via legacy Stripe"
3. Remember: Platform status is informational only for this user

**Pros:**
- No change to current billing
- Automatic renewal continues

**Cons:**
- Two systems to track
- Platform status may become inaccurate over time
- Must remember this user is different

---

## Dagmar Resolution Checklist

**Email:** dagmar@insidesmatch.com

### Step 1: Verify Platform Status

- [ ] Go to admin panel: /admin/users
- [ ] Find dagmar@insidesmatch.com
- [ ] Check `stripeCustomerId` - should be NULL (confirming admin-added)
- [ ] Note current `subscriptionType` and `subscriptionEndDate`

### Step 2: Check Legacy Stripe

- [ ] Log into Alexandria's legacy/original Stripe account
- [ ] Search for: dagmar@insidesmatch.com
- [ ] Document findings:
  - [ ] Subscription exists: YES / NO
  - [ ] If YES, status: _______________
  - [ ] If YES, amount: _______________
  - [ ] If YES, next billing date: _______________

### Step 3: Make Decision

- [ ] Choose Option A (cancel legacy) or Option B (keep legacy)
- [ ] Document decision: _______________

### Step 4: Execute Resolution

**If Option A (Cancel Legacy):**
- [ ] Cancel subscription in legacy Stripe
- [ ] Verify user can still access platform (if within admin period)
- [ ] Note when admin panel subscription needs renewal

**If Option B (Keep Legacy):**
- [ ] Document that dagmar@insidesmatch.com is billed via legacy Stripe
- [ ] Optionally update platform notes

### Step 5: Verify

- [ ] Confirm chosen billing source is active
- [ ] Confirm user has expected access
- [ ] Document resolution date: _______________

---

## Becky Resolution Checklist

**Email:** _______________ (fill in when identified)

### Step 1: Identify Becky in Admin Panel

- [ ] Go to admin panel: /admin/users
- [ ] Search for "Becky" or browse user list
- [ ] Identify Becky's email: _______________
- [ ] Check `stripeCustomerId` - should be NULL (confirming admin-added)
- [ ] Note current `subscriptionType` and `subscriptionEndDate`

### Step 2: Check Legacy Stripe

- [ ] Log into Alexandria's legacy/original Stripe account
- [ ] Search for Becky's email
- [ ] Document findings:
  - [ ] Subscription exists: YES / NO
  - [ ] If YES, status: _______________
  - [ ] If YES, amount: _______________
  - [ ] If YES, next billing date: _______________

### Step 3: Make Decision

- [ ] Choose Option A (cancel legacy) or Option B (keep legacy)
- [ ] Document decision: _______________

### Step 4: Execute Resolution

**If Option A (Cancel Legacy):**
- [ ] Cancel subscription in legacy Stripe
- [ ] Verify user can still access platform (if within admin period)
- [ ] Note when admin panel subscription needs renewal

**If Option B (Keep Legacy):**
- [ ] Document that Becky is billed via legacy Stripe
- [ ] Optionally update platform notes

### Step 5: Verify

- [ ] Confirm chosen billing source is active
- [ ] Confirm user has expected access
- [ ] Document resolution date: _______________

---

## Quick Reference: Which Stripe Account?

| Account | Contains | URL |
|---------|----------|-----|
| **Legacy/Original Stripe** | Dagmar & Becky's manual subscriptions | Usually https://dashboard.stripe.com (check which account is logged in) |
| **Platform Stripe** | Users who signed up via /pricing | Connected to the AI Boss Brainz platform |

**Important:** These may be the SAME Stripe account or DIFFERENT accounts. Verify which account contains the legacy subscriptions before making changes.

---

## After Resolution

Once both users are resolved:

1. **Document the outcome** - Note which option was chosen for each user
2. **Set calendar reminders** - If using Option A, note when admin panel renewals are needed
3. **Archive this document** - Mark as complete with resolution dates

---

## Related Documentation

- [BILLING-SYSTEM-OVERVIEW.md](./BILLING-SYSTEM-OVERVIEW.md) - Full explanation of platform billing behavior
- Admin Panel: /admin/users - Manage user subscriptions
- Stripe Dashboard: https://dashboard.stripe.com - View Stripe subscriptions

---

*Created: 2026-02-02*
*Status: Pending resolution*
