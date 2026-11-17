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
 * - `selected` only sets the `aria-current="true"` attribute — no built-in
 *   highlight. Pass a highlight class via `className` (or target
 *   `[aria-current="true"]` in host CSS) to make selection visible.
 * - With `onClick` the whole row is clickable through a transparent native
 *   button over it, named by the title (`aria-labelledby`); Enter / Space on
 *   that button run the same handler a click anywhere on the row runs, and the
 *   inner controls (the `actions` slot) sit above the button and keep their
 *   own clicks.
 * - `disabled` halves the opacity and disables the open button (no pointer
 *   cursor, no activation); there is no `data-mol-id` prop.
 * - Styling resolves through `getClassMap()` — wire a ClassMap bond first.
 * - Node-valued props (`title`, `leading`, `actions`, …) take a snippet or a
 *   plain value — both render inline.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
