/**
 * Tailwind CSS UI components for molecule.dev.
 *
 * Provides pre-built, accessible UI components using Tailwind CSS classes.
 * These are framework-agnostic class strings that can be used with any
 * rendering library (React, Vue, Svelte, etc.).
 *
 * @example
 * ```typescript
 * import { getClassMap, setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // 1. Startup (bonds.ts): bond the ClassMap once, before anything renders.
 * setClassMap(classMap)
 *
 * // 2. The app's Tailwind v4 CSS entry (scaffolded mlcl apps already have this):
 * //      @import 'tailwindcss';
 * //      @import '@molecule/app-ui-tailwind/base.css';
 * //      @source "../node_modules/@molecule/app-ui-tailwind/dist";
 *
 * // 3. Components resolve every class through getClassMap() — never literal Tailwind.
 * interface Order {
 *   id: string
 *   customer: string
 *   total: string
 * }
 * export function renderOrderCard(order: Order): HTMLElement {
 *   const cm = getClassMap()
 *   const card = document.createElement('article')
 *   card.className = cm.card({ variant: 'elevated' })
 *   const header = document.createElement('div')
 *   header.className = cm.flex({ direction: 'row', justify: 'between', align: 'center' })
 *   const title = document.createElement('h3')
 *   title.className = cm.cardTitle
 *   title.textContent = order.customer
 *   const total = document.createElement('span')
 *   total.className = cm.badge({ variant: 'success' })
 *   total.textContent = order.total
 *   header.append(title, total)
 *   card.append(header)
 *   return card
 * }
 *
 * document.body.append(renderOrderCard({ id: 'o_1', customer: 'Ada Lovelace', total: '$42.00' }))
 * ```
 *
 * @remarks
 * - Nothing is styled until `setClassMap(classMap)` runs — `getClassMap()`
 *   throws before that. Call it once at startup, not per component.
 * - Without the `@source` line (or with the classes built by string
 *   concatenation in app code) Tailwind purges the classes this package emits:
 *   they appear in the DOM but style nothing.
 * - `cm.cn(...)` only CONCATENATES — it is NOT tailwind-merge. Combining
 *   conflicting tokens (e.g. `cm.cn(cm.cardHeader, cm.flex({ direction: 'row' }))`
 *   emits both `flex-col` and `flex-row`, and CSS order picks the winner). Pick
 *   one token per concern instead.
 * - Option names follow `@molecule/app-ui`'s types, e.g. `badge({ variant })`
 *   but `button({ color, variant, size })`.
 *
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
