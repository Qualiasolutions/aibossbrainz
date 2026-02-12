-- Migration: Add AuditLog table
-- Date: 2026-01-15
-- Description: Creates AuditLog table for tracking sensitive operations (GDPR compliance)

-- Create AuditLog table
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_log_user_created ON "AuditLog"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON "AuditLog"("resource", "resourceId");
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON "AuditLog"("action", "createdAt" DESC);

-- Comment on table
COMMENT ON TABLE "AuditLog" IS 'Tracks sensitive operations for compliance and debugging. Retention: 7 years.';
