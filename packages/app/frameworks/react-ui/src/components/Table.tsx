/**
 * Table component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import type { TableColumn, TableProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, ScrollArea, TableBox, TableCell } from '@molecule/app-ui-react/elements'

import { renderIcon } from '../utilities/renderIcon.js'
import { rootProps } from '../utilities/rootProps.js'
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
      emptyContent: emptyContentProp,
      loading,
      sort,
      onSort,
      onRowClick,
      className,
      style,
      testId,
      ...rest
    },
    ref,
  ) => {
    const emptyContent = slot(emptyContentProp as React.ReactNode)
    const { t } = useTranslation()
    const cm = getClassMap()

    const getRowKey = (row: Record<string, unknown>, index: number): string | number => {
      if (typeof rowKey === 'function') {
        return rowKey(row)
      }
      const key = rowKey ? row[rowKey] : undefined
      if (key === undefined) return index
      return typeof key === 'number' ? key : String(key)
    }

    const getCellValue = (
      row: Record<string, unknown>,
      column: TableColumn<Record<string, unknown>>,
      index: number,
    ): React.ReactNode => {
      if (column.render) {
        return column.render(row[column.key], row, index) as React.ReactNode
      }
      return row[column.key] as React.ReactNode
    }

    const handleSort = (column: TableColumn<Record<string, unknown>>): void => {
      if (!column.sortable || !onSort) return

      const key = column.key
      const currentDirection = sort?.key === key ? sort.direction : undefined
      const newDirection = currentDirection === 'asc' ? 'desc' : 'asc'
      onSort(key, newDirection)
    }

    const tableClasses = cm.cn(cm.table, bordered && cm.tableBordered, className)

    return (
      <ScrollArea as="div" direction="horizontal" className={cm.tableWrapper}>
        {loading && (
          <Box as="div" className={cm.tableLoadingOverlay}>
            <Spinner size="lg" />
          </Box>
        )}
        {/* Every other declared prop (id, title, aria-*, data-*, automationId as data-mol-id,
            the DOM event handlers) reaches the table, with its class, style and test id. */}
        <TableBox
          as="table"
          ref={ref}
          className={tableClasses}
          webStyle={style}
          data-testid={testId}
          {...rootProps(rest)}
        >
          <TableBox as="thead" className={cm.tableHeader}>
            <TableBox as="tr" className={cm.tableRow}>
              {columns.map((column) => (
                <TableCell
                  as="th"
                  key={column.key}
                  className={cm.cn(
                    cm.tableHead,
                    column.align === 'center' && cm.textCenter,
                    column.align === 'right' && cm.textRight,
                    column.sortable && cm.tableHeadSortable,
                  )}
                  webStyle={{ width: column.width }}
                  onClick={column.sortable && onSort ? () => handleSort(column) : undefined}
                  aria-sort={
                    column.sortable
                      ? sort?.key === column.key
                        ? sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                >
                  <Box as="div" className={cm.tableSortWrapper}>
                    {column.header as React.ReactNode}
                    {column.sortable && sort?.key === column.key && (
                      <Box as="span" className={cm.tableSortIcon}>
                        {sort.direction === 'asc'
                          ? renderIcon('chevron-up', cm.iconSm)
                          : renderIcon('chevron-down', cm.iconSm)}
                      </Box>
                    )}
                  </Box>
                </TableCell>
              ))}
            </TableBox>
          </TableBox>
          <TableBox as="tbody" className={cm.tableBody}>
            {data.length === 0 ? (
              <TableBox as="tr">
                <TableCell as="td" colSpan={columns.length} className={cm.tableEmptyCell}>
                  {emptyContent ||
                    t('ui.table.empty', undefined, { defaultValue: 'No data available' })}
                </TableCell>
              </TableBox>
            ) : (
              data.map((row, rowIndex) => (
                <TableBox
                  as="tr"
                  key={getRowKey(row, rowIndex)}
                  className={cm.cn(
                    cm.tableRow,
                    striped && rowIndex % 2 === 1 && cm.tableRowStriped,
                    hoverable && cm.tableRowHoverable,
                    onRowClick && cm.tableRowClickable,
                  )}
                  onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
                >
                  {columns.map((column) => (
                    <TableCell
                      as="td"
                      key={column.key}
                      className={cm.cn(
                        cm.tableCell,
                        column.align === 'center' && cm.textCenter,
                        column.align === 'right' && cm.textRight,
                      )}
                    >
                      {getCellValue(row, column, rowIndex)}
                    </TableCell>
                  ))}
                </TableBox>
              ))
            )}
          </TableBox>
        </TableBox>
      </ScrollArea>
    )
  },
)

Table.displayName = 'Table'
