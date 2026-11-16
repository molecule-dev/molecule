import { act, cleanup, render } from '@testing-library/react'
import type { JSX } from 'react'

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
function Row({ item, disabled }: { item: ConformanceItem; disabled: boolean }): JSX.Element {
  const { ref } = useSortableItem({ id: item.id, disabled })
  return (
    <li ref={ref} data-row={item.id}>
      {item.title}
    </li>
  )
}

/**
 * The conformance list.
 *
 * @param props - The harness props.
 * @returns The list.
 */
function List(props: ConformanceListProps): JSX.Element {
  const { disabledIds, ...options } = props
  return (
    <SortableList {...options}>
      <ul>
        {props.items.map((item) => (
          <Row key={item.id} item={item} disabled={disabledIds.includes(item.id)} />
        ))}
      </ul>
    </SortableList>
  )
}

describeSortableListConformance('react', {
  async mount(props) {
    const { container, unmount } = await act(async () => render(<List {...props} />))
    return {
      row: (id) => {
        const row = container.querySelector<HTMLElement>(`[data-row="${id}"]`)
        if (!row) throw new Error(`no row ${id}`)
        return row
      },
      unmount: () => {
        unmount()
        cleanup()
      },
    }
  },
  mountRowOutsideList: {
    run: () => render(<Row item={{ id: 'a', title: 'Alpha' }} disabled={false} />),
    message: 'useSortableItem must be called inside a <SortableList>.',
  },
})
