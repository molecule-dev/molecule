/**
 * `@molecule/app-weather-card-react` cases: the current-conditions hero, its
 * glass condition pill, the optional alert badge, the hi/lo chip and the 24h
 * temperature sparkline (a real trace or the decorative fallback path).
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A short 24h trace, as the weather-dashboard flagship feeds it. */
const trace = [
  { hour: '09:00', temperature: 58 },
  { hour: '12:00', temperature: 64 },
  { hour: '15:00', temperature: 66 },
]

/** `@molecule/app-weather-card-react`. */
export const weatherCardFeature: FeatureCases = {
  package: '@molecule/app-weather-card-react',
  families: [
    {
      component: 'WeatherCard',
      cases: [
        // Required props only: the default condition icon and the `°F` unit,
        // no eyebrow / region / alert / labels, and the decorative sparkline.
        { name: 'required props only', props: { locationName: 'San Francisco', temperature: 62 } },
        {
          name: 'every label and a real trace',
          props: {
            locationName: 'San Francisco',
            region: 'California, USA',
            temperature: 62,
            condition: 'Partly cloudy',
            conditionIcon: 'partly_cloudy_day',
            alertLevel: 'watch',
            unit: '°F',
            trace,
            className: 'parity-token',
          },
          slots: {
            eyebrow: ['Right now'],
            feelsLikeLabel: ['Feels like 60°'],
            highLowLabel: ['H 68° · L 54°'],
            updatedLabel: ['Updated 5m ago'],
            alertLabel: ['Heat watch'],
          },
        },
        {
          // React renders `alertLabel ?? alertLevel`: with no label the badge
          // shows the level's own name.
          name: 'alert label falls back to the level',
          props: { locationName: 'Fresno', temperature: 104, alertLevel: 'warning' },
        },
        {
          name: 'emergency alert with a custom label',
          props: { locationName: 'Miami', temperature: 91, alertLevel: 'emergency' },
          slots: { alertLabel: [{ tag: 'strong', children: ['Hurricane warning'] }] },
        },
        {
          // `null` for the optional strings and no label nodes: React renders
          // none of the optional wrappers.
          name: 'optional text omitted',
          props: {
            locationName: 'Reykjavík',
            region: null,
            temperature: 0,
            condition: null,
            alertLevel: null,
          },
        },
        {
          name: 'rounded temperature and a custom unit',
          props: { locationName: 'Oslo', temperature: 17.6, unit: '°C' },
        },
        {
          name: 'condition icon override without condition text',
          props: {
            locationName: 'Seattle',
            temperature: 54,
            condition: null,
            conditionIcon: 'thunderstorm',
          },
        },
        {
          // Fewer than two points is not a trend: the fixed decorative path.
          name: 'single-point trace uses the decorative path',
          props: {
            locationName: 'Lima',
            temperature: 71,
            trace: [{ hour: '09:00', temperature: 58 }],
          },
        },
        {
          name: 'empty trace uses the decorative path',
          props: { locationName: 'Quito', temperature: 66, trace: [] },
        },
        {
          // A flat series divides by the `|| 1` guard instead of by zero.
          name: 'flat trace',
          props: {
            locationName: 'Singapore',
            temperature: 88,
            trace: [
              { hour: '09:00', temperature: 70 },
              { hour: '12:00', temperature: 70 },
              { hour: '15:00', temperature: 70 },
            ],
          },
        },
        {
          // Fractional y positions exercise the one-decimal formatting.
          name: 'trace with uneven points',
          props: {
            locationName: 'Denver',
            temperature: 41,
            trace: [
              { hour: '09:00', temperature: 33 },
              { hour: '12:00', temperature: 52 },
              { hour: '15:00', temperature: 47 },
              { hour: '18:00', temperature: 58 },
            ],
          },
        },
        {
          // `feelsLike`, `high` and `low` are inert in React — nothing renders them.
          name: 'inert numeric props render nothing',
          props: {
            locationName: 'Chicago',
            temperature: 45,
            feelsLike: 38,
            high: 51,
            low: 33,
          },
        },
        {
          name: 'temperature and condition change',
          props: { locationName: 'Austin', temperature: 78, condition: 'Clear' },
          interactions: [
            { type: 'props', props: { temperature: 81.4, condition: 'Sunny' } },
            { type: 'props', props: { condition: null } },
          ],
        },
        {
          name: 'alert level changes',
          props: { locationName: 'Phoenix', temperature: 108, alertLevel: 'watch' },
          interactions: [
            { type: 'props', props: { alertLevel: 'warning' } },
            { type: 'props', props: { alertLevel: 'emergency' } },
            { type: 'props', props: { alertLevel: null } },
          ],
        },
        {
          name: 'trace changes',
          props: { locationName: 'Boston', temperature: 55, trace },
          interactions: [
            {
              type: 'props',
              props: { trace: [{ hour: '09:00', temperature: 48 }] },
            },
            { type: 'props', props: { trace: undefined } },
          ],
        },
        {
          name: 'location and region change',
          props: { locationName: 'Portland', region: 'Oregon, USA', temperature: 60 },
          interactions: [
            { type: 'props', props: { locationName: 'Salem', region: 'Oregon, USA' } },
            { type: 'props', props: { region: null } },
          ],
        },
      ],
    },
  ],
}
