# @molecule/app-habit-streak-card-react

Habit / streak summary card — current streak, best streak, total
completions, and an optional per-day heatmap strip. Use for habit
trackers, meditation streaks, daily-task widgets.

## Quick Start

```tsx
import type { StreakDay } from '@molecule/app-habit-streak-card-react'
import { HabitStreakCard } from '@molecule/app-habit-streak-card-react'

const recentDays: StreakDay[] = [
  { date: '2026-07-01', count: 1 },
  { date: '2026-07-02', count: 3 },
]

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

#### `HabitStreakCardProps`

```typescript
interface HabitStreakCardProps {
  /** Habit name. */
  name: ReactNode
  /** Optional leading icon. */
  icon?: ReactNode
  /** Current streak (days). */
  currentStreak: number
  /** Best streak (days). */
  bestStreak?: number
  /** Total completions. */
  totalCompletions?: number
  /** Optional heatmap days — rendered as a strip of squares. */
  heatmap?: StreakDay[]
  /** Days the heatmap should display (truncates `heatmap` from the end). Defaults to 30. */
  heatmapDays?: number
  /** Extra classes. */
  className?: string
}
```

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

#### `HabitStreakCard(props)`

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

- `props` — Component props (see {@link HabitStreakCardProps}).

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

- Requires `@molecule/app-react`'s `I18nProvider` (`useTranslation()` THROWS
  without it) and a bonded ClassMap for `getClassMap()`. Stat labels come
  from the `@molecule/app-locales-habit-streak-card` companion bond.
- The heatmap strip uses a fixed green ramp with a light-only zero color
  (`rgba(0,0,0,0.08)`) rendered as inline styles — on dark themes the empty
  cells are nearly invisible. For a theme-aware year grid use
  `@molecule/app-heatmap-react` with a custom `colorScale` instead.
- `heatmapDays` truncates `heatmap` from the END (most recent days win).

## Translations

Translation strings are provided by `@molecule/app-locales-habit-streak-card`.
