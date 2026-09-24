/**
 * Styling interface and utilities for molecule.dev.
 *
 * Framework-agnostic class-name merging ({@link cn}), variant generation
 * ({@link cva}), and theme→CSS-variable conversion ({@link themeToCSS}) — the
 * low-level plumbing that styling bonds (e.g. `@molecule/app-styling-tailwind`)
 * and ClassMap bonds build on.
 *
 * @example
 * ```typescript
 * import { cva, themeToCSS } from '@molecule/app-styling'
 * import { registerTailwindClassMerger } from '@molecule/app-styling-tailwind'
 * import { lightTheme } from '@molecule/app-theme'
 * import { getClassMap, setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Startup (bonds.ts)
 * setClassMap(classMap)
 * registerTailwindClassMerger() // without it cn()/cva() only JOIN strings — conflicts both survive
 *
 * // 1. Theme → CSS custom properties on :root ('--color-primary', '--spacing-md', …)
 * for (const [name, value] of Object.entries(themeToCSS(lightTheme))) {
 *   document.documentElement.style.setProperty(name, value)
 * }
 *
 * // 2. A variant helper for shared-component plumbing, built from ClassMap tokens (no raw class strings)
 * const cm = getClassMap()
 * const statusText = cva(cm.textSize('sm'), {
 *   variants: { tone: { ok: cm.textSuccess, failing: cm.textError, idle: cm.textMuted } },
 *   defaultVariants: { tone: 'idle' },
 * })
 *
 * const className = statusText({ tone: 'failing', class: cm.textSize('lg') })
 * // → the error color + the LARGE size; the merger drops the conflicting base 'sm' size
 * ```
 *
 * @remarks
 * - **This package does NOT license raw class names in app code.** CSS class
 *   STRINGS still live only inside ClassMap bond packages — application
 *   components style via `getClassMap()` / `cm.*` from `@molecule/app-ui`
 *   (compose with `cm.cn`). Reach for this package's `cn`/`cva` only when
 *   building a styling bond or shared-component infrastructure.
 * - **Conflict resolution requires a registered merger.** Bare {@link cn} just
 *   joins strings — two conflicting utilities (e.g. two `gap-*` classes) both
 *   survive. A styling bond registers its merger via {@link setClassMerger} at
 *   startup (the Tailwind bond registers `tailwind-merge`); without one, never
 *   rely on "last class wins".
 * - `cva()` variant props are the KEYS of your `variants` config (`{ tone: 'failing' }`), and
 *   extra classes go in `class` (not `className`). An unknown variant value is silently
 *   ignored, and `defaultVariants` fill in only omitted keys.
 * - {@link themeToCSS} converts a theme object into CSS-variable pairs — pair
 *   it with `@molecule/app-theme` bonds instead of hand-writing variable maps.
 *
 * @module
 */

export * from './theme.js'
export * from './types.js'
export * from './utilities.js'
