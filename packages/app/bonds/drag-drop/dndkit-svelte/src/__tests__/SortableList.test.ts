// @vitest-environment jsdom
/**
 * Svelte conformance of `@molecule/app-drag-drop-dndkit-svelte`: the shared
 * sortable-list suite, mounted with real Svelte components in jsdom.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'

import { describeSortableListConformance } from '@molecule/app-framework-conformance/drag-drop'

import List from './List.svelte'
import Row from './Row.svelte'

describeSortableListConformance('svelte', {
  mount(props) {
    const target = document.createElement('div')
    document.body.appendChild(target)
    const instance = mount(List, { target, props })
    flushSync()
    return {
      row: (id) => {
        const row = target.querySelector<HTMLElement>(`[data-row="${id}"]`)
        if (!row) throw new Error(`no row ${id}`)
        return row
      },
      unmount: async () => {
        await unmount(instance)
        target.remove()
      },
    }
  },
  mountRowOutsideList: {
    run: () => {
      const target = document.createElement('div')
      document.body.appendChild(target)
      try {
        return mount(Row, {
          target,
          props: { item: { id: 'a', title: 'Alpha' }, disabled: false },
        })
      } finally {
        target.remove()
      }
    },
    message: 'useSortableItem must be called inside a <SortableList>.',
  },
})
