# Phase 14: Homepage & SEO - Research

**Researched:** 2026-02-11
**Domain:** Next.js marketing pages, CMS content management, SEO meta-data, Vercel Blob media uploads
**Confidence:** HIGH

## Summary

Phase 14 requires six targeted changes across the existing marketing pages and CMS system. The codebase already has a mature landing page CMS backed by Supabase (`LandingPageContent` table), an admin editor at `/admin/landing-page`, and a well-structured marketing layout with header/footer. All six requirements map directly to modifications of existing code -- no new architectural patterns are needed.

The current executive bios section (`ExecutiveCards` in `landing-page-client.tsx`) renders in a "chat-style" layout with a window chrome header (red/amber/gray dots), chat-bubble-like cards, and a footer mimicking a chat interface. Requirement LAND-01 wants plain text descriptions instead. The hero section currently shows an `InteractiveChatDemo` component but has no media (photo/video) swap capability -- LAND-02 needs CMS fields for hero media. Social icons in the footer currently link to X/Twitter and LinkedIn -- LAND-03 needs website + Facebook instead. The "Sales & Marketing Checkup" section referenced in LAND-04 exists only on the pricing page as a feature line item, not as a standalone homepage section -- this will need to be created as a new section on the landing page. SEO meta-data (SEO-01) needs a description update in `app/layout.tsx`, and the contact page tagline (SEO-02) is nearly correct already but needs verification.

**Primary recommendation:** Split work into two plans: (1) homepage layout changes (bios, checkup section, social icons) and (2) hero media CMS + SEO meta-data updates. All changes are within existing files -- no new libraries or architecture needed.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.11 | Framework, App Router, metadata API | Already in use |
| React | 19.1.0 | UI rendering | Already in use |
| Tailwind CSS | 4.1.13 | Styling | Already in use |
| framer-motion | 11.3.19 | Animations | Already used in landing page |
| @vercel/blob | 0.24.1 | Media file storage | Already used for file uploads |
| Supabase | 2.89.0 | CMS data storage (LandingPageContent table) | Already in use |
| lucide-react | 0.446.0 | Icons (including social media) | Already in use |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @icons-pack/react-simple-icons | 13.7.0 | Brand icons (Facebook, Globe) | For social media icons in footer |
| next/image | (built-in) | Optimized images | For hero media display |
| zod | 3.25.76 | Validation | For CMS API input validation |

### No New Dependencies Required

All requirements can be implemented with the existing stack. No new packages needed.

## Architecture Patterns

### Current CMS Architecture (Do Not Change)

```
lib/cms/
├── landing-page.ts           # Server-side fetcher with unstable_cache (60s)
└── landing-page-types.ts     # TypeScript types + defaults

app/api/admin/landing-page/
└── route.ts                  # GET (public), PATCH (single), PUT (bulk) - admin only

app/(admin)/admin/landing-page/
└── page.tsx                  # CMS editor with tabs

Supabase Table: LandingPageContent
├── section (text)            # e.g., "hero", "executives", "footer"
├── key (text)                # e.g., "title_main", "alex_name"
├── value (text)              # The content value
├── type (text)               # "text", "textarea", "url", "color", "list"
└── UNIQUE(section, key)      # Composite unique constraint
```

### Pattern 1: Adding New CMS Fields

**What:** Adding new editable fields to the CMS (e.g., hero media URL, executive descriptions)
**When to use:** For LAND-01 (executive descriptions) and LAND-02 (hero media)
**Steps:**
1. Add SQL INSERT for new rows in `LandingPageContent` table
2. Update `LandingPageCMSContent` type in `lib/cms/landing-page-types.ts`
3. Update `defaultLandingPageContent` in same file
4. Update `getLandingPageContent` merger in `lib/cms/landing-page.ts` (if new section)
5. Add CMS editor fields in `app/(admin)/admin/landing-page/page.tsx`
6. Consume in the rendering component

**Example SQL for new fields:**
```sql
INSERT INTO "LandingPageContent" ("section", "key", "value", "type", "metadata") VALUES
  ('executives', 'alex_description', 'Brand strategist with Fortune 500 experience. Specializes in go-to-market strategy, brand positioning, and digital campaigns that drive growth.', 'textarea', '{}'),
  ('executives', 'kim_description', 'Revenue architect and sales optimization expert. Helps build pipelines, improve conversion rates, and close deals more effectively.', 'textarea', '{}'),
  ('hero', 'media_type', 'none', 'text', '{"options": ["none", "image", "video"]}'),
  ('hero', 'media_url', '', 'url', '{}')
ON CONFLICT ("section", "key") DO NOTHING;
```

### Pattern 2: Rendering CMS Content in Components

**What:** Components receive `LandingPageCMSContent` and render accordingly
**Example from existing code:**
```typescript
// landing-page-client.tsx - all sections receive content prop
function HeroSection({ content }: { content: LandingPageCMSContent }) {
  return (
    <h1>{content.hero.title_main}</h1>
    <span>{content.hero.title_highlight}</span>
  );
}
```

### Pattern 3: Next.js Metadata API for SEO

**What:** Using the exported `metadata` object in `app/layout.tsx`
**Current implementation:**
```typescript
// app/layout.tsx - already well-structured
export const metadata: Metadata = {
  title: { default: "AI Boss Brainz", template: "%s | AI Boss Brainz" },
  description: "Executive consulting for sales and marketing strategy. Available 24/7.",
  openGraph: {
    title: "AI Boss Brainz",
    description: "Executive consulting for sales and marketing strategy. Available 24/7.",
  },
  twitter: {
    title: "AI Boss Brainz",
    description: "Executive consulting for sales and marketing strategy. Available 24/7.",
  },
};
```

### Anti-Patterns to Avoid
- **Do NOT create separate metadata files per marketing page** -- the root layout metadata with the template pattern is correct
- **Do NOT hardcode media URLs in components** -- use the CMS system
- **Do NOT add new Supabase tables** -- use existing `LandingPageContent` with section/key pattern
- **Do NOT change the CMS caching strategy** -- 60-second `unstable_cache` + ISR 300s is appropriate

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Media upload | Custom upload handler | Existing `/api/files/upload` route with Vercel Blob | Already has validation, CSRF, auth |
| Social icons | Custom SVGs for each | `lucide-react` Globe icon + SVG for Facebook | Consistent with rest of site |
| SEO meta tags | Manual `<meta>` tags in `<head>` | Next.js `Metadata` export in layout.tsx | Framework handles dedup, ordering, OG protocol |
| CMS persistence | New API routes | Existing `/api/admin/landing-page` PUT endpoint | Already handles bulk updates with admin auth |
| Image optimization | Manual `<img>` tags | `next/image` with `remotePatterns` config | Auto optimization, lazy loading, sizing |

**Key insight:** The entire CMS infrastructure (DB table, API routes, admin editor, caching, rendering pipeline) already exists. Every LAND requirement maps to modifications within this existing system.

## Common Pitfalls

### Pitfall 1: Forgetting to Update TypeScript Types When Adding CMS Fields
**What goes wrong:** New CMS fields exist in the DB but the TypeScript type doesn't include them, so they're silently dropped during the merge step in `getLandingPageContent`.
**Why it happens:** The merge uses spread: `{ ...defaults, ...content.section }` but TypeScript types gate what keys are expected.
**How to avoid:** Always update all three: (1) SQL INSERT, (2) `LandingPageCMSContent` type, (3) `defaultLandingPageContent` defaults.
**Warning signs:** Field shows in admin but doesn't render on the page.

### Pitfall 2: SEO Description Mismatch Between Layout and OG Tags
**What goes wrong:** Updating `description` but not `openGraph.description` and `twitter.description`.
**Why it happens:** They're separate fields in the Next.js `Metadata` object.
**How to avoid:** Update all three description locations in `app/layout.tsx` simultaneously.
**Warning signs:** Link previews on social media show wrong text.

### Pitfall 3: Missing `remotePatterns` for New Image Domains
**What goes wrong:** `next/image` refuses to render images from domains not in `next.config.ts`.
**Why it happens:** Security feature. CMS-uploaded images via Vercel Blob will use a new hostname.
**How to avoid:** Ensure Vercel Blob hostname pattern is in `next.config.ts` `images.remotePatterns`. Note: Vercel Blob URLs use `*.public.blob.vercel-storage.com`.
**Warning signs:** Broken images in production, 400 errors from `/_next/image`.

### Pitfall 4: Admin CMS Editor Not Exposing New Fields
**What goes wrong:** Fields are in the DB and render correctly, but admin can't edit them because the editor UI wasn't updated.
**Why it happens:** The admin editor (`app/(admin)/admin/landing-page/page.tsx`) manually lists fields per tab.
**How to avoid:** Always add corresponding Input/Textarea fields to the admin editor for every new CMS field.
**Warning signs:** Admin cannot change new content after initial seeding.

### Pitfall 5: Vercel Blob Image Hostname Not Whitelisted in CSP
**What goes wrong:** Images uploaded to Vercel Blob are blocked by Content-Security-Policy `img-src`.
**Why it happens:** CSP in `next.config.ts` and `vercel.json` limits image sources.
**How to avoid:** Current CSP already has `img-src 'self' data: blob: https:` which allows all HTTPS sources. Verify this is still the case after any CSP changes.
**Warning signs:** Images blocked in browser console with CSP violation.

### Pitfall 6: Sales & Marketing Checkup Section Misidentified
**What goes wrong:** Developer looks for an existing "Checkup" section on the homepage and can't find it.
**Why it happens:** The "Sales & Marketing Checkup" currently only exists as a feature line item on the pricing page (Annual plan). LAND-04 wants a NEW dedicated section on the homepage styled in red with items ordered lowest to highest value.
**How to avoid:** Create a new section component for the landing page, not modify the pricing page.
**Warning signs:** Pricing page gets incorrectly modified.

## Detailed Findings Per Requirement

### LAND-01: Executive Bios as Text (Not Chat Bubbles)
**Current state:** `ExecutiveCards` function in `app/(marketing)/landing-page-client.tsx` lines 237-459 renders executives in a "chat window" style with:
- Window chrome header (colored dots, "Executive Team" label)
- Each executive in a chat-bubble-like `flex gap-4 p-5 rounded-2xl border` card within the window
- Chat-style footer with avatars and "Start Chatting" CTA

**Required change:** Replace the chat-window container with standard text description layout. Keep avatars, names, roles, expertise tags. Remove the window chrome, the chat-like card styling, and the footer bar. Add CMS-editable description fields for each executive.

**New CMS fields needed:**
- `executives.alex_description` (textarea)
- `executives.kim_description` (textarea)

**Files to modify:**
1. `lib/cms/landing-page-types.ts` -- add description fields to type + defaults
2. `app/(marketing)/landing-page-client.tsx` -- rewrite `ExecutiveCards` function
3. `app/(admin)/admin/landing-page/page.tsx` -- add description textareas to Executives tab
4. SQL migration for new rows

### LAND-02: Hero Media CMS (Swappable Photo/Video)
**Current state:** Hero section right side shows an `InteractiveChatDemo` component. No media upload/swap capability exists.

**Required change:** Add CMS fields for hero media (type selector + URL), and optionally allow upload via Vercel Blob. The hero section should conditionally render:
- `none` -- keep the interactive chat demo (current behavior)
- `image` -- render a `next/image` with the provided URL
- `video` -- render a video embed (YouTube/Vimeo iframe or direct video tag)

**New CMS fields needed:**
- `hero.media_type` ("none" | "image" | "video")
- `hero.media_url` (URL string)

**Files to modify:**
1. `lib/cms/landing-page-types.ts` -- add media fields
2. `app/(marketing)/landing-page-client.tsx` -- conditional rendering in `HeroSection`
3. `app/(admin)/admin/landing-page/page.tsx` -- add media type select + URL input + optional file upload to Hero tab
4. SQL migration for new rows
5. `next.config.ts` -- add `*.public.blob.vercel-storage.com` to `remotePatterns` if not already present

**Upload approach:** Leverage existing Vercel Blob infrastructure. Admin uploads image/video, gets back a URL, stores URL in CMS. The existing `/api/files/upload` route can be reused or a dedicated admin media upload route can be created.

### LAND-03: Social Icons (Website + Facebook, Remove X/Twitter)
**Current state:** Footer in `app/(marketing)/marketing-layout-client.tsx` lines 275-298 has two social icons:
- X/Twitter (linking to `https://x.com/aleccimedia`)
- LinkedIn (linking to `https://linkedin.com/company/alecci-media`)

**Required change:**
- Remove X/Twitter icon entirely
- Add website link to `https://aleccimedia.com` (use Globe icon from lucide-react)
- Add Facebook icon (use custom SVG or `@icons-pack/react-simple-icons`)
- Keep LinkedIn if desired (not mentioned in requirements)

**Files to modify:**
1. `app/(marketing)/marketing-layout-client.tsx` -- update Footer social icons section

### LAND-04: Sales & Marketing Checkup Section
**Current state:** No "Checkup" section exists on the homepage. It only appears as a pricing feature line item. The requirement asks for a dedicated section styled in red with items ordered from lowest to highest value.

**Required change:** Create a new `CheckupSection` component in the landing page client. This section should display the Annual plan's bonus items (Checkup $97, Resource Library $1,000+, Strategy Calls $6,000) styled with a red color scheme, ordered from lowest to highest value.

**Approach options:**
1. **Hardcoded section** -- items are static, just styled in red, ordered by value
2. **CMS-driven section** -- add new CMS fields for checkup items (section: "checkup")

**Recommended:** Option 2 (CMS-driven) for consistency with the rest of the landing page. But given these are tied to pricing, a simpler hardcoded approach with clear constants is also acceptable.

**New CMS fields (if CMS-driven):**
- `checkup.section_title`
- `checkup.item_1_title`, `checkup.item_1_value`, etc.

**Files to modify:**
1. `app/(marketing)/landing-page-client.tsx` -- add new `CheckupSection` component
2. `lib/cms/landing-page-types.ts` -- add checkup section type (if CMS-driven)
3. `app/(admin)/admin/landing-page/page.tsx` -- add Checkup tab (if CMS-driven)
4. SQL migration (if CMS-driven)

### SEO-01: Meta-Data Update
**Current state in `app/layout.tsx`:**
- Title: "AI Boss Brainz" -- CORRECT, matches requirement
- Description: "Executive consulting for sales and marketing strategy. Available 24/7." -- WRONG, should be "Your Sales and Marketing Secret Weapon"
- OG description: Same as above -- needs updating
- Twitter description: Same -- needs updating

**Required change:** Update `description`, `openGraph.description`, and `twitter.description` in `app/layout.tsx` to "Your Sales and Marketing Secret Weapon".

**Files to modify:**
1. `app/layout.tsx` -- update three description fields

### SEO-02: Contact Page Tagline
**Current state in `app/(marketing)/contact/page.tsx`:**
- Line 289: `"Sales and Marketing Strategy 24/7. Get instant strategic advice from Alexandria (CMO) and Kim (CSO)."`
- The CTA card already contains the exact text "Sales and Marketing Strategy 24/7"

**Analysis:** The tagline text "Sales and Marketing Strategy 24/7" already appears on the contact page (line 289). Need to verify the requirement asks for this as the primary tagline/heading, not just in a CTA card. The main heading on the contact page is "Get in Touch" (line 91). The requirement likely wants the tagline to be more prominent or to replace the subtitle.

**Files to modify:**
1. `app/(marketing)/contact/page.tsx` -- adjust tagline placement/prominence

## Code Examples

### Example 1: Adding CMS Fields (SQL Migration)
```sql
-- Migration: Add executive descriptions and hero media to CMS
INSERT INTO "LandingPageContent" ("section", "key", "value", "type", "metadata") VALUES
  -- Executive descriptions (LAND-01)
  ('executives', 'alex_description', 'Brand strategist with Fortune 500 experience. Specializes in go-to-market strategy, brand positioning, and digital campaigns that drive growth.', 'textarea', '{}'),
  ('executives', 'kim_description', 'Revenue architect and sales optimization expert. Helps build pipelines, improve conversion rates, and close deals more effectively.', 'textarea', '{}'),
  -- Hero media (LAND-02)
  ('hero', 'media_type', 'none', 'text', '{"options": ["none", "image", "video"]}'),
  ('hero', 'media_url', '', 'url', '{}')
ON CONFLICT ("section", "key") DO NOTHING;
```

### Example 2: Updated TypeScript Type
```typescript
// lib/cms/landing-page-types.ts additions
export type LandingPageCMSContent = {
  hero: {
    title_main: string;
    title_highlight: string;
    subtitle: string;
    cta_primary_text: string;
    cta_primary_link: string;
    cta_secondary_text: string;
    cta_secondary_link: string;
    media_type: "none" | "image" | "video";  // NEW
    media_url: string;                         // NEW
  };
  executives: {
    // ... existing fields ...
    alex_description: string;  // NEW
    kim_description: string;   // NEW
  };
  // ... rest unchanged ...
};
```

### Example 3: Conditional Hero Media Rendering
```typescript
// In HeroSection, replace InteractiveChatDemo with conditional rendering
{content.hero.media_type === "image" && content.hero.media_url ? (
  <Image
    src={content.hero.media_url}
    alt="AI Boss Brainz"
    width={800}
    height={600}
    className="rounded-2xl shadow-2xl"
    priority
  />
) : content.hero.media_type === "video" && content.hero.media_url ? (
  <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
    {content.hero.media_url.includes("youtube") || content.hero.media_url.includes("vimeo") ? (
      <iframe
        src={content.hero.media_url}
        className="w-full h-full"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
    ) : (
      <video src={content.hero.media_url} controls className="w-full h-full object-cover" />
    )}
  </div>
) : (
  <InteractiveChatDemo content={content} />
)}
```

### Example 4: Updated Social Icons in Footer
```typescript
// Replace current X/Twitter + LinkedIn with Website + Facebook + LinkedIn
<div className="flex gap-4">
  {/* Website */}
  <a
    href="https://aleccimedia.com"
    target="_blank"
    rel="noopener noreferrer"
    className="flex size-9 items-center justify-center rounded-lg text-stone-400 transition-all hover:bg-stone-100 hover:text-stone-900"
    aria-label="Visit Alecci Media website"
  >
    <Globe className="size-4" />
  </a>
  {/* Facebook */}
  <a
    href="https://facebook.com/aleccimedia"
    target="_blank"
    rel="noopener noreferrer"
    className="flex size-9 items-center justify-center rounded-lg text-stone-400 transition-all hover:bg-stone-100 hover:text-stone-900"
    aria-label="Follow on Facebook"
  >
    <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  </a>
  {/* LinkedIn (keep) */}
  <a href="https://linkedin.com/company/alecci-media" ...>
    ...
  </a>
</div>
```

### Example 5: SEO Meta-Data Update
```typescript
// app/layout.tsx - update these three fields
export const metadata: Metadata = {
  // ... existing fields ...
  description: "Your Sales and Marketing Secret Weapon",
  openGraph: {
    // ... existing fields ...
    description: "Your Sales and Marketing Secret Weapon",
  },
  twitter: {
    // ... existing fields ...
    description: "Your Sales and Marketing Secret Weapon",
  },
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next/head` for meta tags | `Metadata` export in layout/page | Next.js 13+ (2023) | Already using current approach |
| Manual OG image generation | Static `opengraph-image.png` in app dir | Next.js 13+ | Already using -- file-based convention |
| localStorage CMS | Supabase DB-backed CMS with `unstable_cache` | Custom (already built) | Fully functional system |

**Nothing deprecated in current implementation.**

## File Modification Map

### Plan 14-01: Homepage Layout Updates (LAND-01, LAND-03, LAND-04)

| File | Change | Requirement |
|------|--------|-------------|
| `app/(marketing)/landing-page-client.tsx` | Rewrite `ExecutiveCards` to plain text layout; add `CheckupSection` component | LAND-01, LAND-04 |
| `app/(marketing)/marketing-layout-client.tsx` | Update footer social icons | LAND-03 |
| `lib/cms/landing-page-types.ts` | Add `alex_description`, `kim_description` fields + checkup section type | LAND-01, LAND-04 |
| `lib/cms/landing-page.ts` | Add checkup section to merge (if CMS-driven) | LAND-04 |
| `app/(admin)/admin/landing-page/page.tsx` | Add description textareas + checkup tab | LAND-01, LAND-04 |
| `lib/supabase/types.ts` | Add "checkup" to `LandingPageSection` union (if CMS-driven) | LAND-04 |
| New SQL migration | INSERT new CMS rows | LAND-01, LAND-04 |

### Plan 14-02: Hero CMS and SEO Meta-Data (LAND-02, SEO-01, SEO-02)

| File | Change | Requirement |
|------|--------|-------------|
| `app/layout.tsx` | Update description in metadata, openGraph, twitter | SEO-01 |
| `app/(marketing)/contact/page.tsx` | Update tagline text/placement | SEO-02 |
| `app/(marketing)/landing-page-client.tsx` | Add conditional hero media rendering | LAND-02 |
| `lib/cms/landing-page-types.ts` | Add `media_type`, `media_url` to hero type | LAND-02 |
| `app/(admin)/admin/landing-page/page.tsx` | Add media type selector + URL input to Hero tab | LAND-02 |
| `next.config.ts` | Add Vercel Blob hostname to `remotePatterns` | LAND-02 |
| New SQL migration | INSERT hero media CMS rows | LAND-02 |

## Open Questions

1. **Facebook URL for Alecci Media**
   - What we know: Requirement says add Facebook link
   - What's unclear: Exact Facebook page URL (assumed `https://facebook.com/aleccimedia`)
   - Recommendation: Use placeholder URL, admin can update via CMS or hardcode known URL

2. **Checkup Section Content**
   - What we know: Must be "styled in red, items ordered lowest to highest value"
   - What's unclear: Exact items and values (inferred from pricing page: Checkup $97, Resource Library $1,000+, Strategy Calls $6,000)
   - Recommendation: Use pricing page data as source of truth, make CMS-editable

3. **Hero Media: Upload vs URL-Only**
   - What we know: Admin needs to swap hero media without code changes
   - What's unclear: Whether admin should upload files or just paste URLs
   - Recommendation: Support both -- URL input field plus an upload button that uses Vercel Blob and auto-fills the URL

4. **Video Embed: iframe vs CSP**
   - What we know: Hero can be photo OR video
   - What's unclear: CSP currently has `frame-src 'self' https://vercel.live https://js.stripe.com` -- YouTube/Vimeo embeds would be blocked
   - Recommendation: If video embed is needed, add `https://www.youtube.com https://player.vimeo.com` to `frame-src` in both `next.config.ts` and `vercel.json`

5. **Contact Page Tagline Specifics**
   - What we know: Tagline should be "Sales and Marketing Strategy 24/7"
   - What's unclear: Where exactly -- it already appears in the CTA card on the contact page. Does the main page heading/subtitle need to change?
   - Recommendation: Add it as the page subtitle under "Get in Touch", keep it in the CTA card as well

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** -- all files read directly:
  - `app/layout.tsx` (root metadata)
  - `app/(marketing)/page.tsx`, `landing-page-client.tsx`, `marketing-layout-client.tsx`
  - `app/(marketing)/contact/page.tsx`, `about/about-client.tsx`
  - `app/(marketing)/pricing/page.tsx`
  - `lib/cms/landing-page.ts`, `lib/cms/landing-page-types.ts`
  - `app/api/admin/landing-page/route.ts`
  - `app/(admin)/admin/landing-page/page.tsx`
  - `app/(chat)/api/files/upload/route.ts` (Vercel Blob)
  - `next.config.ts`, `vercel.json`, `package.json`
  - `supabase/migrations/20260119_create_landing_page_cms.sql`
  - `lib/supabase/types.ts` (LandingPageContent type)

### Secondary (MEDIUM confidence)
- Next.js Metadata API: well-known stable feature since Next.js 13, current codebase already uses it correctly
- Vercel Blob: existing usage in codebase confirms patterns; hostname pattern `*.public.blob.vercel-storage.com` for remote images

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all in-place modifications
- Architecture: HIGH -- CMS pattern well-established, just extending it
- Pitfalls: HIGH -- identified from direct code inspection, no speculation
- SEO changes: HIGH -- straightforward metadata field updates
- Checkup section: MEDIUM -- inferred content from pricing page, exact requirements need confirmation

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (stable codebase, no moving parts)
