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
npm install @molecule/app-leaderboard-list-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
