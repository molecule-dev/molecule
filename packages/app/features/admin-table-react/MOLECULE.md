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
  footer={pagination}
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
  /** Optional class string appended to the `<td>` (resolve via `getClassMap()` — e.g. `cm.textRight` — rather than raw utilities). */
  className?: string
  /** Optional class string appended to the `<th>` (resolve via `getClassMap()` rather than raw utilities). */
  headerClassName?: string
}
```

#### `AdminTableProps`

```typescript
interface AdminTableProps<T> {
  rows: T[]
  columns: AdminTableColumn<T>[]
  rowKey: (row: T) => string
  loading?: boolean
  skeletonRowCount?: number
  /** Click handler for whole-row navigation. */
  onRowClick?: (row: T) => void
  /** When set, renders a leading checkbox column and tracks selection. */
  bulkSelect?: boolean
  /**
   * Selected row keys. Honored ONLY when `onSelectedIdsChange` is also
   * provided (controlled mode); otherwise selection state is internal.
   */
  selectedIds?: string[]
  /** Selection-change handler — providing it switches selection to controlled mode. */
  onSelectedIdsChange?: (ids: string[]) => void
  /** Kebab menu items. When set, a trailing right-aligned actions column is rendered. */
  rowActions?: AdminTableRowAction<T>[]
  rowActionsAriaLabel?: (row: T) => string
  /** Slot rendered below the table (typically a `<Pagination>` row). */
  footer?: ReactNode
  className?: string
  /** Optional `data-mol-id` to attach to the rendered `<tbody>` for tests/AI. */
  tbodyDataMolId?: string
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

#### `AdminTableRowActionsProps`

```typescript
interface AdminTableRowActionsProps<T> {
  row: T
  actions: AdminTableRowAction<T>[]
  ariaLabel: string
}
```

### Functions

#### `AdminTable(props)`

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

#### `AdminTableRowActions(props)`

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

- Requires the Material Symbols Outlined font (row-actions kebab icon) —
  load it via an `@molecule/app-fonts-*` bond or a font link.
- Styling resolves entirely through the ClassMap bond (`getClassMap()` /
  `cm.*`): surfaces, borders, text, and hover all use theme tokens, so the
  table renders correctly in both light and dark themes with no per-app
  restyling.
- `selectedIds` is honored only together with `onSelectedIdsChange`
  (controlled selection); omit both for internal selection state.
