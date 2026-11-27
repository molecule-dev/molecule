// @vitest-environment jsdom
/**
 * The loaded-data region contract of `QueryContent`, driven through the real
 * `useQuery` primitive and the memory query bond — the counterparts of the
 * React package's own QueryContent tests.
 */
import { createSignal, For, type JSX, onCleanup } from 'solid-js'
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { QueryContent } from '../query-content.jsx'
import type { QueryContentProps } from '../types.js'
import { useQuery } from '../use-query.js'
import { deferred, mountComponent, settle, unmountAll } from './helpers.jsx'

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
            <For each={items()}>
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
          <button type="button" onClick={() => commit(repository().id, !repository().watched)}>
            {repository().watched ? 'Unwatch' : 'Watch'}
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
        {(record) => <button type="button">{record().id}</button>}
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
        {(book) => <button type="button">{book().id}</button>}
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
        {(book) => <button type="button">{book().id}</button>}
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
    const render = vi.fn((_doc: () => unknown) => <p>Ready</p>)
    const mounted = mountComponent(() => (
      <QueryContent
        {...{ query: { data, status: 'success', error: undefined }, children: render }}
      />
    ))
    await settle()
    expect(render).toHaveBeenCalledOnce()
    expect(render.mock.calls[0]?.[0]()).toBe(data)
    expect(mounted.host.textContent).toBe('Ready')
    await mounted.unmount()
  },
)

it('keeps the loaded children mounted when the document changes, as React re-renders them', async () => {
  // React re-renders the same child components with a new document, so their local state
  // (a pending optimistic save, an open menu) survives a cache publication or a refresh.
  getQueryClient().set(['book'], { id: 'one', title: 'First' })
  const mounts = vi.fn()
  const cleanups = vi.fn()
  function Title(props: { title: string }): ReturnType<typeof QueryContent<unknown>> {
    mounts()
    onCleanup(cleanups)
    return <h1>{props.title}</h1>
  }
  function Page(): ReturnType<typeof QueryContent<{ id: string; title: string }>> {
    const query = useQuery({ key: ['book'], fetch: async () => new Promise<never>(() => {}) })
    return (
      <QueryContent<{ id: string; title: string }> query={query}>
        {(book) => <Title title={book().title} />}
      </QueryContent>
    )
  }
  const mounted = mountComponent(Page)
  await settle()
  expect(mounted.host.textContent).toBe('First')
  getQueryClient().set(['book'], { id: 'one', title: 'Second' })
  await settle()
  expect(mounted.host.textContent).toBe('Second')
  expect(mounts).toHaveBeenCalledOnce()
  expect(cleanups).not.toHaveBeenCalled()
  // Counterexample: a record that turns missing leaves the loaded branch.
  getQueryClient().set(['book'], null)
  await settle()
  expect(mounted.host.textContent).toBe('')
  expect(cleanups).toHaveBeenCalledOnce()
  await mounted.unmount()
})

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
  const [query, setQuery] = createSignal<QueryContentProps<unknown>['query']>({
    data: undefined,
    status: 'idle',
    error: undefined,
  })
  const mounted = mountComponent(() => (
    <QueryContent
      query={query()}
      pending={<p data-state="pending">loading</p>}
      error={(error) => (
        <p data-state="error">failed: {String((error as { message: string }).message)}</p>
      )}
    >
      {(doc) => (
        <article data-doc={(doc() as { name: string }).name}>
          doc {(doc() as { name: string }).name}
        </article>
      )}
    </QueryContent>
  ))
  await settle()
  expect(mounted.host.querySelector('[data-state="pending"]')).not.toBeNull()

  setQuery({ data: { name: 'pkg-a' }, status: 'success', error: undefined })
  await settle()
  expect(mounted.host.querySelector('article')?.getAttribute('data-doc')).toBe('pkg-a')

  setQuery({ data: undefined, status: 'error', error: new Error('boom') })
  await settle()
  expect(mounted.host.querySelector('[data-state="error"]')?.textContent).toBe('failed: boom')
  expect(mounted.host.querySelector('article')).toBeNull()
  await mounted.unmount()
})

// An edit form's own state: it starts from the record it mounted with and only
// its own Edit click changes the draft, the way the React package's form does.
function ScheduleForm(props: { title: string }): JSX.Element {
  const [draft, setDraft] = createSignal(props.title)
  return (
    <form>
      <input value={draft()} readonly />
      <button type="button" onClick={() => setDraft('Unsaved')}>
        Edit
      </button>
    </form>
  )
}

it('mounts the form with loaded values and resets it when an already cached record opens', async () => {
  const client = getQueryClient()
  client.set(['schedule', 'b'], { title: 'Thursday' })
  const [id, setId] = createSignal('a')
  const first = deferred<{ title: string }>()
  function Page(): JSX.Element {
    const query = useQuery(() => ({
      key: ['schedule', id()],
      fetch: async () => first.promise,
    }))
    return (
      <QueryContent<{ title: string }>
        query={query}
        recordKey={id()}
        pending={<p role="status">Loading schedule</p>}
      >
        {(record) => <ScheduleForm title={record().title} />}
      </QueryContent>
    )
  }
  const mounted = mountComponent(Page)
  expect(mounted.host.querySelector('form')).toBeNull()
  first.resolve({ title: 'Tuesday' })
  await settle()
  expect(mounted.host.querySelector<HTMLInputElement>('input')?.value).toBe('Tuesday')
  mounted.host.querySelector<HTMLButtonElement>('button')!.click()
  await settle()
  client.set(['schedule', 'a'], { title: 'Tuesday, revised' })
  await settle()
  expect(mounted.host.querySelector<HTMLInputElement>('input')?.value).toBe('Unsaved')
  setId('b')
  await settle()
  expect(mounted.host.querySelector<HTMLInputElement>('input')?.value).toBe('Thursday')
  await mounted.unmount()
})

it('keeps a previous query key out of the form until the new record arrives', async () => {
  const client = getQueryClient()
  client.set(['schedule', 'a'], { title: 'Tuesday' })
  const [id, setId] = createSignal('a')
  const second = deferred<{ title: string }>()
  function Page(): JSX.Element {
    const query = useQuery(() => ({
      key: ['schedule', id()],
      fetch: async () => second.promise,
      keepPreviousData: true,
      principal: 'public',
    }))
    return (
      <QueryContent<{ title: string }>
        query={query}
        recordKey={id()}
        pending={<p role="status">Loading schedule</p>}
      >
        {(record) => <ScheduleForm title={record().title} />}
      </QueryContent>
    )
  }
  const mounted = mountComponent(Page)
  await settle()
  expect(mounted.host.querySelector<HTMLInputElement>('input')?.value).toBe('Tuesday')
  setId('b')
  await settle()
  expect(mounted.host.querySelector('form')).toBeNull()
  expect(mounted.host.querySelector('[role="status"]')?.textContent).toBe('Loading schedule')
  second.resolve({ title: 'Thursday' })
  await settle()
  expect(mounted.host.querySelector<HTMLInputElement>('input')?.value).toBe('Thursday')
  await mounted.unmount()
})

it('counterexample: a form with static initial values retains its draft on rerender', async () => {
  const [tick, setTick] = createSignal(0)
  const mounted = mountComponent(() => (
    <>
      <span data-tick>{tick()}</span>
      <ScheduleForm title="New schedule" />
    </>
  ))
  expect(mounted.host.querySelector<HTMLInputElement>('input')?.value).toBe('New schedule')
  mounted.host.querySelector<HTMLButtonElement>('button')!.click()
  await settle()
  setTick(1)
  await settle()
  expect(mounted.host.querySelector<HTMLInputElement>('input')?.value).toBe('Unsaved')
  expect(mounted.host.querySelector('[data-tick]')?.textContent).toBe('1')
  await mounted.unmount()
})
