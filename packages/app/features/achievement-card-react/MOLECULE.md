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
npm install @molecule/app-achievement-card-react
```

## API

### Functions

#### `AchievementCard(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .name
- `root0` — .description
- `root0` — .icon
- `root0` — .earned
- `root0` — .earnedAt
- `root0` — .progress
- `root0` — .tier
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
