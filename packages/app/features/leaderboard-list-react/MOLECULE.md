# @molecule/app-leaderboard-list-react

Leaderboard list container.

Exports `<LeaderboardList>` — header row (title + actions) above a vertical
stack of rows. Props: `children` (pre-rendered rows), `title?`, `actions?`
(period selector, filters), `emptyState?`, `className?`. Pair with
`<LeaderboardRow>` from `@molecule/app-leaderboard-row-react` — this container
adds no rank/podium logic of its own.

## Quick Start

```tsx
import { LeaderboardList } from '@molecule/app-leaderboard-list-react'
import { LeaderboardRow } from '@molecule/app-leaderboard-row-react'

const entries = [
  { id: 'u1', rank: 1, name: 'Alice Chen', score: 4820 },
  { id: 'u2', rank: 2, name: 'Bo Diaz', score: 4515 },
]

<LeaderboardList title="Top Contributors">
  {entries.map((e) => (
    <LeaderboardRow key={e.id} rank={e.rank} name={e.name} score={e.score} />
  ))}
</LeaderboardList>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-leaderboard-list-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `LeaderboardListProps`

```typescript
interface LeaderboardListProps {
  /** Pre-rendered leaderboard rows. */
  children: ReactNode
  /** Optional title above the list. */
  title?: ReactNode
  /** Optional period selector / actions row. */
  actions?: ReactNode
  /** Optional empty state. */
  emptyState?: ReactNode
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `LeaderboardList(props)`

Container above a stack of `<LeaderboardRow>`s — header + actions +
scrollable list. Doesn't itself render rank logic; pair with
`<LeaderboardRow>` from `@molecule/app-leaderboard-row-react`.

```typescript
function LeaderboardList({
  children,
  title,
  actions,
  emptyState,
  className,
}: LeaderboardListProps): JSX.Element
```

- `props` — Component props (see {@link LeaderboardListProps}).

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

- `emptyState` renders only when `children` is an empty array or nullish; if you
  pass a fragment or a single element the list always renders. Map your entries
  directly (as in the example) so the empty case is detectable.
- No `data-mol-id` prop; styling resolves through `getClassMap()`.
