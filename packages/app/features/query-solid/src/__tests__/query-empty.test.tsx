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

it('chooses one selected-view empty branch instead of mounting generic list content too', () => {
  const children = vi.fn(() => <p>No items yet</p>)
  const view = mountComponent(() => (
    <QueryContent<string[]>
      query={{ data: [], status: 'success', error: undefined }}
      empty={{
        when: (rows) => rows.length === 0,
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
})

it('keeps populated envelopes and unconfigured empty arrays on their loaded branch', () => {
  const empty = vi.fn(() => 'Filtered out')
  const view = mountComponent(() => (
    <QueryContent<{ rows: string[] }>
      query={{ data: { rows: ['Bolt'] }, status: 'success', error: undefined }}
      empty={{ when: (page) => page.rows.length === 0, render: empty }}
      children={(page) => <p>{page().rows[0]}</p>}
    />
  ))
  expect(view.host.textContent).toBe('Bolt')
  expect(empty).not.toHaveBeenCalled()
})

it('does not evaluate the empty predicate before a document exists', () => {
  const when = vi.fn(() => true)
  const view = mountComponent(() => (
    <QueryContent<string[]>
      query={{ data: undefined, status: 'loading', error: undefined }}
      pending="Loading"
      empty={{ when, render: () => 'Empty' }}
      children={() => 'Rows'}
    />
  ))
  expect(view.host.textContent).toBe('Loading')
  expect(when).not.toHaveBeenCalled()
})

const viewStates = [
  {
    name: 'previous empty page while the next view loads',
    data: { rows: [] },
    status: 'loading',
    isPreviousData: true,
    expected: 'Loading',
  },
  {
    name: 'previous missing record while the next view loads',
    data: null,
    status: 'loading',
    isPreviousData: true,
    expected: 'Loading',
  },
  {
    name: 'previous empty page after a failed next read',
    data: { rows: [] },
    status: 'error',
    isPreviousData: true,
    expected: 'Failed',
  },
  {
    name: 'populated previous page stays visible',
    data: { rows: ['Bolt'] },
    status: 'loading',
    isPreviousData: true,
    expected: 'Bolt',
  },
  {
    name: 'current empty page may offer its action during refresh',
    data: { rows: [] },
    status: 'loading',
    isPreviousData: false,
    expected: 'Add item',
  },
  {
    name: 'current empty page stays visible after a failed refresh',
    data: { rows: [] },
    status: 'error',
    isPreviousData: false,
    expected: 'Add item',
  },
  {
    name: 'current successful empty page may offer its action',
    data: { rows: [] },
    status: 'success',
    isPreviousData: false,
    expected: 'Add item',
  },
] as const

it.each(viewStates)('renders the current view rather than $name', (state) => {
  const query = { ...state, error: new Error('Offline') }
  const view = mountComponent(() => (
    <QueryContent<{ readonly rows: readonly string[] } | null>
      query={query}
      pending="Loading"
      missing="Missing"
      error={() => 'Failed'}
      empty={{
        when: (page) => page.rows.length === 0,
        render: () => <a href="/inventory/new">Add item</a>,
      }}
      children={(page) => page().rows.join(', ')}
    />
  ))
  expect(view.host.textContent).toBe(state.expected)
  expect(view.host.querySelectorAll('a')).toHaveLength(state.expected === 'Add item' ? 1 : 0)
})
