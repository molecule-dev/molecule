# @molecule/api-rank-score

Pure-function ranking algorithms for link- and news-aggregator style
apps: HN time-decay rank, Reddit hot/best/controversial, plain recency
and score.

Every algorithm is a pure function — accepts `{ ups, downs, createdAt }`
plus a `{ now, gravity? }` context, returns a finite number. No I/O,
no global `Date.now()` reads, no provider wiring. Suitable for use
inside DataStore-driven sort handlers, cron rollup workers, or
client-side previews.

## Quick Start

```ts
import { hnScore, rankScore } from '@molecule/api-rank-score'

const item = { ups: 42, downs: 3, createdAt: '2026-04-30T12:00:00Z' }
const ctx = { now: new Date() }

const directScore = hnScore(item, ctx)
const dispatched = rankScore('reddit-hot', item, ctx)
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-rank-score
```

## API

### Interfaces

#### `RankContext`

Common context for any ranking algorithm. `now` is injected so the
functions stay pure (no `Date.now()` reads inside).

```typescript
interface RankContext {
  /** Reference "now" for time-decay calculations. */
  now: Date | string | number
  /**
   * Decay exponent for HN-style and recency algorithms. Higher = faster
   * decay. Default `1.8` (HN's classic value).
   */
  gravity?: number
}
```

#### `RankItem`

Vote tally + creation timestamp for an item being ranked.

`ups` and `downs` are independent counts — Reddit-style. The `score`
(`ups - downs`) is computed by the algorithms that need it.

```typescript
interface RankItem {
  /** Number of upvotes / positive signals. Must be ≥ 0. */
  ups: number
  /** Number of downvotes / negative signals. Must be ≥ 0. */
  downs: number
  /**
   * When the item was created. Accepts `Date`, ISO-8601 string, or epoch ms
   * — normalised internally.
   */
  createdAt: Date | string | number
}
```

### Types

#### `RankAlgorithm`

Identifier for the supported ranking algorithms.

```typescript
type RankAlgorithm =
  | 'hn'
  | 'reddit-hot'
  | 'reddit-best'
  | 'reddit-controversial'
  | 'recency'
  | 'score'
```

### Functions

#### `hnScore(item, ctx)`

Hacker-News-style decay rank.

Formula: `(P - 1) / (T + 2)^G` where `P = ups - downs` (clamped at 0),
`T` is item age in hours, and `G` is gravity (default 1.8). Newer items
with fewer points can outrank older items with many.

```typescript
function hnScore(item: RankItem, ctx: RankContext): number
```

- `item` — Item being ranked.
- `ctx` — Reference time and optional gravity override.

**Returns:** Numeric score; higher = better. Always finite.

#### `hoursBetween(then, now)`

Hours elapsed between two timestamps. Result may be negative if `then`
is in the future relative to `now`.

```typescript
function hoursBetween(then: number, now: number): number
```

- `then` — The earlier (item creation) timestamp, ms.
- `now` — The reference timestamp, ms.

**Returns:** Elapsed hours as a float.

#### `pureScore(item)`

Pure-score rank — `ups - downs`, no time decay.

```typescript
function pureScore(item: RankItem): number
```

- `item` — Item being ranked.

**Returns:** Net score (may be negative).

#### `rankScore(algorithm, item, ctx)`

Compute a rank score using the named algorithm.

Convenience dispatcher — handlers/cron workers usually call the
specific algorithm directly, but this is handy when the algorithm
choice is configurable per project.

```typescript
function rankScore(algorithm: RankAlgorithm, item: RankItem, ctx: RankContext): number
```

- `algorithm` — Algorithm identifier.
- `item` — Item being ranked.
- `ctx` — Reference time + optional gravity.

**Returns:** Numeric score; semantics depend on the chosen algorithm.

#### `recencyScore(item, ctx)`

Pure-recency rank — newer = higher. Uses gravity to decay.

Formula: `1 / (T + 2)^G` where `T` is age in hours.

```typescript
function recencyScore(item: RankItem, ctx: RankContext): number
```

- `item` — Item being ranked. Vote counts are unused.
- `ctx` — Reference time and optional gravity (default `1.8`).

**Returns:** Score in `(0, 1]`; higher = newer.

#### `redditBestScore(item)`

Reddit's "best" ranking — Wilson score lower-bound of the 95% confidence
interval for the proportion of upvotes. Time-independent.

Edge cases:
  - `ups + downs === 0` → returns `0`.
  - All upvotes (downs=0) → bounded above by `<1`, but still grows with
    more votes (more confidence).
  - Tied votes → returns the lower bound of the 50% proportion at that
    sample size.

```typescript
function redditBestScore(item: RankItem): number
```

- `item` — Item being ranked. `createdAt` is unused.

**Returns:** Score in `[0, 1)`. Higher = better.

#### `redditControversialScore(item)`

Reddit's "controversial" ranking — favours items with high engagement
AND a near-50/50 up/down ratio.

Formula: `(ups + downs) * (min(ups, downs) / max(ups, downs))`.

Items with very lopsided ratios collapse toward 0; perfectly-tied items
with high vote totals score highest. Returns 0 if either side is 0
(no controversy without dissent).

```typescript
function redditControversialScore(item: RankItem): number
```

- `item` — Item being ranked. `createdAt` is unused.

**Returns:** Numeric score ≥ 0; higher = more controversial.

#### `redditHotScore(item, ctx)`

Reddit's "hot" ranking — `log10(|score|) + sign(score) * t / 45000`,
where `t` is the item's age in seconds *relative to a fixed epoch*
(Reddit uses `2005-12-08T07:46:43Z`). We approximate by using the
provided `ctx.now` as the epoch — the **relative** ordering between
items at the same `now` is what matters, which matches Reddit's
intent (newer items get a small bonus).

Symmetric: heavily-downvoted items receive an inverted ranking equal in
magnitude to their upvoted mirror — useful for "show controversial at
the bottom" rather than just hiding them.

```typescript
function redditHotScore(item: RankItem, ctx: RankContext): number
```

- `item` — Item being ranked.
- `ctx` — Reference time (unused gravity).

**Returns:** Numeric score; higher = better.

#### `sign(n)`

Sign of `n` — `-1`, `0`, or `1`. `Math.sign` returns `-0`/`0` ambiguously
across engines for some inputs; this helper coerces to `0`.

```typescript
function sign(n: number): 0 | 1 | -1
```

- `n` — Any finite number.

**Returns:** `-1`, `0`, or `1`.

#### `toEpochMs(value)`

Normalises a `Date | string | number` to epoch milliseconds.

```typescript
function toEpochMs(value: string | number | Date): number
```

- `value` — Date instance, ISO-8601 string, or epoch ms number.

**Returns:** Epoch milliseconds.

## Injection Notes

For high-cardinality feeds, score precomputation in a cron worker is
recommended — see the package proposal note on resource intensity.
