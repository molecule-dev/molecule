/**
 * Table component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import type { ElementHandle, TableColumn, TableProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { KitComponent, KitHosts } from '../hosts.js'
import { renderNode } from '../utilities/renderNode.js'
import { rootProps } from '../utilities/rootProps.js'
import { createSpinner } from './Spinner.js'

/**
 * Table component.
 */
export function createTable(
  hosts: Pick<
    KitHosts,
    | 'Box'
    | 'ScrollArea'
    | 'TableBox'
    | 'TableCell'
    | 'TableRows'
    | 'Text'
    | 'renderIcon'
    | 'LoadingSpinner'
  >,
): KitComponent<TableProps<Record<string, unknown>>> {
  const { Box, ScrollArea, TableBox, TableCell, TableRows, Text, renderIcon } = hosts
  const Spinner = hosts.LoadingSpinner ?? createSpinner({ Box, Text })
  const Table = forwardRef<ElementHandle, TableProps<Record<string, unknown>>>(
    (
      {
        data = [],
        columns = [],
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
      const emptyContent = slot(renderNode(emptyContentProp))
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
          return renderNode(column.render(row[column.key], row, index))
        }
        return renderNode(row[column.key])
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
                      {renderNode(column.header)}
                      {column.sortable && sort?.key === column.key && (
                        <Box as="span" className={cm.tableSortIcon}>
                          {sort.direction === 'asc'
                            ? renderIcon('chevron-up', cm.iconSm, 'sort')
                            : renderIcon('chevron-down', cm.iconSm, 'sort')}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                ))}
              </TableBox>
            </TableBox>
            <TableBox as="tbody" className={cm.tableBody}>
              <TableRows
                data={data}
                rowKey={getRowKey}
                empty={
                  <TableBox as="tr">
                    <TableCell as="td" colSpan={columns.length} className={cm.tableEmptyCell}>
                      {emptyContent ||
                        t('ui.table.empty', undefined, { defaultValue: 'No data available' })}
                    </TableCell>
                  </TableBox>
                }
                renderRow={(row, rowIndex) => (
                  <TableBox
                    as="tr"
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
                )}
              />
            </TableBox>
          </TableBox>
        </ScrollArea>
      )
    },
  )

  Table.displayName = 'Table'
  return Table
}
