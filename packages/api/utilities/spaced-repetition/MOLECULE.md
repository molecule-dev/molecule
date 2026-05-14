# @molecule/api-spaced-repetition

Pure-function SM-2 spaced-repetition algorithm for molecule.dev.

Implements Piotr Wozniak's SM-2 algorithm exactly as published in
"Optimization of repetition spacing in the course of learning"
(1990). No I/O, no DB, no clock reads — every scheduling decision
is a pure function of `(state, quality, options.now)`. This keeps
it equally usable from API handlers, AI study agents, mock-server
fixtures, and frontend test harnesses.

Used by flashcard-app and language-learning today, and by any
future app that needs spaced-repetition scheduling. Future
algorithms (FSRS / SM-15) can be added as additional named exports
without breaking the SM-2 API.

## Quick Start

```ts
import { initialSm2State, reviewSm2 } from '@molecule/api-spaced-repetition'

let state = initialSm2State()
state = reviewSm2(state, 5)        // first correct review → interval 1d
state = reviewSm2(state, 4)        // second correct review → interval 6d
state = reviewSm2(state, 5)        // mature card → interval ≈ 6 * EF
state = reviewSm2(state, 1)        // failure → reps reset, interval = 1d, lapse++
```

```ts
// Deterministic scheduling for tests / replays:
const state = reviewSm2(card, 3, { now: new Date('2026-01-01T00:00:00Z') })
// state.next_review is exactly 24h after the supplied `now`.
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-spaced-repetition
```

## API

### Interfaces

#### `ReviewOptions`

Optional inputs for {@link reviewSm2}.

```typescript
interface ReviewOptions {
  /**
   * Override the "current time" used to compute `next_review`. Useful
   * for deterministic tests and replaying review logs. Defaults to
   * `new Date()`.
   */
  now?: Date
}
```

#### `SpacedRepetitionState`

Persisted state for a card / item being scheduled by SM-2.

`next_review` is the absolute time at which the item becomes due.
It is computed as `now + interval_days * 24h` — i.e. an exact
24-hour multiple, NOT a calendar-day boundary in any timezone. This
keeps the algorithm timezone-independent: callers that want
"midnight in the user's local timezone" can post-process
`next_review` themselves.

```typescript
interface SpacedRepetitionState {
  /**
   * Multiplier applied to the previous interval once a card has been
   * reviewed at least twice. Floor of `1.3` per Wozniak. SM-2 default
   * for a brand-new card is `2.5`.
   */
  ease_factor: number
  /**
   * Number of days until the next review. `0` for a card that has
   * never been reviewed. After a successful first review this becomes
   * `1`; after a successful second review it becomes `6`; subsequent
   * reviews multiply by `ease_factor`.
   */
  interval_days: number
  /**
   * Count of consecutive successful reviews (grade `>= 3`). Resets to
   * `0` on any failed review.
   */
  repetitions: number
  /**
   * Lifetime count of failed reviews (grade `< 3`). Never decreases.
   * Useful for surfacing "leech" cards that lapse repeatedly.
   */
  lapses: number
  /**
   * Absolute time at which this card is next due for review. Compared
   * with `Date.now()` to determine due cards.
   */
  next_review: Date
}
```

### Types

#### `SpacedRepetitionGrade`

SM-2 review quality / grade scale, as defined in Wozniak (1990).

- `0` — Complete blackout. No recognition.
- `1` — Incorrect; the correct answer felt familiar once shown.
- `2` — Incorrect; the correct answer seemed easy in hindsight.
- `3` — Correct, but recalled with serious difficulty.
- `4` — Correct, recalled with some hesitation.
- `5` — Perfect recall.

Grades `< 3` are treated as failures: repetitions reset to `0` and the
interval resets to `1` day. Grades `>= 3` advance the schedule.

```typescript
type SpacedRepetitionGrade = 0 | 1 | 2 | 3 | 4 | 5
```

### Functions

#### `initialSm2State(now)`

Build a default state for a card that has never been reviewed. The
returned state is dueAt the supplied `now` (or right now if
omitted), so a brand-new card is immediately eligible for review.

```typescript
function initialSm2State(now?: Date): SpacedRepetitionState
```

- `now` — Reference time for `next_review`. Defaults to `new Date()`.

**Returns:** A fresh, unreviewed-card state.

#### `reviewSm2(state, quality, options)`

Apply one SM-2 review to an item. Pure function — does no I/O, reads
no clocks except via the optional `options.now`.

Algorithm:

1. Update ease factor: `EF' = max(1.3, EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))`
2. If `quality < 3` → reset `repetitions = 0`, `interval = 1`, increment `lapses`.
3. Else → `repetitions += 1`; first repetition gives `interval = 1`,
   second gives `interval = 6`, subsequent multiply previous interval by EF'.
4. `next_review = now + interval * 24h`.

```typescript
function reviewSm2(state: SpacedRepetitionState, quality: SpacedRepetitionGrade, options?: ReviewOptions): SpacedRepetitionState
```

- `state` — Current persisted state of the item being reviewed.
- `quality` — Grade `0..5` describing the user's recall performance.
- `options` — Optional clock override (`options.now`).

**Returns:** The updated state. The input `state` is not mutated.

### Constants

#### `DEFAULT_EASE_FACTOR`

Default starting ease factor for a fresh card, per Wozniak.

```typescript
const DEFAULT_EASE_FACTOR: 2.5
```

#### `MIN_EASE_FACTOR`

Lower bound on the ease factor. SM-2 forbids easing below this.

```typescript
const MIN_EASE_FACTOR: 1.3
```
