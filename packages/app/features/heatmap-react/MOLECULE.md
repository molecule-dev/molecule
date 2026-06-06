# @molecule/app-heatmap-react

GitHub-contributions-style year-grid activity heatmap. SVG-based, no
library dependency, configurable cell size / gap / palette / range,
accessible per-cell `aria-label` and `data-mol-id` attributes.

Used across habit-tracker, language-learning, lms (review/XP/attendance
heatmaps), workout-tracker, and similar "activity-by-day" surfaces.

## Quick Start

```tsx
import { Heatmap } from '@molecule/app-heatmap-react'

const start = new Date(2025, 0, 1)
const end = new Date(2025, 11, 31)

<Heatmap
  data={[{ date: '2025-01-15', value: 3 }, { date: '2025-02-04', value: 8 }]}
  range={{ start, end }}
  onCellClick={(c) => console.log(c.date, c.value)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-heatmap-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

All UI text routes through `t('heatmap.*')` from `@molecule/app-react`'s
`useTranslation()`. Drop in `@molecule/app-locales-heatmap` for
translated month / weekday / tooltip strings.

## Translations

Translation strings are provided by `@molecule/app-locales-heatmap`.
