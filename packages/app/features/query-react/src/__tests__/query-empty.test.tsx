// @vitest-environment jsdom
import { act, createElement as h } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'

import { QueryContent } from '../query-content.js'
let root: Root | undefined
let host: HTMLDivElement
function mount(component: () => ReturnType<typeof h>): void {
  host = document.createElement('div')
  root = createRoot(host)
  act(() => root!.render(h(component)))
}
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = undefined
})
it('chooses one selected-view empty branch instead of mounting generic list content too', () => {
  const children = vi.fn(() => h('p', {}, 'No items yet'))
  mount(() =>
    h(QueryContent<string[]>, {
      query: { data: [], status: 'success', error: undefined },
      empty: {
        when: (rows) => rows.length === 0,
        render: () =>
          h('p', { className: 'empty' }, h('a', { href: '/inventory' }, 'Clear filters')),
      },
      children,
    }),
  )
  expect(host.querySelectorAll('.empty')).toHaveLength(1)
  expect(host.textContent).toBe('Clear filters')
  expect(children).not.toHaveBeenCalled()
})

it('keeps populated envelopes and unconfigured empty arrays on their loaded branch', () => {
  const empty = vi.fn(() => 'Filtered out')
  mount(() =>
    h(QueryContent<{ rows: string[] }>, {
      query: { data: { rows: ['Bolt'] }, status: 'success', error: undefined },
      empty: { when: (page) => page.rows.length === 0, render: empty },
      children: (page) => h('p', {}, page.rows[0]),
    }),
  )
  expect(host.textContent).toBe('Bolt')
  expect(empty).not.toHaveBeenCalled()
})

it('does not evaluate the empty predicate before a document exists', () => {
  const when = vi.fn(() => true)
  mount(() =>
    h(QueryContent<string[]>, {
      query: { data: undefined, status: 'loading', error: undefined },
      pending: 'Loading',
      empty: { when, render: () => 'Empty' },
      children: () => 'Rows',
    }),
  )
  expect(host.textContent).toBe('Loading')
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
  mount(() =>
    h(QueryContent<{ readonly rows: readonly string[] } | null>, {
      query,
      pending: 'Loading',
      missing: 'Missing',
      error: () => 'Failed',
      empty: {
        when: (page) => page.rows.length === 0,
        render: () => h('a', { href: '/inventory/new' }, 'Add item'),
      },
      children: (page) => page.rows.join(', '),
    }),
  )
  expect(host.textContent).toBe(state.expected)
  expect(host.querySelectorAll('a')).toHaveLength(state.expected === 'Add item' ? 1 : 0)
})
