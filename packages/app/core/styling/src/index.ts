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
 * import { cn, cva } from '@molecule/app-styling'
 *
 * // inside a ClassMap bond / shared-component plumbing:
 * cn('base', isActive && 'active', { disabled: isDisabled })
 * const button = cva('btn', { variants: { size: { sm: 'btn-sm', lg: 'btn-lg' } } })
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
 * - {@link themeToCSS} converts a theme object into CSS-variable pairs — pair
 *   it with `@molecule/app-theme` bonds instead of hand-writing variable maps.
 *
 * @module
 */

export * from './theme.js'
export * from './types.js'
export * from './utilities.js'
