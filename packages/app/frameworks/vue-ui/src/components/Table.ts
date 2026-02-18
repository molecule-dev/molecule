/**
 * Vue Table UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeArrayChildren } from 'vue'

import { t } from '@molecule/app-i18n'
import type { Size, TableColumn } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'
import { Spinner } from './Spinner.js'

/**
 * Vue Table UI component with UIClassMap-driven styling.
 */
export const Table = defineComponent({
  name: 'MTable',
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
    bordered: Boolean,
    striped: Boolean,
    hoverable: {
      type: Boolean,
      default: true,
    },
    size: String as PropType<Size>,
    emptyContent: String,
    loading: Boolean,
    sort: Object as PropType<{ key: string; direction: 'asc' | 'desc' }>,
    class: String,
  },
  emits: ['sort', 'row-click'],
  setup(props, { emit, slots }) {
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
    ): unknown => {
      if (column.render) {
        return column.render(row[column.key as string], row, index)
      }
      return row[column.key as string]
    }

    const handleSort = (column: TableColumn<Record<string, unknown>>): void => {
      if (!column.sortable) return

      const key = column.key as string
      const currentDirection = props.sort?.key === key ? props.sort.direction : undefined
      const newDirection = currentDirection === 'asc' ? 'desc' : 'asc'
      emit('sort', key, newDirection)
    }

    return () => {
      const tableClasses = cm.cn(cm.table, props.bordered && cm.tableBordered, props.class)

      return h('div', { class: cm.tableWrapper }, [
        // Loading overlay
        props.loading &&
          h(
            'div',
            {
              class: cm.tableLoadingOverlay,
            },
            h(Spinner, { size: 'lg' }),
          ),

        // Table
        h('table', { class: tableClasses }, [
          // Header
          h(
            'thead',
            { class: cm.tableHeader },
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
                  },
                  [
                    h('div', { class: cm.tableSortWrapper }, [
                      column.header,
                      column.sortable &&
                        props.sort?.key === (column.key as string) &&
                        h(
                          'span',
                          { class: cm.tableSortIcon },
                          props.sort.direction === 'asc'
                            ? renderIcon('chevron-up', cm.iconSm)
                            : renderIcon('chevron-down', cm.iconSm),
                        ),
                    ] as VNodeArrayChildren),
                  ],
                ),
              ),
            ),
          ),

          // Body
          h(
            'tbody',
            { class: cm.tableBody },
            props.data.length === 0
              ? h(
                  'tr',
                  {},
                  h(
                    'td',
                    {
                      colspan: props.columns.length,
                      class: cm.tableEmptyCell,
                    },
                    slots.empty?.() ||
                      props.emptyContent ||
                      t('ui.table.empty', undefined, { defaultValue: 'No data available' }),
                  ),
                )
              : props.data.map((row, rowIndex) =>
                  h(
                    'tr',
                    {
                      key: getRowKey(row, rowIndex),
                      class: cm.cn(
                        cm.tableRow,
                        props.striped && rowIndex % 2 === 1 && cm.tableRowStriped,
                        props.hoverable && cm.tableRowHoverable,
                        cm.tableRowClickable,
                      ),
                      onClick: () => emit('row-click', row, rowIndex),
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
                        [getCellValue(row, column, rowIndex)] as VNodeArrayChildren,
                      ),
                    ),
                  ),
                ),
          ),
        ]),
      ])
    }
  },
})
