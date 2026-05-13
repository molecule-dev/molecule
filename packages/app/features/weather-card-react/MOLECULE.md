# @molecule/app-weather-card-react

`@molecule/app-weather-card-react` — current-conditions hero card.
Gradient background, glass condition pill, optional alert badge,
hi/lo chip, and a 24h temperature sparkline rendered from a trace.

Stateless about i18n: pre-formatted ReactNode labels (eyebrow,
feelsLikeLabel, highLowLabel, updatedLabel, alertLabel) so the
consumer owns translation.

Extracted from the weather-dashboard flagship.

## Quick Start

```tsx
import { WeatherCard } from '@molecule/app-weather-card-react'

<WeatherCard
  locationName="San Francisco"
  region="California, USA"
  temperature={62}
  condition="Partly cloudy"
  conditionIcon="partly_cloudy_day"
  eyebrow={t('weather.rightNow')}
  feelsLikeLabel={t('weather.feelsLike', { degrees: 60 })}
  highLowLabel={t('weather.hiLo', { hi: 68, lo: 54 })}
  updatedLabel={t('weather.updated', { time: '5m ago' })}
  alertLevel="watch"
  alertLabel={t('weather.alert.watch')}
  trace={hourly}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-weather-card-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
