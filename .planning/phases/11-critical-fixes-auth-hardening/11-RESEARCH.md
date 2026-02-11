# Phase 11: Critical Fixes & Auth Hardening - Research

**Researched:** 2026-02-11
**Domain:** Next.js Auth Actions, Vercel AI SDK 5.x Error Handling, shadcn/ui Components
**Confidence:** HIGH

## Summary

This phase addresses six requirements across two plans: auth rate limiting fixes + password UX (11-01), and chat error handling + conversation loading (11-02). Research confirms all four bugs exist exactly as described and identifies root causes with clear fix paths.

The auth bugs (BUG-01) are simple variable name mismatches in `app/(auth)/actions.ts` -- `requestHeaders` declared but `headersList` used. The password min length (AUTH-02) is hardcoded as 6 in Zod schemas but UI text says 8. The chat error bugs (BUG-02, BUG-03) stem from the Vercel AI SDK 5.x `useChat` hook's `status` going to `"error"` on failure and never being cleared because `clearError()` is never called. BUG-04 needs closer investigation during implementation but may be related to the error boundary catching rendering errors silently.

**Primary recommendation:** Fix BUG-01 and AUTH-02 first (trivial one-line changes), then build the `PasswordInput` component (AUTH-01), then handle the chat error flow (BUG-02, BUG-03, BUG-04) which requires coordinated changes across `chat.tsx`, `multimodal-input.tsx`, and the chat API route.

## Standard Stack

### Core (Already Installed -- No New Dependencies)
| Library | Version | Purpose | Relevance |
|---------|---------|---------|-----------|
| `ai` | 5.0.118 | Vercel AI SDK - `useChat`, `ChatStatus`, `clearError` | BUG-02, BUG-03 |
| `@ai-sdk/react` | 2.0.120 | React hooks for AI SDK | BUG-02, BUG-03 |
| `zod` | (installed) | Schema validation for auth forms | AUTH-02 |
| `lucide-react` | (installed) | `Eye` and `EyeOff` icons for password toggle | AUTH-01 |
| `next` | 15.6+ | Server actions, App Router | BUG-01 |
| shadcn/ui `Input` | (installed) | Base input component at `components/ui/input.tsx` | AUTH-01 |

### No New Libraries Needed
This phase requires zero new dependencies. All functionality is achievable with existing installed packages.

## Architecture Patterns

### Pattern 1: Auth Actions Bug Fix (BUG-01)
**What:** Variable name mismatch -- `requestHeaders` declared, `headersList` used
**Where:** `app/(auth)/actions.ts` lines 108-113 (signup) and 176-181 (requestPasswordReset)
**Fix:** Change `headersList` to `requestHeaders` on lines 110-112 and 178-180

**Current broken code (signup, line 108-113):**
```typescript
const requestHeaders = await headers();  // declared as requestHeaders
const ip =
  headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||  // BUG: headersList undefined
  headersList.get("x-real-ip") ||
  headersList.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
  "unknown";
```

**Working code (login, line 63-68 -- reference pattern):**
```typescript
const headersList = await headers();
const ip =
  headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  headersList.get("x-real-ip") ||
  headersList.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
  "unknown";
```

**Fix approach:** Rename `requestHeaders` to `headersList` (matching the login function pattern) on lines 108 and 176.

### Pattern 2: Password Min Length Fix (AUTH-02)
**What:** Zod schemas enforce min 6, UI text says 8
**Where:** `app/(auth)/actions.ts` lines 10 and 18-19
**Fix:** Change `.min(6)` to `.min(8)` in both schemas

**Current code:**
```typescript
// Line 10
const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),  // BUG: should be min(8)
});

// Lines 17-20
const passwordResetSchema = z.object({
  password: z.string().min(6),        // BUG: should be min(8)
  confirmPassword: z.string().min(6), // BUG: should be min(8)
});
```

**Also fix:** `reset-password/page.tsx` line 206 has `minLength={6}` on the confirmPassword input (the password field correctly has `minLength={8}` on line 189).

**Also fix:** `signup/page.tsx` line 60 toast says "min 6 characters" -- update to "min 8 characters".

### Pattern 3: Password Toggle Component (AUTH-01)
**What:** Create a `PasswordInput` component wrapping shadcn `Input` with show/hide toggle
**Where:** New component `components/password-input.tsx`, used in `components/auth-form.tsx` and `app/(auth)/reset-password/page.tsx`

**Implementation pattern:**
```typescript
// components/password-input.tsx
"use client";
import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className="relative">
      <Input
        type={showPassword ? "text" : "password"}
        className={cn("pr-10", className)}
        ref={ref}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-stone-400 hover:text-stone-600"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? (
          <EyeOff className="size-4" />
        ) : (
          <Eye className="size-4" />
        )}
      </Button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";
export { PasswordInput };
```

**Usage locations:**
1. `components/auth-form.tsx` -- replace the password `<Input>` (line 48-55)
2. `app/(auth)/reset-password/page.tsx` -- replace both password `<Input>` elements (lines 180-189 and 199-208)

### Pattern 4: Chat Error Recovery (BUG-02, BUG-03)
**What:** When AI generation fails, user sees raw error and cannot send new messages
**Root cause:** Vercel AI SDK 5.x `useChat` hook sets `status` to `"error"` on failure. The `clearError()` method is never called, so status stays at `"error"`. The `multimodal-input.tsx` blocks submission when `status !== "ready"`.

**AI SDK ChatStatus type (from `node_modules/ai/dist/index.d.ts:4071`):**
```typescript
type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';
```

**The `clearError()` method (from AI SDK docs, line 4218-4220):**
```typescript
/**
 * Clear the error state and set the status to ready if the chat is in an error state.
 */
clearError: () => void;
```

**Fix approach for BUG-03 (user can create new threads):**
- Destructure `clearError` from `useChat` in `components/chat.tsx`
- Call `clearError()` in the `onError` handler after showing the toast
- This resets status from `"error"` back to `"ready"`, allowing new messages

**Fix approach for BUG-02 (user-friendly error messages):**
- In `onError` handler, handle BOTH `ChatSDKError` and generic errors
- For generic errors (non-ChatSDKError), show a clear retry message like "Something went wrong generating a response. Please try again."
- The server-side `onError` in the chat route (line 468-471) returns `"Oops, an error occurred!"` which is what the client sees for stream errors. This should be improved to a proper user-friendly message.

**Current onError in chat.tsx:**
```typescript
onError: (error) => {
  if (error instanceof ChatSDKError) {
    // ... handles ChatSDKError only
  }
  // BUG: non-ChatSDKError errors are silently ignored!
},
```

**Fixed pattern:**
```typescript
onError: (error) => {
  if (error instanceof ChatSDKError) {
    if (lastSentMessage) {
      const text = lastSentMessage.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("");
      setInput(text);
    }
    toast({
      type: "error",
      description: `${error.message} Your message has been restored in the input field.`,
    });
  } else {
    // Handle generic stream errors (BUG-02)
    if (lastSentMessage) {
      const text = lastSentMessage.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("");
      setInput(text);
    }
    toast({
      type: "error",
      description: "Something went wrong generating a response. Your message has been restored — please try again.",
    });
  }
  setLastSentMessage(null);
  clearError(); // BUG-03 fix: reset status to "ready"
},
```

### Pattern 5: Conversation Loading Fix (BUG-04)
**What:** Returning to a previous chat shows blank screen / missing content
**Investigation findings:**

The chat page (`app/(chat)/chat/[id]/page.tsx`) correctly fetches ALL messages without a limit parameter (line 48-49). The `convertToUIMessages` function properly converts DB messages to UI format. The `ChatWithErrorBoundary` component wraps `Chat` in an error boundary.

**Potential causes identified:**
1. The `autoResume` is set to `true` on existing chats (line 69/86). If the last message was from a user (indicating an interrupted stream), `useAutoResume` calls `resumeStream()`. If the stream context is gone (no Redis, disabled resumable streams), this could cause an error that gets caught by the error boundary, showing the fallback UI instead of messages.
2. The resumable stream context is currently commented out (chat route lines 474-482), but `autoResume={true}` is still passed. If `resumeStream()` throws when there's no active stream, it could blank the screen.
3. The `useChat` hook receives `initialMessages` but if there's a hydration mismatch or state reset, messages could be lost.

**Fix approach:**
- Add error handling around `resumeStream()` in `useAutoResume` hook
- Ensure the error boundary doesn't catch recoverable errors that blank the whole chat
- Test: navigate to existing chat -> verify messages load -> navigate away -> navigate back -> verify messages still load

### Anti-Patterns to Avoid
- **Don't create a custom status management layer:** Use the AI SDK's built-in `clearError()` method, not a wrapper
- **Don't modify the `Input` component globally:** Create a separate `PasswordInput` component that wraps `Input`
- **Don't suppress errors silently:** Always show user-friendly messages for ALL error types
- **Don't break the existing error boundary:** The `ChatErrorBoundary` is a safety net; fix the root cause of BUG-04 rather than removing it

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password toggle | Custom visibility state + raw HTML | `PasswordInput` component wrapping shadcn `Input` | Consistent with existing UI patterns, accessible |
| Error recovery | Custom status management | `useChat` built-in `clearError()` | AI SDK already handles this; v5.0.118 confirmed has `clearError()` |
| Error messages | Hard-coded error strings | `ChatSDKError` message system in `lib/errors.ts` | Already has a structured error message system |
| Rate limiting | Custom implementation | Existing `checkAuthRateLimit` + `checkRateLimit` | Already built and working (just wrong variable name) |

## Common Pitfalls

### Pitfall 1: Auth Rate Limiting Silently Fails
**What goes wrong:** `signup` and `requestPasswordReset` throw a ReferenceError because `headersList` is undefined (should be `requestHeaders`). The catch block returns a generic `"failed"` status, so users see "Something went wrong" but the real issue is the rate limiter never runs.
**Why it happens:** Copy-paste error -- the login function uses `headersList`, but signup/reset were refactored to use `requestHeaders` without updating all references.
**How to avoid:** After fixing, test each auth action in isolation. Verify the rate limiter actually executes by checking logs.
**Warning signs:** Any auth action that immediately returns "failed" without a Supabase error in logs.

### Pitfall 2: useChat Status Stuck at "error"
**What goes wrong:** After a generation error, the chat's `status` is `"error"` and the submit button is disabled. The user cannot send new messages in the same chat or (if navigating to `/new`) the error state may persist.
**Why it happens:** AI SDK 5.x `useChat` has a `clearError()` method that must be explicitly called to transition from `"error"` back to `"ready"`. The codebase never calls it.
**How to avoid:** Always call `clearError()` at the end of the `onError` handler. The `multimodal-input.tsx` checks `status !== "ready"` to disable the submit button.
**Warning signs:** Submit button stays disabled after an error toast.

### Pitfall 3: Password Min Length Inconsistency
**What goes wrong:** The UI says "min 8 characters" but the Zod schema accepts 6. A user could enter a 6-7 character password that passes Zod validation but gets rejected by Supabase (if Supabase has stricter requirements), or worse, passes and creates a weak-password account.
**Why it happens:** The schema was written first with 6, then the UI was updated to say 8 without updating the schema.
**How to avoid:** Single source of truth -- define the minimum in one place (the Zod schema) and reference it in UI text.

### Pitfall 4: Non-ChatSDKError Errors Silently Dropped
**What goes wrong:** The `onError` handler in `chat.tsx` only handles `ChatSDKError` instances. Network errors, JSON parse failures, or other runtime errors during streaming are NOT caught, leaving the user with no feedback.
**Why it happens:** The error handler was written assuming all errors would be `ChatSDKError`, but stream errors can be generic `Error` instances.
**How to avoid:** Add an `else` branch in `onError` that handles generic errors with a user-friendly message.

### Pitfall 5: autoResume on Chats with No Active Stream
**What goes wrong:** `autoResume={true}` triggers `resumeStream()` when the last message is from a user. If the original stream has ended (server completed or errored), `resumeStream()` may fail silently or throw, potentially causing a blank screen.
**Why it happens:** Resumable streams are currently disabled (commented out in chat route), but `autoResume` is still enabled on the chat page.
**How to avoid:** Wrap `resumeStream()` calls in try/catch. Consider setting `autoResume` based on whether resumable streams are actually enabled.

## Code Examples

### Example 1: Fixing the Variable Name Mismatch (BUG-01)

**File:** `app/(auth)/actions.ts`

For the `signup` function (lines 108-113), change:
```typescript
const requestHeaders = await headers();
```
to:
```typescript
const headersList = await headers();
```

Same fix for `requestPasswordReset` (lines 176-178).

### Example 2: Fixing Password Min Length (AUTH-02)

**File:** `app/(auth)/actions.ts`

```typescript
// Line 10: Change min(6) to min(8)
const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Lines 17-20: Change both min(6) to min(8)
const passwordResetSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
});
```

**File:** `app/(auth)/reset-password/page.tsx` line 206:
```typescript
// Change minLength={6} to minLength={8}
minLength={8}
```

**File:** `app/(auth)/signup/page.tsx` line 60:
```typescript
// Change "min 6 characters" to "min 8 characters"
description: "Please enter a valid email and password (min 8 characters).",
```

### Example 3: Using clearError for Error Recovery (BUG-03)

**File:** `components/chat.tsx`

```typescript
// Destructure clearError from useChat
const {
  messages,
  setMessages,
  sendMessage: originalSendMessage,
  status,
  stop,
  regenerate,
  resumeStream,
  clearError,  // ADD THIS
} = useChat<ChatMessage>({
  // ... existing config
  onError: (error) => {
    // Handle both ChatSDKError and generic errors
    if (lastSentMessage) {
      const text = lastSentMessage.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("");
      setInput(text);
    }

    if (error instanceof ChatSDKError) {
      toast({
        type: "error",
        description: `${error.message} Your message has been restored in the input field.`,
      });
    } else {
      toast({
        type: "error",
        description: "Something went wrong generating a response. Your message has been restored — please try again.",
      });
    }

    setLastSentMessage(null);
    clearError(); // Reset status from "error" to "ready"
  },
});
```

### Example 4: PasswordInput Component (AUTH-01)

See Architecture Patterns > Pattern 3 above for the full component code.

**Usage in auth-form.tsx:**
```typescript
import { PasswordInput } from "./password-input";

// Replace:
<Input type="password" ... />
// With:
<PasswordInput ... />
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useChat` without `clearError` | `useChat` with `clearError()` for error recovery | AI SDK 5.x (2025) | Must call `clearError()` to recover from error state |
| `status: "idle" \| "loading"` | `status: "ready" \| "submitted" \| "streaming" \| "error"` | AI SDK 5.x (2025) | Four-state status replaces two-state, "error" is now explicit |
| `isLoading` boolean | `status` enum | AI SDK 5.x (2025) | Old `isLoading` is gone, replaced by `status` |

## File Map (All Files to Modify)

### Plan 11-01: Auth Rate Limiting + Password UX
| File | Changes |
|------|---------|
| `app/(auth)/actions.ts` | Fix `headersList` variable (lines 108, 176), fix min length (lines 10, 18, 19) |
| `components/password-input.tsx` | **NEW** -- Password input with show/hide toggle |
| `components/auth-form.tsx` | Use `PasswordInput` instead of `Input` for password field |
| `app/(auth)/reset-password/page.tsx` | Use `PasswordInput`, fix `minLength={6}` to `minLength={8}` on confirmPassword |
| `app/(auth)/signup/page.tsx` | Update error toast text from "min 6" to "min 8" |

### Plan 11-02: Chat Error Handling + Conversation Loading
| File | Changes |
|------|---------|
| `components/chat.tsx` | Destructure `clearError`, handle all error types in `onError`, call `clearError()` |
| `app/(chat)/api/chat/route.ts` | Improve `onError` return message (line 469) |
| `hooks/use-auto-resume.ts` | Add try/catch around `resumeStream()` call |
| `components/multimodal-input.tsx` | No changes needed -- `status !== "ready"` check will work correctly once `clearError()` is called |

## Open Questions

1. **BUG-04 Root Cause Needs Runtime Testing**
   - What we know: The chat page fetches all messages and passes them correctly. The error boundary exists but should only catch React render errors.
   - What's unclear: Whether the blank screen is caused by `autoResume`/`resumeStream` failing, a hydration mismatch, or something else entirely.
   - Recommendation: Add error handling to `useAutoResume` first, then test in dev. If blank screen persists, add console logging to trace the issue.

2. **Should autoResume Be Disabled?**
   - What we know: Resumable streams are commented out in the chat route. `autoResume={true}` still triggers `resumeStream()`.
   - What's unclear: Whether `resumeStream()` gracefully no-ops when there's no active stream, or throws.
   - Recommendation: Wrap in try/catch and log. If resumable streams are truly disabled, consider setting `autoResume={false}` on existing chat pages.

## Sources

### Primary (HIGH confidence)
- `app/(auth)/actions.ts` -- Direct file read confirming BUG-01 (lines 108-113, 176-181), AUTH-02 (lines 10, 18-19)
- `components/chat.tsx` -- Direct file read confirming `clearError` is never used, `onError` only handles `ChatSDKError`
- `node_modules/ai/dist/index.d.ts:4071` -- `ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error'`
- `node_modules/ai/dist/index.d.ts:4218-4220` -- `clearError()` method documentation
- `components/multimodal-input.tsx:271` -- `status !== "ready"` blocks submission
- `components/ui/input.tsx` -- Current shadcn Input component structure
- `lucide-react` -- Confirmed `Eye` and `EyeOff` icons available (verified via require)

### Secondary (MEDIUM confidence)
- `app/(chat)/chat/[id]/page.tsx` -- Chat page loads messages without limit, passes to Chat component
- `hooks/use-auto-resume.ts` -- `resumeStream()` called when last message is from user
- `app/(chat)/api/chat/route.ts:468-471` -- Server-side `onError` returns raw string

## Metadata

**Confidence breakdown:**
- Auth bugs (BUG-01, AUTH-02): HIGH -- Direct file inspection, bugs are obvious variable/value mismatches
- Password toggle (AUTH-01): HIGH -- Standard pattern, all dependencies already installed
- Chat error handling (BUG-02, BUG-03): HIGH -- AI SDK types confirmed, `clearError()` method verified in installed version
- Conversation loading (BUG-04): MEDIUM -- Root cause hypothesized but needs runtime verification
- Architecture patterns: HIGH -- Based on codebase patterns and AI SDK 5.x API

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days -- stable libraries, no expected breaking changes)
