/**
 * Liquid glass ClassMap extension for Tailwind CSS.
 *
 * Extends the base Tailwind ClassMap with backdrop-filter blur and
 * saturation effects on surface components (cards, modals, headers,
 * dropdowns, tooltips, toasts, drawers). Designed to pair with
 * translucent theme colors for a frosted glass appearance.
 *
 * @example
 * ```typescript
 * import { getClassMap, setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind-glass'
 *
 * // Startup (bonds.ts): bond THIS classMap INSTEAD of @molecule/app-ui-tailwind's.
 * setClassMap(classMap)
 * // Tailwind CSS entry also needs (besides app-ui-tailwind's base.css + @source):
 * //   @source "../node_modules/@molecule/app-ui-tailwind-glass/dist";
 *
 * // Components are unchanged — surfaces pick up the frosted glass automatically.
 * export function renderStatCard(label: string, value: string): HTMLElement {
 *   const cm = getClassMap()
 *   const card = document.createElement('section')
 *   card.className = cm.card() // base card + backdrop blur/saturate
 *   const body = document.createElement('div')
 *   body.className = cm.cardContent
 *   const heading = document.createElement('h3')
 *   heading.className = cm.cardTitle
 *   heading.textContent = label
 *   const amount = document.createElement('p')
 *   amount.className = cm.textSize('2xl')
 *   amount.textContent = value
 *   body.append(heading, amount)
 *   card.append(body)
 *   return card
 * }
 *
 * document.body.append(renderStatCard('Revenue', '$12,400'))
 * ```
 *
 * @remarks
 * Bond ONE ClassMap: calling `setClassMap()` with both this and the base
 * Tailwind `classMap` just leaves whichever ran last. Glass is only visible
 * over a translucent surface color — with the default opaque theme the blur
 * has nothing to show through.
 *
 * This package extends (not replaces) the base Tailwind ClassMap.
 * All component classes remain identical — only surface components
 * gain backdrop-filter effects. Pair with a translucent theme preset
 * (e.g. `@molecule/app-theme-css-variables-liquid-glass`) for the full effect.
 *
 * Tailwind must SCAN this package or every `backdrop-*` class it adds is
 * purged from the compiled CSS (the classes appear in the DOM but style
 * nothing): add
 * `@source "../node_modules/@molecule/app-ui-tailwind-glass/dist";`
 * to the app's Tailwind CSS entry (scaffolded apps scan only
 * `app-ui-tailwind` / `app-styling-tailwind` / the framework UI dist by
 * default, which does NOT cover this bond).
 *
 * @module
 */

export * from './classMap.js'
