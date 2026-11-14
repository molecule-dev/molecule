// @vitest-environment jsdom
/**
 * `useListQuery` through a real zoneless Angular component, over the in-memory
 * query bond: one observer for the page, disabled (idle, no request) while the
 * viewer is missing or the route cannot load, and moved to the new key by every
 * input and route change — the contract `useQuery` gives a page that derives
 * its options from the list route.
 *
 * @module
 */
import '@angular/compiler'
import { signal, type WritableSignal } from '@angular/core'
import { afterEach, beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { QueryOptions } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { type ListQueryState, useListQuery, type UseQueryResult } from '../index.js'
import { drain } from './harness.js'
import { destroyQueryMounts, mountTracked } from './query-harness.js'

beforeAll(() => {
  setProvider(provider)
})
beforeEach(() => {
  resetQueryClient()
})
afterEach(async () => {
  await destroyQueryMounts()
})

/** The input values a list page reads, as `read` receives them. */
interface PageValues {
  /** The signed-in viewer's id, or null while auth is still restoring. */
  viewer: string | null
  /** The request's search params. */
  params: { q: string }
  /** The parent record's slug. */
  slug: string
}

/** One list page's starting position; every field backs a signal the test can change. */
interface PageStart {
  /** The signed-in viewer's id, or null while auth is still restoring. */
  viewer: string | null
  /** False while the protected view waits for auth or is unavailable. */
  canLoad: boolean
  /** The search param `q`. */
  q: string
  /** The URL's `tag` filter. */
  tag: string | undefined
  /** The parent record's slug. */
  slug: string
  /** The configured items per page. */
  pageSize: number
  /** The zero-indexed item offset for the API request. */
  offset: number
}

/** The starting position most tests share: signed out, route not yet loadable. */
const START: PageStart = {
  viewer: null,
  canLoad: false,
  q: 'x',
  tag: 'a',
  slug: 's1',
  pageSize: 10,
  offset: 0,
}

/** A mounted list page: its signals, its spies and the observed query state. */
interface ListPage {
  /** The query state the hook observes. */
  value: () => UseQueryResult<string[]>
  /** Runs change detection and settles the work it scheduled. */
  settle: () => Promise<void>
  /** The options builder, as a spy: the hook calls it with the current values. */
  read: Mock<
    (values: PageValues & { viewer: string }, list: ListQueryState<'tag'>) => QueryOptions<string[]>
  >
  /** The fetch spy every key's options carry. */
  fetch: Mock<() => Promise<string[]>>
  /** False while the protected view waits for auth or is unavailable. */
  canLoad: WritableSignal<boolean>
  /** The current URL filter values. */
  filters: WritableSignal<{ tag: string | undefined }>
  /** The configured items per page. */
  pageSize: WritableSignal<number>
  /** The zero-indexed item offset for the API request. */
  offset: WritableSignal<number>
  /** The signed-in viewer's id, or null while auth is still restoring. */
  viewer: WritableSignal<string | null>
  /** The request's search params. */
  params: WritableSignal<{ q: string }>
  /** The parent record's slug. */
  slug: WritableSignal<string>
}

/**
 * The key `read` builds for these page values — the expected side of the
 * cache assertions that prove which keys were fetched.
 *
 * @param viewer - The signed-in viewer's id.
 * @param slug - The parent record's slug.
 * @param q - The search param `q`.
 * @param tag - The URL's `tag` filter.
 * @param pageSize - The configured items per page.
 * @param offset - The zero-indexed item offset.
 * @returns The query key.
 */
function expectedKey(
  viewer: string,
  slug: string,
  q: string,
  tag: string | undefined,
  pageSize: number,
  offset: number,
): readonly unknown[] {
  return ['items', viewer, slug, q, tag, pageSize, offset]
}

/**
 * Mounts `useListQuery` in a real zoneless Angular application (an injection
 * context, through the tracked harness) over one signal per input and route
 * field, and gives the test every signal to change.
 *
 * Each key's query carries the same `fetch` spy, whose answer names its call
 * order, so the rows on screen and in the cache identify which key was fetched.
 *
 * @param start - The page's starting position (the rest of {@link START}).
 * @returns The mounted page.
 */
async function mountPage(start: Partial<PageStart> = {}): Promise<ListPage> {
  const page: PageStart = { ...START, ...start }
  const answers: string[][] = []
  const fetch = vi.fn(async (): Promise<string[]> => {
    const rows = [`rows for call ${answers.length + 1}`]
    answers.push(rows)
    return rows
  })
  const read = vi.fn(
    (
      values: PageValues & { viewer: string },
      list: ListQueryState<'tag'>,
    ): QueryOptions<string[]> => ({
      key: expectedKey(
        values.viewer,
        values.slug,
        values.params.q,
        list.filters.tag,
        list.pageSize,
        list.offset,
      ),
      fetch,
    }),
  )
  const canLoad = signal(page.canLoad)
  const filters = signal<{ tag: string | undefined }>({ tag: page.tag })
  const pageSize = signal(page.pageSize)
  const offset = signal(page.offset)
  const viewer = signal<string | null>(page.viewer)
  const params = signal({ q: page.q })
  const slug = signal(page.slug)
  const mounted = await mountTracked(() =>
    useListQuery<string[], PageValues, 'tag'>(
      { canLoad, filters, pageSize, offset },
      { viewer, params, slug },
      read,
    ),
  )
  return {
    value: mounted.result,
    settle: mounted.settle,
    read,
    fetch,
    canLoad,
    filters,
    pageSize,
    offset,
    viewer,
    params,
    slug,
  }
}

describe('useListQuery', () => {
  it('observes nothing while the viewer is null', async () => {
    const page = await mountPage({ canLoad: true })
    await drain()
    expect(page.value().status).toBe('idle')
    expect(page.value().data).toBeUndefined()
    expect(page.read).not.toHaveBeenCalled()
    expect(page.fetch).not.toHaveBeenCalled()
  })

  it('observes nothing while the route cannot load', async () => {
    const page = await mountPage({ viewer: 'u1' })
    await drain()
    expect(page.value().status).toBe('idle')
    expect(page.value().data).toBeUndefined()
    expect(page.read).not.toHaveBeenCalled()
    expect(page.fetch).not.toHaveBeenCalled()
  })

  it('reads the enabled page once and fetches its key', async () => {
    const page = await mountPage({ viewer: 'u1', canLoad: true, offset: 20 })
    await drain()
    expect(page.read).toHaveBeenCalledTimes(1)
    expect(page.read.mock.calls[0]?.[0]).toEqual({ viewer: 'u1', params: { q: 'x' }, slug: 's1' })
    // The route's list state as `read` receives it: filters, page size, offset.
    expect(page.read.mock.calls[0]?.[1]).toEqual({
      filters: { tag: 'a' },
      pageSize: 10,
      offset: 20,
    })
    expect(page.fetch).toHaveBeenCalledTimes(1)
    expect(page.value().status).toBe('success')
    expect(page.value().data).toEqual(['rows for call 1'])
    expect(getQueryClient().get<string[]>(expectedKey('u1', 's1', 'x', 'a', 10, 20))).toEqual([
      'rows for call 1',
    ])
  })

  it('fetches once when the viewer arrives', async () => {
    const page = await mountPage({ canLoad: true })
    await drain()
    expect(page.fetch).not.toHaveBeenCalled()
    page.viewer.set('u1')
    await page.settle()
    await drain()
    expect(page.fetch).toHaveBeenCalledTimes(1)
    expect(page.value().status).toBe('success')
    expect(page.value().data).toEqual(['rows for call 1'])
    expect(getQueryClient().get<string[]>(expectedKey('u1', 's1', 'x', 'a', 10, 0))).toEqual([
      'rows for call 1',
    ])
  })

  it('fetches the new key and updates the data when the offset changes', async () => {
    const page = await mountPage({ viewer: 'u1', canLoad: true })
    await drain()
    expect(page.value().data).toEqual(['rows for call 1'])
    page.offset.set(10)
    await page.settle()
    await drain()
    expect(page.fetch).toHaveBeenCalledTimes(2)
    expect(page.value().status).toBe('success')
    expect(page.value().data).toEqual(['rows for call 2'])
    expect(getQueryClient().get<string[]>(expectedKey('u1', 's1', 'x', 'a', 10, 10))).toEqual([
      'rows for call 2',
    ])
    expect(getQueryClient().get<string[]>(expectedKey('u1', 's1', 'x', 'a', 10, 0))).toEqual([
      'rows for call 1',
    ])
  })

  it('fetches the new key when a filter changes', async () => {
    const page = await mountPage({ viewer: 'u1', canLoad: true })
    await drain()
    expect(page.fetch).toHaveBeenCalledTimes(1)
    page.filters.set({ tag: 'b' })
    await page.settle()
    await drain()
    expect(page.fetch).toHaveBeenCalledTimes(2)
    expect(page.value().data).toEqual(['rows for call 2'])
    expect(getQueryClient().get<string[]>(expectedKey('u1', 's1', 'x', 'b', 10, 0))).toEqual([
      'rows for call 2',
    ])
    expect(getQueryClient().get<string[]>(expectedKey('u1', 's1', 'x', 'a', 10, 0))).toEqual([
      'rows for call 1',
    ])
  })

  it('fetches the new key when the params change', async () => {
    const page = await mountPage({ viewer: 'u1', canLoad: true })
    await drain()
    expect(page.fetch).toHaveBeenCalledTimes(1)
    page.params.set({ q: 'y' })
    await page.settle()
    await drain()
    expect(page.fetch).toHaveBeenCalledTimes(2)
    expect(page.value().data).toEqual(['rows for call 2'])
    expect(getQueryClient().get<string[]>(expectedKey('u1', 's1', 'y', 'a', 10, 0))).toEqual([
      'rows for call 2',
    ])
    expect(getQueryClient().get<string[]>(expectedKey('u1', 's1', 'x', 'a', 10, 0))).toEqual([
      'rows for call 1',
    ])
  })

  it('fetches the new key when the slug input changes', async () => {
    const page = await mountPage({ viewer: 'u1', canLoad: true })
    await drain()
    expect(page.fetch).toHaveBeenCalledTimes(1)
    page.slug.set('s2')
    await page.settle()
    await drain()
    expect(page.fetch).toHaveBeenCalledTimes(2)
    expect(page.value().data).toEqual(['rows for call 2'])
    expect(getQueryClient().get<string[]>(expectedKey('u1', 's2', 'x', 'a', 10, 0))).toEqual([
      'rows for call 2',
    ])
    expect(getQueryClient().get<string[]>(expectedKey('u1', 's1', 'x', 'a', 10, 0))).toEqual([
      'rows for call 1',
    ])
  })

  it('goes back to idle, without a new fetch, when the route stops being loadable', async () => {
    const page = await mountPage({ viewer: 'u1', canLoad: true })
    await drain()
    expect(page.value().status).toBe('success')
    expect(page.fetch).toHaveBeenCalledTimes(1)
    page.canLoad.set(false)
    await page.settle()
    await drain()
    expect(page.value().status).toBe('idle')
    expect(page.value().data).toBeUndefined()
    expect(page.fetch).toHaveBeenCalledTimes(1)
    // The disabled page's options builder is not called again either.
    expect(page.read).toHaveBeenCalledTimes(1)
  })
})
