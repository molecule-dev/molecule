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
 * import { AdminTable, type AdminTableColumn } from '@molecule/app-admin-table-react'
 *
 * const columns: AdminTableColumn<Product>[] = [
 *   { id: 'name', header: 'Product', render: (p) => <Product p={p} /> },
 *   { id: 'price', header: 'Price', render: (p) => `$${(p.price / 100).toFixed(2)}`, align: 'right' },
 *   { id: 'stock', header: 'Stock', render: (p) => <StockBadge stock={p.stock} /> },
 * ]
 *
 * <AdminTable
 *   rows={products}
 *   columns={columns}
 *   rowKey={(p) => p.id}
 *   loading={loading}
 *   onRowClick={(p) => navigate(`/product/${p.id}`)}
 *   bulkSelect
 *   rowActions={[
 *     { label: 'Edit', hrefFor: (p) => `/product/${p.id}`, onSelect: () => {} },
 *     { label: 'Delete', destructive: true, onSelect: (p) => http.delete(`/api/products/${p.id}`) },
 *   ]}
 *   footer={pagination}
 * />
 * ```
 *
 * @remarks
 * - Requires the Material Symbols Outlined font (row-actions kebab icon) —
 *   load it via an `@molecule/app-fonts-*` bond or a font link.
 * - The current implementation styles with a fixed light palette
 *   (white/slate surfaces) — verify against your theme before shipping a
 *   dark-mode surface.
 * - `selectedIds` is honored only together with `onSelectedIdsChange`
 *   (controlled selection); omit both for internal selection state.
 *
 * @module
 */

export * from './AdminTable.js'
export * from './AdminTableRowActions.js'
export * from './types.js'
