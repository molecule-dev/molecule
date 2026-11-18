/**
 * Generic list-item row.
 *
 * Exports `<ListItemRow>` — leading slot (icon/avatar/thumbnail) + up to three
 * text lines (title / subtitle / metadata) + right-side actions. Props: `title`,
 * `subtitle?`, `metadata?`, `leading?`, `actions?`, `toggle?`, `onClick?`, `selected?`,
 * `disabled?`, `density?` (`'comfortable'` default | `'compact'`), `className?`.
 * Use for nav lists, mobile menus, search results, picker dialogs, inbox threads.
 * For table rows use `<RowWithActions>` from `@molecule/app-data-table-ui-react`
 * instead — this component is not a `<tr>`.
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
 * - Pass `toggle` for a loaded server-backed action that belongs on the row.
 *   It renders the real `OptimisticToggleButton` beside any read-only counts in
 *   `metadata`. Key each row by record identity when rendering a collection.
 * - Styling resolves through `getClassMap()` — wire a ClassMap bond first.
 *
 * @example
 * ```tsx
 * import { ListItemRow } from '@molecule/app-list-item-row-react'
 *
 * <ListItemRow
 *   title="Project Alpha"
 *   subtitle="Last edited 2 hours ago"
 *   metadata="3 collaborators · 12 files"
 *   leading={<img src="/icons/folder.svg" alt="" width={32} height={32} />}
 *   toggle={{
 *     value: project.pinned,
 *     commit: async (desired) => (await setPinned(project.id, desired)).pinned,
 *     activeLabel: t('projects.unpin', undefined, { defaultValue: 'Unpin project' }),
 *     inactiveLabel: t('projects.pin', undefined, { defaultValue: 'Pin project' }),
 *   }}
 *   onClick={() => navigate('/projects/alpha')}
 * />
 * ```
 *
 * @module
 */

export * from './ListItemRow.js'
