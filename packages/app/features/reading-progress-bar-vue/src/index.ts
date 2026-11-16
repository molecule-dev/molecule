/**
 * Vue reading progress bar.
 *
 * Exports `<ReadingProgressBar>` — a thin top-of-page bar that fills as the
 * user scrolls through an article. Used by blog and news-aggregator article
 * pages. It is the Vue counterpart of
 * `@molecule/app-reading-progress-bar-react`: same export names, same props,
 * same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { createI18nPlugin } from '@molecule/app-vue'
 * import { ReadingProgressBar } from '@molecule/app-reading-progress-bar-vue'
 *
 * const articleEl = ref<Element | null>(null)
 *
 * const Article = defineComponent({
 *   setup() {
 *     return () =>
 *       h('div', [
 *         h(ReadingProgressBar, { containerRef: articleEl, color: 'var(--brand)', thickness: 4 }),
 *         h('article', { ref: articleEl }, '…long read…'),
 *       ])
 *   },
 * })
 *
 * createApp(Article).use(createI18nPlugin(i18nProvider)).mount('#app')
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-reading-progress-bar` (the
 * progressbar aria-label). The fill defaults to `currentColor` — it inherits
 * the surrounding text color, so pass `color` (e.g. `var(--color-primary)`)
 * when the ambient text color is low-contrast against the page edge. The bar
 * renders `position: fixed` at `z-index: 1000` spanning the viewport width; it
 * only listens to `window` scroll — `containerRef` changes what is measured,
 * not which scroller is observed (inner scroll containers won't drive it).
 * Requires the Vue binding's i18n provider and a wired ClassMap bond.
 *
 * @module
 */

export * from './progress.js'
export * from './ReadingProgressBar.js'
export * from './types.js'
