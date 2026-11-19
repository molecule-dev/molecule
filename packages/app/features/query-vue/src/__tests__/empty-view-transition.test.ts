// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/empty-view-transition.test.tsx`: the
 * initial collection is not advertised as empty while it is still loading, so
 * its empty-state action cannot be clicked before a document exists.
 */
import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { computed, h, shallowRef } from 'vue'

import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { QueryContent } from '../query-content.js'
import { useQuery } from '../useQuery.js'
import { deferred, mountApp, settle, unmountAll } from './helpers.js'

type Page = { rows: string[] }

beforeAll(() => setProvider(provider))
beforeEach(() => {
  resetQueryClient()
})
afterEach(async () => {
  await unmountAll()
})

it.each(['populated', 'empty', 'error'] as const)(
  'does not advertise a previous empty collection while the new view is pending (%s)',
  async (outcome) => {
    // An empty archived view is seeded; switching to another view must not show its
    // empty-state action while the new view is still loading.
    getQueryClient().set(['inventory', 'archived'], { rows: [] })
    const view = shallowRef<'archived' | 'active'>('archived')
    const request = deferred<Page>()
    const options = computed(() => ({
      key: ['inventory', view.value],
      principal: 'operator-1',
      keepPreviousData: true,
      fetch: async () => request.promise,
    }))
    const mounted = mountApp(() => {
      const query = useQuery<Page>(options)
      return () =>
        h('main', {}, [
          h('nav', {}, h('a', { href: '/inventory/new' }, 'New item')),
          h(QueryContent<Page>, {
            query: query.value,
            pending: h('p', { role: 'status' }, 'Loading'),
            error: () => h('p', { role: 'alert' }, 'Failed'),
            empty: {
              when: (page: Page) => page.rows.length === 0,
              render: () => h('section', {}, h('a', { href: '/inventory/new' }, 'Add item')),
            },
            children: (page: Page) =>
              h(
                'ul',
                {},
                page.rows.map((row) => h('li', { key: row }, row)),
              ),
          }),
        ])
    })
    // A genuinely empty collection can have the same destination as its navbar.
    expect(mounted.host.querySelectorAll('a[href="/inventory/new"]')).toHaveLength(2)
    view.value = 'active'
    await settle()
    expect(mounted.host.querySelector('section')).toBeNull()
    expect(mounted.host.querySelector('[role="status"]')?.textContent).toBe('Loading')
    expect(mounted.host.querySelectorAll('a[href="/inventory/new"]')).toHaveLength(1)
    if (outcome === 'error') request.reject(new Error('Offline'))
    else request.resolve({ rows: outcome === 'empty' ? [] : ['Bolt'] })
    await settle()
    expect(mounted.host.querySelector('[role="status"]')).toBeNull()
    if (outcome === 'error')
      expect(mounted.host.querySelector('[role="alert"]')?.textContent).toBe('Failed')
    else if (outcome === 'empty')
      expect(mounted.host.querySelector('section')?.textContent).toBe('Add item')
    else expect(mounted.host.querySelector('li')?.textContent).toBe('Bolt')
  },
)

it('waits for the initial collection before offering an empty-state action', async () => {
  const request = deferred<Page>()
  const view = mountApp(() => {
    const query = useQuery<Page>({ key: ['inventory'], fetch: async () => request.promise })
    return () =>
      h(QueryContent<Page>, {
        query: query.value,
        pending: 'Loading',
        empty: {
          when: (page) => page.rows.length === 0,
          render: () => h('a', { href: '/inventory/new' }, 'Add item'),
        },
        children: (page) => h('p', {}, page.rows.join(', ')),
      })
  })
  expect(view.host.textContent).toBe('Loading')
  expect(view.host.querySelector('a')).toBeNull()
  request.resolve({ rows: ['Bolt'] })
  await settle()
  expect(view.host.textContent).toBe('Bolt')
  expect(view.host.querySelector('a')).toBeNull()
})
