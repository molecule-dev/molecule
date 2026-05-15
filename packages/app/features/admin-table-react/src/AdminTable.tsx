/**
 * `<AdminTable>` — generic data table with column defs, optional
 * row-click navigation, bulk-select checkboxes, kebab-menu row actions,
 * and a loading skeleton.
 *
 * @module
 */

import { getClassMap } from '@molecule/app-ui'
import { type ReactNode, useState } from 'react'

import { AdminTableRowActions } from './AdminTableRowActions.js'
import type { AdminTableColumn, AdminTableRowAction } from './types.js'

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
  selectedIds?: string[]
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
}: AdminTableProps<T>) {
  const cm = getClassMap()
  const [internalSelected, setInternalSelected] = useState<string[]>([])
  const selected = onSelectedIdsChange ? selectedIds : internalSelected
  const setSelected = (next: string[]) => {
    if (onSelectedIdsChange) onSelectedIdsChange(next)
    else setInternalSelected(next)
  }
  const totalColCount =
    columns.length + (bulkSelect ? 1 : 0) + (rowActions && rowActions.length > 0 ? 1 : 0)

  return (
    <div className={cm.cn('bg-white rounded-xl shadow-sm overflow-hidden', className)}>
      <table className={cm.cn(cm.w('full'), 'text-left border-collapse')}>
        <thead>
          <tr className={cm.cn('bg-slate-50 text-slate-600')}>
            {bulkSelect ? (
              <th className={cm.cn(cm.sp('py', 3), cm.sp('px', 6), 'w-8 text-left')} />
            ) : null}
            {columns.map((col) => (
              <th
                key={col.id}
                className={cm.cn(
                  cm.sp('py', 3),
                  cm.sp('px', 6),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-wide',
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
              <th className={cm.cn(cm.sp('py', 3), cm.sp('px', 6), 'w-12 text-right')} />
            ) : null}
          </tr>
        </thead>
        <tbody className={cm.cn('divide-y divide-slate-100')} data-mol-id={tbodyDataMolId}>
          {loading
            ? Array.from({ length: skeletonRowCount }).map((_, i) => (
                <tr key={i} className={cm.cn('animate-pulse')}>
                  {Array.from({ length: totalColCount }).map((__, j) => (
                    <td key={j} className={cm.cn(cm.sp('py', 4), cm.sp('px', 6))}>
                      <div className={cm.cn(cm.h(4), 'w-24 bg-gray-200 rounded')} />
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
                    className={cm.cn(
                      'hover:bg-slate-50 transition-colors',
                      onRowClick ? 'cursor-pointer' : '',
                    )}
                  >
                    {bulkSelect ? (
                      <td className={cm.cn(cm.sp('py', 4), cm.sp('px', 6))}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation()
                            setSelected(
                              e.target.checked
                                ? [...selected, id]
                                : selected.filter((x) => x !== id),
                            )
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={cm.cn(
                            cm.input(),
                            'rounded border-gray-300 text-green-600 focus:ring-green-500',
                          )}
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
