/**
 * React data-table UI primitives (standalone — they render plain table
 * elements and do not require `<Table>` from `@molecule/app-ui-react`).
 *
 * Exports:
 * - `<DataTableCard>` — full polished-pattern data table (card wrapper +
 *   title + uppercase headers + divided rows + loading skeleton + empty
 *   state). Drop-in for the most common dashboard CRUD use case.
 * - `<TableToolbar>` — top chrome with left/right slots + optional filter row.
 * - `<TableEmpty>` — single full-width "no rows" cell for hand-rolled tables.
 * - `<TableFooter>` — bottom bar (left summary + right pagination).
 * - `<RowWithActions>` — `<tr>` wrapper with trailing actions cell and click handler.
 *
 * Use `DataTableCard` for new screens; use the row-level primitives to
 * compose richer custom tables (group-by, expandable rows, etc.).
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { DataTableCard, type DataTableColumn } from '@molecule/app-data-table-ui-react'
 * import { t } from '@molecule/app-i18n'
 *
 * interface Member { id: string; name: string; email: string; role: string }
 *
 * export function MembersTable() {
 *   const members: Member[] = [
 *     { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'Owner' },
 *     { id: 'u2', name: 'Alan Turing', email: 'alan@example.com', role: 'Editor' },
 *   ]
 *   const [openedId, setOpenedId] = useState<string | null>(null)
 *   const columns: DataTableColumn<Member>[] = [
 *     { key: 'name', header: t('form.name', undefined, { defaultValue: 'Name' }), cell: (m) => m.name },
 *     { key: 'email', header: t('settings.email', undefined, { defaultValue: 'Email' }), cell: (m) => m.email },
 *     { key: 'role', header: t('form.role', undefined, { defaultValue: 'Role' }), cell: (m) => m.role },
 *   ]
 *   return (
 *     <>
 *       <DataTableCard
 *         title={t('nav.members', undefined, { defaultValue: 'Members' })}
 *         columns={columns}
 *         rows={members}
 *         rowKey={(m) => m.id}
 *         onRowClick={(m) => setOpenedId(m.id)}
 *         emptyMessage={t('ui.table.empty', undefined, { defaultValue: 'No data available' })}
 *         dataMolId="members-table"
 *       />
 *       <p>{openedId}</p>
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * - The column shape is `{ key, header, cell: (row) => ReactNode }` — NOT `accessor`/`render`/
 *   `id`. `rowKey` is REQUIRED. It does NOT fetch, sort, filter, select or paginate — pass the
 *   current page as `rows` and put pagination in a `<TableFooter right={...}>` below it.
 * - `loading` replaces the rows with 5 skeleton rows; `emptyMessage` shows only when `rows` is
 *   empty and not loading (with no `emptyMessage` the empty cell is blank).
 * - All text (`title`, column `header`s, `emptyMessage`) is consumer-provided — pass translated
 *   strings; there is no built-in copy and no locale bond.
 * - `getClassMap()` throws unless `setClassMap(classMap)` from `@molecule/app-ui` ran at
 *   startup. `DataTableCard`'s chrome ALSO uses literal Tailwind classes with Material-3 theme
 *   tokens (`bg-surface-container-lowest`, `divide-surface-container`,
 *   `text-on-surface-variant`, …) — the app's Tailwind theme must define those tokens
 *   (molecule's default Tailwind ClassMap bond does); with a non-Tailwind ClassMap the card
 *   surface, dividers, and skeleton styling drop out.
 * - `onRowClick` makes rows pointer-clickable only — add your own keyboard path (e.g. a
 *   link/button in a cell) where accessibility matters.
 *
 * @module
 */

export * from './DataTableCard.js'
export * from './RowWithActions.js'
export * from './TableEmpty.js'
export * from './TableFooter.js'
export * from './TableToolbar.js'
