// @vitest-environment jsdom
/**
 * Unit tests for `useListQuery`: one cached list read driven by a URL list
 * route and the page's reactive inputs. The route arrives as stores
 * (`canLoad`, `filters`, `pageSize`, `offset`), each input as a plain value or
 * a store, and every case asserts both the observable result and the fetch
 * calls it caused — mounted the way `use-query.test.ts` mounts `useQuery`.
 */
import { writable } from 'svelte/store'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryOptions } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import {
  type ListQueryInputs,
  type ListQueryRoute,
  type ListQueryState,
  useListQuery,
} from '../list-query.js'
import type { UseQueryResult } from '../types.js'
import { renderBare, settle } from './helpers/harness.js'

beforeAll(() => {
  setProvider(provider)
})
beforeEach(() => {
  resetQueryClient()
})

/** The test list page's inputs: the signed-in viewer, its request params and the record's slug. */
interface PageInputs {
  /** The signed-in viewer's id, or null while auth is still being restored. */
  viewer: string | null
  /** The request params the page derives from its own state. */
  params: { q: string }
  /** The parent record's slug. */
  slug: string
}

/** One recorded `read` call: the inputs' values and the route state it saw. */
interface ReadCall {
  /** The inputs' current values, with `viewer` narrowed to a string. */
  values: PageInputs
  /** The route's current list state. */
  list: ListQueryState<'tag'>
}

/** One mounted `useListQuery`: the latest result the returned store published. */
interface MountedListQuery {
  /** The latest result. */
  result: () => UseQueryResult<string[]>
}

/** The mounted hooks, unmounted after every test the way React's roots are. */
const mounted: { unmount: () => Promise<void> }[] = []
afterEach(async () => {
  for (const hook of mounted.splice(0)) await hook.unmount()
})

/**
 * Mounts `useListQuery` in a real component over the given route and inputs and
 * subscribes to the store it returns, the way a page does.
 *
 * @param route - The route stores.
 * @param inputs - Plain values or stores, one per page input.
 * @param read - Builds the page's query options.
 * @returns The mounted observer's accessors.
 */
function mountListQuery(
  route: ListQueryRoute<'tag'>,
  inputs: ListQueryInputs<PageInputs>,
  read: (
    values: PageInputs & { viewer: string },
    list: ListQueryState<'tag'>,
  ) => QueryOptions<string[]>,
): MountedListQuery {
  const bare = renderBare(() => useListQuery<string[], PageInputs, 'tag'>(route, inputs, read))
  let latest!: UseQueryResult<string[]>
  const stop = bare.value().subscribe((value) => {
    latest = value
  })
  const entry = {
    result: (): UseQueryResult<string[]> => latest,
    unmount: async () => {
      stop()
      await bare.unmount()
    },
  }
  mounted.push(entry)
  return { result: entry.result }
}

/**
 * Builds the page fixture: a route at defaults (`canLoad` true, `{ tag: 'a' }`,
 * page size 10, offset 0), writable inputs, and a `read` that records every
 * call, names every dependency in the key, and hands out the one shared fetch
 * mock — so the call counts aggregate across every key the route moves to.
 *
 * @returns The fixture's stores, the fetch mock, the recorded reads and `read`.
 */
function page() {
  /** What the next fetch resolves with, set by `resolveRows`. */
  let rows: string[] = []
  const fetch = vi.fn(async (): Promise<string[]> => [...rows])
  const reads: ReadCall[] = []
  const read = (
    values: PageInputs & { viewer: string },
    list: ListQueryState<'tag'>,
  ): QueryOptions<string[]> => {
    reads.push({
      values: { ...values, params: { ...values.params } },
      list: { ...list, filters: { ...list.filters } },
    })
    return {
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
    }
  }
  return {
    route: {
      canLoad: writable(true),
      filters: writable<{ tag: string | undefined }>({ tag: 'a' }),
      pageSize: writable(10),
      offset: writable(0),
    },
    viewer: writable<string | null>(null),
    params: writable({ q: 'x' }),
    slug: writable('s1'),
    fetch,
    reads,
    read,
    resolveRows: (next: string[]) => {
      rows = next
    },
  }
}

describe('useListQuery', () => {
  it('observes nothing while the viewer is null', async () => {
    const p = page()
    const h = mountListQuery(p.route, { viewer: p.viewer, params: p.params, slug: 's1' }, p.read)
    await settle()
    expect(h.result().status).toBe('idle')
    expect(h.result().data).toBeUndefined()
    expect(p.reads).toEqual([])
    expect(p.fetch).not.toHaveBeenCalled()
  })

  it('observes nothing while the route cannot load', async () => {
    const p = page()
    p.route.canLoad.set(false)
    p.viewer.set('u1')
    const h = mountListQuery(p.route, { viewer: p.viewer, params: p.params, slug: 's1' }, p.read)
    await settle()
    expect(h.result().status).toBe('idle')
    expect(h.result().data).toBeUndefined()
    expect(p.reads).toEqual([])
    expect(p.fetch).not.toHaveBeenCalled()
  })

  it('fetches the page the route points at and delivers its rows', async () => {
    const p = page()
    p.resolveRows(['r1', 'r2'])
    p.viewer.set('u1')
    p.route.offset.set(20)
    const h = mountListQuery(p.route, { viewer: p.viewer, params: p.params, slug: 's1' }, p.read)
    await settle()
    // `read` saw the inputs' current values and the route's list state; the
    // Svelte route checks `canLoad` itself, so the list state names the rest.
    // Svelte's store layer may re-invoke the pure builder for an unchanged
    // state, so every invocation must see exactly this — while the query
    // still fetches the key once.
    const expectedRead = {
      values: { viewer: 'u1', params: { q: 'x' }, slug: 's1' },
      list: { filters: { tag: 'a' }, pageSize: 10, offset: 20 },
    }
    expect(p.reads.length).toBeGreaterThan(0)
    for (const call of p.reads) expect(call).toEqual(expectedRead)
    expect(p.fetch).toHaveBeenCalledTimes(1)
    expect(h.result().status).toBe('success')
    expect(h.result().data).toEqual(['r1', 'r2'])
    expect(getQueryClient().get(['items', 'u1', 's1', 'x', 'a', 10, 20])).toEqual(['r1', 'r2'])
  })

  it('starts fetching when the viewer arrives', async () => {
    const p = page()
    p.resolveRows(['u1 rows'])
    const h = mountListQuery(p.route, { viewer: p.viewer, params: p.params, slug: 's1' }, p.read)
    await settle()
    expect(h.result().status).toBe('idle')
    expect(p.fetch).not.toHaveBeenCalled()
    p.viewer.set('u1')
    await settle()
    expect(p.fetch).toHaveBeenCalledTimes(1)
    expect(h.result().status).toBe('success')
    expect(h.result().data).toEqual(['u1 rows'])
    expect(getQueryClient().get(['items', 'u1', 's1', 'x', 'a', 10, 0])).toEqual(['u1 rows'])
  })

  it('fetches the new page when the offset changes and updates the data', async () => {
    const p = page()
    p.viewer.set('u1')
    p.resolveRows(['page 1'])
    const h = mountListQuery(p.route, { viewer: p.viewer, params: p.params, slug: 's1' }, p.read)
    await settle()
    expect(p.fetch).toHaveBeenCalledTimes(1)
    expect(h.result().data).toEqual(['page 1'])
    p.resolveRows(['page 2'])
    p.route.offset.set(10)
    await settle()
    expect(p.fetch).toHaveBeenCalledTimes(2)
    expect(h.result().status).toBe('success')
    expect(h.result().data).toEqual(['page 2'])
    expect(getQueryClient().get(['items', 'u1', 's1', 'x', 'a', 10, 10])).toEqual(['page 2'])
  })

  it('fetches the new page when a filter changes', async () => {
    const p = page()
    p.viewer.set('u1')
    p.resolveRows(['tagged a'])
    const h = mountListQuery(p.route, { viewer: p.viewer, params: p.params, slug: 's1' }, p.read)
    await settle()
    expect(p.fetch).toHaveBeenCalledTimes(1)
    expect(h.result().data).toEqual(['tagged a'])
    p.resolveRows(['tagged b'])
    p.route.filters.set({ tag: 'b' })
    await settle()
    expect(p.fetch).toHaveBeenCalledTimes(2)
    expect(h.result().data).toEqual(['tagged b'])
    expect(getQueryClient().get(['items', 'u1', 's1', 'x', 'b', 10, 0])).toEqual(['tagged b'])
  })

  it('fetches the new page when the params change', async () => {
    const p = page()
    p.viewer.set('u1')
    p.resolveRows(['q x rows'])
    const h = mountListQuery(p.route, { viewer: p.viewer, params: p.params, slug: 's1' }, p.read)
    await settle()
    expect(p.fetch).toHaveBeenCalledTimes(1)
    expect(h.result().data).toEqual(['q x rows'])
    p.resolveRows(['q y rows'])
    p.params.set({ q: 'y' })
    await settle()
    expect(p.fetch).toHaveBeenCalledTimes(2)
    expect(h.result().data).toEqual(['q y rows'])
    expect(getQueryClient().get(['items', 'u1', 's1', 'y', 'a', 10, 0])).toEqual(['q y rows'])
  })

  it('fetches the new page when the slug input store changes', async () => {
    const p = page()
    p.viewer.set('u1')
    p.resolveRows(['s1 rows'])
    const h = mountListQuery(p.route, { viewer: p.viewer, params: p.params, slug: p.slug }, p.read)
    await settle()
    expect(p.fetch).toHaveBeenCalledTimes(1)
    expect(h.result().data).toEqual(['s1 rows'])
    p.resolveRows(['s2 rows'])
    p.slug.set('s2')
    await settle()
    expect(p.fetch).toHaveBeenCalledTimes(2)
    expect(h.result().status).toBe('success')
    expect(h.result().data).toEqual(['s2 rows'])
    expect(getQueryClient().get(['items', 'u1', 's2', 'x', 'a', 10, 0])).toEqual(['s2 rows'])
  })

  it('returns to idle without fetching when the route can no longer load', async () => {
    const p = page()
    p.viewer.set('u1')
    p.resolveRows(['r1'])
    const h = mountListQuery(p.route, { viewer: p.viewer, params: p.params, slug: 's1' }, p.read)
    await settle()
    expect(p.fetch).toHaveBeenCalledTimes(1)
    expect(h.result().status).toBe('success')
    const readsWhileEnabled = p.reads.length
    p.route.canLoad.set(false)
    await settle()
    expect(h.result().status).toBe('idle')
    expect(h.result().data).toBeUndefined()
    expect(p.fetch).toHaveBeenCalledTimes(1)
    // No read happens for a disabled route: nothing new is built or fetched.
    expect(p.reads).toHaveLength(readsWhileEnabled)
  })
})
