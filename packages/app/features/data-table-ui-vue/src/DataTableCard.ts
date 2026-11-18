/**
 * Vue card-shaped data table.
 *
 * Vue counterpart of `@molecule/app-data-table-ui-react`'s `DataTableCard` —
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { DataTableColumn } from './types.js'

/** A row-key function, declared with a `never` parameter so any `(row: Row) => string` fits. */
type RowKey = (row: never) => string

/** A row-click handler, declared with a `never` parameter so any `(row: Row) => void` fits. */
type RowClick = (row: never) => void

/** The props a node-valued field accepts as a plain string, so text is not type-checked away. */
const NODE_PROP = [Object, String] as PropType<VNodeChild>

/**
 * Calls the caller's row-key function with the row it belongs to.
 *
 * @param rowKey - The caller's function.
 * @param row - The row.
 * @returns The row's key.
 */
const keyOf = (rowKey: RowKey, row: unknown): string => (rowKey as (value: unknown) => string)(row)

/**
 * Calls the caller's row-click handler with the clicked row.
 *
 * @param onRowClick - The caller's handler.
 * @param row - The row.
 */
const clickRow = (onRowClick: RowClick, row: unknown): void =>
  (onRowClick as (value: unknown) => void)(row)

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and a value Vue renders as nothing (`undefined`, `null`, `''`,
 * `false`) contributes no node.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  if (prop === undefined || prop === null || prop === '' || prop === false) return []
  return [prop]
}

/**
 * Drop-in card-shaped data table matching the polished flagship pattern.
 *
 * Renders:
 * 1. Optional title + action row
 * 2. Card-wrapped table with:
 *    - `bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm` outer
 *    - `bg-surface-container-low border-b border-outline-variant/10` thead
 *    - `text-[10px] font-black text-on-surface-variant uppercase tracking-widest` th
 *    - `divide-y divide-surface-container` tbody
 *    - `hover:bg-surface-container-low transition-colors` rows (when `onRowClick` provided)
 *    - 5-row pulsing skeleton when `loading`
 *    - Single full-width cell with `emptyMessage` when empty
 *
 * For complex per-column rendering, pass cells that compose a status badge, an
 * avatar, and so on.
 *
 * @param props - Component props (see `DataTableCardProps`).
 * @returns The data table component.
 */
export const DataTableCard = defineComponent({
  name: 'DataTableCard',
  props: {
    /** Optional title above the table chrome (a node may arrive as the `title` slot). */
    title: { type: NODE_PROP, default: undefined },
    /** Right-aligned action in the title row (a node may arrive as the `titleAction` slot). */
    titleAction: { type: NODE_PROP, default: undefined },
    /** Column definitions. */
    columns: {
      type: Array as PropType<ReadonlyArray<DataTableColumn<unknown>>>,
      required: true,
    },
    /** Rows to render. */
    rows: { type: Array as PropType<ReadonlyArray<unknown>>, required: true },
    /** Pull a stable key from a row. */
    rowKey: { type: Function as PropType<RowKey>, required: true },
    /** When true, renders 5 skeleton rows instead of `rows`. */
    loading: { type: Boolean, default: false },
    /** Optional click handler per row. */
    onRowClick: { type: Function as PropType<RowClick | undefined>, default: undefined },
    /** Empty-state content (a node may arrive as the `emptyMessage` slot). */
    emptyMessage: { type: NODE_PROP, default: undefined },
    /** Extra classes on the outer card. */
    className: { type: String as PropType<string | undefined>, default: undefined },
    /** `data-mol-id` for AI-agent selectors. */
    dataMolId: { type: String as PropType<string | undefined>, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const onRowClick = props.onRowClick
      const titleShown = props.title !== undefined || Boolean(slots.title)
      const headerShown =
        titleShown || props.titleAction !== undefined || Boolean(slots.titleAction)

      const headerRow = headerShown
        ? h(
            'div',
            {
              class: cm.cn(
                cm.flex({ justify: 'between', align: 'center' }),
                cm.sp('px', 8),
                cm.sp('pt', 8),
              ),
            },
            [
              ...(titleShown
                ? [
                    h(
                      'h3',
                      {
                        class: cm.cn(
                          cm.textSize('xl'),
                          cm.fontWeight('bold'),
                          cm.dataTableCardTitle,
                        ),
                      },
                      slotOrProp(slots.title, props.title),
                    ),
                  ]
                : []),
              ...slotOrProp(slots.titleAction, props.titleAction),
            ],
          )
        : undefined

      const body: VNodeChild[] = props.loading
        ? Array.from({ length: 5 }, (_unused, index) =>
            h('tr', { key: `skeleton-${index}`, 'aria-hidden': 'true' }, [
              h(
                'td',
                {
                  colSpan: props.columns.length,
                  class: cm.cn(cm.sp('px', 8), cm.sp('py', 5)),
                },
                [h('div', { class: cm.cn(cm.h(4), cm.dataTableCardSkeletonBar) })],
              ),
            ]),
          )
        : props.rows.length === 0
          ? [
              h('tr', null, [
                h(
                  'td',
                  {
                    colSpan: props.columns.length,
                    class: cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 12),
                      cm.textCenter,
                      cm.dataTableCardEmptyCell,
                    ),
                  },
                  slotOrProp(slots.emptyMessage, props.emptyMessage),
                ),
              ]),
            ]
          : props.rows.map((row) =>
              h(
                'tr',
                {
                  key: keyOf(props.rowKey, row),
                  onClick: onRowClick ? (): void => clickRow(onRowClick, row) : undefined,
                  class: cm.cn(onRowClick ? cm.cursorPointer : '', cm.dataTableCardRowHover),
                },
                props.columns.map((column, index) =>
                  h(
                    'td',
                    {
                      key: column.key,
                      class: cm.cn(
                        index === 0 ? cm.sp('px', 8) : cm.sp('px', 4),
                        cm.sp('py', 5),
                        column.cellClassName,
                      ),
                    },
                    [column.cell(row)],
                  ),
                ),
              ),
            )

      return h(
        'section',
        {
          'data-mol-id': props.dataMolId,
          class: cm.cn(cm.stack(4), cm.dataTableCardShell, props.className),
        },
        [
          ...(headerRow ? [headerRow] : []),
          h('div', { class: cm.dataTableCardScroller }, [
            h('table', { class: cm.cn(cm.w('full'), cm.dataTableCardTable) }, [
              h('thead', null, [
                h(
                  'tr',
                  { class: cm.dataTableCardHead },
                  props.columns.map((column, index) =>
                    h(
                      'th',
                      {
                        key: column.key,
                        class: cm.cn(
                          index === 0 ? cm.sp('px', 8) : cm.sp('px', 4),
                          cm.sp('py', 4),
                          cm.dataTableCardHeaderCell,
                          column.headerClassName,
                        ),
                      },
                      [column.header],
                    ),
                  ),
                ),
              ]),
              h('tbody', { class: cm.dataTableCardBody }, body),
            ]),
          ]),
        ],
      )
    }
  },
})
