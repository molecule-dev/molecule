/**
 * Vue generic admin-style data table.
 *
 * Exports `AdminTable` — column defs, optional row-click navigation,
 * bulk-select checkboxes, a kebab-menu row-actions column and a loading
 * skeleton; and `AdminTableRowActions` — the detached kebab menu, for custom
 * row layouts. Both are the Vue counterparts of
 * `@molecule/app-admin-table-react`: the same props (React names), the same
 * ClassMap tokens, and the same DOM for the same input.
 *
 * The table itself is the reusable primitive; product-specific cells (sale
 * price, stock badges) stay in the consumer.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { AdminTable, type AdminTableColumn } from '@molecule/app-admin-table-vue'
 *
 * interface Product {
 *   id: string
 *   name: string
 *   price: number
 * }
 *
 * const columns: AdminTableColumn<Product>[] = [
 *   { id: 'name', header: 'Product', render: (p) => p.name },
 *   { id: 'price', header: 'Price', render: (p) => `$${(p.price / 100).toFixed(2)}`, align: 'right' },
 * ]
 *
 * const Products = defineComponent({
 *   setup() {
 *     return () =>
 *       h(AdminTable, {
 *         rows: products.value,
 *         columns,
 *         rowKey: (p) => p.id,
 *         loading: loading.value,
 *         onRowClick: (p) => router.push(`/product/${p.id}`),
 *         bulkSelect: true,
 *         rowActions: [
 *           { label: 'Edit', hrefFor: (p) => `/product/${p.id}`, onSelect: () => {} },
 *           { label: 'Delete', destructive: true, onSelect: (p) => http.delete(`/api/products/${p.id}`) },
 *         ],
 *         footer: pagination.value,
 *       })
 *   },
 * })
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
 * - Node-valued props (`footer`) arrive as a prop AND a same-named slot;
 *   components accept either.
 *
 * @module
 */

export * from './AdminTable.js'
export * from './AdminTableRowActions.js'
export * from './types.js'
