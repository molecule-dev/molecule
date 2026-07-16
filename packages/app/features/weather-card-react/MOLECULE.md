# @molecule/app-weather-card-react

`@molecule/app-weather-card-react` — current-conditions hero card.
Gradient background, glass condition pill, optional alert badge,
hi/lo chip, and a 24h temperature sparkline rendered from a trace.

Stateless about i18n and units: pre-formatted ReactNode labels (eyebrow,
feelsLikeLabel, highLowLabel, updatedLabel, alertLabel) so the consumer
owns translation and formatting.

Extracted from the weather-dashboard flagship.

## Quick Start

```tsx
import { WeatherCard, type WeatherTracePoint } from '@molecule/app-weather-card-react'

const hourly: WeatherTracePoint[] = [
  { hour: '09:00', temperature: 58 },
  { hour: '12:00', temperature: 64 },
  { hour: '15:00', temperature: 66 },
]

<WeatherCard
  locationName="San Francisco"
  region="California, USA"
  temperature={62}
  condition="Partly cloudy"
  conditionIcon="partly_cloudy_day"
  eyebrow="Right now"
  feelsLikeLabel="Feels like 60°"
  highLowLabel="H 68° · L 54°"
  updatedLabel="Updated 5m ago"
  alertLevel="watch"
  alertLabel="Heat watch"
  trace={hourly}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-weather-card-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `WeatherCardProps`

Props for the {@link WeatherCard} component.

```typescript
interface WeatherCardProps {
  locationName: string
  region?: string | null
  temperature: number
  /** Currently INERT — nothing renders it; pass `feelsLikeLabel` instead. */
  feelsLike?: number | null
  /** Currently INERT — nothing renders it; pass `highLowLabel` instead. */
  high?: number | null
  /** Currently INERT — nothing renders it; pass `highLowLabel` instead. */
  low?: number | null
  condition?: string | null
  /** material-symbols icon name. */
  conditionIcon?: string
  alertLevel?: WeatherAlertLevel | null
  alertLabel?: ReactNode
  /** Pre-formatted relative time string (e.g. "5m ago"). */
  updatedLabel?: ReactNode
  unit?: string
  /** "Right now" eyebrow text — defaults to empty. */
  eyebrow?: ReactNode
  /** 24h trace driving the area sparkline. */
  trace?: ReadonlyArray<WeatherTracePoint>
  /** Pre-formatted "Feels like {N}°" label. */
  feelsLikeLabel?: ReactNode
  /** Pre-formatted high/low chip label. */
  highLowLabel?: ReactNode
  className?: string
}
```

#### `WeatherTracePoint`

A single hour's temperature measurement in the 24h sparkline trace.

```typescript
interface WeatherTracePoint {
  hour: string
  temperature: number
}
```

### Types

#### `WeatherAlertLevel`

Severity level for a weather alert badge.

```typescript
type WeatherAlertLevel = 'watch' | 'warning' | 'emergency'
```

### Functions

#### `WeatherCard({
  locationName,
  region,
  temperature,
  condition,
  conditionIcon = 'partly_cloudy_day',
  alertLevel,
  alertLabel,
  updatedLabel,
  unit = '°F',
  eyebrow,
  trace,
  feelsLikeLabel,
  highLowLabel,
  className,
})`

Atmospheric current-conditions hero.

```typescript
function WeatherCard({
  locationName,
  region,
  temperature,
  condition,
  conditionIcon = 'partly_cloudy_day',
  alertLevel,
  alertLabel,
  updatedLabel,
  unit = '°F',
  eyebrow,
  trace,
  feelsLikeLabel,
  highLowLabel,
  className,
}: WeatherCardProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

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

The numeric `feelsLike`, `high` and `low` props are currently INERT —
nothing renders them; only the pre-formatted `feelsLikeLabel` /
`highLowLabel` strings appear, so always pass the labels. With no
`trace` (or fewer than 2 points) the sparkline falls back to a fixed
DECORATIVE path — it looks like data but is fake; pass a real trace or
hide the card. `conditionIcon` and the alert badge use Material Symbols
ligature names (host app must load that font). Styling leans on raw
Tailwind + Material-3 tokens (`from-primary`, `to-tertiary-container`,
`text-primary-fixed/80`, arbitrary values like `min-h-[360px]`): a
Tailwind build source-scanning this package's dist plus an M3 theme are
prerequisites, and text is always white on the gradient. `unit` defaults
to '°F'; `temperature` is rendered rounded. Props (documented on the
exported `WeatherCardProps` interface): locationName, region,
temperature, feelsLike (inert), high (inert), low (inert), condition,
conditionIcon, alertLevel, alertLabel, updatedLabel, unit, eyebrow,
trace, feelsLikeLabel, highLowLabel, className.
