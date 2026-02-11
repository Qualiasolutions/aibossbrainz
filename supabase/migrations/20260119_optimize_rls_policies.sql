-- Migration: Optimize RLS policies for SupportTicket tables
-- Date: 2026-01-19
-- Description: Fix auth.uid() re-evaluation per row using STABLE helper functions
-- Issue: Supabase linter advisory 0003_auth_rls_initplan

-- Helper function: Get current user ID (evaluated once per query)
CREATE OR REPLACE FUNCTION get_my_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (SELECT auth.uid())::text;
$$;

-- Helper function: Check if user owns a ticket
CREATE OR REPLACE FUNCTION user_owns_ticket(ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "SupportTicket"
    WHERE id = ticket_id
    AND "userId" = get_my_user_id()
  );
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "ticket_select_own" ON "SupportTicket";
DROP POLICY IF EXISTS "ticket_insert_own" ON "SupportTicket";
DROP POLICY IF EXISTS "ticket_update_own" ON "SupportTicket";
DROP POLICY IF EXISTS "message_select_own" ON "SupportTicketMessage";
DROP POLICY IF EXISTS "message_insert_own" ON "SupportTicketMessage";

-- SupportTicket policies using helper function
CREATE POLICY "ticket_select_own" ON "SupportTicket"
FOR SELECT TO authenticated
USING (
    "userId" = get_my_user_id()
    OR is_current_user_admin()
);

CREATE POLICY "ticket_insert_own" ON "SupportTicket"
FOR INSERT TO authenticated
WITH CHECK (
    "userId" = get_my_user_id()
);

CREATE POLICY "ticket_update_own" ON "SupportTicket"
FOR UPDATE TO authenticated
USING (
    "userId" = get_my_user_id()
    OR is_current_user_admin()
);

-- SupportTicketMessage policies using helper functions
CREATE POLICY "message_select_own" ON "SupportTicketMessage"
FOR SELECT TO authenticated
USING (
    "senderId" = get_my_user_id()
    OR is_current_user_admin()
    OR ("isInternal" = FALSE AND user_owns_ticket("ticketId"))
);

CREATE POLICY "message_insert_own" ON "SupportTicketMessage"
FOR INSERT TO authenticated
WITH CHECK (
    "senderId" = get_my_user_id()
    AND "isAdminReply" = FALSE
    AND "isInternal" = FALSE
    AND user_owns_ticket("ticketId")
);
