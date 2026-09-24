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
 * import { computeNps, NpsDistribution } from '@molecule/app-nps-distribution-react'
 *
 * export function SurveyResults() {
 *   const responses = [
 *     { id: 'r1', score: 10 }, { id: 'r2', score: 9 }, { id: 'r3', score: 9 }, { id: 'r4', score: 7 },
 *     { id: 'r5', score: 6 }, { id: 'r6', score: 0 }, { id: 'r7', score: 8 }, { id: 'r8', score: 10 },
 *   ]
 *   const scores = responses.map((r) => r.score)
 *   const nps = computeNps(scores) // 4 promoters, 2 passives, 2 detractors → score 25
 *   return (
 *     <section>
 *       <h2>{`Promoters: ${nps.promoters} · Passives: ${nps.passives} · Detractors: ${nps.detractors}`}</h2>
 *       <NpsDistribution scores={scores} dataMolId="survey-nps-chart" />
 *     </section>
 *   )
 * }
 * ```
 *
 * @remarks
 * `scores` is the RAW list of 0..10 answers (one number per response), NOT pre-counted
 * buckets — `[10, 9, 9]`, not `{ 9: 2, 10: 1 }`. Non-integer / out-of-range values are
 * silently dropped. The chart computes the score itself (`showScore` defaults to true); use
 * `computeNps()` only when you need the numbers elsewhere. `computeNps` takes positional
 * cutoffs `(scores, detractorMax = 6, passiveMax = 8)` — not an options object. It needs no
 * `I18nProvider`.
 *
 * Bar widths scale relative to the tallest bucket. Color tiers map to
 * the semantic ClassMap CSS custom properties
 * (`--mol-color-error|warning|success`) so the chart re-themes
 * automatically when the ClassMap bond is swapped. All user-facing text
 * goes through `t()` with companion locale bond
 * `@molecule/app-locales-nps-distribution`. A wired ClassMap bond is
 * required — `getClassMap()` throws before wiring. Text resolves through
 * the global `t()` (not the React hook), so already-rendered charts
 * don't re-translate on a live locale switch until re-render.
 *
 * @module
 */

export * from './computeNps.js'
export * from './NpsDistribution.js'
export * from './types.js'
