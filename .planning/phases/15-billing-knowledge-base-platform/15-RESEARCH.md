# Phase 15 Research: Billing, Knowledge Base & Platform

**Date:** 2026-02-11
**Phase:** 15 - Billing, Knowledge Base & Platform
**Requirements:** BILL-01, BILL-02, KB-01, USER-01, UX-01

---

## Table of Contents

1. [BILL-01: Billing Portal Upgrade/Downgrade](#bill-01-billing-portal-upgradedowngrade)
2. [BILL-02: Pricing Page Copy Change](#bill-02-pricing-page-copy-change)
3. [KB-01: Fireflies Transcript Ingestion](#kb-01-fireflies-transcript-ingestion)
4. [USER-01: User Categories in Analytics](#user-01-user-categories-in-analytics)
5. [UX-01: Multi-Select Reactions](#ux-01-multi-select-reactions)
6. [Risk Assessment](#risk-assessment)
7. [Recommended Plan Split](#recommended-plan-split)

---

## BILL-01: Billing Portal Upgrade/Downgrade

### Current State

The billing portal session is created in `lib/stripe/actions.ts` → `createPortalSession()`. It calls `stripe.billingPortal.sessions.create()` with only `customer` and `return_url` -- **no portal configuration ID** is passed. This means it uses Stripe's default portal configuration, which may not have subscription update (upgrade/downgrade) enabled.

**Key files:**
- `lib/stripe/actions.ts` (lines 124-163) -- portal session creation
- `lib/stripe/config.ts` -- plan/price definitions (`STRIPE_PRICES`, `PLAN_DETAILS`)
- `app/(chat)/api/subscription/route.ts` (lines 188-198) -- API route creating portal session
- `app/api/stripe/portal/route.ts` -- alternate portal API route

**Existing subscription tiers:**
| Plan | Price | Price ID env var | Billing |
|------|-------|------------------|---------|
| Monthly | $297/mo | `STRIPE_PRICE_MONTHLY` | Recurring |
| Annual | $2,500 | `STRIPE_PRICE_ANNUAL` | One-time style (subscription cancelled after first payment) |
| Lifetime | $3,500 | `STRIPE_PRICE_LIFETIME` | One-time style (subscription cancelled after first payment) |

### What Needs to Change

1. **Create a Stripe Billing Portal Configuration** via the Stripe API (or Dashboard) with `features.subscription_update` enabled.
2. **Define the product catalog** in the portal config -- list the Stripe product(s) and all three price IDs so customers can switch between them.
3. **Pass the portal configuration ID** to `billingPortal.sessions.create()` so the portal shows upgrade/downgrade options.
4. **Handle proration** -- decide whether to prorate immediately or schedule at period end. Stripe supports `proration_behavior: 'create_prorations' | 'none' | 'always_invoice'`.
5. **Handle webhook events** -- `customer.subscription.updated` must sync the new plan type to the `User` table. The current webhook (`app/api/stripe/webhook/route.ts`) handles `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, and invoice events, but may need updates to detect plan changes (subscriptionType metadata).
6. **Annual/Lifetime complication**: Annual and Lifetime plans are implemented as subscriptions that get cancelled after first payment. This creates a problem for the portal: cancelled subscriptions can't be upgraded through the portal. Need to reconsider whether these should remain as active subscriptions with appropriate billing intervals instead.

### Implementation Approach

**Option A (Recommended): Stripe Dashboard Configuration**
- Configure the billing portal via Stripe Dashboard > Settings > Customer portal
- Enable "Subscription updates" and add the three prices
- No code change needed for the configuration itself -- just pass the config ID

**Option B: Programmatic Configuration**
- Create portal configuration via `stripe.billingPortal.configurations.create()` in a setup script
- Store the configuration ID in an env var
- More reproducible but more complex

**Stripe Portal Configuration API:**
```typescript
const config = await stripe.billingPortal.configurations.create({
  features: {
    subscription_update: {
      enabled: true,
      default_allowed_updates: ['price'],
      proration_behavior: 'create_prorations',
      products: [{
        product: 'prod_xxx',
        prices: [STRIPE_PRICES.monthly, STRIPE_PRICES.annual, STRIPE_PRICES.lifetime],
      }],
    },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: 'at_period_end' },
  },
});
```

### Key Decisions Needed

1. **Proration behavior**: Immediate proration or schedule at period end?
2. **Annual/Lifetime subscription model**: Currently these are "cancel after first payment" subscriptions. For portal upgrade/downgrade to work, they may need to remain as active subscriptions. This is a significant design decision.
3. **Configuration approach**: Dashboard (simpler) vs programmatic (reproducible)?
4. **Downgrade policy**: Allow immediate downgrade or schedule at billing period end?

### Dependencies

- Requires Stripe product and price IDs to be correctly configured in Stripe Dashboard
- Requires env vars `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `STRIPE_PRICE_LIFETIME` to be set
- Webhook handler must detect and sync plan changes

---

## BILL-02: Pricing Page Copy Change

### Current State

The pricing page is at `app/(marketing)/pricing/page.tsx`. It has a `GuaranteeSection` component (lines 415-450) that shows:

```
30-Day Money-Back Guarantee

If you're not completely satisfied with your membership within the
first 30 days, we'll refund your payment in full. No questions
asked. We're confident you'll love working with our AI executive team.
```

Additionally, the subscribe page (`app/(auth)/subscribe/page.tsx`) has copy at line 194:
```
14-day free trial, cancel anytime
```

And the FAQ section (line 336) mentions:
```
Yes! You can cancel anytime with our monthly plan. We believe in earning
your business every month. If you're not satisfied within the first 30
days, we offer a full refund, no questions asked.
```

The paywall modal (`components/subscription/paywall-modal.tsx`) also has:
```
30-day money-back guarantee. Cancel anytime.
```

### What Needs to Change

Replace the "30-Day Money-Back Guarantee" messaging with "Cancel Anytime" across all locations:

1. **`app/(marketing)/pricing/page.tsx`** -- `GuaranteeSection` component:
   - Change heading from "30-Day Money-Back Guarantee" to "Cancel Anytime" equivalent
   - Update body copy to emphasize flexibility over refund policy
   - Update FAQ answer about cancellation
   - The existing "Cancel Anytime" feature bullet (line 72) is already correct
2. **`components/subscription/paywall-modal.tsx`** -- line 245: change "30-day money-back guarantee. Cancel anytime." to "Cancel anytime."
3. **`app/(marketing)/pricing/page.tsx`** -- FAQ section (line 336): remove "30 days refund" language

### Complexity

Low. This is a copy-only change across 2-3 files. No logic changes.

### Files to Modify

- `app/(marketing)/pricing/page.tsx` -- GuaranteeSection + FAQ
- `components/subscription/paywall-modal.tsx` -- guarantee text

---

## KB-01: Fireflies Transcript Ingestion

### Current State

The knowledge base system (`lib/ai/knowledge-base.ts`) reads files from a local `knowledge-base/` directory at the project root. It has three subdirectories:
- `knowledge-base/alexandria/` -- Alexandria's executive knowledge
- `knowledge-base/kim/` -- Kim's executive knowledge
- `knowledge-base/shared/` -- Shared knowledge

**Supported file formats** (already implemented):
- `.md`, `.txt` -- read as UTF-8 text
- `.pdf` -- parsed via `pdf-parse` library
- `.docx` -- parsed via `mammoth` library
- `.xlsx` -- parsed via `exceljs` library

The knowledge base is loaded into the system prompt for each chat request. Content is cached for 60 minutes in memory.

### Fireflies API

**Endpoint:** `https://api.fireflies.ai/graphql`
**Auth:** Bearer token (`FIREFLIES_API_KEY`)

**Key transcript fields available:**
- `title`, `date`, `duration`
- `sentences` -- Array of `{ text, speaker_name, start_time, end_time }`
- `summary` -- Object with `keywords`, `action_items`, `outline`, `overview`, `bullet_gist`, `topics_discussed`
- `speakers` -- Array of `{ id, name }`
- `meeting_attendees`, `meeting_attendance`

**GraphQL query to fetch a transcript:**
```graphql
query Transcript($transcriptId: String!) {
  transcript(id: $transcriptId) {
    title
    date
    duration
    sentences { text speaker_name start_time end_time }
    summary { keywords action_items outline overview bullet_gist topics_discussed }
    speakers { id name }
  }
}
```

### Implementation Approach

**Two-part approach:**

1. **Admin API endpoint** (`app/api/admin/knowledge-base/fireflies/route.ts`):
   - Accept a Fireflies transcript ID (or list of IDs)
   - Fetch transcript from Fireflies GraphQL API
   - Transform into a structured markdown document:
     ```markdown
     # Meeting: [title]
     **Date:** [date] | **Duration:** [duration]
     **Attendees:** [speakers]

     ## Summary
     [overview/bullet_gist]

     ## Key Topics
     [topics_discussed]

     ## Action Items
     [action_items]

     ## Full Transcript
     [Speaker]: [text] ([timestamp])
     ...
     ```
   - Save to `knowledge-base/shared/` (or per-executive directory based on admin choice)
   - Invalidate KB cache via `clearKnowledgeBaseCache()`

2. **Admin UI** (optional, could be Phase 16):
   - Form in admin panel to paste Fireflies transcript ID
   - Preview before saving
   - Choose which executive's knowledge base to save to

### Alternative: Webhook-Based Auto-Ingestion

Fireflies supports webhooks that fire when a new transcript is ready. This could auto-ingest transcripts without manual admin action. However, this adds complexity:
- Webhook endpoint to receive Fireflies notifications
- Need to store `FIREFLIES_WEBHOOK_SECRET` for verification
- Need filtering logic (not all meetings should be ingested)
- Better for Phase 16+

### Key Decisions Needed

1. **Storage location**: Save transcripts to the local filesystem (`knowledge-base/`) or to Supabase storage/table?
   - Local filesystem: Works with existing KB system, but doesn't work on Vercel (read-only filesystem)
   - **Vercel constraint is critical**: The app runs on Vercel where the filesystem is read-only. Transcripts CANNOT be saved to `knowledge-base/` on the server. Options:
     a. Store in Supabase table and extend `getKnowledgeBaseContent()` to also query DB
     b. Store in Vercel Blob storage
     c. Store in Supabase storage bucket
2. **Which executive gets the knowledge**: Admin choice, or auto-assign based on content?
3. **Transcript format**: Full transcript (verbose) or summary-only (concise)?
4. **Rate limiting**: Fireflies API may have rate limits; need to handle gracefully

### Environment Variables Needed

- `FIREFLIES_API_KEY` -- Fireflies API key from Settings > Developer Settings

### Dependencies

- Fireflies account with API access (requires Business or Enterprise plan)
- Decision on storage mechanism (Vercel filesystem limitation)
- Admin UI for trigger (even a simple admin API endpoint works for MVP)

---

## USER-01: User Categories in Analytics

### Current State

The `User` table has a `userType` column (`text | null`) that already exists in the database schema (see `supabase/schema.sql` line 15 and `lib/supabase/database.types.ts` line 616). However:

- The column is **not populated** for any users -- it's nullable with no default
- The **admin user edit page** (`app/(admin)/admin/users/[id]/page.tsx`) does NOT expose `userType` in the UI
- The **admin queries** (`lib/admin/queries.ts`) include `userType` in the `updateUserByAdmin()` function (line 165) and in all RPC functions, but it's never used for filtering
- The **admin analytics page** (`app/(admin)/admin/analytics/page.tsx`) shows stats for ALL users without any category filtering
- The **subscription stats** (`getSubscriptionStats()` in `lib/admin/queries.ts`) calculates MRR from ALL users regardless of type

### What Needs to Change

1. **Define user categories**: Establish valid values for `userType` (e.g., `"team"` and `"client"`)
   - Team = internal Alecci Media staff (their usage doesn't generate revenue)
   - Client = paying customers (their subscriptions represent realized revenue)

2. **Admin UI for categorization**:
   - Add `userType` dropdown to admin user detail page (`app/(admin)/admin/users/[id]/page.tsx`)
   - Allow admins to set users as "team" or "client"

3. **Analytics filtering**:
   - Update `getSubscriptionStats()` to filter by `userType = 'client'` for MRR/revenue calculations
   - Add filter controls to `app/(admin)/admin/analytics/page.tsx`
   - Show "Realized Revenue" (client-only MRR) vs "Total Usage" (all users)

4. **Potentially set `userType` on user creation**:
   - When admin creates a user via `createUserByAdmin()`, allow setting `userType`
   - Default new signups to `"client"` (most users are clients)

### Key Files to Modify

- `app/(admin)/admin/users/[id]/page.tsx` -- Add userType field to edit form
- `app/(admin)/admin/analytics/page.tsx` -- Add filtering by user category
- `lib/admin/queries.ts` -- Update `getSubscriptionStats()`, `getAdminStats()`, `getAllUsers()` to support filtering
- Possibly update admin RPC functions in migration to support filtered queries

### Complexity

Medium. The column exists; main work is UI + query filtering.

---

## UX-01: Multi-Select Reactions

### Current State

The reaction system currently enforces **single reaction per user per message**. Here's why:

**API Route** (`app/(chat)/api/reactions/route.ts`, lines 113-124):
```typescript
// Remove existing reaction first (if any)
await removeMessageReaction({
  messageId,
  userId: user.id,
});

// Add new reaction
await addMessageReaction({
  messageId,
  userId: user.id,
  reactionType: reactionType as ReactionType,
});
```

The `POST` handler removes ALL existing reactions for the user on that message before adding the new one.

**DB Layer** (`lib/db/queries/message.ts`, lines 244-264):
`removeMessageReaction()` deletes ALL reactions for a (messageId, userId) pair -- not filtered by type.

**Component** (`components/message-reactions.tsx`):
- `currentReaction` state is a single `ReactionType | null` (line 69)
- Clicking a reaction toggles it as a single value, not multi-select
- The `handleReaction` function (line 73) treats clicking the same reaction as "remove" and clicking a different one as "replace"

**DB Schema** (`supabase/schema.sql`, lines 95-101):
```sql
CREATE TABLE IF NOT EXISTS "MessageReaction" (
  "id" text NOT NULL DEFAULT (gen_random_uuid())::text,
  "messageId" text NOT NULL,
  "userId" text NOT NULL,
  "reactionType" text NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now()
);
```
There is **NO unique constraint** on `(messageId, userId)` or `(messageId, userId, reactionType)`. The single-reaction behavior is enforced purely in application code.

**Available reaction types:**
- `actionable` (Lightbulb icon, red)
- `needs_clarification` (HelpCircle icon, orange)
- `ready_to_implement` (Rocket icon, green)
- `save_for_later` (Bookmark icon, blue)

### What Needs to Change

1. **API Route** (`app/(chat)/api/reactions/route.ts`):
   - `POST`: Remove the "delete all existing reactions" step. Instead, check if THIS specific reaction type already exists for the user; if so, remove it (toggle off), otherwise add it (toggle on).
   - `DELETE`: Accept `reactionType` parameter and delete only that specific reaction type, not all reactions.
   - `GET` for `getUserReactionForMessage`: Return **array of reaction types** instead of a single one.

2. **DB Queries** (`lib/db/queries/message.ts`):
   - `addMessageReaction()`: Remove the "delete existing of same type" step (line 221-226). Just insert.
   - `removeMessageReaction()`: Add `reactionType` parameter to delete only the specific type.
   - `getUserReactionForMessage()`: Return **all** reactions for the user on that message, not just `.limit(1)`.
   - Consider adding a unique constraint on `(messageId, userId, reactionType)` to prevent duplicates.

3. **Component** (`components/message-reactions.tsx`):
   - Change `currentReaction` from `ReactionType | null` to `ReactionType[]` (array).
   - `handleReaction`: Toggle in/out of the array instead of replacing.
   - Update rendering to show multiple active reactions.

4. **DB Migration**:
   - Add unique constraint: `UNIQUE("messageId", "userId", "reactionType")` to prevent duplicate reactions of the same type.

### Complexity

Medium. The DB already supports it (no unique constraint preventing multiple rows). Main changes are in the API route logic and the component state management.

### Key Files to Modify

- `app/(chat)/api/reactions/route.ts` -- Change toggle logic
- `lib/db/queries/message.ts` -- Update query functions
- `components/message-reactions.tsx` -- Multi-select state
- New migration for unique constraint

---

## Risk Assessment

| Requirement | Risk | Mitigation |
|-------------|------|------------|
| BILL-01 | **High** -- Annual/Lifetime plans use "cancel after first payment" pattern which may conflict with portal upgrade/downgrade | Review subscription model; may need to keep subscriptions active with appropriate intervals |
| BILL-02 | **Low** -- Copy-only change | Straightforward find-and-replace |
| KB-01 | **Medium** -- Vercel read-only filesystem means local KB directory approach won't work | Use Supabase table or Vercel Blob for storage; extend KB loader |
| USER-01 | **Low** -- Column exists, just needs UI + query filter | Test with existing data |
| UX-01 | **Low-Medium** -- No schema constraint to remove, just logic changes | Add DB unique constraint to prevent edge-case duplicates |

---

## Recommended Plan Split

### 15-01: Billing Portal Options and Pricing Copy (BILL-01, BILL-02)
**Scope:**
- Configure Stripe billing portal with subscription update features
- Update `createPortalSession()` to use portal configuration
- Handle `customer.subscription.updated` webhook for plan changes
- Replace "30-Day Money-Back Guarantee" copy with "Cancel Anytime" messaging
- Update paywall modal copy

**Estimated complexity:** Medium-High (portal config + webhook + Annual/Lifetime subscription model review)

### 15-02: Fireflies Transcript Ingestion (KB-01)
**Scope:**
- Add Fireflies GraphQL client
- Create admin API endpoint to fetch and transform transcripts
- Extend knowledge base system to load from Supabase (not just filesystem)
- Create Supabase table for ingested knowledge content
- Admin UI to trigger ingestion

**Estimated complexity:** High (new integration, storage decision, KB system refactor)

### 15-03: User Categories and Multi-Select Reactions (USER-01, UX-01)
**Scope:**
- Add `userType` dropdown to admin user detail page
- Filter analytics by user category for revenue metrics
- Refactor reaction system from single-select to multi-select
- Add DB unique constraint for reactions
- Update API routes and component state

**Estimated complexity:** Medium

---

## External API References

- [Fireflies.ai API Documentation](https://docs.fireflies.ai/)
- [Fireflies Transcript Query](https://docs.fireflies.ai/graphql-api/query/transcript)
- [Stripe Billing Portal Configuration](https://docs.stripe.com/customer-management/configure-portal)
- [Stripe Portal Configuration API](https://docs.stripe.com/api/customer_portal/configurations/create)
- [Stripe Upgrade/Downgrade Guide](https://docs.stripe.com/billing/subscriptions/upgrade-downgrade)
- [Stripe Scheduled Downgrades](https://docs.stripe.com/changelog/acacia/2024-10-28/customer-portal-schedule-downgrades)
