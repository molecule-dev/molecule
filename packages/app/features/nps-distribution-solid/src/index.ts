/**
 * Solid Net Promoter Score distribution chart.
 *
 * Exports `NpsDistribution` — 11-row 0..10 horizontal bar chart with
 * detractor / passive / promoter color tiers and an optional computed
 * NPS score line. It is the Solid counterpart of
 * `@molecule/app-nps-distribution-react`: same props (React names), same
 * ClassMap tokens and the same DOM for the same input.
 *
 * The pure helper `computeNps(scores, detractorMax?, passiveMax?)` is
 * also exported so callers can run the math without rendering.
 *
 * @example
 * ```tsx
 * import { NpsDistribution, computeNps } from '@molecule/app-nps-distribution-solid'
 *
 * const scores = [10, 9, 9, 7, 6, 0, 8, 10]
 * const { score } = computeNps(scores)
 *
 * export function ResultsCard() {
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
 * `@molecule/app-locales-nps-distribution`. A wired ClassMap bond is
 * required — `getClassMap()` throws before wiring. Text resolves through
 * `useTranslation()` from `@molecule/app-solid`, so the chart re-renders on
 * a live locale switch.
 *
 * @module
 */

export * from './computeNps.js'
export * from './NpsDistribution.jsx'
export * from './types.js'
