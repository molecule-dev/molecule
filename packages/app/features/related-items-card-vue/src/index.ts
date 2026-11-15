/**
 * Vue card container for cross-linked / related item lists.
 *
 * Exports `<RelatedItemsCard>` — the Vue counterpart of
 * `@molecule/app-related-items-card-react`: a titled Card with header + list +
 * empty state + "View all" link, with the same props (React names) and the
 * same DOM for the same input. Use for "Company → Deals", "Contact → Notes",
 * "Ticket → Related Articles" panels.
 *
 * Props: `title` (node), `items: T[]`, `renderItem(item, index)`, `icon?`,
 * `onItemClick?(item, index)` (rows become clickable), `emptyState?` (rendered
 * when `items` is empty), `viewAllHref?` (header "View all" link),
 * `headerActions?` (right-aligned header slot), `className?`, `dataMolId?`.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { RelatedItemsCard } from '@molecule/app-related-items-card-vue'
 *
 * interface Article {
 *   id: string
 *   title: string
 * }
 *
 * const RelatedArticles = defineComponent({
 *   props: { articles: { type: Array as () => Article[], required: true } },
 *   setup(props) {
 *     const open = (article: Article): void => {
 *       // navigate to the article…
 *     }
 *     return () =>
 *       h(
 *         RelatedItemsCard,
 *         {
 *           title: 'Related Articles',
 *           items: props.articles,
 *           viewAllHref: '/articles',
 *           renderItem: (article: Article) => h('span', article.title),
 *           onItemClick: open,
 *         },
 *         { emptyState: () => [h('p', 'No related articles yet.')] },
 *       )
 *   },
 * })
 *
 * createApp(RelatedArticles).mount('#app')
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap — call `setClassMap()` (e.g. with
 *   `@molecule/app-ui-tailwind`) at startup or rendering throws.
 * - The "View all" label is hardcoded English in the React reference (not
 *   routed through i18n) and is the same literal here; pass a translated link
 *   via `headerActions` in localized apps.
 * - `onItemClick` rows are mouse-only `<li>` elements (no keyboard handler);
 *   render a real `<button>`/`<a>` inside `renderItem` when keyboard access
 *   matters.
 * - `viewAllHref` renders a plain `<a href>` (full page load in SPA routers);
 *   use `headerActions` with your router's Link for client-side navigation.
 * - Node-valued props (`title`, `icon`, `emptyState`, `headerActions`) arrive
 *   as a prop AND a same-named slot; components accept either.
 *
 * @module
 */

export * from './RelatedItemsCard.js'
export * from './types.js'
