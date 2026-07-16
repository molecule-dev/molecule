/**
 * Types for the generic admin table.
 *
 * @module
 */

import type { ReactNode } from 'react'

/** A column definition. Drives header rendering + per-row cell rendering. */
export interface AdminTableColumn<T> {
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

/** One entry in the row-action kebab menu. */
export interface AdminTableRowAction<T> {
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
