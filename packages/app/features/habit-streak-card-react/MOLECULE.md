# @molecule/app-habit-streak-card-react

Habit / streak summary card with heatmap.

Exports `<HabitStreakCard>` and `StreakDay` type.

## Quick Start

```tsx
import { HabitStreakCard } from '@molecule/app-habit-streak-card-react'

<HabitStreakCard
  name="Morning Run"
  icon={<span>🏃</span>}
  currentStreak={14}
  bestStreak={30}
  totalCompletions={87}
  heatmap={recentDays}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-habit-streak-card-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `StreakDay`

Represents a single day's completion data for the heatmap strip.

```typescript
interface StreakDay {
  /** ISO date (yyyy-mm-dd). */
  date: string
  /** Completion count for the day (0 = not done, >0 = intensity). */
  count: number
}
```

### Functions

#### `HabitStreakCard(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Habit / streak summary card with current + best streak, total
completions, and an optional heatmap strip. Use for habit trackers,
meditation streaks, daily-task widgets.

```typescript
function HabitStreakCard({
  name,
  icon,
  currentStreak,
  bestStreak,
  totalCompletions,
  heatmap,
  heatmapDays = 30,
  className,
}: HabitStreakCardProps): JSX.Element
```

- `root0` — *
- `root0` — .name
- `root0` — .icon
- `root0` — .currentStreak
- `root0` — .bestStreak
- `root0` — .totalCompletions
- `root0` — .heatmap
- `root0` — .heatmapDays
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
