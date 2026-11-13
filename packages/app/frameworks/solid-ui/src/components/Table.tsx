/**
 * Table component.
 *
 * @module
 */

import { type Component, For, type JSX, Show, splitProps } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import type { TableColumn, TableProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { createKeyedList } from '../utilities/keyedList.js'
import { renderIcon } from '../utilities/renderIcon.jsx'
import { Spinner } from './Spinner.jsx'

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
  const { t } = useTranslation()
  const hoverable = (): boolean => local.hoverable ?? true

  // The key React reconciles a row with (`key={getRowKey(row, rowIndex)}`):
  // the `rowKey` function, the `rowKey` field, or the index when there is
  // neither. An index key is unchanged by any update that keeps the list's
  // shape, so the row nodes stay in place while their content updates.
  const getRowKey = (row: Record<string, unknown>, index: number): string | number => {
    if (typeof local.rowKey === 'function') {
      return local.rowKey(row)
    }
    if (local.rowKey && row[local.rowKey] !== undefined) {
      return row[local.rowKey] as string | number
    }
    return index
  }

  // React keeps a row/column's DOM node while its key is unchanged and moves
  // it on a reorder; `<For>` keys by object identity, so the render iterates
  // the KEYS instead and reads each item through the lookup.
  const rows = createKeyedList(() => local.data, getRowKey)
  const cols = createKeyedList(
    () => local.columns,
    (column) => column.key as string,
  )

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

  const tableClasses = (): string =>
    cm.cn(cm.table, local.bordered && cm.tableBordered, local.className)

  return (
    <div class={cm.tableWrapper}>
      <Show when={local.loading}>
        <div class={cm.tableLoadingOverlay}>
          <Spinner size="lg" />
        </div>
      </Show>
      <table class={tableClasses()} style={toStyleProps(local.style)} data-testid={local.testId}>
        <thead class={cm.tableHeader}>
          <tr class={cm.tableRow}>
            <For each={cols.keys()}>
              {(columnKey) => {
                const column = (): TableColumn<Record<string, unknown>> => cols.get(columnKey)!
                return (
                  <th
                    class={cm.cn(
                      cm.tableHead,
                      column().align === 'center' && cm.textCenter,
                      column().align === 'right' && cm.textRight,
                      column().sortable && cm.tableHeadSortable,
                    )}
                    style={toStyleProps({ width: column().width })}
                    onClick={() => column().sortable && handleSort(column())}
                    aria-sort={
                      column().sortable
                        ? local.sort?.key === (column().key as string)
                          ? local.sort.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                        : undefined
                    }
                  >
                    <div class={cm.tableSortWrapper}>
                      {column().header as JSX.Element}
                      <Show
                        when={column().sortable && local.sort?.key === (column().key as string)}
                      >
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
                )
              }}
            </For>
          </tr>
        </thead>
        <tbody class={cm.tableBody}>
          <Show
            when={local.data.length > 0}
            fallback={
              <tr>
                <td colSpan={local.columns.length} class={cm.tableEmptyCell}>
                  {(local.emptyContent as JSX.Element) ||
                    t('ui.table.empty', undefined, { defaultValue: 'No data available' })}
                </td>
              </tr>
            }
          >
            <For each={rows.keys()}>
              {(rowKey, rowIndex) => {
                const row = (): Record<string, unknown> => rows.get(rowKey)!
                return (
                  <tr
                    class={cm.cn(
                      cm.tableRow,
                      local.striped && rowIndex() % 2 === 1 && cm.tableRowStriped,
                      hoverable() && cm.tableRowHoverable,
                      local.onRowClick && cm.tableRowClickable,
                    )}
                    onClick={() => local.onRowClick?.(row(), rowIndex())}
                  >
                    <For each={cols.keys()}>
                      {(columnKey) => {
                        const column = (): TableColumn<Record<string, unknown>> =>
                          cols.get(columnKey)!
                        return (
                          <td
                            class={cm.cn(
                              cm.tableCell,
                              column().align === 'center' && cm.textCenter,
                              column().align === 'right' && cm.textRight,
                            )}
                          >
                            {getCellValue(row(), column(), rowIndex()) as JSX.Element}
                          </td>
                        )
                      }}
                    </For>
                  </tr>
                )
              }}
            </For>
          </Show>
        </tbody>
      </table>
    </div>
  )
}
