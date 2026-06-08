/**
 * React Net Promoter Score distribution chart.
 *
 * Exports `<NpsDistribution>` — 11-row 0..10 horizontal bar chart with
 * detractor / passive / promoter color tiers and an optional computed
 * NPS score line. Used by the survey-feedback-tool flagship.
 *
 * The pure helper `computeNps(scores, detractorMax?, passiveMax?)` is
 * also exported so callers can run the math without rendering.
 *
 * @example
 * ```tsx
 * import { NpsDistribution, computeNps } from '@molecule/app-nps-distribution-react'
 *
 * const scores = [10, 9, 9, 7, 6, 0, 8, 10]
 * const { score } = computeNps(scores)
 *
 * function ResultsCard() {
 *   return <NpsDistribution scores={scores} />
 * }
 * ```
 *
 * @remarks
 * Bar widths scale relative to the tallest bucket. Color tiers map to
 * the semantic ClassMap CSS custom properties
 * (`--mol-color-error|warning|success`) so the chart re-themes
 * automatically when the ClassMap bond is swapped. All user-facing text
 * goes through `t()` with companion locale bond
 * `@molecule/app-locales-nps-distribution-react`.
 *
 * @module
 */

export * from './computeNps.js'
export * from './NpsDistribution.js'
export * from './types.js'
