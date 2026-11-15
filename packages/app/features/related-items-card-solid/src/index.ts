/**
 * Solid card container for cross-linked / related item lists.
 *
 * Exports `RelatedItemsCard` — the Solid counterpart of
 * `@molecule/app-related-items-card-react`: a titled Card with header + list +
 * empty state + "View all" link, with the same props (React names) and the
 * same DOM for the same input. Use for "Company → Deals", "Contact → Notes",
 * "Ticket → Related Articles" panels.
 *
 * Props: `title` (JSX), `items: T[]`, `renderItem(item, index)`, `icon?`,
 * `onItemClick?(item, index)` (rows become clickable), `emptyState?` (rendered
 * when `items` is empty), `viewAllHref?` (header "View all" link),
 * `headerActions?` (right-aligned header slot), `className?`, `dataMolId?`.
 *
 * @example
 * ```tsx
 * import { For } from 'solid-js'
 * import { RelatedItemsCard } from '@molecule/app-related-items-card-solid'
 *
 * interface Article {
 *   id: string
 *   title: string
 * }
 *
 * export function RelatedArticles(props: {
 *   articles: Article[]
 *   onOpen: (id: string) => void
 * }) {
 *   return (
 *     <RelatedItemsCard
 *       title="Related Articles"
 *       items={props.articles}
 *       viewAllHref="/articles"
 *       emptyState={<p>No related articles yet.</p>}
 *       renderItem={(article) => <span>{article.title}</span>}
 *       onItemClick={(article) => props.onOpen(article.id)}
 *     />
 *   )
 * }
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
 *
 * @module
 */

export * from './RelatedItemsCard.jsx'
export * from './types.js'
