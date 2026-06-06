# @molecule/app-hero-metric-card-react

React hero metric card primitives.

Exports:
- `<HeroMetricCard>` — top-of-dashboard hero metric card.
- `<HeroMetricTrendChip>` — directional ▲/▼ + delta chip used inside the card.
- Type aliases: `HeroMetricCardProps`, `HeroMetricTrend`,
  `HeroMetricTrendDirection`, `HeroMetricAccent`.

## Quick Start

```tsx
import { HeroMetricCard } from '@molecule/app-hero-metric-card-react'

<HeroMetricCard
  title="Total Revenue"
  value="$84,320"
  unit="USD"
  trend={{ direction: 'up', delta: '+12.4%' }}
  subtitle="vs last month"
  accent="success"
  onClick={() => navigate('/revenue')}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-hero-metric-card-react
```

## API

### Interfaces

#### `HeroMetricCardProps`

Props for `<HeroMetricCard>`.

```typescript
interface HeroMetricCardProps {
  /** Title / label for the metric (usually `t('...')`). */
  title: ReactNode
  /** The large primary value (string or formatted number). */
  value: ReactNode
  /** Optional unit shown next to the value (e.g. `'kcal'`, `'bpm'`). */
  unit?: ReactNode
  /** Optional trend chip rendered below the value. */
  trend?: HeroMetricTrend
  /** Optional supporting text below the trend / value. */
  subtitle?: ReactNode
  /** Optional progress ring or sparkline ReactNode shown to the right. */
  progressRing?: ReactNode
  /** Optional leading icon (used when no `progressRing` is provided). */
  icon?: ReactNode
  /** Optional accent border color (top edge). */
  accent?: HeroMetricAccent
  /** Optional click handler — turns the card into a button-role interactive. */
  onClick?: () => void
  /**
   * When `true`, swaps the value/title for a skeleton placeholder and
   * announces a loading state to assistive tech.
   */
  loading?: boolean
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

#### `HeroMetricTrend`

Trend chip rendered below the hero value.

`delta` is rendered verbatim — the caller is responsible for sign,
units, and locale formatting.

```typescript
interface HeroMetricTrend {
  /** Direction arrow / color. */
  direction: HeroMetricTrendDirection
  /** Pre-formatted delta string, e.g. `'+2.4%'` or `'-12 bpm'`. */
  delta: string
}
```

### Types

#### `HeroMetricAccent`

Optional accent border color for the hero card.

Maps to a semantic ClassMap border-color token. Use `'primary'` /
`'success'` / `'warning'` / `'danger'` / `'info'` / `'neutral'` to
align with the ClassMap palette; an arbitrary CSS color string is also
accepted (rendered as an inline `borderTopColor` per molecule design
rules — colored accent bars are the documented exception).

```typescript
type HeroMetricAccent =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | (string & { __raw?: never })
```

#### `HeroMetricTrendDirection`

Direction of a hero-metric trend chip.

- `'up'` — value rose since the prior period.
- `'down'` — value fell since the prior period.

```typescript
type HeroMetricTrendDirection = 'up' | 'down'
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-hero-metric-card`.
