// @vitest-environment jsdom
/**
 * The React bond's `list-route.integration` titles, ported to Vue Router.
 *
 * Every title drives the port's real native router: a REAL Vue Router over
 * `createMemoryHistory()` (or `createWebHistory()` for the browser-history title) with
 * the app mounted on it and NO molecule provider, exactly as React's titles need none.
 * Where a title names a React-only thing, a one-line comment says what the port's test
 * does instead.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type ComputedRef, defineComponent, h, type VNode } from 'vue'
import { RouterLink } from 'vue-router'

import type { ListRouteOptions, ListRouteResult } from '@molecule/app-routing'

import { useConsumedSearchParam } from '../useConsumedSearchParam.js'
import { useListRoute } from '../useListRoute.js'
import { click, type MountedView, mountList, mountRoutes, settle } from './routing-harness.js'

const views: MountedView[] = []

const track = <View extends MountedView>(view: View): View => {
  views.push(view)
  return view
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  for (const view of views.splice(0)) view.unmount()
})

describe('URL-backed list consumer transitions', () => {
  it('paginates a route-param path without selections, filters or a path option', async () => {
    let list!: ComputedRef<ListRouteResult>
    const Category = defineComponent({
      setup() {
        const current = useListRoute()
        list = current
        return (): VNode =>
          h(RouterLink, { id: 'next', to: current.value.href({ page: 2 }) }, () => 'Next')
      },
    })
    const { host } = track(
      await mountRoutes([{ path: '/category/:slug', component: Category }], '/category/books'),
    )
    await settle()
    expect(list.value.params).toEqual({ slug: 'books' })
    expect(list.value.filters).toEqual({})
    expect(list.value.selection).toBeUndefined()
    expect(host.querySelector('#next')!.getAttribute('href')).toBe('/category/books?page=2')
    host.querySelector<HTMLElement>('#next')!.click()
    await settle()
    expect(list.value).toMatchObject({ page: 2, offset: 20, params: { slug: 'books' } })
    expect(list.value.href({ page: 1 })).toBe('/category/books')
  })

  it('puts page after existing query keys and resets it in a selection link', async () => {
    const app = track(
      await mountList('/?view=mine&page=4', {
        selections: {
          all: { path: '/' },
          mine: { path: '/', query: { view: 'mine' } },
        },
      }),
    )
    await settle()
    expect(app.list().href({ page: 2 })).toBe('/?view=mine&page=2')
    expect(app.list().href({ selection: 'all' })).toBe('/')
    await click(app, 'all')
    expect(app.list()).toMatchObject({ page: 1, selection: 'all', offset: 0 })
    expect(app.fetch.mock.calls.map(([request]) => request.offset)).toEqual([60, 0])
  })

  it('keeps a one-time token beside list pagination while removing it from the address', async () => {
    let list!: ComputedRef<ListRouteResult>
    let token!: ComputedRef<readonly [string, (value: string) => void]>
    const Invitations = defineComponent({
      setup() {
        list = useListRoute()
        token = useConsumedSearchParam('token')
        return (): VNode =>
          h('div', [h(RouterLink, { id: 'next', to: list.value.href({ page: 3 }) }, () => 'Next')])
      },
    })
    const app = track(
      await mountRoutes(
        [{ path: '/invitations', component: Invitations }],
        '/invitations?view=mine&page=2&token=one-time&track=a',
      ),
    )
    await settle()
    const molecule = app.vueRouter
    expect(token.value[0]).toBe('one-time')
    expect(molecule.currentRoute.value.fullPath).toBe('/invitations?view=mine&page=2&track=a')
    expect(list.value).toMatchObject({ page: 2, offset: 20 })
    expect(list.value.href({ page: 3 })).toBe('/invitations?view=mine&track=a&page=3')
    await click(app, 'next')
    expect(list.value.page).toBe(3)
    expect(token.value[0]).toBe('one-time')
    expect(molecule.currentRoute.value.fullPath).toBe('/invitations?view=mine&track=a&page=3')
  })

  it('retains a path-backed filter, repeated/unrelated query values and hash in real page links', async () => {
    const app = track(
      await mountList('/topics/type%20systems?sort=oldest&track=a&track=b#results', {
        path: '/topics/:topic',
        filters: { topic: { param: 'topic' }, sort: { query: 'sort' } },
        pageSize: 10,
      }),
    )
    await settle()
    expect(app.list().filters).toEqual({ topic: 'type systems', sort: 'oldest' })
    expect(app.host.querySelector('#next')!.getAttribute('href')).toBe(
      '/topics/type%20systems?sort=oldest&track=a&track=b&page=2#results',
    )
    await click(app, 'next')
    expect(app.url()).toBe('/topics/type%20systems?sort=oldest&track=a&track=b&page=2#results')
    expect(app.data()).toMatchObject({ filters: { topic: 'type systems' }, limit: 10, offset: 10 })
    await app.go(-1)
    expect(app.list().page).toBe(1)
    await app.go(1)
    expect(app.list().page).toBe(2)
    expect(app.list().filters.topic).toBe('type systems')
  })

  it('resets page on filter changes atomically and preserves history state for imperative navigation', async () => {
    const app = track(
      await mountList('/topics/design?sort=oldest&page=4&track=a#results', {
        path: '/topics/:topic',
        filters: { topic: { param: 'topic' }, sort: { defaultValue: 'newest' } },
      }),
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
    const app = track(
      await mountList('/members/Ada%20L?sort=oldest&page=3', {
        filters: { sort: { query: 'sort' } },
        selections: {
          authored: { path: '/members/:member' },
          saved: { path: '/members/:member/saved' },
        },
        defaultSelection: 'authored',
      }),
    )
    await settle()
    await click(app, 'saved')
    expect(app.url()).toBe('/members/Ada%20L/saved?sort=oldest')
    expect(app.list().selection).toBe('saved')
    expect(app.list().params.member).toBe('Ada L')
    await click(app, 'next')
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
    const app = track(await mountList('/stream?sort=recent&page=4', options))
    await settle()
    await app.setAuth('authenticated')
    expect(app.url()).toBe('/stream?sort=recent&page=4')
    expect(app.list().selection).toBe('public')
    await click(app, 'personal')
    expect(app.url()).toBe('/stream?sort=recent&view=personal')
    await click(app, 'next')
    expect(app.url()).toBe('/stream?sort=recent&view=personal&page=2')
    await click(app, 'public')
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
    const app = track(await mountList('/stream?view=personal&page=2#entries', options))
    await settle()
    expect(app.list().status).toBe('loading')
    expect(app.list().canLoad).toBe(false)
    expect(app.fetch).not.toHaveBeenCalled()
    expect(app.url()).toBe('/stream?view=personal&page=2#entries')
    await app.setAuth('unavailable')
    expect(app.list().status).toBe('unavailable')
    expect(app.url()).toBe('/stream?view=personal&page=2#entries')
    await app.setAuth('unauthenticated')
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
    const app = track(await mountList('/stream?view=personal&page=2', options))
    await settle()
    expect(app.fetch).not.toHaveBeenCalled()
    await app.setAuth('authenticated')
    expect(app.url()).toBe('/stream?view=personal&page=2')
    expect(app.data()).toMatchObject({ selection: 'personal', offset: 20 })
  })

  // React's title names `BrowserRouter`; the port runs the same page under the native
  // router's plain browser history (`createWebHistory`) with no molecule provider.
  it('mounts and navigates under ordinary BrowserRouter without requiring a data router', async () => {
    const app = track(
      await mountList('/topics/design?status=open', { filters: { status: {} } }, { browser: true }),
    )
    await settle()
    await click(app, 'next')
    expect(window.location.pathname).toBe('/topics/design')
    expect(app.url()).toBe('/topics/design?status=open&page=2')
    await click(app, 'previous')
    expect(app.url()).toBe('/topics/design?status=open')
  })

  it.each(['0', '-1', '2oops', '1.5', '9007199254740992'])(
    'reads invalid page %s as one',
    async (page) => {
      const app = track(await mountList(`/topics/design?page=${page}`, {}))
      await settle()
      expect(app.list().page).toBe(1)
      expect(app.list().offset).toBe(0)
    },
  )

  it('supports an explicit page in a combined filter change and removes only owned filter keys', async () => {
    const app = track(
      await mountList('/browse?sort=recent&owner=8&page=4', { filters: { sort: {} } }),
    )
    await settle()
    app.list().navigate({ filters: { sort: undefined }, page: 2 })
    await settle()
    expect(app.url()).toBe('/browse?owner=8&page=2')
    expect(app.list().filters.sort).toBeUndefined()
    expect(() => app.list().href({ page: 0 })).toThrow('positive safe integer')
  })

  it('supports a catalog direct page, category pagination and atomic filter/view resets', async () => {
    const app = track(
      await mountList<'category' | 'sort', 'catalog' | 'orders'>(
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
      ),
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
    await click(app, 'next')
    expect(app.url()).toBe('/products/category/chairs?sort=newest&page=2')
    expect(app.data()).toMatchObject({ filters: { category: 'chairs' }, offset: 10 })
    await click(app, 'orders')
    expect(app.url()).toBe('/products/category/chairs?sort=newest&view=mine')
    expect(app.list()).toMatchObject({ page: 1, selection: 'orders', canLoad: true })
  })

  it('redirects a signed-out catalog orders view without loading it', async () => {
    const app = track(
      await mountList<'category', 'catalog' | 'orders'>(
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
      ),
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
    let current!: ComputedRef<ListRouteResult<never, 'all' | 'following' | 'topic'>>
    const Feed = defineComponent({
      setup() {
        const list = useListRoute({
          pageSize: 10,
          selections: {
            all: { path: '/', query: { view: undefined } },
            following: { path: '/', query: { view: 'following' } },
            topic: { path: '/topics/:topic' },
          },
          defaultSelection: 'all',
        })
        current = list
        return (): VNode => {
          const listState = list.value
          return h('div', [
            h(RouterLink, { id: 'all', to: listState.href({ selection: 'all' }) }, () => 'all'),
            h(
              RouterLink,
              { id: 'following', to: listState.href({ selection: 'following' }) },
              () => 'following',
            ),
            h(
              RouterLink,
              { id: 'next', to: listState.href({ page: listState.page + 1 }) },
              () => 'next',
            ),
            h(
              RouterLink,
              {
                id: 'topic-design',
                to: listState.href({ selection: 'topic', params: { topic: 'design' } }),
              },
              () => 'design',
            ),
          ])
        }
      },
    })
    const app = track(
      await mountRoutes(
        [
          { path: '/', component: Feed },
          { path: '/topics/:topic', component: Feed },
        ],
        '/topics/design?page=2',
      ),
    )
    await settle()
    const href = (id: string): string | null | undefined =>
      app.host.querySelector(`#${id}`)!.getAttribute('href')
    expect(current.value).toMatchObject({
      selection: 'topic',
      params: { topic: 'design' },
      page: 2,
      offset: 10,
    })
    expect(href('all')).toBe('/')
    expect(href('following')).toBe('/?view=following')
    expect(href('next')).toBe('/topics/design?page=3')
    app.host.querySelector<HTMLElement>('#all')!.click()
    await settle()
    expect(app.vueRouter.currentRoute.value.fullPath).toBe('/')
    expect(current.value).toMatchObject({ selection: 'all', page: 1, params: {} })
    // Counterexample: a query view's page links stay on `/`, and a topic link names its topic.
    app.host.querySelector<HTMLElement>('#following')!.click()
    await settle()
    expect(href('next')).toBe('/?view=following&page=2')
    expect(href('topic-design')).toBe('/topics/design')
    expect(() => current.value.href({ selection: 'topic' })).toThrow(
      'Missing param "topic" for path',
    )
  })
})
