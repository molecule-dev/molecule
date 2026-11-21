/**
 * `@molecule/app-weather-card-angular` — current-conditions hero card, the
 * Angular counterpart of `@molecule/app-weather-card-react`: the same props
 * and the same DOM for the same input.
 *
 * Exports `<WeatherCard>` — gradient background, glass condition pill,
 * optional alert badge, hi/lo chip, and a 24h temperature sparkline rendered
 * from a trace.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { WeatherCard } from '@molecule/app-weather-card-angular'
 *
 * @Component({
 *   selector: 'app-conditions',
 *   standalone: true,
 *   imports: [WeatherCard],
 *   template: `
 *     <div mol-weather-card [locationName]="'San Francisco'" [region]="'California, USA'" [temperature]="62"
 *          [condition]="'Partly cloudy'" [conditionIcon]="'partly_cloudy_day'" [alertLevel]="'watch'"
 *          [unit]="'°F'" [trace]="hourly">
 *       <span slot="eyebrow">Right now</span>
 *       <span slot="feelsLikeLabel">Feels like 60°</span>
 *       <span slot="highLowLabel">H 68° · L 54°</span>
 *       <span slot="updatedLabel">Updated 5m ago</span>
 *       <span slot="alertLabel">Heat watch</span>
 *     </div>
 *   `,
 * })
 * export class Conditions {
 *   hourly = [
 *     { hour: '09:00', temperature: 58 },
 *     { hour: '12:00', temperature: 64 },
 *     { hour: '15:00', temperature: 66 },
 *   ]
 * }
 * ```
 *
 * @remarks
 * Stateless about i18n and units: pre-formatted labels projected as
 * `[slot=eyebrow]`, `[slot=feelsLikeLabel]`, `[slot=highLowLabel]`,
 * `[slot=updatedLabel]` and `[slot=alertLabel]` content, so the consumer owns
 * translation and formatting. The numeric `feelsLike`, `high` and `low` props
 * are currently INERT — nothing renders them; always project the labels. With
 * no `trace` (or fewer than 2 points) the sparkline falls back to a fixed
 * DECORATIVE path — it looks like data but is fake; pass a real trace or hide
 * the card. `conditionIcon` and the alert badge use Material Symbols ligature
 * names (host app must load that font). Styling leans on the bonded ClassMap
 * (`cm.weatherCardHero`, `cm.weatherCardConditionPill`, …): a ClassMap bond
 * plus a theme are prerequisites, and text is always white on the gradient.
 * `unit` defaults to '°F'; `temperature` is rendered rounded.
 *
 * @module
 */

export * from './types.js'
export * from './weather-card.component.js'
