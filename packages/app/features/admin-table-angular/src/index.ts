/**
 * Angular generic admin-style data table.
 *
 * Exports `<AdminTable>` (`div[mol-admin-table]`) — column defs, optional
 * row-click navigation, bulk-select checkboxes, a kebab-menu row-actions
 * column and a loading skeleton; and `<AdminTableRowActions>`
 * (`div[mol-admin-table-row-actions]`) — the detached kebab menu, for custom
 * row layouts. Both are the Angular counterparts of
 * `@molecule/app-admin-table-react`: the same props (React names), the same
 * ClassMap tokens, and the same DOM for the same input.
 *
 * The table itself is the reusable primitive; product-specific cells (sale
 * price, stock badges) stay in the consumer.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import {
 *   AdminTable,
 *   type AdminTableColumn,
 *   type AdminTableRowAction,
 * } from '@molecule/app-admin-table-angular'
 *
 * interface Product {
 *   id: string
 *   name: string
 * }
 *
 * @Component({
 *   selector: 'app-products',
 *   standalone: true,
 *   imports: [AdminTable],
 *   template: `
 *     <div mol-admin-table
 *       [rows]="products"
 *       [columns]="columns"
 *       [rowKey]="rowKey"
 *       [loading]="loading"
 *       [bulkSelect]="true"
 *       [rowActions]="actions"
 *       [onRowClick]="open"
 *     ></div>
 *     <ng-template #footer><span>Page 1</span></ng-template>
 *   `,
 * })
 * export class Products {
 *   readonly products: Product[] = [{ id: 'p1', name: 'Mug' }]
 *   readonly columns: AdminTableColumn<Product>[] = []
 *   readonly rowKey = (product: Product): string => product.id
 *   readonly loading = false
 *   readonly actions: AdminTableRowAction<Product>[] = []
 *   readonly open = (product: Product): void => {
 *     console.log('open product', product.id)
 *   }
 * }
 * ```
 *
 * @remarks
 * - Requires the Material Symbols Outlined font (row-actions kebab icon) —
 *   load it via an `@molecule/app-fonts-*` bond or a font link.
 * - Styling resolves entirely through the ClassMap bond (`getClassMap()` /
 *   `cm.*`): surfaces, borders, text, and hover all use theme tokens, so the
 *   table renders correctly in both light and dark themes with no per-app
 *   restyling.
 * - `selectedIds` is honored only together with `onSelectedIdsChange`
 *   (controlled selection); omit both for internal selection state.
 * - Node-valued fields (`header`, `label`, `footer`) are `TemplateRef`s, and a
 *   column's `render` is a `TemplateRef` whose context carries the row as
 *   `$implicit`/`a0`.
 *
 * @module
 */

export * from './admin-table.component.js'
export * from './admin-table-row-actions.component.js'
export * from './types.js'
