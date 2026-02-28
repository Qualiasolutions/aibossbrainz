# Architecture Patterns: Performance & Quality Integration

**Domain:** Next.js 15 + React 19 AI Chatbot Platform
**Researched:** 2026-02-28

## Recommended Architecture

### Integration Model: Incremental Enhancement

Performance and quality improvements integrate as **non-breaking enhancements** to existing architecture. No core system rewrites required.

```
┌─────────────────────────────────────────────────────────────┐
│                     Root Layout (app/layout.tsx)             │
│  - Geist font (already optimized via next/font)             │
│  - Vercel Analytics + Speed Insights (existing)             │
│  + NEW: Dynamic theme-color script (already implemented)    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Marketing   │    │   Chat Layout    │    │  Admin Layout   │
│   Routes     │    │   (authenticated)│    │  (admin only)   │
└──────────────┘    └──────────────────┘    └─────────────────┘
                              │
                    ┌─────────┼──────────┐
                    ▼         ▼          ▼
            ┌─────────────────────────────────────┐
            │ ENHANCEMENT LAYER (NEW)             │
            │ - Dynamic imports for heavy comps   │
            │ - Code splitting for large files    │
            │ - Suspense boundaries (expanded)    │
            │ - Error boundaries (existing)       │
            └─────────────────────────────────────┘
```

### Component Boundaries with Performance Integration

| Component Type | Current State | Enhancement Strategy |
|----------------|---------------|---------------------|
| **Chat Interface** | Static import, client-side | Add Suspense fallback, lazy-load artifact renderers |
| **Executive Switch** | Static import, 3 personas | Already lightweight, no change needed |
| **Large Files** | Monolithic (1540+ lines) | Split into feature modules, dynamic import sections |
| **Icon Library** | 1274-line single file | Extract to icon-specific barrel, tree-shake imports |
| **Onboarding Modal** | 1059 lines, 4-step flow | Split steps into separate components, lazy-load |
| **Admin Dashboard** | Static pages | Dynamic import chart/analytics components |
| **Voice Player** | Inline component | Already uses ElevenLabs streaming, no change |

## Patterns to Follow

### Pattern 1: Progressive Dynamic Imports

**What:** Incrementally add dynamic imports to heavy components without breaking existing functionality.

**When:** Component >200 lines OR uses heavy dependencies (charts, editors, PDF libs).

**Integration Points:**
- Chat layout (`app/(chat)/layout.tsx`) - ALREADY uses dynamic imports for AppSidebar, NetworkStatusBanner, TosPopup
- Subscribe page (`app/(auth)/subscribe/page.tsx`) - ALREADY uses dynamic imports for PaymentSuccess, WelcomeStep
- Account page (`app/(chat)/account/account-client.tsx`) - ALREADY uses dynamic import for ProfileSection

**Example (Existing Pattern):**
```typescript
// FROM: app/(chat)/layout.tsx (lines 5-20)
const AppSidebar = dynamic(() =>
  import("@/components/app-sidebar").then((mod) => ({
    default: mod.AppSidebar,
  })),
);

const NetworkStatusBanner = dynamic(() =>
  import("@/components/network-status-banner").then((mod) => ({
    default: mod.NetworkStatusBanner,
  })),
);
```

**NEW Applications (Admin Dashboard):**
```typescript
// app/(admin)/admin/analytics/page.tsx (NEW)
const AnalyticsDashboard = dynamic(
  () => import("@/components/admin/analytics-dashboard"),
  { loading: () => <AnalyticsLoadingSkeleton /> }
);

const ChartRenderer = dynamic(
  () => import("@/components/admin/chart-renderer"),
  { ssr: false } // Charts rely on window.innerWidth
);
```

**NEW Applications (Large File Splitting):**
```typescript
// app/(admin)/admin/landing-page/page.tsx (1540 lines → split)
// BEFORE: Monolithic component
// AFTER: Feature-based splits

const HeroSection = dynamic(() => import("./sections/hero-section"));
const FeaturesSection = dynamic(() => import("./sections/features-section"));
const PricingSection = dynamic(() => import("./sections/pricing-section"));
const TestimonialsSection = dynamic(() => import("./sections/testimonials-section"));
```

### Pattern 2: Suspense Boundary Expansion

**What:** Wrap dynamic imports in Suspense with loading states.

**When:** Dynamic component takes >100ms to load.

**Current Usage:**
- Root layout: `<Suspense>` wraps children with spinner fallback (app/layout.tsx:77-85)
- Chat layout: Top-level Suspense for authenticated routes

**NEW Integration Points:**
```typescript
// Admin landing page editor (NEW)
<Suspense fallback={<EditorSkeleton />}>
  <LandingPageEditor sections={sections} />
</Suspense>

// Analytics dashboard (NEW)
<Suspense fallback={<DashboardLoadingSkeleton />}>
  <AnalyticsDashboard userId={userId} />
</Suspense>
```

**Loading State Pattern (Existing Style):**
```typescript
// Match existing spinner design from app/(chat)/layout.tsx
<div className="flex h-dvh w-full items-center justify-center">
  <div className="size-8 animate-spin rounded-full border-4 border-stone-200 border-t-rose-500" />
</div>
```

### Pattern 3: Image Optimization (Already Configured)

**What:** Next.js Image component with remote pattern allowlist.

**Current State:** FULLY CONFIGURED
- `next/config.ts` defines remotePatterns for avatar.vercel.sh, Supabase storage, Vercel Blob
- 15 files already use `next/image`

**No Changes Needed.** Continue using existing pattern:
```typescript
import Image from "next/image";

<Image
  src={imageUrl}
  alt="Description"
  width={800}
  height={600}
  priority={isAboveFold} // LCP optimization
/>
```

### Pattern 4: Font Loading (Already Optimized)

**What:** Geist Sans + Mono via `next/font/google`, CSS variables, no FOUT.

**Current Implementation (app/layout.tsx:1-4, 106):**
```typescript
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

<html className={`${GeistSans.variable} ${GeistMono.variable}`}>
```

**STATUS:** COMPLETE. Font loading is production-optimized:
- Self-hosted at build time (no external requests)
- CSS variables for theme switching
- Preloaded for critical rendering path
- No layout shift (size-adjust fallback)

**No Action Required.**

### Pattern 5: Bundle Analysis Integration

**What:** Monitor bundle size after splitting large files.

**Current Tooling:**
- Turbopack for dev (`pnpm dev --turbo`)
- Next.js 15.5.11 (stable Turbopack support)
- Sentry bundle size optimization enabled (next.config.ts:92-96)

**NEW: Add Bundle Analyzer (Webpack Compatibility)**
```bash
# Install
pnpm add -D @next/bundle-analyzer

# next.config.ts modification (ONLY for webpack analysis, not Turbopack)
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withSentryConfig(
  withBundleAnalyzer(nextConfig),
  { /* sentry options */ }
);

# Run analysis (switches to webpack temporarily)
ANALYZE=true pnpm build
```

**CAVEAT:** `@next/bundle-analyzer` does NOT work with Turbopack in dev mode (see GitHub issue #77482). Use for production builds only.

**ALTERNATIVE (Turbopack-native):** Wait for `next analyze` command (PR #85915, targeting Next.js 16.1+).

### Pattern 6: Code Splitting by Route (Automatic)

**What:** Next.js automatically splits by route. No manual intervention.

**Current Implementation:**
- Marketing routes: `app/(marketing)/*.tsx`
- Chat routes: `app/(chat)/*.tsx`
- Admin routes: `app/(admin)/admin/*.tsx`
- Auth routes: `app/(auth)/*.tsx`

**Bundling Strategy (next.config.ts:5-34):**
Already optimized with `experimental.optimizePackageImports` for:
- framer-motion
- lucide-react
- date-fns
- react-syntax-highlighter
- codemirror (and 6 language packs)
- prosemirror (4 packages)
- @phosphor-icons/react
- 7 @radix-ui packages

**No Changes Needed.** Tree-shaking is production-ready.

### Pattern 7: Logging Standardization (98% Coverage)

**What:** Structured logging via Pino, request IDs, context enrichment.

**Current Implementation (lib/logger.ts):**
```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  transport: isDevelopment ? pinoTransport : jsonFormatter,
});

export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({ requestId, ...(userId && { userId }) });
}
```

**Current Coverage (30+ files use logger):**
- All API routes: chat, voice, subscription, support, admin
- All server actions: Stripe, document creation, canvas updates
- Security: input moderation, rate limiting, CSRF validation
- Cost tracking, audit logs, analytics queries

**NEW Integration Points (Quality Improvements):**
```typescript
// Add to file splitting refactors (NEW)
import { logger } from "@/lib/logger";

// Log component splits for performance monitoring
logger.info({
  component: "LandingPageEditor",
  action: "lazy_load",
  section: "features",
}, "Dynamically loaded section");

// Add to ESLint automation (NEW)
logger.warn({
  lintRule: "react-hooks/exhaustive-deps",
  file: filePath,
  autoFixed: true,
}, "ESLint auto-fix applied");
```

### Pattern 8: Error Boundaries (Existing)

**What:** React Error Boundaries for graceful failure recovery.

**Current Implementation (components/error-boundary.tsx):**
- Class-based ErrorBoundary component
- Custom fallback UI with retry button
- `withErrorBoundary` HOC for functional components
- Sentry integration for error tracking

**Used In:**
- Chat interface wrappers (3 files: error-boundary.tsx, chat-with-error-boundary.tsx, chat-error-boundary.tsx)
- Route-level error.tsx files (admin/error.tsx)

**NEW Integration (File Splitting):**
```typescript
// Wrap split components in error boundaries
import { ErrorBoundary } from "@/components/error-boundary";

<ErrorBoundary
  fallback={<SectionErrorFallback section="pricing" />}
  onError={(error) => logger.error({ section: "pricing" }, error)}
>
  <PricingSection />
</ErrorBoundary>
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Over-Splitting Components

**What goes wrong:** Dynamic importing components <50 lines or <5KB adds overhead (extra HTTP requests, Suspense waterfalls).

**Why it happens:** Applying dynamic imports everywhere without measuring.

**Consequences:** Slower initial render, more requests, worse LCP.

**Prevention:**
- Only split components >200 lines OR with heavy deps (charts, PDF, CodeMirror)
- Measure with Lighthouse before/after
- Check Chrome DevTools Network tab for request count

**Detection:** Bundle analyzer shows many tiny chunks (<5KB).

### Anti-Pattern 2: Blocking Server Components with `ssr: false`

**What goes wrong:** Using `dynamic(() => import(), { ssr: false })` on server components that COULD render server-side.

**Why it happens:** Copy-pasting client component patterns to server components.

**Consequences:** Missed SSR benefits, delayed content, worse SEO.

**Prevention:**
- Only use `ssr: false` for browser-dependent components (window, localStorage, audio APIs)
- Voice player, theme toggle, network status banner are valid uses
- Charts that use `window.innerWidth` are valid uses

**Detection:** Suspense fallback shows for components with no browser dependencies.

### Anti-Pattern 3: Template String Imports

**What goes wrong:**
```typescript
// WRONG - Next.js can't analyze this
const Component = dynamic(() => import(`@/components/${name}`));
```

**Why bad:** Next.js build process can't statically analyze template strings. Breaks code splitting.

**Instead:**
```typescript
// CORRECT - Explicit import paths
const Component = dynamic(() => import("@/components/specific-component"));
```

### Anti-Pattern 4: Forgetting Loading States

**What goes wrong:** Dynamic imports without Suspense or loading prop show blank screen during load.

**Why bad:** Poor UX, CLS (Cumulative Layout Shift) issues.

**Instead:**
```typescript
// CORRECT - Always provide loading state
const Heavy = dynamic(() => import("./heavy"), {
  loading: () => <Skeleton />,
});

// OR wrap in Suspense
<Suspense fallback={<Skeleton />}>
  <Heavy />
</Suspense>
```

### Anti-Pattern 5: Mixing Turbopack and Webpack Tooling

**What goes wrong:** Running `@next/bundle-analyzer` in dev mode with `--turbo` flag.

**Why bad:** Bundle analyzer is webpack-specific, causes warnings and incorrect analysis.

**Instead:**
- Use `pnpm dev --turbo` for development (fast HMR)
- Use `ANALYZE=true pnpm build` for bundle analysis (production build, webpack)
- Wait for `next analyze` command (Next.js 16.1+) for Turbopack-native analysis

### Anti-Pattern 6: Splitting Route Handlers

**What goes wrong:** Applying dynamic imports to API route handlers (`app/api/**/route.ts`).

**Why bad:** Route handlers run server-side only, no bundle size benefit. Adds complexity.

**Instead:** Keep route handlers as static imports. Focus splitting on client components only.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Bundle Size** | Current (unoptimized): ~500KB FCP | After splitting: ~300KB FCP, lazy-load artifacts | Route-based CDN caching, aggressive code splitting |
| **Image Delivery** | Next.js Image (existing) | Vercel Image Optimization (existing) | Consider Cloudflare Images or Imgix |
| **Font Loading** | Geist self-hosted (existing) | Same (no external requests) | Same (build-time optimization) |
| **Logging Volume** | Pino JSON (existing) | Ship to Sentry (existing) | Add log aggregation (Datadog/Axiom) |
| **Error Tracking** | Sentry (existing) | Sentry with sampling (90%) | Sentry with adaptive sampling |
| **Rate Limiting** | Redis + DB fallback (existing) | Redis primary (existing) | Redis cluster + Upstash Global |

## Integration Points: New vs. Existing

### NEW Components (To Build)

| Component | Purpose | Integration Point | Depends On |
|-----------|---------|-------------------|------------|
| `components/admin/analytics-dashboard.tsx` | Admin analytics charts | `app/(admin)/admin/analytics/page.tsx` | react-data-grid, existing queries |
| `components/admin/chart-renderer.tsx` | Chart visualization | AnalyticsDashboard | None (client-only) |
| `app/(admin)/admin/landing-page/sections/*.tsx` | Split landing page editor (4-6 files) | `app/(admin)/admin/landing-page/page.tsx` | Existing CMS lib |
| `components/icons/*.tsx` | Split icon library (category-based) | All components using icons | @phosphor-icons/react |
| `components/onboarding/steps/*.tsx` | Split onboarding modal (4 steps) | `components/onboarding-modal.tsx` | Existing User queries |
| `.github/workflows/lint.yml` | ESLint automation CI | GitHub Actions | Ultracite (existing) |
| `scripts/bundle-report.sh` | Bundle size tracking | CI/CD pipeline | @next/bundle-analyzer |

### MODIFIED Components (Existing → Enhanced)

| Component | Current Lines | Modification | New Structure |
|-----------|--------------|--------------|---------------|
| `app/(admin)/admin/landing-page/page.tsx` | 1540 | Extract sections → dynamic imports | Main page + 4-6 section files |
| `components/icons.tsx` | 1274 | Split by category → barrel exports | icons/index.ts + category files |
| `components/onboarding-modal.tsx` | 1059 | Extract steps → lazy-load | Main wrapper + 4 step files |
| `app/(admin)/admin/analytics/page.tsx` | Unknown | Add dynamic chart imports | Keep page, lazy-load charts |
| `next.config.ts` | 99 | Add bundle analyzer wrapper | Conditional bundleAnalyzer |
| `package.json` | 131 | Add bundle analyzer, husky scripts | Add dev dependencies |

### UNCHANGED Components (Already Optimized)

- `app/layout.tsx` - Font loading, Analytics, SpeedInsights ✅
- `app/(chat)/layout.tsx` - Dynamic imports for sidebar, network banner ✅
- `next.config.ts` - optimizePackageImports for 33 packages ✅
- Image components (15 files) - Using next/image ✅
- `lib/logger.ts` - Structured logging (98% coverage) ✅
- Error boundaries - Chat, admin, route-level ✅
- Middleware - Auth flow, session management ✅

## Data Flow Changes

### Current Flow (Chat Route Example)
```
User navigates → Middleware (auth check) → Layout (static) → Chat page (static)
  → All components load immediately (including heavy artifacts)
```

### NEW Flow (After Dynamic Imports)
```
User navigates → Middleware (auth check) → Layout (dynamic sidebar) → Chat page
  → Core UI loads immediately
  → Heavy components (artifacts, voice, charts) load on-demand
  → Suspense shows loading state during fetch
  → Error boundary catches load failures
```

### File Splitting Flow (Admin Landing Page)
```
BEFORE:
  Admin navigates → 1540-line monolith loads → Renders all sections

AFTER:
  Admin navigates → Main wrapper (100 lines) loads
    → Hero section lazy-loads (visible above fold)
    → Features section lazy-loads (user scrolls)
    → Pricing section lazy-loads (user scrolls)
    → Testimonials section lazy-loads (user scrolls)
    → Each section has Suspense fallback
```

## Build Order (Dependency-Aware)

### Phase 1: Foundation (No Dependencies)
1. Install `@next/bundle-analyzer`, configure next.config.ts
2. Add bundle analysis script to package.json
3. Run baseline bundle analysis (measure current state)
4. Document current bundle sizes in PERFORMANCE.md

### Phase 2: Component Splitting (Depends on Phase 1 Baseline)
5. Split `components/icons.tsx` (1274 lines)
   - Create `components/icons/index.ts` barrel
   - Extract by category: actions, arrows, ui, business, etc.
   - Update imports across codebase (grep for icon imports)
   - Run bundle analysis, compare to baseline

6. Split `components/onboarding-modal.tsx` (1059 lines)
   - Extract 4 steps to `components/onboarding/steps/*`
   - Keep main wrapper in `components/onboarding-modal.tsx`
   - Add Suspense boundaries for each step
   - Test onboarding flow end-to-end

7. Split `app/(admin)/admin/landing-page/page.tsx` (1540 lines)
   - Extract sections to `sections/*.tsx`
   - Add dynamic imports for each section
   - Add Suspense with loading skeletons
   - Test admin landing page editor

### Phase 3: Dynamic Import Expansion (Depends on Phase 2 Splits)
8. Add dynamic imports to admin analytics
   - Chart components (ssr: false for window dependencies)
   - Dashboard sections (Suspense fallbacks)

9. Add dynamic imports to artifact renderers (if not already)
   - Code editor (CodeMirror - heavy dependency)
   - PDF renderer (jspdf - heavy dependency)
   - Spreadsheet renderer (exceljs - heavy dependency)

### Phase 4: Quality Tooling (Parallel to Phase 2-3)
10. Configure ESLint automation
    - Add Husky pre-commit hooks (if missing)
    - Configure lint-staged for staged files only
    - Add CI workflow for lint checks

11. Expand logging coverage
    - Add performance logs for dynamic imports
    - Add bundle size monitoring to CI
    - Add error tracking for split component failures

### Phase 5: Validation (Depends on All Previous)
12. Run full bundle analysis post-optimization
13. Compare to Phase 1 baseline (target: 30-40% reduction in FCP bundle)
14. Lighthouse audit (target: Performance >90)
15. Update PERFORMANCE.md with results
16. Deploy to production with monitoring

## Performance Targets

| Metric | Current (Estimated) | Target (Post-Optimization) | Measurement |
|--------|---------------------|---------------------------|-------------|
| First Contentful Paint (FCP) | ~2.0s | <1.5s | Lighthouse |
| Largest Contentful Paint (LCP) | ~2.5s | <2.0s | Lighthouse |
| Time to Interactive (TTI) | ~3.5s | <2.5s | Lighthouse |
| Initial JS Bundle | ~500KB | ~300KB | Bundle analyzer |
| Icon Library | 1274 lines | ~200 lines (barrel) | Line count |
| Admin Landing Page | 1540 lines | ~100 lines (main) + 4-6 sections | Line count |
| Onboarding Modal | 1059 lines | ~100 lines (wrapper) + 4 steps | Line count |

## Sources

### Next.js 15 & React 19 Performance
- [React & Next.js Best Practices in 2026](https://fabwebstudio.com/blog/react-nextjs-best-practices-2026-performance-scale)
- [Next.js Lazy Loading Guide](https://nextjs.org/docs/pages/guides/lazy-loading)
- [Optimizing Performance with Dynamic Imports](https://dev.to/bolajibolajoko51/optimizing-performance-in-nextjs-using-dynamic-imports-5b3)
- [Dynamic Imports: Boosting Performance](https://arnab-k.medium.com/dynamic-imports-boosting-performance-in-next-js-068338a69f7b)
- [React & Next.js in 2025 - Modern Best Practices](https://strapi.io/blog/react-and-nextjs-in-2025-modern-best-practices)

### Bundle Analysis & Turbopack
- [Next.js Package Bundling Guide](https://nextjs.org/docs/app/guides/package-bundling)
- [next analyze PR #85915](https://github.com/vercel/next.js/pull/85915)
- [@next/bundle-analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)
- [Turbopack in 2026: Complete Guide](https://dev.to/pockit_tools/turbopack-in-2026-the-complete-guide-to-nextjss-rust-powered-bundler-oda)
- [Next.js 16.1 Bundle Analyzer](https://nextjs.org/blog/next-16-1)

### Font Optimization
- [Next.js Font Optimization](https://nextjs.org/docs/app/getting-started/fonts)
- [How to use Vercel's Geist Font](https://peerlist.io/blog/engineering/how-to-use-vercel-geist-font-in-nextjs)
- [Fonts in Next.js: A Practical Architecture Guide](https://thelinuxcode.com/fonts-in-nextjs-a-practical-architecture-guide-for-2026/)

### ESLint & Quality Automation
- [Ultracite: Zero-Configuration Preset](https://www.ultracite.ai/)
- [Ultracite on Navi.tools](https://navi.tools/tools/ultracite)
- [Standardize Next.js Workflow with Git Hooks](https://www.mindbowser.com/standardize-nextjs-precommit-hooks-guide/)
- [Set up Next.js with ESLint, Prettier, Husky](https://amanhimself.dev/blog/setup-nextjs-project-with-eslint-prettier-husky-lint-staged/)

### Code Splitting & Organization
- [Next.js Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [Mastering Code Splitting in Next.js App Router](https://dev.to/ahr_dev/mastering-code-splitting-in-nextjs-app-router-2608)
- [How to Use Code Splitting to Reduce Load Times](https://blazity.com/blog/code-splitting-next-js)
- [Optimize Performance with Smart Code Splitting](https://dev.to/boopykiki/optimize-nextjs-performance-with-smart-code-splitting-what-to-load-when-and-why-9l1)
