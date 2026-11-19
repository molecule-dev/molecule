// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/empty-view-transition.test.tsx`: the
 * initial collection is not advertised as empty while it is still loading, so
 * its empty-state action cannot be clicked before a document exists.
 */
import { flushSync, mount, unmount } from 'svelte'
import { writable } from 'svelte/store'
import { afterEach, beforeEach, expect, it } from 'vitest'

import type { QueryOptions } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import EmptyView from './helpers/EmptyView.svelte'
import { deferred, settle } from './helpers/harness.js'
import PendingView from './helpers/PendingView.svelte'

const containers: HTMLDivElement[] = []
const unmounters: (() => Promise<void>)[] = []

afterEach(async () => {
  for (const unmounter of unmounters.splice(0)) await unmounter()
  for (const container of containers.splice(0)) container.remove()
})

beforeEach(() => {
  resetQueryClient()
  setProvider(provider)
})

it.each(['populated', 'empty', 'error'] as const)(
  'does not advertise a previous empty collection while the new view is pending (%s)',
  async (outcome) => {
    // An empty archived view is seeded; switching to another view must not show its
    // empty-state action while the new view is still loading.
    getQueryClient().set(['inventory', 'archived'], { rows: [] })
    const request = deferred<{ rows: string[] }>()
    const options = writable<QueryOptions<{ rows: string[] }> | null>({
      key: ['inventory', 'archived'],
      principal: 'operator-1',
      keepPreviousData: true,
      fetch: async () => request.promise,
    })
    const container = document.createElement('div')
    document.body.append(container)
    containers.push(container)
    const instance = mount(PendingView, { target: container, props: { options } })
    flushSync()
    unmounters.push(() => unmount(instance))
    // A genuinely empty collection can have the same destination as its navbar.
    expect(container.querySelectorAll('a[href="/inventory/new"]')).toHaveLength(2)
    options.set({
      key: ['inventory', 'active'],
      principal: 'operator-1',
      keepPreviousData: true,
      fetch: async () => request.promise,
    })
    flushSync()
    expect(container.querySelector('section')).toBeNull()
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Loading')
    expect(container.querySelectorAll('a[href="/inventory/new"]')).toHaveLength(1)
    if (outcome === 'error') request.reject(new Error('Offline'))
    else request.resolve({ rows: outcome === 'empty' ? [] : ['Bolt'] })
    await settle()
    expect(container.querySelector('[role="status"]')).toBeNull()
    if (outcome === 'error')
      expect(container.querySelector('[role="alert"]')?.textContent).toBe('Failed')
    else if (outcome === 'empty')
      expect(container.querySelector('section')?.textContent).toBe('Add item')
    else expect(container.querySelector('li')?.textContent).toBe('Bolt')
  },
)

it('waits for the initial collection before offering an empty-state action', async () => {
  const request = deferred<{ rows: string[] }>()
  const container = document.createElement('div')
  document.body.append(container)
  containers.push(container)
  const instance = mount(EmptyView, { target: container, props: { request: request.promise } })
  flushSync()
  unmounters.push(() => unmount(instance))
  expect(container.textContent).toBe('Loading')
  expect(container.querySelector('a')).toBeNull()
  request.resolve({ rows: ['Bolt'] })
  await settle()
  expect(container.textContent).toBe('Bolt')
  expect(container.querySelector('a')).toBeNull()
})
