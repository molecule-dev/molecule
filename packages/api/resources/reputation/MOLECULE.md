# @molecule/api-reputation

Generic reputation/karma engine for molecule.dev.

Per-user reputation scoring with append-only event history,
idempotent badge awards, and a pure {@link computeLevel} helper for
deriving levels from configurable thresholds. The service layer
persists via the abstract `@molecule/api-database` DataStore — no
raw SQL leaks into handler-callable code.

Pairs with the frontend display package
`@molecule/app-reputation-badge-react`.

## Quick Start

```typescript
import { recordEvent, getScore, awardBadge } from '@molecule/api-reputation'

await recordEvent('user-1', 'accepted-solution', 15, {
  sourceId: 'comment-42',
})

const score = await getScore('user-1')
console.log(score.score, score.level)

if (score.score >= 1000) {
  await awardBadge('user-1', 'top-contributor')
}
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-reputation @molecule/api-database @molecule/api-i18n @molecule/api-logger @molecule/api-resource
```

## API

### Interfaces

#### `Badge`

Idempotent badge award. A user has at most one row per
`(userId, kind)` pair.

```typescript
interface Badge {
  /** Badge identifier (UUID). */
  id: string
  /** The user the badge was awarded to. */
  userId: string
  /**
   * Badge kind (e.g. `first-post`, `top-1-percent`, `helpful-answer`).
   * Free-form; apps decide their own taxonomy.
   */
  kind: string
  /** Award timestamp. */
  awardedAt: Date
}
```

#### `ReputationEvent`

Append-only reputation event. The score table is the materialised
sum of all events for a user; events are retained for audit and
recompute scenarios.

```typescript
interface ReputationEvent {
  /** Event identifier (UUID). */
  id: string
  /** The user whose reputation was affected. */
  userId: string
  /**
   * Domain-specific event kind (e.g. `vote`, `like`,
   * `accepted-solution`, `post`, `report-rejected`). Free-form string;
   * apps decide their own taxonomy.
   */
  kind: string
  /** Signed integer applied to the user's score. May be negative. */
  delta: number
  /**
   * Optional reference to the domain object that triggered the event
   * (e.g. a comment ID, post ID, vote ID). Used to deduplicate
   * recompute jobs and to power audit views.
   */
  sourceId?: string | null
  /**
   * Optional structured metadata (JSON). Persisted as-is by the
   * database bond; consumers should treat as opaque unless they
   * authored the event.
   */
  metadata?: Record<string, unknown> | null
  /** Event creation timestamp. */
  createdAt: Date
}
```

#### `ReputationEventSource`

Optional source descriptor for {@link ReputationEvent}s — accepted
as a single argument to keep the service signature ergonomic.

```typescript
interface ReputationEventSource {
  /** Optional domain-object reference. */
  sourceId?: string
  /** Optional structured metadata. */
  metadata?: Record<string, unknown>
}
```

#### `ReputationScore`

Persisted reputation snapshot for a single user.

```typescript
interface ReputationScore {
  /** The user identifier (PK). */
  userId: string
  /** Cumulative score across all recorded events. */
  score: number
  /** Derived level — see {@link DEFAULT_LEVEL_THRESHOLDS}. */
  level: number
  /** Timestamp of the last score-bumping event. */
  updatedAt: Date
}
```

### Functions

#### `awardBadge(userId, badgeKind)`

Awards a badge to a user. Idempotent: if a badge of the same kind
already exists, the existing record is returned unchanged.

```typescript
function awardBadge(userId: string, badgeKind: string): Promise<Badge>
```

- `userId` — The user identifier.
- `badgeKind` — Badge kind (e.g. `first-post`, `top-1-percent`).

**Returns:** The (possibly pre-existing) {@link Badge}.

#### `computeLevel(score, thresholds)`

Computes the level for a given score against ascending thresholds.

Threshold semantics: index `i` is the lower bound (inclusive) for
level `i`. The returned level is the highest index whose threshold
is `<= score`. Negative scores are clamped to level `0`.

```typescript
function computeLevel(score: number, thresholds?: readonly number[]): number
```

- `score` — Cumulative reputation score.
- `thresholds` — Ascending lower bounds per level. Defaults to

**Returns:** The derived level (always `>= 0`).

#### `getBadges(req, res)`

Returns the list of badges awarded to the user identified by the
`:id` route param, newest first. Public — no authentication required.

```typescript
function getBadges(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — Express-compatible request.
- `res` — Express-compatible response.

#### `getEvents(userId, limit)`

Reads recent reputation events for a user, newest first.

```typescript
function getEvents(userId: string, limit?: number): Promise<ReputationEvent[]>
```

- `userId` — The user identifier.
- `limit` — Maximum number of events to return (default `50`).

**Returns:** An array of {@link ReputationEvent}s.

#### `getReputation(req, res)`

Returns the public reputation snapshot for the user identified by
the `:id` route param. Public — no authentication required.

```typescript
function getReputation(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — Express-compatible request.
- `res` — Express-compatible response.

#### `getScore(userId)`

Reads the current score for a user. Returns a zeroed score when no
row exists.

```typescript
function getScore(userId: string): Promise<ReputationScore>
```

- `userId` — The user identifier.

**Returns:** The current {@link ReputationScore}.

#### `listBadges(userId)`

Lists all badges awarded to a user, newest first.

```typescript
function listBadges(userId: string): Promise<Badge[]>
```

- `userId` — The user identifier.

**Returns:** An array of {@link Badge}s.

#### `recordEvent(userId, kind, delta, source)`

Records a reputation event and atomically bumps the user's score.

Appends a row to `reputation_events` and then upserts the user's
row in `reputation_scores`. The new level is recomputed from the
resulting score using {@link computeLevel}.

```typescript
function recordEvent(userId: string, kind: string, delta: number, source?: ReputationEventSource): Promise<ReputationScore>
```

- `userId` — The user identifier.
- `kind` — Domain-specific event kind (e.g. `vote`, `like`).
- `delta` — Signed integer applied to the user's score.
- `source` — Optional source descriptor (`sourceId`, `metadata`).

**Returns:** The updated {@link ReputationScore}.

#### `revokeBadge(userId, badgeKind)`

Revokes a badge from a user. No-op when the badge is not present.

```typescript
function revokeBadge(userId: string, badgeKind: string): Promise<boolean>
```

- `userId` — The user identifier.
- `badgeKind` — Badge kind to revoke.

**Returns:** `true` when a badge was removed, `false` otherwise.

### Constants

#### `DEFAULT_LEVEL_THRESHOLDS`

Default level thresholds — index `i` is the lower bound (inclusive)
for level `i`. Level `0` covers `score < 100`, level `1` covers
`100 <= score < 500`, and so on.

Ordered ascending. Apps may pass their own thresholds to
{@link computeLevel} if a different curve is desired.

```typescript
const DEFAULT_LEVEL_THRESHOLDS: readonly number[]
```

#### `requestHandlerMap`

Handler map for reputation routes (`getReputation`, `getBadges`).

```typescript
const requestHandlerMap: { readonly getReputation: typeof getReputation; readonly getBadges: typeof getBadges; }
```

#### `routes`

Routes for public reputation reads. No authentication is required:
reputation/badge data is treated as public profile information by
the social-app templates that consume this package.

```typescript
const routes: readonly [{ readonly method: "get"; readonly path: "/users/:id/reputation"; readonly handler: "getReputation"; readonly middlewares: readonly []; }, { readonly method: "get"; readonly path: "/users/:id/badges"; readonly handler: "getBadges"; readonly middlewares: readonly []; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-logger`
- `@molecule/api-resource`

- **Migration required.** Three files ship in `src/__setup__/`
  (`reputation_events.sql`, `reputation_scores.sql`, `badges.sql`) and must
  exist in the target database before use (scaffolded apps apply them
  automatically; existing apps must apply them first).
- **Mutations are server-internal ONLY — the shipped routes are read-only.**
  `recordEvent()`, `awardBadge()`, `revokeBadge()` are service functions meant
  to be called from YOUR domain code (an accepted-answer handler, a moderation
  hook, a cron job). NEVER expose them on a route that accepts `kind` /
  `delta` / `badgeKind` from the client — a client-supplied delta is score
  tampering. The server decides the delta for each domain event.
- **Reads are PUBLIC by design.** `GET /users/:id/reputation` and
  `GET /users/:id/badges` ship with no auth middleware (public-profile data
  for social apps). If reputation is private in your app, add an authorizer.
- `awardBadge()` is idempotent (re-awarding returns the existing row);
  `recordEvent()` is NOT — guard call sites against double-firing, and record
  a compensating negative event for undo (the event history is append-only).
- `computeLevel(score, thresholds)` is pure and accepts custom thresholds, but
  the `level` stored by `recordEvent()` uses the DEFAULT thresholds — recompute
  client-side from your own thresholds if you customize them.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual reputation-earning flows, and check every box
off one by one. A box you can't check is an integration bug to fix — not a
skip:
- [ ] A reputation-earning action (an upvote, an accepted answer, whatever
  this app awards for) bumps the actor's total by exactly the points that
  action is worth: note the score shown in the UI before, perform the action,
  then confirm the new total equals old plus that delta — the arithmetic is
  exact, not just "the number went up".
- [ ] Levels/tiers track the total at the right thresholds: as the score
  crosses a threshold the displayed level advances by one, and a score just
  below that threshold does NOT advance. Badges appear only once earned and
  stay a single copy — re-earning the same badge never adds a duplicate.
- [ ] If this app surfaces a leaderboard or ranking, it orders users by their
  real totals — the top user has the highest score, and a change to one user's
  total re-sorts the list correctly.
- [ ] Anti-gaming — points cannot be farmed: repeating the SAME source action
  (double-clicking one upvote, re-firing a single accepted answer) awards the
  points once, not per click; a user cannot award themselves (no self-upvote
  or self-award inflates their own total); and any daily or per-source cap the
  app defines actually stops further points once it is hit.
- [ ] Reversing an action deducts what it granted: undo the upvote or delete
  the post that earned points and confirm the actor's total drops back by the
  same amount — an undo leaves the score honest, never stranded high.
- [ ] Reputation is awarded by the server alone: there is NO request a user
  can send to set their own score, level, points, or badge directly — no form
  field or API parameter feeds the delta. A user sees everyone's public rep but
  the only thing that changes it is a real earning action the server scored.
