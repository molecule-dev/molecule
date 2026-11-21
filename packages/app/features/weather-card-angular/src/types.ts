/**
 * Types of `@molecule/app-weather-card-angular` — the Angular counterpart of
 * `@molecule/app-weather-card-react`, same props and DOM.
 *
 * @module
 */

/** Severity level for a weather alert badge. */
export type WeatherAlertLevel = 'watch' | 'warning' | 'emergency'

/** A single hour's temperature measurement in the 24h sparkline trace. */
export interface WeatherTracePoint {
  hour: string
  temperature: number
}

/**
 * Props accepted by the {@link WeatherCard} component — the same props
 * `@molecule/app-weather-card-react` accepts (React names). Node props
 * (`eyebrow`, `alertLabel`, `updatedLabel`, `feelsLikeLabel`, `highLowLabel`)
 * are projected content in Angular (an input cannot carry a node), so they are
 * typed `unknown`: pass them in the host template, not as values.
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
  /** The alert badge's text, projected as `[slot=alertLabel]` content. */
  alertLabel?: unknown
  /** Pre-formatted relative time string (e.g. "5m ago"), projected as `[slot=updatedLabel]`. */
  updatedLabel?: unknown
  unit?: string
  /** "Right now" eyebrow text — defaults to empty; projected as `[slot=eyebrow]`. */
  eyebrow?: unknown
  /** 24h trace driving the area sparkline. */
  trace?: ReadonlyArray<WeatherTracePoint>
  /** Pre-formatted "Feels like {N}°" label, projected as `[slot=feelsLikeLabel]`. */
  feelsLikeLabel?: unknown
  /** Pre-formatted high/low chip label, projected as `[slot=highLowLabel]`. */
  highLowLabel?: unknown
  className?: string
}
