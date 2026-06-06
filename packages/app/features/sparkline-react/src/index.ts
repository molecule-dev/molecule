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
 * @module
 */

export * from './Sparkline.js'
