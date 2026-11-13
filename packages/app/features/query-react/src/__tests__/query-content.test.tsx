import { act, createElement as h } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { QueryContent } from '../query-content.js'
import { useQuery } from '../useQuery.js'

beforeAll(() => setProvider(provider))
beforeEach(() => resetQueryClient())
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
const flush = () => act(async () => {})

it('keeps loading status outside a list: the first item is always real data', async () => {
  let resolve!: (value: string[]) => void
  const request = new Promise<string[]>((r) => {
    resolve = r
  })
  const selected = vi.fn()
  function Sidebar() {
    const query = useQuery({ key: ['categories'], fetch: async () => request })
    return h(QueryContent<string[]>, {
      query,
      pending: h('p', { role: 'status' }, 'Loading…'),
      children: (items) =>
        h(
          'ul',
          {},
          items.map((item) =>
            h(
              'li',
              { key: item },
              h('button', { className: 'category-pill', onClick: () => selected(item) }, item),
            ),
          ),
        ),
    })
  }
  mount(Sidebar)
  expect(host.querySelector('ul, .category-pill')).toBeNull()
  expect(host.querySelector('[role="status"]')?.textContent).toBe('Loading…')
  await act(async () => resolve(['Books']))
  act(() => host.querySelector<HTMLButtonElement>('ul > li:first-child button')!.click())
  expect(selected).toHaveBeenCalledExactlyOnceWith('Books')
})

it('does not expose a follow-like toggle before its target exists; the first click saves once', async () => {
  type Repository = { id: string; watched: boolean }
  let resolve!: (value: Repository) => void
  const request = new Promise<Repository>((r) => {
    resolve = r
  })
  const commit = vi.fn()
  function RepositoryPage() {
    const query = useQuery({ key: ['repository', 'a'], fetch: async () => request })
    return h(QueryContent<Repository>, {
      query,
      children: (repository) =>
        h(
          'button',
          { onClick: () => commit(repository.id, !repository.watched) },
          repository.watched ? 'Unwatch' : 'Watch',
        ),
    })
  }
  mount(RepositoryPage)
  expect(host.querySelector('button')).toBeNull()
  await act(async () => resolve({ id: 'a', watched: false }))
  act(() => host.querySelector('button')!.click())
  expect(commit).toHaveBeenCalledExactlyOnceWith('a', true)
})

it('drops old record actions immediately when a new key has no data', async () => {
  getQueryClient().set(['repository', 'a'], { id: 'a' })
  let id = 'a'
  function Page() {
    const query = useQuery({
      key: ['repository', id],
      fetch: async () => new Promise<{ id: string }>(() => {}),
    })
    return h(QueryContent<{ id: string }>, {
      query,
      children: (record) => h('button', {}, record.id),
    })
  }
  mount(Page)
  expect(host.textContent).toBe('a')
  id = 'b'
  act(() => root!.render(h(Page)))
  expect(host.querySelector('button')).toBeNull()
  await flush()
})

it('counterexample: cached data stays actionable through a pending and failed refresh', async () => {
  const client = getQueryClient()
  client.set(['book'], { id: 'one' })
  client.invalidate(['book'])
  let reject!: (error: Error) => void
  const request = new Promise<{ id: string }>((_, r) => {
    reject = r
  })
  const error = vi.fn(() => h('p', { role: 'alert' }, 'Failed'))
  function Page() {
    const query = useQuery({ key: ['book'], fetch: async () => request })
    return h(QueryContent<{ id: string }>, {
      query,
      error,
      children: (book) => h('button', {}, book.id),
    })
  }
  mount(Page)
  expect(host.querySelector('button')?.textContent).toBe('one')
  await act(async () => reject(new Error('Offline')))
  expect(host.querySelector('button')?.textContent).toBe('one')
  expect(error).not.toHaveBeenCalled()
})

it('an initial failure never mounts its resource actions and can recover on retry', async () => {
  let fail = true
  let retry: () => Promise<unknown> = async () => {}
  function Page() {
    const query = useQuery({
      key: ['book'],
      fetch: async () => {
        if (fail) throw Error('Offline')
        return { id: 'one' }
      },
    })
    retry = query.refetch
    return h(QueryContent<{ id: string }>, {
      query,
      error: () => h('p', { role: 'alert' }, 'Failed'),
      children: (book) => h('button', {}, book.id),
    })
  }
  mount(Page)
  await flush()
  expect(host.querySelector('button')).toBeNull()
  expect(host.querySelector('[role="alert"]')?.textContent).toBe('Failed')
  fail = false
  await act(async () => {
    await retry()
  })
  expect(host.querySelector('button')?.textContent).toBe('one')
})

it.each([false, 0, '', []])(
  'counterexample: valid empty or false data reaches the loaded branch (%j)',
  (data) => {
    const render = vi.fn(() => h('p', {}, 'Ready'))
    mount(() =>
      h(QueryContent, { query: { data, status: 'success', error: undefined }, children: render }),
    )
    expect(render).toHaveBeenCalledWith(data)
    expect(host.textContent).toBe('Ready')
  },
)

it('a loaded null is missing rather than pending or actionable', () => {
  const children = vi.fn(() => h('button', {}, 'Act'))
  mount(() =>
    h(QueryContent, {
      query: { data: null, status: 'success', error: undefined },
      missing: h('p', {}, 'Not found'),
      children,
    }),
  )
  expect(children).not.toHaveBeenCalled()
  expect(host.textContent).toBe('Not found')
})
