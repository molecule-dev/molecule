# @molecule/app-leaderboard-row-react

Leaderboard row.

Exports `<LeaderboardRow>` — rank + avatar + name + score + optional rank-delta.

## Quick Start

```tsx
import { LeaderboardRow } from '@molecule/app-leaderboard-row-react'

<LeaderboardRow
  rank={1}
  name="Alice Chen"
  avatarSrc="/avatars/alice.png"
  score={4820}
  rankDelta={2}
  subtitle="Team Phoenix"
  isMe={false}
  onClick={() => openProfile('alice')}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-leaderboard-row-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
