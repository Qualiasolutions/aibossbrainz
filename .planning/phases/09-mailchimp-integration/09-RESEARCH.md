# Phase 9: Mailchimp Integration - Research

**Researched:** 2026-02-02
**Domain:** Mailchimp Marketing API / Node.js Email Marketing Integration
**Confidence:** HIGH

## Summary

This research covers integrating the AI Boss Brainz platform with Mailchimp Marketing API to tag trial signups and paid conversions for email automation. The integration is straightforward using the official `@mailchimp/mailchimp_marketing` npm package.

The standard approach involves:
1. Creating a Mailchimp client module similar to existing email/Stripe patterns in the codebase
2. Using the subscriber hash (MD5 of lowercase email) to identify contacts
3. Calling the tags endpoint to add tags when: (a) trial starts via Stripe webhook, (b) payment completes via Stripe webhook
4. Implementing strict error handling with admin notification via Resend

**Primary recommendation:** Use `@mailchimp/mailchimp_marketing` with `@types/mailchimp__mailchimp_marketing` for TypeScript support. Follow the existing pattern in `lib/email/` for client initialization and error handling.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mailchimp/mailchimp_marketing` | 3.0.x | Official Mailchimp Marketing API client | Official, maintained by Mailchimp, auto-generated from OpenAPI spec |
| `@types/mailchimp__mailchimp_marketing` | 3.0.x | TypeScript definitions | DefinitelyTyped package, community-maintained types |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `crypto` (Node built-in) | - | MD5 hash for subscriber_hash | Always - Mailchimp requires MD5 of lowercase email |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Official SDK | Direct HTTP calls via fetch | More control but lose type safety and automatic retries |
| Official SDK | `node-mailchimp` (community) | Unofficial, less maintained, no TypeScript |

**Installation:**
```bash
pnpm add @mailchimp/mailchimp_marketing
pnpm add -D @types/mailchimp__mailchimp_marketing
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── mailchimp/
│   ├── client.ts        # Mailchimp client initialization (lazy, like Stripe)
│   ├── tags.ts          # Tag operations: applyTrialTag, applyPaidTag
│   └── errors.ts        # Mailchimp-specific error handling
├── email/               # (existing) - add admin notification helper
│   └── admin-notifications.ts  # Generic admin alerts via Resend
```

### Pattern 1: Lazy Client Initialization
**What:** Initialize Mailchimp client on first use, not at import time
**When to use:** Always - prevents build-time errors when API key isn't set
**Example:**
```typescript
// Source: Pattern from lib/stripe/config.ts and lib/email/support-notifications.ts
import mailchimp from "@mailchimp/mailchimp_marketing";

let isConfigured = false;

function getMailchimpClient(): typeof mailchimp | null {
  if (!process.env.MAILCHIMP_API_KEY || !process.env.MAILCHIMP_SERVER_PREFIX) {
    return null;
  }

  if (!isConfigured) {
    mailchimp.setConfig({
      apiKey: process.env.MAILCHIMP_API_KEY,
      server: process.env.MAILCHIMP_SERVER_PREFIX, // e.g., "us5"
    });
    isConfigured = true;
  }

  return mailchimp;
}
```

### Pattern 2: Subscriber Hash Calculation
**What:** Mailchimp identifies contacts by MD5 hash of lowercase email
**When to use:** Every API call that references a contact
**Example:**
```typescript
// Source: https://mailchimp.com/developer/marketing/api/list-member-tags/
import { createHash } from "node:crypto";

function getSubscriberHash(email: string): string {
  return createHash("md5")
    .update(email.toLowerCase())
    .digest("hex");
}
```

### Pattern 3: Tag Application
**What:** Add tags to existing or new contacts
**When to use:** After trial starts or payment completes
**Example:**
```typescript
// Source: https://mailchimp.com/developer/marketing/api/list-member-tags/add-or-remove-member-tags/
async function applyTag(email: string, tagName: string): Promise<void> {
  const client = getMailchimpClient();
  if (!client) throw new Error("Mailchimp not configured");

  const subscriberHash = getSubscriberHash(email);
  const listId = process.env.MAILCHIMP_AUDIENCE_ID!;

  await client.lists.updateListMemberTags(listId, subscriberHash, {
    tags: [{ name: tagName, status: "active" }],
  });
}
```

### Pattern 4: Ensure Contact Exists Before Tagging
**What:** Use setListMember (upsert) to ensure contact exists, then tag
**When to use:** When contact may not exist in Mailchimp yet
**Example:**
```typescript
// Source: https://mailchimp.com/developer/marketing/api/list-members/add-or-update-list-member/
async function ensureContactAndTag(email: string, tagName: string): Promise<void> {
  const client = getMailchimpClient();
  if (!client) throw new Error("Mailchimp not configured");

  const subscriberHash = getSubscriberHash(email);
  const listId = process.env.MAILCHIMP_AUDIENCE_ID!;

  // Upsert contact (add if not exists, update if exists)
  await client.lists.setListMember(listId, subscriberHash, {
    email_address: email,
    status_if_new: "subscribed", // Only sets status for NEW contacts
  });

  // Apply tag
  await client.lists.updateListMemberTags(listId, subscriberHash, {
    tags: [{ name: tagName, status: "active" }],
  });
}
```

### Anti-Patterns to Avoid
- **Creating contacts without consent:** Never add email to Mailchimp without email verification (CONTEXT.md specifies: tag after email verification only)
- **Hardcoding tag IDs:** Use tag names, not IDs - Mailchimp creates tags if they don't exist
- **Silently failing:** CONTEXT.md requires blocking user action on Mailchimp failure
- **Polling for contact status:** Use webhooks or fire-and-forget patterns

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MD5 hashing | Custom hash function | `crypto.createHash('md5')` | Node.js built-in, battle-tested |
| API client | Raw fetch/axios calls | `@mailchimp/mailchimp_marketing` | Handles auth, retries, error parsing |
| Rate limiting | Custom queue system | Mailchimp's built-in limits | 10 concurrent connections is rarely hit for tag operations |
| Email validation | Regex | Rely on Supabase Auth | User already verified email through auth flow |

**Key insight:** Mailchimp's API is simple for tagging operations. The complexity is in error handling and integration points, not API mechanics.

## Common Pitfalls

### Pitfall 1: Wrong Server Prefix
**What goes wrong:** API calls fail with 401 or DNS errors
**Why it happens:** API key format is `apikey-dc` but only `dc` part goes in server config
**How to avoid:** Extract datacenter from API key or store separately
**Warning signs:** "Invalid API key" errors when key is correct

```typescript
// Example: API key is "abc123-us5"
// WRONG: server: "abc123-us5"
// RIGHT: server: "us5"
```

### Pitfall 2: Case-Sensitive Email Hash
**What goes wrong:** Contact not found or duplicate contacts created
**Why it happens:** MD5 hash differs for "User@Email.com" vs "user@email.com"
**How to avoid:** Always lowercase email before hashing
**Warning signs:** "Member not found" errors for existing contacts

### Pitfall 3: Tag Status Typos
**What goes wrong:** Tags not applied
**Why it happens:** Status must be exactly "active" or "inactive"
**How to avoid:** Use constants or enums
**Warning signs:** No errors but tags don't appear in Mailchimp

### Pitfall 4: Blocking on Non-Critical Path
**What goes wrong:** User signup fails because Mailchimp is down
**Why it happens:** Not distinguishing critical vs non-critical errors
**How to avoid:** CONTEXT.md says block on failure, but implement retries first. Consider async queue for backfill.
**Warning signs:** Increased support tickets when Mailchimp has issues

### Pitfall 5: Missing Contact Before Tagging
**What goes wrong:** 404 errors when applying tags
**Why it happens:** Trying to tag contact that doesn't exist in list
**How to avoid:** Use `setListMember` (upsert) before tagging, or combine in one call
**Warning signs:** "Resource not found" errors on tag endpoints

## Code Examples

Verified patterns for this integration:

### Initialize Mailchimp Client
```typescript
// lib/mailchimp/client.ts
// Source: https://github.com/mailchimp/mailchimp-marketing-node
import mailchimp from "@mailchimp/mailchimp_marketing";

let isConfigured = false;

export function getMailchimpClient(): typeof mailchimp | null {
  if (!process.env.MAILCHIMP_API_KEY || !process.env.MAILCHIMP_SERVER_PREFIX) {
    console.warn("[Mailchimp] API key or server prefix not configured");
    return null;
  }

  if (!isConfigured) {
    mailchimp.setConfig({
      apiKey: process.env.MAILCHIMP_API_KEY,
      server: process.env.MAILCHIMP_SERVER_PREFIX,
    });
    isConfigured = true;
  }

  return mailchimp;
}

export const MAILCHIMP_TAGS = {
  TRIAL: "7-Day Free Trial: AI Boss Brainz",  // ID: 4120497
  PAID_MONTHLY: "AI Boss Brainz Monthly",      // ID: 4120473
  PAID_ANNUAL_OR_LIFETIME: "AI Boss Brainz Full", // ID: 4120472
} as const;

export const MAILCHIMP_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID || "d5fc73df51";
```

### Apply Trial Tag
```typescript
// lib/mailchimp/tags.ts
// Source: https://mailchimp.com/developer/marketing/api/list-member-tags/add-or-remove-member-tags/
import { createHash } from "node:crypto";
import { getMailchimpClient, MAILCHIMP_TAGS, MAILCHIMP_AUDIENCE_ID } from "./client";
import { sendAdminNotification } from "../email/admin-notifications";

function getSubscriberHash(email: string): string {
  return createHash("md5").update(email.toLowerCase()).digest("hex");
}

export async function applyTrialTag(email: string): Promise<{ success: boolean; error?: string }> {
  const client = getMailchimpClient();
  if (!client) {
    return { success: false, error: "Mailchimp not configured" };
  }

  const subscriberHash = getSubscriberHash(email);

  try {
    // Upsert contact first to ensure they exist
    await client.lists.setListMember(MAILCHIMP_AUDIENCE_ID, subscriberHash, {
      email_address: email,
      status_if_new: "subscribed",
    });

    // Apply trial tag
    await client.lists.updateListMemberTags(MAILCHIMP_AUDIENCE_ID, subscriberHash, {
      tags: [{ name: MAILCHIMP_TAGS.TRIAL, status: "active" }],
    });

    console.log(`[Mailchimp] Applied trial tag to ${email}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Mailchimp] Failed to apply trial tag:`, error);

    // Notify admin of failure
    await sendAdminNotification({
      subject: "Mailchimp Trial Tag Failed",
      message: `Failed to apply trial tag for ${email}: ${errorMessage}`,
    });

    return { success: false, error: errorMessage };
  }
}
```

### Apply Paid Tag
```typescript
// lib/mailchimp/tags.ts (continued)
export async function applyPaidTag(
  email: string,
  subscriptionType: "monthly" | "annual" | "lifetime"
): Promise<{ success: boolean; error?: string }> {
  const client = getMailchimpClient();
  if (!client) {
    return { success: false, error: "Mailchimp not configured" };
  }

  const subscriberHash = getSubscriberHash(email);
  const tagName = subscriptionType === "monthly"
    ? MAILCHIMP_TAGS.PAID_MONTHLY
    : MAILCHIMP_TAGS.PAID_ANNUAL_OR_LIFETIME;

  try {
    // Ensure contact exists
    await client.lists.setListMember(MAILCHIMP_AUDIENCE_ID, subscriberHash, {
      email_address: email,
      status_if_new: "subscribed",
    });

    // Apply paid tag (keep trial tag for journey tracking per CONTEXT.md)
    await client.lists.updateListMemberTags(MAILCHIMP_AUDIENCE_ID, subscriberHash, {
      tags: [{ name: tagName, status: "active" }],
    });

    console.log(`[Mailchimp] Applied ${tagName} tag to ${email}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Mailchimp] Failed to apply paid tag:`, error);

    await sendAdminNotification({
      subject: "Mailchimp Paid Tag Failed",
      message: `Failed to apply ${tagName} tag for ${email}: ${errorMessage}`,
    });

    return { success: false, error: errorMessage };
  }
}
```

### Admin Notification Helper
```typescript
// lib/email/admin-notifications.ts
// Follows pattern from lib/email/support-notifications.ts
import { Resend } from "resend";

const ADMIN_EMAIL = "info@qualiasolutions.net";

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Alecci Media AI <noreply@resend.dev>";

export async function sendAdminNotification({
  subject,
  message,
}: {
  subject: string;
  message: string;
}): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured, skipping admin notification");
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject: `[Alert] ${subject}`,
      html: `<p>${message.replace(/\n/g, "<br />")}</p>`,
    });
  } catch (error) {
    console.error("[Email] Failed to send admin notification:", error);
  }
}
```

### Integration in Stripe Webhook
```typescript
// app/api/stripe/webhook/route.ts (additions)
// Add to case "customer.subscription.created" after startTrial():

import { applyTrialTag } from "@/lib/mailchimp/tags";

// Inside webhook handler, after successful trial start:
if (profile?.email) {
  const mailchimpResult = await applyTrialTag(profile.email);
  if (!mailchimpResult.success) {
    // Per CONTEXT.md: block user action on Mailchimp failure
    console.error(`[Stripe Webhook] Mailchimp tagging failed, blocking: ${mailchimpResult.error}`);
    return NextResponse.json(
      { error: "Failed to complete signup - please try again" },
      { status: 500 }
    );
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API v2.0 | API v3.0 | June 2023 | v2.0 retired, must use v3.0 |
| Direct HTTP calls | Official SDK | 2020+ | SDK provides better DX, error handling |
| Sync operations | Async with retries | Always | Improves reliability |

**Deprecated/outdated:**
- Mailchimp API v2.0: Retired June 2023, use v3.0
- `node-mailchimp` package: Community package, not official
- Export API 1.0: Retired, use Marketing API

## Open Questions

Things that couldn't be fully resolved:

1. **Backfill Strategy**
   - What we know: Need to tag existing verified trial users on deploy
   - What's unclear: How many users? Should run as migration script or one-time admin action?
   - Recommendation: Create admin endpoint `/api/admin/mailchimp/backfill` to trigger manually, with progress logging

2. **Retry Timing**
   - What we know: Should retry before blocking per Claude's discretion
   - What's unclear: Optimal retry count and delay
   - Recommendation: 3 retries with exponential backoff (500ms, 1s, 2s) - matches existing `dbRetryOptions` pattern

3. **Rate Limit Handling**
   - What we know: Mailchimp allows 10 concurrent connections
   - What's unclear: What happens with high signup volume?
   - Recommendation: Monitor for 429 errors; implement queue if needed (unlikely given signup rate)

## Sources

### Primary (HIGH confidence)
- [Mailchimp Marketing API - Member Tags](https://mailchimp.com/developer/marketing/api/list-member-tags/) - Tag operations endpoint
- [Mailchimp Marketing API - Add or Update List Member](https://mailchimp.com/developer/marketing/api/list-members/add-or-update-list-member/) - Upsert contact
- [GitHub: mailchimp-marketing-node](https://github.com/mailchimp/mailchimp-marketing-node) - Official SDK
- [npm: @types/mailchimp__mailchimp_marketing](https://www.npmjs.com/package/@types/mailchimp__mailchimp_marketing) - TypeScript types

### Secondary (MEDIUM confidence)
- [DEPT Engineering: Mailchimp + Next.js Integration](https://engineering.deptagency.com/how-to-integrate-mailchimp-with-next-js-and-typescript) - Pattern reference
- [Mailchimp Developer Fundamentals](https://mailchimp.com/developer/marketing/docs/fundamentals/) - Rate limits and best practices

### Tertiary (LOW confidence)
- None - all critical findings verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDK is clearly documented and maintained
- Architecture: HIGH - Patterns directly match existing codebase (Stripe, Resend)
- Pitfalls: HIGH - Verified with official docs and common integration issues

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable API)

---

## Environment Variables to Add

```bash
# Mailchimp Marketing API (required for trial/paid tagging)
# Get your key at: https://mailchimp.com/account/api/
# Format: apikey-datacenter (e.g., abc123-us5)
MAILCHIMP_API_KEY=****

# Server prefix extracted from API key (the part after the dash)
MAILCHIMP_SERVER_PREFIX=us5

# Audience ID for "Alecci Media" list
# Get from: Audience > Settings > Audience name and defaults
MAILCHIMP_AUDIENCE_ID=d5fc73df51
```

## Integration Points Summary

| Trigger | Location | Mailchimp Action |
|---------|----------|------------------|
| Trial starts | `app/api/stripe/webhook/route.ts` (customer.subscription.created) | Apply trial tag |
| Payment completes | `app/api/stripe/webhook/route.ts` (invoice.paid) | Apply paid tag (plan-specific) |
| Backfill | New admin endpoint | Apply trial tag to existing verified trial users |
