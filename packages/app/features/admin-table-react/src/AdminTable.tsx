/**
 * `<AdminTable>` — generic data table with column defs, optional
 * row-click navigation, bulk-select checkboxes, kebab-menu row actions,
 * and a loading skeleton.
 *
 * @module
 */

import { type JSX, type ReactNode, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { AdminTableRowActions } from './AdminTableRowActions.js'
import type { AdminTableColumn, AdminTableRowAction } from './types.js'

export interface AdminTableProps<T> {
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

/** Admin-style data table. */
export function AdminTable<T>({
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
}: AdminTableProps<T>): JSX.Element {
  const cm = getClassMap()
  const [internalSelected, setInternalSelected] = useState<string[]>([])
  const selected = onSelectedIdsChange ? selectedIds : internalSelected
  const setSelected = (next: string[]): void => {
    if (onSelectedIdsChange) onSelectedIdsChange(next)
    else setInternalSelected(next)
  }
  const totalColCount =
    columns.length + (bulkSelect ? 1 : 0) + (rowActions && rowActions.length > 0 ? 1 : 0)

  return (
    // cm.card() = theme surface + border + radius + shadow (light/dark aware),
    // replacing the old bg-white/rounded-xl/shadow-sm literals. `overflow` has
    // no ClassMap resolver, so it stays inline to clip the rounded corners.
    <div className={cm.cn(cm.card(), className)} style={{ overflow: 'hidden' }}>
      {/* border-collapse has no cm token; inline so the row borders render cleanly. */}
      <table className={cm.cn(cm.w('full'))} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className={cm.cn(cm.surfaceSecondary, cm.textMuted, cm.borderB)}>
            {bulkSelect ? <th className={cm.cn(cm.sp('py', 3), cm.sp('px', 6), cm.w(8))} /> : null}
            {columns.map((col) => (
              <th
                key={col.id}
                className={cm.cn(
                  cm.sp('py', 3),
                  cm.sp('px', 6),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.uppercase,
                  cm.trackingWide,
                  col.align === 'right'
                    ? cm.textRight
                    : col.align === 'center'
                      ? cm.textCenter
                      : '',
                  col.headerClassName,
                )}
              >
                {col.header}
              </th>
            ))}
            {rowActions && rowActions.length > 0 ? (
              <th className={cm.cn(cm.sp('py', 3), cm.sp('px', 6), cm.w(12), cm.textRight)} />
            ) : null}
          </tr>
        </thead>
        {/* Row separators come from cm.tableRow / cm.borderB (theme border), not a light-only divide. */}
        <tbody data-mol-id={tbodyDataMolId}>
          {loading
            ? Array.from({ length: skeletonRowCount }).map((_, i) => (
                <tr key={i} className={cm.cn(cm.borderB)}>
                  {Array.from({ length: totalColCount }).map((__, j) => (
                    <td key={j} className={cm.cn(cm.sp('py', 4), cm.sp('px', 6))}>
                      <div className={cm.cn(cm.h(4), cm.w(24), cm.skeleton())} />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => {
                const id = rowKey(row)
                const isSelected = selected.includes(id)
                return (
                  <tr
                    key={id}
                    data-mol-id={`admin-table-row-${id}`}
                    role={onRowClick ? 'link' : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onRowClick(row)
                            }
                          }
                        : undefined
                    }
                    // cm.tableRow = border-b + transition + theme hover surface.
                    className={cm.cn(cm.tableRow, onRowClick ? cm.tableRowClickable : '')}
                  >
                    {bulkSelect ? (
                      <td className={cm.cn(cm.sp('py', 4), cm.sp('px', 6))}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          data-mol-id={`admin-table-select-${id}`}
                          onChange={(e) => {
                            e.stopPropagation()
                            setSelected(
                              e.target.checked
                                ? [...selected, id]
                                : selected.filter((x) => x !== id),
                            )
                          }}
                          onClick={(e) => e.stopPropagation()}
                          // cm.checkbox() = themed control (border/focus ring), no light-only literals.
                          className={cm.checkbox()}
                        />
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={cm.cn(
                          cm.sp('py', 4),
                          cm.sp('px', 6),
                          col.align === 'right'
                            ? cm.textRight
                            : col.align === 'center'
                              ? cm.textCenter
                              : '',
                          col.className,
                        )}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                    {rowActions && rowActions.length > 0 ? (
                      <td className={cm.cn(cm.sp('py', 4), cm.sp('px', 6), cm.textRight)}>
                        <AdminTableRowActions
                          row={row}
                          actions={rowActions}
                          ariaLabel={rowActionsAriaLabel?.(row) ?? 'Row actions'}
                        />
                      </td>
                    ) : null}
                  </tr>
                )
              })}
        </tbody>
      </table>
      {footer ?? null}
    </div>
  )
}

export default AdminTable
