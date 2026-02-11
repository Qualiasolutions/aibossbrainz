# Phase 6: Bug Fixes & UX

## Summary
Fix admin panel 404, unpin bug, and email confirmation redirect.

## Tasks

### Task 1: Fix Admin Panel User Details 404 (BUG-01)
**Objective:** Create missing user details page
**Files:**
- CREATE: `app/(admin)/admin/users/[id]/page.tsx`

**Root Cause:** `users-table.tsx` navigates to `/admin/users/${user.id}` but no dynamic route page exists.

**Implementation:**
- Create page component that fetches user by ID
- Display user details (email, company, subscription, dates)
- Include back button to user list

**Verification:**
- Click any user row in admin panel
- User details page loads without 404
- All user info displays correctly

---

### Task 2: Fix Unpin Conversation (BUG-02)
**Objective:** Fix isPinned state sync issue
**Files:**
- MODIFY: `components/sidebar-history-item.tsx`

**Root Cause:** Local `isPinned` state via `useState(chat.isPinned)` doesn't update when SWR cache changes.

**Implementation:**
- Remove local `isPinned` state
- Use `chat.isPinned` directly from props
- Keep optimistic update pattern but ensure SWR revalidation triggers re-render

**Verification:**
- Pin a conversation → appears in PINNED section
- Unpin it → moves back to date-based section
- Refresh page → pin state persists correctly

---

### Task 3: Improve Email Confirmation Redirect (UX-01)
**Objective:** Better post-confirmation experience
**Files:**
- MODIFY: `app/auth/callback/route.ts`

**Implementation:**
- For new users, redirect to `/subscribe?welcome=true`
- Subscribe page can show welcome message when param present

**Verification:**
- Sign up with new email
- Click confirmation link
- Land on subscribe page with welcoming context

---

## Execution
All tasks can be done sequentially in one session.
