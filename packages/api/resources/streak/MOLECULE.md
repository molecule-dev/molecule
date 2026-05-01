# @molecule/api-streak

Generic streak engine for molecule.dev.

Per-user, per-activity streak tracking with configurable reset
windows, optional tier-gated "freezes" that absorb a single missed
period, and a cron-friendly audit helper. The pure engine
({@link computeStreakUpdate}) is fully testable without a database;
the {@link recordActivity}, {@link consumeFreeze}, {@link getStreak},
and {@link auditStreak} service helpers persist via the abstract
`@molecule/api-database` DataStore.

## Quick Start

```typescript
import { recordActivity } from '@molecule/api-streak'

const result = await recordActivity('user-1', {
  activity_kind: 'lesson',
  reset_after_hours: 24,
  freezes_per_period: 1,
})
console.log(result.state.current_streak)
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-streak
```

## API

### Interfaces

#### `StreakConfig`

Streak configuration for a given activity kind.

Configuration is supplied at call time — the engine itself is
stateless. Apps can persist their own config table or use static
constants per `activity_kind`.

```typescript
interface StreakConfig {
  /** Identifier for the activity kind (e.g. 'login', 'lesson', 'workout'). */
  activity_kind: string
  /**
   * Hours of inactivity before the streak resets. Default `24` —
   * a streak resets if no activity is recorded for >24h after the
   * last activity timestamp.
   */
  reset_after_hours?: number
  /**
   * Optional cap on freezes a user may auto-consume to absorb a gap.
   * `0` (default) disables freezes entirely.
   */
  freezes_per_period?: number
}
```

#### `StreakState`

Persisted streak state for a single (user, activity_kind) pair.

```typescript
interface StreakState {
  /** The user identifier. */
  user_id: string
  /** The activity kind this streak is tracking. */
  activity_kind: string
  /** Current consecutive-period count. Resets to `1` on a fresh start. */
  current_streak: number
  /** Best historical streak for this user + activity. */
  longest_streak: number
  /**
   * Timestamp of the most recent recorded activity, or `null` when no
   * activity has ever been recorded.
   */
  last_activity_date: Date | null
  /** Number of freezes the user has consumed in the current period. */
  freezes_used: number
}
```

#### `StreakUpdateInput`

Pure-engine input describing a prior streak snapshot plus a new event.

```typescript
interface StreakUpdateInput {
  /**
   * Previous persisted state, or `null` when the user has no prior
   * record for this activity kind.
   */
  previous: StreakState | null
  /** Configuration for this activity kind. */
  config: StreakConfig
  /** Timestamp of the activity event being recorded. */
  when: Date
}
```

#### `StreakUpdateResult`

Result of a streak computation — the next state plus flags signalling
whether a freeze was consumed or the streak was reset.

```typescript
interface StreakUpdateResult {
  /** Next persisted state to write back. */
  state: StreakState
  /**
   * `true` when a freeze was consumed to absorb a missed period.
   * `false` for first-record, same-period, in-window, or reset events.
   */
  freezeConsumed: boolean
  /**
   * `true` when the gap exceeded the reset window and the streak was
   * reset (with no available freeze).
   */
  reset: boolean
}
```

### Functions

#### `auditStreak(userId, config, now)`

Audits a single streak and resets it when the last activity is
outside the configured reset window. Intended for cron sweepers.

```typescript
function auditStreak(userId: string, config: StreakConfig, now?: Date): Promise<boolean>
```

- `userId` — The user ID.
- `config` — Streak configuration for this activity kind.
- `now` — Audit timestamp (defaults to `new Date()`).

**Returns:** `true` when the streak was reset, `false` otherwise.

#### `computeStreakUpdate(input)`

Pure streak transition — computes the next state for a (previous,
config, when) tuple without touching any I/O.

Rules:
 - No previous state → `current_streak = 1`.
 - Same period as previous → no change to streak (idempotent).
 - Continuation period → `current_streak + 1`.
 - Gap, but a freeze is available → consume freeze, treat as
   continuation.
 - Gap, no freeze available → reset to `1`.

```typescript
function computeStreakUpdate(input: StreakUpdateInput): StreakUpdateResult
```

- `input` — Prior state, config, and event timestamp.

**Returns:** Next state plus reset/freeze flags.

#### `consumeFreeze(userId, config)`

Manually consumes one freeze for the user's current streak, if
available under the configured cap.

```typescript
function consumeFreeze(userId: string, config: StreakConfig): Promise<StreakUpdateResult>
```

- `userId` — The user ID.
- `config` — Streak configuration for this activity kind.

**Returns:** The updated state plus a `freezeConsumed` flag.

#### `consumeFreezeUpdate(previous, config)`

Pure freeze-consumption — explicitly burns one freeze without
recording a new activity. Useful when an app exposes a manual
"use freeze" action.

```typescript
function consumeFreezeUpdate(previous: StreakState, config: StreakConfig): StreakUpdateResult
```

- `previous` — Previous state.
- `config` — Streak config.

**Returns:** Next state plus a `freezeConsumed` flag (`false` if cap reached).

#### `freeze(req, res)`

Consumes one freeze for the authenticated user's streak, when the
configured cap allows. Returns the updated state and a
`freezeConsumed` flag.

```typescript
function freeze(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — Express-compatible request.
- `res` — Express-compatible response.

#### `getStreak(userId, activityKind)`

Reads the current streak state for a (user, activity_kind) pair.

```typescript
function getStreak(userId: string, activityKind: string): Promise<StreakState>
```

- `userId` — The user ID.
- `activityKind` — The activity kind.

**Returns:** The current state, or a zeroed state when no row exists.

#### `initialState(userId, activityKind, when)`

Builds an initial `StreakState` for a brand-new (user, activity_kind).

```typescript
function initialState(userId: string, activityKind: string, when: Date): StreakState
```

- `userId` — The user ID.
- `activityKind` — The activity kind.
- `when` — Timestamp of the first event.

**Returns:** The initial streak state with `current_streak = longest_streak = 1`.

#### `isStale(state, config, now)`

Pure audit — returns `true` when a stale streak (no activity within
the reset window) should be reset by a cron sweeper.

```typescript
function isStale(state: StreakState, config: StreakConfig, now?: Date): boolean
```

- `state` — Current state.
- `config` — Streak config.
- `now` — Current timestamp (defaults to `new Date()`).

**Returns:** `true` if the streak is stale and should be reset.

#### `read(req, res)`

Reads the current streak state for the authenticated user under
the `:activityKind` route param.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — Express-compatible request.
- `res` — Express-compatible response.

#### `record(req, res)`

Records an activity event for the authenticated user under the
`:activityKind` route param. Optional body fields override default
config (`reset_after_hours`, `freezes_per_period`, `when` ISO).

```typescript
function record(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — Express-compatible request.
- `res` — Express-compatible response.

#### `recordActivity(userId, config, when)`

Records an activity event and returns the updated streak state.

Idempotent within a single period: same-period events are absorbed
without bumping the counter. Out-of-window gaps reset the streak
(or consume a freeze when configured).

```typescript
function recordActivity(userId: string, config: StreakConfig, when?: Date): Promise<StreakUpdateResult>
```

- `userId` — The user ID.
- `config` — Streak configuration for this activity kind.
- `when` — Event timestamp (defaults to `new Date()`).

**Returns:** The updated state plus reset/freeze flags.

### Constants

#### `requestHandlerMap`

Handler map for streak routes (`record`, `read`, `freeze`).

```typescript
const requestHandlerMap: { readonly record: typeof record; readonly read: typeof read; readonly freeze: typeof freeze; }
```

#### `routes`

Routes for streak record / read / freeze operations. All require an
authenticated session — the user ID is derived from `res.locals.session`,
never from the request body or path.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/streaks/:activityKind"; readonly handler: "record"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/streaks/:activityKind"; readonly handler: "read"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/streaks/:activityKind/freeze"; readonly handler: "freeze"; readonly middlewares: readonly ["authenticate"]; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
