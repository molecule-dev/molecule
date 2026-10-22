// @vitest-environment jsdom

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  BrowserRouter,
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { configureQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryQuery } from '@molecule/app-query-memory'
import { useQuery } from '@molecule/app-query-react'

import type { ListRouteOptions, ListRouteResult } from '../list-types.js'
import { useListRoute } from '../useListRoute.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let root: Root | undefined
let host: HTMLDivElement

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  resetQueryClient()
  setProvider(memoryQuery)
  configureQueryClient({ gcMs: 0 })
})

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  resetQueryClient()
  configureQueryClient(undefined)
  host.remove()
})

/** Settle actual React effects and cache notifications; no routing or query mocks. */
async function settle(): Promise<void> {
  for (let i = 0; i < 4; i += 1) await act(async () => {})
}

/** A real mounted consumer: links, imperative pagination, API query and browser history. */
function mount<Filter extends string, Selection extends string>(
  initial: string,
  options: ListRouteOptions<Filter, Selection>,
  browser = false,
): {
  list: () => ListRouteResult<Filter, Selection>
  url: () => string
  state: () => unknown
  data: () => unknown
  fetch: ReturnType<typeof vi.fn>
  click: (id: string) => Promise<void>
  go: (to: string | number) => Promise<void>
  render: () => Promise<void>
} {
  let current!: ListRouteResult<Filter, Selection>
  let currentUrl = ''
  let currentState: unknown
  let data: unknown
  let go!: ReturnType<typeof useNavigate>
  const fetch = vi.fn(async (request: unknown) => request)

  function Page(): ReactNode {
    current = useListRoute(options)
    const location = useLocation()
    go = useNavigate()
    currentUrl = location.pathname + location.search + location.hash
    currentState = location.state
    const request = {
      selection: current.selection,
      filters: current.filters,
      params: current.params,
      limit: current.pageSize,
      offset: current.offset,
    }
    const query = useQuery(
      current.canLoad
        ? {
            key: ['entries', options.auth?.status ?? 'public', request],
            fetch: () => fetch(request),
          }
        : null,
    )
    data = query.data
    return (
      <>
        <output data-state="page">{current.page}</output>
        <Link id="next" to={current.href({ page: current.page + 1 })}>
          Next
        </Link>
        <button id="previous" onClick={() => current.setPage(Math.max(1, current.page - 1))}>
          Previous
        </button>
        {Object.keys(options.selections ?? {}).map((selection) => (
          <Link
            id={selection}
            key={selection}
            to={current.href({ selection: selection as Selection })}
          >
            {selection}
          </Link>
        ))}
      </>
    )
  }

  function App(): ReactNode {
    const routes = (
      <Routes>
        <Route path="*" element={<Page />} />
      </Routes>
    )
    return browser ? (
      <BrowserRouter>{routes}</BrowserRouter>
    ) : (
      <MemoryRouter
        initialEntries={[
          {
            pathname: initial.split(/[?#]/)[0],
            search: initial.includes('?') ? `?${initial.split('?')[1].split('#')[0]}` : '',
            hash: initial.includes('#') ? `#${initial.split('#')[1]}` : '',
            state: { source: 'existing-state' },
          },
        ]}
      >
        {routes}
      </MemoryRouter>
    )
  }
  if (browser) window.history.replaceState({ source: 'existing-state' }, '', initial)
  root = createRoot(host)
  act(() => root!.render(<App />))
  return {
    list: () => current,
    url: () => currentUrl,
    state: () => currentState,
    data: () => data,
    fetch,
    click: async (id) => {
      await act(async () => host.querySelector<HTMLElement>(`#${id}`)!.click())
      await settle()
    },
    go: async (to) => {
      await act(async () => {
        if (typeof to === 'number') void go(to)
        else void go(to)
      })
      await settle()
    },
    render: async () => {
      await act(async () => root!.render(<App />))
      await settle()
    },
  }
}

describe('URL-backed list consumer transitions', () => {
  it('retains a path-backed filter, repeated/unrelated query values and hash in real page links', async () => {
    const app = mount('/topics/type%20systems?sort=oldest&track=a&track=b#results', {
      path: '/topics/:topic',
      filters: { topic: { param: 'topic' }, sort: { query: 'sort' } },
      pageSize: 10,
    })
    await settle()
    expect(app.list().filters).toEqual({ topic: 'type systems', sort: 'oldest' })
    expect(host.querySelector('#next')!.getAttribute('href')).toBe(
      '/topics/type%20systems?sort=oldest&track=a&track=b&page=2#results',
    )
    await app.click('next')
    expect(app.url()).toBe('/topics/type%20systems?sort=oldest&track=a&track=b&page=2#results')
    expect(app.data()).toMatchObject({ filters: { topic: 'type systems' }, limit: 10, offset: 10 })
    await app.go(-1)
    expect(app.list().page).toBe(1)
    await app.go(1)
    expect(app.list().page).toBe(2)
    expect(app.list().filters.topic).toBe('type systems')
  })

  it('resets page on filter changes atomically and preserves history state for imperative navigation', async () => {
    const app = mount('/topics/design?sort=oldest&page=4&track=a#results', {
      path: '/topics/:topic',
      filters: { topic: { param: 'topic' }, sort: { defaultValue: 'newest' } },
    })
    await settle()
    await act(async () => app.list().setFilters({ sort: 'newest' }))
    await settle()
    expect(app.url()).toBe('/topics/design?track=a#results')
    expect(app.state()).toEqual({ source: 'existing-state' })
    expect(app.data()).toMatchObject({ filters: { topic: 'design', sort: 'newest' }, offset: 0 })
    // The old page/filter combination must never be fetched in between.
    expect(app.fetch.mock.calls.map(([request]) => request.offset)).toEqual([60, 0])
    await act(async () => app.list().setFilters({ topic: 'C++ / types' }))
    await settle()
    expect(app.url()).toBe('/topics/C%2B%2B%20%2F%20types?track=a#results')
    expect(app.list().filters.topic).toBe('C++ / types')
    await app.go(-1)
    expect(app.list().filters.topic).toBe('design')
  })

  it('uses declared path selections, retains encoded owner params, and pages inside the selected path', async () => {
    const app = mount('/members/Ada%20L?sort=oldest&page=3', {
      filters: { sort: { query: 'sort' } },
      selections: {
        authored: { path: '/members/:member' },
        saved: { path: '/members/:member/saved' },
      },
      defaultSelection: 'authored',
    })
    await settle()
    await app.click('saved')
    expect(app.url()).toBe('/members/Ada%20L/saved?sort=oldest')
    expect(app.list().selection).toBe('saved')
    expect(app.list().params.member).toBe('Ada L')
    await app.click('next')
    expect(app.url()).toBe('/members/Ada%20L/saved?sort=oldest&page=2')
    expect(app.data()).toMatchObject({
      selection: 'saved',
      params: { member: 'Ada L' },
      offset: 20,
    })
    await app.go(-1)
    expect(app.list().page).toBe(1)
    await app.go(-1)
    expect(app.list().selection).toBe('authored')
    expect(app.list().page).toBe(3)
  })

  it('keeps explicit public selection on login and allows returning from private to public', async () => {
    const options: ListRouteOptions<'sort', 'public' | 'personal'> = {
      filters: { sort: { query: 'sort' } },
      selections: {
        public: { path: '/stream', query: { view: undefined } },
        personal: { path: '/stream', query: { view: 'personal' }, requiresAuth: true },
      },
      auth: { status: 'loading', redirectTo: '/sign-in' },
    }
    const app = mount('/stream?sort=recent&page=4', options)
    await settle()
    options.auth!.status = 'authenticated'
    await app.render()
    expect(app.url()).toBe('/stream?sort=recent&page=4')
    expect(app.list().selection).toBe('public')
    await app.click('personal')
    expect(app.url()).toBe('/stream?sort=recent&view=personal')
    await app.click('next')
    expect(app.url()).toBe('/stream?sort=recent&view=personal&page=2')
    await app.click('public')
    expect(app.url()).toBe('/stream?sort=recent')
    expect(app.list().selection).toBe('public')
    expect(app.list().page).toBe(1)
  })

  it('waits for auth and never requests a protected feed before redirecting a signed-out visitor', async () => {
    const options: ListRouteOptions<string, 'public' | 'personal'> = {
      selections: {
        public: { path: '/stream', query: { view: undefined } },
        personal: { path: '/stream', query: { view: 'personal' }, requiresAuth: true },
      },
      auth: { status: 'loading', redirectTo: '/sign-in' },
    }
    const app = mount('/stream?view=personal&page=2#entries', options)
    await settle()
    expect(app.list().status).toBe('loading')
    expect(app.list().canLoad).toBe(false)
    expect(app.fetch).not.toHaveBeenCalled()
    expect(app.url()).toBe('/stream?view=personal&page=2#entries')
    options.auth!.status = 'unavailable'
    await app.render()
    expect(app.list().status).toBe('unavailable')
    expect(app.url()).toBe('/stream?view=personal&page=2#entries')
    options.auth!.status = 'unauthenticated'
    await app.render()
    expect(app.url()).toBe('/sign-in')
    expect(app.state()).toEqual({ returnTo: '/stream?view=personal&page=2#entries' })
    // No request for the protected selection was sent, even during auth changes.
    expect(app.fetch.mock.calls.some(([request]) => request.selection === 'personal')).toBe(false)
    await app.go(-1)
    expect(app.url()).toBe('/sign-in') // redirect replaced, rather than appended, the protected entry
  })

  it('loads the original protected URL after successful restoration without rewriting page or selection', async () => {
    const options: ListRouteOptions<string, 'personal'> = {
      selections: {
        personal: { path: '/stream', query: { view: 'personal' }, requiresAuth: true },
      },
      auth: { status: 'loading', redirectTo: '/sign-in' },
    }
    const app = mount('/stream?view=personal&page=2', options)
    await settle()
    expect(app.fetch).not.toHaveBeenCalled()
    options.auth!.status = 'authenticated'
    await app.render()
    expect(app.url()).toBe('/stream?view=personal&page=2')
    expect(app.data()).toMatchObject({ selection: 'personal', offset: 20 })
  })

  it('mounts and navigates under ordinary BrowserRouter without requiring a data router', async () => {
    const app = mount('/topics/design?status=open', { filters: { status: {} } }, true)
    await settle()
    await app.click('next')
    expect(window.location.pathname).toBe('/topics/design')
    expect(app.url()).toBe('/topics/design?status=open&page=2')
    await app.click('previous')
    expect(app.url()).toBe('/topics/design?status=open')
  })

  it.each(['0', '-1', '2oops', '1.5', '9007199254740992'])(
    'reads invalid page %s as one',
    async (page) => {
      const app = mount(`/topics/design?page=${page}`, {})
      await settle()
      expect(app.list().page).toBe(1)
      expect(app.list().offset).toBe(0)
    },
  )

  it('supports an explicit page in a combined filter change and removes only owned filter keys', async () => {
    const app = mount('/browse?sort=recent&owner=8&page=4', { filters: { sort: {} } })
    await settle()
    await act(async () => app.list().navigate({ filters: { sort: undefined }, page: 2 }))
    await settle()
    expect(app.url()).toBe('/browse?owner=8&page=2')
    expect(app.list().filters.sort).toBeUndefined()
    expect(() => app.list().href({ page: 0 })).toThrow('positive safe integer')
  })
})
