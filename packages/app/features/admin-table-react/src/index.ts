/**
 * `@molecule/app-admin-table-react` — generic admin-style data table.
 * Define columns, optionally enable row-click navigation, bulk-select
 * checkboxes, and a row-actions kebab menu; supply a pagination footer
 * via the `footer` slot.
 *
 * Generalised from the AdminProductsTable / AdminOrdersTable shapes in
 * the online-store flagship — the table itself is the reusable
 * primitive; product-specific cells (sale price, stock badges) stay in
 * the consumer.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { AdminTable, type AdminTableColumn } from '@molecule/app-admin-table-react'
 * import { t } from '@molecule/app-i18n'
 *
 * interface Product { id: string; name: string; priceCents: number; category: string }
 *
 * export function AdminProductsPage() {
 *   const [products, setProducts] = useState<Product[]>([
 *     { id: 'p1', name: 'Desk Lamp', priceCents: 4999, category: 'Lighting' },
 *     { id: 'p2', name: 'Office Chair', priceCents: 18900, category: 'Furniture' },
 *   ])
 *   const [openedId, setOpenedId] = useState<string | null>(null)
 *   const columns: AdminTableColumn<Product>[] = [
 *     { id: 'name', header: t('form.name', undefined, { defaultValue: 'Name' }), render: (p) => p.name },
 *     { id: 'price', header: t('form.price', undefined, { defaultValue: 'Price' }), render: (p) => `$${(p.priceCents / 100).toFixed(2)}`, align: 'right' },
 *     { id: 'category', header: t('form.category', undefined, { defaultValue: 'Category' }), render: (p) => p.category },
 *   ]
 *   return (
 *     <>
 *       <p>{openedId}</p>
 *       <AdminTable
 *         rows={products}
 *         columns={columns}
 *         rowKey={(p) => p.id}
 *         onRowClick={(p) => setOpenedId(p.id)}
 *         bulkSelect
 *         tbodyDataMolId="admin-products-rows"
 *         rowActionsAriaLabel={() => t('nav.actions', undefined, { defaultValue: 'Actions' })}
 *         rowActions={[
 *           { label: t('common.edit', undefined, { defaultValue: 'Edit' }), hrefFor: (p) => `/admin/products/${p.id}`, onSelect: () => {} },
 *           {
 *             label: t('common.delete', undefined, { defaultValue: 'Delete' }),
 *             destructive: true,
 *             dataMolIdFor: (p) => `admin-products-delete-${p.id}`,
 *             onSelect: (p) => setProducts((rows) => rows.filter((r) => r.id !== p.id)),
 *           },
 *         ]}
 *       />
 *     </>
 *   )
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
 * - It does NOT fetch, sort, filter or paginate: pass the current page as `rows` and put your
 *   pagination control in `footer`. `loading` swaps rows for `skeletonRowCount` (default 8)
 *   skeleton rows.
 * - A row action with `hrefFor` renders a plain `<a>` and its `onSelect` is never called (it is
 *   still required by the type — pass a noop). Rows get `data-mol-id="admin-table-row-<key>"`.
 * - The kebab's aria-label defaults to the untranslated `'Row actions'` — pass
 *   `rowActionsAriaLabel` through `t()`.
 *
 * @module
 */

export * from './AdminTable.js'
export * from './AdminTableRowActions.js'
export * from './types.js'
