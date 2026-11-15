/**
 * Vue horizontal divider with optional centered label.
 *
 * Exports `<SectionDivider>` — the Vue counterpart of
 * `@molecule/app-section-divider-react`: same props, same DOM for the same
 * input. The label is your own slot content — translate it upstream.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { SectionDivider } from '@molecule/app-section-divider-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     return () => [
 *       h(SectionDivider, () => 'OR'),
 *       h(SectionDivider, { align: 'start' }, { default: () => 'Today' }),
 *     ]
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (frame uses `cm.flex`, lines use `cm.flex1`) —
 *   rendering throws otherwise. No i18n dependency (the label is your own
 *   slot content — translate it upstream).
 * - `align` positions the label: `'center'` (default) draws lines on both
 *   sides; `'start'` / `'end'` put the label at that edge with a single
 *   line filling the rest.
 * - Lines use `currentColor` at 20% opacity, so they inherit the local text
 *   color in both light and dark themes.
 *
 * @module
 */

export * from './SectionDivider.js'
export * from './types.js'
