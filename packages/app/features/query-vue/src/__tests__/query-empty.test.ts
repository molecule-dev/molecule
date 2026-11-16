// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { h, nextTick, shallowRef } from 'vue'

import { QueryContent } from '../query-content.js'
import { mountApp, unmountAll } from './helpers.js'
afterEach(async () => {
  await unmountAll()
})
it('selects one view-specific empty state and switches to populated content', async () => {
  const rows = shallowRef<string[]>([])
  const children = vi.fn((items: string[]) =>
    h(
      'ul',
      {},
      items.map((item) => h('li', {}, item)),
    ),
  )
  const view = mountApp(
    () => () =>
      h(QueryContent<string[]>, {
        query: { data: rows.value, status: 'success', error: undefined },
        children,
        empty: {
          when: (items) => items.length === 0,
          render: () => h('p', { class: 'empty' }, h('a', { href: '/inventory' }, 'Clear filters')),
        },
      }),
  )
  expect(view.host.querySelectorAll('.empty')).toHaveLength(1)
  expect(view.host.textContent).toBe('Clear filters')
  expect(children).not.toHaveBeenCalled()
  rows.value = ['Bolt']
  await nextTick()
  expect(view.host.querySelector('.empty')).toBeNull()
  expect(view.host.textContent).toBe('Bolt')
})
