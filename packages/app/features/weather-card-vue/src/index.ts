/**
 * `@molecule/app-weather-card-vue` — current-conditions hero card.
 * Gradient background, glass condition pill, optional alert badge,
 * hi/lo chip, and a 24h temperature sparkline rendered from a trace.
 *
 * Stateless about i18n and units: pre-formatted node labels (eyebrow,
 * feelsLikeLabel, highLowLabel, updatedLabel, alertLabel) so the consumer
 * owns translation and formatting. It is the Vue counterpart of
 * `@molecule/app-weather-card-react`: same props and the same DOM for the
 * same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { WeatherCard, type WeatherTracePoint } from '@molecule/app-weather-card-vue'
 *
 * const hourly: WeatherTracePoint[] = [
 *   { hour: '09:00', temperature: 58 },
 *   { hour: '12:00', temperature: 64 },
 *   { hour: '15:00', temperature: 66 },
 * ]
 *
 * const Page = defineComponent({
 *   setup() {
 *     return () =>
 *       h(WeatherCard, {
 *         locationName: 'San Francisco',
 *         region: 'California, USA',
 *         temperature: 62,
 *         condition: 'Partly cloudy',
 *         conditionIcon: 'partly_cloudy_day',
 *         eyebrow: 'Right now',
 *         feelsLikeLabel: 'Feels like 60°',
 *         highLowLabel: 'H 68° · L 54°',
 *         updatedLabel: 'Updated 5m ago',
 *         alertLevel: 'watch',
 *         alertLabel: 'Heat watch',
 *         trace: hourly,
 *       })
 *   },
 * })
 *
 * createApp(Page).mount('#app')
 * ```
 *
 * @remarks
 * The numeric `feelsLike`, `high` and `low` props are currently INERT —
 * nothing renders them; only the pre-formatted `feelsLikeLabel` /
 * `highLowLabel` strings appear, so always pass the labels. With no
 * `trace` (or fewer than 2 points) the sparkline falls back to a fixed
 * DECORATIVE path — it looks like data but is fake; pass a real trace or
 * hide the card. `conditionIcon` and the alert badge use Material Symbols
 * ligature names (host app must load that font). Styling leans on the
 * bonded ClassMap (`cm.weatherCardHero`, `cm.weatherCardConditionPill`, …): a
 * ClassMap bond plus a theme are prerequisites, and text is always white on
 * the gradient. `unit` defaults to '°F'; `temperature` is rendered rounded.
 * Props (documented on the exported `WeatherCardProps` interface):
 * locationName, region, temperature, feelsLike (inert), high (inert), low
 * (inert), condition, conditionIcon, alertLevel, alertLabel, updatedLabel,
 * unit, eyebrow, trace, feelsLikeLabel, highLowLabel, className. Node-valued
 * props arrive as a prop AND a same-named slot; the component accepts either.
 *
 * @module
 */

export * from './types.js'
export * from './WeatherCard.js'
