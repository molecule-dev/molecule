/**
 * Types for the Solid generic admin table.
 *
 * Node-valued fields (`header`, `render`'s result, `label`, `footer`) take the
 * same values React accepts as `ReactNode`, in Solid's idiom: a `JSX.Element`.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** A column definition. Drives header rendering + per-row cell rendering. */
export interface AdminTableColumn<T> {
  /** Stable identifier. */
  id: string
  /** Column header (rendered in `<th>`). */
  header: JSX.Element
  /** Cell renderer for one row. */
  render: (row: T) => JSX.Element
  /** Optional alignment override; defaults to left. */
  align?: 'left' | 'right' | 'center'
  /** Optional class string appended to the `<td>` (resolve via `getClassMap()` — e.g. `cm.textRight` — rather than raw utilities). */
  className?: string
  /** Optional class string appended to the `<th>` (resolve via `getClassMap()` rather than raw utilities). */
  headerClassName?: string
}

/** One entry in the row-action kebab menu. */
export interface AdminTableRowAction<T> {
  /** Label rendered in the menu (post-i18n). */
  label: JSX.Element
  /** Called when the action is selected. */
  onSelect: (row: T) => void | Promise<void>
  /** Optional `data-mol-id` for tests/automation. */
  dataMolIdFor?: (row: T) => string
  /** Marks the action visually as destructive (red). */
  destructive?: boolean
  /** Optional href for non-click actions (rendered as a link). */
  hrefFor?: (row: T) => string
}

/** Props for the {@link AdminTable} component (React's prop names). */
export interface AdminTableProps<T> {
  /** Rows to render. */
  rows: readonly T[]
  /** Column definitions. */
  columns: readonly AdminTableColumn<T>[]
  /** Pull a stable key from a row. */
  rowKey: (row: T) => string
  /** When true, renders skeleton rows instead of the rows. */
  loading?: boolean
  /** Number of skeleton rows while loading (default 8). */
  skeletonRowCount?: number
  /** Click handler for whole-row navigation. */
  onRowClick?: (row: T) => void
  /** When set, renders a leading checkbox column and tracks selection. */
  bulkSelect?: boolean
  /** Selected row keys; honored only with `onSelectedIdsChange` (controlled mode). */
  selectedIds?: string[]
  /** Selection-change handler — providing it switches selection to controlled mode. */
  onSelectedIdsChange?: (ids: string[]) => void
  /** Kebab menu items; when set, a trailing right-aligned actions column renders. */
  rowActions?: readonly AdminTableRowAction<T>[]
  /** Per-row accessible label for the actions menu. */
  rowActionsAriaLabel?: (row: T) => string
  /** Slot rendered below the table (typically a pagination row). */
  footer?: JSX.Element
  /** Extra classes on the outer wrapper. */
  className?: string
  /** Optional `data-mol-id` to attach to the rendered `<tbody>` for tests/AI. */
  tbodyDataMolId?: string
}

/** Props for the {@link AdminTableRowActions} component (React's prop names). */
export interface AdminTableRowActionsProps<T> {
  /** The row the menu belongs to. */
  row: T
  /** Menu entries. */
  actions: readonly AdminTableRowAction<T>[]
  /**
   * Accessible label for the trigger button. Overrides the translated default
   * (`adminTable.aria.rowActions`, English `'Row actions'`).
   */
  ariaLabel?: string
}
