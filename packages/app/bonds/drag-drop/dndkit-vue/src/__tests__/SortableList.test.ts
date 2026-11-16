// @vitest-environment jsdom

import { createApp, defineComponent, h, type PropType, type VNode } from 'vue'

import type {
  ConformanceItem,
  ConformanceListProps,
  MountedConformanceList,
} from '@molecule/app-framework-conformance/drag-drop'
import { describeSortableListConformance } from '@molecule/app-framework-conformance/drag-drop'

import { SortableList, useSortableItem } from '../index.js'

/** One row of the conformance list. */
const Row = defineComponent({
  name: 'ConformanceRow',
  props: {
    item: {
      type: Object as PropType<ConformanceItem>,
      required: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const { ref } = useSortableItem({ id: props.item.id, disabled: props.disabled })
    return (): VNode =>
      h(
        'li',
        {
          'data-row': props.item.id,
          ref: (element) => {
            ref(element instanceof Element ? element : null)
          },
        },
        props.item.title,
      )
  },
})

/**
 * Renders one conformance list into `document.body`.
 *
 * @param props - The list's props.
 * @returns The mounted list.
 */
function mount(props: ConformanceListProps): MountedConformanceList {
  const { disabledIds, ...options } = props
  const app = createApp({
    render: (): VNode =>
      h(SortableList, options, {
        default: (): VNode[] =>
          props.items.map((item) =>
            h(Row, { key: item.id, item, disabled: disabledIds.includes(item.id) }),
          ),
      }),
  })
  const container = document.createElement('div')
  document.body.appendChild(container)
  app.mount(container)
  return {
    row(id) {
      const row = container.querySelector<HTMLElement>(`[data-row="${id}"]`)
      if (!row) throw new Error(`no row ${id}`)
      return row
    },
    unmount() {
      app.unmount()
      container.remove()
    },
  }
}

describeSortableListConformance('vue', {
  mount,
  mountRowOutsideList: {
    run: () => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      try {
        createApp(Row, { item: { id: 'a', title: 'Alpha' }, disabled: false }).mount(container)
      } finally {
        container.remove()
      }
    },
    message: 'useSortableItem must be called inside a <SortableList>.',
  },
})
