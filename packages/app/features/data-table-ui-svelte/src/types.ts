/**
 * Types for the Svelte card data table and its table-chrome primitives — the
 * same props `@molecule/app-data-table-ui-react` accepts (React's prop names),
 * with node-valued props typed as Svelte snippets.
 *
 * @module
 */

import type { Snippet } from 'svelte'

import type { ReactNodeProp } from './node-prop.js'

/**
 * Column definition for a {@link DataTableCard} — specifies key, header, and
 * cell renderer.
 */
export interface DataTableColumn<Row> {
  /** Stable key for the column. */
  key: string
  /** Header label (usually a translated string), as a snippet or plain text. */
  header: ReactNodeProp
  /** Render the cell for this column from a row. */
  cell: Snippet<[Row]>
  /** Optional extra `<th>` / `<td>` classes (e.g. `cm.textCenter`). */
  cellClassName?: string
  /** Optional extra classes on this column's `<th>`. */
  headerClassName?: string
}

/** Props for {@link DataTableCard}. */
export interface DataTableCardProps<Row> {
  /** Optional title above the table chrome. */
  title?: ReactNodeProp
  /** Right-aligned action / "View all" / link in the title row. */
  titleAction?: ReactNodeProp
  /** Column definitions. */
  columns: ReadonlyArray<DataTableColumn<Row>>
  /** Rows to render. Falls back to `emptyMessage` if empty and not loading. */
  rows: ReadonlyArray<Row>
  /** Pull a stable key from a row. */
  rowKey: (row: Row) => string
  /** When true, renders 5 skeleton rows instead of `rows`. */
  loading?: boolean
  /** Optional click handler per row. */
  onRowClick?: (row: Row) => void
  /** Empty-state content shown inside the tbody when not loading and `rows` is empty. */
  emptyMessage?: ReactNodeProp
  /** Extra classes on the outer card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/** Props for {@link RowWithActions}. */
export interface RowWithActionsProps {
  /** Row cells (each wrapped in `<td>`). */
  children?: ReactNodeProp
  /** Action buttons/menu to render in the trailing "actions" cell. */
  actions?: ReactNodeProp
  /** Called when the row body is clicked (not the actions cell). */
  onClick?: (event: MouseEvent) => void
  /** Whether the row should render in a "selected" visual state. */
  selected?: boolean
  /** Extra classes on the `<tr>`. */
  className?: string
}

/** Props for {@link TableEmpty}. */
export interface TableEmptyProps {
  /** Number of columns to span (for colspan on the td). */
  colSpan: number
  /** Empty-state content. */
  children?: ReactNodeProp
  /** Extra classes on the cell. */
  className?: string
}

/** Props for {@link TableFooter}. */
export interface TableFooterProps {
  /** Left slot — typically a summary line ("5 rows selected"). */
  left?: ReactNodeProp
  /** Right slot — typically a pagination bar. */
  right?: ReactNodeProp
  /** Extra classes. */
  className?: string
}

/** Props for {@link TableToolbar}. */
export interface TableToolbarProps {
  /** Left-aligned content — usually a title or a results count. */
  left?: ReactNodeProp
  /** Right-aligned actions — search input, filter button, export, etc. */
  right?: ReactNodeProp
  /** Optional full-width filter / chip row rendered below the main row. */
  below?: ReactNodeProp
  /** Extra classes. */
  className?: string
}
