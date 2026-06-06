# @molecule/app-reputation-badge-react

React reputation/karma surfaces — `<ReputationBadge>` and
`<BadgeShelf>` — for forum, discussion-boards, and social-media flagships.

Both components defer styling to the active ClassMap bond (`getClassMap()`
from `@molecule/app-ui`) and route every user-visible string through
`useTranslation()` from `@molecule/app-react`. Translations live in the
companion `@molecule/app-locales-reputation-badge` bond.

## Quick Start

```tsx
import { ReputationBadge, BadgeShelf } from '@molecule/app-reputation-badge-react'

<ReputationBadge score={1250} variant="full" />
<BadgeShelf badges={user.badges} limit={5} onClick={(b) => openBadgeModal(b)} />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-reputation-badge-react
```

## API

### Interfaces

#### `Badge`

A single earned badge — one icon on the `<BadgeShelf>` row.

```typescript
interface Badge {
  /** Stable identifier (used as React key + click payload). */
  id: string
  /** Display name (translated upstream — passed verbatim). */
  name: string
  /** Optional longer description, shown in the native tooltip. */
  description?: string
  /** Icon glyph or short emoji (rendered inline). Mutually exclusive with `iconSrc`. */
  icon?: string
  /** Image URL for the badge icon. */
  iconSrc?: string
  /** ISO date string the badge was earned (passed back via `onClick`). */
  earnedAt?: string
}
```

#### `ReputationThresholds`

Optional thresholds for deriving a `ReputationLevel` from a numeric score.

If a `level` prop isn't passed to `<ReputationBadge>`, the component will
pick the highest level whose threshold the `score` meets or exceeds.

Default thresholds:
- `contributor` >= 100
- `trusted` >= 500
- `veteran` >= 2000
- `legend` >= 10000
- below 100 → `newcomer`

```typescript
interface ReputationThresholds {
  /** Score >= contributor threshold ⇒ `'contributor'`. */
  contributor: number
  /** Score >= trusted threshold ⇒ `'trusted'`. */
  trusted: number
  /** Score >= veteran threshold ⇒ `'veteran'`. */
  veteran: number
  /** Score >= legend threshold ⇒ `'legend'`. */
  legend: number
}
```

### Types

#### `ReputationLevel`

Reputation level identifiers — used to pick a tier color/label.

Apps that need finer granularity can pass a `level` string of any value;
unknown values fall back to `'newcomer'` styling.

```typescript
type ReputationLevel = 'newcomer' | 'contributor' | 'trusted' | 'veteran' | 'legend'
```

### Functions

#### `colorForLevel(level)`

Return the semantic Badge color for a given level.

Unknown levels fall back to `'secondary'`.

```typescript
function colorForLevel(level: ReputationLevel): "primary" | "secondary" | "success" | "warning" | "info"
```

- `level` — The reputation level.

**Returns:** A badge color name from `@molecule/app-ui-react`.

#### `levelForScore(score, thresholds)`

Derive a {@link ReputationLevel} from a numeric score.

Picks the highest level whose threshold is met or exceeded. Any score
below `thresholds.contributor` returns `'newcomer'`.

```typescript
function levelForScore(score: number, thresholds?: ReputationThresholds): ReputationLevel
```

- `score` — Reputation score (any non-negative number).
- `thresholds` — Optional override thresholds; defaults to {@link DEFAULT_THRESHOLDS}.

**Returns:** The derived reputation level.

### Constants

#### `DEFAULT_THRESHOLDS`

Default thresholds used when no `thresholds` prop is supplied.

```typescript
const DEFAULT_THRESHOLDS: ReputationThresholds
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

Pairs with the (deferred) `@molecule/api-reputation` core package for
server-side score/badge issuance.

## Translations

Translation strings are provided by `@molecule/app-locales-reputation-badge-react`.
