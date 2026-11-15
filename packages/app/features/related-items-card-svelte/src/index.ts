/**
 * Svelte card container for cross-linked / related item lists.
 *
 * Exports `RelatedItemsCard` — the Svelte counterpart of
 * `@molecule/app-related-items-card-react`: a titled Card with header + list +
 * empty state + "View all" link, with the same props (React names) and the
 * same DOM for the same input. Use for "Company → Deals", "Contact → Notes",
 * "Ticket → Related Articles" panels.
 *
 * Props: `title` (snippet or string), `items: T[]`, `renderItem(item, index)`
 * (a snippet with the item and its index), `icon?`, `onItemClick?(item, index)`
 * (rows become clickable), `emptyState?` (rendered when `items` is empty),
 * `viewAllHref?` (header "View all" link), `headerActions?` (right-aligned
 * header slot), `className?`, `dataMolId?`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { RelatedItemsCard } from '@molecule/app-related-items-card-svelte'
 *
 *   interface Article {
 *     id: string
 *     title: string
 *   }
 *
 *   let { articles, onOpen }: { articles: Article[]; onOpen: (id: string) => void } = $props()
 * </script>
 *
 * <RelatedItemsCard
 *   title="Related Articles"
 *   items={articles}
 *   viewAllHref="/articles"
 *   onItemClick={(article) => onOpen(article.id)}
 * >
 *   {#snippet renderItem(article)}
 *     <span>{article.title}</span>
 *   {/snippet}
 *   {#snippet emptyState()}
 *     <p>No related articles yet.</p>
 *   {/snippet}
 * </RelatedItemsCard>
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
 *   as snippets; strings render as text.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
