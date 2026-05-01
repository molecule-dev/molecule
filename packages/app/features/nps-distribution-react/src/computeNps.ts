import type { NpsBucket, NpsResult, NpsTier } from './types.js'

/** Default NPS bucket cutoffs (industry standard: 0–6 detractor, 7–8 passive, 9–10 promoter). */
const DEFAULT_DETRACTOR_MAX = 6
const DEFAULT_PASSIVE_MAX = 8
const NPS_SCORE_MIN = 0
const NPS_SCORE_MAX = 10

/**
 * Resolve the tier for a single score given the configured cutoffs.
 *
 * @param score - The 0..10 survey score.
 * @param detractorMax - Highest score still classified as detractor.
 * @param passiveMax - Highest score still classified as passive.
 * @returns The {@link NpsTier} the score falls into.
 */
export function tierFor(score: number, detractorMax: number, passiveMax: number): NpsTier {
  if (score <= detractorMax) return 'detractor'
  if (score <= passiveMax) return 'passive'
  return 'promoter'
}

/**
 * Compute the Net Promoter Score plus per-bucket totals from a raw scores array.
 *
 * Pure helper — no React, no DOM. Exported so callers can run the math
 * without rendering, e.g. in summary cards or test assertions.
 *
 * Formula: `NPS = ( (#promoters / total) - (#detractors / total) ) * 100`,
 * rounded to the nearest integer. Range: -100..100. Returns `0` when
 * `total === 0` to keep the type non-nullable; the caller decides whether
 * to display the score for empty datasets via the `showScore` prop on
 * `<NpsDistribution>`.
 *
 * Out-of-range scores (negative, > 10, non-integer, NaN, non-finite) are
 * silently dropped so a rogue input value can't poison the chart.
 *
 * @param scores - Raw survey scores.
 * @param detractorMax - Highest detractor score (default 6).
 * @param passiveMax - Highest passive score (default 8).
 * @returns The {@link NpsResult} with score, totals, and per-score buckets.
 */
export function computeNps(
  scores: number[],
  detractorMax: number = DEFAULT_DETRACTOR_MAX,
  passiveMax: number = DEFAULT_PASSIVE_MAX,
): NpsResult {
  const counts = new Array<number>(NPS_SCORE_MAX - NPS_SCORE_MIN + 1).fill(0)
  let total = 0
  let detractors = 0
  let passives = 0
  let promoters = 0

  for (const raw of scores) {
    if (!Number.isFinite(raw)) continue
    if (!Number.isInteger(raw)) continue
    if (raw < NPS_SCORE_MIN || raw > NPS_SCORE_MAX) continue
    counts[raw - NPS_SCORE_MIN] += 1
    total += 1
    const tier = tierFor(raw, detractorMax, passiveMax)
    if (tier === 'detractor') detractors += 1
    else if (tier === 'passive') passives += 1
    else promoters += 1
  }

  const buckets: NpsBucket[] = counts.map((count, idx) => {
    const score = idx + NPS_SCORE_MIN
    return { score, count, tier: tierFor(score, detractorMax, passiveMax) }
  })

  const score = total === 0 ? 0 : Math.round(((promoters - detractors) / total) * 100)

  return { score, total, detractors, passives, promoters, buckets }
}
