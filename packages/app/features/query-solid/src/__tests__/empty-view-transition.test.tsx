// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/empty-view-transition.test.tsx`: the
 * initial collection is not advertised as empty while it is still loading, so
 * its empty-state action cannot be clicked before a document exists.
 */
import { createSignal, For } from 'solid-js'
import { afterEach, beforeEach, expect, it } from 'vitest'

import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { QueryContent } from '../query-content.jsx'
import { useQuery } from '../use-query.js'
import { deferred, mountComponent, settle, unmountAll } from './helpers.jsx'

type Page = { rows: string[] }

beforeEach(() => {
  resetQueryClient()
  setProvider(provider)
})
afterEach(unmountAll)

it.each(['populated', 'empty', 'error'] as const)(
  'does not advertise a previous empty collection while the new view is pending (%s)',
  async (outcome) => {
    // An empty archived view is seeded; switching to another view must not show its
    // empty-state action while the new view is still loading.
    getQueryClient().set(['inventory', 'archived'], { rows: [] })
    const [view, setView] = createSignal<'archived' | 'active'>('archived')
    const request = deferred<Page>()
    const mounted = mountComponent(() => {
      const query = useQuery<Page>(() => ({
        key: ['inventory', view()],
        principal: 'operator-1',
        keepPreviousData: true,
        fetch: async () => request.promise,
      }))
      return (
        <main>
          <nav>
            <a href="/inventory/new">New item</a>
          </nav>
          <QueryContent<Page>
            query={query}
            pending={<p role="status">Loading</p>}
            error={() => <p role="alert">Failed</p>}
            empty={{
              when: (page) => page.rows.length === 0,
              render: () => (
                <section>
                  <a href="/inventory/new">Add item</a>
                </section>
              ),
            }}
            children={(page) => (
              <ul>
                <For each={page().rows}>{(row) => <li>{row}</li>}</For>
              </ul>
            )}
          />
        </main>
      )
    })
    // A genuinely empty collection can have the same destination as its navbar.
    expect(mounted.host.querySelectorAll('a[href="/inventory/new"]')).toHaveLength(2)
    setView('active')
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
  const view = mountComponent(() => {
    const query = useQuery<Page>({ key: ['inventory'], fetch: async () => request.promise })
    return (
      <QueryContent<Page>
        query={query}
        pending="Loading"
        empty={{
          when: (page) => page.rows.length === 0,
          render: () => <a href="/inventory/new">Add item</a>,
        }}
        children={(page) => <p>{page().rows.join(', ')}</p>}
      />
    )
  })
  expect(view.host.textContent).toBe('Loading')
  expect(view.host.querySelector('a')).toBeNull()
  request.resolve({ rows: ['Bolt'] })
  await settle()
  expect(view.host.textContent).toBe('Bolt')
  expect(view.host.querySelector('a')).toBeNull()
})
