# Phase 9: Mailchimp Integration - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect the AI Boss Brainz platform to Mailchimp so trial signups are tagged for the 7-Day Trial email automation sequence, and paid conversions trigger tags that exit users from the trial flow.

**In scope:**
- Apply trial tag when user verifies email
- Apply paid tag when Stripe checkout completes
- Backfill existing trial users
- Error handling for Mailchimp API failures

**Out of scope:**
- Mailchimp automation configuration (Split Path, If-Else) — Alexandria configures this
- GIF creation and email content — Phase 10
- New email sequences beyond trial flow

</domain>

<decisions>
## Implementation Decisions

### Tag Naming & Structure
- **Trial tag:** `7-Day Free Trial: AI Boss Brainz` (existing, ID: 4120497)
- **Paid tags:** Plan-specific existing tags:
  - Monthly: `AI Boss Brainz Monthly` (ID: 4120473)
  - Annual/Lifetime: `AI Boss Brainz Full` (ID: 4120472)
- **Tag retention:** Keep trial tag when user upgrades (for journey tracking), add paid tag
- **Audience:** `Alecci Media` (ID: d5fc73df51)

### Trigger Timing
- **Trial tag applied:** After email verification (not on signup)
- **Rationale:** Only verified users should enter the email automation
- **Backfill:** Tag all existing verified trial users when feature deploys

### Upgrade Detection
- **Trigger event:** Stripe `checkout.session.completed` webhook
- **Tag applied:** Plan-specific tag based on purchased plan
- **Coverage:** Both trial-to-paid conversions AND direct purchases get tagged

### Upgrade Link
- **URL in emails:** `/pricing` page (not direct Stripe checkout)
- **Rationale:** Users pick their plan on pricing page, consistent with platform flow

### Error Handling
- **On Mailchimp API failure:** Block the user action (strict consistency)
- **User message:** Claude's discretion (friendly generic retry message)
- **Admin notification:** Email to `info@qualiasolutions.net` when Mailchimp errors block user actions

### Claude's Discretion
- Exact error message copy for users
- Retry logic details (how many retries before blocking)
- Logging format and detail level
- Mailchimp API rate limit handling

</decisions>

<specifics>
## Specific Ideas

- Use existing Mailchimp tags (already created in Alexandria's account) — no new tags needed
- Mailchimp API key format: `apikey-dc` (datacenter is `us5`)
- Platform handles tagging only — Mailchimp automation flow (Split Path to check for paid tag) is Alexandria's configuration
- The `checkout.session.completed` event from Stripe already fires to `/api/stripe/webhook` — extend this handler

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-mailchimp-integration*
*Context gathered: 2026-02-02*
