# @molecule/app-achievement-card-react

Badge / achievement unlock card.

Exports `<AchievementCard>`.

## Quick Start

```tsx
import { AchievementCard } from '@molecule/app-achievement-card-react'

<AchievementCard
  icon={<span>🏆</span>}
  name="First Login"
  description="Signed in for the first time."
  earned
  earnedAt="Jan 3, 2025"
  tier="Common"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-achievement-card-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `AchievementCardProps`

```typescript
interface AchievementCardProps {
  /** Achievement name. */
  name: ReactNode
  /** Description / what it took to earn. */
  description?: ReactNode
  /** Icon / illustration slot. */
  icon: ReactNode
  /** Whether the user has earned this achievement. */
  earned?: boolean
  /** Earned-at display. */
  earnedAt?: ReactNode
  /** Optional progress data (for in-progress achievements). */
  progress?: { value: number; max: number }
  /** Optional rarity / tier label ("Legendary", "Common"). */
  tier?: ReactNode
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `AchievementCard(props)`

Badge / achievement unlock card — icon + name + description + earned
state. Locked achievements render greyed-out.

```typescript
function AchievementCard({
  name,
  description,
  icon,
  earned,
  earnedAt,
  progress,
  tier,
  className,
}: AchievementCardProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props (see {@link AchievementCardProps}).

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

The "Earned"/"Locked" state labels are currently English-only (not
i18n-routed) — no override prop exists yet.
