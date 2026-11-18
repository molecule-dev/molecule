// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/record-content.test.tsx`: a record action
 * waits for a nonempty identity, the mounted record is scoped to its ID and
 * viewer, and read-only data needs no identity.
 */
import { type Component, createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { type Writable, writable } from 'svelte/store'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import type { QueryState } from '@molecule/app-query'
import { resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import QueryContent from '../QueryContent.svelte'
import { settle } from './helpers/harness.js'
import RecordAction from './helpers/RecordAction.svelte'
import ScopedRecord from './helpers/ScopedRecord.svelte'

beforeAll(() => setProvider(provider))
beforeEach(() => resetQueryClient())
afterAll(() => resetQueryClient())

/** The mounted instances, unmounted after every test. */
const instances: (() => Promise<void>)[] = []
/** The containers, removed after every test. */
const containers: HTMLDivElement[] = []
afterEach(async () => {
  for (const unmounter of instances.splice(0)) await unmounter()
  for (const container of containers.splice(0)) container.remove()
})

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

interface Notebook {
  id?: string
  pinned: boolean
}

it('withholds a record action until a nonempty ID exists, then passes that ID to the action', async () => {
  const post = vi.fn()
  const pin = (id: string | undefined): void => {
    post(`/notebooks/${encodeURIComponent(id ?? '')}/pin`)
  }
  const source: Writable<
    Pick<QueryState<Notebook>, 'data' | 'status' | 'error' | 'isPreviousData'>
  > = writable({ data: undefined, status: 'loading', error: undefined })
  const container = track(RecordAction, { source, onPin: pin })
  expect(container.querySelector('button')).toBeNull()
  for (const id of [undefined, '']) {
    source.set({ data: { id, pinned: false }, status: 'success', error: undefined })
    flushSync()
    await settle()
    container.querySelector<HTMLButtonElement>('button')?.click()
    expect(post).not.toHaveBeenCalled()
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Loading notebook')
  }
  source.set({ data: { id: 'team/sprint 1', pinned: false }, status: 'success', error: undefined })
  flushSync()
  await settle()
  container.querySelector<HTMLButtonElement>('button')!.click()
  expect(post).toHaveBeenCalledExactlyOnceWith('/notebooks/team%2Fsprint%201/pin')
})

it('keeps the same record mounted on refresh and scopes mounted state by viewer and record', async () => {
  const recordId = writable(0)
  const viewer = writable<PropertyKey>('team-a')
  const isPreviousData = writable(false)
  const container = track(ScopedRecord, { recordId, viewer, isPreviousData })
  const first = container.querySelector('button')!
  expect(first.textContent).toBe('0: false')
  first.click()
  flushSync()
  expect(first.textContent).toBe('0: true')
  viewer.set('team-a')
  flushSync()
  expect(container.querySelector('button')).toBe(first)
  expect(first.textContent).toBe('0: true')
  viewer.set('team-b')
  flushSync()
  expect(container.querySelector('button')?.textContent).toBe('0: false')
  container.querySelector<HTMLButtonElement>('button')!.click()
  flushSync()
  expect(container.querySelector('button')?.textContent).toBe('0: true')
  recordId.set(1)
  flushSync()
  expect(container.querySelector('button')?.textContent).toBe('1: false')
  isPreviousData.set(true)
  flushSync()
  expect(container.querySelector('button')).toBeNull()
})

it('leaves read-only data without an identity renderable', async () => {
  const children: Snippet<[string]> = createRawSnippet(() => ({
    render: () => '<p>Unsaved note</p>',
  }))
  const container = document.createElement('div')
  document.body.append(container)
  containers.push(container)
  const instance = mount(QueryContent, {
    target: container,
    props: { query: { data: 'Unsaved note', status: 'success', error: undefined }, children },
  })
  flushSync()
  instances.push(() => unmount(instance))
  expect(container.textContent).toBe('Unsaved note')
})
