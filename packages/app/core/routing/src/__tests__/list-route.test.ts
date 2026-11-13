/**
 * `resolveListRoute`, `listRouteRedirect`, `matchRoutePattern` and
 * `createConsumedSearchParam` over the in-memory router: the URL-backed list rules every
 * framework's `useListRoute` and `useConsumedSearchParam` share.
 */
import { describe, expect, it } from 'vitest'

import { createConsumedSearchParam } from '../consumed-search-param.js'
import { listRouteRedirect, resolveListRoute } from '../list-route.js'
import type { ListRouteOptions } from '../list-route-types.js'
import { matchRoutePattern } from '../route-pattern.js'
import { createMemoryRouter } from '../router.js'
import type { Router } from '../types.js'

const pathOf = (router: Router): string => {
  const { pathname, search, hash } = router.getLocation()
  return pathname + search + hash
}

/**
 * Resolves a list at `path` over a fresh memory router.
 *
 * @param path - The current URL.
 * @param options - The list options.
 * @returns The router and the resolved list.
 */
function listAt<Filter extends string = string, Selection extends string = string>(
  path: string,
  options: ListRouteOptions<Filter, Selection> = {},
): { router: Router; list: ReturnType<typeof resolveListRoute<Filter, Selection>> } {
  const router = createMemoryRouter({ initialEntries: [path] })
  const list = resolveListRoute<Filter, Selection>(
    { location: router.getLocation() },
    options,
    (to, navOptions) => router.navigate(to, navOptions),
  )
  return { router, list }
}

describe('matchRoutePattern', () => {
  it.each([
    ['/users/:id', '/users/42', { id: '42' }],
    ['/users/:id', '/USERS/42/', { id: '42' }],
    ['/category/:slug', '/category/a%20b', { slug: 'a%20b' }],
    ['/:lang?/about', '/about', { lang: undefined }],
    ['/:lang?/about', '/en/about', { lang: 'en' }],
    ['/docs/*', '/docs/a/b', { '*': 'a/b' }],
    ['/files/:name', '/files/a%2Fb', { name: 'a/b' }],
    ['/v1.0/:id', '/v1.0/7', { id: '7' }],
  ])('%s matches %s', (pattern, pathname, params) => {
    expect(matchRoutePattern(pattern, pathname)?.params).toEqual(params)
  })

  it.each([
    ['/users/:id', '/users'],
    ['/users/:id', '/users/42/posts'],
    ['/v1.0/:id', '/v1x0/7'],
    ['/users/:id', '/USERS/42'],
  ])('%s does not match %s (the last one case-sensitively)', (pattern, pathname) => {
    expect(
      matchRoutePattern(pattern, pathname, { caseSensitive: pathname === '/USERS/42' }),
    ).toBeNull()
  })

  it('matches a prefix with end: false', () => {
    expect(matchRoutePattern('/users', '/users/42', { end: false })?.pathname).toBe('/users')
    expect(matchRoutePattern('/users', '/usersx', { end: false })).toBeNull()
  })
})

describe('resolveListRoute', () => {
  it('reads the page, offset, filters and params from the URL', () => {
    const { list } = listAt('/category/books?q=dune&page=3', {
      pageSize: 10,
      path: '/category/:slug',
      filters: { q: {}, slug: { param: 'slug' }, sort: { defaultValue: 'new' } },
    })
    expect(list).toMatchObject({
      page: 3,
      pageSize: 10,
      offset: 20,
      filters: { q: 'dune', slug: 'books', sort: 'new' },
      params: { slug: 'books' },
      canLoad: true,
      status: 'ready',
      redirectTo: undefined,
    })
  })

  it.each(['0', '-1', '2oops', '1.5', '9007199254740992'])('reads page=%s as page one', (page) => {
    expect(listAt(`/list?page=${page}`).list.page).toBe(1)
  })

  it('builds page links that keep the path, other query values, their order and the hash', () => {
    const { list } = listAt('/?view=mine&tag=a&tag=b#top')
    expect(list.href({ page: 2 })).toBe('/?view=mine&tag=a&tag=b&page=2#top')
    expect(list.href({ page: 1 })).toBe('/?view=mine&tag=a&tag=b#top')
  })

  it('pages a path with its own params without adding a query filter', () => {
    const { list } = listAt('/category/books', { path: '/category/:slug' })
    expect(list.href({ page: 2 })).toBe('/category/books?page=2')
  })

  it('resets the page when a filter, a selection or params change', () => {
    const { list } = listAt('/orders?page=4&status=open', {
      filters: { status: { defaultValue: 'all' } },
      selections: {
        all: { path: '/orders' },
        mine: { path: '/orders', query: { view: 'mine' } },
      },
      defaultSelection: 'all',
    })
    expect(list.selection).toBe('all')
    expect(list.href({ filters: { status: 'closed' } })).toBe('/orders?status=closed')
    expect(list.href({ filters: { status: 'all' } })).toBe('/orders')
    expect(list.href({ selection: 'mine' })).toBe('/orders?status=open&view=mine')
    expect(list.href({ filters: { status: 'closed' }, page: 2 })).toBe(
      '/orders?status=closed&page=2',
    )
  })

  it('selects the most specific view and pages inside its path', () => {
    const { list } = listAt('/members/ann%20lee/saved?page=2', {
      selections: {
        all: { path: '/feed' },
        saved: { path: '/members/:member/saved' },
      },
    })
    expect(list.selection).toBe('saved')
    expect(list.params).toEqual({ member: 'ann lee' })
    expect(list.href({ page: 3 })).toBe('/members/ann%20lee/saved?page=3')
    expect(list.href({ selection: 'all' })).toBe('/feed')
  })

  it('navigates with the location state unless the options replace it', () => {
    const router = createMemoryRouter({ initialEntries: ['/list'] })
    router.navigate('/list?page=2', { state: { from: 'home' } })
    const list = resolveListRoute({ location: router.getLocation() }, {}, (to, navOptions) =>
      router.navigate(to, navOptions),
    )
    list.setPage(3)
    expect(pathOf(router)).toBe('/list?page=3')
    expect(router.getLocation().state).toEqual({ from: 'home' })
  })

  it('waits for auth on a protected view and redirects only a confirmed signed-out visitor', () => {
    const options = (status: 'loading' | 'authenticated' | 'unauthenticated' | 'unavailable') =>
      ({
        selections: {
          all: { path: '/orders' },
          mine: { path: '/orders', query: { view: 'mine' }, requiresAuth: true },
        },
        auth: { status, redirectTo: '/login' },
      }) satisfies ListRouteOptions
    for (const status of ['loading', 'unavailable'] as const) {
      const { list, router } = listAt('/orders?view=mine', options(status))
      expect(list).toMatchObject({ canLoad: false, status, redirectTo: undefined })
      expect(listRouteRedirect(list, router.getLocation())).toBeUndefined()
    }
    const signedOut = listAt('/orders?view=mine&page=4', options('unauthenticated'))
    expect(signedOut.list).toMatchObject({ canLoad: false, redirectTo: '/login' })
    expect(listRouteRedirect(signedOut.list, signedOut.router.getLocation())).toEqual({
      to: '/login',
      options: { replace: true, state: { returnTo: '/orders?view=mine&page=4' } },
    })
    expect(signedOut.list.href({ selection: 'all' })).toBe('/orders')
    expect(listAt('/orders?view=mine', options('authenticated')).list.canLoad).toBe(true)
    expect(listAt('/orders', options('unauthenticated')).list.canLoad).toBe(true)
  })

  it('rejects a bad page size, an unprotected auth config and unknown names', () => {
    expect(() => listAt('/list', { pageSize: 0 })).toThrow('pageSize must be a positive')
    expect(() =>
      listAt('/orders', { selections: { mine: { path: '/orders', requiresAuth: true } } }),
    ).toThrow('protected selections require auth')
    const { list } = listAt<'q', 'all'>('/list', { filters: { q: {} } })
    expect(() => list.href({ selection: 'all' })).toThrow('unknown selection "all"')
    expect(() => list.href({ filters: { nope: 'x' } as never })).toThrow('unknown filter "nope"')
    expect(() => list.href({ page: 0 })).toThrow('page must be a positive safe integer')
    expect(() => list.href({ params: { id: '1' } })).toThrow('requires a path pattern')
  })
})

describe('createConsumedSearchParam', () => {
  it('takes the value out of the URL and keeps path, hash, other query values and state', () => {
    const router = createMemoryRouter({ initialEntries: ['/reset'] })
    router.navigate('/reset?token=abc&lang=fr#form', { state: { from: 'email' } })
    const token = createConsumedSearchParam(router, 'token')
    expect(token.get()).toBe('abc')
    token.connect()
    expect(pathOf(router)).toBe('/reset?lang=fr#form')
    expect(router.getLocation().state).toEqual({ from: 'email' })
    expect(token.get()).toBe('abc')
  })

  it('keeps the value through query-only navigation and consumes a new one', () => {
    const router = createMemoryRouter({ initialEntries: ['/reset?token=abc'] })
    const token = createConsumedSearchParam(router, 'token')
    const heard: string[] = []
    token.subscribe((value) => heard.push(value))
    token.connect()
    router.navigate('/reset?step=2')
    expect(token.get()).toBe('abc')
    router.navigate('/reset?token=def')
    expect(token.get()).toBe('def')
    expect(pathOf(router)).toBe('/reset')
    expect(heard).toEqual(['def'])
  })

  it('restores the value consumed on an entry when Back returns to it, and lets a form clear it', () => {
    const router = createMemoryRouter({ initialEntries: ['/start'] })
    router.navigate('/reset?token=abc')
    const token = createConsumedSearchParam(router, 'token')
    token.connect()
    router.navigate('/reset?token=def')
    expect(token.get()).toBe('def')
    router.back()
    expect(token.get()).toBe('abc')
    token.set('')
    expect(token.get()).toBe('')
  })

  it('stops following the router once disconnected', () => {
    const router = createMemoryRouter({ initialEntries: ['/reset?token=abc'] })
    const token = createConsumedSearchParam(router, 'token')
    token.connect()()
    router.navigate('/reset?token=def')
    expect(token.get()).toBe('abc')
    expect(pathOf(router)).toBe('/reset?token=def')
  })
})
