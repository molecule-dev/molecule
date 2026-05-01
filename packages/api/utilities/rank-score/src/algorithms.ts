import type { RankContext, RankItem } from './types.js'
import { hoursBetween, sign, toEpochMs } from './utilities.js'

/** HN's classic gravity. */
const DEFAULT_GRAVITY = 1.8

/**
 * Hacker-News-style decay rank.
 *
 * Formula: `(P - 1) / (T + 2)^G` where `P = ups - downs` (clamped at 0),
 * `T` is item age in hours, and `G` is gravity (default 1.8). Newer items
 * with fewer points can outrank older items with many.
 *
 * @param item - Item being ranked.
 * @param ctx - Reference time and optional gravity override.
 * @returns Numeric score; higher = better. Always finite.
 */
export const hnScore = (item: RankItem, ctx: RankContext): number => {
  const points = Math.max(0, item.ups - item.downs)
  const ageHours = Math.max(0, hoursBetween(toEpochMs(item.createdAt), toEpochMs(ctx.now)))
  const gravity = ctx.gravity ?? DEFAULT_GRAVITY
  return (points - 1) / Math.pow(ageHours + 2, gravity)
}

/**
 * Reddit's "hot" ranking — `log10(|score|) + sign(score) * t / 45000`,
 * where `t` is the item's age in seconds *relative to a fixed epoch*
 * (Reddit uses `2005-12-08T07:46:43Z`). We approximate by using the
 * provided `ctx.now` as the epoch — the **relative** ordering between
 * items at the same `now` is what matters, which matches Reddit's
 * intent (newer items get a small bonus).
 *
 * Symmetric: heavily-downvoted items receive an inverted ranking equal in
 * magnitude to their upvoted mirror — useful for "show controversial at
 * the bottom" rather than just hiding them.
 *
 * @param item - Item being ranked.
 * @param ctx - Reference time (unused gravity).
 * @returns Numeric score; higher = better.
 */
export const redditHotScore = (item: RankItem, ctx: RankContext): number => {
  const score = item.ups - item.downs
  const order = Math.log10(Math.max(Math.abs(score), 1))
  const s = sign(score)
  const ageSeconds = (toEpochMs(ctx.now) - toEpochMs(item.createdAt)) / 1000
  // Canonical Reddit form: `sign * order + seconds_since_epoch / 45000`.
  // We use `-ageSeconds` instead of `+seconds_since_epoch` so newer items
  // (smaller age) rank higher. The order term is signed to make the
  // function symmetric under sign-flip of the net score.
  return s * order - ageSeconds / 45_000
}

/**
 * Reddit's "best" ranking — Wilson score lower-bound of the 95% confidence
 * interval for the proportion of upvotes. Time-independent.
 *
 * Edge cases:
 *   - `ups + downs === 0` → returns `0`.
 *   - All upvotes (downs=0) → bounded above by `<1`, but still grows with
 *     more votes (more confidence).
 *   - Tied votes → returns the lower bound of the 50% proportion at that
 *     sample size.
 *
 * @param item - Item being ranked. `createdAt` is unused.
 * @returns Score in `[0, 1)`. Higher = better.
 */
export const redditBestScore = (item: RankItem): number => {
  const n = item.ups + item.downs
  if (n === 0) return 0
  const z = 1.2815515655446 // 80% one-sided (Reddit's published constant)
  const p = item.ups / n
  const left = p + (z * z) / (2 * n)
  const right = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)
  const under = 1 + (z * z) / n
  // Float-precision can produce tiny-negative results for `ups = 0`; clamp.
  return Math.max(0, (left - right) / under)
}

/**
 * Reddit's "controversial" ranking — favours items with high engagement
 * AND a near-50/50 up/down ratio.
 *
 * Formula: `(ups + downs) * (min(ups, downs) / max(ups, downs))`.
 *
 * Items with very lopsided ratios collapse toward 0; perfectly-tied items
 * with high vote totals score highest. Returns 0 if either side is 0
 * (no controversy without dissent).
 *
 * @param item - Item being ranked. `createdAt` is unused.
 * @returns Numeric score ≥ 0; higher = more controversial.
 */
export const redditControversialScore = (item: RankItem): number => {
  if (item.ups <= 0 || item.downs <= 0) return 0
  const magnitude = item.ups + item.downs
  const balance = Math.min(item.ups, item.downs) / Math.max(item.ups, item.downs)
  return magnitude * balance
}

/**
 * Pure-recency rank — newer = higher. Uses gravity to decay.
 *
 * Formula: `1 / (T + 2)^G` where `T` is age in hours.
 *
 * @param item - Item being ranked. Vote counts are unused.
 * @param ctx - Reference time and optional gravity (default `1.8`).
 * @returns Score in `(0, 1]`; higher = newer.
 */
export const recencyScore = (item: RankItem, ctx: RankContext): number => {
  const ageHours = Math.max(0, hoursBetween(toEpochMs(item.createdAt), toEpochMs(ctx.now)))
  const gravity = ctx.gravity ?? DEFAULT_GRAVITY
  return 1 / Math.pow(ageHours + 2, gravity)
}

/**
 * Pure-score rank — `ups - downs`, no time decay.
 *
 * @param item - Item being ranked.
 * @returns Net score (may be negative).
 */
export const pureScore = (item: RankItem): number => {
  return item.ups - item.downs
}
