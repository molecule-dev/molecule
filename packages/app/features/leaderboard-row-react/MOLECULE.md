# @molecule/app-leaderboard-row-react

Leaderboard row.

Exports `<LeaderboardRow>` — rank + avatar + name + score with optional
rank-delta indicator, subtitle, and current-user highlight. Props: `rank`,
`name`, `score`, `avatarSrc?`, `rankDelta?`, `subtitle?`, `isMe?`, `onClick?`,
`className?`.

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

### Interfaces

#### `LeaderboardRowProps`

```typescript
interface LeaderboardRowProps {
  /** 1-based rank. */
  rank: number
  /** Display name. */
  name: ReactNode
  /** Optional avatar URL. */
  avatarSrc?: string
  /** Score / metric. */
  score: ReactNode
  /** Optional change indicator (positive = climbed). */
  rankDelta?: number
  /** Optional secondary line (team, level, country). */
  subtitle?: ReactNode
  /** Whether this row represents the current user (highlighted). */
  isMe?: boolean
  /** Click handler. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `LeaderboardRow(props)`

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

- `props` — Component props (see {@link LeaderboardRowProps}).

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

- Ranks 1–3 render medal emoji (gold/silver/bronze) INSTEAD of the rank number;
  rank 4+ renders `#n`. There is no prop to disable the medals.
- `rankDelta` arrows use hardcoded green/red hex colors and `isMe` uses a fixed
  light-blue translucent background — neither follows the app theme, and the
  `isMe` tint is tuned for light backgrounds. Override via `className` where
  that clashes with a dark theme.
- When `name` is not a plain string the avatar's accessible name falls back to
  the hardcoded English string 'Player' — pass a string `name` in localized apps.
- `onClick` gives the row a pointer cursor but no keyboard/role semantics.
- Requires a wired ClassMap bond; `<Avatar>` comes from `@molecule/app-ui-react`.
