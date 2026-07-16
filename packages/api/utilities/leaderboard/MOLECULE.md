# @molecule/api-leaderboard

Generic leaderboard engine for molecule.dev.

Ranked-aggregate over `(user_id, metric, window)` with built-in
`daily` / `weekly` / `monthly` / `all-time` windows, custom
`[start, end)` ranges, optional `scopeKey` partitioning (per-cohort,
per-classroom, per-friend-group), competition ranking with explicit
tie-break strategies, and pagination.

The pure engine ({@link computeLeaderboard}) is fully testable
without a database. The {@link recordMetric}, {@link getLeaderboard},
{@link rollupLeaderboard}, and {@link deleteEvents} service helpers
persist via the abstract `@molecule/api-database` DataStore — no raw
SQL in handler-callable code. Schema lives in
`__setup__/leaderboard_events.sql`.

Apps that need cron-style rollups can wire {@link rollupLeaderboard}
into a `@molecule/api-cron` job.

## Quick Start

```typescript
import {
  recordMetric,
  getLeaderboard,
  rollupLeaderboard,
} from '@molecule/api-leaderboard'

await recordMetric('user-1', 'xp', 50)
await recordMetric('user-2', 'xp', 70)

const top = await getLeaderboard({
  metric: 'xp',
  window: 'weekly',
  limit: 10,
  tieBreak: 'earliest',
})

// Cron rollup (e.g. every hour)
await rollupLeaderboard({ metric: 'xp', window: 'weekly' })
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-leaderboard @molecule/api-database
```

## API

### Interfaces

#### `ComputeInput`

Inputs for the pure {@link computeLeaderboard} engine.

```typescript
interface ComputeInput {
  /** Events to aggregate. Pre-filtering by metric / scope is the caller's job. */
  events: LeaderboardEvent[]
  /** Engine options (window resolution, ranking, paging). */
  options: LeaderboardOptions
  /** Aggregation strategy. Defaults to `sum`. */
  aggregation?: Aggregation
}
```

#### `CustomWindow`

A custom half-open `[start, end)` window expressed as `Date`s.

```typescript
interface CustomWindow {
  /** Inclusive lower bound. */
  start: Date
  /** Exclusive upper bound. */
  end: Date
}
```

#### `LeaderboardEntry`

A single entry in a computed leaderboard.

`rank` is 1-based and uses **competition ranking** (a.k.a. "1224"):
tied entries share the same rank, and the next distinct score skips
by the number of ties (1, 2, 2, 4 — no rank `3`).

```typescript
interface LeaderboardEntry {
  /** The user identifier this entry represents. */
  user_id: string
  /**
   * 1-based competition rank. Tied entries share the same `rank`; the
   * next distinct score skips ahead by the number of preceding ties.
   */
  rank: number
  /** Aggregated score for the entry within the requested window. */
  score: number
  /** `true` when at least one other entry in the result shares this rank. */
  tied?: boolean
}
```

#### `LeaderboardEvent`

A single recorded metric event used by the pure engine.

```typescript
interface LeaderboardEvent {
  /** The user identifier. */
  user_id: string
  /** Score contribution for this event (any finite number). */
  value: number
  /** Event timestamp. */
  when: Date
  /**
   * Optional scope partition matching the {@link LeaderboardOptions.scopeKey}
   * supplied at query time. Events with a non-matching `scopeKey` are
   * filtered out.
   */
  scopeKey?: string
}
```

#### `LeaderboardOptions`

Options accepted by {@link getLeaderboard} / {@link computeLeaderboard}.

```typescript
interface LeaderboardOptions {
  /** Metric identifier, e.g. `'xp'`, `'lessons-completed'`, `'goals'`. */
  metric: string
  /** Window over which to aggregate. Named or custom. */
  window: LeaderboardWindow
  /**
   * Maximum entries returned (top-N). When omitted, all matching
   * entries are returned (still ranked).
   */
  limit?: number
  /**
   * Number of leading entries to skip (paginated top-N). Defaults to
   * `0`. Combined with `limit` this enables stable paging.
   */
  offset?: number
  /**
   * Optional scope partition. Two boards with different `scopeKey`
   * never see each other's events — useful for per-classroom,
   * per-cohort, or per-friend-group boards.
   */
  scopeKey?: string
  /**
   * Tie-break strategy. Defaults to `'none'`.
   */
  tieBreak?: TieBreak
  /**
   * Reference instant for resolving named windows (`daily`, `weekly`,
   * `monthly`). Defaults to `new Date()` at call time.
   */
  now?: Date
}
```

#### `ResolvedWindow`

Resolved window — either edge may be `null` for an unbounded side.

```typescript
interface ResolvedWindow {
  /** Inclusive lower bound, or `null` for an unbounded start. */
  start: Date | null
  /** Exclusive upper bound, or `null` for an unbounded end. */
  end: Date | null
}
```

### Types

#### `Aggregation`

Aggregation strategy for combining multiple events for the same user
within a window.

- `sum` (default) — total of `value`s.
- `max` — highest single `value`.
- `count` — number of events (ignores `value`).
- `latest` — `value` of the most recent event.

```typescript
type Aggregation = 'sum' | 'max' | 'count' | 'latest'
```

#### `LeaderboardWindow`

The full set of supported window descriptors.

```typescript
type LeaderboardWindow = NamedWindow | CustomWindow
```

#### `NamedWindow`

Named time windows supported out of the box.

`daily`, `weekly`, `monthly` are computed against the **calendar
boundaries in UTC** of the reference instant (defaulting to "now").
`all-time` aggregates every recorded event regardless of timestamp.

```typescript
type NamedWindow = 'daily' | 'weekly' | 'monthly' | 'all-time'
```

#### `TieBreak`

Tie-break strategy for entries with equal aggregated scores.

- `none` (default) — tied entries keep the same rank (competition
  ranking). Order among ties is implementation-defined.
- `earliest` — among ties, the user whose earliest contributing
  event has the lower timestamp ranks higher (still shares the rank,
  but appears first in the result array).
- `user_id` — stable lexicographic tiebreaker by `user_id` ascending.

```typescript
type TieBreak = 'none' | 'earliest' | 'user_id'
```

### Functions

#### `computeLeaderboard(input)`

Pure aggregator. Computes a ranked leaderboard from the supplied
events using competition ranking (`1, 2, 2, 4`) with optional
deterministic tie-break ordering for the result array.

Filters events against the resolved window and (when supplied) the
`scopeKey`. Events with a `scopeKey` mismatch — including events
that have a `scopeKey` when none was requested — are excluded.

```typescript
function computeLeaderboard(input: ComputeInput): LeaderboardEntry[]
```

- `input` — Events plus options.

**Returns:** Ranked leaderboard, paginated by `offset` + `limit`.

#### `deleteEvents(metric, scopeKey)`

Bulk delete events for a metric (and optional scope). Useful for
tests, GDPR erasure, or pruning historical data.

```typescript
function deleteEvents(metric: string, scopeKey?: string): Promise<void>
```

- `metric` — Metric identifier.
- `scopeKey` — Optional scope partition. When omitted, **all**

**Returns:** Resolves once the deletion is dispatched.

#### `getLeaderboard(options, aggregation)`

Reads all events relevant to the requested leaderboard, then folds
them through the pure engine.

For very large boards, prefer {@link rollupLeaderboard} and read
pre-computed rollups instead.

```typescript
function getLeaderboard(options: LeaderboardOptions, aggregation?: Aggregation): Promise<LeaderboardEntry[]>
```

- `options` — Leaderboard query options.
- `aggregation` — Aggregation strategy. Defaults to `sum`.

**Returns:** Ranked + paginated entries.

#### `isInWindow(when, resolved)`

`true` when `when` falls inside `[resolved.start, resolved.end)`.
`null` edges are treated as unbounded.

```typescript
function isInWindow(when: Date, resolved: ResolvedWindow): boolean
```

- `when` — Event timestamp.
- `resolved` — Resolved window.

**Returns:** `true` if `when` is inside the window.

#### `recordMetric(userId, metric, value, when, scopeKey)`

Records a single metric event for a user.

Idempotency: not enforced. Apps that need de-duplication should pass
a stable surrogate metric id and clean up via {@link deleteEvents}
before re-recording, or use a dedicated upsert path.

```typescript
function recordMetric(userId: string, metric: string, value: number, when?: Date, scopeKey?: string): Promise<void>
```

- `userId` — The user identifier.
- `metric` — Metric identifier, e.g. `'xp'`, `'lessons-completed'`.
- `value` — Score contribution. Any finite number.
- `when` — Event timestamp. Defaults to `new Date()`.
- `scopeKey` — Optional scope partition for friend / cohort boards.

**Returns:** Resolves once the row is persisted.

#### `resolveWindow(window, now)`

Resolve a {@link LeaderboardWindow} to a concrete `[start, end)` pair.

Named windows are computed against `now`:
 - `daily` — `[start of UTC day, +24h)`.
 - `weekly` — `[start of ISO week (Monday 00:00 UTC), +7d)`.
 - `monthly` — `[first of UTC month, first of next UTC month)`.
 - `all-time` — `{ start: null, end: null }`.

Custom windows are returned as-is.

```typescript
function resolveWindow(window: LeaderboardWindow, now?: Date): ResolvedWindow
```

- `window` — The window descriptor.
- `now` — Reference instant for named windows. Defaults to `new Date()`.

**Returns:** The resolved window.

#### `rollupLeaderboard(options, aggregation)`

Computes a leaderboard once and persists each ranked entry to the
`leaderboard_rollups` table for the supplied window. Useful from a
`@molecule/api-cron` hourly/daily job.

Existing rollup rows for the exact same `(metric, window_kind,
window_start, scope_key)` tuple are deleted first so the rollup
reflects the latest aggregate state.

```typescript
function rollupLeaderboard(options: LeaderboardOptions, aggregation?: Aggregation): Promise<LeaderboardEntry[]>
```

- `options` — Leaderboard query options. `limit` / `offset` are
- `aggregation` — Aggregation strategy. Defaults to `sum`.

**Returns:** The ranked entries that were written.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0

### Runtime Dependencies

- `@molecule/api-database`

Table prerequisites: the service helpers read/write `leaderboard_events`
and `leaderboard_rollups`. The DDL ships as .sql files under the package's
`__setup__` directory. An mlcl-scaffolded API replays those .sql files
automatically on migrate; anywhere else run the file once against your
database — nothing at runtime creates the tables. The shipped DDL is
PostgreSQL dialect (`gen_random_uuid()`, `TIMESTAMPTZ`, a partial index);
adapt column types/defaults for SQLite or MySQL — the service itself is
dialect-agnostic (abstract DataStore calls only).

A `@molecule/api-database` bond must be wired at startup before calling
the service helpers; the pure engine (`computeLeaderboard`) needs no
database at all.

Scope semantics: omitting `scopeKey` in a query targets the GLOBAL board
(rows whose `scope_key` is null) — it does not aggregate across scopes.
Ranking is competition style: tied scores share a rank, and `tieBreak`
(`'none' | 'earliest' | 'user_id'`) controls ordering within a tie.
