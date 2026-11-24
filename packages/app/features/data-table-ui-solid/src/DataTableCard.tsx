/**
 * Solid card-shaped data table.
 *
 * Solid counterpart of `@molecule/app-data-table-ui-react`'s `DataTableCard` —
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @module
 */

import { For, type JSX, Show } from 'solid-js'

import { ResolveNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { DataTableCardProps } from './types.js'

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
 * Rows are keyed by `rowKey(row)` (React's `key={rowKey(row)}`): a row keeps its
 * DOM node while its key is unchanged, moves with it on a reorder, and a new key
 * builds a new node.
 *
 * @param props - Component props (see {@link DataTableCardProps}).
 * @returns The rendered data table.
 */
export function DataTableCard<T>(props: DataTableCardProps<T>): JSX.Element {
  const cm = getClassMap()
  /** One stable record per row key, so `<For>` keys rows by key like React. */
  const records = new Map<string, { key: string }>()

  /**
   * The current rows' stable records, in render order.
   *
   * @returns The records for the current `rows`, creating one per new key.
   */
  const keyedRows = (): { key: string }[] => {
    const seen = new Set<string>()
    const ordered: { key: string }[] = []
    for (const row of props.rows) {
      const key = props.rowKey(row)
      seen.add(key)
      const existing = records.get(key)
      if (existing) {
        ordered.push(existing)
      } else {
        const record = { key }
        records.set(key, record)
        ordered.push(record)
      }
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

  return (
    <section
      data-mol-id={props.dataMolId}
      class={cm.cn(cm.stack(4), cm.dataTableCardShell, props.className)}
    >
      <ResolveNode node={props.title}>
        {(title, hasTitle) => (
          <ResolveNode node={props.titleAction}>
            {(titleAction, hasTitleAction) => (
              <Show when={hasTitle() || hasTitleAction()}>
                <div
                  class={cm.cn(
                    cm.flex({ justify: 'between', align: 'center' }),
                    cm.sp('px', 8),
                    cm.sp('pt', 8),
                  )}
                >
                  <Show when={hasTitle()}>
                    <h3
                      class={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.dataTableCardTitle)}
                    >
                      {title()}
                    </h3>
                  </Show>
                  <Show when={hasTitleAction()}>{titleAction()}</Show>
                </div>
              </Show>
            )}
          </ResolveNode>
        )}
      </ResolveNode>
      <div class={cm.dataTableCardScroller}>
        <table class={cm.cn(cm.w('full'), cm.dataTableCardTable)}>
          <thead>
            <tr class={cm.dataTableCardHead}>
              <For each={props.columns}>
                {(column, index) => (
                  <th
                    class={cm.cn(
                      index() === 0 ? cm.sp('px', 8) : cm.sp('px', 4),
                      cm.sp('py', 4),
                      cm.dataTableCardHeaderCell,
                      column.headerClassName,
                    )}
                  >
                    {column.header}
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody class={cm.dataTableCardBody}>
            <Show when={props.loading}>
              <For each={[0, 1, 2, 3, 4]}>
                {() => (
                  <tr aria-hidden="true">
                    <td
                      colSpan={props.columns.length}
                      class={cm.cn(cm.sp('px', 8), cm.sp('py', 5))}
                    >
                      <div class={cm.cn(cm.h(4), cm.dataTableCardSkeletonBar)} />
                    </td>
                  </tr>
                )}
              </For>
            </Show>
            <Show when={!props.loading && props.rows.length === 0}>
              <tr>
                <td
                  colSpan={props.columns.length}
                  class={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 12),
                    cm.textCenter,
                    cm.dataTableCardEmptyCell,
                  )}
                >
                  {props.emptyMessage}
                </td>
              </tr>
            </Show>
            <Show when={!props.loading && props.rows.length > 0}>
              <For each={keyedRows()}>
                {(record) => (
                  <Show when={rowFor(record.key)}>
                    {(row) => (
                      <tr
                        onClick={
                          props.onRowClick ? (): void => props.onRowClick?.(row()) : undefined
                        }
                        class={cm.cn(
                          props.onRowClick ? cm.cursorPointer : '',
                          cm.dataTableCardRowHover,
                        )}
                      >
                        <For each={props.columns}>
                          {(column, index) => (
                            <td
                              class={cm.cn(
                                index() === 0 ? cm.sp('px', 8) : cm.sp('px', 4),
                                cm.sp('py', 5),
                                column.cellClassName,
                              )}
                            >
                              {column.cell(row())}
                            </td>
                          )}
                        </For>
                      </tr>
                    )}
                  </Show>
                )}
              </For>
            </Show>
          </tbody>
        </table>
      </div>
    </section>
  )
}
