/**
 * `runRouterConformance(name, createHarness)`: the cases every `@molecule/app-routing`
 * bond passes, so routing bonds can be swapped without the app noticing.
 *
 * Each routing bond (React Router, Vue Router, Solid Router, Angular Router, SvelteKit,
 * and the browser and memory routers of `@molecule/app-routing` itself) calls this from
 * its own tests with a harness over its REAL native router. The cases drive both sides:
 * the molecule `Router` the bond builds, and the native router underneath it, the way a
 * link or the back button would.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { NavigationAction, RouteLocation, Router } from '@molecule/app-routing'

/** One router under test, over a native router. */
export interface RouterHarness {
  /** The molecule router the bond built. */
  router: Router
  /** Navigates the native router itself, as one of its own links would. */
  nativePush(path: string): void | Promise<void>
  /** Moves the native router back one entry, as the browser's back button does. */
  nativeBack(): void | Promise<void>
  /** The native router's own current path: `pathname + search + hash`. */
  nativePath(): string
  /** Waits until navigations in flight have committed (default: a few macrotasks). */
  settle?(): Promise<void>
  /** Removes the router and its native router. */
  teardown(): void | Promise<void>
}

/**
 * Builds a fresh harness whose native router starts at `initialPath` and declares the
 * route `/users/:id` (with any other path also routable).
 */
export type RouterHarnessFactory = (initialPath: string) => RouterHarness | Promise<RouterHarness>

const pathOf = (location: Pick<RouteLocation, 'pathname' | 'search' | 'hash'>): string =>
  location.pathname + location.search + location.hash

const macrotasks = async (count: number): Promise<void> => {
  for (let i = 0; i < count; i++) await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Registers the router conformance cases for one routing bond.
 *
 * @param name - The bond (`vue-router`, `solid-router`, …).
 * @param createHarness - Builds a harness over the bond's real native router.
 */
export function runRouterConformance(name: string, createHarness: RouterHarnessFactory): void {
  /**
   * Runs one case against a fresh harness, recording what subscribers hear.
   *
   * @param initialPath - Where the native router starts.
   * @param body - The case.
   * @returns The test function.
   */
  const withHarness =
    (
      initialPath: string,
      body: (context: {
        router: Router
        harness: RouterHarness
        settle: () => Promise<void>
        heard: () => [string, NavigationAction][]
        listen: () => () => void
      }) => Promise<void>,
    ) =>
    async (): Promise<void> => {
      const harness = await createHarness(initialPath)
      const settle = async (): Promise<void> => {
        await macrotasks(3)
        await harness.settle?.()
        await macrotasks(3)
      }
      const calls: [string, NavigationAction][] = []
      const listen = (): (() => void) =>
        harness.router.subscribe((location, action) => {
          expect(pathOf(location), 'the location a subscriber hears is the current one').toBe(
            pathOf(harness.router.getLocation()),
          )
          calls.push([pathOf(location), action])
        })
      try {
        await settle()
        await body({ router: harness.router, harness, settle, heard: () => [...calls], listen })
      } finally {
        await harness.teardown()
      }
    }

  describe(`${name} router conformance`, () => {
    it(
      'reads the location the native router is at',
      withHarness('/start?tab=a&tag=x&tag=y#top', async ({ router }) => {
        expect(router.getLocation()).toMatchObject({
          pathname: '/start',
          search: '?tab=a&tag=x&tag=y',
          hash: '#top',
        })
        expect(router.getQuery()).toEqual({ tab: 'a', tag: ['x', 'y'] })
        expect(router.getQueryParam('tab')).toBe('a')
        expect(router.getQueryParam('tag')).toBe('x')
        expect(router.getQueryParam('missing')).toBeUndefined()
        expect(router.getHash()).toBe('#top')
      }),
    )

    it(
      'navigate moves the native router and tells each subscriber once',
      withHarness('/start', async ({ router, harness, settle, heard, listen }) => {
        listen()
        router.navigate('/next?x=1#h')
        await settle()
        expect(harness.nativePath()).toBe('/next?x=1#h')
        expect(pathOf(router.getLocation())).toBe('/next?x=1#h')
        expect(heard()).toEqual([['/next?x=1#h', 'push']])
      }),
    )

    it(
      'navigate with replace replaces the current entry',
      withHarness('/start', async ({ router, harness, settle, heard, listen }) => {
        router.navigate('/a')
        await settle()
        listen()
        router.navigate('/b', { replace: true })
        await settle()
        expect(heard()).toEqual([['/b', 'replace']])
        await harness.nativeBack()
        await settle()
        expect(harness.nativePath()).toBe('/start')
      }),
    )

    it(
      'a navigation the native router makes reaches subscribers',
      withHarness('/start', async ({ router, harness, settle, heard, listen }) => {
        listen()
        await harness.nativePush('/elsewhere?from=link')
        await settle()
        expect(pathOf(router.getLocation())).toBe('/elsewhere?from=link')
        expect(heard()).toEqual([['/elsewhere?from=link', 'push']])
      }),
    )

    it(
      'the native back button reaches subscribers as a pop',
      withHarness('/start', async ({ router, harness, settle, heard, listen }) => {
        router.navigate('/a')
        await settle()
        listen()
        await harness.nativeBack()
        await settle()
        expect(pathOf(router.getLocation())).toBe('/start')
        expect(heard()).toEqual([['/start', 'pop']])
      }),
    )

    it(
      'back, forward and go move through the history as pops',
      withHarness('/start', async ({ router, harness, settle, heard, listen }) => {
        router.navigate('/a')
        await settle()
        router.navigate('/b')
        await settle()
        listen()
        router.back()
        await settle()
        expect(harness.nativePath()).toBe('/a')
        router.forward()
        await settle()
        expect(harness.nativePath()).toBe('/b')
        router.go(-2)
        await settle()
        expect(harness.nativePath()).toBe('/start')
        expect(heard()).toEqual([
          ['/a', 'pop'],
          ['/b', 'pop'],
          ['/start', 'pop'],
        ])
      }),
    )

    it(
      'an unsubscribed listener hears nothing more',
      withHarness('/start', async ({ router, harness, settle, heard, listen }) => {
        const stop = listen()
        router.navigate('/a')
        await settle()
        stop()
        router.navigate('/b')
        await settle()
        await harness.nativePush('/c')
        await settle()
        expect(heard()).toEqual([['/a', 'push']])
        expect(harness.nativePath()).toBe('/c')
      }),
    )

    it(
      'state travels with a navigation',
      withHarness('/start', async ({ router, settle }) => {
        router.navigate('/a', { state: { from: 'list' } })
        await settle()
        expect(router.getLocation().state).toEqual({ from: 'list' })
      }),
    )

    it(
      'preserveQuery and preserveHash keep the current query and hash',
      withHarness('/start?keep=1#here', async ({ router, harness, settle }) => {
        router.navigate('/next', { preserveQuery: true, preserveHash: true })
        await settle()
        expect(harness.nativePath()).toBe('/next?keep=1#here')
        router.navigate('/plain')
        await settle()
        expect(harness.nativePath()).toBe('/plain')
      }),
    )

    it(
      'setQuery, setQueryParam and setHash rewrite the current URL',
      withHarness('/list?a=1', async ({ router, harness, settle }) => {
        router.setQueryParam('b', '2')
        await settle()
        expect(harness.nativePath()).toBe('/list?a=1&b=2')
        router.setQueryParam('a', undefined)
        await settle()
        expect(harness.nativePath()).toBe('/list?b=2')
        router.setQuery({ q: 'x y', tag: ['1', '2'] })
        await settle()
        expect(harness.nativePath()).toBe('/list?q=x+y&tag=1&tag=2')
        expect(router.getQuery()).toEqual({ q: 'x y', tag: ['1', '2'] })
        router.setHash('section')
        await settle()
        expect(harness.nativePath()).toBe('/list?q=x+y&tag=1&tag=2#section')
      }),
    )

    it(
      'isActive matches the current path exactly or by prefix',
      withHarness('/users/42', async ({ router }) => {
        expect(router.isActive('/users')).toBe(true)
        expect(router.isActive('/users', true)).toBe(false)
        expect(router.isActive('/users/42', true)).toBe(true)
        expect(router.isActive('/use')).toBe(false)
        expect(router.isActive('/posts')).toBe(false)
      }),
    )

    it(
      "getParams reads the matched route's params",
      withHarness('/users/42', async ({ router, settle }) => {
        router.registerRoutes([{ path: '/users/:id', name: 'user' }])
        expect(router.getParams()).toEqual({ id: '42' })
        router.navigate('/users/7')
        await settle()
        expect(router.getParams()).toEqual({ id: '7' })
      }),
    )

    it(
      'named routes generate paths and navigate',
      withHarness('/start', async ({ router, harness, settle }) => {
        router.registerRoutes([
          { path: '/users/:id', name: 'user' },
          {
            path: '/settings',
            name: 'settings',
            children: [{ path: '/profile', name: 'profile' }],
          },
        ])
        expect(router.generatePath('user', { id: '5' }, { tab: 'a' })).toBe('/users/5?tab=a')
        expect(router.generatePath('profile')).toBe('/settings/profile')
        expect(router.getRoutes().map((route) => route.name)).toEqual(['user', 'settings'])
        router.navigateTo('user', { id: 'a b' })
        await settle()
        expect(harness.nativePath()).toBe('/users/a%20b')
        expect(() => router.generatePath('missing')).toThrow('Route "missing" not found')
        expect(() => router.navigateTo('missing')).toThrow('Route "missing" not found')
      }),
    )

    it(
      'matchPath extracts params from a pattern',
      withHarness('/start', async ({ router }) => {
        expect(router.matchPath('/users/:id', '/users/9')).toEqual({
          path: '/users/:id',
          pathname: '/users/9',
          params: { id: '9' },
          isExact: true,
        })
        expect(router.matchPath('/users/:id', '/posts/1')).toBeNull()
      }),
    )

    it(
      'a guard can cancel or redirect a navigation, and be removed',
      withHarness('/start', async ({ router, harness, settle, heard, listen }) => {
        const seen: [string, string | null][] = []
        const remove = router.addGuard((to, from) => {
          seen.push([to.pathname, from ? from.pathname : null])
          if (to.pathname === '/blocked') return false
          if (to.pathname === '/old') return '/new'
          return undefined
        })
        const removeAsync = router.addGuard(async (to) => to.pathname !== '/later')
        listen()
        router.navigate('/blocked')
        await settle()
        expect(harness.nativePath()).toBe('/start')
        router.navigate('/later')
        await settle()
        expect(harness.nativePath()).toBe('/start')
        router.navigate('/old')
        await settle()
        expect(harness.nativePath()).toBe('/new')
        // A redirect takes the place of the navigation it stopped: still a push.
        expect(heard()).toEqual([['/new', 'push']])
        await harness.nativeBack()
        await settle()
        expect(harness.nativePath()).toBe('/start')
        expect(seen).toEqual([
          ['/blocked', '/start'],
          ['/later', '/start'],
          ['/old', '/start'],
          ['/new', '/start'],
        ])
        remove()
        removeAsync()
        router.navigate('/blocked')
        await settle()
        expect(harness.nativePath()).toBe('/blocked')
      }),
    )

    it(
      'destroy stops every notification',
      withHarness('/start', async ({ router, harness, settle, heard, listen }) => {
        listen()
        router.destroy()
        await harness.nativePush('/after')
        await settle()
        expect(heard()).toEqual([])
      }),
    )
  })
}
