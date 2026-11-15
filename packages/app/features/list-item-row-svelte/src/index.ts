/**
 * Svelte generic list-item row.
 *
 * Exports `<ListItemRow>` — leading slot (icon/avatar/thumbnail) + up to three
 * text lines (title / subtitle / metadata) + right-side actions. Props: `title`,
 * `subtitle?`, `metadata?`, `leading?`, `actions?`, `onClick?`, `selected?`,
 * `disabled?`, `density?` (`'comfortable'` default | `'compact'`), `className?`.
 * Use for nav lists, mobile menus, search results, picker dialogs, inbox threads.
 * For table rows use `<RowWithActions>` from `@molecule/app-data-table-ui-svelte`
 * instead — this component is not a `<tr>`. It is the Svelte counterpart of
 * `@molecule/app-list-item-row-react`: same props and the same DOM for the same
 * input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { ListItemRow } from '@molecule/app-list-item-row-svelte'
 *
 *   declare function navigate(path: string): void
 * </script>
 *
 * <ListItemRow
 *   title="Project Alpha"
 *   subtitle="Last edited 2 hours ago"
 *   metadata="3 collaborators · 12 files"
 *   onClick={() => navigate('/projects/alpha')}
 * >
 *   {#snippet leading()}
 *     <img src="/icons/folder.svg" alt="" width={32} height={32} />
 *   {/snippet}
 * </ListItemRow>
 * ```
 *
 * @remarks
 * - `selected` only sets the `aria-selected` attribute — no built-in highlight.
 *   Pass a highlight class via `className` (or target `[aria-selected="true"]` in
 *   host CSS) to make selection visible.
 * - Clicks inside `actions` are stopPropagation'd automatically, so action buttons
 *   never trigger the row `onClick`.
 * - `disabled` halves the opacity and disables `onClick`; there is no
 *   `data-mol-id` prop.
 * - Styling resolves through `getClassMap()` — wire a ClassMap bond first.
 * - Node-valued props (`title`, `leading`, `actions`, …) take a snippet or a
 *   plain value — both render inline.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
