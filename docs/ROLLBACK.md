# Rollback Procedures

**Last Updated:** 2026-02-09

**Project:** AI Boss Brainz (Alecci Media)
**Production URL:** https://bossbrainz.aleccimedia.com
**Supabase Project:** esymbjpzjjkffpfqukxw

## Overview

This document provides rollback procedures for deployments and database migrations for Boss Brainz.

## Application Rollback (Vercel)

### Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com) > Project > Deployments
2. Find the last known good deployment (green checkmark)
3. Click the three dots menu (...)
4. Select "Promote to Production"
5. Confirm the promotion

This instantly switches production traffic to the previous deployment.

### Via Vercel CLI

```bash
# List recent deployments
vercel ls

# Promote a specific deployment to production
vercel promote <deployment-url>

# Example:
vercel promote ai-bossy-brainz-abc123.vercel.app
```

### Via Git Revert

```bash
# Revert the last commit
git revert HEAD
git push origin master

# Revert multiple commits
git revert HEAD~3..HEAD
git push origin master

# Revert to a specific tag
git checkout v1.1
git checkout -b hotfix/rollback-v1.1
git push origin hotfix/rollback-v1.1
# Then merge via PR
```

## Database Rollback (Supabase)

### Point-in-Time Recovery (PITR)

Available on Pro plan. Restores entire database to a specific point in time.

1. Go to Supabase Dashboard > Project Settings > Backups
2. Click "Restore from backup"
3. Select the timestamp to restore to
4. Confirm restoration

**Warning:** PITR restores the ENTIRE database. All changes after the restore point are lost.

### Migration Rollback

For specific migration rollbacks, create a new migration that reverses the changes.

#### Example: Rollback a column addition

```sql
-- Original migration: add_new_column.sql
ALTER TABLE "User" ADD COLUMN "newField" TEXT;

-- Rollback migration: rollback_add_new_column.sql
ALTER TABLE "User" DROP COLUMN "newField";
```

#### Example: Rollback an index

```sql
-- Original: add_index.sql
CREATE INDEX idx_chat_topic ON "Chat"("topic");

-- Rollback: rollback_add_index.sql
DROP INDEX IF EXISTS idx_chat_topic;
```

#### Example: Rollback RLS policy

```sql
-- Original: add_policy.sql
CREATE POLICY "new_policy" ON "Chat" ...;

-- Rollback: rollback_add_policy.sql
DROP POLICY IF EXISTS "new_policy" ON "Chat";
```

### Data Rollback

For data-only changes (not schema), use soft delete recovery:

```sql
-- Recover soft-deleted records from last 24 hours
UPDATE "Chat"
SET "deletedAt" = NULL
WHERE "deletedAt" > NOW() - INTERVAL '24 hours'
  AND "userId" = 'affected-user-id';
```

## Environment Variable Rollback

### Via Vercel Dashboard

1. Go to Vercel Dashboard > Project > Settings > Environment Variables
2. Find the variable to rollback
3. Edit and restore previous value
4. Redeploy (or wait for next deployment)

### Via Vercel CLI

```bash
# Remove a variable
vercel env rm VARIABLE_NAME production

# Add back the old value
vercel env add VARIABLE_NAME production
# Enter the value when prompted
```

## Emergency Procedures

### Complete Service Outage

1. **Check Vercel Status:** https://www.vercel-status.com/
2. **Check Supabase Status:** https://status.supabase.com/
3. If infrastructure is fine, rollback to last known good deployment
4. If database issue, consider PITR restoration

### Data Corruption

1. **Stop the bleeding:** Pause the Vercel deployment if ongoing writes
2. **Assess damage:** Query affected tables to understand scope
3. **PITR if widespread:** Use point-in-time recovery
4. **Targeted fix if localized:** Write corrective SQL migration

### Security Incident

1. **Rotate secrets immediately:**
   - `AUTH_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENROUTER_API_KEY`
   - `STRIPE_SECRET_KEY`
   - Any compromised keys

2. **Invalidate sessions:**
   ```sql
   -- In Supabase SQL Editor
   DELETE FROM auth.sessions;
   ```

3. **Review audit logs:**
   ```sql
   SELECT * FROM "AuditLog"
   WHERE "createdAt" > NOW() - INTERVAL '24 hours'
   ORDER BY "createdAt" DESC;
   ```

## Recovery Time Objectives (RTO)

| Scenario | Target RTO | Method |
|----------|-----------|--------|
| Bad deployment | < 5 minutes | Vercel rollback |
| Database migration issue | < 15 minutes | Rollback migration |
| Data corruption (localized) | < 30 minutes | Targeted SQL fix |
| Data corruption (widespread) | < 2 hours | PITR restoration |
| Complete outage | < 1 hour | Provider escalation |

## Contacts

- **Vercel Support:** support@vercel.com
- **Supabase Support:** support@supabase.io (Pro plan)
- **Internal:** ai.bossbrainz@aleccimedia.com

## Post-Incident

After any rollback:

1. Document the incident in a post-mortem
2. Identify root cause
3. Create preventive measures
4. Update this document if procedures need improvement
5. Test rollback procedures regularly
