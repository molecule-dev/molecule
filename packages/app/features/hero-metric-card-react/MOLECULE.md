# @molecule/app-hero-metric-card-react

React hero metric card primitives.

Exports:
- `<HeroMetricCard>` — top-of-dashboard hero metric card.
- `<HeroMetricTrendChip>` — directional ▲/▼ + delta chip used inside the card.
- Type aliases: `HeroMetricCardProps`, `HeroMetricTrend`,
  `HeroMetricTrendDirection`, `HeroMetricAccent`, `HeroMetricSemanticAccent`.

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
npm install @molecule/app-hero-metric-card-react @molecule/app-i18n @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
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
   * When `true`, swaps the value for a localized loading line and
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

#### `HeroMetricTrendChipProps`

```typescript
interface HeroMetricTrendChipProps {
  /** Direction + pre-formatted delta string. */
  trend: HeroMetricTrend
  /** Extra classes. */
  className?: string
}
```

### Types

#### `HeroMetricAccent`

Optional accent color for the hero card's top edge.

A semantic name ({@link HeroMetricSemanticAccent}) is resolved through
`cm.progressColor()` to a real, theme-aware ClassMap color token, so the
accent bar is visibly colored in both light and dark themes. An arbitrary
CSS color string is also accepted and applied inline (a one-off accent
color — the documented ClassMap exception).

```typescript
type HeroMetricAccent = HeroMetricSemanticAccent | (string & { __raw?: never })
```

#### `HeroMetricSemanticAccent`

Semantic accent names for the hero card's top-edge accent bar.

Each name resolves at render time to a real ClassMap `ColorVariant` (and
therefore a real, theme-aware color token). Note the two the theme has no
matching token for: `'danger'` → `error` and `'neutral'` → `secondary`.

```typescript
type HeroMetricSemanticAccent =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
```

#### `HeroMetricTrendDirection`

Direction of a hero-metric trend chip.

- `'up'` — value rose since the prior period.
- `'down'` — value fell since the prior period.

```typescript
type HeroMetricTrendDirection = 'up' | 'down'
```

### Functions

#### `HeroMetricCard(props)`

Top-of-dashboard hero metric card.

Replaces the bespoke `*HeroCard` components found across flagship
dashboards (CalorieRingCard, TodayHeroCard, MoodHeroCard,
SleepScoreHeroCard, PetSnapshotHero, NextAppointmentCard,
WorkoutHeroCard, VitalsHeroCard, …) with a single composable
primitive.

Layout: large value left (with optional unit + trend chip + subtitle),
`progressRing` or `icon` slot to the right.

Styling routes entirely through `getClassMap()` — including the colored
top-edge accent, which is a full-width bar tinted via `cm.progressColor()`.
Inline style is used only for the bar's fixed height (and a one-off raw
accent color when the caller passes a CSS color string).

```typescript
function HeroMetricCard({
  title,
  value,
  unit,
  trend,
  subtitle,
  progressRing,
  icon,
  accent,
  onClick,
  loading = false,
  className,
  dataMolId,
}: HeroMetricCardProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props.

**Returns:** The rendered hero metric card element.

#### `HeroMetricTrendChip(props)`

Compact trend indicator rendered below the hero value.

Shows a directional arrow (▲ / ▼) followed by the caller-provided
delta string. The arrow's `aria-label` is localized via
`@molecule/app-i18n` so screen readers announce "Trending up" or
"Trending down" rather than the bare glyph.

```typescript
function HeroMetricTrendChip({
  trend,
  className,
}: HeroMetricTrendChipProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `props` — Component props.

**Returns:** The rendered trend chip element.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

- Every semantic `accent` (`primary`/`success`/`warning`/`danger`/`info`/
  `neutral`) resolves to a REAL, theme-aware ClassMap color via
  `cm.progressColor()` — visibly colored in both light and dark themes.
  `danger` maps to the theme's `error` token and `neutral` to `secondary`
  (the theme defines no `danger`/`neutral` token). A raw CSS color string is
  also accepted for one-off brand accents.
- Styling routes through `getClassMap()` (muted text = `cm.textMuted`,
  caps/tracking = `cm.uppercase`/`cm.trackingWide`). The lone raw utility is
  `leading-none` on the big value — a line-height with no ClassMap member.
- `getClassMap()` requires a bonded ClassMap. Text uses
  `@molecule/app-i18n`'s `t()` with English fallbacks — the companion
  `@molecule/app-locales-hero-metric-card` bond supplies translations.

## Translations

Translation strings are provided by `@molecule/app-locales-hero-metric-card`.
