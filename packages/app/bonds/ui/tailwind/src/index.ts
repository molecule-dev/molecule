/**
 * Tailwind CSS UI components for molecule.dev.
 *
 * Provides pre-built, accessible UI components using Tailwind CSS classes.
 * These are framework-agnostic class strings that can be used with any
 * rendering library (React, Vue, Svelte, etc.).
 *
 * @remarks
 * Theming / where colors come from: the class strings here use semantic tokens
 * (`bg-primary`, `text-primary`, `bg-surface`, …), NOT literal palette classes
 * (`bg-blue-600`). Those tokens are defined in this package's `base.css`
 * `@theme` block, where the ~15 CORE colors read
 * `--color-primary: var(--mol-color-primary, <default>)` (from the
 * `@molecule/app-theme` bond) and every other token (hover, container, Material
 * on-*, surface tiers) is AUTO-DERIVED from the cores via `color-mix()` — so
 * changing one core recolors all its shades.
 *
 * To recolor a scaffolded app: edit `app/src/theme.css` (the `--color-*`
 * variables, `:root` = light, `[data-mol-mode='dark']` = dark) when it exists —
 * it overrides everything here. Only when there is no `theme.css` do the
 * `--mol-color-*` from the theme bond drive the palette. NEVER hardcode a literal
 * Tailwind color class in a component — it breaks theming and the safelist.
 *
 * @module
 */

export * from './classMap.js'
export * from './components.js'
export * from './layout.js'
export * from './types.js'
export * from './utilities.js'
