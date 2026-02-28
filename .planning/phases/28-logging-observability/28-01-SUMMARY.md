---
phase: 28-logging-observability
plan: 01
subsystem: observability
tags: [logging, sentry, error-tracking, production-debugging]
dependency_graph:
  requires: [27-02]
  provides: [structured-client-logging, sentry-integration]
  affects: [error-boundaries, client-components, hooks, admin-pages, utils]
tech_stack:
  added: [lib/client-logger.ts]
  patterns: [Sentry.captureException, logClientError, Pino-server-logging]
key_files:
  created:
    - lib/client-logger.ts
  modified:
    - components/error-boundary.tsx
    - components/chat-error-boundary.tsx
    - lib/utils.ts
    - hooks/use-inline-voice.ts
    - hooks/use-voice-to-text.ts
    - app/(admin)/admin/page.tsx
    - app/(admin)/admin/users/page.tsx
    - app/(admin)/admin/support-tickets/[ticketId]/page.tsx
    - app/(auth)/subscribe/page.tsx
    - app/(chat)/subscription/page.tsx
    - app/(chat)/account/account-client.tsx
    - app/(marketing)/pricing/pricing-client.tsx
    - components/chat.tsx
    - components/onboarding-modal.tsx
    - components/history-pin-button.tsx
    - components/multimodal-input.tsx
    - components/message-actions.tsx
    - components/subscription/subscription-provider.tsx
    - components/subscription/paywall-modal.tsx
    - components/support/support-new-ticket.tsx
    - components/support/support-ticket-conversation.tsx
    - components/landing/interactive-chat-demo.tsx
decisions: []
metrics:
  duration: "10min"
  completed: 2026-02-28
---

# Phase 28 Plan 01: Client-Side Logging Migration Summary

**One-liner:** Migrated all 41 console.error calls to structured logging with Sentry integration for production error tracking.

## What Was Done

### 1. Client-Side Logger Utility (lib/client-logger.ts)
- Created `logClientError()` function using Sentry SDK
- Production: Sends to Sentry with component/action tags
- Development: Preserves console.error for visibility
- Comprehensive JSDoc with usage patterns

### 2. Error Boundaries (2 files)
- `error-boundary.tsx`: Direct Sentry.captureException with errorBoundary tag
- `chat-error-boundary.tsx`: Same pattern with component stack context
- Both include Error object with full type information

### 3. Server Components (3 admin pages)
- Used Pino logger (lib/logger.ts) instead of client logger
- All 6 safe wrapper functions in admin/page.tsx
- Admin users page create_user error
- Support tickets page notification error
- Structured logging with component/action/context

### 4. Client Components & Hooks (19 files)
- Subscribe page: 4 console.error → logClientError (subscription check, profile save, checkout, retry)
- Subscription page: 4 instances (load data, billing portal, cancel, upgrade)
- Account client: 3 instances (save profile, export data, delete account)
- Pricing client: 1 instance (checkout)
- Chat: 1 instance (PDF export)
- Onboarding modal: 1 instance (fetch profile)
- History pin button: 1 instance (toggle pin with chatId context)
- Message actions: 2 instances (PDF export, Excel export)
- Multimodal input: 1 instance (file upload with file count)
- Voice hooks: 5 instances (use-inline-voice: 3, use-voice-to-text: 2)
- Subscription components: 2 instances (provider, paywall modal)
- Support components: 2 instances (new ticket, conversation)
- Interactive chat demo: 1 instance (demo chat)
- Utils: 2 instances (CSRF token fetch, CSRF init)

All logClientError calls include:
- component: Component/hook name
- action: Specific operation that failed
- Context: Relevant IDs, counts, or parameters

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Phase 29 (File Splitting & Refactoring):** ✅ Ready

All error logging is now structured and tracked in Sentry, providing full visibility during refactoring work. Error boundaries and components properly report errors with context.

## Self-Check: PASSED

Verified files:
```bash
$ test -f /home/qualia/Projects/Live-Projects/aibossbrainz/lib/client-logger.ts
✓ Client logger created

$ test -f /home/qualia/Projects/Live-Projects/aibossbrainz/components/error-boundary.tsx
✓ Error boundary exists
```

Verified commits:
```bash
$ git log --oneline --all --grep="28-01" | wc -l
3
```

Commits:
- `3dda71d`: feat(28-01): create client-side error logger with Sentry integration
- `1950718`: refactor(28-01): migrate all console.error to structured logging
- Final commit (this summary): docs(28-01): complete client-side logging migration plan

All verification commands passed:
- Console.error count: 1 (only in lib/client-logger.ts development mode)
- logClientError usage: 50 instances
- Sentry.captureException in error boundaries: 2 files
- TypeScript compilation: Success (zero errors)
