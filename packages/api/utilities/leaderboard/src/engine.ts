/**
 * Pure leaderboard engine.
 *
 * Aggregates a flat list of `LeaderboardEvent`s into a ranked
 * `LeaderboardEntry[]`. No I/O, no DB, no globals — fully unit-testable.
 *
 * Recompute-after-event semantics: callers either re-pass the full
 * relevant event slice on each query (cheap; works for small datasets
 * or pre-filtered slices) or use the persistence service to do the
 * filtering server-side.
 *
 * @module
 */

import type {
  Aggregation,
  ComputeInput,
  LeaderboardEntry,
  LeaderboardEvent,
  LeaderboardOptions,
  TieBreak,
} from './types.js'
import { isInWindow, resolveWindow } from './window.js'

/**
 * Aggregate per-user data while we walk the event list once.
 */
interface Bucket {
  user_id: string
  /** Rolling aggregate as defined by the chosen `Aggregation`. */
  score: number
  /** Number of events contributing to this bucket. */
  count: number
  /** Earliest contributing event time — drives the `earliest` tie-break. */
  earliest: number
  /** Latest contributing event time — drives the `latest` aggregation. */
  latest: number
  /** Value of the `latest` event — only used when aggregation is `latest`. */
  latestValue: number
}

/**
 * Pure aggregator. Computes a ranked leaderboard from the supplied
 * events using competition ranking (`1, 2, 2, 4`) with optional
 * deterministic tie-break ordering for the result array.
 *
 * Filters events against the resolved window and (when supplied) the
 * `scopeKey`. Events with a `scopeKey` mismatch — including events
 * that have a `scopeKey` when none was requested — are excluded.
 *
 * @param input - Events plus options.
 * @returns Ranked leaderboard, paginated by `offset` + `limit`.
 */
export function computeLeaderboard(input: ComputeInput): LeaderboardEntry[] {
  const { events, options } = input
  const aggregation: Aggregation = input.aggregation ?? 'sum'
  const tieBreak: TieBreak = options.tieBreak ?? 'none'
  const resolved = resolveWindow(options.window, options.now)

  const buckets = new Map<string, Bucket>()

  for (const event of events) {
    if (!isEventEligible(event, options.scopeKey, resolved)) continue
    accumulate(buckets, event, aggregation)
  }

  const ranked = rankBuckets(Array.from(buckets.values()), tieBreak)
  return paginate(ranked, options)
}

/**
 * `true` when an event passes scope and window filters.
 *
 * @param event - Event to test.
 * @param scopeKey - Optional scope partition.
 * @param resolved - Resolved window.
 * @returns `true` when the event should contribute to the aggregate.
 */
function isEventEligible(
  event: LeaderboardEvent,
  scopeKey: string | undefined,
  resolved: { start: Date | null; end: Date | null },
): boolean {
  if (scopeKey === undefined) {
    if (event.scopeKey !== undefined) return false
  } else if (event.scopeKey !== scopeKey) {
    return false
  }
  if (!isInWindow(event.when, resolved)) return false
  return true
}

/**
 * Fold a single event into the appropriate per-user bucket.
 *
 * @param buckets - Bucket map keyed by `user_id`.
 * @param event - Event to add.
 * @param aggregation - Aggregation strategy.
 */
function accumulate(
  buckets: Map<string, Bucket>,
  event: LeaderboardEvent,
  aggregation: Aggregation,
): void {
  const ts = event.when.getTime()
  const existing = buckets.get(event.user_id)

  if (!existing) {
    buckets.set(event.user_id, {
      user_id: event.user_id,
      score: aggregation === 'count' ? 1 : event.value,
      count: 1,
      earliest: ts,
      latest: ts,
      latestValue: event.value,
    })
    return
  }

  existing.count += 1
  if (ts < existing.earliest) existing.earliest = ts
  if (ts >= existing.latest) {
    existing.latest = ts
    existing.latestValue = event.value
  }

  switch (aggregation) {
    case 'sum':
      existing.score += event.value
      break
    case 'max':
      if (event.value > existing.score) existing.score = event.value
      break
    case 'count':
      existing.score = existing.count
      break
    case 'latest':
      existing.score = existing.latestValue
      break
  }
}

/**
 * Sort buckets and assign 1-based competition ranks.
 *
 * Primary sort: score descending. Secondary sort (within ties): the
 * caller-selected `tieBreak`. The same numeric `rank` is shared by
 * tied entries; the next distinct score skips ahead by the number of
 * preceding ties.
 *
 * @param buckets - Aggregated buckets to rank.
 * @param tieBreak - Tie-break strategy.
 * @returns Fully ranked entries (not yet paginated).
 */
function rankBuckets(buckets: Bucket[], tieBreak: TieBreak): LeaderboardEntry[] {
  const sorted = buckets.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    switch (tieBreak) {
      case 'earliest':
        return a.earliest - b.earliest
      case 'user_id':
        return a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0
      case 'none':
      default:
        return 0
    }
  })

  const ranked: LeaderboardEntry[] = []
  let lastScore: number | null = null
  let lastRank = 0

  for (let i = 0; i < sorted.length; i++) {
    const bucket = sorted[i]!
    let rank: number
    if (lastScore !== null && bucket.score === lastScore) {
      rank = lastRank
    } else {
      rank = i + 1
      lastScore = bucket.score
      lastRank = rank
    }
    ranked.push({ user_id: bucket.user_id, rank, score: bucket.score })
  }

  // Mark `tied` for entries sharing a rank with at least one neighbour.
  const rankCounts = new Map<number, number>()
  for (const entry of ranked) {
    rankCounts.set(entry.rank, (rankCounts.get(entry.rank) ?? 0) + 1)
  }
  for (const entry of ranked) {
    if ((rankCounts.get(entry.rank) ?? 0) > 1) entry.tied = true
  }

  return ranked
}

/**
 * Apply `offset` + `limit` to a ranked list while preserving rank
 * numbers (so page 2 still says `rank: 11` for the 11th entry).
 *
 * @param ranked - Fully ranked entries.
 * @param options - Engine options carrying `offset` / `limit`.
 * @returns Paged slice.
 */
function paginate(ranked: LeaderboardEntry[], options: LeaderboardOptions): LeaderboardEntry[] {
  const offset = Math.max(0, options.offset ?? 0)
  const limit = options.limit
  if (limit === undefined) {
    return ranked.slice(offset)
  }
  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error(`limit must be a non-negative integer, got ${String(limit)}`)
  }
  return ranked.slice(offset, offset + limit)
}
