// @vitest-environment jsdom
/**
 * The React bond's `list-route.integration` titles, ported to SvelteKit.
 *
 * Every title drives kit's REAL client router over the test app (`./kit-app`), started by
 * `./start-kit.js` the way an app's page boot starts it: the app's list page
 * (`kit-app/src/lib/ListProbePage.svelte`) calls this bond's `useListRoute` and
 * `useConsumedSearchParam`, the same hooks `@molecule/app-svelte` returns, over the
 * router the layout's `MoleculeRouterProvider` built, and performs the redirect
 * `listRouteRedirect` asks for.
 *
 * Framework-forced translations, one line each:
 * - `MemoryRouter`/`BrowserRouter`/`<Route>` become kit's one client router over the
 *   browser's history: every path React registers as a route is a file under
 *   `kit-app/src/routes/probe/list/`, and the cases use that `/probe/list` subtree a kit
 *   app mounts from files.
 * - `<Link to={href}>` becomes kit's own link (`resolve(href)`) that kit's link handler
 *   follows; `useNavigate()(-1)` becomes the browser's Back/Forward, which kit follows.
 * - `useQuery` becomes the page's keyed collection request (`read`): one request per
 *   committed request, as the query key is the request.
 * - `useConsumedSearchParam` becomes this bond's hook of the same name over the same
 *   router, connected on mount by the page.
 * - Every href is compared with kit's own `resolve(path)`, the href a kit link carries
 *   under this project's base path (or `#` under hash routing).
 */
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { ListRouteOptions, ListRouteResult } from '@molecule/app-routing'

import {
  type ListProbeHandle,
  type ListProbeRequest,
  setListProbeScenario,
} from './kit-app/src/lib/list-probe.js'
import { awaitNavigation, documentUrl, inAppUrl, type StartedKit, startKit } from './start-kit.js'

/** The collection request the page makes (React's `useQuery` fetch). */
type Read = (request: ListProbeRequest) => Promise<unknown>

/** A mounted list page: its state, its address and the case's helpers. */
interface Mounted {
  /** The list state of the page's current render. */
  list: () => ListRouteResult<string, string>
  /** The address the molecule router reads. */
  url: () => string
  /** The location state the molecule router reads. */
  state: () => unknown
  /** What the collection request last answered with. */
  data: () => unknown
  /** The page's collection request spy. */
  fetch: Mock<Read>
  /** Follows a rendered link (or presses the previous-page button). */
  click: (id: string) => Promise<void>
  /** Moves through the browser's history, as React's `useNavigate()(±1)` does. */
  go: (delta: -1 | 1) => Promise<void>
  /** Re-resolves the list with a changed auth status, as React's re-render does. */
  render: () => Promise<void>
}

let kit: StartedKit | undefined
let container: HTMLElement | undefined

afterEach(() => {
  kit?.stop()
  container?.remove()
  kit = undefined
  container = undefined
  window.__moleculeListProbe = undefined
  window.__moleculeListProbeHandle = undefined
})

/** Lets a task run. */
const macrotask = (): Promise<void> => new Promise((done) => setTimeout(done, 0))

/** Waits until kit finished every navigation it started. */
const idle = async (): Promise<void> => {
  if (!kit) throw new Error('no started app')
  for (let i = 0; i < 500 && !kit.app.idle(); i++) await macrotask()
}

/**
 * Lets kit commit the navigations it started and Svelte flush the effects (the redirect
 * and the collection request) they cause — React's `act` flushes.
 */
const settle = async (): Promise<void> => {
  for (let turn = 0; turn < 4; turn++) {
    await macrotask()
    await idle()
  }
}

/** The mounted list page's handle. */
const handle = (): ListProbeHandle => {
  const published = window.__moleculeListProbeHandle
  if (!published) throw new Error('no list page is mounted')
  return published
}

/** The href a kit link to the in-app `path` carries in this project's configuration. */
const kitHref = (path: string): string => {
  if (!kit) throw new Error('no started app')
  return kit.app.resolve(path)
}

/** The element with `id` in the mounted app. */
const element = (id: string): HTMLElement => {
  const node = container?.querySelector<HTMLElement>(`#${id}`)
  if (!node) throw new Error(`no #${id} in the mounted app`)
  return node
}

/** Starts the test app at `initial`, optionally committing an entry state first. */
const open = async (initial: string, entryState?: unknown): Promise<void> => {
  container = document.createElement('div')
  document.body.append(container)
  kit = await startKit(documentUrl(initial), container)
  await settle()
  if (entryState !== undefined) {
    // React's `MemoryRouter` carries the state on its initial entry; kit's browser entry
    // is committed by a navigation, which is what an app's own first move is.
    await kit.app.router.navigate(initial, { state: entryState })
    await settle()
  }
}

/** Follows a link (or presses the button) and lets kit commit the navigation it starts. */
const click = async (id: string): Promise<void> => {
  if (!kit) throw new Error('no started app')
  const node = element(id)
  await awaitNavigation(kit.app, () => node.click())
  await settle()
}

/** Moves through the browser's history, as kit follows popstate. */
const go = async (delta: -1 | 1): Promise<void> => {
  if (!kit) throw new Error('no started app')
  await awaitNavigation(kit.app, () => {
    if (delta === -1) window.history.back()
    else window.history.forward()
  })
  await settle()
}

/**
 * Mounts the list page React's titles mount: the app's list route with the case's options
 * and a collection request driven by `canLoad`.
 *
 * @param initial - The in-app address the app opens on.
 * @param options - The list options; `options.auth` stays mutable, so changing its status
 *   and calling `render()` re-resolves the list on the same page.
 * @param entryState - The location state the app's entry carries, when a case reads it.
 * @returns The mounted list.
 */
async function mount(
  initial: string,
  options: ListRouteOptions<string, string>,
  entryState?: unknown,
): Promise<Mounted> {
  const fetch = vi.fn<Read>(async (request) => request)
  setListProbeScenario({ options, read: fetch })
  await open(initial, entryState)
  return {
    list: () => handle().list(),
    url: () => handle().url(),
    state: () => handle().state(),
    data: () => handle().data(),
    fetch,
    click,
    go,
    render: async () => {
      handle().rerender()
      await settle()
    },
  }
}

describe('URL-backed list consumer transitions', () => {
  it('paginates a route-param path without selections, filters or a path option', async () => {
    setListProbeScenario({ options: {} })
    await open('/probe/list/category/books')
    const list = (): ListRouteResult<string, string> => handle().list()

    expect(list().params).toEqual({ slug: 'books' })
    expect(list().filters).toEqual({})
    expect(list().selection).toBeUndefined()
    expect(element('next').getAttribute('href')).toBe(kitHref('/probe/list/category/books?page=2'))
    await click('next')
    expect(list()).toMatchObject({ page: 2, offset: 20, params: { slug: 'books' } })
    expect(list().href({ page: 1 })).toBe('/probe/list/category/books')
  })

  it('puts page after existing query keys and resets it in a selection link', async () => {
    const app = await mount('/probe/list?view=mine&page=4', {
      selections: {
        all: { path: '/probe/list' },
        mine: { path: '/probe/list', query: { view: 'mine' } },
      },
    })
    expect(app.list().href({ page: 2 })).toBe('/probe/list?view=mine&page=2')
    expect(app.list().href({ selection: 'all' })).toBe('/probe/list')
    await app.click('all')
    expect(app.list()).toMatchObject({ page: 1, selection: 'all', offset: 0 })
    expect(app.fetch.mock.calls.map(([request]) => request.offset)).toEqual([60, 0])
  })

  it('keeps a one-time token beside list pagination while removing it from the address', async () => {
    setListProbeScenario({ options: {}, token: 'token' })
    await open('/probe/list/invitations?view=mine&page=2&token=one-time&track=a')
    expect(handle().token()).toBe('one-time')
    expect(handle().url()).toBe('/probe/list/invitations?view=mine&page=2&track=a')
    expect(handle().list()).toMatchObject({ page: 2, offset: 20 })
    expect(handle().list().href({ page: 3 })).toBe(
      '/probe/list/invitations?view=mine&track=a&page=3',
    )
    await click('next')
    expect(handle().list().page).toBe(3)
    expect(handle().token()).toBe('one-time')
    expect(handle().url()).toBe('/probe/list/invitations?view=mine&track=a&page=3')
  })

  it('retains a path-backed filter, repeated/unrelated query values and hash in real page links', async () => {
    const app = await mount(
      '/probe/list/topics/type%20systems?sort=oldest&track=a&track=b#results',
      {
        path: '/probe/list/topics/:topic',
        filters: { topic: { param: 'topic' }, sort: { query: 'sort' } },
        pageSize: 10,
      },
    )
    expect(app.list().filters).toEqual({ topic: 'type systems', sort: 'oldest' })
    expect(element('next').getAttribute('href')).toBe(
      kitHref('/probe/list/topics/type%20systems?sort=oldest&track=a&track=b&page=2#results'),
    )
    await app.click('next')
    expect(app.url()).toBe(
      '/probe/list/topics/type%20systems?sort=oldest&track=a&track=b&page=2#results',
    )
    expect(app.data()).toMatchObject({ filters: { topic: 'type systems' }, limit: 10, offset: 10 })
    await app.go(-1)
    expect(app.list().page).toBe(1)
    await app.go(1)
    expect(app.list().page).toBe(2)
    expect(app.list().filters.topic).toBe('type systems')
  })

  it('resets page on filter changes atomically and preserves history state for imperative navigation', async () => {
    const app = await mount(
      '/probe/list/topics/design?sort=oldest&page=4&track=a#results',
      {
        path: '/probe/list/topics/:topic',
        filters: { topic: { param: 'topic' }, sort: { defaultValue: 'newest' } },
      },
      { source: 'existing-state' },
    )
    app.list().setFilters({ sort: 'newest' })
    await settle()
    expect(app.url()).toBe('/probe/list/topics/design?track=a#results')
    expect(app.state()).toEqual({ source: 'existing-state' })
    expect(app.data()).toMatchObject({ filters: { topic: 'design', sort: 'newest' }, offset: 0 })
    // The old page/filter combination must never be fetched in between.
    expect(app.fetch.mock.calls.map(([request]) => request.offset)).toEqual([60, 0])
    app.list().setFilters({ topic: 'C++ / types' })
    await settle()
    expect(app.url()).toBe('/probe/list/topics/C%2B%2B%20%2F%20types?track=a#results')
    expect(app.list().filters.topic).toBe('C++ / types')
    await app.go(-1)
    expect(app.list().filters.topic).toBe('design')
  })

  it('uses declared path selections, retains encoded owner params, and pages inside the selected path', async () => {
    const app = await mount('/probe/list/members/Ada%20L?sort=oldest&page=3', {
      filters: { sort: { query: 'sort' } },
      selections: {
        authored: { path: '/probe/list/members/:member' },
        saved: { path: '/probe/list/members/:member/saved' },
      },
      defaultSelection: 'authored',
    })
    await app.click('saved')
    expect(app.url()).toBe('/probe/list/members/Ada%20L/saved?sort=oldest')
    expect(app.list().selection).toBe('saved')
    expect(app.list().params.member).toBe('Ada L')
    await app.click('next')
    expect(app.url()).toBe('/probe/list/members/Ada%20L/saved?sort=oldest&page=2')
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
    const options: ListRouteOptions<string, string> = {
      filters: { sort: { query: 'sort' } },
      selections: {
        public: { path: '/probe/list/stream', query: { view: undefined } },
        personal: { path: '/probe/list/stream', query: { view: 'personal' }, requiresAuth: true },
      },
      auth: { status: 'loading', redirectTo: '/probe/list/sign-in' },
    }
    const app = await mount('/probe/list/stream?sort=recent&page=4', options)
    options.auth!.status = 'authenticated'
    await app.render()
    expect(app.url()).toBe('/probe/list/stream?sort=recent&page=4')
    expect(app.list().selection).toBe('public')
    await app.click('personal')
    expect(app.url()).toBe('/probe/list/stream?sort=recent&view=personal')
    await app.click('next')
    expect(app.url()).toBe('/probe/list/stream?sort=recent&view=personal&page=2')
    await app.click('public')
    expect(app.url()).toBe('/probe/list/stream?sort=recent')
    expect(app.list().selection).toBe('public')
    expect(app.list().page).toBe(1)
  })

  it('waits for auth and never requests a protected feed before redirecting a signed-out visitor', async () => {
    const options: ListRouteOptions<string, string> = {
      selections: {
        public: { path: '/probe/list/stream', query: { view: undefined } },
        personal: { path: '/probe/list/stream', query: { view: 'personal' }, requiresAuth: true },
      },
      auth: { status: 'loading', redirectTo: '/probe/list/sign-in' },
    }
    const app = await mount('/probe/list/stream?view=personal&page=2#entries', options)
    expect(app.list().status).toBe('loading')
    expect(app.list().canLoad).toBe(false)
    expect(app.fetch).not.toHaveBeenCalled()
    expect(app.url()).toBe('/probe/list/stream?view=personal&page=2#entries')
    options.auth!.status = 'unavailable'
    await app.render()
    expect(app.list().status).toBe('unavailable')
    expect(app.url()).toBe('/probe/list/stream?view=personal&page=2#entries')
    // The entries the browser held before the redirect: kit runs the app over the ONE real
    // history, so a replace keeps them and a push would add one.
    const entries = window.history.length
    options.auth!.status = 'unauthenticated'
    await app.render()
    expect(app.url()).toBe('/probe/list/sign-in')
    expect(app.state()).toEqual({ returnTo: '/probe/list/stream?view=personal&page=2#entries' })
    expect(window.history.length).toBe(entries)
    // No request for the protected selection was sent, even during auth changes.
    expect(app.fetch.mock.calls.some(([request]) => request.selection === 'personal')).toBe(false)
    await app.go(-1)
    // The redirect replaced, rather than appended, the protected entry: Back never lands on it.
    expect(app.url()).not.toBe('/probe/list/stream?view=personal&page=2#entries')
  })

  it('loads the original protected URL after successful restoration without rewriting page or selection', async () => {
    const options: ListRouteOptions<string, string> = {
      selections: {
        personal: {
          path: '/probe/list/stream',
          query: { view: 'personal' },
          requiresAuth: true,
        },
      },
      auth: { status: 'loading', redirectTo: '/probe/list/sign-in' },
    }
    const app = await mount('/probe/list/stream?view=personal&page=2', options)
    expect(app.fetch).not.toHaveBeenCalled()
    options.auth!.status = 'authenticated'
    await app.render()
    expect(app.url()).toBe('/probe/list/stream?view=personal&page=2')
    expect(app.data()).toMatchObject({ selection: 'personal', offset: 20 })
  })

  // React's title names `BrowserRouter`; kit always runs its one real client router over
  // the browser's history, so the port runs the same page there and reads the path kit
  // reads (the base path, or `#`, is stripped the way kit strips it).
  it('mounts and navigates under ordinary BrowserRouter without requiring a data router', async () => {
    const app = await mount('/probe/list/topics/design?status=open', { filters: { status: {} } })
    await app.click('next')
    expect(inAppUrl().pathname).toBe('/probe/list/topics/design')
    expect(app.url()).toBe('/probe/list/topics/design?status=open&page=2')
    await app.click('previous')
    expect(app.url()).toBe('/probe/list/topics/design?status=open')
  })

  it.each(['0', '-1', '2oops', '1.5', '9007199254740992'])(
    'reads invalid page %s as one',
    async (page) => {
      const app = await mount(`/probe/list/topics/design?page=${page}`, {})
      expect(app.list().page).toBe(1)
      expect(app.list().offset).toBe(0)
    },
  )

  it('supports an explicit page in a combined filter change and removes only owned filter keys', async () => {
    const app = await mount('/probe/list/browse?sort=recent&owner=8&page=4', {
      filters: { sort: {} },
    })
    app.list().navigate({ filters: { sort: undefined }, page: 2 })
    await settle()
    expect(app.url()).toBe('/probe/list/browse?owner=8&page=2')
    expect(app.list().filters.sort).toBeUndefined()
    expect(() => app.list().href({ page: 0 })).toThrow('positive safe integer')
  })

  it('supports a catalog direct page, category pagination and atomic filter/view resets', async () => {
    const app = await mount('/probe/list/products/category/chairs?sort=price&page=3', {
      pageSize: 10,
      filters: { category: { param: 'category' }, sort: { defaultValue: 'featured' } },
      selections: {
        catalog: {
          path: '/probe/list/products/category/:category',
          query: { view: undefined },
        },
        orders: {
          path: '/probe/list/products/category/:category',
          query: { view: 'mine' },
          requiresAuth: true,
        },
      },
      defaultSelection: 'catalog',
      auth: { status: 'authenticated', redirectTo: '/probe/list/sign-in' },
    })
    // A direct ?page=N load derives both the visible page and the request offset from the URL.
    expect(app.list().page).toBe(3)
    expect(app.data()).toMatchObject({
      selection: 'catalog',
      filters: { category: 'chairs', sort: 'price' },
      offset: 20,
    })
    app.list().setFilters({ sort: 'newest' })
    await settle()
    expect(app.url()).toBe('/probe/list/products/category/chairs?sort=newest')
    expect(app.list().page).toBe(1)
    await app.click('next')
    expect(app.url()).toBe('/probe/list/products/category/chairs?sort=newest&page=2')
    expect(app.data()).toMatchObject({ filters: { category: 'chairs' }, offset: 10 })
    await app.click('orders')
    expect(app.url()).toBe('/probe/list/products/category/chairs?sort=newest&view=mine')
    expect(app.list()).toMatchObject({ page: 1, selection: 'orders', canLoad: true })
  })

  it('redirects a signed-out catalog orders view without loading it', async () => {
    const app = await mount('/probe/list/products/category/chairs?view=mine&page=2', {
      filters: { category: { param: 'category' } },
      selections: {
        catalog: {
          path: '/probe/list/products/category/:category',
          query: { view: undefined },
        },
        orders: {
          path: '/probe/list/products/category/:category',
          query: { view: 'mine' },
          requiresAuth: true,
        },
      },
      defaultSelection: 'catalog',
      auth: { status: 'unauthenticated', redirectTo: '/probe/list/sign-in' },
    })
    expect(app.list().canLoad).toBe(false)
    expect(app.fetch).not.toHaveBeenCalled()
    expect(app.url()).toBe('/probe/list/sign-in')
    expect(app.state()).toEqual({
      returnTo: '/probe/list/products/category/chairs?view=mine&page=2',
    })
  })

  // The router tells every subscriber about a navigation before kit renders it, a page kit is
  // about to replace included. React's redirect runs in an effect, which a page that unmounts
  // never runs, so a list page must not redirect from the address it is left for.
  it('does not redirect from the address a list page is left for', async () => {
    const app = await mount('/probe/list/browse', {
      selections: {
        browse: { path: '/probe/list/browse' },
        elsewhere: { path: '/two', requiresAuth: true },
      },
      defaultSelection: 'browse',
      auth: { status: 'unauthenticated', redirectTo: '/probe/list/sign-in' },
    })
    expect(app.url()).toBe('/probe/list/browse')
    if (!kit) throw new Error('no started app')
    await kit.app.router.navigate('/two')
    await settle()
    expect(app.url()).toBe('/two')
    expect(container?.textContent).toContain('page two')
  })

  // One page mounted on `/` and `/topics/:topic`, as in the package docs' feed example. When each
  // route used its own options, the "all" link on a topic page could not come from `href` and
  // hand-built links kept the topic (xr-molecule-flash-l1852, l1853, l1861).
  it('serves query views and a path view from one config, so every view link is built by href', async () => {
    setListProbeScenario({
      options: {
        pageSize: 10,
        selections: {
          all: { path: '/probe/list', query: { view: undefined } },
          following: { path: '/probe/list', query: { view: 'following' } },
          topic: { path: '/probe/list/topics/:topic' },
        },
        defaultSelection: 'all',
      },
      extraLinks: [{ id: 'topic-design', selection: 'topic', params: { topic: 'design' } }],
    })
    await open('/probe/list/topics/design?page=2')
    const current = (): ListRouteResult<string, string> => handle().list()
    const href = (id: string): string | null => element(id).getAttribute('href')
    expect(current()).toMatchObject({
      selection: 'topic',
      params: { topic: 'design' },
      page: 2,
      offset: 10,
    })
    expect(href('all')).toBe(kitHref('/probe/list'))
    expect(href('following')).toBe(kitHref('/probe/list?view=following'))
    expect(href('next')).toBe(kitHref('/probe/list/topics/design?page=3'))
    await click('all')
    expect(handle().url()).toBe('/probe/list')
    expect(current()).toMatchObject({ selection: 'all', page: 1, params: {} })
    // Counterexample: a query view's page links stay on `/`, and a topic link names its topic.
    await click('following')
    expect(href('next')).toBe(kitHref('/probe/list?view=following&page=2'))
    expect(href('topic-design')).toBe(kitHref('/probe/list/topics/design'))
    expect(() => current().href({ selection: 'topic' })).toThrow('Missing param "topic" for path')
  })
})
