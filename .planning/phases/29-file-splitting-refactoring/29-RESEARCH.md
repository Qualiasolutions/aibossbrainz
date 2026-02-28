# Phase 29: File Splitting & Refactoring - Research

**Researched:** 2026-03-01
**Domain:** React 19 + Next.js 15 file organization and refactoring patterns
**Confidence:** HIGH

## Summary

This phase tackles splitting three large files (admin landing page 308 lines, icons.tsx 1274 lines, onboarding modal 1063 lines) into maintainable modules with clear boundaries. Research reveals that modern Next.js 15 + React 19 patterns emphasize **avoiding barrel exports** for performance, organizing by feature/domain rather than technical role, and using explicit imports to enable tree-shaking. The admin page is already well-factored (uses existing component modules), icons.tsx needs category-based splitting with individual exports, and the onboarding modal should decompose into step components with shared context.

**Primary recommendation:** Split by semantic category (icons) and functional responsibility (modal steps), use direct exports without barrel files, verify with bundle analyzer and TypeScript compilation, and test tree-shaking effectiveness.

## Standard Stack

### Core Tools
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.6+ | App Router, RSC/Client split | Official framework, built-in tree-shaking optimization |
| TypeScript | 5.x | Type safety | Strict mode enabled, catches import errors at compile time |
| @next/bundle-analyzer | 1.x | Bundle inspection | Official Next.js plugin, Turbopack integration (v16.1+) |
| Biome | Latest | Linting/formatting | Project already uses Ultracite (Biome-based) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| circular-dependency-plugin | 5.x+ | Webpack circular dep detection | During refactoring to catch import cycles |
| madge | 7.x+ | Dependency graph visualization | Alternative to webpack plugin, works standalone |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Barrel exports (index.ts) | Individual file imports | Barrel = easier imports but kills tree-shaking; individual = verbose but optimal bundles |
| Feature-based folders | Technical role folders (hooks/, utils/) | Feature folders scale better but require more upfront organization |

**Installation:**
```bash
# Bundle analyzer already configured in next.config.ts (line 1-8)
# Optional: circular dependency detection
pnpm add -D circular-dependency-plugin madge
```

## Architecture Patterns

### Recommended Project Structure (Already In Use)

Current structure is solid:
```
components/
├── admin/              # Domain-specific components (good pattern)
│   ├── stats-card.tsx
│   ├── dashboard-grid.tsx
│   └── ...
├── chat/               # Feature module
├── subscription/       # Feature module
├── ui/                 # Shared primitives (shadcn)
├── icons.tsx           # ❌ SPLIT THIS (1274 lines, 54 icons)
└── onboarding-modal.tsx # ❌ SPLIT THIS (1063 lines)
```

### Pattern 1: Icon Organization by Category

**What:** Split icons.tsx into semantic categories with individual exports (no barrel index)

**When to use:** Icon libraries > 20 icons, multiple usage contexts

**Recommended structure:**
```
components/icons/
├── navigation.tsx      # HomeIcon, MenuIcon, SidebarLeftIcon, ChevronDownIcon, etc.
├── actions.tsx         # CopyIcon, TrashIcon, UploadIcon, PlusIcon, CrossIcon, etc.
├── status.tsx          # LoaderIcon, CheckCircleFillIcon, ThumbUpIcon, ThumbDownIcon
├── brand.tsx           # LogoOpenAI, LogoGoogle, LogoAnthropic, VercelIcon
├── content.tsx         # FileIcon, ImageIcon, MessageIcon, CodeIcon, TerminalIcon
└── misc.tsx            # BotIcon, UserIcon, AttachmentIcon, etc.
```

**Import pattern (CRITICAL):**
```typescript
// ❌ BAD: Barrel import (kills tree-shaking)
import { CopyIcon, TrashIcon } from "@/components/icons";

// ✅ GOOD: Direct imports (enables tree-shaking)
import { CopyIcon } from "@/components/icons/actions";
import { TrashIcon } from "@/components/icons/actions";
```

**Source:** [Best React Icon Libraries for 2026](https://mighil.com/best-react-icon-libraries) — "Always use specific icon imports rather than barrel imports to ensure optimal tree-shaking and maintain optimal bundle sizes"

### Pattern 2: Multi-Step Modal Decomposition

**What:** Split onboarding modal into step components with shared wrapper

**When to use:** Modals > 500 lines, multiple discrete steps, reusable patterns

**Recommended structure:**
```
components/onboarding/
├── onboarding-modal.tsx         # Main coordinator (uses createPortal, controls flow)
├── onboarding-context.tsx       # Shared state via React Context
├── steps/
│   ├── welcome-step.tsx         # Step 1: Welcome screen
│   ├── meet-team-step.tsx       # Steps 2-5: Targeted tour steps
│   ├── profile-step.tsx         # Step 6: Profile form
│   └── ready-step.tsx           # Step 7: Completion
└── shared/
    ├── step-navigation.tsx      # Reusable nav footer
    ├── step-dots.tsx            # Progress indicator
    └── targeted-spotlight.tsx   # Spotlight + tooltip wrapper
```

**Example:**
```typescript
// onboarding-context.tsx
export const OnboardingContext = createContext<OnboardingState>({ ... });

// onboarding-modal.tsx
export function OnboardingModal() {
  const [stepIndex, setStepIndex] = useState(0);
  const activeSteps = isTourMode ? TOUR_ONLY_STEPS : ALL_STEPS;

  return (
    <OnboardingContext.Provider value={{ stepIndex, goNext, goBack, ... }}>
      <AnimatePresence mode="wait">
        {currentStep.id === "welcome" && <WelcomeStep />}
        {currentStep.id === "profile" && <ProfileStep />}
        {/* ... */}
      </AnimatePresence>
    </OnboardingContext.Provider>
  );
}
```

**Source:** [Building a Reusable Multi-Step Form with React Hook Form and Zod](https://blog.logrocket.com/building-reusable-multi-step-form-react-hook-form-zod/) — emphasizes shared context for step state and composition over monolithic components.

### Pattern 3: Admin Page Organization (Already Optimal)

**What:** Admin landing page (308 lines) already uses modular components from `components/admin/`

**Current state:** ✅ ALREADY FOLLOWS BEST PRACTICES

The admin page correctly:
- Imports specialized components (`StatsCard`, `DashboardGrid`, `ConversationsPreview`, etc.)
- Keeps page file focused on data fetching and layout composition
- Isolates safe wrappers (`safeGetAdminStats`, etc.) in the page file (appropriate)

**No splitting needed** — this file demonstrates the target pattern for the other two.

### Anti-Patterns to Avoid

- **Barrel file contamination:** Never mix server and client components in the same barrel export (Next.js 13+)
- **Over-splitting:** Don't create files < 50 lines unless they're highly reusable
- **God components:** Avoid 1000+ line components without clear internal boundaries
- **Circular imports:** Refactoring often reveals hidden circular dependencies — check with tools

**Source:** [The Hidden Trap in Next.js 13+ That's Breaking Your Server Components](https://medium.com/@eva.matova6/the-hidden-trap-in-next-js-13-thats-breaking-your-server-components-269cd202b8a9)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Circular dependency detection | Manual grep scripts | `circular-dependency-plugin` or `madge` | Handles transitive cycles, webpack integration |
| Bundle analysis | Manual file size checks | `@next/bundle-analyzer` | Already configured, Turbopack-aware (Next.js 16.1+) |
| Icon categorization | Manual grouping | Existing libraries (Lineicons: 60+ categories, Hugeicons: 59 categories) | If migrating away from custom icons, use pre-categorized libraries |
| Multi-step form state | useState daisy-chaining | React Context + useReducer | Prevents prop-drilling across steps |

**Key insight:** Next.js 15's `optimizePackageImports` (next.config.ts line 18-44) already auto-optimizes heavy libraries like `lucide-react` and `framer-motion`. Custom barrel exports for icons.tsx will NOT benefit from this — **must use direct imports**.

**Source:** [How We Optimized Package Imports in Next.js](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js)

## Common Pitfalls

### Pitfall 1: Barrel Export Performance Degradation

**What goes wrong:** Creating `components/icons/index.ts` that re-exports all icons kills tree-shaking. Bundlers import the entire file even when using one icon.

**Why it happens:** Webpack/Turbopack can't statically analyze re-exports to determine unused modules at build time.

**How to avoid:**
- Use direct imports: `import { X } from "@/components/icons/category"`
- Do NOT create barrel `index.ts` files
- Next.js `optimizePackageImports` does NOT apply to user code, only `node_modules`

**Warning signs:**
- Bundle size increases after refactoring icons
- Webpack bundle analyzer shows entire icons module imported everywhere

**Source:** [The Hidden Costs of Barrel Files](https://articles.wesionary.team/the-hidden-costs-of-barrel-files-25de560b9f63) — "If you want to use one single export from a barrel file that imports thousands of other things, you are still paying the price of importing other unneeded modules."

### Pitfall 2: Circular Dependencies After Splitting

**What goes wrong:** Splitting components can expose hidden circular dependencies. Example: `onboarding-context.tsx` imports `types.ts`, which imports `onboarding-modal.tsx` for type inference.

**Why it happens:** Monolithic files hide circular relationships. Splitting reveals the cycle.

**How to avoid:**
- Create separate `types.ts` files that import nothing
- Use TypeScript `type` imports (`import type { X }`) where possible
- Run `circular-dependency-plugin` during refactoring

**Warning signs:**
- TypeScript errors about undefined values at runtime
- Webpack warnings about circular dependencies
- Components render before dependencies initialize

**Detection command:**
```bash
# Install madge globally or as dev dependency
pnpm add -D madge

# Check for circular dependencies
npx madge --circular --extensions tsx,ts components/
```

**Source:** [Fixing Circular Dependencies in Node.js: A Battle Against Barrel Files](https://medium.com/@idrussalam95/fixing-circular-dependencies-in-node-js-a-battle-against-barrel-files-and-god-classes-e7d13df995f0)

### Pitfall 3: Server/Client Component Boundary Violations

**What goes wrong:** In Next.js App Router, moving components into separate files can accidentally import server-only code into client components (or vice versa).

**Why it happens:** The admin page is a server component. If you split out client-interactive widgets without `"use client"` directives, Next.js will error.

**How to avoid:**
- Admin page widgets (if interactive) need `"use client"` at top of file
- Onboarding modal is already client-only (`"use client"` line 1)
- Keep server/client split clear during refactoring

**Warning signs:**
- Error: "You're importing a component that needs useState but..."
- Hydration mismatches after splitting
- `useEffect`/`useState` in files without `"use client"`

**Source:** [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

### Pitfall 4: TypeScript Compilation Failures After Moving Files

**What goes wrong:** Moving files breaks relative imports. TypeScript `tsc --noEmit` succeeds but runtime fails.

**Why it happens:** `@/` alias resolves at build time, not type-check time. Paths that compile may fail at runtime.

**How to avoid:**
- Run `npx tsc --noEmit` after every file move
- Update all imports using find-and-replace
- Use IDE refactoring tools (VS Code "Rename Symbol" updates imports automatically)

**Warning signs:**
- Build fails with "Module not found" after type-check passes
- Imports show correct types but fail at runtime

**Verification:**
```bash
# After splitting files
npx tsc --noEmit
pnpm build  # Full build test
```

### Pitfall 5: Breaking Existing Import Paths

**What goes wrong:** Existing components import from `@/components/icons` or `@/components/onboarding-modal`. After splitting, all imports break.

**Why it happens:** 54+ components import from icons.tsx (checked via grep). Changing the export path requires updating all consumers.

**How to avoid:**
- **Migration strategy:** Create category files, keep `icons.tsx` as temporary barrel, gradually migrate imports, then delete barrel
- Use codemod or find-and-replace to update all imports
- Test all affected components after migration

**Migration plan:**
1. Create `components/icons/actions.tsx`, etc.
2. Update `icons.tsx` to re-export from new files (temporary)
3. Update consumers to import from new paths (use find-and-replace)
4. Delete `icons.tsx` once all consumers migrated
5. Verify bundle size decreased

**Consumer count:**
```bash
# Check how many files import from icons.tsx
grep -r "from.*icons" components/ app/ | wc -l
# Expected: 50+ files to update
```

## Code Examples

Verified patterns from official sources and project codebase:

### Example 1: Icon Category File (Direct Exports)

```typescript
// components/icons/actions.tsx
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export const CopyIcon = ({ size = 16 }: IconProps) => (
  <svg height={size} width={size} viewBox="0 0 16 16" style={{ color: "currentcolor" }}>
    {/* SVG path */}
  </svg>
);

export const TrashIcon = ({ size = 16 }: IconProps) => (
  <svg height={size} width={size} viewBox="0 0 16 16" style={{ color: "currentcolor" }}>
    {/* SVG path */}
  </svg>
);

// ❌ DO NOT ADD: export * from "./actions" in index.ts
```

**Import usage:**
```typescript
// components/message-actions.tsx (update from current)
- import { CopyIcon, TrashIcon, /* ... */ } from "./icons";
+ import { CopyIcon, TrashIcon } from "@/components/icons/actions";
+ import { ThumbUpIcon, ThumbDownIcon } from "@/components/icons/status";
```

**Source:** Project's existing `icons.tsx` pattern + [Best React Icon Libraries for 2026](https://mighil.com/best-react-icon-libraries)

### Example 2: Onboarding Context Pattern

```typescript
// components/onboarding/onboarding-context.tsx
"use client";

import { createContext, useContext } from "react";

interface OnboardingContextValue {
  stepIndex: number;
  totalSteps: number;
  goNext: () => void;
  goBack: () => void;
  isTourMode: boolean;
  canGoBack: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}

export { OnboardingContext };
```

**Source:** [How to Build a Smart Multi-Step Form in React](https://medium.com/doctolib/how-to-build-a-smart-multi-step-form-in-react-359469c32bbe) — uses context to avoid prop-drilling across steps

### Example 3: Step Component Composition

```typescript
// components/onboarding/steps/welcome-step.tsx
"use client";

import { motion } from "framer-motion";
import { useOnboarding } from "../onboarding-context";
import { BOT_PERSONALITIES } from "@/lib/bot-personalities";
import Image from "next/image";

export function WelcomeStep() {
  const { goNext } = useOnboarding();
  const alexandria = BOT_PERSONALITIES.alexandria;
  const kim = BOT_PERSONALITIES.kim;

  return (
    <motion.div
      className="flex flex-col items-center px-8 pt-10 pb-10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {/* Avatar display logic moved from onboarding-modal.tsx lines 676-719 */}
      {/* Button moved from line 745-752 */}
    </motion.div>
  );
}
```

**Current onboarding-modal.tsx breakdown:**
- Lines 1-149: Constants, types, hooks → Keep in main file or move to `shared/`
- Lines 186-365: `OnboardingModal` component → Keep as coordinator
- Lines 367-522: `TargetedStep` component → Move to `shared/targeted-step.tsx`
- Lines 524-578: `TooltipContent` → Move to `shared/tooltip-content.tsx`
- Lines 580-657: `CenteredStep` wrapper → Keep in main file (routing logic)
- Lines 659-756: `WelcomeContent` → Move to `steps/welcome-step.tsx`
- Lines 758-903: `ProfileContent` → Move to `steps/profile-step.tsx`
- Lines 905-1039: `ReadyContent` → Move to `steps/ready-step.tsx`
- Lines 1042-1063: `StepDots` → Move to `shared/step-dots.tsx`

### Example 4: Bundle Analyzer Verification

```bash
# Already configured in next.config.ts
ANALYZE=true pnpm build

# Check output (server and client bundles)
# Before refactor: Note icons.tsx total size
# After refactor: Verify only used icons included per route
```

**Expected outcome:**
- Admin routes import only `lucide-react` icons (Users, MessageSquare, etc.)
- Chat routes import only action/status icons (CopyIcon, TrashIcon, etc.)
- Total bundle size decreases by ~5-15% (based on icon usage patterns)

**Source:** [Next.js Bundle Analyzer: Your Key to Optimizing Next.js Apps](https://www.dhiwise.com/post/next-bundle-analyzer-your-key-to-optimizing-next-js-app)

### Example 5: Circular Dependency Detection

```typescript
// Add to next.config.ts webpack config (development only)
webpack: (config, { isServer, dev }) => {
  if (!isServer) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
  }

  // ✅ ADD THIS during refactoring phase
  if (dev) {
    const CircularDependencyPlugin = require("circular-dependency-plugin");
    config.plugins.push(
      new CircularDependencyPlugin({
        exclude: /node_modules/,
        failOnError: false, // Set true to block build on circular deps
        allowAsyncCycles: false,
        cwd: process.cwd(),
      })
    );
  }

  return config;
},
```

**Source:** [circular-dependency-plugin npm](https://www.npmjs.com/package/circular-dependency-plugin)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Barrel exports for cleaner imports | Direct imports for tree-shaking | Next.js 13+ (2023) | Next.js cannot optimize user barrel files, only node_modules |
| Technical role folders (components/buttons/, components/modals/) | Feature/domain folders (components/onboarding/, components/admin/) | React 19 best practices (2025) | Better co-location, easier to find related code |
| Monolithic icon files (all SVGs in one file) | Category-based icon organization | Icon libraries 2025+ (Lineicons, Hugeicons) | Better tree-shaking, semantic grouping |
| 80-character line limits | 400-line file limits | Modern codebases (2024+) | Focuses on file maintainability over line length |
| Manual dependency graphs | Automated bundle analysis (Turbopack integration) | Next.js 16.1+ (Feb 2026) | Built-in module graph inspection |

**Deprecated/outdated:**
- **Barrel exports for user code:** Still common but discouraged in Next.js 15+ App Router due to tree-shaking limitations
- **God components (1000+ lines):** Community consensus now favors 200-400 line files with clear boundaries
- **Mixing server/client in same barrel:** Explicitly breaks in Next.js 13+ App Router

**Current as of March 2026:**
- Next.js `optimizePackageImports` (next.config.ts line 18) handles `node_modules` automatically
- Turbopack bundle analyzer available in Next.js 16.1+ (project likely on 15.6, manual analyzer still works)
- React 19 patterns emphasize composition over monolithic components

## Open Questions

1. **Icon migration strategy:**
   - What we know: 54 icons, ~50+ consumer files identified via grep
   - What's unclear: Should we migrate all consumers at once or incrementally?
   - Recommendation: **Incremental migration** — keep temporary barrel, migrate consumers over 2-3 PRs, verify bundle improvements, then delete barrel

2. **Admin page widget extraction:**
   - What we know: Admin page is 308 lines, already uses modular components, follows best practices
   - What's unclear: Does it need further splitting?
   - Recommendation: **No action needed** — current structure demonstrates target pattern

3. **Onboarding modal spotlight logic:**
   - What we know: `TargetedStep` (lines 367-522) handles spotlight positioning with complex calculations
   - What's unclear: Should spotlight logic be a separate hook or stay in component?
   - Recommendation: **Extract to custom hook** `useTargetSpotlight(target)` — reusable, testable, cleaner component

4. **TypeScript strict mode impact:**
   - What we know: Project uses `strict: true` (tsconfig.json line 7)
   - What's unclear: Will splitting expose previously hidden type errors?
   - Recommendation: **Run `tsc --noEmit` after each split** — catch issues incrementally

5. **Bundle size improvement target:**
   - What we know: Icons are custom SVGs, not from optimized library
   - What's unclear: Expected bundle size reduction %?
   - Recommendation: **Baseline with ANALYZE=true build before refactor** — measure actual impact, expect 5-15% reduction based on icon usage patterns

## Sources

### Primary (HIGH confidence)
- [Next.js Official Docs: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) - Official Next.js 15 App Router documentation
- [Next.js Official Docs: Project Structure](https://nextjs.org/docs/app/getting-started/project-structure) - Official file organization guidance
- [How We Optimized Package Imports in Next.js - Vercel](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js) - Official explanation of `optimizePackageImports`
- [@next/bundle-analyzer npm](https://www.npmjs.com/package/@next/bundle-analyzer) - Official bundle analyzer tool (already configured in project)
- [circular-dependency-plugin npm](https://www.npmjs.com/package/circular-dependency-plugin) - Standard webpack circular dependency detection

### Secondary (MEDIUM confidence)
- [Best React Icon Libraries for 2026](https://mighil.com/best-react-icon-libraries) - Icon organization best practices (verified with multiple sources)
- [The Hidden Costs of Barrel Files](https://articles.wesionary.team/the-hidden-costs-of-barrel-files-25de560b9f63) - Performance analysis of barrel exports
- [Building a Reusable Multi-Step Form with React Hook Form and Zod - LogRocket](https://blog.logrocket.com/building-reusable-multi-step-form-react-hook-form-zod/) - Multi-step modal patterns
- [How to Build a Smart Multi-Step Form in React - Doctolib](https://medium.com/doctolib/how-to-build-a-smart-multi-step-form-in-react-359469c32bbe) - Context-based step management
- [Best Practices for Organizing Your Next.js 15 2025](https://dev.to/bajrayejoon/best-practices-for-organizing-your-nextjs-15-2025-53ji) - File organization patterns
- [Fixing Circular Dependencies in Node.js](https://medium.com/@idrussalam95/fixing-circular-dependencies-in-node-js-a-battle-against-barrel-files-and-god-classes-e7d13df995f0) - Circular dependency resolution strategies
- [The Hidden Trap in Next.js 13+ That's Breaking Your Server Components](https://medium.com/@eva.matova6/the-hidden-trap-in-next-js-13-thats-breaking-your-server-components-269cd202b8a9) - Server/client boundary issues

### Tertiary (LOW confidence - for context only)
- [React Folder Structure in 5 Steps](https://www.robinwieruch.de/react-folder-structure/) - General React organization (not Next.js specific)
- [Top 11 React Icon Libraries for 2026](https://lineicons.com/blog/react-icon-libraries) - Icon library comparison (categories for reference)

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - Official Next.js docs + existing project configuration (bundle analyzer already setup)
- Architecture: **HIGH** - Multiple official sources + project already follows patterns (admin components demonstrate best practices)
- Pitfalls: **HIGH** - Verified with official Next.js docs + community consensus on barrel exports

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (30 days - Next.js stable, patterns established)

**Current project state:**
- Admin page: ✅ Already optimal (308 lines, modular components)
- Icons.tsx: ❌ Needs splitting (1274 lines, 54 icons, 50+ consumers)
- Onboarding modal: ❌ Needs splitting (1063 lines, 7 distinct steps)
- Bundle analyzer: ✅ Already configured (next.config.ts line 1-8)
- TypeScript strict: ✅ Enabled (will catch errors during refactoring)

**Next steps for planner:**
- Plan 01: Split icons.tsx into 6 category files
- Plan 02: Migrate icon consumers incrementally
- Plan 03: Split onboarding modal into step components
- Plan 04: Verify bundle improvements with analyzer
- Plan 05: TypeScript compilation + circular dependency check
