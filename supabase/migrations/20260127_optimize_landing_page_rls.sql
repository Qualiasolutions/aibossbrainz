-- Migration: Optimize LandingPageContent RLS policies
-- Date: 2026-01-27
-- Description: Replaces inline auth checks with STABLE is_current_user_admin() function
-- to resolve 'auth_rls_initplan' linter warnings.

DROP POLICY IF EXISTS "landing_page_content_admin_delete" ON "LandingPageContent";
DROP POLICY IF EXISTS "landing_page_content_admin_insert" ON "LandingPageContent";
DROP POLICY IF EXISTS "landing_page_content_admin_update" ON "LandingPageContent";

CREATE POLICY "landing_page_content_admin_delete" ON "LandingPageContent"
FOR DELETE
USING ( is_current_user_admin() );

CREATE POLICY "landing_page_content_admin_insert" ON "LandingPageContent"
FOR INSERT
WITH CHECK ( is_current_user_admin() );

CREATE POLICY "landing_page_content_admin_update" ON "LandingPageContent"
FOR UPDATE
USING ( is_current_user_admin() )
WITH CHECK ( is_current_user_admin() );
