/**
 * Vue generic admin-style data table with column defs, optional row-click
 * navigation, bulk-select checkboxes, a kebab-menu row-actions column and a
 * loading skeleton.
 *
 * Vue counterpart of `@molecule/app-admin-table-react`'s `AdminTable` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input. Node-valued props (`footer`) arrive as a prop or as the
 * same-named slot; both work.
 *
 * @module
 */

import {
  defineComponent,
  h,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  withDirectives,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { AdminTableRowActions } from './AdminTableRowActions.js'
import { vControlledChecked } from './checked.js'
import type { AdminTableColumn, AdminTableRowAction } from './types.js'

/** Any row shape, as the component is generic over it. */
type AnyRow = unknown

/** A column set over an untyped row, so any caller's columns fit. */
type ColumnSet = AdminTableColumn<AnyRow>[]

/** An action set over an untyped row, so any caller's actions fit. */
type ActionSet = AdminTableRowAction<AnyRow>[]

/**
 * Calls a row function (`rowKey`, `rowActionsAriaLabel`, `onRowClick`) with the
 * row it belongs to.
 *
 * @param fn - The caller's function.
 * @param row - The row.
 * @returns Whatever the function returns.
 */
const call = <R>(fn: (row: AnyRow) => R, row: unknown): R => (fn as (r: unknown) => R)(row)

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
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
  return prop !== undefined && prop !== null ? [prop] : []
}

/**
 * Generic admin-style data table.
 *
 * @param props - Component props (see {@link AdminTableProps}).
 * @returns The admin table component.
 */
export const AdminTable = defineComponent({
  name: 'AdminTable',
  // As in React (which never spreads unknown props onto an element): a prop
  // this component does not declare must not leak onto the wrapper as an
  // attribute.
  inheritAttrs: false,
  props: {
    rows: { type: Array as PropType<unknown[]>, required: true },
    columns: { type: Array as PropType<ColumnSet>, required: true },
    rowKey: { type: Function as PropType<(row: AnyRow) => string>, required: true },
    loading: { type: Boolean, default: false },
    skeletonRowCount: { type: Number, default: 8 },
    onRowClick: {
      type: Function as PropType<((row: AnyRow) => void) | undefined>,
      default: undefined,
    },
    bulkSelect: { type: Boolean, default: false },
    selectedIds: { type: Array as PropType<string[]>, default: () => [] },
    onSelectedIdsChange: {
      type: Function as PropType<((ids: string[]) => void) | undefined>,
      default: undefined,
    },
    rowActions: { type: Array as PropType<ActionSet | undefined>, default: undefined },
    rowActionsAriaLabel: {
      type: Function as PropType<((row: AnyRow) => string) | undefined>,
      default: undefined,
    },
    // Node-valued: `null` accepts any runtime type (a VNode or text), the way
    // Vue declares a slot-ish prop.
    footer: null,
    className: String,
    tbodyDataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const internalSelected = ref<string[]>([])

    /**
     * The currently selected ids: the controlled prop when a change handler is
     * given, otherwise the internal state (React's `selected`).
     *
     * @returns The selected ids.
     */
    const selected = (): string[] =>
      props.onSelectedIdsChange ? props.selectedIds : internalSelected.value

    /**
     * Applies a new selection: reports it in controlled mode, stores it
     * internally otherwise (React's `setSelected`).
     *
     * @param next - The new ids.
     */
    const setSelected = (next: string[]): void => {
      if (props.onSelectedIdsChange) props.onSelectedIdsChange(next)
      else internalSelected.value = next
    }

    /**
     * Toggles one row's checkbox from a click, as React's controlled-input
     * `onChange` does — and, like React, restores the box in controlled mode
     * when the props do not change.
     *
     * @param id - The row key.
     * @param input - The checkbox.
     * @param event - The click event.
     */
    const toggle = (id: string, input: HTMLInputElement, event: MouseEvent): void => {
      event.stopPropagation()
      const ids = selected()
      const next = input.checked ? [...ids, id] : ids.filter((value) => value !== id)
      setSelected(next)
      // React restores a controlled input to its props value after the change.
      if (props.onSelectedIdsChange) input.checked = ids.includes(id)
    }

    return (): VNode => {
      const onRowClick = props.onRowClick
      const actions = props.rowActions
      const hasActions = !!actions && actions.length > 0
      const totalColCount = props.columns.length + (props.bulkSelect ? 1 : 0) + (hasActions ? 1 : 0)
      const ids = selected()

      const headerCells: VNodeChild[] = props.columns.map((column) =>
        h(
          'th',
          {
            key: column.id,
            class: cm.cn(
              cm.sp('py', 3),
              cm.sp('px', 6),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.uppercase,
              cm.trackingWide,
              column.align === 'right'
                ? cm.textRight
                : column.align === 'center'
                  ? cm.textCenter
                  : '',
              column.headerClassName,
            ),
          },
          [column.header],
        ),
      )

      const body: VNodeChild[] = props.loading
        ? Array.from({ length: props.skeletonRowCount }, (_unused, index) =>
            h(
              'tr',
              { key: index, class: cm.cn(cm.borderB) },
              Array.from({ length: totalColCount }, (_cell, cellIndex) =>
                h('td', { key: cellIndex, class: cm.cn(cm.sp('py', 4), cm.sp('px', 6)) }, [
                  h('div', { class: cm.cn(cm.h(4), cm.w(24), cm.skeleton()) }),
                ]),
              ),
            ),
          )
        : props.rows.map((row) => {
            const id = call(props.rowKey, row)
            const isSelected = ids.includes(id)
            const cells: VNodeChild[] = []
            if (props.bulkSelect) {
              cells.push(
                h('td', { key: '__select', class: cm.cn(cm.sp('py', 4), cm.sp('px', 6)) }, [
                  withDirectives(
                    h('input', {
                      type: 'checkbox',
                      'aria-label': t('adminTable.aria.selectRow', undefined, {
                        defaultValue: 'Select row',
                      }),
                      'data-mol-id': `admin-table-select-${id}`,
                      onClick: (event: MouseEvent) => {
                        toggle(id, event.currentTarget as HTMLInputElement, event)
                      },
                      class: cm.checkbox(),
                    }),
                    [[vControlledChecked, isSelected]],
                  ),
                ]),
              )
            }
            for (const column of props.columns) {
              cells.push(
                h(
                  'td',
                  {
                    key: column.id,
                    class: cm.cn(
                      cm.sp('py', 4),
                      cm.sp('px', 6),
                      column.align === 'right'
                        ? cm.textRight
                        : column.align === 'center'
                          ? cm.textCenter
                          : '',
                      column.className,
                    ),
                  },
                  [column.render(row)],
                ),
              )
            }
            if (hasActions) {
              cells.push(
                h(
                  'td',
                  { key: '__actions', class: cm.cn(cm.sp('py', 4), cm.sp('px', 6), cm.textRight) },
                  [
                    h(AdminTableRowActions, {
                      row,
                      actions,
                      // No label here: the row-actions component falls back to
                      // the translated default (`adminTable.aria.rowActions`).
                      ariaLabel: props.rowActionsAriaLabel
                        ? call(props.rowActionsAriaLabel, row)
                        : undefined,
                    }),
                  ],
                ),
              )
            }
            return h(
              'tr',
              {
                key: id,
                'data-mol-id': `admin-table-row-${id}`,
                tabIndex: onRowClick ? 0 : undefined,
                onClick: onRowClick ? (): void => call(onRowClick, row) : undefined,
                onKeydown: onRowClick
                  ? (event: KeyboardEvent): void => {
                      // A key pressed inside a row control (the checkbox, the
                      // actions trigger) belongs to that control and bubbles
                      // here; activate the row only for its own keys.
                      if (event.target !== event.currentTarget) return
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        call(onRowClick, row)
                      }
                    }
                  : undefined,
                class: cm.cn(cm.tableRow, onRowClick ? cm.tableRowClickable : ''),
              },
              cells,
            )
          })

      return h(
        'div',
        {
          class: cm.cn(cm.card(), props.className),
          style: { overflow: 'hidden' },
        },
        [
          h('table', { class: cm.cn(cm.w('full')), style: { borderCollapse: 'collapse' } }, [
            h('thead', null, [
              h('tr', { class: cm.cn(cm.surfaceSecondary, cm.textMuted, cm.borderB) }, [
                ...(props.bulkSelect
                  ? [
                      h('th', { class: cm.cn(cm.sp('py', 3), cm.sp('px', 6), cm.w(8)) }, [
                        // The checkbox column has no visible header text; this names it.
                        h('span', { class: cm.cn(cm.srOnly) }, [
                          t('adminTable.aria.selectColumn', undefined, { defaultValue: 'Select' }),
                        ]),
                      ]),
                    ]
                  : []),
                ...headerCells,
                ...(hasActions
                  ? [
                      h(
                        'th',
                        {
                          class: cm.cn(cm.sp('py', 3), cm.sp('px', 6), cm.w(12), cm.textRight),
                        },
                        [
                          // The actions column has no visible header text; this names it.
                          h('span', { class: cm.cn(cm.srOnly) }, [
                            t('adminTable.aria.actionsColumn', undefined, {
                              defaultValue: 'Actions',
                            }),
                          ]),
                        ],
                      ),
                    ]
                  : []),
              ]),
            ]),
            h('tbody', { 'data-mol-id': props.tbodyDataMolId }, body),
          ]),
          ...slotOrProp(slots.footer, props.footer),
        ],
      )
    }
  },
})
