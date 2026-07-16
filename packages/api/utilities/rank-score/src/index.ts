/**
 * Pure-function ranking algorithms for link- and news-aggregator style
 * apps: HN time-decay rank, Reddit hot/best/controversial, plain recency
 * and score.
 *
 * Every algorithm is a pure function — accepts `{ ups, downs, createdAt }`
 * plus a `{ now, gravity? }` context, returns a finite number. No I/O,
 * no global `Date.now()` reads, no provider wiring. Suitable for use
 * inside DataStore-driven sort handlers, cron rollup workers, or
 * client-side previews.
 *
 * @example
 * ```ts
 * import { hnScore, rankScore } from '@molecule/api-rank-score'
 *
 * const item = { ups: 42, downs: 3, createdAt: '2026-04-30T12:00:00Z' }
 * const ctx = { now: new Date() }
 *
 * const directScore = hnScore(item, ctx)
 * const dispatched = rankScore('reddit-hot', item, ctx)
 * ```
 *
 * @remarks
 * Scoring is O(1) per item but sorting a large feed by a time-decay score is
 * O(n log n) per request and the scores change continuously. For
 * high-cardinality feeds, precompute scores on a schedule (cron/queue worker
 * writing a `score` column, then ORDER BY it) instead of ranking every row at
 * request time. `hnScore`, `redditHotScore`, and `recencyScore` read
 * `ctx.now` — pass the same `now` for every item in one ranking pass so
 * concurrent requests produce a stable order. `redditBestScore` and
 * `redditControversialScore` ignore time entirely.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './algorithms.js'
export * from './dispatch.js'
export * from './types.js'
export * from './utilities.js'
