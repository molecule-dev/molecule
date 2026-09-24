/**
 * Period-over-period stat comparison row.
 *
 * Exports `<ComparisonRow>`.
 *
 * @example
 * ```tsx
 * import { ComparisonRow } from '@molecule/app-comparison-row-react'
 *
 * export function RevenueSummary() {
 *   const report = { metric: 'Revenue', period: 'vs. last month', currentCents: 2480000, previousCents: 2130000 }
 *   const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
 *   const deltaPct = ((report.currentCents - report.previousCents) / report.previousCents) * 100
 *   return (
 *     <ComparisonRow
 *       label={report.metric}
 *       current={money.format(report.currentCents / 100)}
 *       previous={money.format(report.previousCents / 100)}
 *       deltaPct={deltaPct}
 *       periodLabel={report.period}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - `deltaPct` is a PERCENT (`16.4` = +16.4%), not a ratio (`0.164`), and it is NOT computed
 *   for you from `current` / `previous` — those are display-only ReactNodes; derive the number
 *   yourself. Omit it and no chip renders. The default chip text is `▲ 16.4%` (arrow + absolute
 *   value, one decimal).
 * - The delta chip colors by SIGN with fixed semantics: positive = green, negative = red
 *   (hardcoded hexes, not theme tokens). There is no "down-is-good" inversion — for metrics like
 *   churn or costs, negate `deltaPct` (and restate the sign in `formatDelta`, which controls the
 *   text only, never the color).
 * - `label` / `current` / `previous` / `periodLabel` are consumer-provided — pass pre-formatted,
 *   translated values; the component formats nothing and has no locale bond. `previous` renders
 *   struck-through.
 * - `getClassMap()` throws unless `setClassMap(classMap)` from `@molecule/app-ui` ran at startup.
 *
 * @module
 */

export * from './ComparisonRow.js'
