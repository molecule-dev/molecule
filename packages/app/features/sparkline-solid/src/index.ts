/**
 * Solid tiny inline trend chart — line/bar/dot variants, SVG only.
 *
 * Exports `Sparkline` — the Solid counterpart of
 * `@molecule/app-sparkline-react`, with the same props (React names) and the
 * same DOM for the same input, so an app switches framework by changing only
 * the package name in its imports.
 *
 * @example
 * ```tsx
 * import { Sparkline } from '@molecule/app-sparkline-solid'
 *
 * export function RevenueTile() {
 *   return (
 *     <Sparkline
 *       values={[12, 18, 15, 22, 30, 27, 35]}
 *       variant="line"
 *       width={80}
 *       height={24}
 *       ariaLabel="Weekly revenue trend"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires a wired ClassMap bond (`getClassMap()` throws before
 *   bonding). The default `aria-label` reads through `useTranslation()`, so
 *   it follows the active locale.
 * - The SVG is fixed-pixel (`width`/`height` props, defaults 80×24) —
 *   it does not stretch to its container. Compute px from layout if you
 *   need responsiveness.
 * - `color` accepts any CSS color and defaults to `currentColor`, so the
 *   sparkline inherits the surrounding text color — set a text color on
 *   a parent (e.g. success/error) to theme it.
 * - Values are min-max normalized per series; a constant series renders
 *   as a line along the bottom edge, and `values: []` renders nothing.
 * - Pass `ariaLabel` with your own translated string to override the
 *   built-in one (`t('sparkline.aria.trendSparkline', …,
 *   { defaultValue: 'Trend sparkline' })`).
 * - The package ships preserved JSX (`jsx: preserve`); consumers compile it
 *   with vite-plugin-solid (or their own Solid toolchain).
 *
 * @module
 */

export * from './Sparkline.jsx'
export * from './types.js'
