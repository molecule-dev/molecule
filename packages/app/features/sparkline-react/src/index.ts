/**
 * Tiny inline trend chart — line/bar/dot variants, SVG only, no library dep.
 *
 * Exports `<Sparkline>`.
 *
 * @example
 * ```tsx
 * import { Sparkline } from '@molecule/app-sparkline-react'
 *
 * <Sparkline
 *   values={[12, 18, 15, 22, 30, 27, 35]}
 *   variant="line"
 *   width={80}
 *   height={24}
 *   ariaLabel="Weekly revenue trend"
 * />
 * ```
 *
 * @remarks
 * - Requires a wired ClassMap bond (`getClassMap()` throws before
 *   bonding); no i18n dependency.
 * - The SVG is fixed-pixel (`width`/`height` props, defaults 80×24) —
 *   it does not stretch to its container. Compute px from layout if you
 *   need responsiveness.
 * - `color` accepts any CSS color and defaults to `currentColor`, so the
 *   sparkline inherits the surrounding text color — set a text color on
 *   a parent (e.g. success/error) to theme it.
 * - Values are min-max normalized per series; a constant series renders
 *   as a line along the bottom edge, and `values={[]}` renders nothing.
 * - Pass `ariaLabel` with a translated string — the built-in fallback
 *   ("Trend sparkline") is English-only.
 *
 * @module
 */

export * from './Sparkline.js'
