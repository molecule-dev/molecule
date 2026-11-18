/**
 * Solid generic admin-style data table with column defs, optional row-click
 * navigation, bulk-select checkboxes, a kebab-menu row-actions column and a
 * loading skeleton.
 *
 * Solid counterpart of `@molecule/app-admin-table-react`'s `AdminTable` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @module
 */

import { createSignal, For, type JSX, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { AdminTableRowActions } from './AdminTableRowActions.jsx'
import type { AdminTableColumn, AdminTableProps, AdminTableRowAction } from './types.js'

/** One row identity record: created once per row key and reused while that key is present. */
interface RowRecord {
  /** The row's key (`rowKey(row)`). */
  key: string
}

/**
 * Solid generic admin-style data table.
 *
 * Rows are keyed by `rowKey(row)` (React's `key={rowKey(row)}`): a row keeps its
 * DOM node while its key is unchanged, moves with it on a reorder, and a new key
 * builds a new node.
 *
 * @param props - Component props (see {@link AdminTableProps}).
 * @returns The rendered admin table.
 */
export function AdminTable<T>(props: AdminTableProps<T>): JSX.Element {
  const cm = getClassMap()
  // Read inside the JSX attribute/text, so the binding re-runs on a locale
  // switch (React's re-render parity).
  const { t } = useTranslation()
  const [internalSelected, setInternalSelected] = createSignal<string[]>([])

  /**
   * The currently selected ids: the controlled prop when a change handler is
   * given, otherwise the internal state (React's `selected`).
   *
   * @returns The selected ids.
   */
  const selected = (): string[] =>
    props.onSelectedIdsChange ? (props.selectedIds ?? []) : internalSelected()

  /**
   * Applies a new selection: reports it in controlled mode, stores it
   * internally otherwise (React's `setSelected`).
   *
   * @param next - The new ids.
   */
  const setSelected = (next: string[]): void => {
    if (props.onSelectedIdsChange) props.onSelectedIdsChange(next)
    else setInternalSelected(next)
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
    setSelected(input.checked ? [...ids, id] : ids.filter((value) => value !== id))
    // React restores a controlled input to its props value after the change.
    if (props.onSelectedIdsChange) input.checked = ids.includes(id)
  }

  /** One stable record per row key, so `<For>` keys rows by key like React. */
  const records = new Map<string, RowRecord>()

  /**
   * The current rows' stable records, in render order.
   *
   * @returns The records for the current `rows`, creating one per new key.
   */
  const keyedRows = (): RowRecord[] => {
    const seen = new Set<string>()
    const ordered: RowRecord[] = []
    for (const row of props.rows) {
      const key = props.rowKey(row)
      seen.add(key)
      let record = records.get(key)
      if (!record) {
        record = { key }
        records.set(key, record)
      }
      ordered.push(record)
    }
    for (const key of [...records.keys()]) if (!seen.has(key)) records.delete(key)
    return ordered
  }

  /**
   * The row a record currently stands for (a row's content stays reactive
   * while its DOM node is kept).
   *
   * @param key - The record's key.
   * @returns The row, or undefined while it is leaving.
   */
  const rowFor = (key: string): T | undefined => props.rows.find((row) => props.rowKey(row) === key)

  /**
   * One cell's class list (React's alignment branch plus the column's own class).
   *
   * @param column - The column.
   * @returns The class string.
   */
  const cellClass = (column: AdminTableColumn<T>): string =>
    cm.cn(
      cm.sp('py', 4),
      cm.sp('px', 6),
      column.align === 'right' ? cm.textRight : column.align === 'center' ? cm.textCenter : '',
      column.className,
    )

  return (
    <div class={cm.cn(cm.card(), props.className)} style={{ overflow: 'hidden' }}>
      <table class={cm.cn(cm.w('full'))} style={{ 'border-collapse': 'collapse' }}>
        <thead>
          <tr class={cm.cn(cm.surfaceSecondary, cm.textMuted, cm.borderB)}>
            <Show when={props.bulkSelect}>
              <th class={cm.cn(cm.sp('py', 3), cm.sp('px', 6), cm.w(8))}>
                {/* The checkbox column has no visible header text; this names it. */}
                <span class={cm.cn(cm.srOnly)}>
                  {t('adminTable.aria.selectColumn', undefined, { defaultValue: 'Select' })}
                </span>
              </th>
            </Show>
            <For each={props.columns}>
              {(column) => (
                <th
                  class={cm.cn(
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
                  )}
                >
                  {column.header}
                </th>
              )}
            </For>
            <Show when={props.rowActions && props.rowActions.length > 0}>
              <th class={cm.cn(cm.sp('py', 3), cm.sp('px', 6), cm.w(12), cm.textRight)}>
                {/* The actions column has no visible header text; this names it. */}
                <span class={cm.cn(cm.srOnly)}>
                  {t('adminTable.aria.actionsColumn', undefined, { defaultValue: 'Actions' })}
                </span>
              </th>
            </Show>
          </tr>
        </thead>
        <tbody data-mol-id={props.tbodyDataMolId}>
          <Show when={props.loading}>
            <For each={Array.from({ length: props.skeletonRowCount ?? 8 })}>
              {(_row, _index) => (
                <tr class={cm.cn(cm.borderB)}>
                  <For
                    each={Array.from({
                      length:
                        props.columns.length +
                        (props.bulkSelect ? 1 : 0) +
                        (props.rowActions && props.rowActions.length > 0 ? 1 : 0),
                    })}
                  >
                    {(_cell, _cellIndex) => (
                      <td class={cm.cn(cm.sp('py', 4), cm.sp('px', 6))}>
                        <div class={cm.cn(cm.h(4), cm.w(24), cm.skeleton())} />
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </Show>
          <Show when={!props.loading}>
            <For each={keyedRows()}>
              {(record) => (
                <Show when={rowFor(record.key)}>
                  {(row) => {
                    const id = (): string => record.key
                    const isSelected = (): boolean => selected().includes(id())
                    return (
                      <tr
                        data-mol-id={`admin-table-row-${id()}`}
                        tabIndex={props.onRowClick ? 0 : undefined}
                        onClick={
                          props.onRowClick ? (): void => props.onRowClick?.(row()) : undefined
                        }
                        onKeyDown={
                          props.onRowClick
                            ? (event: KeyboardEvent): void => {
                                // A key pressed inside a row control (the
                                // checkbox, the actions trigger) belongs to that
                                // control and bubbles here; activate the row
                                // only for its own keys.
                                if (event.target !== event.currentTarget) return
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  props.onRowClick?.(row())
                                }
                              }
                            : undefined
                        }
                        class={cm.cn(cm.tableRow, props.onRowClick ? cm.tableRowClickable : '')}
                      >
                        <Show when={props.bulkSelect}>
                          <td class={cm.cn(cm.sp('py', 4), cm.sp('px', 6))}>
                            <input
                              type="checkbox"
                              aria-label={t('adminTable.aria.selectRow', undefined, {
                                defaultValue: 'Select row',
                              })}
                              ref={(element: HTMLInputElement) => {
                                // React's creation render writes the property AND
                                // the reflected attribute; later renders write the
                                // property only.
                                element.checked = isSelected()
                                if (isSelected()) element.setAttribute('checked', '')
                                else element.removeAttribute('checked')
                              }}
                              checked={isSelected()}
                              data-mol-id={`admin-table-select-${id()}`}
                              on:click={(event: MouseEvent) => {
                                toggle(id(), event.target as HTMLInputElement, event)
                              }}
                              class={cm.checkbox()}
                            />
                          </td>
                        </Show>
                        <For each={props.columns}>
                          {(column) => <td class={cellClass(column)}>{column.render(row())}</td>}
                        </For>
                        <Show when={props.rowActions && props.rowActions.length > 0}>
                          <td class={cm.cn(cm.sp('py', 4), cm.sp('px', 6), cm.textRight)}>
                            <AdminTableRowActions
                              row={row()}
                              actions={props.rowActions as AdminTableRowAction<T>[]}
                              // No label here: the row-actions component falls
                              // back to the translated default
                              // (`adminTable.aria.rowActions`).
                              ariaLabel={props.rowActionsAriaLabel?.(row())}
                            />
                          </td>
                        </Show>
                      </tr>
                    )
                  }}
                </Show>
              )}
            </For>
          </Show>
        </tbody>
      </table>
      {props.footer}
    </div>
  )
}
