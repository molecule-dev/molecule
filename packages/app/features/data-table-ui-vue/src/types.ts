/**
 * Types for the Vue card data table and its table-chrome primitives — the
 * same props `@molecule/app-data-table-ui-react` accepts (React's prop names),
 * with node-valued props typed as Vue's node type.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/**
 * Column definition for a {@link DataTableCard} — specifies key, header, and
 * cell renderer.
 */
export interface DataTableColumn<Row> {
  /** Stable key for the column. */
  key: string
  /** Header label (usually a translated string). */
  header: VNodeChild
  /** Render the cell for this column from a row. */
  cell: (row: Row) => VNodeChild
  /** Optional extra `<th>` / `<td>` classes (e.g. `cm.textCenter`). */
  cellClassName?: string
  /** Optional extra classes on this column's `<th>`. */
  headerClassName?: string
}

/** Props for {@link DataTableCard}. */
export interface DataTableCardProps<Row> {
  /**
   * Optional title above the table chrome. Passed as a prop or as the
   * same-named slot — both work.
   */
  title?: VNodeChild
  /** Right-aligned action / "View all" / link in the title row (prop or `titleAction` slot). */
  titleAction?: VNodeChild
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
  /**
   * Empty-state content shown inside the tbody when not loading and `rows` is
   * empty. Passed as a prop or as the same-named slot — both work.
   */
  emptyMessage?: VNodeChild
  /** Extra classes on the outer card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/** Props for {@link RowWithActions}. */
export interface RowWithActionsProps {
  /** Row cells (each wrapped in `<td>`) — the default slot. */
  children?: VNodeChild
  /** Action buttons/menu to render in the trailing "actions" cell (prop or `actions` slot). */
  actions?: VNodeChild
  /** Called when the row body is clicked (not the actions cell). */
  onClick?: () => void
  /** Whether the row should render in a "selected" visual state. */
  selected?: boolean
  /** Extra classes on the `<tr>`. */
  className?: string
}

/** Props for {@link TableEmpty}. */
export interface TableEmptyProps {
  /** Number of columns to span (for colspan on the td). */
  colSpan: number
  /** Empty-state content — the default slot. */
  children?: VNodeChild
  /** Extra classes on the cell. */
  className?: string
}

/** Props for {@link TableFooter}. */
export interface TableFooterProps {
  /** Left slot — typically a summary line ("5 rows selected"); prop or `left` slot. */
  left?: VNodeChild
  /** Right slot — typically a pagination bar; prop or `right` slot. */
  right?: VNodeChild
  /** Extra classes. */
  className?: string
}

/** Props for {@link TableToolbar}. */
export interface TableToolbarProps {
  /** Left-aligned content — usually a title or a results count (prop or `left` slot). */
  left?: VNodeChild
  /** Right-aligned actions — search input, filter button, export, etc. (prop or `right` slot). */
  right?: VNodeChild
  /** Optional full-width filter / chip row rendered below the main row (prop or `below` slot). */
  below?: VNodeChild
  /** Extra classes. */
  className?: string
}
