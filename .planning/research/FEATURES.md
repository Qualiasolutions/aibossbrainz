# Feature Landscape

**Domain:** Performance Optimization & Code Quality (Audit Remediation)
**Researched:** 2026-02-28

## Table Stakes

Features users expect. Missing = product feels incomplete or unprofessional.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Image optimization (WebP/AVIF) | Industry standard 2026. 60-80% file size reduction. User expectations for <2.5s LCP. | Low | Next.js `<Image>` component already in use (24 files verified). Need to compress 4.2MB unoptimized avatars. |
| Font optimization & subsetting | Zero layout shift, no external network requests. Google Core Web Vitals requirement (CLS <0.1). | Low | Next.js `next/font` with Geist already configured. Need to verify subsetting for production. |
| Structured logging in production | Debugging production issues without structured logs is nearly impossible. Industry standard 2026. | Low | Pino already installed. 20 console.error calls need migration to structured format. |
| Code splitting / lazy loading | Expected for modern React apps. Reduces initial bundle size 40-60%. INP <200ms requirement. | Low | Already implemented for 3 heavy components. Need to audit client bundles and target >50KB components. |
| Linting automation | Prevents errors before deployment. Standard in all professional codebases. | Low | Biome 2.3.10 already installed (Ultracite wrapper). 1 lint error needs fixing. |
| Clean console output | Console noise signals unprofessionalism. Production apps should have zero console spam. | Low | 20 console.error instances scattered across codebase. |
| Maintainable file sizes | Files >1000 lines are red flags for code smell, hard to navigate, high bug risk. | Medium | 4 files exceed 1000 lines: admin/landing-page (1540L), icons.tsx (1274L), database.types.ts (1234L), onboarding-modal.tsx (1059L). |

## Differentiators

Features that set product apart. Not expected, but valued when implemented well.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Real-time performance monitoring dashboard | Proactive issue detection. Shows RES score, LCP/CLS/INP tracking, budget alerts. | Medium | Vercel Analytics + Speed Insights already integrated. Need custom dashboard for audit metrics. |
| Automated bundle size budgets | Prevents performance regressions. CI fails if bundle exceeds threshold. | Medium | Next.js supports `bundleSizeOptimizations` in Sentry config (already present). Need CI integration. |
| Pre-commit lint enforcement | Catch errors at commit time, not deployment time. Prevents broken code from entering repo. | Low | Biome supports git hooks. Add to Husky or simple git hook. |
| Intelligent image format selection (WebP fallback to AVIF) | Serve AVIF to modern browsers (91% compression), WebP to older ones (81-88% reduction). | Medium | Next.js supports automatic format negotiation. Need to configure `formats` option. |
| Component performance profiling | Identify slow renders during development. Faster iteration on performance issues. | Medium | React DevTools Profiler + custom logging wrapper for heavy components. |
| Font preloading with display:swap | Eliminates FOIT (Flash of Invisible Text). Improves perceived load time. | Low | Next.js `next/font` supports this. Verify configuration includes `display: 'swap'`. |
| Request-level performance tracking | Per-API route latency monitoring with P50/P95/P99 metrics. | High | Requires OpenTelemetry integration (already installed but unused). |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Custom image CDN integration | Next.js Image Optimization via Vercel is sufficient. Custom CDN adds complexity, cost, minimal benefit. | Use built-in Next.js Image Optimization with Vercel's CDN (already configured). |
| Aggressive code minification beyond defaults | Diminishing returns. Next.js production builds already minify aggressively. Custom tools risk breaking code. | Trust Next.js built-in Terser/SWC minification. |
| Client-side image compression | Increases client bundle size, poor UX on slow devices. Defeats purpose of optimization. | Compress images at build time or via serverless function. |
| Universal lazy loading (all components) | Over-optimization. Lazy loading above-the-fold components HURTS LCP. Only lazy load below-fold or heavy components. | Target >50KB components not in initial viewport. Keep critical path synchronous. |
| Winston logging migration | Pino already installed and 5x faster. Winston adds overhead with minimal benefit for this use case. | Stick with Pino. Already a dependency (package.json:71). |
| Custom build performance tooling | Vercel provides build analytics. Next.js provides built-in bundle analyzer. | Use `ANALYZE=true pnpm build` with Next.js built-in analyzer. |
| Font icon libraries (FontAwesome, etc.) | Heavy bundles (300KB+), icon fonts cause layout shift. SVG icons are modern standard. | Already using Phosphor Icons React (package.json:29) and Lucide React (package.json:63). Keep SVG approach. |
| Splitting database.types.ts (1234L) | Auto-generated file from Supabase. Splitting breaks generator. | Leave as-is. Exclude from large file metrics. |

## Feature Dependencies

```
Image optimization
  → WebP/AVIF conversion (requires build-time compression or Vercel Blob storage)
  → next/image priority prop (for LCP candidates)
  → Dimension specification (prevents CLS)

Code splitting
  → Bundle analysis (identify heavy components)
  → React.lazy + Suspense (already available)
  → Dynamic imports (already used for jsPDF, html2canvas, ExcelJS per audit)

Structured logging
  → Pino configuration (already installed)
  → Log level environment variables
  → Request ID correlation (middleware already generates, need to use in routes)

Lint automation
  → Biome configuration (already present via Ultracite)
  → Pre-commit hooks (Husky or git hook)
  → CI integration (GitHub Actions already configured)

File splitting
  → Domain analysis (identify responsibility boundaries)
  → Import/export refactoring
  → TypeScript type extraction (types.ts per domain)

Performance monitoring
  → Vercel Analytics (already integrated)
  → Custom metrics collection (Web Vitals API)
  → OpenTelemetry instrumentation (installed, not configured)
```

## MVP Recommendation

Prioritize (based on audit impact + complexity):

1. **Fix lint error + enforce via pre-commit** (Table Stakes, Low complexity)
   - Immediate CI reliability improvement
   - Prevents future errors

2. **Migrate 20 console.error to Pino** (Table Stakes, Low complexity)
   - Production debugging capability
   - Sentry correlation via request IDs

3. **Compress 4.2MB avatar images to WebP** (Table Stakes, Low complexity)
   - Largest single performance win
   - Directly improves LCP metric

4. **Split 3 large files** (Table Stakes, Medium complexity)
   - admin/landing-page/page.tsx (1540L) → extract sections to components
   - icons.tsx (1274L) → split by category or use icon library re-exports
   - onboarding-modal.tsx (1059L) → extract steps to separate components
   - Skip database.types.ts (auto-generated, can't split)

5. **Lazy load remaining heavy components >50KB** (Table Stakes, Low complexity)
   - Bundle size reduction
   - Improves INP metric

Defer:

- **Real-time performance dashboard**: Vercel Analytics sufficient for now. Build custom dashboard in Phase 2 if metrics show need.
- **Request-level performance tracking**: OpenTelemetry integration is HIGH complexity. Defer until observability becomes pain point.
- **Component performance profiling**: Development-time tool. Not production-critical. Use React DevTools manually as needed.
- **Automated bundle size budgets**: Nice-to-have. Manual monitoring via `ANALYZE=true pnpm build` sufficient for MVP.

## Implementation Patterns

### Image Optimization Pattern (Next.js 15)

```typescript
// components/avatar.tsx
import Image from 'next/image'

export function Avatar({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={48}
      height={48}
      priority={false} // Only true for LCP candidate (hero images)
      quality={85} // Default 75, increase for avatars
      sizes="48px" // Tells Next.js exact size for mobile-friendly delivery
    />
  )
}
```

**For existing 4.2MB avatars:**
- Option 1: Pre-compress with TinyPNG/Squoosh (91% reduction with AVIF per benchmark)
- Option 2: Upload to Vercel Blob, let Next.js optimize on-demand
- Option 3: Build-time compression script in `scripts/optimize-images.ts`

**LCP targets:** <2.5s (current Core Web Vitals 2026)
**File size reduction:** 60-91% (WebP: 81-88%, AVIF: 91% per 2026 benchmarks)

### Font Optimization Pattern (Next.js 15)

```typescript
// app/layout.tsx (already using Geist)
import { GeistSans, GeistMono } from 'geist/font'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

**Verification needed:**
- Check if `subsets: ['latin']` specified (reduces font file size)
- Verify `display: 'swap'` configured (prevents FOIT)
- Confirm fonts are preloaded (Next.js does this automatically)

**CLS target:** <0.1 (highest pass rate per audit data)

### Lazy Loading Pattern (React 19)

```typescript
// components/heavy-component.tsx
import { lazy, Suspense } from 'react'

const HeavyChart = lazy(() => import('./heavy-chart'))

export function DashboardWithChart() {
  return (
    <Suspense fallback={<div>Loading chart...</div>}>
      <HeavyChart />
    </Suspense>
  )
}
```

**Targeting candidates:**
- Components >50KB (per production benchmark guidance)
- Below-the-fold components (avoid hurting LCP)
- Admin-only features (most users never see)

**Current state:** jsPDF, html2canvas, ExcelJS, SyntaxHighlighter already lazy loaded (audit verified)

**Next targets:** Check bundle for CodeMirror, ProseMirror editors (only used in document artifacts)

### Structured Logging Pattern (Pino)

```typescript
// lib/logger.ts (already configured)
import pino from 'pino'
import 'pino-pretty' // dev dependency already installed

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV === 'development' && {
    transport: { target: 'pino-pretty' }
  })
})

// Usage in API routes
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  const requestId = req.headers.get('x-request-id')

  logger.info({ requestId, userId: user.id }, 'Chat request started')

  try {
    // ...
  } catch (error) {
    logger.error({ requestId, userId: user.id, error }, 'Chat request failed')
    // Remove: console.error('Chat failed:', error)
  }
}
```

**Migration checklist:**
- Replace 20 console.error calls
- Add request ID correlation (middleware already generates in `lib/logger.ts:9`)
- Configure log levels per environment
- Integrate with Sentry breadcrumbs

**Performance:** Pino is 5x faster than Winston (per 2026 benchmarks)

### Lint Automation Pattern (Biome via Ultracite)

```bash
# Current commands (already in package.json)
pnpm lint    # npx ultracite@latest check
pnpm format  # npx ultracite@latest fix

# Pre-commit hook (.husky/pre-commit or .git/hooks/pre-commit)
#!/bin/sh
npx ultracite@latest check --staged || exit 1
```

**Biome advantages over ESLint (2026):**
- 56x faster (0.8s vs 45.2s on 10K files per benchmark)
- 40x faster formatting (0.3s vs 12.1s per benchmark)
- Single tool (linter + formatter)
- 423+ rules (includes typescript-eslint rules)

**Current state:** Biome 2.3.10 via Ultracite 6.5.0 (package.json:101,116)
**Action needed:** Fix 1 lint error, add pre-commit hook

### File Splitting Pattern (TypeScript)

**Feature-first structure (2026 best practice):**

**File 1: admin/landing-page/page.tsx (1540L)**
```
app/(admin)/admin/landing-page/
  ├── page.tsx            (orchestrator, <200L)
  ├── components/
  │   ├── hero-section.tsx
  │   ├── features-grid.tsx
  │   ├── testimonials.tsx
  │   ├── pricing-table.tsx
  │   └── cta-section.tsx
  └── types.ts            (shared types)
```

**File 2: components/icons.tsx (1274L)**
```
components/icons/
  ├── index.ts            (re-export all)
  ├── navigation.tsx      (nav-related icons)
  ├── actions.tsx         (button icons)
  ├── status.tsx          (badges, indicators)
  └── brand.tsx           (logos, social)
```

**File 3: components/onboarding-modal.tsx (1059L)**
```
components/onboarding/
  ├── onboarding-modal.tsx       (orchestrator, <200L)
  ├── steps/
  │   ├── welcome-step.tsx
  │   ├── team-intro-step.tsx
  │   ├── profile-step.tsx
  │   └── success-step.tsx
  └── types.ts
```

**Skip:** `lib/supabase/database.types.ts` (1234L) — auto-generated via `pnpm gen:types`, cannot split

**Splitting strategy:**
1. Identify responsibility boundaries (steps, sections, categories)
2. Extract components to separate files
3. Export types to `types.ts` per domain
4. Re-export from parent for backward compatibility
5. Run `npx tsc --noEmit` to verify no breakage

### Bundle Analysis Pattern (Next.js)

```bash
# Next.js built-in analyzer
ANALYZE=true pnpm build

# Generates report showing:
# - Client bundle size by route
# - Shared chunks
# - Heavy dependencies
```

**Targets for lazy loading:**
- Look for components >50KB
- Exclude components in critical render path
- Focus on admin routes, authenticated features

**Current optimizations (next.config.ts:6-33):**
- Tree-shaking via `optimizePackageImports` for 22 libraries
- Includes: framer-motion, lucide-react, codemirror, prosemirror-*, radix-ui/*

**Sentry bundle optimization (next.config.ts:95-97):**
- `excludeDebugStatements: true` already configured

## Performance Targets (Core Web Vitals 2026)

| Metric | Target | Good | Poor | Current Project Status |
|--------|--------|------|------|------------------------|
| **LCP** (Largest Contentful Paint) | <1.5s (aspirational) | <2.5s | >4.0s | Unknown. Need measurement. 4.2MB avatars likely hurt LCP. |
| **INP** (Interaction to Next Paint) | <100ms (aspirational) | <200ms | >500ms | 43% of sites fail INP. Code splitting needed. |
| **CLS** (Cumulative Layout Shift) | <0.05 (aspirational) | <0.1 | >0.25 | Likely passing (images use next/image, fonts optimized). |

**Measurement requirement:** 75th percentile (p75) of real user data must pass thresholds.

**Google ranking impact:** Pages passing all three thresholds receive SEO boost over pages that fail.

**Current project advantages:**
- Images already using `next/image` (24 files verified in audit)
- Fonts optimized via `next/font` with Geist
- Heavy deps dynamically imported (jsPDF, html2canvas, ExcelJS, SyntaxHighlighter)

**Gaps to address:**
- Compress 4.2MB avatars
- Measure real LCP/INP/CLS with Vercel Speed Insights (already installed)
- Lazy load remaining >50KB components

## Complexity Assessment

| Feature Category | Effort | Risk | Business Impact |
|------------------|--------|------|-----------------|
| Image optimization | 2-4 hours | Low | HIGH (LCP improvement, 60-91% file size reduction) |
| Font subsetting verification | 1 hour | Low | MEDIUM (CLS prevention, perceived performance) |
| Console.error → Pino migration | 3-5 hours | Low | HIGH (production debugging, Sentry correlation) |
| Lint automation + pre-commit | 1-2 hours | Low | MEDIUM (prevents future errors) |
| File splitting (3 files) | 8-12 hours | MEDIUM | MEDIUM (maintainability, long-term velocity) |
| Lazy loading audit + implementation | 3-6 hours | Low | MEDIUM (bundle size, INP improvement) |
| Performance monitoring dashboard | 10-15 hours | MEDIUM | LOW (Vercel Analytics already covers basics) |

**Total MVP effort:** 18-30 hours (excluding performance dashboard)

**Highest ROI features:**
1. Image optimization (4 hours, HIGH impact)
2. Structured logging migration (5 hours, HIGH impact)
3. Lint automation (2 hours, MEDIUM impact)

## Sources

### Image Optimization
- [Getting Started: Image Optimization | Next.js](https://nextjs.org/docs/app/getting-started/images)
- [Next.js Image Component: Performance and CWV in Practice - Pagepro](https://pagepro.co/blog/nextjs-image-component-performance-cwv/)
- [Next.js Image Optimization Techniques 2026 | Web Peak](https://webpeak.org/blog/nextjs-image-optimization-techniques/)
- [JPEG vs WebP vs AVIF in WordPress Real Benchmark Data | Dev Journal](https://earezki.com/ai-news/2026-02-26-jpeg-vs-webp-vs-avif-in-wordpress-real-benchmark-data-4-plugins-tested/)
- [TinyPNG – Compress AVIF, WebP, PNG and JPEG images](https://tinypng.com/)
- [ShortPixel Image Optimizer](https://shortpixel.com/)

### Code Splitting & Lazy Loading
- [React Stack Patterns](https://www.patterns.dev/react/react-2026/)
- [Code-Splitting – React](https://legacy.reactjs.org/docs/code-splitting.html)
- [Guides: Lazy Loading | Next.js](https://nextjs.org/docs/app/guides/lazy-loading)
- [How to Configure React Lazy Loading](https://oneuptime.com/blog/post/2026-01-24-configure-react-lazy-loading/view)
- [How to Implement Lazy Loading Patterns](https://oneuptime.com/blog/post/2026-01-25-lazy-loading-patterns/view)

### Font Optimization
- [Getting Started: Font Optimization | Next.js](https://nextjs.org/docs/app/getting-started/fonts)
- [App Router: Optimizing Fonts and Images | Next.js](https://nextjs.org/learn/dashboard-app/optimizing-fonts-images)
- [Next.js fonts: How to optimize Google fonts and custom fonts | Contentful](https://www.contentful.com/blog/next-js-fonts/)

### Structured Logging
- [Structured logging for Next.js](https://blog.arcjet.com/structured-logging-in-json-for-next-js/)
- [A Complete Guide to Pino Logging in Node.js | Better Stack](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/)
- [Pino Logger: Complete Node.js Guide with Examples [2026] | SigNoz](https://signoz.io/guides/pino-logger/)
- [Node.js Logging Best Practices: Winston Morgan Pino Guide](https://nareshit.com/blogs/nodejs-logging-best-practices-winston-morgan-pino)
- [Biome vs ESLint: Comparing JavaScript Linters and Formatters | Better Stack](https://betterstack.com/community/guides/scaling-nodejs/biome-eslint/)

### Linting & Code Quality
- [GitHub - biomejs/biome](https://github.com/biomejs/biome)
- [Biome vs ESLint: The Ultimate 2025 Showdown | Medium](https://medium.com/@harryespant/biome-vs-eslint-the-ultimate-2025-showdown-for-javascript-developers-speed-features-and-3e5130be4a3c)
- [Biome: The ESLint and Prettier Killer? Complete Migration Guide for 2026 - DEV](https://dev.to/pockit_tools/biome-the-eslint-and-prettier-killer-complete-migration-guide-for-2026-27m)

### File Splitting & Refactoring
- [Ultimate TypeScript Project Structure for 2026 Full-Stack Apps | Medium](https://medium.com/@mernstackdevbykevin/an-ultimate-typescript-project-structure-2026-edition-4a2d02faf2e0)
- [Refactoring by Breaking Functions Apart: a TypeScript Experiment](https://auth0.com/blog/refactoring-breaking-functions-apart-typescript/)
- [5 AI Tools for Code Refactoring and Optimization [2026] | Second Talent](https://www.secondtalent.com/resources/ai-tools-for-code-refactoring-and-optimization/)

### Performance Metrics
- [Core Web Vitals 2026: INP, LCP & CLS Optimization](https://www.digitalapplied.com/blog/core-web-vitals-2026-inp-lcp-cls-optimization-guide)
- [Understanding Core Web Vitals and Google search results | Google](https://developers.google.com/search/docs/appearance/core-web-vitals)
- [What Are the Core Web Vitals? LCP, INP & CLS Explained (2026)](https://www.corewebvitals.io/core-web-vitals)
- [How to Improve Website Performance: LCP, INP, and CLS Explained | Medium](https://medium.com/@mohamedyasser.10011/how-to-improve-website-performance-lcp-inp-and-cls-explained-7e3a6b591e65)
