# @molecule/app-reputation-badge-react

React reputation/karma surfaces — `<ReputationBadge>` and `<BadgeShelf>` —
for forum, discussion-board, and social flagships.

`<ReputationBadge score={n} />` renders a compact-formatted score ("1.5k")
plus a tier chip; the tier derives from `score` via `levelForScore` and
`DEFAULT_THRESHOLDS` (contributor 100, trusted 500, veteran 2000,
legend 10000) unless you pass `level` or `thresholds`. `variant` is
`'compact'` (default) or `'full'` (stacked with a "Reputation" caption).
`<BadgeShelf badges limit onClick />` renders earned-badge icons with a
trailing `+N` overflow chip (`onClick(null)` signals "expand all").

## Quick Start

```tsx
import { BadgeShelf, ReputationBadge } from '@molecule/app-reputation-badge-react'
import type { Badge } from '@molecule/app-reputation-badge-react'

function ProfileHeader({ score, badges, onBadgeClick }: {
  score: number
  badges: Badge[]
  onBadgeClick: (badge: Badge | null) => void
}) {
  return (
    <div>
      <ReputationBadge score={score} variant="full" />
      <BadgeShelf badges={badges} limit={5} onClick={onBadgeClick} />
    </div>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-reputation-badge-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
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

#### `BadgeShelfProps`

Props accepted by the {@link BadgeShelf} component.

```typescript
interface BadgeShelfProps {
  /** Earned badges to display, ordered most-prominent-first. */
  badges: Badge[]
  /**
   * Maximum number of badge icons rendered inline. Any remaining are
   * summarised in a trailing `+N` overflow chip.
   *
   * @default 5
   */
  limit?: number
  /**
   * Click handler — invoked with the clicked badge (or `null` when the
   * trailing overflow chip is clicked, signalling "expand all").
   */
  onClick?: (badge: Badge | null) => void
  /** Extra classes merged onto the outer row. */
  className?: string
}
```

#### `ReputationBadgeProps`

Props accepted by the {@link ReputationBadge} component.

```typescript
interface ReputationBadgeProps {
  /** Numeric reputation / karma score. */
  score: number
  /**
   * Explicit reputation level. If omitted, derived from `score` via
   * {@link levelForScore} using `thresholds` (or {@link DEFAULT_THRESHOLDS}).
   */
  level?: ReputationLevel
  /** Override the default score → level thresholds. */
  thresholds?: ReputationThresholds
  /**
   * Layout variant.
   * - `'compact'` (default) — score number inline with a small level chip.
   * - `'full'` — stacked layout with a "Reputation" caption above the row.
   */
  variant?: 'compact' | 'full'
  /** Extra classes merged onto the outer wrapper. */
  className?: string
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

#### `BadgeShelf(props)`

Horizontal row of small badge icons earned by a user — used alongside
`<ReputationBadge>` to surface community achievements on profile
headers, post bylines, and detail pages.

Each icon shows its name in a native `title` tooltip for low-friction
accessibility. Clicking a badge invokes `onClick(badge)`; clicking the
trailing `+N` chip invokes `onClick(null)` so the host page can expand
a full list.

```typescript
function BadgeShelf({
  badges,
  limit = 5,
  onClick,
  className,
}: BadgeShelfProps): React.JSX.Element | null
```

- `props` — Component props (see {@link BadgeShelfProps}).

**Returns:** The rendered shelf, or `null` if no badges are supplied.

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

#### `ReputationBadge(props)`

User reputation / karma display.

Renders a numeric score paired with a tier chip whose color reflects the
derived (or explicit) {@link ReputationLevel}. Used by discussion-boards,
forum, and social-media flagships to surface community standing.

Tier color comes from the active ClassMap bond's `cm.badge()` helper, so
apps swapping styling libraries restyle these chips for free.

```typescript
function ReputationBadge({
  score,
  level,
  thresholds = DEFAULT_THRESHOLDS,
  variant = 'compact',
  className,
}: ReputationBadgeProps): React.JSX.Element
```

- `props` — Component props (see {@link ReputationBadgeProps}).

**Returns:** The rendered reputation badge element.

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

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

- Both components throw unless rendered inside `<I18nProvider>` (from
  `@molecule/app-react`) with a ClassMap bonded via `setClassMap()`.
- This package exports a `Badge` TYPE (earned-badge data shape) — distinct
  from the `Badge` COMPONENT in `@molecule/app-ui-react`; alias one when
  importing both in a file.
- Server-side score/badge issuance pairs with `@molecule/api-reputation`.
- Translations live in the companion `@molecule/app-locales-reputation-badge`
  bond (registered).

## Translations

Translation strings are provided by `@molecule/app-locales-reputation-badge`.
