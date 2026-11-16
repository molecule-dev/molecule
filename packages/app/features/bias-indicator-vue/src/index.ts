/**
 * Vue political-bias / source-credibility indicator.
 *
 * Exports `<BiasIndicator>` — left/right scale with marker plus optional
 * reliability dot/chip — for news-aggregator article headers and dense
 * article lists (compact variant). It is the Vue counterpart of
 * `@molecule/app-bias-indicator-react`: same props and the same DOM for the
 * same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { BiasIndicator } from '@molecule/app-bias-indicator-vue'
 *
 * const Article = defineComponent({
 *   setup() {
 *     return () =>
 *       h(BiasIndicator, { bias: -0.4, reliability: 0.8, sourceLabel: 'Reuters' })
 *   },
 * })
 *
 * createApp(Article).mount('#app')
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap and an i18n provider (the component reads
 *   `useTranslation()`), exactly like the React package.
 * - Colours come from the per-app semantic CSS custom properties, so themes
 *   flow through without code changes.
 *
 * @module
 */

export * from './BiasIndicator.js'
export * from './types.js'
