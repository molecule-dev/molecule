// @vitest-environment jsdom
/**
 * The list contract of `useListQuery`, driven through the real Solid primitive
 * and the memory query bond: the observer stays idle (`null`, no request) while
 * the viewer is still restoring or the route cannot load, hands `read` the
 * current value of every input plus the route's filters, page size and offset,
 * and moves the same mounted observer to the new key when any of them changes —
 * the counterparts of the React package's own hook tests.
 */
import { createSignal } from 'solid-js'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryOptions } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { type ListQueryRoute, type ListQueryState, useListQuery } from '../list-query.js'
import { renderHook } from './helpers.jsx'

beforeAll(() => {
  setProvider(provider)
})
beforeEach(() => {
  resetQueryClient()
})

/** The inputs a test mounts with: the viewer, the request params and a parent slug. */
interface TestInputs {
  /** The signed-in viewer's id, or null while auth is restoring. */
  viewer: string | null
  /** The page's request params. */
  params: { q: string }
  /** The parent record's slug. */
  slug: string
}

/** The loaded values `read` receives: every input's current value, viewer non-null. */
type LoadedInputs = Omit<TestInputs, 'viewer'> & { viewer: string }

/** The route's list state with one URL filter, `tag`. */
type TagListState = ListQueryState<'tag'>

/** A list route of accessors plus the setters a test drives it through. */
interface TestRoute {
  /** The route argument, the shape `useListRoute` returns. */
  route: ListQueryRoute<'tag'>
  /** Flips the route's ability to load. */
  setCanLoad: (value: boolean) => void
  /** Replaces the URL filter values. */
  setFilters: (value: Record<'tag', string | undefined>) => void
  /** Sets the items per page. */
  setPageSize: (value: number) => void
  /** Sets the zero-indexed item offset. */
  setOffset: (value: number) => void
}

/**
 * Builds a list route of accessors from `createSignal`s, the way
 * `useListRoute` does, with its setters.
 *
 * @param init - The route's initial values (a loadable route with the `tag`
 *   filter set, 10 items per page, offset 0).
 * @returns The route and its setters.
 */
const createRoute = (init?: {
  canLoad?: boolean
  filters?: Record<'tag', string | undefined>
  pageSize?: number
  offset?: number
}): TestRoute => {
  const [canLoad, setCanLoad] = createSignal(init?.canLoad ?? true)
  const [filters, setFilters] = createSignal<Record<'tag', string | undefined>>(
    init?.filters ?? { tag: 'a' },
  )
  const [pageSize, setPageSize] = createSignal(init?.pageSize ?? 10)
  const [offset, setOffset] = createSignal(init?.offset ?? 0)
  return {
    route: { canLoad, filters, pageSize, offset },
    setCanLoad,
    setFilters,
    setPageSize,
    setOffset,
  }
}

/**
 * Builds the page's `read`: the query options name everything the answer
 * depends on — the viewer, the slug, the search term and the route's filter,
 * page size and offset — and share the test's fetch mock.
 *
 * @param fetch - The fetch the options carry.
 * @returns The `read` function for `useListQuery`.
 */
const readItems = (
  fetch: (signal: AbortSignal) => Promise<string[]>,
): ((values: LoadedInputs, list: TagListState) => QueryOptions<string[]>) => {
  const read = (values: LoadedInputs, list: TagListState): QueryOptions<string[]> => ({
    key: [
      'items',
      values.viewer,
      values.slug,
      values.params.q,
      list.filters.tag,
      list.pageSize,
      list.offset,
    ],
    fetch,
  })
  return read
}

describe('useListQuery', () => {
  it('observes nothing while the viewer is null', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => ['row'])
    const [viewer] = createSignal<string | null>(null)
    const [params] = createSignal<{ q: string }>({ q: 'x' })
    const [slug] = createSignal('s1')
    const { route } = createRoute()
    const read = vi.fn(readItems(fetch))
    const h = renderHook(() =>
      useListQuery<string[], TestInputs, 'tag'>(route, { viewer, params, slug }, read),
    )
    expect(h.value().status).toBe('idle')
    expect(h.value().data).toBeUndefined()
    expect(read).not.toHaveBeenCalled()
    await h.rerender()
    expect(fetch).not.toHaveBeenCalled()
    await h.unmount()
  })

  it('observes nothing while the route cannot load', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => ['row'])
    const [viewer] = createSignal<string | null>('u1')
    const [params] = createSignal<{ q: string }>({ q: 'x' })
    const [slug] = createSignal('s1')
    const { route } = createRoute({ canLoad: false })
    const read = vi.fn(readItems(fetch))
    const h = renderHook(() =>
      useListQuery<string[], TestInputs, 'tag'>(route, { viewer, params, slug }, read),
    )
    expect(h.value().status).toBe('idle')
    expect(read).not.toHaveBeenCalled()
    await h.rerender()
    expect(fetch).not.toHaveBeenCalled()
    await h.unmount()
  })

  it('hands read the current values and the route state, and fetches the page once', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => ['row-1'])
    const [viewer] = createSignal<string | null>('u1')
    const [params] = createSignal<{ q: string }>({ q: 'x' })
    const [slug] = createSignal('s1')
    const { route } = createRoute({ filters: { tag: 'a' }, pageSize: 10, offset: 20 })
    const read = vi.fn(readItems(fetch))
    const h = renderHook(() =>
      useListQuery<string[], TestInputs, 'tag'>(route, { viewer, params, slug }, read),
    )
    expect(read).toHaveBeenCalledWith(
      { viewer: 'u1', params: { q: 'x' }, slug: 's1' },
      { filters: { tag: 'a' }, pageSize: 10, offset: 20 },
    )
    await h.rerender()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(h.value().status).toBe('success')
    expect(h.value().data).toEqual(['row-1'])
    expect(getQueryClient().get<string[]>(['items', 'u1', 's1', 'x', 'a', 10, 20])).toEqual([
      'row-1',
    ])
    await h.unmount()
  })

  it('fetches once when the viewer arrives from null', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => ['u1 rows'])
    const [viewer, setViewer] = createSignal<string | null>(null)
    const [params] = createSignal<{ q: string }>({ q: 'x' })
    const [slug] = createSignal('s1')
    const { route } = createRoute()
    const h = renderHook(() =>
      useListQuery<string[], TestInputs, 'tag'>(route, { viewer, params, slug }, readItems(fetch)),
    )
    expect(h.value().status).toBe('idle')
    setViewer('u1')
    await h.rerender()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(h.value().status).toBe('success')
    expect(h.value().data).toEqual(['u1 rows'])
    expect(getQueryClient().get<string[]>(['items', 'u1', 's1', 'x', 'a', 10, 0])).toEqual([
      'u1 rows',
    ])
    await h.unmount()
  })

  it('fetches the new page when the offset changes', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => [`page ${fetch.mock.calls.length}`])
    const [viewer] = createSignal<string | null>('u1')
    const [params] = createSignal<{ q: string }>({ q: 'x' })
    const [slug] = createSignal('s1')
    const { route, setOffset } = createRoute({ offset: 0 })
    const h = renderHook(() =>
      useListQuery<string[], TestInputs, 'tag'>(route, { viewer, params, slug }, readItems(fetch)),
    )
    await h.rerender()
    expect(h.value().status).toBe('success')
    expect(h.value().data).toEqual(['page 1'])
    setOffset(10)
    await h.rerender()
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(h.value().data).toEqual(['page 2'])
    expect(getQueryClient().get<string[]>(['items', 'u1', 's1', 'x', 'a', 10, 10])).toEqual([
      'page 2',
    ])
    await h.unmount()
  })

  it('fetches the new key when a filter changes', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => [`rows ${fetch.mock.calls.length}`])
    const [viewer] = createSignal<string | null>('u1')
    const [params] = createSignal<{ q: string }>({ q: 'x' })
    const [slug] = createSignal('s1')
    const { route, setFilters } = createRoute({ filters: { tag: 'a' } })
    const h = renderHook(() =>
      useListQuery<string[], TestInputs, 'tag'>(route, { viewer, params, slug }, readItems(fetch)),
    )
    await h.rerender()
    expect(h.value().data).toEqual(['rows 1'])
    setFilters({ tag: 'b' })
    await h.rerender()
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(h.value().data).toEqual(['rows 2'])
    expect(getQueryClient().get<string[]>(['items', 'u1', 's1', 'x', 'b', 10, 0])).toEqual([
      'rows 2',
    ])
    await h.unmount()
  })

  it('fetches the new key when the params change', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => [`rows ${fetch.mock.calls.length}`])
    const [viewer] = createSignal<string | null>('u1')
    const [params, setParams] = createSignal<{ q: string }>({ q: 'x' })
    const [slug] = createSignal('s1')
    const { route } = createRoute()
    const h = renderHook(() =>
      useListQuery<string[], TestInputs, 'tag'>(route, { viewer, params, slug }, readItems(fetch)),
    )
    await h.rerender()
    expect(h.value().data).toEqual(['rows 1'])
    setParams({ q: 'y' })
    await h.rerender()
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(h.value().data).toEqual(['rows 2'])
    expect(getQueryClient().get<string[]>(['items', 'u1', 's1', 'y', 'a', 10, 0])).toEqual([
      'rows 2',
    ])
    await h.unmount()
  })

  it('fetches the new key when the slug input changes', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => [`rows ${fetch.mock.calls.length}`])
    const [viewer] = createSignal<string | null>('u1')
    const [params] = createSignal<{ q: string }>({ q: 'x' })
    const [slug, setSlug] = createSignal('s1')
    const { route } = createRoute()
    const h = renderHook(() =>
      useListQuery<string[], TestInputs, 'tag'>(route, { viewer, params, slug }, readItems(fetch)),
    )
    await h.rerender()
    expect(h.value().data).toEqual(['rows 1'])
    setSlug('s2')
    await h.rerender()
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(h.value().data).toEqual(['rows 2'])
    expect(getQueryClient().get<string[]>(['items', 'u1', 's2', 'x', 'a', 10, 0])).toEqual([
      'rows 2',
    ])
    await h.unmount()
  })

  it('returns to idle when the route stops being loadable, without a new fetch', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => ['row-1'])
    const [viewer] = createSignal<string | null>('u1')
    const [params] = createSignal<{ q: string }>({ q: 'x' })
    const [slug] = createSignal('s1')
    const { route, setCanLoad } = createRoute()
    const h = renderHook(() =>
      useListQuery<string[], TestInputs, 'tag'>(route, { viewer, params, slug }, readItems(fetch)),
    )
    await h.rerender()
    expect(h.value().status).toBe('success')
    expect(fetch).toHaveBeenCalledTimes(1)
    setCanLoad(false)
    await h.rerender()
    expect(h.value().status).toBe('idle')
    expect(h.value().data).toBeUndefined()
    expect(fetch).toHaveBeenCalledTimes(1)
    await h.unmount()
  })
})
