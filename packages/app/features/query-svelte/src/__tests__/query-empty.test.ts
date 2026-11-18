// @vitest-environment jsdom
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, expect, it, vi } from 'vitest'

import QueryContent from '../QueryContent.svelte'
const instances: (() => Promise<void>)[] = []
const containers: HTMLDivElement[] = []
afterEach(async () => {
  for (const dispose of instances.splice(0)) await dispose()
  for (const container of containers.splice(0)) container.remove()
})
it('selects a single view-specific empty branch rather than loaded content', () => {
  const seen: unknown[] = []
  const children: Snippet<[unknown]> = createRawSnippet((getData) => {
    seen.push(getData())
    return { render: () => '<p>No items yet</p>' }
  })
  const empty: Snippet<[unknown]> = createRawSnippet(() => ({
    render: () => '<p class="empty"><a href="/inventory">Clear filters</a></p>',
  }))
  const container = document.createElement('div')
  document.body.append(container)
  containers.push(container)
  const instance = mount(QueryContent, {
    target: container,
    props: {
      query: { data: [], status: 'success', error: undefined },
      children,
      empty: { when: (data: unknown) => Array.isArray(data) && data.length === 0, render: empty },
    },
  })
  flushSync()
  instances.push(() => unmount(instance))
  expect(container.querySelectorAll('.empty')).toHaveLength(1)
  expect(container.textContent).toBe('Clear filters')
  expect(seen).toEqual([])
})

it('chooses one selected-view empty branch instead of mounting generic list content too', () => {
  const seen: unknown[] = []
  const children: Snippet<[unknown]> = createRawSnippet((getData) => {
    seen.push(getData())
    return { render: () => '<p>No items yet</p>' }
  })
  const empty: Snippet<[unknown]> = createRawSnippet(() => ({
    render: () => '<p class="empty"><a href="/inventory">Clear filters</a></p>',
  }))
  const container = document.createElement('div')
  document.body.append(container)
  containers.push(container)
  const instance = mount(QueryContent, {
    target: container,
    props: {
      query: { data: [], status: 'success', error: undefined },
      children,
      empty: { when: (data: unknown) => Array.isArray(data) && data.length === 0, render: empty },
    },
  })
  flushSync()
  instances.push(() => unmount(instance))
  expect(container.querySelectorAll('.empty')).toHaveLength(1)
  expect(container.textContent).toBe('Clear filters')
  expect(seen).toEqual([])
})

it('keeps populated envelopes and unconfigured empty arrays on their loaded branch', () => {
  const emptyRenders: unknown[] = []
  const children: Snippet<[unknown]> = createRawSnippet((getData) => ({
    render: () => `<p>${(getData() as { rows: string[] }).rows[0]}</p>`,
  }))
  const empty: Snippet<[unknown]> = createRawSnippet((getData) => {
    emptyRenders.push(getData())
    return { render: () => '<p>Filtered out</p>' }
  })
  const container = document.createElement('div')
  document.body.append(container)
  containers.push(container)
  const instance = mount(QueryContent, {
    target: container,
    props: {
      query: { data: { rows: ['Bolt'] }, status: 'success', error: undefined },
      children,
      empty: {
        when: (data: unknown) => (data as { rows: string[] }).rows.length === 0,
        render: empty,
      },
    },
  })
  flushSync()
  instances.push(() => unmount(instance))
  expect(container.textContent).toBe('Bolt')
  expect(emptyRenders).toEqual([])
})

it('does not evaluate the empty predicate before a document exists', () => {
  const when = vi.fn(() => true)
  const children: Snippet<[unknown]> = createRawSnippet(() => ({ render: () => '<p>Rows</p>' }))
  const empty: Snippet<[unknown]> = createRawSnippet(() => ({ render: () => '<p>Empty</p>' }))
  const pending: Snippet = createRawSnippet(() => ({ render: () => '<p>Loading</p>' }))
  const container = document.createElement('div')
  document.body.append(container)
  containers.push(container)
  const instance = mount(QueryContent, {
    target: container,
    props: {
      query: { data: undefined, status: 'loading', error: undefined },
      pending,
      empty: { when, render: empty },
      children,
    },
  })
  flushSync()
  instances.push(() => unmount(instance))
  expect(container.textContent).toBe('Loading')
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
  const text = (value: string): Snippet =>
    createRawSnippet(() => ({ render: () => `<p>${value}</p>` }))
  const children: Snippet<[unknown]> = createRawSnippet((getData) => ({
    render: () => `<p>${(getData() as { rows: string[] }).rows.join(', ')}</p>`,
  }))
  const empty: Snippet<[unknown]> = createRawSnippet(() => ({
    render: () => '<a href="/inventory/new">Add item</a>',
  }))
  const error: Snippet<[unknown]> = createRawSnippet(() => ({ render: () => '<p>Failed</p>' }))
  const container = document.createElement('div')
  document.body.append(container)
  containers.push(container)
  const instance = mount(QueryContent, {
    target: container,
    props: {
      query: { ...state, error: new Error('Offline') },
      children,
      pending: text('Loading'),
      missing: text('Missing'),
      error,
      empty: {
        when: (data: unknown) => (data as { rows: string[] }).rows.length === 0,
        render: empty,
      },
    },
  })
  flushSync()
  instances.push(() => unmount(instance))
  expect(container.textContent).toBe(state.expected)
  expect(container.querySelectorAll('a')).toHaveLength(state.expected === 'Add item' ? 1 : 0)
})
