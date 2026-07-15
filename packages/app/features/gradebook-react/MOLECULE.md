# @molecule/app-gradebook-react

Gradebook UI — unified table of grades + optional GPA hero card.

Pairs with the new `@molecule/api-resource-grade` resource. Composes with
`@molecule/app-status-badge-react` for letter-grade chips when the caller
wants a styled letter column.

## Quick Start

```tsx
import { Gradebook, GpaCard } from '@molecule/app-gradebook-react'

function GradesPage() {
  return (
    <>
      <GpaCard gpa={3.72} scale="4.0" trend="up" />
      <Gradebook gpaScale="4.0" grades={rows} />
    </>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-gradebook-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `GpaCardProps`

Props for {@link GpaCard}.

```typescript
interface GpaCardProps {
  /** The numeric GPA value (or percentage when `scale='percentage'`). */
  gpa: number
  /** Which scale `gpa` is expressed on. Drives formatting + the "out of" text. */
  scale: GpaScale
  /** Override the maximum value shown in the "out of" caption. */
  max?: number
  /** Optional trend chip — render up/down/flat with localized label. */
  trend?: GpaTrend
  /** Optional caption rendered below the trend (e.g. "vs. last semester"). */
  trendLabel?: ReactNode
  /** Extra classes merged onto the root element. */
  className?: string
}
```

#### `Grade`

A single row in the gradebook. Rows can represent either a course
(`assignmentTitle` doubles as the course name) or an individual
assignment — the caller picks the granularity.

```typescript
interface Grade {
  /** Stable identifier (used as the React key). */
  id: string
  /** Course or assignment title shown in the first column. */
  title: ReactNode
  /** Letter grade (e.g. `'A-'`, `'B+'`). Optional — derived display only. */
  letter?: string
  /** Numeric score. Interpreted relative to `maxPoints` (or 0–100 when omitted). */
  score: number
  /** Maximum points / denominator for the score. Defaults to 100. */
  maxPoints?: number
  /** Course / assignment weight (0–1) — used to compute the GPA contribution. */
  weight?: number
  /** Pre-computed contribution to overall GPA. Optional — caller may pre-compute. */
  contribution?: number
  /** When the grade was posted. Display-only. */
  postedAt?: ReactNode
}
```

#### `GradebookProps`

Props for {@link Gradebook}.

```typescript
interface GradebookProps {
  /** Rows to display. Each row may represent a course or an assignment — caller's choice. */
  grades: Grade[]
  /** GPA scale used for numeric rendering of contribution / score columns. */
  gpaScale: GpaScale
  /** Optional cell-click handler — fires with the grade row + the column key clicked. */
  onCellClick?: (grade: Grade, column: GradebookColumn) => void
  /** Extra classes merged onto the root `<table>` wrapper. */
  className?: string
}
```

### Types

#### `GpaScale`

GPA scale supported by the gradebook.

- `'4.0'` — US-style 4.0 unweighted scale.
- `'5.0'` — US-style 5.0 weighted scale (honours / AP).
- `'percentage'` — 0–100 percentage rendering (no GPA conversion applied).

```typescript
type GpaScale = '4.0' | '5.0' | 'percentage'
```

#### `GpaTrend`

Trend direction for the GPA trend chip.

```typescript
type GpaTrend = 'up' | 'down' | 'flat'
```

#### `GradebookColumn`

Column identifiers exposed via `onCellClick`.

```typescript
type GradebookColumn = 'title' | 'letter' | 'numeric' | 'weight' | 'contribution' | 'posted'
```

### Functions

#### `computePercentage(grade)`

Compute a percentage `[0, 100]` from a {@link Grade} row. When `maxPoints`
is missing or ≤ 0 the score is treated as already being a percentage.

```typescript
function computePercentage(grade: Grade): number
```

- `grade` — The grade row.

**Returns:** The percentage value clamped to `[0, 100]`.

#### `defaultGpaMax(scale)`

Default ceiling for a given GPA scale.

```typescript
function defaultGpaMax(scale: GpaScale): number
```

- `scale` — The GPA scale.

**Returns:** The default maximum value for that scale.

#### `formatGpa(value, scale)`

Format a numeric GPA for display. Percentages render with no decimals;
4.0 / 5.0 scales render with two decimals.

```typescript
function formatGpa(value: number, scale: GpaScale): string
```

- `value` — The GPA / percentage value to format.
- `scale` — The scale being displayed.

**Returns:** A locale-independent string representation.

#### `GpaCard(props)`

Hero card displaying the user's GPA — large primary value, "out of"
caption, and optional trend chip. Pairs with {@link Gradebook} above /
beside the table view.

Styling routes through `getClassMap()` and all text routes through `t()`
via the companion `@molecule/app-locales-gradebook` locale bond.

```typescript
function GpaCard(props: GpaCardProps): JSX.Element
```

- `props` — Component props.

**Returns:** The GPA hero card element.

#### `Gradebook(props)`

Unified gradebook table — title, letter grade, numeric score, weight, and
contribution-to-GPA. Rows can be either courses or assignments; the caller
decides which granularity to pass.

Pairs with {@link GpaCard} for the hero summary. Styling routes through
`getClassMap()`; all visible text routes through `t()` via the companion
`@molecule/app-locales-gradebook` locale bond.

```typescript
function Gradebook(props: GradebookProps): JSX.Element
```

- `props` — Component props.

**Returns:** The gradebook element.

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

All visible text routes through `t()` via the companion
`@molecule/app-locales-gradebook` locale bond. All styling routes
through `getClassMap()` — no Tailwind utilities appear in this package.

## Translations

Translation strings are provided by `@molecule/app-locales-gradebook`.
