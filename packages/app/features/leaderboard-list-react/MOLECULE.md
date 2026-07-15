# @molecule/app-leaderboard-list-react

Leaderboard list container.

Exports `<LeaderboardList>` — wraps a stack of `<LeaderboardRow>`s with title and actions.

## Quick Start

```tsx
import { LeaderboardList } from '@molecule/app-leaderboard-list-react'
import { LeaderboardRow } from '@molecule/app-leaderboard-row-react'

<LeaderboardList title="Top Contributors" actions={<PeriodSelect />}>
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

### Functions

#### `LeaderboardList(root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .children
- `root0` — .title
- `root0` — .actions
- `root0` — .emptyState
- `root0` — .className

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
