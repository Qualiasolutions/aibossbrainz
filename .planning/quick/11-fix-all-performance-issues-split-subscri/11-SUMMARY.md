# Quick Task 11 Summary

## Description
Fix all performance issues from Vercel Speed Insights review: split monolith pages, consolidate renders, lazy-load sidebar, Supabase index cleanup.

## Changes Made

### Task 1: Split /subscribe and /account monoliths (commit a621551)
- Extracted `PaymentSuccess` → `app/(auth)/subscribe/components/payment-success.tsx`
- Extracted `WelcomeStep` → `app/(auth)/subscribe/components/welcome-step.tsx`
- Extracted `ProfileSection` → `app/(chat)/account/components/profile-section.tsx`
- Extracted `BusinessProfileSection` → `app/(chat)/account/components/business-profile-section.tsx`
- Extracted `DataPrivacySection` → `app/(chat)/account/components/data-privacy-section.tsx`
- All loaded via `next/dynamic` for code-splitting
- Removed `unoptimized` flag from all Image components in subscribe
- Slowed polling from 2s → 4s (maxPolls 30 → 15, same 60s timeout)

### Task 2: Consolidate renders + lazy sidebar (commit e4b7ecc)
- `/new` page: eliminated duplicate render branches (55 → 37 lines)
- `/chat/[id]` page: eliminated duplicate render branches (111 → 91 lines)
- `(chat)/layout.tsx`: AppSidebar now loaded via `next/dynamic`

### Task 3: Supabase DB index cleanup (applied live via MCP)
- Added missing FK index: `idx_aicostlog_chatid` on `AICostLog.chatId`
- Dropped 8 unused indexes (zero scans confirmed via `pg_stat_user_indexes`):
  - `idx_aicostlog_createdat`, `idx_aicostlog_userid`
  - `idx_stripe_webhook_event_processed`
  - `idx_webhook_dead_letter_resolved`, `idx_webhook_dead_letter_created`
  - `idx_stream_chatid_createdat`
  - `idx_support_ticket_message_sender_id`
  - `Chat_userCategory_idx`
- Migration file: `supabase/migrations/20260227000100_performance_index_cleanup.sql`

## Verification
- `pnpm build` passes cleanly (no errors, no warnings)
- Supabase advisors: FK index advisory resolved, 7 unused index advisories resolved
- Security advisors: still clean (no issues)

## Notes
- Auth connection strategy (percentage-based) is a Supabase Dashboard setting, not SQL. Documented in migration comments.
- Subscribe page bundle: 341kB (from ~340kB — main savings are in lazy-loaded chunks for PaymentSuccess/WelcomeStep)
- Account page savings come from dynamic import code-splitting of 3 sections
