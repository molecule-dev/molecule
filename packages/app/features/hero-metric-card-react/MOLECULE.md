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

Styling routes through `getClassMap()` plus a small set of raw utility
classes (see the package remarks for their theme prerequisites); inline
style is used only for the colored top-border accent.

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

- Accent tokens map to `var(--mol-color-<token>)`. In the standard scaffold
  theme only `primary`, `success`, `warning`, and `info` resolve —
  `danger` and `neutral` have NO backing variable and silently fall back to
  `currentColor`. Use `warning`/`info` or pass a raw CSS color string until
  the host theme defines `--mol-color-danger` / `--mol-color-neutral`.
- KNOWN GAP: a few raw utility classes are used for typography
  (`uppercase tracking-widest`, `font-extrabold leading-none`,
  `text-on-surface-variant`). `text-on-surface-variant` only exists in apps
  whose theme defines Material-3 color tokens (the polished flagship
  templates) — in a plain scaffold the muted-text styling is absent, and
  Tailwind builds that do not source-scan this package's dist will not
  generate the utilities at all.
- `getClassMap()` requires a bonded ClassMap. Text uses
  `@molecule/app-i18n`'s `t()` with English fallbacks — the companion
  `@molecule/app-locales-hero-metric-card` bond supplies translations.

## Translations

Translation strings are provided by `@molecule/app-locales-hero-metric-card`.
