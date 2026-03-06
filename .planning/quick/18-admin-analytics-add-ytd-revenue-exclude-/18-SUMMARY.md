# Summary: Quick Task 18 — Admin Analytics: YTD Revenue + Fix Total Users

## Changes Made

### 1. YTD Revenue Calculation (`lib/admin/queries.ts`)
- Added `ytdRevenue` field to `SubscriptionStats` interface
- Updated `getSubscriptionStats` to select `subscriptionStartDate`
- Calculates YTD revenue from subscription data:
  - Monthly: (months active since max(startDate, Jan 1)) x $297
  - Annual: $2,500 if started this year
  - Lifetime: $3,500 if purchased this year

### 2. YTD Revenue Display (`components/admin/revenue-filter.tsx`)
- Changed revenue grid from 2-col to 3-col layout
- Added YTD Revenue card with emerald gradient styling between MRR and Active Subscribers

### 3. Total Users Fix (`lib/admin/queries.ts`)
- Updated `getAdminStats` totalUsers query to filter: `or("userType.is.null,userType.eq.none")`
- Updated activeUsers (onboarded) query with same filter
- Team (userType='team') and client (userType='client') accounts no longer inflate user counts

### 4. Type Updates
- `components/admin/subscription-stats.tsx` — Added `ytdRevenue` to `SubscriptionStatsData`
- `components/admin/analytics-content.tsx` — Added `ytdRevenue` to local `SubscriptionStats` interface
- `app/(admin)/admin/page.tsx` — Added `ytdRevenue: 0` to fallback default object

## Verification
- `npx tsc --noEmit` passes with zero errors
- All type interfaces aligned across server and client boundaries
