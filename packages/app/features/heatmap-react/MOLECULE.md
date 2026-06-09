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

## API

### Interfaces

#### `HeatmapCell`

Resolved cell descriptor passed to interaction callbacks.

```typescript
interface HeatmapCell {
  /** ISO date string `yyyy-mm-dd`. */
  date: string
  /** Cell value (0 if no data for that date). */
  value: number
  /** Quantile bucket index (0..colors.length-1). */
  bucket: number
  /** Original payload from the matching `HeatmapDay`, if any. */
  payload?: unknown
}
```

#### `HeatmapDay`

A single data point: a date (`yyyy-mm-dd` ISO string) and a numeric value.

```typescript
interface HeatmapDay {
  /** ISO date string `yyyy-mm-dd`. */
  date: string
  /** Numeric value driving the cell's color bucket. */
  value: number
  /** Optional payload echoed back through `onCellClick` / `onCellHover`. */
  payload?: unknown
}
```

#### `HeatmapProps`

Heatmap component props.

```typescript
interface HeatmapProps {
  /** Sparse list of day values; missing dates render with bucket 0. */
  data: HeatmapDay[]
  /** Inclusive date range to render. */
  range: { start: Date; end: Date }
  /** Pixel size of each cell. Defaults to 11. */
  cellSize?: number
  /** Pixel gap between cells. Defaults to 2. */
  gap?: number
  /**
   * Either an explicit ordered palette (5 hex/rgb colors light → dark) or the
   * literal `'quantile'` (default) which builds a 5-step quantile palette
   * of the value distribution using a green ramp.
   */
  colorScale?: 'quantile' | readonly string[]
  /** First day of week — 0=Sunday, 1=Monday. Defaults to 0. */
  weekStartsOn?: 0 | 1
  /** Render weekday labels in the left gutter. Defaults to false. */
  showWeekdayLabels?: boolean
  /** Render month labels above the grid. Defaults to true. */
  showMonthLabels?: boolean
  /** Click handler for an individual cell. */
  onCellClick?: (cell: HeatmapCell) => void
  /** Hover (mouseenter) handler for an individual cell. */
  onCellHover?: (cell: HeatmapCell) => void
  /** Build the tooltip / aria-label string. Defaults to `"<date>: <value>"`. */
  tooltipFormatter?: (cell: HeatmapCell) => string
  /** Optional accessible label for the whole grid. */
  ariaLabel?: string
  /** Extra classes merged onto the SVG root. */
  className?: string
}
```

### Functions

#### `bucketValue(value, thresholds)`

Bucket a numeric value into a 0..4 index given quantile thresholds.
Bucket 0 always represents zero / no activity.

```typescript
function bucketValue(value: number, thresholds: readonly [number, number, number, number]): number
```

- `value` — Value to bucket.
- `thresholds` — Four ascending quantile thresholds.

**Returns:** Integer in `[0, 4]`.

#### `computeQuantileThresholds(values)`

Compute four quantile thresholds from a numeric distribution.
Returns thresholds that split values into 5 ascending buckets.

```typescript
function computeQuantileThresholds(values: number[]): [number, number, number, number]
```

- `values` — All non-zero values from the data set.

**Returns:** Four ascending thresholds.

#### `Heatmap(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

GitHub-contributions-style activity heatmap. Renders a year-grid (or any
date range) of square cells whose color encodes a per-day value. Used for
habit consistency, language-learning XP, attendance, review-by-day stats,
and any other "activity-by-day" visualization.

Styling goes through `@molecule/app-ui`'s `getClassMap()`; the only inline
styling is the SVG `fill` attribute on each cell (a real SVG attribute,
not a Tailwind class).

```typescript
function Heatmap({
  data,
  range,
  cellSize = 11,
  gap = 2,
  colorScale = 'quantile',
  weekStartsOn = 0,
  showWeekdayLabels = false,
  showMonthLabels = true,
  onCellClick,
  onCellHover,
  tooltipFormatter,
  ariaLabel,
  className,
}: HeatmapProps): JSX.Element
```

- `root0` — Component props.
- `root0` — .data - Day-keyed value list.
- `root0` — .range - Inclusive date range.
- `root0` — .cellSize - Pixel size of each cell.
- `root0` — .gap - Pixel gap between cells.
- `root0` — .colorScale - Palette or `'quantile'`.
- `root0` — .weekStartsOn - First day of week (0=Sun, 1=Mon).
- `root0` — .showWeekdayLabels - Render weekday gutter labels.
- `root0` — .showMonthLabels - Render month header labels.
- `root0` — .onCellClick - Cell click handler.
- `root0` — .onCellHover - Cell hover handler.
- `root0` — .tooltipFormatter - Build tooltip / aria-label string.
- `root0` — .ariaLabel - Accessible label for the SVG.
- `root0` — .className - Extra classes merged onto the SVG root.

**Returns:** The heatmap SVG element.

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
