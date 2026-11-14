// @vitest-environment jsdom
/**
 * The loaded-data region contract of `QueryContent`, driven through the real
 * `useQuery` primitive and the memory query bond — the counterparts of the
 * React package's own QueryContent tests.
 */
import { createSignal, For } from 'solid-js'
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { QueryContent } from '../query-content.js'
import type { QueryContentProps } from '../types.js'
import { useQuery } from '../use-query.js'
import { mountComponent, settle, unmountAll } from './helpers.js'

beforeAll(() => setProvider(provider))
beforeEach(() => resetQueryClient())
afterAll(unmountAll)

it('keeps loading status outside a list: the first item is always real data', async () => {
  let resolve!: (value: string[]) => void
  const request = new Promise<string[]>((r) => {
    resolve = r
  })
  const selected = vi.fn()
  function Sidebar(): ReturnType<typeof QueryContent<string[]>> {
    const query = useQuery({
      key: ['categories'],
      fetch: async () => request,
    })
    return (
      <QueryContent<string[]> query={query} pending={<p role="status">Loading…</p>}>
        {(items) => (
          <ul>
            <For each={items}>
              {(item) => (
                <li>
                  <button type="button" onClick={() => selected(item)}>
                    {item}
                  </button>
                </li>
              )}
            </For>
          </ul>
        )}
      </QueryContent>
    )
  }
  const mounted = mountComponent(Sidebar)
  expect(mounted.host.querySelector('ul, button')).toBeNull()
  expect(mounted.host.querySelector('[role="status"]')?.textContent).toBe('Loading…')
  resolve(['Books'])
  await settle()
  mounted.host.querySelector<HTMLButtonElement>('ul > li:first-child button')!.click()
  expect(selected).toHaveBeenCalledExactlyOnceWith('Books')
  await mounted.unmount()
})

it('does not expose a follow-like toggle before its target exists; the first click saves once', async () => {
  type Repository = { id: string; watched: boolean }
  let resolve!: (value: Repository) => void
  const request = new Promise<Repository>((r) => {
    resolve = r
  })
  const commit = vi.fn()
  function RepositoryPage(): ReturnType<typeof QueryContent<Repository>> {
    const query = useQuery({
      key: ['repository', 'a'],
      fetch: async () => request,
    })
    return (
      <QueryContent<Repository> query={query}>
        {(repository) => (
          <button type="button" onClick={() => commit(repository.id, !repository.watched)}>
            {repository.watched ? 'Unwatch' : 'Watch'}
          </button>
        )}
      </QueryContent>
    )
  }
  const mounted = mountComponent(RepositoryPage)
  expect(mounted.host.querySelector('button')).toBeNull()
  resolve({ id: 'a', watched: false })
  await settle()
  mounted.host.querySelector('button')!.click()
  expect(commit).toHaveBeenCalledExactlyOnceWith('a', true)
  await mounted.unmount()
})

it('drops old record actions immediately when a new key has no data', async () => {
  getQueryClient().set(['repository', 'a'], { id: 'a' })
  const [id, setId] = createSignal('a')
  function Page(): ReturnType<typeof QueryContent<{ id: string }>> {
    const query = useQuery(() => ({
      key: ['repository', id()],
      fetch: async () => new Promise<{ id: string }>(() => {}),
    }))
    return (
      <QueryContent<{ id: string }> query={query}>
        {(record) => <button type="button">{record.id}</button>}
      </QueryContent>
    )
  }
  const mounted = mountComponent(Page)
  await settle()
  expect(mounted.host.textContent).toBe('a')
  setId('b')
  await settle()
  expect(mounted.host.querySelector('button')).toBeNull()
  await mounted.unmount()
})

it('counterexample: cached data stays actionable through a pending and failed refresh', async () => {
  const client = getQueryClient()
  client.set(['book'], { id: 'one' })
  client.invalidate(['book'])
  let reject!: (error: Error) => void
  const request = new Promise<{ id: string }>((_, r) => {
    reject = r
  })
  const error = vi.fn(() => <p role="alert">Failed</p>)
  function Page(): ReturnType<typeof QueryContent<{ id: string }>> {
    const query = useQuery({
      key: ['book'],
      fetch: async () => request,
    })
    return (
      <QueryContent<{ id: string }> query={query} error={error}>
        {(book) => <button type="button">{book.id}</button>}
      </QueryContent>
    )
  }
  const mounted = mountComponent(Page)
  await settle()
  expect(mounted.host.querySelector('button')?.textContent).toBe('one')
  reject(new Error('Offline'))
  await settle()
  expect(mounted.host.querySelector('button')?.textContent).toBe('one')
  expect(error).not.toHaveBeenCalled()
  await mounted.unmount()
})

it('an initial failure never mounts its resource actions and can recover on retry', async () => {
  let fail = true
  let retry: () => Promise<unknown> = async () => {}
  function Page(): ReturnType<typeof QueryContent<{ id: string }>> {
    const query = useQuery({
      key: ['book'],
      fetch: async () => {
        if (fail) throw Error('Offline')
        return { id: 'one' }
      },
    })
    retry = query.refetch
    return (
      <QueryContent<{ id: string }> query={query} error={() => <p role="alert">Failed</p>}>
        {(book) => <button type="button">{book.id}</button>}
      </QueryContent>
    )
  }
  const mounted = mountComponent(Page)
  await settle()
  expect(mounted.host.querySelector('button')).toBeNull()
  expect(mounted.host.querySelector('[role="alert"]')?.textContent).toBe('Failed')
  fail = false
  await retry()
  await settle()
  expect(mounted.host.querySelector('button')?.textContent).toBe('one')
  await mounted.unmount()
})

// Each case is wrapped: it.each spreads an array case into arguments, so a bare
// `[]` would pass no argument and test `undefined` instead of an empty array.
it.each([[false], [0], [''], [[]]])(
  'counterexample: valid empty or false data reaches the loaded branch (%j)',
  async (data) => {
    const render = vi.fn(() => <p>Ready</p>)
    const mounted = mountComponent(() => (
      <QueryContent
        {...{ query: { data, status: 'success', error: undefined }, children: render }}
      />
    ))
    await settle()
    expect(render).toHaveBeenCalledWith(data)
    expect(mounted.host.textContent).toBe('Ready')
    await mounted.unmount()
  },
)

it('a loaded null is missing rather than pending or actionable', async () => {
  const children = vi.fn(() => <button type="button">Act</button>)
  const mounted = mountComponent(() => (
    <QueryContent
      {...{
        query: { data: null, status: 'success', error: undefined },
        missing: <p>Not found</p>,
        children,
      }}
    />
  ))
  await settle()
  expect(children).not.toHaveBeenCalled()
  expect(mounted.host.textContent).toBe('Not found')
  await mounted.unmount()
})

it('follows each replaced query object: states move from pending through loaded to error', async () => {
  // An app passes a new `query` object per state, as React's conformance case
  // re-renders with one: a later object without `data` leaves the loaded branch.
  const [query, setQuery] = createSignal<QueryContentProps<unknown>['query']>({ status: 'idle' })
  const mounted = mountComponent(() => (
    <QueryContent
      query={query()}
      pending={<p data-state="pending">loading</p>}
      error={(error) => (
        <p data-state="error">failed: {String((error as { message: string }).message)}</p>
      )}
    >
      {(doc) => (
        <article data-doc={(doc as { name: string }).name}>
          doc {(doc as { name: string }).name}
        </article>
      )}
    </QueryContent>
  ))
  await settle()
  expect(mounted.host.querySelector('[data-state="pending"]')).not.toBeNull()

  setQuery({ data: { name: 'pkg-a' }, status: 'success' })
  await settle()
  expect(mounted.host.querySelector('article')?.getAttribute('data-doc')).toBe('pkg-a')

  setQuery({ status: 'error', error: { message: 'boom' } })
  await settle()
  expect(mounted.host.querySelector('[data-state="error"]')?.textContent).toBe('failed: boom')
  expect(mounted.host.querySelector('article')).toBeNull()
  await mounted.unmount()
})
