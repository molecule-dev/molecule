/**
 * Vue collapsible-section and show-more.
 *
 * Exports:
 * - `<CollapsibleSection>` — expandable section with a clickable heading.
 * - `<ShowMore>` — "Show N more" / "Show less" toggle for long lists.
 *
 * It is the Vue counterpart of `@molecule/app-collapsible-section-react`:
 * the same props (React names) and the same DOM for the same input, with
 * ClassMap tokens and i18n keys unchanged.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { CollapsibleSection, ShowMore } from '@molecule/app-collapsible-section-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     return () =>
 *       h(CollapsibleSection, { title: 'Key concepts', defaultExpanded: true }, {
 *         default: () => [h('p', 'Content revealed when expanded.')],
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * `<CollapsibleSection>` is uncontrolled by default (`defaultExpanded`);
 * passing `expanded` makes it fully controlled — then you must update it from
 * `onExpandedChange`. Node-valued props (`title`, `badge`, `actions`) arrive as
 * a prop AND a same-named slot; the body is the default slot. The header
 * renders as a single `<button>`, so anything passed to `actions` must NOT
 * contain buttons/links (nested interactive elements are invalid HTML) — put
 * row actions outside the section instead. `<ShowMore>`'s labels use the i18n
 * keys `showMore.more` / `showMore.less` with English `defaultValue`s; no
 * companion locale bond ships these keys — add them to your app's locale
 * resources (or pass custom `moreKey`/`lessKey`).
 *
 * @module
 */

export * from './CollapsibleSection.js'
export * from './types.js'
