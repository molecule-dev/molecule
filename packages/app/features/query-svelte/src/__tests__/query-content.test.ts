// @vitest-environment jsdom
/**
 * `QueryContent` behavioral tests, ported from `@molecule/app-query-react`'s
 * own suite: the loaded branch mounts only with a real document, status never
 * mounts item actions, cached data stays actionable through a failed refresh,
 * and false, zero, an empty list and null are documents of their own kinds.
 */
import { type Component, createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { type Writable, writable } from 'svelte/store'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import type { QueryOptions } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import QueryContent from '../QueryContent.svelte'
import type { UseQueryResult } from '../types.js'
import { deferred, settle } from './helpers/harness.js'
import Items from './helpers/Items.svelte'
import RecordRegion from './helpers/Record.svelte'
import ScheduleRecord from './helpers/ScheduleRecord.svelte'
import StaticForm from './helpers/StaticForm.svelte'

beforeAll(() => setProvider(provider))
beforeEach(() => resetQueryClient())

/** The mounted instances, unmounted after every test. */
const instances: (() => Promise<void>)[] = []
/** The containers, removed after every test. */
const containers: HTMLDivElement[] = []
afterEach(async () => {
  for (const unmounter of instances.splice(0)) await unmounter()
  for (const container of containers.splice(0)) container.remove()
})
afterAll(() => resetQueryClient())

/** Mounts a helper component in a tracked container. */
function track(
  component: Component<Record<string, unknown>>,
  props: Record<string, unknown>,
): HTMLDivElement {
  const container = document.createElement('div')
  document.body.append(container)
  containers.push(container)
  const instance = mount(component, { target: container, props })
  flushSync()
  instances.push(() => unmount(instance))
  return container
}

/** A writable options store the test can change on the same mount. */
const optionsOf = <T>(initial: QueryOptions<T> | null): Writable<QueryOptions<T> | null> =>
  writable<QueryOptions<T> | null>(initial)

interface RecordHandle<T> {
  container: HTMLDivElement
  latest: () => UseQueryResult<T> | undefined
  committed: T[]
  errorRenders: number
  setOptions: (next: QueryOptions<T> | null) => void
}

/** Mounts the record region with a result capture and commit/error recorders. */
function mountRecord<T>(
  initial: QueryOptions<T> | null,
  label?: (record: T) => string,
): RecordHandle<T> {
  const options = optionsOf(initial)
  let latest: UseQueryResult<T> | undefined
  const committed: T[] = []
  const counters = { errors: 0 }
  const container = track(RecordRegion, {
    options,
    capture: (result: UseQueryResult<T>) => {
      latest = result
    },
    onCommit: (record: T) => committed.push(record),
    onError: () => {
      counters.errors += 1
    },
    label,
  })
  return {
    container,
    latest: () => latest,
    committed,
    get errorRenders(): number {
      return counters.errors
    },
    setOptions: (next) => {
      options.set(next)
      flushSync()
    },
  }
}

it('keeps loading status outside a list: the first item is always real data', async () => {
  const gate = deferred<string[]>()
  const picked: unknown[] = []
  const container = track(Items, {
    options: optionsOf({ key: ['categories'], fetch: async () => gate.promise }),
    onPick: (item: unknown) => picked.push(item),
  })
  expect(container.querySelector('ul, button')).toBeNull()
  expect(container.querySelector('[role="status"]')?.textContent).toBe('Loading…')
  gate.resolve(['Books'])
  await settle()
  const firstButton = container.querySelector('ul > li:first-child button')
  expect(firstButton?.textContent).toBe('Books')
  firstButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await settle(1)
  expect(picked).toEqual(['Books'])
})

it('does not expose a follow-like toggle before its target exists; the first click saves once', async () => {
  interface Repository {
    id: string
    watched: boolean
  }
  const gate = deferred<Repository>()
  const committed: string[] = []
  const container = track(RecordRegion, {
    options: optionsOf<Repository>({
      key: ['repository', 'a'],
      fetch: async () => gate.promise,
    }),
    onCommit: (repository: Repository) => committed.push(repository.id),
    label: (repository: Repository) => (repository.watched ? 'Unwatch' : 'Watch'),
  })
  expect(container.querySelector('button')).toBeNull()
  gate.resolve({ id: 'a', watched: false })
  await settle()
  const button = container.querySelector('button')
  expect(button?.textContent).toBe('Watch')
  button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await settle(1)
  expect(committed).toEqual(['a'])
})

it('drops old record actions immediately when a new key has no data', async () => {
  getQueryClient().set(['repository', 'a'], { id: 'a' })
  const options = optionsOf<{ id: string }>({
    key: ['repository', 'a'],
    fetch: async () => new Promise<{ id: string }>(() => {}),
  })
  const container = track(RecordRegion, {
    options,
    label: (record: { id: string }) => record.id,
  })
  expect(container.textContent).toBe('a')
  options.set({
    key: ['repository', 'b'],
    fetch: async () => new Promise<{ id: string }>(() => {}),
  })
  flushSync()
  expect(container.querySelector('button')).toBeNull()
  await settle()
})

it('counterexample: cached data stays actionable through a pending and failed refresh', async () => {
  const client = getQueryClient()
  client.set(['book'], { id: 'one' })
  client.invalidate(['book'])
  const gate = deferred<{ id: string }>()
  const handle = mountRecord<{ id: string }>(
    { key: ['book'], fetch: async () => gate.promise },
    (book) => book.id,
  )
  expect(handle.container.querySelector('button')?.textContent).toBe('one')
  gate.reject(new Error('Offline'))
  await settle()
  expect(handle.container.querySelector('button')?.textContent).toBe('one')
  expect(handle.errorRenders).toBe(0)
})

it('an initial failure never mounts its resource actions and can recover on retry', async () => {
  let fail = true
  const fetch = vi.fn(async (): Promise<{ id: string }> => {
    if (fail) throw Error('Offline')
    return { id: 'one' }
  })
  const handle = mountRecord<{ id: string }>({ key: ['book'], fetch }, (book) => book.id)
  await settle()
  expect(handle.container.querySelector('button')).toBeNull()
  expect(handle.container.querySelector('[role="alert"]')?.textContent).toBe(
    'Failed (Error: Offline)',
  )
  fail = false
  await handle.latest()?.refetch()
  await settle()
  expect(handle.container.querySelector('button')?.textContent).toBe('one')
})

const falsyData: unknown[][] = [[false], [0], [''], [[]]]
it.each(falsyData)(
  'counterexample: valid empty or false data reaches the loaded branch (%j)',
  (data) => {
    const seen: unknown[] = []
    // A snippet's arguments arrive as getters (Svelte's calling convention).
    const children: Snippet<[unknown]> = createRawSnippet((getData: () => unknown) => {
      seen.push(getData())
      return { render: () => '<p>Ready</p>' }
    })
    const container = document.createElement('div')
    document.body.append(container)
    containers.push(container)
    const instance = mount(QueryContent, {
      target: container,
      props: { query: { data, status: 'success', error: undefined }, children },
    })
    flushSync()
    instances.push(() => unmount(instance))
    expect(seen).toEqual([data])
    expect(container.textContent).toBe('Ready')
  },
)

it('a loaded null is missing rather than pending or actionable', () => {
  const seen: unknown[] = []
  const children: Snippet<[unknown]> = createRawSnippet((getData: () => unknown) => {
    seen.push(getData())
    return { render: () => '<button type="button">Act</button>' }
  })
  const missing: Snippet = createRawSnippet(() => ({ render: () => '<p>Not found</p>' }))
  const container = document.createElement('div')
  document.body.append(container)
  containers.push(container)
  const instance = mount(QueryContent, {
    target: container,
    props: { query: { data: null, status: 'success', error: undefined }, missing, children },
  })
  flushSync()
  instances.push(() => unmount(instance))
  expect(seen).toEqual([])
  expect(container.textContent).toBe('Not found')
})

it('mounts the form with loaded values and resets it when an already cached record opens', async () => {
  const client = getQueryClient()
  client.set(['schedule', 'b'], { title: 'Thursday' })
  const gate = deferred<{ title: string }>()
  const id = writable<PropertyKey>('a')
  const options = optionsOf<{ title: string }>({
    key: ['schedule', 'a'],
    fetch: async () => gate.promise,
  })
  const container = track(ScheduleRecord, { options, id })
  expect(container.querySelector('form')).toBeNull()
  gate.resolve({ title: 'Tuesday' })
  await settle()
  expect(container.querySelector<HTMLInputElement>('input')?.value).toBe('Tuesday')
  container.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await settle(1)
  client.set(['schedule', 'a'], { title: 'Tuesday, revised' })
  await settle()
  expect(container.querySelector<HTMLInputElement>('input')?.value).toBe('Unsaved')
  options.set({ key: ['schedule', 'b'], fetch: async () => gate.promise })
  id.set('b')
  flushSync()
  expect(container.querySelector<HTMLInputElement>('input')?.value).toBe('Thursday')
})

it('keeps a previous query key out of the form until the new record arrives', async () => {
  const client = getQueryClient()
  client.set(['schedule', 'a'], { title: 'Tuesday' })
  const gate = deferred<{ title: string }>()
  const id = writable<PropertyKey>('a')
  const options = optionsOf<{ title: string }>({
    key: ['schedule', 'a'],
    fetch: async () => gate.promise,
    keepPreviousData: true,
    principal: 'public',
  })
  const container = track(ScheduleRecord, { options, id })
  await settle()
  expect(container.querySelector<HTMLInputElement>('input')?.value).toBe('Tuesday')
  options.set({
    key: ['schedule', 'b'],
    fetch: async () => gate.promise,
    keepPreviousData: true,
    principal: 'public',
  })
  id.set('b')
  flushSync()
  expect(container.querySelector('form')).toBeNull()
  expect(container.querySelector('[role="status"]')?.textContent).toBe('Loading schedule')
  gate.resolve({ title: 'Thursday' })
  await settle()
  expect(container.querySelector<HTMLInputElement>('input')?.value).toBe('Thursday')
})

it('counterexample: a form with static initial values retains its draft on rerender', async () => {
  const container = track(StaticForm, {})
  expect(container.querySelector<HTMLInputElement>('input')?.value).toBe('New schedule')
  container.querySelector('form button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await settle(1)
  expect(container.querySelector<HTMLInputElement>('input')?.value).toBe('Unsaved')
  container
    .querySelector('button[data-rerender]')
    ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  flushSync()
  expect(container.querySelector('[data-count]')?.textContent).toBe('1')
  expect(container.querySelector<HTMLInputElement>('input')?.value).toBe('Unsaved')
})
