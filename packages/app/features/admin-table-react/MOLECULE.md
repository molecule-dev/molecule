# @molecule/app-admin-table-react

`@molecule/app-admin-table-react` — generic admin-style data table.
Define columns, optionally enable row-click navigation, bulk-select
checkboxes, and a row-actions kebab menu; supply a pagination footer
via the `footer` slot.

Generalised from the AdminProductsTable / AdminOrdersTable shapes in
the online-store flagship — the table itself is the reusable
primitive; product-specific cells (sale price, stock badges) stay in
the consumer.

## Quick Start

```tsx
import { AdminTable, type AdminTableColumn } from '@molecule/app-admin-table-react'

const columns: AdminTableColumn<Product>[] = [
  { id: 'name', header: 'Product', render: (p) => <Product p={p} /> },
  { id: 'price', header: 'Price', render: (p) => `$${(p.price / 100).toFixed(2)}`, align: 'right' },
  { id: 'stock', header: 'Stock', render: (p) => <StockBadge stock={p.stock} /> },
]

<AdminTable
  rows={products}
  columns={columns}
  rowKey={(p) => p.id}
  loading={loading}
  onRowClick={(p) => navigate(`/product/${p.id}`)}
  bulkSelect
  rowActions={[
    { label: 'Edit', hrefFor: (p) => `/product/${p.id}`, onSelect: () => {} },
    { label: 'Delete', destructive: true, onSelect: (p) => http.delete(`/api/products/${p.id}`) },
  ]}
  footer={<Pagination ... />}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-admin-table-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `AdminTableColumn`

A column definition. Drives header rendering + per-row cell rendering.

```typescript
interface AdminTableColumn<T> {
  /** Stable identifier (also used as React key). */
  id: string
  /** Column header (rendered in `<th>`). */
  header: ReactNode
  /** Cell renderer for one row. */
  render: (row: T) => ReactNode
  /** Optional alignment override; defaults to left. */
  align?: 'left' | 'right' | 'center'
  /** Optional ClassMap class string for the `<td>`. */
  className?: string
  /** Optional ClassMap class string for the `<th>`. */
  headerClassName?: string
}
```

#### `AdminTableRowAction`

One entry in the row-action kebab menu.

```typescript
interface AdminTableRowAction<T> {
  /** Label rendered in the menu (post-i18n). */
  label: ReactNode
  /** Called when the action is selected. */
  onSelect: (row: T) => void | Promise<void>
  /** Optional `data-mol-id` for tests/automation. */
  dataMolIdFor?: (row: T) => string
  /** Marks the action visually as destructive (red). */
  destructive?: boolean
  /** Optional href for non-click actions (rendered as a link). */
  hrefFor?: (row: T) => string
}
```

### Functions

#### `AdminTable({
  rows,
  columns,
  rowKey,
  loading,
  skeletonRowCount = 8,
  onRowClick,
  bulkSelect,
  selectedIds = [],
  onSelectedIdsChange,
  rowActions,
  rowActionsAriaLabel,
  footer,
  className,
  tbodyDataMolId,
})`

Admin-style data table.

```typescript
function AdminTable({
  rows,
  columns,
  rowKey,
  loading,
  skeletonRowCount = 8,
  onRowClick,
  bulkSelect,
  selectedIds = [],
  onSelectedIdsChange,
  rowActions,
  rowActionsAriaLabel,
  footer,
  className,
  tbodyDataMolId,
}: AdminTableProps<T>): JSX.Element
```

#### `AdminTableRowActions({
  row,
  actions,
  ariaLabel,
})`

Three-dots row actions menu.

```typescript
function AdminTableRowActions({
  row,
  actions,
  ariaLabel,
}: AdminTableRowActionsProps<T>): JSX.Element
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`
