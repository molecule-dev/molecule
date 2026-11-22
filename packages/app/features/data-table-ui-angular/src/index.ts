/**
 * Angular data-table UI primitives (standalone — they render plain table
 * elements and do not require a table component from a UI package).
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
 * This package is the Angular counterpart of `@molecule/app-data-table-ui-react`:
 * the same export names, the same props (React's prop names), and the same DOM
 * for the same input, so an app swaps framework by changing only the package
 * name in its imports. Each component's host element IS React's root element
 * (`section[mol-data-table-card]`, `tr[mol-row-with-actions]`, …). Node props
 * are projected content (`[slot=<name>]`), a `TemplateRef`, or text.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { DataTableCard, type DataTableColumn } from '@molecule/app-data-table-ui-angular'
 *
 * interface Row {
 *   id: string
 *   name: string
 *   email: string
 * }
 *
 * @Component({
 *   selector: 'app-members-table',
 *   standalone: true,
 *   imports: [DataTableCard],
 *   template: `
 *     <ng-template #nameCell let-row>
 *       <span>{{ row.name }}</span>
 *     </ng-template>
 *     <ng-template #emailCell let-row>
 *       <span>{{ row.email }}</span>
 *     </ng-template>
 *
 *     <section mol-data-table-card
 *              [title]="'Team members'"
 *              [columns]="columns"
 *              [rows]="members"
 *              [rowKey]="rowKey"
 *              [onRowClick]="open"
 *              [emptyMessage]="'No members yet.'">
 *     </section>
 *   `,
 * })
 * export class MembersTable {
 *   columns: DataTableColumn<Row>[] = []
 *   members: Row[] = []
 *   rowKey = (row: Row): string => row.id
 *   open = (row: Row): void => {
 *     // navigate to the member…
 *   }
 * }
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

export * from './data-table-card.component.js'
export * from './row-with-actions.component.js'
export * from './table-empty.component.js'
export * from './table-footer.component.js'
export * from './table-toolbar.component.js'
export * from './types.js'
