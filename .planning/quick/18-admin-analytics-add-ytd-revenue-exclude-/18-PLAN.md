# Plan: 18 — admin analytics — add YTD revenue, exclude team/client from total users

**Mode:** quick (no-plan)
**Created:** 2026-03-06

## Task 1: Add YTD revenue calculation to subscription stats

**What:** Calculate year-to-date revenue from subscription start dates (monthly x months billed, annual/lifetime if started this year)
**Files:** lib/admin/queries.ts, components/admin/subscription-stats.tsx, components/admin/analytics-content.tsx
**Done when:** YTD revenue appears in SubscriptionStats interface and is computed in getSubscriptionStats

## Task 2: Display YTD revenue in analytics revenue breakdown

**What:** Add YTD revenue card alongside MRR in the revenue-filter component
**Files:** components/admin/revenue-filter.tsx
**Done when:** YTD revenue card renders with emerald styling next to MRR

## Task 3: Exclude team/client users from total user count

**What:** Filter out userType='team' and userType='client' from totalUsers and activeUsers queries in getAdminStats
**Files:** lib/admin/queries.ts
**Done when:** Only users with null or 'none' userType are counted in totals
