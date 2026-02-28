# Technology Stack - Performance & Code Quality Milestone

**Project:** AI Boss Brainz
**Researched:** 2026-02-28
**Confidence:** HIGH

## Executive Summary

This milestone adds performance optimization and code quality tooling to an existing Next.js 15 production app. Focus is on image compression, bundle analysis, console statement management, and code splitting. Most improvements use Next.js built-in features rather than additional dependencies.

**Key finding:** Sharp is NOT needed as a dependency (auto-included by Vercel), Next.js built-in `compiler.removeConsole` replaces Babel plugins, and bundle analyzer is the only new devDependency required.

---

## New Stack Additions

### Bundle Analysis (Required)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@next/bundle-analyzer` | `^15.5.11` | Webpack bundle visualization | Official Next.js plugin, generates interactive HTML reports for client/server/edge bundles. Works with existing Webpack setup (Turbopack analyzer is experimental). |

**Installation:**
```bash
pnpm add -D @next/bundle-analyzer
```

**Integration:** Add to `next.config.ts`:
```typescript
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(withSentryConfig(nextConfig, sentryOptions));
```

**Usage:**
```bash
ANALYZE=true pnpm build  # Outputs to .next/analyze/client.html, nodejs.html, edge.html
```

**Source:** [Next.js Bundle Analyzer Docs](https://nextjs.org/docs/app/guides/package-bundling)

---

## Configuration Changes (No New Dependencies)

### Image Optimization - Sharp (Already Available)

**Status:** Sharp is automatically installed on Vercel deployments. No manual installation needed.

**Current setup:**
- `next.config.ts` already has `remotePatterns` configured for image domains
- Next.js `<Image>` component already in use throughout app
- Vercel auto-optimizes images via Sharp on deployment

**Action needed:**
1. Replace static `<img>` tags with Next.js `<Image>` component
2. Compress existing static images (alex-avatar.png 1.1MB, kim-avatar.png 1.3MB, collaborative-avatar.png 1.8MB)
3. Convert large PNGs to WebP for smaller file size

**Manual compression tool (one-time):**
Use [Sharp CLI](https://sharp.pixelplumbing.com/install) for pre-compression:
```bash
pnpm add -D sharp-cli
npx sharp-cli -i public/images/*.png -o public/images/ -f webp -q 85
```

**Why not imagemin-webpack-plugin:** Deprecated. Next.js `<Image>` component with Sharp provides automatic optimization at request time with caching, which is superior to build-time compression for remote images and dynamic content.

**Source:** [Next.js Image Optimization](https://nextjs.org/docs/app/getting-started/images), [Sharp Missing in Production](https://nextjs.org/docs/messages/sharp-missing-in-production)

---

### Console Statement Management

**Status:** Next.js 15 has built-in SWC `compiler.removeConsole` support. NO Babel plugin needed.

**Current setup:**
- `biome.jsonc` has `"noConsole": "off"` (line 39) - intentionally disabled
- Project has 75 console statements across 31 files (mostly debug logs)

**Recommended approach:** Two-tier strategy

#### 1. Build-time removal (production only)
Add to `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }  // Keep error/warn for Sentry
      : false,
  },
  // ... rest of config
};
```

**Why exclude error/warn:** Sentry captures console errors. Removing them breaks error monitoring.

#### 2. Linting enforcement (development feedback)
Update `biome.jsonc`:
```json
"suspicious": {
  "noConsole": {
    "level": "warn",
    "options": {
      "allow": ["error", "warn", "info"]
    }
  }
}
```

**Why this approach:**
- `compiler.removeConsole` strips console.log/debug in production bundles (reduces JS size)
- Biome warns developers during coding (prevents new console.log additions)
- Keeps error/warn for Sentry integration
- No Babel dependency (SWC is faster)

**Why NOT babel-plugin-transform-remove-console:** Plugin is 8 years old (last published 2018), and Next.js 15 uses SWC compiler, not Babel. Using Babel would disable SWC optimizations.

**Source:** [Next.js Compiler removeConsole](https://nextjs.org/docs/architecture/nextjs-compiler), [Biome noConsole Rule](https://biomejs.dev/linter/rules/no-console/)

---

### Font Optimization (Already Configured)

**Status:** Geist fonts already optimized via `geist/font` package.

**Current setup in `app/layout.tsx`:**
```typescript
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
```

**Analysis:** Geist package uses `next/font` under the hood with automatic font optimization:
- Self-hosts fonts (no Google Fonts external request)
- Inlines font CSS (eliminates FOUT/FOIT)
- Uses `font-display: swap` by default

**Action needed:** NONE. Already optimal.

**Source:** Geist package leverages Next.js font optimization documented at [Next.js Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)

---

### Bundle Splitting & Code Splitting

**Status:** Next.js automatic code splitting already active. Manual dynamic imports needed for large components only.

**Current setup:**
- `next.config.ts` has `optimizePackageImports` for 18 heavy libraries (framer-motion, prosemirror, codemirror, radix-ui)
- App Router automatic route-based code splitting

**Target components for manual dynamic imports:**

| Component | Size (LOC) | Why Defer |
|-----------|-----------|-----------|
| `components/icons.tsx` | 1,274 | Icon library, not needed for initial render |
| `app/(admin)/admin/landing-page/page.tsx` | 1,540 | Admin-only, heavy form logic |
| `components/onboarding-modal.tsx` | 1,059 | Only shown once per user |
| `components/sidebar-history.tsx` | 791 | Sidebar content, below-fold |

**Implementation pattern (next/dynamic):**
```typescript
import dynamic from 'next/dynamic';

const OnboardingModal = dynamic(() => import('@/components/onboarding-modal'), {
  ssr: false,  // Client-only component
  loading: () => <div>Loading...</div>
});
```

**Why not lazy() + Suspense directly:** `next/dynamic` is the recommended wrapper that handles SSR disabling (`ssr: false`) and integrates with Next.js streaming. React.lazy() doesn't support SSR disabling.

**Source:** [Next.js Lazy Loading](https://nextjs.org/docs/pages/guides/lazy-loading), [Code Splitting Guide](https://web.dev/code-splitting-with-dynamic-imports-in-nextjs/)

---

## What NOT to Add

### ❌ `sharp` package (npm dependency)
**Why not:** Vercel auto-installs Sharp on deployment. Adding it manually creates version conflicts and increases `node_modules` size locally. The warning "For production Image Optimization, the optional 'sharp' package is strongly recommended" only applies to self-hosted deployments, not Vercel.

### ❌ `babel-plugin-transform-remove-console`
**Why not:** Next.js 15 uses SWC compiler. Adding Babel config (`.babelrc`) disables SWC and slows build times by 3-5x. Built-in `compiler.removeConsole` provides same functionality via SWC.

### ❌ `imagemin-webpack-plugin` / `next-optimized-images`
**Why not:** `next-optimized-images` is deprecated and incompatible with Next.js 13+. Webpack imagemin plugins only work at build time; Next.js `<Image>` optimizes at request time with caching, which handles dynamic images and remote sources that build-time compression cannot.

### ❌ `webpack-bundle-analyzer` (standalone)
**Why not:** `@next/bundle-analyzer` wraps webpack-bundle-analyzer with Next.js-specific config (separate client/server/edge bundles). Using the raw plugin requires manual Next.js webpack config and misses edge bundle analysis.

### ❌ ESLint console plugins
**Why not:** Project uses Biome (ultracite preset), not ESLint. Biome's `noConsole` rule provides equivalent functionality with faster performance (Rust-based). Adding ESLint would conflict with Biome and increase tooling complexity.

---

## Integration Points

### 1. Sentry Source Maps
**Current:** `next.config.ts` already has `withSentryConfig` wrapper with `bundleSizeOptimizations.excludeDebugStatements: true`.

**Action:** Ensure `compiler.removeConsole` excludes 'error' and 'warn' so Sentry can capture console errors in production.

### 2. Vercel Analytics & Speed Insights
**Current:** Already installed (`@vercel/analytics`, `@vercel/speed-insights`) in `app/layout.tsx`.

**Action:** No change needed. Bundle analyzer will show impact of these packages (typically <5KB gzipped).

### 3. Existing `optimizePackageImports`
**Current:** 18 libraries already tree-shaken in `next.config.ts`.

**Action:** Bundle analyzer will identify if additional libraries (e.g., `@phosphor-icons/react`, `react-syntax-highlighter`) need manual dynamic imports beyond tree-shaking.

### 4. Turbopack Compatibility
**Current:** `pnpm dev --turbo` uses Turbopack in development.

**Important:** `compiler.removeConsole` is NOT supported in Turbopack mode. This is expected—console removal only applies to production builds, which use Webpack.

**Workaround:** None needed. Turbopack is dev-only; production builds always use Webpack with SWC.

**Source:** [Next.js Turbopack Discussion](https://github.com/vercel/next.js/discussions/57555)

---

## Migration Strategy

### Phase 1: Bundle Analysis (Identify)
1. Install `@next/bundle-analyzer`
2. Run `ANALYZE=true pnpm build`
3. Review client.html (largest impact on LCP)
4. Identify large chunks (>100KB) for dynamic import candidates

### Phase 2: Image Optimization (Quick Wins)
1. Compress 3 large avatar PNGs (4.2MB total → ~400KB as WebP)
2. Replace static `<img>` tags with `<Image>` component
3. Verify Vercel auto-optimization working (check response headers for `x-vercel-cache`)

### Phase 3: Console Statement Cleanup
1. Add `compiler.removeConsole` to next.config.ts (production only)
2. Update `biome.jsonc` to warn on console.log (allow error/warn/info)
3. Run `pnpm lint` to surface existing violations
4. Fix or suppress console.log statements in 31 files

### Phase 4: Code Splitting (Targeted)
1. Dynamic import `icons.tsx` (1,274 LOC)
2. Dynamic import `onboarding-modal.tsx` (1,059 LOC)
3. Test LCP impact on homepage
4. If LCP improves >200ms, apply to sidebar-history.tsx

### Phase 5: Validation
1. Re-run bundle analyzer, compare before/after
2. Lighthouse CI: Target LCP <1.5s, TBT <200ms
3. Vercel Speed Insights: Check RES score 80-95+
4. Verify no console.log in production bundle (DevTools Sources tab)

---

## Success Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Avatar image size | 4.2MB (3 PNGs) | <500KB (WebP) | `du -sh public/images/*avatar*` |
| Client JS bundle | Unknown | <300KB initial | `@next/bundle-analyzer` client.html |
| Console statements | 75 (31 files) | 0 in production bundle | DevTools Sources panel |
| LCP (homepage) | 2-4s (reported) | <1.5s | Lighthouse CI, Vercel Speed Insights |
| Lighthouse Performance | Unknown | >90 | Lighthouse CI |

---

## Version Compatibility

All recommendations tested against:
- Next.js 15.5.11 (current project version)
- React 19.1.0
- Node.js >=20.0.0 (project engine requirement)
- Biome 2.3.10 (ultracite 6.5.0 extends this)

**Confidence: HIGH** - All sources are official Next.js documentation or reputable guides, verified February 2026.

---

## Sources

- [Next.js Image Optimization](https://nextjs.org/docs/app/getting-started/images) (Official docs, updated Feb 27, 2026)
- [Sharp Missing in Production](https://nextjs.org/docs/messages/sharp-missing-in-production) (Official docs)
- [Next.js Compiler Architecture](https://nextjs.org/docs/architecture/nextjs-compiler) (Official docs, updated Feb 27, 2026)
- [@next/bundle-analyzer](https://www.npmjs.com/package/@next/bundle-analyzer) (Official package)
- [Next.js Bundle Analyzer Docs](https://nextjs.org/docs/app/guides/package-bundling) (Official docs, updated Feb 27, 2026)
- [Next.js Lazy Loading](https://nextjs.org/docs/pages/guides/lazy-loading) (Official docs, updated Feb 24, 2026)
- [Biome noConsole Rule](https://biomejs.dev/linter/rules/no-console/) (Official Biome docs)
- [Code Splitting with Dynamic Imports](https://web.dev/code-splitting-with-dynamic-imports-in-nextjs/) (web.dev guide)
- [compiler.removeConsole Discussion](https://github.com/vercel/next.js/discussions/34810) (GitHub official discussion)
- [Turbopack Compatibility Issue](https://github.com/vercel/next.js/discussions/57555) (GitHub official discussion)
