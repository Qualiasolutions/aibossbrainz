---
phase: 09-mailchimp-integration
plan: 01
subsystem: integration
tags: [mailchimp, email-automation, tagging, resend]

dependency-graph:
  requires:
    - "08: Billing documentation (Stripe webhook context)"
  provides:
    - "Mailchimp client module with lazy initialization"
    - "Tag application functions (trial, paid)"
    - "Admin notification system for error alerts"
  affects:
    - "09-02: Trial tagging integration (will import applyTrialTag)"
    - "09-03: Paid tagging integration (will import applyPaidTag)"

tech-stack:
  added:
    - "@mailchimp/mailchimp_marketing: ^3.0.80"
    - "@types/mailchimp__mailchimp_marketing: ^3.0.22"
  patterns:
    - "Lazy client initialization (matches lib/stripe/config.ts)"
    - "Exponential backoff retry (500ms, 1s, 2s)"
    - "Graceful degradation when env vars missing"

key-files:
  created:
    - lib/mailchimp/client.ts
    - lib/mailchimp/tags.ts
    - lib/email/admin-notifications.ts
  modified:
    - package.json
    - pnpm-lock.yaml
    - .env.example

decisions:
  - id: D-0901-01
    decision: "Graceful degradation when Mailchimp not configured"
    rationale: "Build must succeed without env vars; log warning and return success to not block user flow"
  - id: D-0901-02
    decision: "3 retries with exponential backoff before failure"
    rationale: "Balance reliability with user experience; delays: 500ms, 1s, 2s"
  - id: D-0901-03
    decision: "Use node:crypto for MD5 hash"
    rationale: "Built-in Node.js module, no external dependency needed"

metrics:
  duration: ~3 minutes
  tasks: 3/3
  commits: 3
  completed: 2026-02-02
---

# Phase 9 Plan 01: Mailchimp Client Foundation Summary

**One-liner:** Mailchimp SDK with lazy initialization, tag functions with retry logic, admin alerts via Resend

## What Was Built

### lib/mailchimp/client.ts
- `getMailchimpClient()` - Lazy-initialized Mailchimp client, returns null if env vars missing
- `MAILCHIMP_TAGS` - Constants matching Alexandria's existing tags:
  - `TRIAL`: "7-Day Free Trial: AI Boss Brainz"
  - `PAID_MONTHLY`: "AI Boss Brainz Monthly"
  - `PAID_ANNUAL_OR_LIFETIME`: "AI Boss Brainz Full"
- `MAILCHIMP_AUDIENCE_ID` - Defaults to "d5fc73df51"

### lib/mailchimp/tags.ts
- `getSubscriberHash(email)` - MD5 hash of lowercase email for Mailchimp subscriber lookup
- `applyTrialTag(email)` - Apply trial tag, upsert contact if needed
- `applyPaidTag(email, subscriptionType)` - Apply paid tag based on plan type
- Both functions implement 3-retry exponential backoff and admin notification on failure

### lib/email/admin-notifications.ts
- `sendAdminNotification({ subject, message })` - Generic admin alert via Resend
- Sends to info@qualiasolutions.net with "[Alert]" prefix
- Graceful degradation when RESEND_API_KEY not configured

### Environment Configuration
Added to `.env.example`:
- `MAILCHIMP_API_KEY` - API key from Mailchimp dashboard
- `MAILCHIMP_SERVER_PREFIX` - Datacenter prefix (e.g., "us5")
- `MAILCHIMP_AUDIENCE_ID` - Audience ID (default: d5fc73df51)

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D-0901-01 | Graceful degradation when Mailchimp not configured | Build must succeed without env vars |
| D-0901-02 | 3 retries with exponential backoff (500ms, 1s, 2s) | Balance reliability with user experience |
| D-0901-03 | Use node:crypto for MD5 hash | Built-in Node.js module |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| b912cfc | chore(09-01): install Mailchimp SDK and TypeScript types |
| 486d1c5 | feat(09-01): create Mailchimp client module with tag functions |
| 0356252 | feat(09-01): add admin notification helper and Mailchimp env docs |

## Verification Results

- [x] `pnpm exec tsc --noEmit` passes
- [x] `pnpm build` succeeds without env vars
- [x] lib/mailchimp/ directory exists with client.ts and tags.ts
- [x] lib/email/admin-notifications.ts exists
- [x] .env.example includes Mailchimp configuration section

## Next Phase Readiness

**Ready for 09-02 (Trial Tagging):**
- `applyTrialTag` function ready to import
- Will be called from email verification flow

**Ready for 09-03 (Paid Tagging):**
- `applyPaidTag` function ready to import
- Will be called from Stripe webhook handler

**User Setup Required:**
Before deploying to production, Alexandria needs to configure:
1. `MAILCHIMP_API_KEY` in Vercel environment variables
2. `MAILCHIMP_SERVER_PREFIX` (from the API key)
3. Optionally verify `MAILCHIMP_AUDIENCE_ID` is correct

---

*Executed: 2026-02-02*
*Duration: ~3 minutes*
