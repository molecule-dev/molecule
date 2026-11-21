/**
 * Types of `@molecule/app-weather-card-svelte` — the Svelte counterpart of
 * `@molecule/app-weather-card-react`, same props and DOM.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Severity level for a weather alert badge. */
export type WeatherAlertLevel = 'watch' | 'warning' | 'emergency'

/** A single hour's temperature measurement in the 24h sparkline trace. */
export interface WeatherTracePoint {
  hour: string
  temperature: number
}

/**
 * Props accepted by the {@link WeatherCard} component — the same props (React
 * names). React's node-valued props (`eyebrow`, `alertLabel`, `updatedLabel`,
 * `feelsLikeLabel`, `highLowLabel`) are `Snippet`s here.
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
  alertLabel?: Snippet
  /** Pre-formatted relative time string (e.g. "5m ago"). */
  updatedLabel?: Snippet
  unit?: string
  /** "Right now" eyebrow text — defaults to empty. */
  eyebrow?: Snippet
  /** 24h trace driving the area sparkline. */
  trace?: ReadonlyArray<WeatherTracePoint>
  /** Pre-formatted "Feels like {N}°" label. */
  feelsLikeLabel?: Snippet
  /** Pre-formatted high/low chip label. */
  highLowLabel?: Snippet
  className?: string
}
