// @vitest-environment jsdom
/**
 * The Solid harness for the sortable-list conformance suite: it renders the
 * binding's `SortableList` with one row per item, the way a Solid app does.
 *
 * @module
 */

import { For } from 'solid-js'
import { render } from 'solid-js/web'

import type {
  ConformanceItem,
  ConformanceListProps,
} from '@molecule/app-framework-conformance/drag-drop'
import { describeSortableListConformance } from '@molecule/app-framework-conformance/drag-drop'

import { SortableList, useSortableItem } from '../index.js'

/**
 * One row of the conformance list.
 *
 * @param props - The row's item and whether it is disabled.
 * @param props.item - The item.
 * @param props.disabled - Whether the row is disabled.
 * @returns The row.
 */
function Row(props: { item: ConformanceItem; disabled: boolean }) {
  const item = useSortableItem({ id: props.item.id, disabled: props.disabled })
  return (
    <li ref={item.ref} data-row={props.item.id}>
      {props.item.title}
    </li>
  )
}

/**
 * The conformance list.
 *
 * @param props - The harness props.
 * @returns The list.
 */
function List(props: ConformanceListProps) {
  return (
    <SortableList
      items={props.items}
      onReorder={props.onReorder}
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      getItemLabel={props.getItemLabel}
      disabled={props.disabled}
      config={props.config}
    >
      <ul>
        <For each={props.items}>
          {(item) => <Row item={item} disabled={props.disabledIds.includes(item.id)} />}
        </For>
      </ul>
    </SortableList>
  )
}

describeSortableListConformance('solid', {
  mount(props) {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const dispose = render(() => <List {...props} />, container)
    return {
      row: (id) => {
        const row = container.querySelector<HTMLElement>(`[data-row="${id}"]`)
        if (!row) throw new Error(`no row ${id}`)
        return row
      },
      unmount: () => {
        dispose()
        container.remove()
      },
    }
  },
  mountRowOutsideList: {
    run: () => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      return render(() => <Row item={{ id: 'a', title: 'Alpha' }} disabled={false} />, container)
    },
    message: 'useSortableItem must be called inside a <SortableList>.',
  },
})
