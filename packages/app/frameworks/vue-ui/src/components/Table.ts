/**
 * Vue Table UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import { t } from '@molecule/app-i18n'
import type { Size, TableColumn, TableProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, styleOf } from '../utilities/attrs.js'
import { renderIcon } from '../utilities/renderIcon.js'
import { Spinner } from './Spinner.js'

/** VNode children with the empty values that `h()`'s children type excludes. */
type RenderableChild = Exclude<VNodeChild, null | undefined | void>

/**
 * Vue Table UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Table: a wrapper div holding the
 * optional loading overlay (a large Spinner) and the table itself; a column's
 * `render` function (or plain field value) fills each cell, sorting is
 * announced per header through `aria-sort`, and an empty `data` array renders
 * the `emptyContent` node (or the localized empty message) in a full-width
 * cell. Row click (`rowClick`, React's `onRowClick`) receives the row and its
 * index; header click (`sort`, React's `onSort`) receives the column key and
 * the next direction.
 */
export const Table = defineComponent({
  name: 'MTable',
  inheritAttrs: false,
  props: {
    data: {
      type: Array as PropType<Record<string, unknown>[]>,
      required: true,
    },
    columns: {
      type: Array as PropType<TableColumn<Record<string, unknown>>[]>,
      required: true,
    },
    rowKey: [String, Function] as PropType<
      string | ((row: Record<string, unknown>) => string | number)
    >,
    bordered: {
      type: Boolean,
      default: false,
    },
    striped: {
      type: Boolean,
      default: false,
    },
    hoverable: {
      type: Boolean,
      default: true,
    },
    size: String as PropType<Size>,
    emptyContent: null,
    loading: {
      type: Boolean,
      default: false,
    },
    sort: Object as PropType<TableProps<Record<string, unknown>>['sort']>,
    className: String,
    style: [String, Object] as PropType<TableProps<Record<string, unknown>>['style']>,
    testId: String,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()

    const getRowKey = (row: Record<string, unknown>, index: number): string | number => {
      if (typeof props.rowKey === 'function') {
        return props.rowKey(row)
      }
      if (props.rowKey && row[props.rowKey] !== undefined) {
        return row[props.rowKey] as string | number
      }
      return index
    }

    const getCellValue = (
      row: Record<string, unknown>,
      column: TableColumn<Record<string, unknown>>,
      index: number,
    ): RenderableChild => {
      if (column.render) {
        return column.render(row[column.key as string], row, index) as RenderableChild
      }
      return row[column.key as string] as RenderableChild
    }

    // React's `onSort` / `onRowClick` are named props its Table branches on
    // (`rows are clickable` styles only when a handler exists), so the raw
    // handlers are read from the incoming `on*` attrs instead of declared
    // emits — a declared emit strips its listener out of `attrs` and the
    // presence check would never see it.
    const onSort = attrs.onSort as ((key: string, direction: 'asc' | 'desc') => void) | undefined
    const onRowClick = attrs.onRowClick as
      ((row: Record<string, unknown>, index: number) => void) | undefined

    const handleSort = (column: TableColumn<Record<string, unknown>>): void => {
      if (!column.sortable || !onSort) return

      const key = column.key as string
      const currentDirection = props.sort?.key === key ? props.sort.direction : undefined
      const newDirection = currentDirection === 'asc' ? 'desc' : 'asc'
      onSort(key, newDirection)
    }

    return () => {
      const tableClasses = cm.cn(
        cm.table,
        props.bordered && cm.tableBordered,
        ...classOf(props.className, attrs),
      )

      const emptyContent = props.emptyContent ?? slots.emptyContent?.()

      return h('div', { class: cm.tableWrapper }, [
        props.loading && h('div', { class: cm.tableLoadingOverlay }, h(Spinner, { size: 'lg' })),
        h(
          'table',
          {
            class: tableClasses,
            style: styleOf(props.style, attrs),
            'data-testid': props.testId,
          },
          [
            h('thead', { class: cm.tableHeader }, [
              h(
                'tr',
                { class: cm.tableRow },
                props.columns.map((column) =>
                  h(
                    'th',
                    {
                      key: column.key as string,
                      class: cm.cn(
                        cm.tableHead,
                        column.align === 'center' && cm.textCenter,
                        column.align === 'right' && cm.textRight,
                        column.sortable && cm.tableHeadSortable,
                      ),
                      style: { width: column.width },
                      onClick: () => column.sortable && handleSort(column),
                      'aria-sort': column.sortable
                        ? props.sort?.key === (column.key as string)
                          ? props.sort.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                        : undefined,
                    },
                    [
                      h('div', { class: cm.tableSortWrapper }, [
                        column.header as VNodeChild,
                        column.sortable &&
                          props.sort?.key === (column.key as string) &&
                          h(
                            'span',
                            { class: cm.tableSortIcon },
                            props.sort.direction === 'asc'
                              ? renderIcon('chevron-up', cm.iconSm)
                              : renderIcon('chevron-down', cm.iconSm),
                          ),
                      ] as VNodeChild[]),
                    ],
                  ),
                ),
              ),
            ]),
            h(
              'tbody',
              { class: cm.tableBody },
              props.data.length === 0
                ? [
                    h('tr', [
                      h(
                        'td',
                        {
                          colspan: props.columns.length,
                          class: cm.tableEmptyCell,
                        },
                        emptyContent ||
                          t('ui.table.empty', undefined, { defaultValue: 'No data available' }),
                      ),
                    ]),
                  ]
                : props.data.map((row, rowIndex) =>
                    h(
                      'tr',
                      {
                        key: getRowKey(row, rowIndex),
                        class: cm.cn(
                          cm.tableRow,
                          props.striped && rowIndex % 2 === 1 && cm.tableRowStriped,
                          props.hoverable && cm.tableRowHoverable,
                          !!onRowClick && cm.tableRowClickable,
                        ),
                        onClick: () => onRowClick?.(row, rowIndex),
                      },
                      props.columns.map((column) =>
                        h(
                          'td',
                          {
                            key: column.key as string,
                            class: cm.cn(
                              cm.tableCell,
                              column.align === 'center' && cm.textCenter,
                              column.align === 'right' && cm.textRight,
                            ),
                          },
                          getCellValue(row, column, rowIndex),
                        ),
                      ),
                    ),
                  ),
            ),
          ],
        ),
      ])
    }
  },
})
