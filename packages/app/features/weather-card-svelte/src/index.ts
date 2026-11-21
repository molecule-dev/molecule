/**
 * `@molecule/app-weather-card-svelte` — current-conditions hero card, the
 * Svelte counterpart of `@molecule/app-weather-card-react`: the same props and
 * the same DOM for the same input.
 *
 * Exports `WeatherCard` — gradient background, glass condition pill, optional
 * alert badge, hi/lo chip, and a 24h temperature sparkline rendered from a
 * trace.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { WeatherCard, type WeatherTracePoint } from '@molecule/app-weather-card-svelte'
 *
 *   const hourly: WeatherTracePoint[] = [
 *     { hour: '09:00', temperature: 58 },
 *     { hour: '12:00', temperature: 64 },
 *     { hour: '15:00', temperature: 66 },
 *   ]
 * </script>
 *
 * <WeatherCard
 *   locationName="San Francisco"
 *   region="California, USA"
 *   temperature={62}
 *   condition="Partly cloudy"
 *   conditionIcon="partly_cloudy_day"
 *   alertLevel="watch"
 *   unit="°F"
 *   trace={hourly}
 * >
 *   {#snippet eyebrow()}Right now{/snippet}
 *   {#snippet feelsLikeLabel()}Feels like 60°{/snippet}
 *   {#snippet highLowLabel()}H 68° · L 54°{/snippet}
 *   {#snippet updatedLabel()}Updated 5m ago{/snippet}
 *   {#snippet alertLabel()}Heat watch{/snippet}
 * </WeatherCard>
 * ```
 *
 * @remarks
 * Stateless about i18n and units: pre-formatted snippet labels (eyebrow,
 * feelsLikeLabel, highLowLabel, updatedLabel, alertLabel) so the consumer owns
 * translation and formatting. The numeric `feelsLike`, `high` and `low` props
 * are currently INERT — nothing renders them; always pass the labels. With no
 * `trace` (or fewer than 2 points) the sparkline falls back to a fixed
 * DECORATIVE path — it looks like data but is fake; pass a real trace or hide
 * the card. `conditionIcon` and the alert badge use Material Symbols ligature
 * names (host app must load that font). Styling leans on the bonded ClassMap
 * (`cm.weatherCardHero`, `cm.weatherCardConditionPill`, …): a ClassMap bond
 * plus a theme are prerequisites, and text is always white on the gradient.
 * `unit` defaults to '°F'; `temperature` is rendered rounded.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
