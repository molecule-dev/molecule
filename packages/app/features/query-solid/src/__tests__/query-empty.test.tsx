// @vitest-environment jsdom
import { createSignal, For } from 'solid-js'
import { afterAll, expect, it, vi } from 'vitest'

import { QueryContent } from '../query-content.jsx'
import { mountComponent, settle, unmountAll } from './helpers.jsx'
afterAll(unmountAll)
it('selects one view-specific empty state and switches to populated content', async () => {
  const [rows, setRows] = createSignal<string[]>([])
  const children = vi.fn((items: () => string[]) => (
    <ul>
      <For each={items()}>{(item) => <li>{item}</li>}</For>
    </ul>
  ))
  const view = mountComponent(() => (
    <QueryContent<string[]>
      query={{
        get data() {
          return rows()
        },
        status: 'success',
        error: undefined,
      }}
      empty={{
        when: (items) => items.length === 0,
        render: () => (
          <p class="empty">
            <a href="/inventory">Clear filters</a>
          </p>
        ),
      }}
      children={children}
    />
  ))
  expect(view.host.querySelectorAll('.empty')).toHaveLength(1)
  expect(view.host.textContent).toBe('Clear filters')
  expect(children).not.toHaveBeenCalled()
  setRows(['Bolt'])
  await settle()
  expect(view.host.querySelector('.empty')).toBeNull()
  expect(view.host.textContent).toBe('Bolt')
  await view.unmount()
})
