// @vitest-environment jsdom
import { act, createElement as h } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it } from 'vitest'

import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { QueryContent } from '../query-content.js'
import { useQuery } from '../useQuery.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root
let host: HTMLDivElement
beforeEach(() => {
  setProvider(provider)
  resetQueryClient()
  host = document.createElement('div')
  root = createRoot(host)
})
afterEach(() => act(() => root.unmount()))

type Page = { rows: string[] }

it.each(['populated', 'empty', 'error'] as const)(
  'does not advertise a previous empty collection while the new view is pending (%s)',
  async (outcome) => {
    getQueryClient().set(['inventory', 'archived'], { rows: [] })
    let view = 'archived'
    let resolve!: (value: Page) => void
    let reject!: (error: Error) => void
    const request = new Promise<Page>((yes, no) => {
      resolve = yes
      reject = no
    })
    function Inventory() {
      const query = useQuery<Page>({
        key: ['inventory', view],
        principal: 'operator-1',
        keepPreviousData: true,
        fetch: async () => request,
      })
      return h(
        'main',
        {},
        h('nav', {}, h('a', { href: '/inventory/new' }, 'New item')),
        h(QueryContent<Page>, {
          query,
          pending: h('p', { role: 'status' }, 'Loading'),
          error: () => h('p', { role: 'alert' }, 'Failed'),
          empty: {
            when: (page) => page.rows.length === 0,
            render: () => h('section', {}, h('a', { href: '/inventory/new' }, 'Add item')),
          },
          children: (page) =>
            h(
              'ul',
              {},
              page.rows.map((row) => h('li', { key: row }, row)),
            ),
        }),
      )
    }
    act(() => root.render(h(Inventory)))
    // A genuinely empty collection can have the same destination as its navbar.
    expect(host.querySelectorAll('a[href="/inventory/new"]')).toHaveLength(2)
    view = 'active'
    act(() => root.render(h(Inventory)))
    expect(host.querySelector('section')).toBeNull()
    expect(host.querySelector('[role="status"]')?.textContent).toBe('Loading')
    expect(host.querySelectorAll('a[href="/inventory/new"]')).toHaveLength(1)
    await act(async () => {
      if (outcome === 'error') reject(new Error('Offline'))
      else resolve({ rows: outcome === 'empty' ? [] : ['Bolt'] })
    })
    expect(host.querySelector('[role="status"]')).toBeNull()
    if (outcome === 'error')
      expect(host.querySelector('[role="alert"]')?.textContent).toBe('Failed')
    else if (outcome === 'empty')
      expect(host.querySelector('section')?.textContent).toBe('Add item')
    else expect(host.querySelector('li')?.textContent).toBe('Bolt')
  },
)

it('waits for the initial collection before offering an empty-state action', async () => {
  let resolve!: (value: Page) => void
  const request = new Promise<Page>((yes) => {
    resolve = yes
  })
  function Inventory() {
    const query = useQuery({ key: ['inventory'], fetch: async () => request })
    return h(QueryContent<Page>, {
      query,
      pending: 'Loading',
      empty: {
        when: (page) => page.rows.length === 0,
        render: () => h('a', { href: '/inventory/new' }, 'Add item'),
      },
      children: (page) => h('p', {}, page.rows.join(', ')),
    })
  }
  act(() => root.render(h(Inventory)))
  expect(host.textContent).toBe('Loading')
  expect(host.querySelector('a')).toBeNull()
  await act(async () => resolve({ rows: ['Bolt'] }))
  expect(host.textContent).toBe('Bolt')
  expect(host.querySelector('a')).toBeNull()
})
