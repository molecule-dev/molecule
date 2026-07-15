# @molecule/app-kpi-card-react

React KPI / metric card primitives.

Exports:
- `<KpiCard>` — single metric card with title/value/subtitle/icon/trend/action slots.
- `<KpiCardTrend>` — arrow + delta% component for the trend slot.
- `<KpiCardGrid>` — responsive grid container for KPI cards.

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

#### `KpiCard(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .title
- `root0` — .value
- `root0` — .subtitle
- `root0` — .icon
- `root0` — .trend
- `root0` — .action
- `root0` — .accentSide
- `root0` — .accentColor
- `root0` — .upperLabel
- `root0` — .emphasizeValue
- `root0` — .hoverLift
- `root0` — .className
- `root0` — .dataMolId

#### `KpiCardGrid(root0, root0, root0, root0, root0)`

Responsive grid for KPI cards. Collapses to a single column on narrow
viewports and grows to `columns` on md+. Gap and column count are tokens
resolved against the wired ClassMap.

```typescript
function KpiCardGrid({
  children,
  columns = 4,
  gap = 'md',
  className,
}: KpiCardGridProps): JSX.Element
```

- `root0` — *
- `root0` — .children
- `root0` — .columns
- `root0` — .gap
- `root0` — .className

#### `KpiCardTrend(root0, root0, root0, root0, root0)`

Tiny arrow + delta% rendered inside a `<KpiCard>`'s trend slot.
Color maps to the `direction` — semantic colors come from the ClassMap.

```typescript
function KpiCardTrend({
  delta,
  direction,
  suffix = '%',
  className,
}: KpiCardTrendProps): JSX.Element
```

- `root0` — *
- `root0` — .delta
- `root0` — .direction
- `root0` — .suffix
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
