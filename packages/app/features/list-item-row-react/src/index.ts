/**
 * Generic list-item row.
 *
 * Exports `<ListItemRow>` — leading slot (icon/avatar/thumbnail) + up to three
 * text lines (title / subtitle / metadata) + right-side actions. Props: `title`,
 * `subtitle?`, `metadata?`, `leading?`, `actions?`, `onClick?`, `selected?`,
 * `disabled?`, `density?` (`'comfortable'` default | `'compact'`), `className?`.
 * Use for nav lists, mobile menus, search results, picker dialogs, inbox threads.
 * For table rows use `<RowWithActions>` from `@molecule/app-data-table-ui-react`
 * instead — this component is not a `<tr>`.
 *
 * @remarks
 * - `selected` only sets the `aria-selected` attribute — no built-in highlight.
 *   Pass a highlight class via `className` (or target `[aria-selected="true"]` in
 *   host CSS) to make selection visible.
 * - Clicks inside `actions` are stopPropagation'd automatically, so action buttons
 *   never trigger the row `onClick`.
 * - `disabled` halves the opacity and disables `onClick`; there is no
 *   `data-mol-id` prop.
 * - With `onClick` the row gets `role="button"` and `tabIndex={0}`, but NO key handler —
 *   Enter/Space do not fire `onClick`. Add your own keyboard handling (or a real button in
 *   `actions`) if keyboard users must activate the row.
 * - It renders ONE row with no list semantics or container — wrap rows yourself.
 * - Styling resolves through `getClassMap()`, which throws unless `setClassMap(classMap)` from
 *   `@molecule/app-ui` ran at startup.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { ListItemRow } from '@molecule/app-list-item-row-react'
 *
 * export function ProjectList() {
 *   const [projects, setProjects] = useState([
 *     { id: 'alpha', name: 'Project Alpha', edited: 'Last edited 2 hours ago', collaborators: 3, files: 12 },
 *     { id: 'beta', name: 'Project Beta', edited: 'Last edited yesterday', collaborators: 1, files: 4 },
 *   ])
 *   const [selectedId, setSelectedId] = useState<string | null>(null)
 *   return (
 *     <div role="listbox">
 *       {projects.map((p) => (
 *         <ListItemRow
 *           key={p.id}
 *           title={p.name}
 *           subtitle={p.edited}
 *           metadata={`${p.collaborators} collaborators · ${p.files} files`}
 *           leading={<img src={`/icons/${p.id}.svg`} alt="" width={32} height={32} />}
 *           selected={p.id === selectedId}
 *           onClick={() => setSelectedId(p.id)}
 *           actions={
 *             <button type="button" onClick={() => setProjects((ps) => ps.filter((x) => x.id !== p.id))}>
 *               Archive
 *             </button>
 *           }
 *         />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './ListItemRow.js'
