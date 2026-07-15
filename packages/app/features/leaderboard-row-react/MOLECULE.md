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
npm install @molecule/app-leaderboard-row-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Functions

#### `LeaderboardRow(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Leaderboard row — rank + avatar + name + score + optional rank-delta
arrow. Top 3 ranks render a medal in place of the numeric rank.

```typescript
function LeaderboardRow({
  rank,
  name,
  avatarSrc,
  score,
  rankDelta,
  subtitle,
  isMe,
  onClick,
  className,
}: LeaderboardRowProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `root0` — *
- `root0` — .rank
- `root0` — .name
- `root0` — .avatarSrc
- `root0` — .score
- `root0` — .rankDelta
- `root0` — .subtitle
- `root0` — .isMe
- `root0` — .onClick
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
