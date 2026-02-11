# Data Retention Policy

**Last Updated:** 2026-02-05
**Effective Date:** 2026-02-05

## Overview

This document outlines the data retention policies for Boss Brainz (AI Executive Consulting Platform). These policies ensure compliance with GDPR, CCPA, and other data protection regulations while maintaining system performance and user privacy.

## Retention Periods

### User Data

| Data Type | Active Retention | Soft Delete Period | Hard Delete |
|-----------|------------------|-------------------|-------------|
| User Account | Indefinite (while active) | 30 days | After 30 days |
| Profile Information | Indefinite (while active) | 30 days | After 30 days |
| Authentication Data | Session-based | Immediate on logout | N/A |

### Conversation Data

| Data Type | Active Retention | Soft Delete Period | Hard Delete |
|-----------|------------------|-------------------|-------------|
| Chat Sessions | Indefinite | 30 days | After 30 days |
| Messages | Indefinite | 30 days | After 30 days |
| AI-Generated Documents | Indefinite | 30 days | After 30 days |
| File Attachments | Indefinite | 30 days | After 30 days |

### Analytics & Logging

| Data Type | Retention Period | Notes |
|-----------|-----------------|-------|
| User Analytics | 2 years | Aggregated usage metrics |
| Audit Logs | 7 years | Security and compliance |
| Error Logs (Sentry) | 90 days | Automatic via Sentry |
| Request Logs (Vercel) | 30 days | Automatic via Vercel |

### Business Data

| Data Type | Retention Period | Notes |
|-----------|-----------------|-------|
| Subscription Records | 7 years | Financial compliance |
| Payment Transactions | 7 years | Via Stripe (PCI compliant) |
| Support Tickets | 3 years | Customer service records |

## Soft Delete Implementation

All user-facing data uses soft delete via `deletedAt` timestamp columns:

```sql
-- Tables with soft delete:
- User (deletedAt)
- Chat (deletedAt)
- Message_v2 (deletedAt)
- Document (deletedAt)
- Vote_v2 (deletedAt)
- Suggestion (deletedAt)
- Stream (deletedAt)
- StrategyCanvas (deletedAt)
- ConversationSummary (deletedAt)
- SupportTicket (deletedAt)
- SupportTicketMessage (deletedAt)
```

### RLS Policy Pattern

All SELECT queries automatically filter soft-deleted records:

```sql
CREATE POLICY "user_select" ON "TableName"
FOR SELECT TO authenticated
USING (
  "userId" = auth.uid()::text
  AND "deletedAt" IS NULL
);
```

## Data Deletion Process

### User-Initiated Deletion

1. User requests account deletion via Settings > Delete Account
2. System performs soft delete on:
   - User record
   - All associated chats
   - All messages within those chats
   - All documents created by user
   - All votes and reactions
3. Audit log entry created for compliance
4. Data remains soft-deleted for 30 days (recovery window)
5. Hard delete cron job removes data after 30 days

### Automated Cleanup (Planned)

A cron job should run daily to hard-delete records where:

```sql
WHERE "deletedAt" IS NOT NULL
  AND "deletedAt" < NOW() - INTERVAL '30 days'
```

**Status:** Not yet implemented. See TODO below.

## Data Export (GDPR Right to Portability)

Users can export all their data via Settings > Export Data:

- Profile information
- All chat sessions (including soft-deleted)
- All messages
- All documents
- Reactions and votes
- Analytics data
- Strategy canvases
- Conversation summaries

Export format: JSON file download

## Compliance

### GDPR (EU)

- Right to Access: Data export available
- Right to Rectification: Profile editing available
- Right to Erasure: Account deletion available
- Right to Portability: JSON export available
- Data minimization: Only essential data collected

### CCPA (California)

- Right to Know: Data export available
- Right to Delete: Account deletion available
- Right to Opt-Out: No data selling occurs
- Non-Discrimination: Equal service regardless of privacy choices

## TODO

1. **Implement hard delete cron job** - Create `/api/cron/cleanup-deleted-data` to permanently remove soft-deleted records older than 30 days

2. **Implement analytics cleanup** - Remove UserAnalytics records older than 2 years

3. **Add data retention dashboard** - Admin view of data retention metrics

## Contact

For data retention inquiries: ai.bossbrainz@aleccimedia.com

For data deletion requests: Use in-app account deletion or contact support
