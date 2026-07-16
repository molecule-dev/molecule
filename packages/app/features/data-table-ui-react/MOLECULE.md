# @molecule/app-data-table-ui-react

React data-table UI primitives (standalone — they render plain table
elements and do not require `<Table>` from `@molecule/app-ui-react`).

Exports:
- `<DataTableCard>` — full polished-pattern data table (card wrapper +
  title + uppercase headers + divided rows + loading skeleton + empty
  state). Drop-in for the most common dashboard CRUD use case.
- `<TableToolbar>` — top chrome with left/right slots + optional filter row.
- `<TableEmpty>` — single full-width "no rows" cell for hand-rolled tables.
- `<TableFooter>` — bottom bar (left summary + right pagination).
- `<RowWithActions>` — `<tr>` wrapper with trailing actions cell and click handler.

Use `DataTableCard` for new screens; use the row-level primitives to
compose richer custom tables (group-by, expandable rows, etc.).

## Quick Start

```tsx
import { DataTableCard } from '@molecule/app-data-table-ui-react'

const columns = [
  { key: 'name', header: t('members.name', {}, { defaultValue: 'Name' }), cell: (row) => row.name },
  { key: 'email', header: t('members.email', {}, { defaultValue: 'Email' }), cell: (row) => row.email },
]

<DataTableCard
  title={t('members.title', {}, { defaultValue: 'Team members' })}
  columns={columns}
  rows={members}
  rowKey={(row) => row.id}
  onRowClick={(row) => navigate(`/members/${row.id}`)}
  emptyMessage={t('members.empty', {}, { defaultValue: 'No members yet.' })}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-data-table-ui-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `DataTableCardProps`

```typescript
interface DataTableCardProps<Row> {
  /** Optional title above the table chrome. */
  title?: ReactNode
  /** Right-aligned action / "View all" / link in the title row. */
  titleAction?: ReactNode
  /** Column definitions. */
  columns: ReadonlyArray<DataTableColumn<Row>>
  /** Rows to render. Falls back to `emptyMessage` if empty and not loading. */
  rows: ReadonlyArray<Row>
  /** Pull a stable React key from a row. */
  rowKey: (row: Row) => string
  /** When true, renders 5 skeleton rows instead of `rows`. */
  loading?: boolean
  /** Optional click handler per row. */
  onRowClick?: (row: Row) => void
  /** Empty-state content shown inside the tbody when not loading + rows is empty. */
  emptyMessage?: ReactNode
  /** Extra classes on the outer card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

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

#### `RowWithActionsProps`

```typescript
interface RowWithActionsProps {
  /** Row cells (each wrapped in `<td>`). */
  children: ReactNode
  /** Action buttons/menu to render in the trailing "actions" cell. */
  actions?: ReactNode
  /** Called when the row body is clicked (not the actions cell). */
  onClick?: () => void
  /** Whether the row should render in a "selected" visual state. */
  selected?: boolean
  /** Extra classes on the `<tr>`. */
  className?: string
}
```

#### `TableEmptyProps`

```typescript
interface TableEmptyProps {
  /** Number of columns to span (for colspan on the td). */
  colSpan: number
  /** Empty-state content. */
  children: ReactNode
  /** Extra classes on the cell. */
  className?: string
}
```

#### `TableFooterProps`

```typescript
interface TableFooterProps {
  /** Left slot — typically a summary line ("5 rows selected"). */
  left?: ReactNode
  /** Right slot — typically `<PaginationBar>`. */
  right?: ReactNode
  /** Extra classes. */
  className?: string
}
```

#### `TableToolbarProps`

```typescript
interface TableToolbarProps {
  /** Left-aligned content — usually a title or a results count. */
  left?: ReactNode
  /** Right-aligned actions — search input, filter button, export, etc. */
  right?: ReactNode
  /** Optional full-width filter / chip row rendered below the main row. */
  below?: ReactNode
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `DataTableCard(props)`

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

- `props` — Component props (see {@link DataTableCardProps}).

#### `RowWithActions(props)`

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

- `props` — Component props (see {@link RowWithActionsProps}).

#### `TableEmpty(props)`

Single full-width row shown when a `<Table>` has no data. Typically
wraps `<EmptyState>` from `@molecule/app-empty-state-react`.

```typescript
function TableEmpty({ colSpan, children, className }: TableEmptyProps): JSX.Element
```

- `props` — Component props (see {@link TableEmptyProps}).

#### `TableFooter(props)`

Footer bar rendered below an `<Table>`. Pass a pagination bar in `right`.

```typescript
function TableFooter({ left, right, className }: TableFooterProps): JSX.Element
```

- `props` — Component props (see {@link TableFooterProps}).

#### `TableToolbar(props)`

Table top-chrome row with left/right slots and an optional bottom
sub-row for active filter chips or tabs. Sits above an `<Table>`
from `@molecule/app-ui-react`.

```typescript
function TableToolbar({ left, right, below, className }: TableToolbarProps): JSX.Element
```

- `props` — Component props (see {@link TableToolbarProps}).

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

All text (`title`, column `header`s, `emptyMessage`) is consumer-provided —
pass translated strings; there is no built-in copy and no locale bond.
`DataTableCard`'s chrome uses Tailwind classes with Material-3 theme tokens
(`bg-surface-container-lowest`, `divide-surface-container`,
`text-on-surface-variant`, …) — the app's Tailwind theme must define those
tokens (molecule's default Tailwind ClassMap bond does); with a
non-Tailwind ClassMap the card surface, dividers, and skeleton styling
drop out. `onRowClick` makes rows pointer-clickable only — add your own
keyboard path (e.g. a link/button in a cell) where accessibility matters.
