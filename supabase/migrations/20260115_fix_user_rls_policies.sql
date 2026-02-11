-- ============================================
-- FIX USER TABLE RLS POLICIES
-- Date: 2026-01-15
--
-- Fixes:
-- 1. Multiple permissive policies for same role/action
-- 2. auth.uid() re-evaluated per row (use subquery instead)
--
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop ALL existing policies on User table to eliminate duplicates
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'User'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON "User"', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- RECREATE USER TABLE POLICIES (OPTIMIZED)
-- Using (select auth.uid()) to evaluate once per query, not per row
-- ============================================

CREATE POLICY "user_select"
ON "User" FOR SELECT
TO authenticated
USING ((select auth.uid())::text = id);

CREATE POLICY "user_insert"
ON "User" FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid())::text = id);

CREATE POLICY "user_update"
ON "User" FOR UPDATE
TO authenticated
USING ((select auth.uid())::text = id)
WITH CHECK ((select auth.uid())::text = id);

-- Note: No DELETE policy - users cannot delete their own account via RLS
-- Account deletion should be handled via admin/service role
