/**
 * Types of `@molecule/app-data-table-ui-angular` — the Angular counterpart of
 * `@molecule/app-data-table-ui-react`, same props and DOM.
 *
 * Node props (`title`, `titleAction`, `emptyMessage`, `left`, `right`, `below`,
 * `actions`) are projected content in Angular (an input cannot carry a node):
 * pass them as `[slot=<name>]` children, or as an input holding a `TemplateRef`
 * or plain text.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * Column definition for a {@link DataTableCard} — specifies key, header, and
 * cell renderer.
 */
export interface DataTableColumn<Row> {
  /** Stable key for the column. */
  key: string
  /** Header label: text, or a `TemplateRef` (React's node header). */
  header: unknown
  /**
   * Render the cell for this column from a row — a template whose context
   * carries the row as `$implicit` and `a0`.
   */
  cell: TemplateRef<{ $implicit: Row; a0: Row }>
  /** Optional extra `<th>` / `<td>` classes (e.g. `cm.textCenter`). */
  cellClassName?: string
  /** Optional extra classes on this column's `<th>`. */
  headerClassName?: string
}

/** Props for {@link DataTableCard} — the same props the React package accepts. */
export interface DataTableCardProps<Row> {
  /** Optional title above the table chrome (text, a `TemplateRef`, or `[slot=title]` content). */
  title?: unknown
  /** Right-aligned action in the title row (a `TemplateRef` or `[slot=titleAction]` content). */
  titleAction?: unknown
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
  /** Empty-state content (text, a `TemplateRef`, or `[slot=emptyMessage]` content). */
  emptyMessage?: unknown
  /** Extra classes on the outer card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/** Props for {@link RowWithActions} — the same props the React package accepts. */
export interface RowWithActionsProps {
  /** Row cells, projected as the element's default content. */
  children?: unknown
  /** Action buttons/menu for the trailing cell (a `TemplateRef` or `[slot=actions]` content). */
  actions?: unknown
  /** Called when the row body is clicked (not the actions cell), with the click event. */
  onClick?: (event: MouseEvent) => void
  /** Whether the row should render in a "selected" visual state. */
  selected?: boolean
  /** Extra classes on the `<tr>`. */
  className?: string
}

/** Props for {@link TableEmpty} — the same props the React package accepts. */
export interface TableEmptyProps {
  /** Number of columns to span (for colspan on the td). */
  colSpan: number
  /** Empty-state content, projected as the element's default content. */
  children?: unknown
  /** Extra classes on the cell. */
  className?: string
}

/** Props for {@link TableFooter} — the same props the React package accepts. */
export interface TableFooterProps {
  /** Left slot — typically a summary line (a `TemplateRef` or `[slot=left]` content). */
  left?: unknown
  /** Right slot — typically a pagination bar (a `TemplateRef` or `[slot=right]` content). */
  right?: unknown
  /** Extra classes. */
  className?: string
}

/** Props for {@link TableToolbar} — the same props the React package accepts. */
export interface TableToolbarProps {
  /** Left-aligned content (a `TemplateRef` or `[slot=left]` content). */
  left?: unknown
  /** Right-aligned actions (a `TemplateRef` or `[slot=right]` content). */
  right?: unknown
  /** Optional filter sub-row (a `TemplateRef` or `[slot=below]` content). */
  below?: unknown
  /** Extra classes. */
  className?: string
}
