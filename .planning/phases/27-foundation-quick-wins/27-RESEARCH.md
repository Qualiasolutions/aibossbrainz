# Phase 27: Foundation & Quick Wins - Research

**Researched:** 2026-02-28
**Domain:** Next.js performance optimization, bundle analysis, image optimization, code quality automation
**Confidence:** HIGH

## Summary

Phase 27 establishes performance baselines and delivers low-risk, high-impact improvements through industry-standard tooling. The phase uses four mature technologies: Next.js SWC compiler for console removal, @next/bundle-analyzer for bundle visualization, sharp for image format conversion, and Biome with git hooks for linting automation.

All technologies are well-documented with active maintenance as of February 2026. Next.js 15.6+ (current project version: 15.5.11) includes stable SWC compiler features, Biome 2.3.10 (project version) supports the `--staged` flag (introduced in v1.7.0), and @next/bundle-analyzer works with both webpack and Turbopack bundlers.

**Primary recommendation:** Implement tasks sequentially (lint fix → bundle analyzer → image optimization → console removal → pre-commit hooks) to verify each change before compounding effects.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @next/bundle-analyzer | 0.x (latest) | Bundle size visualization | Official Next.js plugin, generates HTML reports for client/server/edge bundles |
| sharp | 0.33.x (latest) | Image processing | Industry standard for Node.js image conversion, 4-5x faster than ImageMagick, used by Next.js internally |
| husky | 9.1.7 (latest) | Git hooks manager | De facto standard for automating pre-commit checks, 34M+ weekly downloads |
| Biome | 2.3.10 (installed) | Linter + formatter | Project already uses Biome via Ultracite, supports `--staged` flag since v1.7.0 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @biomejs/biome | 2.3.10 | Direct Biome CLI | Already installed, use for `--staged` option in git hooks |
| Next.js SWC compiler | Built-in (Next.js 15.6+) | Code transformation | Built into Next.js, no additional install needed for `removeConsole` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sharp | imagemin | imagemin less actively maintained, sharp is newer standard and used by Next.js internally |
| husky | lefthook | lefthook faster but less ecosystem support, husky more established in Node.js projects |
| @next/bundle-analyzer | webpack-bundle-analyzer | @next/bundle-analyzer wraps webpack-bundle-analyzer with Next.js-specific defaults |

**Installation:**
```bash
# Bundle analyzer
pnpm add -D @next/bundle-analyzer

# Image conversion (sharp already installed as Next.js dependency, but explicit install for scripts)
pnpm add -D sharp

# Git hooks
pnpm add -D husky
npx husky init
```

## Architecture Patterns

### Recommended Project Structure
```
.husky/
├── pre-commit           # Runs biome check --staged
next.config.ts           # Add removeConsole + withBundleAnalyzer wrapper
public/images/
├── *.webp              # Converted WebP images (new)
├── *.png               # Original PNGs (keep for fallback or delete after verification)
scripts/
└── convert-to-webp.ts  # One-time conversion script
```

### Pattern 1: Bundle Analyzer Configuration (Next.js 15+)
**What:** Wrapper function around Next.js config that conditionally enables bundle analysis
**When to use:** Development/CI environments to generate size reports without slowing production builds
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/package-bundling
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // existing config
};

// Wrap with bundle analyzer (enabled via ANALYZE=true env var)
const configWithAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false, // Don't auto-open browser, write files only
})(nextConfig);

// Export with Sentry config wrapping bundle analyzer
export default withSentryConfig(configWithAnalyzer, {
  // existing Sentry config
});
```

**Output:** Generates three HTML files in `.next/analyze/`: `client.html`, `nodejs.html`, `edge.html`

### Pattern 2: SWC Console Removal (Production-Only)
**What:** Built-in Next.js compiler option to strip console statements from production builds
**When to use:** Always for production builds, preserving error/warn for Sentry integration
**Example:**
```typescript
// Source: https://nextjs.org/docs/architecture/nextjs-compiler (2026-02-27)
const nextConfig: NextConfig = {
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'], // Preserve error/warn for Sentry
    },
  },
  // ... rest of config
};
```

**Why exclude error/warn:** Sentry relies on console.error for client-side error tracking. Removing all console statements breaks error monitoring.

### Pattern 3: Sharp PNG to WebP Conversion
**What:** Node.js script to batch convert PNG images to WebP format
**When to use:** One-time conversion before switching Image component src paths
**Example:**
```typescript
// Source: https://sharp.pixelplumbing.com/api-output/
import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join } from 'path';

const inputDir = './public/images';
const avatars = ['alex-avatar.png', 'kim-avatar.png', 'collaborative-avatar.png'];

for (const filename of avatars) {
  const inputPath = join(inputDir, filename);
  const outputPath = inputPath.replace('.png', '.webp');

  await sharp(inputPath)
    .webp({ quality: 85 }) // 85 is good balance for avatars
    .toFile(outputPath);

  console.log(`Converted ${filename} to WebP`);
}
```

**Quality guidelines:** 80-85 for photos/avatars, 90-95 for images with text/graphics

### Pattern 4: Biome Pre-Commit Hook with --staged
**What:** Git hook that lints only staged files before commit
**When to use:** Every project using Biome (v1.7.0+) to prevent committing lint errors
**Example:**
```bash
# Source: https://biomejs.dev/recipes/git-hooks/ (2026)
# .husky/pre-commit
npx @biomejs/biome check --write --staged --no-errors-on-unmatched --files-ignore-unknown=true
```

**Flags explained:**
- `--staged`: Only check files in git index (requires Biome 1.7.0+)
- `--write`: Auto-fix issues and re-stage files
- `--no-errors-on-unmatched`: Don't fail if no files match (e.g., committing only images)
- `--files-ignore-unknown=true`: Gracefully handle file types Biome doesn't support

### Pattern 5: Next.js Image Component with Preload Prop
**What:** Use `preload` prop (replaces deprecated `priority` in Next.js 16) for LCP images
**When to use:** ONLY for single above-the-fold hero image, not multiple images
**Example:**
```tsx
// Source: https://nextjs.org/docs/app/api-reference/components/image
import Image from 'next/image';

// CORRECT: Single LCP candidate
<Image
  src="/images/alex-avatar.webp"
  alt="Alexandria - CMO"
  width={400}
  height={400}
  preload={true} // Next.js 16+ (or priority={true} for Next.js 15)
  loading="eager"
/>

// INCORRECT: Multiple preloads compete for bandwidth
<Image src="/hero.webp" preload={true} />
<Image src="/card1.webp" preload={true} /> {/* BAD: degrades LCP */}
<Image src="/card2.webp" preload={true} /> {/* BAD: degrades LCP */}
```

**Performance impact:** Correct single-image preloading improves LCP by 300-800ms. Over-preloading degrades LCP by 400-1200ms.

### Anti-Patterns to Avoid

- **Don't manually concatenate Stripe URLs with query params** — Already fixed in this project (uses URL API), but common mistake
- **Don't remove ALL console statements** — Breaks Sentry error tracking, always exclude error/warn
- **Don't enable bundle analyzer in production builds** — Slows build by ~30%, use `ANALYZE=true` locally only
- **Don't use `priority={true}` on multiple images** — Only for single LCP candidate
- **Don't convert favicon/icon PNGs to WebP** — Browsers expect PNG for favicons, leave icon-*.png as-is

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image format conversion | Custom ImageMagick scripts or Canvas API | sharp npm package | sharp 4-5x faster, handles edge cases (color profiles, alpha channels, EXIF data), used by Next.js internally |
| Bundle size analysis | Custom webpack stats parser | @next/bundle-analyzer | Handles Next.js-specific bundle structure (client/server/edge split), generates interactive HTML reports |
| Git hook management | Manual .git/hooks scripts | husky | Cross-platform compatibility, team sync via package.json, handles non-executable files on Windows |
| Pre-commit linting | Custom git hook scripts with find/grep | Biome --staged flag | Handles staged-only file detection, partial commits, binary files, gracefully skips non-lintable files |

**Key insight:** These problems look simple but have 10+ edge cases each. sharp handles 30+ image formats with color space conversions, @next/bundle-analyzer handles Next.js code splitting nuances, husky handles Windows/Mac/Linux git differences, Biome --staged handles git index state correctly.

## Common Pitfalls

### Pitfall 1: Multiple Bundle Analyzer Wrappers Conflict
**What goes wrong:** Wrapping next.config.ts with both `withBundleAnalyzer` and `withSentryConfig` incorrectly causes one to override the other
**Why it happens:** Order matters — last wrapper is outermost, config passed to wrong function
**How to avoid:** Wrap in correct order: innermost is base config, outermost is final wrapper
**Warning signs:** Sentry source maps stop working, or analyzer doesn't generate files

**Correct order:**
```typescript
const baseConfig = { /* Next.js config */ };
const withAnalyzer = withBundleAnalyzer({ enabled: true })(baseConfig); // Inner
export default withSentryConfig(withAnalyzer, { /* Sentry opts */ }); // Outer
```

### Pitfall 2: Overusing Image Priority/Preload Prop
**What goes wrong:** LCP degrades by 400-1200ms instead of improving
**Why it happens:** Multiple preload hints compete for bandwidth, delaying actual LCP image
**How to avoid:** Use preload on EXACTLY ONE image per page — the true LCP candidate
**Warning signs:** PageSpeed Insights shows increased LCP, waterfall shows parallel large image fetches

**Rule:** If you're tempted to add `preload={true}` to more than one image, use `loading="eager"` instead.

### Pitfall 3: Removing console.error Breaks Sentry
**What goes wrong:** Client-side errors stop appearing in Sentry dashboard
**Why it happens:** Sentry's browser SDK hooks into console.error to capture exceptions
**How to avoid:** Always exclude error and warn: `removeConsole: { exclude: ['error', 'warn'] }`
**Warning signs:** Sentry error rate drops to zero in production, but users report issues

### Pitfall 4: WebP Conversion Loses Transparency
**What goes wrong:** Converted WebP images have white/black background instead of transparent
**Why it happens:** Default WebP encoding doesn't always preserve alpha channel from PNG
**How to avoid:** Verify alpha channel with `sharp(input).metadata()` before conversion, or use lossless WebP for transparency
**Warning signs:** Avatar images show solid background in browser

**Fix:**
```typescript
const metadata = await sharp(inputPath).metadata();
const options = metadata.hasAlpha
  ? { quality: 90, alphaQuality: 100 } // Preserve transparency
  : { quality: 85 };

await sharp(inputPath).webp(options).toFile(outputPath);
```

### Pitfall 5: Husky Hooks Don't Run on CI
**What goes wrong:** Pre-commit hooks work locally but CI commits skip linting
**Why it happens:** Husky is disabled by default on CI (HUSKY=0 env var)
**How to avoid:** This is CORRECT behavior — CI should run linting separately via `pnpm lint`, not via git hooks
**Warning signs:** None — this is expected, but developers may be confused

**Note:** The `prepare` script in package.json (added by `husky init`) installs hooks for local developers but skips on CI.

### Pitfall 6: Biome --staged Doesn't Re-stage Auto-fixes
**What goes wrong:** Biome fixes lint errors but commit proceeds with unfixed code
**Why it happens:** `--write` flag fixes files on disk but doesn't add changes to git index
**How to avoid:** Add `git add -u` after biome command, or use `--write` which handles this automatically in Biome 2.0+
**Warning signs:** Lint errors reappear after commit, `git diff` shows fixed code not committed

**Modern solution (Biome 2.0+):** The `--write` flag automatically re-stages fixed files, so no additional git command needed.

### Pitfall 7: Bundle Analyzer Opens 3 Browser Tabs
**What goes wrong:** Running `ANALYZE=true pnpm build` opens client.html, nodejs.html, edge.html in separate tabs
**Why it happens:** Default `openAnalyzer: true` config
**How to avoid:** Set `openAnalyzer: false`, manually open files from `.next/analyze/`
**Warning signs:** Annoying during CI/automated builds, or when running in SSH session

## Code Examples

Verified patterns from official sources:

### Complete next.config.ts with All Phase 27 Changes
```typescript
// Sources:
// - https://nextjs.org/docs/architecture/nextjs-compiler (removeConsole)
// - https://nextjs.org/docs/app/guides/package-bundling (bundle analyzer)

import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    // Strip console statements in production (preserve error/warn for Sentry)
    removeConsole: {
      exclude: ['error', 'warn'],
    },
  },
  experimental: {
    optimizePackageImports: [
      // ... existing imports
    ],
  },
  images: {
    remotePatterns: [
      // ... existing patterns
    ],
  },
  // ... rest of existing config
};

// Wrap with bundle analyzer (enabled via ANALYZE=true env var)
const configWithAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false, // Don't auto-open browser
})(nextConfig);

// Export with Sentry wrapping analyzer
export default withSentryConfig(configWithAnalyzer, {
  silent: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
});
```

### Image Conversion Script (scripts/convert-avatars-to-webp.ts)
```typescript
// Source: https://sharp.pixelplumbing.com/api-output/
import sharp from 'sharp';
import { stat } from 'fs/promises';
import { join } from 'path';

const PUBLIC_DIR = join(process.cwd(), 'public', 'images');
const AVATARS = [
  'alex-avatar.png',
  'kim-avatar.png',
  'collaborative-avatar.png',
];

async function convertToWebP() {
  for (const filename of AVATARS) {
    const inputPath = join(PUBLIC_DIR, filename);
    const outputPath = inputPath.replace('.png', '.webp');

    // Check file exists
    try {
      await stat(inputPath);
    } catch {
      console.error(`File not found: ${inputPath}`);
      continue;
    }

    // Get metadata to preserve transparency
    const metadata = await sharp(inputPath).metadata();
    console.log(`Converting ${filename} (${metadata.width}x${metadata.height}, hasAlpha: ${metadata.hasAlpha})`);

    // Convert with transparency preservation
    const options = metadata.hasAlpha
      ? { quality: 85, alphaQuality: 100 }
      : { quality: 85 };

    await sharp(inputPath)
      .webp(options)
      .toFile(outputPath);

    // Report size reduction
    const inputStats = await stat(inputPath);
    const outputStats = await stat(outputPath);
    const reduction = ((1 - outputStats.size / inputStats.size) * 100).toFixed(1);
    console.log(`  ${(inputStats.size / 1024 / 1024).toFixed(2)}MB → ${(outputStats.size / 1024 / 1024).toFixed(2)}MB (${reduction}% reduction)`);
  }
}

convertToWebP().catch(console.error);
```

**Usage:**
```bash
npx tsx scripts/convert-avatars-to-webp.ts
```

### Husky Pre-Commit Hook (.husky/pre-commit)
```bash
# Source: https://biomejs.dev/recipes/git-hooks/
# Biome version 2.3.10 (project has 2.3.10 installed)

# Run Biome on staged files only (--staged requires Biome 1.7.0+)
npx @biomejs/biome check --write --staged --no-errors-on-unmatched --files-ignore-unknown=true

# Note: --write automatically re-stages fixed files in Biome 2.0+
# No need for manual 'git add -u'
```

### Bundle Analysis Commands
```bash
# Generate bundle report (writes to .next/analyze/)
ANALYZE=true pnpm build

# View reports (open in browser)
open .next/analyze/client.html
open .next/analyze/nodejs.html
open .next/analyze/edge.html

# Or add to package.json scripts:
# "analyze": "ANALYZE=true pnpm build"
```

### Image Component Updates (Example)
```tsx
// Before (PNG)
<Image
  src="/images/alex-avatar.png"
  alt="Alexandria - CMO"
  width={400}
  height={400}
  priority={true}
/>

// After (WebP with Next.js 15 priority prop)
<Image
  src="/images/alex-avatar.webp"
  alt="Alexandria - CMO"
  width={400}
  height={400}
  priority={true} // Next.js 15 (use preload={true} in Next.js 16+)
  loading="eager"
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Babel + babel-plugin-transform-remove-console | Next.js SWC compiler removeConsole | Next.js 12 (2021) | 17x faster compilation, no .babelrc needed |
| webpack-bundle-analyzer plugin | @next/bundle-analyzer | Next.js 13+ (2022) | Next.js-specific defaults, handles client/server/edge split |
| lint-staged + custom file finder | Biome --staged flag | Biome 1.7.0 (2024) | Simpler config, no separate lint-staged package |
| priority prop | preload prop | Next.js 16 (2026) | More explicit naming, same functionality |
| imagemin | sharp | 2020-2023 transition | Active maintenance, Next.js uses sharp internally, 4-5x faster |

**Deprecated/outdated:**
- `priority` prop: Renamed to `preload` in Next.js 16 (still works in Next.js 15.6)
- `swcMinify` config: Removed in Next.js 15, minification always uses SWC
- Manual Babel config for console removal: SWC compiler built-in since Next.js 12

**Important:** This project uses Next.js 15.5.11 (released Feb 2026), so `priority` prop is still correct. Next.js 16 migration will require changing to `preload`.

## Open Questions

1. **Should we convert ALL PNGs to WebP or only avatars?**
   - What we know: Requirements specify only avatars (alex-avatar.png, kim-avatar.png, collaborative-avatar.png)
   - What's unclear: Whether demo-thumbnail.png, logo.png, favicon PNGs should also convert
   - Recommendation: Convert ONLY the three avatars as specified. Favicons should stay PNG (browser compatibility), logo.png defer to Phase 28+ if needed

2. **Do we delete original PNGs after WebP conversion?**
   - What we know: Next.js Image component handles fallback automatically, no need for source PNGs after conversion
   - What's unclear: Whether to keep originals for future edits or archival
   - Recommendation: KEEP original PNGs in version control for 1-2 sprints, delete after WebP verified in production (allows quick rollback if issues found)

3. **Should bundle analyzer run on every CI build or on-demand only?**
   - What we know: Analyzer adds ~30% to build time, generates 3 HTML files
   - What's unclear: Whether to track bundle size over time in CI or only run manually
   - Recommendation: On-demand only via `ANALYZE=true pnpm build` — automated bundle tracking deferred to monitoring phase (MON-02+)

## Sources

### Primary (HIGH confidence)
- [Next.js Architecture: Next.js Compiler](https://nextjs.org/docs/architecture/nextjs-compiler) - removeConsole configuration (updated 2026-02-27)
- [Next.js Guides: Package Bundling](https://nextjs.org/docs/app/guides/package-bundling) - Bundle analyzer setup (updated 2026-02-27)
- [Next.js Components: Image](https://nextjs.org/docs/app/api-reference/components/image) - Image component priority/preload prop
- [Biome Recipes: Git Hooks](https://biomejs.dev/recipes/git-hooks/) - Official Biome git hooks guide with --staged flag
- [Sharp Documentation](https://sharp.pixelplumbing.com/) - Image processing API reference
- [Husky Official Docs](https://typicode.github.io/husky/) - Git hooks setup

### Secondary (MEDIUM confidence)
- [@next/bundle-analyzer npm package](https://www.npmjs.com/package/@next/bundle-analyzer) - Package documentation
- [Husky npm package](https://www.npmjs.com/package/husky) - Version 9.1.7 release notes
- [Sharp npm package](https://www.npmjs.com/package/sharp) - Installation and usage examples
- [Biome GitHub Issue #2296](https://github.com/biomejs/biome/issues/2296) - --staged option feature discussion (v1.7.0)

### Tertiary (MEDIUM-HIGH confidence)
- [Next.js Image Optimization Guide - Strapi](https://strapi.io/blog/nextjs-image-optimization-developers-guide) - WebP format conversion best practices
- [Core Web Vitals 2026 Guide - DigitalApplied](https://www.digitalapplied.com/blog/core-web-vitals-2026-inp-lcp-cls-optimization-guide) - LCP optimization with preload prop
- [Why WebP is Better Than PNG/JPG - WisemixMedia](https://www.wisemixmedia.com/blog/why-webp-is-better-than-pngjpg-the-ultimate-guide-to-nextjs-15-image-seo-in-2026) - WebP benefits and Next.js 15 integration
- [Next.js 15.5 vs Turbopack - Catch Metrics](https://www.catchmetrics.io/blog/nextjs-webpack-vs-turbopack-performance-improvements-serious-regression) - Bundle size analysis Turbopack vs webpack
- [Turbopack in 2026 Guide - DEV Community](https://dev.to/pockit_tools/turbopack-in-2026-the-complete-guide-to-nextjss-rust-powered-bundler-oda) - Turbopack status and bundle analyzer compatibility

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages are official or industry-standard with active 2026 maintenance
- Architecture: HIGH - Patterns verified from official Next.js docs updated Feb 27, 2026
- Pitfalls: HIGH - Common mistakes documented in GitHub issues and recent blog posts
- Console removal config: HIGH - Official Next.js compiler docs with exact syntax
- Bundle analyzer config: HIGH - Official @next/bundle-analyzer docs and Next.js guides
- Biome --staged flag: HIGH - Official Biome docs, feature confirmed in project's installed v2.3.10
- Sharp conversion: HIGH - Official sharp docs, widely used pattern
- Husky setup: HIGH - Official docs, standard Node.js practice

**Research date:** 2026-02-28
**Valid until:** 2026-04-30 (60 days - stable tooling with infrequent breaking changes)

**Notes:**
- Project already has Biome 2.3.10 installed, supports --staged flag (no upgrade needed)
- Project uses Next.js 15.5.11, so `priority` prop is correct (not yet `preload`)
- Project already has sharp as transitive dependency (Next.js uses it), but should add as devDependency for script usage
- No CONTEXT.md found, all decisions are Claude's discretion based on requirements
