// @vitest-environment jsdom
/**
 * The titles of React's `list-route.integration.test.tsx`, over this bond's real Solid
 * Router. `MemoryRouter` runs on `createSolidMemoryHistory` (its entries keep state) with
 * `MoleculeRouterProvider` so the molecule router reads that state; the title that names
 * an ordinary browser mount runs under `<Router>` with no molecule provider.
 *
 * Solid runs a component body once, so the hook's accessors are snapshotted into a plain
 * object after each change (what React re-renders) and `app.render()` re-resolves the
 * options through a signal (what React's re-render does after a mutated auth status).
 */
import type { Navigator } from '@solidjs/router'
import {
  A,
  MemoryRouter,
  Route,
  Router,
  type RouteSectionProps,
  useLocation,
  useNavigate,
} from '@solidjs/router'
import { createEffect, createMemo, createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Router as MoleculeRouter } from '@molecule/app-routing'
import { getRouter, setRouter } from '@molecule/app-routing'

import { useMoleculeRouter } from '../hooks.jsx'
import type { ListRouteOptions, ListRouteResult } from '../list-types.js'
import { createSolidMemoryHistory } from '../memory-history.js'
import { MoleculeRouterProvider } from '../provider-component.jsx'
import { useConsumedSearchParam } from '../use-consumed-search-param.js'
import type { UseListRouteResult } from '../use-list-route.js'
import { useListRoute } from '../use-list-route.js'

const originalBond = getRouter()
const disposers: (() => void)[] = []
const hosts: HTMLDivElement[] = []

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  for (const host of hosts.splice(0)) host.remove()
  window.history.replaceState(null, '', '/')
  // A mounted provider bonds this router globally; put the previous bond back.
  setRouter(originalBond)
})

/** Flushes macrotasks so a navigation in flight and the reads it started settle. */
async function settle(): Promise<void> {
  for (let round = 0; round < 4; round += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

/** How a mounted list consumer is observed by a test. */
interface Mounted<Filter extends string, Selection extends string> {
  /** The latest plain snapshot of the hook's state and actions. */
  list: () => ListRouteResult<Filter, Selection>
  /** The native router's current path. */
  url: () => string
  /** The current entry's app state, as the molecule router reads it. */
  state: () => unknown
  /** The result of the last collection request. */
  data: () => unknown
  /** The collection request spy. */
  fetch: ReturnType<typeof vi.fn>
  /** Clicks the element with this id, then settles. */
  click: (id: string) => Promise<void>
  /** Moves the native history to a path or by a delta, then settles. */
  go: (to: string | number) => Promise<void>
  /** Re-resolves the options (React's re-render after an auth status change). */
  render: () => Promise<void>
}

/** A real mounted consumer: links, imperative pagination, a collection read and history. */
function mount<Filter extends string, Selection extends string>(
  initial: string,
  options: ListRouteOptions<Filter, Selection>,
  browser = false,
): Mounted<Filter, Selection> {
  const host = document.createElement('div')
  document.body.append(host)
  hosts.push(host)

  let current!: ListRouteResult<Filter, Selection>
  let bound!: MoleculeRouter
  let navigate!: Navigator
  let data: unknown
  const fetch = vi.fn(async (request: unknown) => request)
  const history = createSolidMemoryHistory([initial])
  const [tick, setTick] = createSignal(0)

  // What React's re-render does: every resolution re-reads the (possibly mutated) options.
  const readOptions = (): ListRouteOptions<Filter, Selection> => {
    tick()
    return options
  }

  function Page(): JSX.Element {
    const list = useListRoute<Filter, Selection>(readOptions)
    navigate = useNavigate()
    const snapshot = createMemo<ListRouteResult<Filter, Selection>>(() => ({
      page: list.page(),
      pageSize: list.pageSize(),
      offset: list.offset(),
      filters: list.filters(),
      selection: list.selection(),
      params: list.params(),
      canLoad: list.canLoad(),
      status: list.status(),
      redirectTo: list.redirectTo(),
      href: list.href,
      navigate: list.navigate,
      setPage: list.setPage,
      setFilters: list.setFilters,
      select: list.select,
    }))
    // Set during setup as well as in the effect: a redirect can unmount the page on the
    // first flush, and React's test had read its last render by then.
    current = snapshot()
    createEffect(() => {
      current = snapshot()
    })
    let lastKey = ''
    createEffect(() => {
      const state = snapshot()
      if (!state.canLoad) return
      const request = {
        selection: state.selection,
        filters: state.filters,
        params: state.params,
        limit: state.pageSize,
        offset: state.offset,
      }
      const key = JSON.stringify(request)
      if (key === lastKey) return
      lastKey = key
      data = undefined
      void fetch(request).then((value) => {
        data = value
      })
    })
    return (
      <>
        <output data-state="page">{snapshot().page}</output>
        <A id="next" href={snapshot().href({ page: snapshot().page + 1 })}>
          Next
        </A>
        <button id="previous" onClick={() => snapshot().setPage(Math.max(1, snapshot().page - 1))}>
          Previous
        </button>
        {Object.keys(options.selections ?? {}).map((selection) => (
          <A id={selection} href={snapshot().href({ selection: selection as Selection })}>
            {selection}
          </A>
        ))}
      </>
    )
  }

  const SignIn = (): JSX.Element => <output>Sign in</output>

  function Capture(): null {
    bound = useMoleculeRouter()
    return null
  }

  const memoryRoot = (props: RouteSectionProps): JSX.Element => (
    <MoleculeRouterProvider history={history}>
      <Capture />
      {props.children}
    </MoleculeRouterProvider>
  )
  const browserRoot = (props: RouteSectionProps): JSX.Element => (
    <>
      <Capture />
      {props.children}
    </>
  )

  if (browser) window.history.replaceState({ source: 'existing-state' }, '', initial)
  // The JSX is built inside the render thunk: Solid creates components eagerly, so an
  // element built before `render` would sit outside the root and never be cleaned up.
  disposers.push(
    render(
      () =>
        browser ? (
          <Router root={browserRoot}>
            <Route path="/sign-in" component={SignIn} />
            <Route path="*" component={Page} />
          </Router>
        ) : (
          <MemoryRouter history={history} root={memoryRoot}>
            <Route path="/sign-in" component={SignIn} />
            <Route path="*" component={Page} />
          </MemoryRouter>
        ),
      host,
    ),
  )

  return {
    list: () => current,
    url: () => {
      const location = bound.getLocation()
      return location.pathname + location.search + location.hash
    },
    state: () => bound.getLocation().state,
    data: () => data,
    fetch,
    click: async (id) => {
      host.querySelector<HTMLElement>(`#${id}`)!.click()
      await settle()
    },
    go: async (to) => {
      navigate(to)
      await settle()
    },
    render: async () => {
      setTick((value) => value + 1)
      await settle()
    },
  }
}

describe('URL-backed list consumer transitions', () => {
  it('paginates a route-param path without selections, filters or a path option', async () => {
    let list!: UseListRouteResult
    function Category(): JSX.Element {
      list = useListRoute()
      return (
        <A id="next" href={list.href({ page: 2 })}>
          Next
        </A>
      )
    }
    const history = createSolidMemoryHistory(['/category/books'])
    const host = document.createElement('div')
    document.body.append(host)
    hosts.push(host)
    disposers.push(
      render(
        () => (
          <MemoryRouter
            history={history}
            root={(props: RouteSectionProps) => (
              <MoleculeRouterProvider history={history}>{props.children}</MoleculeRouterProvider>
            )}
          >
            <Route path="/category/:slug" component={Category} />
          </MemoryRouter>
        ),
        host,
      ),
    )
    await settle()
    expect(list.params()).toEqual({ slug: 'books' })
    expect(list.filters()).toEqual({})
    expect(list.selection()).toBeUndefined()
    expect(host.querySelector('#next')!.getAttribute('href')).toBe('/category/books?page=2')
    host.querySelector<HTMLElement>('#next')!.click()
    await settle()
    expect(list.page()).toBe(2)
    expect(list.offset()).toBe(20)
    expect(list.params()).toEqual({ slug: 'books' })
    expect(list.href({ page: 1 })).toBe('/category/books')
  })

  it('puts page after existing query keys and resets it in a selection link', async () => {
    const app = mount('/?view=mine&page=4', {
      selections: { all: { path: '/' }, mine: { path: '/', query: { view: 'mine' } } },
    })
    await settle()
    expect(app.list().href({ page: 2 })).toBe('/?view=mine&page=2')
    expect(app.list().href({ selection: 'all' })).toBe('/')
    await app.click('all')
    expect(app.list()).toMatchObject({ page: 1, selection: 'all', offset: 0 })
    expect(app.fetch.mock.calls.map(([request]) => request.offset)).toEqual([60, 0])
  })

  it('keeps a one-time token beside list pagination while removing it from the address', async () => {
    let list!: UseListRouteResult
    let token: string | undefined
    let url = ''
    function Invitations(): JSX.Element {
      list = useListRoute()
      const consumed = useConsumedSearchParam('token')
      const location = useLocation()
      createEffect(() => {
        token = consumed[0]
        url = location.pathname + location.search
      })
      return (
        <A id="next" href={list.href({ page: 3 })}>
          Next
        </A>
      )
    }
    const history = createSolidMemoryHistory([
      '/invitations?view=mine&page=2&token=one-time&track=a',
    ])
    const host = document.createElement('div')
    document.body.append(host)
    hosts.push(host)
    disposers.push(
      render(
        () => (
          <MemoryRouter
            history={history}
            root={(props: RouteSectionProps) => (
              <MoleculeRouterProvider history={history}>{props.children}</MoleculeRouterProvider>
            )}
          >
            <Route path="*" component={Invitations} />
          </MemoryRouter>
        ),
        host,
      ),
    )
    await settle()
    expect(token).toBe('one-time')
    expect(url).toBe('/invitations?view=mine&page=2&track=a')
    expect(list.page()).toBe(2)
    expect(list.offset()).toBe(20)
    expect(list.href({ page: 3 })).toBe('/invitations?view=mine&track=a&page=3')
    host.querySelector<HTMLElement>('#next')!.click()
    await settle()
    expect(list.page()).toBe(3)
    expect(token).toBe('one-time')
    expect(url).toBe('/invitations?view=mine&track=a&page=3')
  })

  it('retains a path-backed filter, repeated/unrelated query values and hash in real page links', async () => {
    const app = mount('/topics/type%20systems?sort=oldest&track=a&track=b#results', {
      path: '/topics/:topic',
      filters: { topic: { param: 'topic' }, sort: { query: 'sort' } },
      pageSize: 10,
    })
    await settle()
    expect(app.list().filters).toEqual({ topic: 'type systems', sort: 'oldest' })
    expect(document.querySelector('#next')!.getAttribute('href')).toBe(
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
    const app = mount(
      '/topics/design?sort=oldest&page=4&track=a#results',
      {
        path: '/topics/:topic',
        filters: { topic: { param: 'topic' }, sort: { defaultValue: 'newest' } },
      },
      true,
    )
    await settle()
    app.list().setFilters({ sort: 'newest' })
    await settle()
    expect(app.url()).toBe('/topics/design?track=a#results')
    expect(app.state()).toEqual({ source: 'existing-state' })
    expect(app.data()).toMatchObject({ filters: { topic: 'design', sort: 'newest' }, offset: 0 })
    // The old page/filter combination must never be fetched in between.
    expect(app.fetch.mock.calls.map(([request]) => request.offset)).toEqual([60, 0])
    app.list().setFilters({ topic: 'C++ / types' })
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
    app.list().navigate({ filters: { sort: undefined }, page: 2 })
    await settle()
    expect(app.url()).toBe('/browse?owner=8&page=2')
    expect(app.list().filters.sort).toBeUndefined()
    expect(() => app.list().href({ page: 0 })).toThrow('positive safe integer')
  })

  it('supports a catalog direct page, category pagination and atomic filter/view resets', async () => {
    const app = mount<'category' | 'sort', 'catalog' | 'orders'>(
      '/products/category/chairs?sort=price&page=3',
      {
        pageSize: 10,
        filters: { category: { param: 'category' }, sort: { defaultValue: 'featured' } },
        selections: {
          catalog: { path: '/products/category/:category', query: { view: undefined } },
          orders: {
            path: '/products/category/:category',
            query: { view: 'mine' },
            requiresAuth: true,
          },
        },
        defaultSelection: 'catalog',
        auth: { status: 'authenticated', redirectTo: '/sign-in' },
      },
    )
    await settle()
    // A direct ?page=N load derives both the visible page and the request offset from the URL.
    expect(app.list().page).toBe(3)
    expect(app.data()).toMatchObject({
      selection: 'catalog',
      filters: { category: 'chairs', sort: 'price' },
      offset: 20,
    })
    app.list().setFilters({ sort: 'newest' })
    await settle()
    expect(app.url()).toBe('/products/category/chairs?sort=newest')
    expect(app.list().page).toBe(1)
    await app.click('next')
    expect(app.url()).toBe('/products/category/chairs?sort=newest&page=2')
    expect(app.data()).toMatchObject({ filters: { category: 'chairs' }, offset: 10 })
    await app.click('orders')
    expect(app.url()).toBe('/products/category/chairs?sort=newest&view=mine')
    expect(app.list()).toMatchObject({ page: 1, selection: 'orders', canLoad: true })
  })

  it('redirects a signed-out catalog orders view without loading it', async () => {
    const app = mount<'category', 'catalog' | 'orders'>(
      '/products/category/chairs?view=mine&page=2',
      {
        filters: { category: { param: 'category' } },
        selections: {
          catalog: { path: '/products/category/:category', query: { view: undefined } },
          orders: {
            path: '/products/category/:category',
            query: { view: 'mine' },
            requiresAuth: true,
          },
        },
        defaultSelection: 'catalog',
        auth: { status: 'unauthenticated', redirectTo: '/sign-in' },
      },
    )
    await settle()
    expect(app.list().canLoad).toBe(false)
    expect(app.fetch).not.toHaveBeenCalled()
    expect(app.url()).toBe('/sign-in')
    expect(app.state()).toEqual({
      returnTo: '/products/category/chairs?view=mine&page=2',
    })
  })

  // One page mounted on `/` and `/topics/:topic`, as in the package docs' feed example. When each
  // route used its own options, the "all" link on a topic page could not come from `href` and
  // hand-built links kept the topic (xr-molecule-flash-l1852, l1853, l1861).
  it('serves query views and a path view from one config, so every view link is built by href', async () => {
    let current!: UseListRouteResult<never, 'all' | 'following' | 'topic'>
    let currentUrl = ''
    function Feed(): JSX.Element {
      current = useListRoute({
        pageSize: 10,
        selections: {
          all: { path: '/', query: { view: undefined } },
          following: { path: '/', query: { view: 'following' } },
          topic: { path: '/topics/:topic' },
        },
        defaultSelection: 'all',
      })
      const location = useLocation()
      createEffect(() => {
        currentUrl = location.pathname + location.search
      })
      return (
        <>
          <A id="all" href={current.href({ selection: 'all' })}>
            all
          </A>
          <A id="following" href={current.href({ selection: 'following' })}>
            following
          </A>
          <A id="next" href={current.href({ page: current.page() + 1 })}>
            next
          </A>
          <A
            id="topic-design"
            href={current.href({ selection: 'topic', params: { topic: 'design' } })}
          >
            design
          </A>
        </>
      )
    }
    const history = createSolidMemoryHistory(['/topics/design?page=2'])
    const host = document.createElement('div')
    document.body.append(host)
    hosts.push(host)
    disposers.push(
      render(
        () => (
          <MemoryRouter
            history={history}
            root={(props: RouteSectionProps) => (
              <MoleculeRouterProvider history={history}>{props.children}</MoleculeRouterProvider>
            )}
          >
            <Route path="/" component={Feed} />
            <Route path="/topics/:topic" component={Feed} />
          </MemoryRouter>
        ),
        host,
      ),
    )
    await settle()
    const href = (id: string): string | null => host.querySelector(`#${id}`)!.getAttribute('href')
    expect(current.selection()).toBe('topic')
    expect(current.params()).toEqual({ topic: 'design' })
    expect(current.page()).toBe(2)
    expect(current.offset()).toBe(10)
    expect(href('all')).toBe('/')
    expect(href('following')).toBe('/?view=following')
    expect(href('next')).toBe('/topics/design?page=3')
    host.querySelector<HTMLElement>('#all')!.click()
    await settle()
    expect(currentUrl).toBe('/')
    expect(current.selection()).toBe('all')
    expect(current.page()).toBe(1)
    expect(current.params()).toEqual({})
    // Counterexample: a query view's page links stay on `/`, and a topic link names its topic.
    host.querySelector<HTMLElement>('#following')!.click()
    await settle()
    expect(href('next')).toBe('/?view=following&page=2')
    expect(href('topic-design')).toBe('/topics/design')
    expect(() => current.href({ selection: 'topic' })).toThrow('Missing param "topic" for path')
  })
})
