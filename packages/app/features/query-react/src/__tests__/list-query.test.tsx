/**
 * The list contract of `useListQuery`, driven through React and the memory query bond: the
 * observer stays idle (`null`, no request) while the viewer is still restoring or the route
 * cannot load, hands `read` the current value of every input plus the route's filters, page
 * size and offset, and moves the same mounted observer to the new key when any of them changes.
 * The Vue, Solid, Svelte and Angular bindings carry the same tests.
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryOptions } from '@molecule/app-query'
import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { type ListQueryRoute, type ListQueryState, useListQuery } from '../list-query.js'
import type { UseQueryResult } from '../types.js'

beforeAll(() => {
  setProvider(provider)
})
beforeEach(() => {
  resetQueryClient()
})

let root: Root | null = null
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
})

/** Lets promise callbacks and cache notifications land. */
async function settle(): Promise<void> {
  for (let i = 0; i < 4; i += 1) await act(async () => {})
}

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

/** What one render of the probe hands the hook. */
interface ProbeProps {
  /** The list route, the shape `useListRoute` returns. */
  route: ListQueryRoute<'tag'>
  /** The hook's inputs. */
  inputs: TestInputs
  /** The page's `read`. */
  read: (values: LoadedInputs, list: TagListState) => QueryOptions<string[]>
}

/**
 * Mounts a component that calls `useListQuery` with the given props, and re-renders it with new
 * ones the way a parent passing a changed route or input does.
 *
 * @param initial - The first render's props.
 * @returns The latest hook result and a re-render with changed props.
 */
function mount(initial: ProbeProps): {
  value: () => UseQueryResult<string[]>
  rerender: (next: Partial<ProbeProps>) => Promise<void>
} {
  let latest: UseQueryResult<string[]> | undefined
  /**
   * Calls the hook and records its result.
   *
   * @param props - The hook's arguments.
   * @returns Nothing visible.
   */
  function Probe(props: ProbeProps): null {
    latest = useListQuery<string[], TestInputs, 'tag'>(props.route, props.inputs, props.read)
    return null
  }
  let props = initial
  const host = document.createElement('div')
  root = createRoot(host)
  act(() => root!.render(createElement(Probe, props)))
  return {
    value: () => {
      if (!latest) throw new Error('the probe has not rendered')
      return latest
    },
    rerender: async (next) => {
      props = { ...props, ...next }
      act(() => root!.render(createElement(Probe, props)))
      await settle()
    },
  }
}

/**
 * A loadable route with the `tag` filter set, 10 items per page, offset 0, changed by `init`.
 *
 * @param init - The values to change.
 * @returns The route.
 */
const routeOf = (init: Partial<ListQueryRoute<'tag'>> = {}): ListQueryRoute<'tag'> => ({
  canLoad: true,
  filters: { tag: 'a' },
  pageSize: 10,
  offset: 0,
  ...init,
})

/**
 * Builds the page's `read`: the query options name everything the answer depends on — the
 * viewer, the slug, the search term and the route's filter, page size and offset — and share
 * the test's fetch mock.
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

const loaded: TestInputs = { viewer: 'u1', params: { q: 'x' }, slug: 's1' }

describe('useListQuery', () => {
  it('observes nothing while the viewer is null', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => ['row'])
    const read = vi.fn(readItems(fetch))
    const h = mount({ route: routeOf(), inputs: { ...loaded, viewer: null }, read })
    expect(h.value().status).toBe('idle')
    expect(h.value().data).toBeUndefined()
    expect(read).not.toHaveBeenCalled()
    await h.rerender({})
    expect(fetch).not.toHaveBeenCalled()
  })

  it('observes nothing while the route cannot load', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => ['row'])
    const read = vi.fn(readItems(fetch))
    const h = mount({ route: routeOf({ canLoad: false }), inputs: loaded, read })
    expect(h.value().status).toBe('idle')
    expect(read).not.toHaveBeenCalled()
    await h.rerender({})
    expect(fetch).not.toHaveBeenCalled()
  })

  it('hands read the current values and the route state, and fetches the page once', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => ['row-1'])
    const read = vi.fn(readItems(fetch))
    const h = mount({
      route: routeOf({ filters: { tag: 'a' }, pageSize: 10, offset: 20 }),
      inputs: loaded,
      read,
    })
    expect(read).toHaveBeenCalledWith(
      { viewer: 'u1', params: { q: 'x' }, slug: 's1' },
      { filters: { tag: 'a' }, pageSize: 10, offset: 20 },
    )
    await h.rerender({})
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(h.value().status).toBe('success')
    expect(h.value().data).toEqual(['row-1'])
    expect(getQueryClient().get<string[]>(['items', 'u1', 's1', 'x', 'a', 10, 20])).toEqual([
      'row-1',
    ])
  })

  it('fetches once when the viewer arrives from null', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => ['u1 rows'])
    const h = mount({
      route: routeOf(),
      inputs: { ...loaded, viewer: null },
      read: readItems(fetch),
    })
    expect(h.value().status).toBe('idle')
    await h.rerender({ inputs: loaded })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(h.value().status).toBe('success')
    expect(h.value().data).toEqual(['u1 rows'])
    expect(getQueryClient().get<string[]>(['items', 'u1', 's1', 'x', 'a', 10, 0])).toEqual([
      'u1 rows',
    ])
  })

  it('fetches the new page when the offset changes', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => [`page ${fetch.mock.calls.length}`])
    const h = mount({ route: routeOf({ offset: 0 }), inputs: loaded, read: readItems(fetch) })
    await h.rerender({})
    expect(h.value().status).toBe('success')
    expect(h.value().data).toEqual(['page 1'])
    await h.rerender({ route: routeOf({ offset: 10 }) })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(h.value().data).toEqual(['page 2'])
    expect(getQueryClient().get<string[]>(['items', 'u1', 's1', 'x', 'a', 10, 10])).toEqual([
      'page 2',
    ])
  })

  it('fetches the new key when a filter changes', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => [`rows ${fetch.mock.calls.length}`])
    const h = mount({
      route: routeOf({ filters: { tag: 'a' } }),
      inputs: loaded,
      read: readItems(fetch),
    })
    await h.rerender({})
    expect(h.value().data).toEqual(['rows 1'])
    await h.rerender({ route: routeOf({ filters: { tag: 'b' } }) })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(h.value().data).toEqual(['rows 2'])
    expect(getQueryClient().get<string[]>(['items', 'u1', 's1', 'x', 'b', 10, 0])).toEqual([
      'rows 2',
    ])
  })

  it('fetches the new key when the params change', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => [`rows ${fetch.mock.calls.length}`])
    const h = mount({ route: routeOf(), inputs: loaded, read: readItems(fetch) })
    await h.rerender({})
    expect(h.value().data).toEqual(['rows 1'])
    await h.rerender({ inputs: { ...loaded, params: { q: 'y' } } })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(h.value().data).toEqual(['rows 2'])
    expect(getQueryClient().get<string[]>(['items', 'u1', 's1', 'y', 'a', 10, 0])).toEqual([
      'rows 2',
    ])
  })

  it('fetches the new key when the slug input changes', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => [`rows ${fetch.mock.calls.length}`])
    const h = mount({ route: routeOf(), inputs: loaded, read: readItems(fetch) })
    await h.rerender({})
    expect(h.value().data).toEqual(['rows 1'])
    await h.rerender({ inputs: { ...loaded, slug: 's2' } })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(h.value().data).toEqual(['rows 2'])
    expect(getQueryClient().get<string[]>(['items', 'u1', 's2', 'x', 'a', 10, 0])).toEqual([
      'rows 2',
    ])
  })

  it('returns to idle when the route stops being loadable, without a new fetch', async () => {
    const fetch = vi.fn(async (): Promise<string[]> => ['row-1'])
    const h = mount({ route: routeOf(), inputs: loaded, read: readItems(fetch) })
    await h.rerender({})
    expect(h.value().status).toBe('success')
    expect(fetch).toHaveBeenCalledTimes(1)
    await h.rerender({ route: routeOf({ canLoad: false }) })
    expect(h.value().status).toBe('idle')
    expect(h.value().data).toBeUndefined()
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
