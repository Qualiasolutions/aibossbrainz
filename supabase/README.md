# Supabase Migrations

This directory contains SQL migrations for the Alecci Media AI database.

## Quick Start

**Run these in order in [Supabase SQL Editor](https://supabase.com/dashboard/project/esymbjpzjjkffpfqukxw/sql):**

1. **`01_create_tables.sql`** - Creates all database tables (RUN THIS FIRST!)
2. **`02_enable_rls.sql`** - Enables RLS and creates all security policies

That's it! The tables include soft delete columns already.

## Migrations

### 20260108_rls_policies_fixed.sql (RECOMMENDED)
Enables Row Level Security (RLS) on all tables with comprehensive policies.

| Table | Policies |
|-------|----------|
| User | Users can only view/update their own profile |
| Chat | Users can CRUD own chats, view public chats |
| Message_v2 | Users can access messages in their accessible chats |
| Vote_v2 | Users can vote on messages in accessible chats |
| Document | Users can only access their own documents |
| Suggestion | Users can only access their own suggestions |
| Stream | Users can only access streams for their own chats |
| ExecutiveMemory | Users can only access their own memory |
| MessageReaction | Users can manage their own reactions |
| UserAnalytics | Users can only access their own analytics |

### 20260108_add_soft_delete_columns.sql
Adds `deletedAt` column to support soft delete:
- Chat, Message_v2, Vote_v2, Stream, Document, Suggestion
- Includes indexes for efficient querying
- Updates RLS policies to exclude soft-deleted records

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `esymbjpzjjkffpfqukxw`
3. Navigate to **SQL Editor**
4. Run migrations in order:
   - First: `20260108_add_soft_delete_columns.sql`
   - Then: `20260108_add_rls_policies.sql`

### Option 2: Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref esymbjpzjjkffpfqukxw

# Run migrations
supabase db push
```

### Option 3: Direct SQL (psql)
```bash
# Connect to database
psql "postgresql://postgres:[PASSWORD]@db.esymbjpzjjkffpfqukxw.supabase.co:5432/postgres"

# Run migrations
\i supabase/migrations/20260108_add_soft_delete_columns.sql
\i supabase/migrations/20260108_add_rls_policies.sql
```

## Verification

After applying migrations, verify RLS is enabled:

```sql
-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

## Important Notes

1. **Service Role Bypass**: The service role key automatically bypasses RLS. This is used for server-side operations.

2. **Anon Key Restrictions**: The anon key is subject to all RLS policies. This protects client-side access.

3. **Performance**: Indexes are included for efficient policy evaluation.

4. **Soft Delete**: All SELECT policies filter out `deletedAt IS NOT NULL` records.

## Security Checklist

- [x] RLS enabled on all user data tables
- [x] Users can only access their own data
- [x] Public chats are readable by all authenticated users
- [x] Soft delete support with proper filtering
- [x] Indexes for RLS performance
- [ ] Regular audit of RLS policies

---

## Backup & Recovery

### Supabase Backup Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| **Project ID** | `esymbjpzjjkffpfqukxw` | Production database |
| **Tier** | Pro | Verify in Dashboard |
| **Daily Backups** | Enabled | Automatic, no action needed |
| **Retention** | 7 days | Standard for Pro tier |
| **PITR (Point-in-Time Recovery)** | Available | Must be enabled in Dashboard |

### Verifying Backup Status

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/esymbjpzjjkffpfqukxw/settings/database)
2. Navigate to **Settings** → **Database**
3. Scroll to **Backups** section
4. Confirm daily backups are enabled

### Recovery Procedures

#### Option 1: Restore from Daily Backup
Best for: Complete database restore from a specific date

1. Go to **Settings** → **Database** → **Backups**
2. Select the backup date to restore
3. Click **Restore** and confirm
4. Wait for restore (5-30 minutes depending on size)
5. Verify with health check: `curl https://bossbrainz.aleccimedia.com/api/health`

#### Option 2: Point-in-Time Recovery (PITR)
Best for: Recovering to a specific timestamp (e.g., just before accidental deletion)

1. Go to **Settings** → **Database** → **Point in Time Recovery**
2. Select the exact timestamp to recover to
3. Follow the restore wizard
4. Test critical flows after recovery

#### Option 3: Manual Data Recovery
Best for: Recovering specific records

```sql
-- Restore soft-deleted records
UPDATE "Chat" SET "deletedAt" = NULL WHERE "id" = 'chat-uuid';

-- Check audit logs for what was deleted
SELECT * FROM "AuditLog"
WHERE "action" = 'CHAT_DELETE'
AND "createdAt" > NOW() - INTERVAL '24 hours';
```

### Disaster Recovery Checklist

Before any major deployment:
- [ ] Verify backup was created today in Supabase Dashboard
- [ ] Know the restore procedure (this document)
- [ ] Have rollback plan for Vercel (see ROLLBACK.md)

After a restore:
- [ ] Verify `/api/health` returns healthy
- [ ] Test user login
- [ ] Test creating a new chat
- [ ] Check recent data is present

### Recovery Time Objectives (RTO)

| Scenario | Target RTO | Method |
|----------|------------|--------|
| Accidental data deletion | 15 min | PITR or soft delete restore |
| Database corruption | 1 hour | Daily backup restore |
| Complete service outage | 2 hours | Backup restore + Vercel redeploy |

### Backup Testing

**Quarterly**: Test restore procedure on a staging project
1. Create a new Supabase project (staging)
2. Restore production backup to staging
3. Verify data integrity
4. Delete staging project

---

## New Migrations (2026-01-15)

The following migrations add new tables for audit logging and strategy features:

### 20260115_add_audit_log.sql
Creates `AuditLog` table for GDPR compliance and security auditing.

### 20260115_add_strategy_canvas.sql
Creates `StrategyCanvas` table for user strategy canvases (SWOT, BMC, etc.).

### 20260115_add_conversation_summary.sql
Creates `ConversationSummary` table for AI-generated conversation summaries.

### 20260115_add_rls_policies.sql
Adds RLS policies for the new tables.

**Apply order:**
1. `20260115_add_audit_log.sql`
2. `20260115_add_strategy_canvas.sql`
3. `20260115_add_conversation_summary.sql`
4. `20260115_add_rls_policies.sql`
