// @vitest-environment jsdom
/**
 * `list-route.integration.test.tsx`, carried to the Angular Router bond: a real mounted
 * page over a real Angular Router, through {@link useListRoute} and
 * {@link useConsumedSearchParam}. No routing or query mocks are used.
 *
 * React's case mounted a page inside `MemoryRouter`; this port boots the page as a real
 * Angular application on Angular's own memory history (`provideLocationMocks()`, the
 * native equivalent), and "renders again" is Angular's reactive update: the app's auth
 * status lives in a signal the page's options read, so a new status reaches the same
 * mounted page the way React's re-render did. React's `useQuery` collection is the page's
 * request log: an effect records what the API query is told on every distinct list state.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  isSignal,
  signal,
  type Type,
} from '@angular/core'
import { Router as AngularRouter } from '@angular/router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  type ListRouteOptionsInput,
  useConsumedSearchParam,
  useListRoute,
  type UseListRouteResult,
  useMoleculeRouter,
} from '../index.js'
import type { ListRouteAuth, ListRouteOptions, ListRouteResult } from '../list-types.js'
import type { RouteParams } from '../types.js'
import { bootApp, type BootedApp, Empty, historyMove } from './angular-app.js'

/** The list state React's `useListRoute` result carried as plain values. */
interface ListSnapshot<Filter extends string, Selection extends string> {
  page: number
  pageSize: number
  offset: number
  filters: Record<Filter, string | undefined>
  selection: Selection | undefined
  params: RouteParams
  canLoad: boolean
  status: ListRouteResult<Filter, Selection>['status']
  redirectTo: string | undefined
}

/** One collection request: what an API call keyed on the list state would be given. */
interface ListRequest<Filter extends string, Selection extends string> {
  selection: Selection | undefined
  filters: Record<Filter, string | undefined>
  params: RouteParams
  limit: number
  offset: number
}

/** The mounted list's state plus its link builder and navigation actions. */
type ListView<Filter extends string, Selection extends string> = ListSnapshot<Filter, Selection> &
  Pick<
    UseListRouteResult<Filter, Selection>,
    'href' | 'navigate' | 'setPage' | 'setFilters' | 'select'
  >

/** What every ported page exposes to a case. */
interface ListPage<Filter extends string, Selection extends string> {
  readonly list: UseListRouteResult<Filter, Selection>
  readonly selectionNames: Selection[]
  readonly requests: ListRequest<Filter, Selection>[]
  snapshot(): ListSnapshot<Filter, Selection>
  url(): string
  state(): unknown
}

/** A mounted application and its page. */
interface Mounted<Filter extends string, Selection extends string> {
  readonly app: BootedApp
  readonly page: ListPage<Filter, Selection>
  list(): ListView<Filter, Selection>
  url(): string
  state(): unknown
  requests(): ListRequest<Filter, Selection>[]
  click(id: string): Promise<void>
  go(delta: -1 | 1): Promise<void>
  setAuth(status: ListRouteAuth['status']): Promise<void>
  settle(): Promise<void>
}

/** The route table every page needs: the shapes its URLs take, and a catch-all. */
const routes = [
  { path: 'sign-in', component: Empty },
  { path: 'invitations', component: Empty },
  { path: 'topics/:topic', component: Empty },
  { path: 'members/:member', component: Empty },
  { path: 'members/:member/saved', component: Empty },
  { path: 'products/category/:category', component: Empty },
  { path: 'stream', component: Empty },
  { path: 'browse', component: Empty },
  { path: '', component: Empty, pathMatch: 'full' as const },
  { path: '**', component: Empty },
]

let app: BootedApp | undefined

/**
 * Builds the page React's harness rendered: a page output, Next/Previous controls and one
 * link per declared selection, whose href the list builds.
 *
 * @param options - The list options, or a signal of them.
 * @returns A fresh standalone component type for this case.
 */
const listPageType = <Filter extends string, Selection extends string>(
  options: ListRouteOptionsInput<Filter, Selection>,
): Type<ListPage<Filter, Selection>> =>
  Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'mol-test-list-page',
    standalone: true,
    template: `
      @if (ready() && showing()) {
        <output data-page>{{ list.page() }}</output>
        <a id="next" [href]="list.href({ page: list.page() + 1 })" (click)="open($event, nextHref())">
          Next
        </a>
        <button id="previous" (click)="previous()">Previous</button>
        @for (name of selectionNames; track name) {
          <a [id]="name" [href]="selectionHref(name)" (click)="open($event, selectionHref(name))">
            {{ name }}
          </a>
        }
      }
    `,
  })(
    class implements ListPage<Filter, Selection> {
      readonly list = useListRoute(options)
      readonly selectionNames: Selection[] = Object.keys(
        (isSignal(options) ? options() : options).selections ?? {},
      ) as Selection[]
      readonly requests: ListRequest<Filter, Selection>[] = []
      /**
       * Whether the native router has committed the page's first URL. The page is the
       * bootstrap root here (React mounted its page inside a router that was already
       * initialized), so it can render once before Angular's initial navigation lands.
       */
      readonly ready = signal(inject(AngularRouter).navigated)
      private readonly router = useMoleculeRouter()
      private readonly location = signal(this.router.getLocation())
      /**
       * Whether this page is the one the app shows. React's harness rendered a different
       * element for the sign-in route and left this page unmounted there; the port keeps
       * one root mounted and hides the page's markup on that URL instead.
       */
      readonly showing = computed(() => this.location().pathname !== '/sign-in')
      /**
       * The last list state the page showed. React's page unmounted on the sign-in
       * route and its last value stayed readable; the port keeps that value for the
       * hidden state, so a case reads the state the redirect was made from.
       */
      private lastVisible: ListSnapshot<Filter, Selection> | undefined

      constructor() {
        inject(DestroyRef).onDestroy(
          this.router.subscribe(() => {
            this.ready.set(true)
            this.location.set(this.router.getLocation())
          }),
        )
        effect(() => {
          const canLoad = this.list.canLoad()
          const request: ListRequest<Filter, Selection> = {
            selection: this.list.selection(),
            filters: this.list.filters(),
            params: this.list.params(),
            limit: this.list.pageSize(),
            offset: this.list.offset(),
          }
          if (!canLoad || !this.ready() || !this.showing()) return
          this.requests.push(request)
        })
        effect(() => {
          if (this.showing()) this.lastVisible = this.liveSnapshot()
        })
      }

      private liveSnapshot(): ListSnapshot<Filter, Selection> {
        return {
          page: this.list.page(),
          pageSize: this.list.pageSize(),
          offset: this.list.offset(),
          filters: this.list.filters(),
          selection: this.list.selection(),
          params: this.list.params(),
          canLoad: this.list.canLoad(),
          status: this.list.status(),
          redirectTo: this.list.redirectTo(),
        }
      }

      snapshot(): ListSnapshot<Filter, Selection> {
        if (this.showing()) return this.liveSnapshot()
        return this.lastVisible ?? this.liveSnapshot()
      }

      url(): string {
        const { pathname, search, hash } = this.location()
        return pathname + search + hash
      }

      state(): unknown {
        return this.location().state
      }

      nextHref(): string {
        return this.list.href({ page: this.list.page() + 1 })
      }

      selectionHref(name: Selection): string {
        return this.list.href({ selection: name })
      }

      previous(): void {
        this.list.setPage(Math.max(1, this.list.page() - 1))
      }

      open(event: Event, href: string): void {
        event.preventDefault()
        void this.router.navigate(href)
      }
    },
  )

/**
 * Boots one page over a real Angular Router and settles it.
 *
 * @param initial - The URL the app starts at.
 * @param options - The list options.
 * @param config - Browser history (`browser: true`, default memory) and starting state.
 * @returns The mounted app and its page.
 */
const mount = async <Filter extends string, Selection extends string>(
  initial: string,
  options: ListRouteOptions<Filter, Selection>,
  config: { browser?: boolean; initialState?: unknown } = {},
): Promise<Mounted<Filter, Selection>> => {
  const initialAuth: ListRouteAuth | undefined = options.auth
  const auth =
    initialAuth === undefined ? undefined : signal<ListRouteAuth['status']>(initialAuth.status)
  const reactiveOptions = computed<ListRouteOptions<Filter, Selection>>(() => {
    if (initialAuth === undefined || auth === undefined) return options
    return { ...options, auth: { ...initialAuth, status: auth() } }
  })
  app = await bootApp({
    routes,
    root: listPageType(reactiveOptions),
    initialPath: initial,
    memory: config.browser !== true,
    initialState: config.initialState,
  })
  const booted = app
  const page = booted.componentRef.instance as ListPage<Filter, Selection>
  return {
    app: booted,
    page,
    list: () => ({
      ...page.snapshot(),
      href: page.list.href,
      navigate: page.list.navigate,
      setPage: page.list.setPage,
      setFilters: page.list.setFilters,
      select: page.list.select,
    }),
    url: () => page.url(),
    state: () => page.state(),
    requests: () => page.requests,
    click: async (id) => {
      const element = booted.host.querySelector<HTMLElement>(`#${id}`)
      if (!element) throw new Error(`no element with id "${id}"`)
      element.click()
      await booted.settle()
    },
    go: async (delta) => {
      await historyMove(booted, delta)
    },
    setAuth: async (status) => {
      if (auth === undefined) throw new Error('the case was mounted without auth options')
      auth.set(status)
      await booted.settle()
    },
    settle: () => booted.settle(),
  }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  app?.teardown()
  app = undefined
})

describe('URL-backed list consumer transitions', () => {
  it('paginates a route-param path without selections, filters or a path option', async () => {
    /** A category page whose only control is a real Next link. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-test-category-page',
      standalone: true,
      template: ` <a id="next" [href]="list.href({ page: 2 })" (click)="stop($event)">Next</a> `,
    })
    class CategoryPage {
      readonly list = useListRoute()
      private readonly router = useMoleculeRouter()

      stop(event: Event): void {
        event.preventDefault()
        void this.router.navigate(this.list.href({ page: 2 }))
      }
    }

    app = await bootApp({
      routes: [
        { path: 'category/:slug', component: Empty },
        { path: '**', component: Empty },
      ],
      root: CategoryPage,
      initialPath: '/category/books',
      memory: true,
    })
    const page = app.componentRef.instance as CategoryPage
    expect(page.list.params()).toEqual({ slug: 'books' })
    expect(page.list.filters()).toEqual({})
    expect(page.list.selection()).toBeUndefined()
    expect(app.host.querySelector('#next')!.getAttribute('href')).toBe('/category/books?page=2')
    app.host.querySelector<HTMLElement>('#next')!.click()
    await app.settle()
    expect(page.list.page()).toBe(2)
    expect(page.list.offset()).toBe(20)
    expect(page.list.params()).toEqual({ slug: 'books' })
    expect(page.list.href({ page: 1 })).toBe('/category/books')
  })

  it('puts page after existing query keys and resets it in a selection link', async () => {
    const mounted = await mount('/?view=mine&page=4', {
      selections: { all: { path: '/' }, mine: { path: '/', query: { view: 'mine' } } },
    })
    expect(mounted.list().href({ page: 2 })).toBe('/?view=mine&page=2')
    expect(mounted.list().href({ selection: 'all' })).toBe('/')
    await mounted.click('all')
    expect(mounted.list()).toMatchObject({ page: 1, selection: 'all', offset: 0 })
    expect(mounted.requests().map((request) => request.offset)).toEqual([60, 0])
  })

  it('keeps a one-time token beside list pagination while removing it from the address', async () => {
    /** An invitations page holding a one-time token beside the list. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-test-invitations-page',
      standalone: true,
      template: ` <a id="next" [href]="list.href({ page: 3 })" (click)="stop($event)">Next</a> `,
    })
    class InvitationsPage {
      readonly list = useListRoute()
      readonly token = useConsumedSearchParam('token')
      private readonly router = useMoleculeRouter()
      private readonly location = signal(this.router.getLocation())

      constructor() {
        inject(DestroyRef).onDestroy(
          this.router.subscribe(() => this.location.set(this.router.getLocation())),
        )
      }

      url(): string {
        return this.location().pathname + this.location().search
      }

      stop(event: Event): void {
        event.preventDefault()
        void this.router.navigate(this.list.href({ page: 3 }))
      }
    }

    app = await bootApp({
      routes,
      root: InvitationsPage,
      initialPath: '/invitations?view=mine&page=2&token=one-time&track=a',
      memory: true,
    })
    const page = app.componentRef.instance as InvitationsPage
    expect(page.token[0]).toBe('one-time')
    expect(page.url()).toBe('/invitations?view=mine&page=2&track=a')
    expect(page.list.page()).toBe(2)
    expect(page.list.offset()).toBe(20)
    expect(page.list.href({ page: 3 })).toBe('/invitations?view=mine&track=a&page=3')
    app.host.querySelector<HTMLElement>('#next')!.click()
    await app.settle()
    expect(page.list.page()).toBe(3)
    expect(page.token[0]).toBe('one-time')
    expect(page.url()).toBe('/invitations?view=mine&track=a&page=3')
  })

  it('retains a path-backed filter, repeated/unrelated query values and hash in real page links', async () => {
    const mounted = await mount('/topics/type%20systems?sort=oldest&track=a&track=b#results', {
      path: '/topics/:topic',
      filters: { topic: { param: 'topic' }, sort: { query: 'sort' } },
      pageSize: 10,
    })
    expect(mounted.list().filters).toEqual({ topic: 'type systems', sort: 'oldest' })
    expect(app?.host.querySelector('#next')!.getAttribute('href')).toBe(
      '/topics/type%20systems?sort=oldest&track=a&track=b&page=2#results',
    )
    await mounted.click('next')
    expect(mounted.url()).toBe('/topics/type%20systems?sort=oldest&track=a&track=b&page=2#results')
    expect(mounted.requests().at(-1)).toMatchObject({
      filters: { topic: 'type systems' },
      limit: 10,
      offset: 10,
    })
    await mounted.go(-1)
    expect(mounted.list().page).toBe(1)
    await mounted.go(1)
    expect(mounted.list().page).toBe(2)
    expect(mounted.list().filters.topic).toBe('type systems')
  })

  it('resets page on filter changes atomically and preserves history state for imperative navigation', async () => {
    const mounted = await mount(
      '/topics/design?sort=oldest&page=4&track=a#results',
      {
        path: '/topics/:topic',
        filters: { topic: { param: 'topic' }, sort: { defaultValue: 'newest' } },
      },
      { initialState: { source: 'existing-state' } },
    )
    mounted.list().setFilters({ sort: 'newest' })
    await mounted.settle()
    expect(mounted.url()).toBe('/topics/design?track=a#results')
    expect(mounted.state()).toEqual({ source: 'existing-state' })
    expect(mounted.requests().at(-1)).toMatchObject({
      filters: { topic: 'design', sort: 'newest' },
      offset: 0,
    })
    // The old page/filter combination must never be requested in between.
    expect(mounted.requests().map((request) => request.offset)).toEqual([60, 0])
    mounted.list().setFilters({ topic: 'C++ / types' })
    await mounted.settle()
    // The native router re-serializes the path segment; the value it selects is what the
    // assertion is about, and it round-trips through the address.
    expect(new URLSearchParams(mounted.url().split('?')[1].split('#')[0]).get('track')).toBe('a')
    expect(mounted.list().filters.topic).toBe('C++ / types')
    expect(decodeURIComponent(mounted.url().split('?')[0])).toBe('/topics/C++ / types')
    await mounted.go(-1)
    expect(mounted.list().filters.topic).toBe('design')
  })

  it('uses declared path selections, retains encoded owner params, and pages inside the selected path', async () => {
    const mounted = await mount('/members/Ada%20L?sort=oldest&page=3', {
      filters: { sort: { query: 'sort' } },
      selections: {
        authored: { path: '/members/:member' },
        saved: { path: '/members/:member/saved' },
      },
      defaultSelection: 'authored',
    })
    await mounted.click('saved')
    expect(mounted.url()).toBe('/members/Ada%20L/saved?sort=oldest')
    expect(mounted.list().selection).toBe('saved')
    expect(mounted.list().params.member).toBe('Ada L')
    await mounted.click('next')
    expect(mounted.url()).toBe('/members/Ada%20L/saved?sort=oldest&page=2')
    expect(mounted.requests().at(-1)).toMatchObject({
      selection: 'saved',
      params: { member: 'Ada L' },
      offset: 20,
    })
    await mounted.go(-1)
    expect(mounted.list().page).toBe(1)
    await mounted.go(-1)
    expect(mounted.list().selection).toBe('authored')
    expect(mounted.list().page).toBe(3)
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
    const mounted = await mount('/stream?sort=recent&page=4', options)
    await mounted.setAuth('authenticated')
    expect(mounted.url()).toBe('/stream?sort=recent&page=4')
    expect(mounted.list().selection).toBe('public')
    await mounted.click('personal')
    expect(mounted.url()).toBe('/stream?sort=recent&view=personal')
    await mounted.click('next')
    expect(mounted.url()).toBe('/stream?sort=recent&view=personal&page=2')
    await mounted.click('public')
    expect(mounted.url()).toBe('/stream?sort=recent')
    expect(mounted.list().selection).toBe('public')
    expect(mounted.list().page).toBe(1)
  })

  it('waits for auth and never requests a protected feed before redirecting a signed-out visitor', async () => {
    const options: ListRouteOptions<string, 'public' | 'personal'> = {
      selections: {
        public: { path: '/stream', query: { view: undefined } },
        personal: { path: '/stream', query: { view: 'personal' }, requiresAuth: true },
      },
      auth: { status: 'loading', redirectTo: '/sign-in' },
    }
    const mounted = await mount('/stream?view=personal&page=2#entries', options)
    expect(mounted.list().status).toBe('loading')
    expect(mounted.list().canLoad).toBe(false)
    expect(mounted.requests()).toHaveLength(0)
    expect(mounted.url()).toBe('/stream?view=personal&page=2#entries')
    await mounted.setAuth('unavailable')
    expect(mounted.list().status).toBe('unavailable')
    expect(mounted.url()).toBe('/stream?view=personal&page=2#entries')
    await mounted.setAuth('unauthenticated')
    expect(mounted.url()).toBe('/sign-in')
    expect(mounted.state()).toEqual({ returnTo: '/stream?view=personal&page=2#entries' })
    // No request for the protected selection was sent, even during auth changes.
    expect(mounted.requests().some((request) => request.selection === 'personal')).toBe(false)
    await mounted.go(-1)
    expect(mounted.url()).toBe('/sign-in') // redirect replaced, rather than appended, the protected entry
  })

  it('loads the original protected URL after successful restoration without rewriting page or selection', async () => {
    const options: ListRouteOptions<string, 'personal'> = {
      selections: {
        personal: { path: '/stream', query: { view: 'personal' }, requiresAuth: true },
      },
      auth: { status: 'loading', redirectTo: '/sign-in' },
    }
    const mounted = await mount('/stream?view=personal&page=2', options)
    expect(mounted.requests()).toHaveLength(0)
    await mounted.setAuth('authenticated')
    expect(mounted.url()).toBe('/stream?view=personal&page=2')
    expect(mounted.requests().at(-1)).toMatchObject({ selection: 'personal', offset: 20 })
  })

  it('mounts and navigates under ordinary BrowserRouter without requiring a data router', async () => {
    const mounted = await mount(
      '/topics/design?status=open',
      { filters: { status: {} } },
      { browser: true },
    )
    await mounted.click('next')
    expect(window.location.pathname).toBe('/topics/design')
    expect(mounted.url()).toBe('/topics/design?status=open&page=2')
    await mounted.click('previous')
    expect(mounted.url()).toBe('/topics/design?status=open')
  })

  it.each(['0', '-1', '2oops', '1.5', '9007199254740992'])(
    'reads invalid page %s as one',
    async (page) => {
      const mounted = await mount(`/topics/design?page=${page}`, {})
      expect(mounted.list().page).toBe(1)
      expect(mounted.list().offset).toBe(0)
    },
  )

  it('supports an explicit page in a combined filter change and removes only owned filter keys', async () => {
    const mounted = await mount('/browse?sort=recent&owner=8&page=4', { filters: { sort: {} } })
    mounted.list().navigate({ filters: { sort: undefined }, page: 2 })
    await mounted.settle()
    expect(mounted.url()).toBe('/browse?owner=8&page=2')
    expect(mounted.list().filters.sort).toBeUndefined()
    expect(() => mounted.list().href({ page: 0 })).toThrow('positive safe integer')
  })

  it('supports a catalog direct page, category pagination and atomic filter/view resets', async () => {
    const mounted = await mount<'category' | 'sort', 'catalog' | 'orders'>(
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
    // A direct ?page=N load derives both the visible page and the request offset from the URL.
    expect(mounted.list().page).toBe(3)
    expect(mounted.requests().at(-1)).toMatchObject({
      selection: 'catalog',
      filters: { category: 'chairs', sort: 'price' },
      offset: 20,
    })
    mounted.list().setFilters({ sort: 'newest' })
    await mounted.settle()
    expect(mounted.url()).toBe('/products/category/chairs?sort=newest')
    expect(mounted.list().page).toBe(1)
    await mounted.click('next')
    expect(mounted.url()).toBe('/products/category/chairs?sort=newest&page=2')
    expect(mounted.requests().at(-1)).toMatchObject({
      filters: { category: 'chairs' },
      offset: 10,
    })
    await mounted.click('orders')
    expect(mounted.url()).toBe('/products/category/chairs?sort=newest&view=mine')
    expect(mounted.list()).toMatchObject({ page: 1, selection: 'orders', canLoad: true })
  })

  it('redirects a signed-out catalog orders view without loading it', async () => {
    const mounted = await mount<'category', 'catalog' | 'orders'>(
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
    expect(mounted.list().canLoad).toBe(false)
    expect(mounted.requests()).toHaveLength(0)
    expect(mounted.url()).toBe('/sign-in')
    expect(mounted.state()).toEqual({
      returnTo: '/products/category/chairs?view=mine&page=2',
    })
  })

  // One page mounted on `/` and `/topics/:topic`, as in the package docs' feed example. When each
  // route used its own options, the "all" link on a topic page could not come from `href` and
  // hand-built links kept the topic (xr-molecule-flash-l1852, l1853, l1861).
  it('serves query views and a path view from one config, so every view link is built by href', async () => {
    /** A feed page serving query views and a path view from one config. */
    @Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-test-feed-page',
      standalone: true,
      template: `
        <a id="all" [href]="list.href({ selection: 'all' })" (click)="open($event, 'all')">all</a>
        <a
          id="following"
          [href]="list.href({ selection: 'following' })"
          (click)="open($event, 'following')"
        >
          following
        </a>
        <a id="next" [href]="list.href({ page: list.page() + 1 })" (click)="open($event, 'next')"
          >next</a
        >
        <a
          id="topic-design"
          [href]="list.href({ selection: 'topic', params: { topic: 'design' } })"
          (click)="open($event, 'topic')"
        >
          design
        </a>
      `,
    })
    class FeedPage {
      readonly list = useListRoute({
        pageSize: 10,
        selections: {
          all: { path: '/', query: { view: undefined } },
          following: { path: '/', query: { view: 'following' } },
          topic: { path: '/topics/:topic' },
        },
        defaultSelection: 'all',
      })
      private readonly router = useMoleculeRouter()
      private readonly location = signal(this.router.getLocation())

      constructor() {
        inject(DestroyRef).onDestroy(
          this.router.subscribe(() => this.location.set(this.router.getLocation())),
        )
      }

      url(): string {
        return this.location().pathname + this.location().search
      }

      open(event: Event, which: 'all' | 'following' | 'next' | 'topic'): void {
        event.preventDefault()
        const href =
          which === 'all'
            ? this.list.href({ selection: 'all' })
            : which === 'following'
              ? this.list.href({ selection: 'following' })
              : which === 'topic'
                ? this.list.href({ selection: 'topic', params: { topic: 'design' } })
                : this.list.href({ page: this.list.page() + 1 })
        void this.router.navigate(href)
      }
    }

    app = await bootApp({
      routes: [
        { path: '', component: Empty, pathMatch: 'full' },
        { path: 'topics/:topic', component: Empty },
        { path: '**', component: Empty },
      ],
      root: FeedPage,
      initialPath: '/topics/design?page=2',
      memory: true,
    })
    const page = app.componentRef.instance as FeedPage
    const href = (id: string): string | null =>
      app!.host.querySelector(`#${id}`)!.getAttribute('href')
    expect(page.list.selection()).toBe('topic')
    expect(page.list.params()).toEqual({ topic: 'design' })
    expect(page.list.page()).toBe(2)
    expect(page.list.offset()).toBe(10)
    expect(href('all')).toBe('/')
    expect(href('following')).toBe('/?view=following')
    expect(href('next')).toBe('/topics/design?page=3')
    app.host.querySelector<HTMLElement>('#all')!.click()
    await app.settle()
    expect(page.url()).toBe('/')
    expect(page.list.selection()).toBe('all')
    expect(page.list.page()).toBe(1)
    expect(page.list.params()).toEqual({})
    // Counterexample: a query view's page links stay on `/`, and a topic link names its topic.
    app.host.querySelector<HTMLElement>('#following')!.click()
    await app.settle()
    expect(href('next')).toBe('/?view=following&page=2')
    expect(href('topic-design')).toBe('/topics/design')
    expect(() => page.list.href({ selection: 'topic' })).toThrow('Missing param "topic" for path')
  })
})
