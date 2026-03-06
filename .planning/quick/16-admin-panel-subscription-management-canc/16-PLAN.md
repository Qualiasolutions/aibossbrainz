# Plan: 16 — Admin Panel Subscription Management (Cancel/Change via Stripe)

**Mode:** quick
**Created:** 2026-03-06

## Task 1: Add admin cancel subscription server action + API

**What:** Add `cancelSubscriptionByAdmin` to `lib/admin/queries.ts` that calls Stripe cancel + updates DB. Add cancel action to users page server actions.
**Files:** `lib/admin/queries.ts`, `app/(admin)/admin/users/page.tsx`
**Done when:** Cancel action available and wired to users page

## Task 2: Add Cancel Subscription to users table + enhance user detail page

**What:** Add "Cancel Subscription" option to users-table dropdown menu. Add subscription management actions (cancel + change plan) to user detail page with Stripe integration.
**Files:** `components/admin/users-table.tsx`, `app/(admin)/admin/users/[id]/page.tsx`
**Done when:** Admin can cancel or change any user's subscription from both the table and detail page, with Stripe sync
