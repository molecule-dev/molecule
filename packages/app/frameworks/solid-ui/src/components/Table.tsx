/**
 * Table component.
 *
 * @module
 */

import { type Component, For, type JSX, Show, splitProps } from 'solid-js'

import { t } from '@molecule/app-i18n'
import type { TableColumn,TableProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'
import { Spinner } from './Spinner.js'

/**
 * Table component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Table: Component<TableProps<Record<string, unknown>>> = (props) => {
  const [local] = splitProps(props, [
    'data',
    'columns',
    'rowKey',
    'bordered',
    'striped',
    'hoverable',
    'size',
    'emptyContent',
    'loading',
    'sort',
    'onSort',
    'onRowClick',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const hoverable = (): boolean => local.hoverable ?? true

  const getCellValue = (
    row: Record<string, unknown>,
    column: TableColumn<Record<string, unknown>>,
    index: number,
  ): unknown => {
    if (column.render) {
      return column.render(row[column.key as string], row, index)
    }
    return row[column.key as string]
  }

  const handleSort = (column: TableColumn<Record<string, unknown>>): void => {
    if (!column.sortable || !local.onSort) return

    const key = column.key as string
    const currentDirection = local.sort?.key === key ? local.sort.direction : undefined
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc'
    local.onSort(key, newDirection)
  }

  const tableClasses = (): string => cm.cn(cm.table, local.bordered && cm.tableBordered, local.className)

  return (
    <div class={cm.tableWrapper}>
      <Show when={local.loading}>
        <div class={cm.tableLoadingOverlay}>
          <Spinner size="lg" />
        </div>
      </Show>
      <table class={tableClasses()} style={local.style} data-testid={local.testId}>
        <thead class={cm.tableHeader}>
          <tr class={cm.tableRow}>
            <For each={local.columns}>
              {(column) => (
                <th
                  class={cm.cn(
                    cm.tableHead,
                    column.align === 'center' && cm.textCenter,
                    column.align === 'right' && cm.textRight,
                    column.sortable && cm.tableHeadSortable,
                  )}
                  style={{ width: typeof column.width === 'number' ? `${column.width}px` : column.width }}
                  onClick={() => column.sortable && handleSort(column)}
                >
                  <div class={cm.tableSortWrapper}>
                    {column.header as JSX.Element}
                    <Show when={column.sortable && local.sort?.key === (column.key as string)}>
                      <span class={cm.tableSortIcon}>
                        <Show
                          when={local.sort!.direction === 'asc'}
                          fallback={renderIcon('chevron-down', cm.iconSm)}
                        >
                          {renderIcon('chevron-up', cm.iconSm)}
                        </Show>
                      </span>
                    </Show>
                  </div>
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody class={cm.tableBody}>
          <Show
            when={local.data.length > 0}
            fallback={
              <tr>
                <td
                  colSpan={local.columns.length}
                  class={cm.tableEmptyCell}
                >
                  {(local.emptyContent as JSX.Element) || t('ui.table.empty', undefined, { defaultValue: 'No data available' })}
                </td>
              </tr>
            }
          >
            <For each={local.data}>
              {(row, rowIndex) => (
                <tr
                  class={cm.cn(
                    cm.tableRow,
                    local.striped && rowIndex() % 2 === 1 && cm.tableRowStriped,
                    hoverable() && cm.tableRowHoverable,
                    local.onRowClick && cm.tableRowClickable,
                  )}
                  onClick={() => local.onRowClick?.(row, rowIndex())}
                >
                  <For each={local.columns}>
                    {(column) => (
                      <td
                        class={cm.cn(
                          cm.tableCell,
                          column.align === 'center' && cm.textCenter,
                          column.align === 'right' && cm.textRight,
                        )}
                      >
                        {getCellValue(row, column, rowIndex()) as JSX.Element}
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  )
}
