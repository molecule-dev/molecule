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
npm install @molecule/app-habit-streak-card-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
