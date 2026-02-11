# Mailchimp Email Assets

Documentation for assets ready to embed in Mailchimp onboarding emails.

## Profile Dropdown GIF

**File:** `docs/demo/gifs/profile-dropdown.gif`
**Purpose:** Onboarding Email 1 — shows users how to access Account settings

### Specifications

| Property | Value |
|----------|-------|
| Dimensions | 800 x 600 px |
| File Size | 443 KB |
| Duration | 5 seconds |
| Frame Rate | 30 fps |
| Format | GIF 89a |

### What It Shows

1. Cursor moves toward profile area (bottom-left of sidebar)
2. Click on profile button
3. Dropdown menu opens with smooth animation
4. Cursor moves to "Account" option (highlighted in rose)
5. Instructional text overlay guides the viewer

### Menu Items Visible

- Homepage (Home icon)
- **Account** (Settings icon) — highlighted
- Pricing (Credit Card icon)
- Contact (Mail icon)
- Sign out (Logout icon)

### How to Embed in Mailchimp

1. Upload `profile-dropdown.gif` to Mailchimp Content Studio
2. In the email editor, add an Image block
3. Select the uploaded GIF
4. Set alt text: "Click your profile to access Account settings"
5. Recommended: Add link to login page (https://bossbrainz.aleccimedia.com/login)

### Accessibility

**Alt text suggestion:**
> "Animation showing how to access Account settings: click your profile in the bottom-left corner, then select Account from the dropdown menu."

## Creation Method

This GIF was created programmatically using **Remotion** (React-based video framework) instead of manual screen recording. This provides:

- Consistent, reproducible output
- No dependency on demo account existence
- Easy to update if UI changes
- Professional quality animation

**Source:** `~/my-video/src/remotion/compositions/ProfileDropdown.tsx`

## Screenshot Assets (Optional)

If additional screenshots are needed, they can be captured from the live site:

- `docs/demo/screenshots/public/` — public pages (landing, pricing, contact)
- `docs/demo/screenshots/authenticated/` — logged-in pages (chat, settings)

See SCREENSHOT-INDEX.md once populated.

---

*Created: 2026-02-02*
*Method: Remotion programmatic rendering*
