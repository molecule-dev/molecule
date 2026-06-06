/**
 * Generic list-item row.
 *
 * Exports `<ListItemRow>` — thumbnail + title + subtitle + metadata + actions.
 * Use for nav lists, mobile menus, search results, picker dialogs, inbox threads.
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
 *   actions={<button onClick={() => openMenu('alpha')}>...</button>}
 *   onClick={() => navigate('/projects/alpha')}
 * />
 * ```
 *
 * @module
 */

export * from './ListItemRow.js'
