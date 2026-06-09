# @molecule/app-data-table-ui-react

React table primitives for `<Table>` from `@molecule/app-ui-react`.

Exports:
- `<DataTableCard>` — full polished-pattern data table (card wrapper +
  title + uppercase-th headers + divide-y body + skeleton + empty
  state). Drop-in for the most common dashboard CRUD use case.
- `<TableToolbar>` — top chrome with left/right slots + optional filter row.
- `<TableEmpty>` — single full-width "no rows" cell.
- `<TableFooter>` — bottom bar (left summary + right pagination).
- `<RowWithActions>` — `<tr>` wrapper with trailing actions cell and click handler.

Use `DataTableCard` for new screens; use the row-level primitives to
compose richer custom tables (group-by, expandable rows, etc.).

## Quick Start

```tsx
import { DataTableCard } from '@molecule/app-data-table-ui-react'

const columns = [
  { key: 'name', header: 'Name', cell: (row) => row.name },
  { key: 'email', header: 'Email', cell: (row) => row.email },
  { key: 'role', header: 'Role', cell: (row) => row.role },
]

<DataTableCard
  title="Team members"
  columns={columns}
  rows={members}
  rowKey={(row) => row.id}
  onRowClick={(row) => navigate(`/members/${row.id}`)}
  emptyMessage="No members yet."
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-data-table-ui-react
```

## API

### Interfaces

#### `DataTableColumn`

Column definition for a DataTableCard — specifies key, header, and cell renderer.

```typescript
interface DataTableColumn<Row> {
  /** Stable key for React. */
  key: string
  /** Header label (usually `t('...')`). */
  header: ReactNode
  /** Render the cell for this column from a row. */
  cell: (row: Row) => ReactNode
  /** Optional extra `<th>` / `<td>` classes (e.g. `cm.textCenter`). */
  cellClassName?: string
  headerClassName?: string
}
```

### Functions

#### `DataTableCard(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Drop-in card-shaped data table matching the polished flagship pattern.

Renders:
1. Optional title + action row
2. Card-wrapped table with:
   - `bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm` outer
   - `bg-surface-container-low border-b border-outline-variant/10` thead
   - `text-[10px] font-black text-on-surface-variant uppercase tracking-widest` th
   - `divide-y divide-surface-container` tbody
   - `hover:bg-surface-container-low transition-colors` rows (when `onRowClick` provided)
   - 5-row pulsing skeleton when `loading`
   - Single full-width cell with `emptyMessage` when empty

For complex per-column rendering, pass cells that compose
`<StatusBadge>`, `<Avatar>`, etc.

```typescript
function DataTableCard({
  title,
  titleAction,
  columns,
  rows,
  rowKey,
  loading = false,
  onRowClick,
  emptyMessage,
  className,
  dataMolId,
}: DataTableCardProps<Row>): JSX.Element
```

- `root0` — *
- `root0` — .title
- `root0` — .titleAction
- `root0` — .columns
- `root0` — .rows
- `root0` — .rowKey
- `root0` — .loading
- `root0` — .onRowClick
- `root0` — .emptyMessage
- `root0` — .className
- `root0` — .dataMolId

#### `RowWithActions(root0, root0, root0, root0, root0, root0)`

`<tr>` wrapper that adds a trailing actions cell plus a click handler
on the body. Useful for data tables where each row has a trailing
ellipsis-menu or a row of action buttons.

```typescript
function RowWithActions({
  children,
  actions,
  onClick,
  selected,
  className,
}: RowWithActionsProps): JSX.Element
```

- `root0` — *
- `root0` — .children
- `root0` — .actions
- `root0` — .onClick
- `root0` — .selected
- `root0` — .className

#### `TableEmpty(root0, root0, root0, root0)`

Single full-width row shown when a `<Table>` has no data. Typically
wraps `<EmptyState>` from `@molecule/app-empty-state-react`.

```typescript
function TableEmpty({ colSpan, children, className }: TableEmptyProps): JSX.Element
```

- `root0` — *
- `root0` — .colSpan
- `root0` — .children
- `root0` — .className

#### `TableFooter(root0, root0, root0, root0)`

Footer bar rendered below an `<Table>`. Pass a pagination bar in `right`.

```typescript
function TableFooter({ left, right, className }: TableFooterProps): JSX.Element
```

- `root0` — *
- `root0` — .left
- `root0` — .right
- `root0` — .className

#### `TableToolbar(root0, root0, root0, root0, root0)`

Table top-chrome row with left/right slots and an optional bottom
sub-row for active filter chips or tabs. Sits above an `<Table>`
from `@molecule/app-ui-react`.

```typescript
function TableToolbar({ left, right, below, className }: TableToolbarProps): JSX.Element
```

- `root0` — *
- `root0` — .left
- `root0` — .right
- `root0` — .below
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
