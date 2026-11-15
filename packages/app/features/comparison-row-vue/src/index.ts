/**
 * Vue period-over-period stat comparison row — the Vue counterpart of
 * `@molecule/app-comparison-row-react`, with the same props and the same DOM
 * for the same input.
 *
 * Exports `<ComparisonRow>`: current value, optional previous value, and a
 * coloured delta% chip for dashboards, report summaries and finance
 * overviews.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { ComparisonRow } from '@molecule/app-comparison-row-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     return () =>
 *       h(ComparisonRow, {
 *         label: 'Revenue',
 *         current: '$24,800',
 *         previous: '$21,300',
 *         deltaPct: 16.4,
 *         periodLabel: 'vs. last month',
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * The delta chip colors by SIGN with fixed semantics: positive = green,
 * negative = red (hardcoded hexes applied inline, not theme tokens). There is
 * no "down-is-good" inversion — for metrics like churn or costs, negate
 * `deltaPct` (and restate the sign in `formatDelta`, which controls the text
 * only, never the color). `label` / `current` / `previous` / `periodLabel`
 * are consumer-provided nodes — pass pre-formatted, translated values. A
 * node-valued prop arrives as a prop AND a same-named slot; components
 * accept either.
 *
 * @module
 */

export * from './ComparisonRow.js'
export * from './types.js'
