/**
 * Types of `@molecule/app-weather-card-vue` — the Vue counterpart of
 * `@molecule/app-weather-card-react`, same props and DOM.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Severity level for a weather alert badge. */
export type WeatherAlertLevel = 'watch' | 'warning' | 'emergency'

/** A single hour's temperature measurement in the 24h sparkline trace. */
export interface WeatherTracePoint {
  hour: string
  temperature: number
}

/**
 * Props accepted by the {@link WeatherCard} component — the same props
 * `@molecule/app-weather-card-react` accepts (React names). Node-valued props
 * (`eyebrow`, `alertLabel`, `updatedLabel`, `feelsLikeLabel`, `highLowLabel`)
 * may arrive as a prop or as the same-named slot.
 */
export interface WeatherCardProps {
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
  alertLabel?: VNodeChild
  /** Pre-formatted relative time string (e.g. "5m ago"). */
  updatedLabel?: VNodeChild
  unit?: string
  /** "Right now" eyebrow text — defaults to empty. */
  eyebrow?: VNodeChild
  /** 24h trace driving the area sparkline. */
  trace?: ReadonlyArray<WeatherTracePoint>
  /** Pre-formatted "Feels like {N}°" label. */
  feelsLikeLabel?: VNodeChild
  /** Pre-formatted high/low chip label. */
  highLowLabel?: VNodeChild
  className?: string
}
