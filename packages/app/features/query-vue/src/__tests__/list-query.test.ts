// @vitest-environment jsdom
/**
 * `useListQuery`: one cached read driven by a URL list route. A null viewer or
 * an unloadable route observes nothing (no read, no fetch); the signed-in
 * viewer, the route's filters, page size and offset, and every input move the
 * same observer to the new key, and the page shows the answer fetched for that
 * key.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Ref, ref } from 'vue'

import type { QueryKey, QueryOptions } from '@molecule/app-query'
import { resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { type ListQueryState, useListQuery } from '../list-query.js'
import type { UseQueryResult } from '../types.js'
import { mountApp, settle, unmountAll } from './helpers.js'

beforeAll(() => setProvider(provider))
beforeEach(() => resetQueryClient())
afterEach(async () => {
  await unmountAll()
})

/** The values `read` sees: the current value of every input, viewer never null. */
interface ListValues {
  viewer: string
  params: { q: string }
  slug: string
}

/** The page `read` builds from the current values and route. */
type ListRead = (values: ListValues, list: ListQueryState) => QueryOptions<string[]>

/** The page's fetch, asked with the key it was built for, so tests can count keys. */
type RowFetch = (key: QueryKey, signal: AbortSignal) => Promise<string[]>

/** A mounted `useListQuery` over reactive route and input refs. */
interface MountedListQuery {
  /** The route ref: swap its value to move the observer to another page. */
  route: Ref<ListQueryState>
  /** The viewer input ref. */
  viewer: Ref<string | null>
  /** The params input ref. */
  params: Ref<{ q: string }>
  /** The slug input ref. */
  slug: Ref<string>
  /** The current query state, read at call time. */
  value: () => UseQueryResult<string[]>
}

/**
 * Mounts `useListQuery` under a real Vue app (the helpers harness'
 * `mountApp`), with the route and inputs as refs so a test can change them.
 */
function mountListQuery(
  read: ListRead,
  route: Ref<ListQueryState>,
  viewer: Ref<string | null>,
  params: Ref<{ q: string }>,
  slug: Ref<string>,
): MountedListQuery {
  let query: Ref<UseQueryResult<string[]>> | undefined
  mountApp(() => {
    query = useListQuery<string[], { viewer: string | null; params: { q: string }; slug: string }>(
      route,
      { viewer, params, slug },
      read,
    )
    return () => null
  })
  return {
    route,
    viewer,
    params,
    slug,
    value: () => query!.value,
  }
}

/**
 * Builds one page's options: a key naming every value and list field, fetched
 * through `fetch` — which therefore sees exactly the keys the cache fetched.
 */
function pageOptions(
  fetch: RowFetch,
  values: ListValues,
  list: ListQueryState,
): QueryOptions<string[]> {
  const key = [
    'items',
    values.viewer,
    values.slug,
    values.params.q,
    list.filters.tag,
    list.pageSize,
    list.offset,
  ] as const
  return { key, fetch: (signal) => fetch(key, signal) }
}

describe('useListQuery', () => {
  it('observes nothing while the viewer is null', async () => {
    const fetch = vi.fn(async (_key: QueryKey, _signal: AbortSignal) => ['a', 'b'])
    const read = vi.fn((values: ListValues, list: ListQueryState) =>
      pageOptions(fetch, values, list),
    )
    const h = mountListQuery(
      read,
      ref<ListQueryState>({ canLoad: true, filters: { tag: 'a' }, pageSize: 10, offset: 20 }),
      ref<string | null>(null),
      ref({ q: 'x' }),
      ref('s1'),
    )
    await settle()
    expect(h.value().status).toBe('idle')
    expect(h.value().data).toBeUndefined()
    expect(read).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('observes nothing while the route cannot load', async () => {
    const fetch = vi.fn(async (_key: QueryKey, _signal: AbortSignal) => ['a', 'b'])
    const read = vi.fn((values: ListValues, list: ListQueryState) =>
      pageOptions(fetch, values, list),
    )
    const h = mountListQuery(
      read,
      ref<ListQueryState>({ canLoad: false, filters: { tag: 'a' }, pageSize: 10, offset: 20 }),
      ref<string | null>('u1'),
      ref({ q: 'x' }),
      ref('s1'),
    )
    await settle()
    expect(h.value().status).toBe('idle')
    expect(h.value().data).toBeUndefined()
    expect(read).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('hands read the current values and the route state, and fetches the page once', async () => {
    const fetch = vi.fn(async (_key: QueryKey, _signal: AbortSignal) => ['a', 'b'])
    const read = vi.fn((values: ListValues, list: ListQueryState) =>
      pageOptions(fetch, values, list),
    )
    const h = mountListQuery(
      read,
      ref<ListQueryState>({ canLoad: true, filters: { tag: 'a' }, pageSize: 10, offset: 20 }),
      ref<string | null>('u1'),
      ref({ q: 'x' }),
      ref('s1'),
    )
    await settle()
    expect(read).toHaveBeenCalledWith(
      { viewer: 'u1', params: { q: 'x' }, slug: 's1' },
      { canLoad: true, filters: { tag: 'a' }, pageSize: 10, offset: 20 },
    )
    expect(h.value().status).toBe('success')
    expect(h.value().data).toEqual(['a', 'b'])
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      ['items', 'u1', 's1', 'x', 'a', 10, 20],
    ])
  })

  it('fetches once when the viewer arrives from null', async () => {
    const fetch = vi.fn(async (_key: QueryKey, _signal: AbortSignal) => ['u1 rows'])
    const read = vi.fn((values: ListValues, list: ListQueryState) =>
      pageOptions(fetch, values, list),
    )
    const viewer = ref<string | null>(null)
    const h = mountListQuery(
      read,
      ref<ListQueryState>({ canLoad: true, filters: { tag: 'a' }, pageSize: 10, offset: 0 }),
      viewer,
      ref({ q: 'x' }),
      ref('s1'),
    )
    await settle()
    expect(h.value().status).toBe('idle')
    expect(h.value().data).toBeUndefined()
    expect(fetch).not.toHaveBeenCalled()
    viewer.value = 'u1'
    await settle()
    expect(h.value().status).toBe('success')
    expect(h.value().data).toEqual(['u1 rows'])
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      ['items', 'u1', 's1', 'x', 'a', 10, 0],
    ])
  })

  it('fetches the new page when the offset changes', async () => {
    const fetch = vi.fn(async (key: QueryKey, _signal: AbortSignal) => [`rows ${String(key[6])}`])
    const read = vi.fn((values: ListValues, list: ListQueryState) =>
      pageOptions(fetch, values, list),
    )
    const route = ref<ListQueryState>({
      canLoad: true,
      filters: { tag: 'a' },
      pageSize: 10,
      offset: 0,
    })
    const h = mountListQuery(read, route, ref<string | null>('u1'), ref({ q: 'x' }), ref('s1'))
    await settle()
    expect(h.value().status).toBe('success')
    expect(h.value().data).toEqual(['rows 0'])
    route.value = { canLoad: true, filters: { tag: 'a' }, pageSize: 10, offset: 10 }
    await settle()
    expect(h.value().status).toBe('success')
    expect(h.value().data).toEqual(['rows 10'])
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      ['items', 'u1', 's1', 'x', 'a', 10, 0],
      ['items', 'u1', 's1', 'x', 'a', 10, 10],
    ])
  })

  it('fetches the new key when a filter changes', async () => {
    const fetch = vi.fn(async (key: QueryKey, _signal: AbortSignal) => [`rows ${String(key[4])}`])
    const read = vi.fn((values: ListValues, list: ListQueryState) =>
      pageOptions(fetch, values, list),
    )
    const route = ref<ListQueryState>({
      canLoad: true,
      filters: { tag: 'a' },
      pageSize: 10,
      offset: 20,
    })
    const h = mountListQuery(read, route, ref<string | null>('u1'), ref({ q: 'x' }), ref('s1'))
    await settle()
    expect(h.value().data).toEqual(['rows a'])
    route.value = { canLoad: true, filters: { tag: 'b' }, pageSize: 10, offset: 20 }
    await settle()
    expect(h.value().status).toBe('success')
    expect(h.value().data).toEqual(['rows b'])
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      ['items', 'u1', 's1', 'x', 'a', 10, 20],
      ['items', 'u1', 's1', 'x', 'b', 10, 20],
    ])
  })

  it('fetches the new key when the params change', async () => {
    const fetch = vi.fn(async (key: QueryKey, _signal: AbortSignal) => [`rows ${String(key[3])}`])
    const read = vi.fn((values: ListValues, list: ListQueryState) =>
      pageOptions(fetch, values, list),
    )
    const params = ref({ q: 'x' })
    const h = mountListQuery(
      read,
      ref<ListQueryState>({ canLoad: true, filters: { tag: 'a' }, pageSize: 10, offset: 20 }),
      ref<string | null>('u1'),
      params,
      ref('s1'),
    )
    await settle()
    expect(h.value().data).toEqual(['rows x'])
    params.value = { q: 'y' }
    await settle()
    expect(h.value().status).toBe('success')
    expect(h.value().data).toEqual(['rows y'])
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      ['items', 'u1', 's1', 'x', 'a', 10, 20],
      ['items', 'u1', 's1', 'y', 'a', 10, 20],
    ])
  })

  it('fetches the new key when the slug input changes', async () => {
    const fetch = vi.fn(async (key: QueryKey, _signal: AbortSignal) => [`rows ${String(key[2])}`])
    const read = vi.fn((values: ListValues, list: ListQueryState) =>
      pageOptions(fetch, values, list),
    )
    const slug = ref('s1')
    const h = mountListQuery(
      read,
      ref<ListQueryState>({ canLoad: true, filters: { tag: 'a' }, pageSize: 10, offset: 20 }),
      ref<string | null>('u1'),
      ref({ q: 'x' }),
      slug,
    )
    await settle()
    expect(h.value().data).toEqual(['rows s1'])
    slug.value = 's2'
    await settle()
    expect(h.value().status).toBe('success')
    expect(h.value().data).toEqual(['rows s2'])
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      ['items', 'u1', 's1', 'x', 'a', 10, 20],
      ['items', 'u1', 's2', 'x', 'a', 10, 20],
    ])
  })

  it('returns to idle when the route stops being loadable, without a new fetch', async () => {
    const fetch = vi.fn(async (_key: QueryKey, _signal: AbortSignal) => ['a', 'b'])
    const read = vi.fn((values: ListValues, list: ListQueryState) =>
      pageOptions(fetch, values, list),
    )
    const route = ref<ListQueryState>({
      canLoad: true,
      filters: { tag: 'a' },
      pageSize: 10,
      offset: 20,
    })
    const h = mountListQuery(read, route, ref<string | null>('u1'), ref({ q: 'x' }), ref('s1'))
    await settle()
    expect(h.value().status).toBe('success')
    expect(h.value().data).toEqual(['a', 'b'])
    route.value = { canLoad: false, filters: { tag: 'a' }, pageSize: 10, offset: 20 }
    await settle()
    expect(h.value().status).toBe('idle')
    expect(h.value().data).toBeUndefined()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      ['items', 'u1', 's1', 'x', 'a', 10, 20],
    ])
  })
})
