# @molecule/app-kpi-card-react

React KPI / metric card primitives.

Exports:
- `<KpiCard>` — single metric card. Props: `title`, `value`, `subtitle?`, `icon?`,
  `trend?`, `action?`, `accentSide?` (`'left' | 'top' | 'none'`, default `'none'`),
  `accentColor?` (Tailwind border-color class, default `'border-primary'`),
  `upperLabel?`, `emphasizeValue?`, `hoverLift?`, `className?`, `dataMolId?`.
- `<KpiCardTrend>` — arrow + delta for the `trend` slot. Props: `delta`,
  `direction?` (derived from the sign of `delta` when omitted), `suffix?`
  (default `'%'`), `className?`.
- `<KpiCardGrid>` — grid container. Props: `columns?` (2–6, default 4),
  `gap?`, `className?`.
- `KpiTrendDirection`, `KpiCardAccentSide` types.

## Quick Start

```tsx
import { KpiCard, KpiCardGrid, KpiCardTrend } from '@molecule/app-kpi-card-react'

<KpiCardGrid columns={3}>
  <KpiCard
    title="Monthly Revenue"
    value="$48,200"
    trend={<KpiCardTrend delta={12.4} />}
    accentSide="top"
    upperLabel
    emphasizeValue
    hoverLift
    dataMolId="kpi-revenue"
  />
</KpiCardGrid>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-kpi-card-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `KpiCardGridProps`

```typescript
interface KpiCardGridProps {
  /** KPI cards. */
  children: ReactNode
  /** Column count at the md+ breakpoint. 2–6. Defaults to 4. */
  columns?: 2 | 3 | 4 | 5 | 6
  /** Gap between cards. */
  gap?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes. */
  className?: string
}
```

#### `KpiCardProps`

```typescript
interface KpiCardProps {
  /** Label describing the metric (usually `t('...')`). */
  title: ReactNode
  /** Large primary value — usually a string or formatted number. */
  value: ReactNode
  /** Optional supporting text below the value (e.g. "vs. last week"). */
  subtitle?: ReactNode
  /** Optional leading icon. */
  icon?: ReactNode
  /** Optional trend indicator (use `<KpiCardTrend>` for the default shape). */
  trend?: ReactNode
  /** Optional right-side action (menu, info tooltip). */
  action?: ReactNode
  /**
   * Where to draw the 4px colored accent bar. Default `'none'`.
   * - `'left'` — left edge (border-l-4) — used by blog, helpdesk-ticketing.
   * - `'top'` — top edge (border-t-4) — used by crm, project-management.
   * - `'none'` — no accent — bare card.
   */
  accentSide?: KpiCardAccentSide
  /**
   * Tailwind class for the accent bar's color, e.g. `'border-primary'` or
   * `'border-success'`. Defaults to `'border-primary'`. Ignored when
   * `accentSide === 'none'`.
   */
  accentColor?: string
  /**
   * When `true`, renders the title in 10px-uppercase-tracking-widest style
   * matching the polished pattern. Default `false` keeps the older
   * sentence-case look. Pass `true` for new dashboard call sites.
   */
  upperLabel?: boolean
  /**
   * When `true`, uses `font-extrabold` for the value (matches the polished
   * pattern). Default `false` keeps `font-bold`.
   */
  emphasizeValue?: boolean
  /**
   * When `true`, applies a subtle hover lift (`hover:-translate-y-0.5
   * transition-transform`). Polished dashboards use this. Default `false`.
   */
  hoverLift?: boolean
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

#### `KpiCardTrendProps`

```typescript
interface KpiCardTrendProps {
  /** Numeric delta to display (e.g. 12.3 for +12.3%). Sign drives direction when `direction` omitted. */
  delta: number
  /**
   * Explicit direction override. When omitted, derived from the sign of `delta`
   * (0 = flat, >0 = up, <0 = down).
   */
  direction?: KpiTrendDirection
  /** Suffix appended to the delta. Defaults to `'%'`. */
  suffix?: string
  /** Extra classes. */
  className?: string
}
```

### Types

#### `KpiCardAccentSide`

Where (if anywhere) to draw the colored accent bar.

The polished flagship apps use a 4px colored bar — sometimes on the
left edge (`'left'`), sometimes across the top (`'top'`), and sometimes
none at all (`'none'`). Default is `'none'` to preserve back-compat for
call sites that don't pass the prop.

```typescript
type KpiCardAccentSide = 'left' | 'top' | 'none'
```

#### `KpiTrendDirection`

Direction of a KPI trend indicator: rising, falling, or unchanged.

```typescript
type KpiTrendDirection = 'up' | 'down' | 'flat'
```

### Functions

#### `KpiCard(props)`

Single KPI / metric display card.

Layout: `[icon? title  action?] [value] [trend? / subtitle?]`.
Apps use this for dashboard metrics, report summaries, and admin
overviews.

Visual variants follow the polished flagship apps:
- blog/helpdesk-ticketing: `accentSide="left"` + `upperLabel` + `emphasizeValue`
- crm/project-management: `accentSide="top"` + `upperLabel` + `emphasizeValue` + `hoverLift`
- personal-finance/online-store: `accentSide="none"` (default)

```typescript
function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  action,
  accentSide = 'none',
  accentColor = 'border-primary',
  upperLabel = false,
  emphasizeValue = false,
  hoverLift = false,
  className,
  dataMolId,
}: KpiCardProps): JSX.Element
```

- `props` — Component props (see {@link KpiCardProps}).

#### `KpiCardGrid(props)`

Grid for KPI cards — a fixed `columns`-column grid at every viewport
width (it does not collapse on narrow viewports). Gap and column count
are tokens resolved against the wired ClassMap.

```typescript
function KpiCardGrid({
  children,
  columns = 4,
  gap = 'md',
  className,
}: KpiCardGridProps): JSX.Element
```

- `props` — Component props (see {@link KpiCardGridProps}).

#### `KpiCardTrend(props)`

Tiny arrow + delta% rendered inside a `<KpiCard>`'s trend slot.
The `direction` only picks the arrow glyph — no color is applied; pass a
semantic text color via `className` for red/green deltas.

```typescript
function KpiCardTrend({
  delta,
  direction,
  suffix = '%',
  className,
}: KpiCardTrendProps): JSX.Element
```

- `props` — Component props (see {@link KpiCardTrendProps}).

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

- The accent bar, hover lift, and uppercase-label variants emit raw Tailwind
  utility classes (`border-l-4`, `border-primary`, `hover:-translate-y-0.5`,
  `text-on-surface-variant`, `font-extrabold`). They only take effect when the
  app's ClassMap bond is Tailwind-based AND the theme defines the `primary` /
  `on-surface-variant` color tokens; under a non-Tailwind ClassMap these props
  are inert.
- `<KpiCardTrend>` renders only the arrow glyph + number — it does NOT color
  the delta by direction. Pass `className` with a semantic text color (e.g.
  success/error) yourself if you want red/green deltas.
- `<KpiCardGrid columns={n}>` renders a responsive n-column grid (via
  `cm.grid`): it starts at 1 column on phones and steps up to `n` at larger
  breakpoints, so cards don't overflow on mobile. Override `className` if you
  need a fixed (non-collapsing) grid.
- `value`/`title` are ReactNode — format numbers and translate labels yourself
  (`t('...')`).
