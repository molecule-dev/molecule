/**
 * Period-over-period stat comparison row.
 *
 * Exports `<ComparisonRow>`.
 *
 * @example
 * ```tsx
 * import { ComparisonRow } from '@molecule/app-comparison-row-react'
 *
 * <ComparisonRow
 *   label="Revenue"
 *   current="$24,800"
 *   previous="$21,300"
 *   deltaPct={16.4}
 *   periodLabel="vs. last month"
 * />
 * ```
 *
 * @remarks
 * The delta chip colors by SIGN with fixed semantics: positive = green,
 * negative = red (hardcoded hexes, not theme tokens). There is no
 * "down-is-good" inversion — for metrics like churn or costs, negate
 * `deltaPct` (and restate the sign in `formatDelta`, which controls the text
 * only, never the color). `label` / `current` / `previous` / `periodLabel`
 * are consumer-provided ReactNodes — pass pre-formatted, translated values.
 *
 * @module
 */

export * from './ComparisonRow.js'
