/**
 * Table component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { t } from '@molecule/app-i18n'
import type { TableColumn, TableProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'
import { Spinner } from './Spinner.js'

/**
 * Table component.
 */
export const Table = forwardRef<HTMLTableElement, TableProps<Record<string, unknown>>>(
  (
    {
      data,
      columns,
      rowKey,
      bordered,
      striped,
      hoverable = true,
      size: _size,
      emptyContent,
      loading,
      sort,
      onSort,
      onRowClick,
      className,
      style,
      testId,
    },
    ref,
  ) => {
    const cm = getClassMap()

    const getRowKey = (row: Record<string, unknown>, index: number): string | number => {
      if (typeof rowKey === 'function') {
        return rowKey(row)
      }
      if (rowKey && row[rowKey] !== undefined) {
        return row[rowKey] as string | number
      }
      return index
    }

    const getCellValue = (
      row: Record<string, unknown>,
      column: TableColumn<Record<string, unknown>>,
      index: number,
    ): React.ReactNode => {
      if (column.render) {
        return column.render(row[column.key as string], row, index) as React.ReactNode
      }
      return row[column.key as string] as React.ReactNode
    }

    const handleSort = (column: TableColumn<Record<string, unknown>>): void => {
      if (!column.sortable || !onSort) return

      const key = column.key as string
      const currentDirection = sort?.key === key ? sort.direction : undefined
      const newDirection = currentDirection === 'asc' ? 'desc' : 'asc'
      onSort(key, newDirection)
    }

    const tableClasses = cm.cn(cm.table, bordered && cm.tableBordered, className)

    return (
      <div className={cm.tableWrapper}>
        {loading && (
          <div className={cm.tableLoadingOverlay}>
            <Spinner size="lg" />
          </div>
        )}
        <table ref={ref} className={tableClasses} style={style} data-testid={testId}>
          <thead className={cm.tableHeader}>
            <tr className={cm.tableRow}>
              {columns.map((column) => (
                <th
                  key={column.key as string}
                  className={cm.cn(
                    cm.tableHead,
                    column.align === 'center' && cm.textCenter,
                    column.align === 'right' && cm.textRight,
                    column.sortable && cm.tableHeadSortable,
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column)}
                >
                  <div className={cm.tableSortWrapper}>
                    {column.header as React.ReactNode}
                    {column.sortable && sort?.key === (column.key as string) && (
                      <span className={cm.tableSortIcon}>
                        {sort.direction === 'asc'
                          ? renderIcon('chevron-up', cm.iconSm)
                          : renderIcon('chevron-down', cm.iconSm)}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cm.tableBody}>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={cm.tableEmptyCell}>
                  {(emptyContent as React.ReactNode) ||
                    t('ui.table.empty', undefined, { defaultValue: 'No data available' })}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={getRowKey(row, rowIndex)}
                  className={cm.cn(
                    cm.tableRow,
                    striped && rowIndex % 2 === 1 && cm.tableRowStriped,
                    hoverable && cm.tableRowHoverable,
                    onRowClick && cm.tableRowClickable,
                  )}
                  onClick={() => onRowClick?.(row, rowIndex)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key as string}
                      className={cm.cn(
                        cm.tableCell,
                        column.align === 'center' && cm.textCenter,
                        column.align === 'right' && cm.textRight,
                      )}
                    >
                      {getCellValue(row, column, rowIndex) as React.ReactNode}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  },
)

Table.displayName = 'Table'
