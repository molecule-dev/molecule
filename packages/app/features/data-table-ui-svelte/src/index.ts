/**
 * Svelte data-table UI primitives (standalone — they render plain table elements
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
 * This package is the Svelte counterpart of `@molecule/app-data-table-ui-react`:
 * the same export names, the same props (React's prop names), and the same DOM
 * for the same input, so an app swaps framework by changing only the package
 * name in its imports. Render props and node props are Svelte snippets: a cell
 * renderer is `Snippet<[Row]>`, a title or empty state is `Snippet` or text.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { DataTableCard } from '@molecule/app-data-table-ui-svelte'
 *
 *   interface Row {
 *     id: string
 *     name: string
 *     email: string
 *   }
 *
 *   let { members }: { members: Row[] } = $props()
 *
 *   const columns = [
 *     { key: 'name', header: t('members.name', {}, { defaultValue: 'Name' }) },
 *     { key: 'email', header: t('members.email', {}, { defaultValue: 'Email' }) },
 *   ]
 * </script>
 *
 * <DataTableCard
 *   title={t('members.title', {}, { defaultValue: 'Team members' })}
 *   {columns}
 *   rows={members}
 *   rowKey={(row) => row.id}
 *   onRowClick={(row) => navigate(`/members/${row.id}`)}
 *   emptyMessage={t('members.empty', {}, { defaultValue: 'No members yet.' })}
 * >
 *   {#snippet cell(row: Row)}…{/snippet}
 * </DataTableCard>
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
 * Rows are keyed by `rowKey(row)` (React's `key={rowKey(row)}`), so a row keeps
 * its DOM node while its key is unchanged.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
