/**
 * Vue data-table UI primitives (standalone — they render plain table elements
 * and do not require a table component from a UI package).
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
 * Use `DataTableCard` for new screens; use the row-level primitives to compose
 * richer custom tables (group-by, expandable rows, etc.).
 *
 * This package is the Vue counterpart of `@molecule/app-data-table-ui-react`:
 * the same export names, the same props (React's prop names), and the same DOM
 * for the same input, so an app swaps framework by changing only the package
 * name in its imports.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { DataTableCard } from '@molecule/app-data-table-ui-vue'
 *
 * interface Row {
 *   id: string
 *   name: string
 *   email: string
 * }
 *
 * const columns = [
 *   { key: 'name', header: t('members.name', {}, { defaultValue: 'Name' }), cell: (row: Row) => row.name },
 *   { key: 'email', header: t('members.email', {}, { defaultValue: 'Email' }), cell: (row: Row) => row.email },
 * ]
 *
 * const MembersTable = defineComponent({
 *   props: { members: { type: Array as () => Row[], required: true } },
 *   setup(props) {
 *     return () =>
 *       h(DataTableCard, {
 *         title: t('members.title', {}, { defaultValue: 'Team members' }),
 *         columns,
 *         rows: props.members,
 *         rowKey: (row: Row) => row.id,
 *         onRowClick: (row: Row) => navigate(`/members/${row.id}`),
 *         emptyMessage: t('members.empty', {}, { defaultValue: 'No members yet.' }),
 *       })
 *   },
 * })
 *
 * createApp(MembersTable).mount('#app')
 * ```
 *
 * @remarks
 * All text (`title`, column `header`s, `emptyMessage`) is consumer-provided —
 * pass translated strings; there is no built-in copy and no locale bond.
 * `DataTableCard`'s chrome uses Tailwind classes with Material-3 theme tokens
 * (`bg-surface-container-lowest`, `divide-surface-container`,
 * `text-on-surface-variant`, …) — the app's Tailwind theme must define those
 * tokens (molecule's default Tailwind ClassMap bond does); with a non-Tailwind
 * ClassMap the card surface, dividers, and skeleton styling drop out.
 * `onRowClick` makes rows pointer-clickable only — add your own keyboard path
 * (e.g. a link/button in a cell) where accessibility matters.
 *
 * Node-valued props (`title`, `titleAction`, `emptyMessage`, `left`, `right`,
 * `below`, `actions`) accept either a prop or a same-named slot.
 *
 * @module
 */

export * from './DataTableCard.js'
export * from './RowWithActions.js'
export * from './TableEmpty.js'
export * from './TableFooter.js'
export * from './TableToolbar.js'
export * from './types.js'
