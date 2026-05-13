/**
 * `@molecule/app-weather-card-react` — current-conditions hero card.
 * Gradient background, glass condition pill, optional alert badge,
 * hi/lo chip, and a 24h temperature sparkline rendered from a trace.
 *
 * Stateless about i18n: pre-formatted ReactNode labels (eyebrow,
 * feelsLikeLabel, highLowLabel, updatedLabel, alertLabel) so the
 * consumer owns translation.
 *
 * Extracted from the weather-dashboard flagship.
 *
 * @example
 * ```tsx
 * import { WeatherCard } from '@molecule/app-weather-card-react'
 *
 * <WeatherCard
 *   locationName="San Francisco"
 *   region="California, USA"
 *   temperature={62}
 *   condition="Partly cloudy"
 *   conditionIcon="partly_cloudy_day"
 *   eyebrow={t('weather.rightNow')}
 *   feelsLikeLabel={t('weather.feelsLike', { degrees: 60 })}
 *   highLowLabel={t('weather.hiLo', { hi: 68, lo: 54 })}
 *   updatedLabel={t('weather.updated', { time: '5m ago' })}
 *   alertLevel="watch"
 *   alertLabel={t('weather.alert.watch')}
 *   trace={hourly}
 * />
 * ```
 *
 * @module
 */

export * from './WeatherCard.js'
