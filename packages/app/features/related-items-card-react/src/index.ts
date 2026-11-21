/**
 * React card container for cross-linked / related item lists.
 *
 * Exports `<RelatedItemsCard>` — titled Card with header + list + empty state
 * + "View all" link. Use for "Company → Deals", "Contact → Notes",
 * "Ticket → Related Articles" panels.
 *
 * Props: `title` (ReactNode), `items: T[]`, `renderItem(item, index)`,
 * `icon?`, `onItemClick?(item, index)` (rows become clickable),
 * `emptyState?` (rendered when `items` is empty), `viewAllHref?` (header
 * "View all" link), `headerActions?` (right-aligned header slot),
 * `className?`, `dataMolId?`.
 *
 * @example
 * ```tsx
 * import { RelatedItemsCard } from '@molecule/app-related-items-card-react'
 *
 * interface Article { id: string; title: string }
 *
 * function RelatedArticles({ articles, onOpen }: {
 *   articles: Article[]
 *   onOpen: (id: string) => void
 * }) {
 *   return (
 *     <RelatedItemsCard
 *       title="Related Articles"
 *       items={articles}
 *       viewAllHref="/articles"
 *       emptyState={<p>No related articles yet.</p>}
 *       renderItem={(article) => <span>{article.title}</span>}
 *       onItemClick={(article) => onOpen(article.id)}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap — call `setClassMap()` (e.g. with
 *   `@molecule/app-ui-tailwind`) at startup or rendering throws.
 * - The "View all" label is hardcoded English (not routed through i18n);
 *   pass a translated link via `headerActions` in localized apps.
 * - `onItemClick` rows stay `<li>` list items: the card wraps each row's
 *   content in an inner `role="button"` control (focusable, Enter/Space
 *   activate it) so the click works from the keyboard too. A real
 *   `<button>`/`<a>` inside `renderItem` still takes its own clicks and focus.
 * - `viewAllHref` renders a plain `<a href>` (full page load in SPA routers);
 *   use `headerActions` with your router's Link for client-side navigation.
 *
 * @module
 */

export * from './RelatedItemsCard.js'
