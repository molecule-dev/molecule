/**
 * The molecule `Router` `createSvelteKitRouter` builds, case for case from the React bond's
 * `index.test.ts` (`@molecule/app-routing-react-router`).
 *
 * The native router these cases drive is SvelteKit's own client router, started over the
 * test app (`./kit-app`) by `./start-kit.js`, exactly as an app's root layout builds the
 * bond: a `SvelteKitNavigation` from `createSvelteKitNavigation`. Each case observes what a
 * caller of the bond sees — the location a navigation landed on, the `goto` kit was asked
 * for — never a React Router mechanism (a render, a hook result) SvelteKit has no
 * counterpart for. A case that asks what happens with no native router drives the exported
 * `provider` constant, which is the core browser-history router.
 *
 * @module
 */

import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'

import { I18nError } from '@molecule/app-i18n'

import type {
  KitGotoOptions,
  NavigationGuard,
  RouteChangeListener,
  RouteDefinition,
  RouteLocation,
  Router,
} from '../index.js'
import {
  createSvelteKitRouter,
  generatePath,
  matchPath,
  normalizePath,
  parseSearchParams,
  provider,
  resolvePath,
  stringifyQuery,
} from '../index.js'
import type { KitApp } from './kit-app/src/lib/started.js'
import { documentUrl, kitBase, kitHash, type StartedKit, startKit } from './start-kit.js'

/** Kit's `goto`, the native navigation function the bond calls. */
type Goto = (url: string, opts?: KitGotoOptions) => Promise<void>

/** A started test app and the molecule router built over its real client router. */
interface TestRouter {
  /** What the test app's root layout built. */
  app: KitApp
  /** The molecule router over kit's client router. */
  router: Router
  /** Kit's `goto`, as the bond calls it. */
  goto: Mock<Goto>
}

let running: StartedKit | undefined
let container: HTMLElement | undefined

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  running?.stop()
  container?.remove()
  running = undefined
  container = undefined
  // A case that drove the exported `provider` really navigated the document; start every
  // later case from the root, as a fresh page load would.
  window.history.replaceState(null, '', '/')
})

/**
 * The URL this project's kit `goto` receives for an in-app `path`: the base kit was built
 * with (`/app`), or `#` under hash routing, comes first.
 *
 * @param path - The in-app path.
 * @returns The URL handed to kit.
 */
const kitUrl = (path: string): string => (kitHash ? `#${path}` : kitBase + path)

/**
 * Starts the test app at `initialPath` and builds the molecule router over kit's real
 * client router the way an app's root layout does, with kit's `goto` spied so a case sees
 * the navigation the bond asked kit for.
 *
 * @param initialPath - The in-app path to start at (path, query and hash).
 * @param routes - Named routes for the bond's route table.
 * @returns The app, the router, and the `goto` spy.
 */
async function startRouter(initialPath: string, routes?: RouteDefinition[]): Promise<TestRouter> {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const started = await startKit(documentUrl(initialPath), target)
  container = target
  running = started
  const goto = vi.fn<Goto>(started.app.navigation.goto)
  const router = createSvelteKitRouter({ ...started.app.navigation, goto }, { routes })
  return { app: started.app, router, goto }
}

describe('@molecule/app-routing-sveltekit', () => {
  describe('createSvelteKitRouter', () => {
    describe('initialization', () => {
      it('should create a router with default config', async () => {
        const { router } = await startRouter('/')

        expect(router).toBeDefined()
        expect(router.getLocation).toBeInstanceOf(Function)
        expect(router.getParams).toBeInstanceOf(Function)
        expect(router.getQuery).toBeInstanceOf(Function)
        expect(router.navigate).toBeInstanceOf(Function)
      })

      it('should create a router with a provided location', async () => {
        const { router } = await startRouter('/dashboard?tab=settings#section')

        const location = router.getLocation()
        expect(location.pathname).toBe('/dashboard')
        expect(location.search).toBe('?tab=settings')
        expect(location.hash).toBe('#section')
      })

      it('should create a router with params', async () => {
        const { router } = await startRouter('/users/123')

        const params = router.getParams<{ id: string }>()
        expect(params.id).toBe('123')
      })

      it('should create a router with named routes', async () => {
        const routes: RouteDefinition[] = [
          { path: '/products', name: 'products' },
          { path: '/products/:id', name: 'product-detail' },
          { path: '/users/:userId/posts/:postId', name: 'user-post' },
        ]

        const { router } = await startRouter('/', routes)

        expect(router.getRoutes()).toEqual(routes)
      })

      it('should filter undefined params', async () => {
        // Kit fills only the names the URL has a value for: a parameter the URL leaves out
        // is ABSENT from the params object, not present with an `undefined` value.
        const { router } = await startRouter('/users/123')

        const params = router.getParams()
        expect(params.id).toBe('123')
        expect('optional' in params).toBe(false)
      })
    })

    describe('getLocation', () => {
      it('should return current location from provided location object', async () => {
        const { router } = await startRouter('/about?ref=home#top')
        // The app's state is carried on the history entry, as React Router carries it; the
        // location reports the app's part only.
        await router.navigate('/about?ref=home#top', { state: { from: 'nav' } })

        const location = router.getLocation()
        expect(location.pathname).toBe('/about')
        expect(location.search).toBe('?ref=home')
        expect(location.hash).toBe('#top')
        expect(location.state).toEqual({ from: 'nav' })
        // The key names the entry the navigation landed on, and stays with it.
        expect(typeof location.key).toBe('string')
        expect(router.getLocation().key).toBe(location.key)
      })

      it('should return default location when no config provided', async () => {
        const { router } = await startRouter('/')

        const location = router.getLocation()
        expect(location.pathname).toBe('/')
        expect(location.search).toBe('')
        expect(location.hash).toBe('')
      })
    })

    describe('getParams', () => {
      it('should return empty object when no params', async () => {
        const { router } = await startRouter('/library')

        expect(router.getParams()).toEqual({})
      })

      it('should return typed params', async () => {
        type ProductParams = {
          id: string
          category: string
        }

        const { router } = await startRouter('/products/electronics/123')

        const params = router.getParams<ProductParams>()
        expect(params.id).toBe('123')
        expect(params.category).toBe('electronics')
      })
    })

    describe('getQuery', () => {
      it('should return empty object when no search params', async () => {
        const { router } = await startRouter('/library')

        expect(router.getQuery()).toEqual({})
      })

      it('should parse search string into query params', async () => {
        const { router } = await startRouter('/search?page=1&limit=10')

        const query = router.getQuery()
        expect(query.page).toBe('1')
        expect(query.limit).toBe('10')
      })

      it('should handle duplicate keys as arrays', async () => {
        const { router } = await startRouter('/search?tag=react&tag=vue')

        const query = router.getQuery()
        expect(query.tag).toEqual(['react', 'vue'])
      })
    })

    describe('getQueryParam', () => {
      it('should return undefined for missing param', async () => {
        const { router } = await startRouter('/search')

        expect(router.getQueryParam('missing')).toBeUndefined()
      })

      it('should return string param value', async () => {
        const { router } = await startRouter('/search?page=5')

        expect(router.getQueryParam('page')).toBe('5')
      })
    })

    describe('getHash', () => {
      it('should return hash from location', async () => {
        const { router } = await startRouter('/page#section1')

        expect(router.getHash()).toBe('#section1')
      })

      it('should return empty string when no hash', async () => {
        const { router } = await startRouter('/page')

        expect(router.getHash()).toBe('')
      })
    })

    describe('navigate', () => {
      it('should call navigateFn for regular navigation', async () => {
        const { router, goto } = await startRouter('/')

        await router.navigate('/products')

        expect(goto).toHaveBeenCalledWith(kitUrl('/products'), {
          state: { __moleculeKey: expect.any(String) },
          persistState: true,
        })
      })

      it('should call navigateFn with replace option', async () => {
        const { router, goto } = await startRouter('/')

        await router.navigate('/products', { replace: true })

        expect(goto).toHaveBeenCalledWith(kitUrl('/products'), {
          replace: true,
          state: { __moleculeKey: expect.any(String) },
          persistState: true,
        })
      })

      it('should pass state to navigateFn', async () => {
        const { router, goto } = await startRouter('/')

        await router.navigate('/products', { state: { fromCart: true } })

        expect(goto).toHaveBeenCalledWith(kitUrl('/products'), {
          state: { fromCart: true, __moleculeKey: expect.any(String) },
          persistState: true,
        })
      })

      it('should preserve query when preserveQuery is true', async () => {
        const { router, goto } = await startRouter('/search?q=test')

        await router.navigate('/results', { preserveQuery: true })

        expect(goto).toHaveBeenCalledWith(expect.stringContaining('q=test'), expect.any(Object))
      })

      it('should preserve hash when preserveHash is true', async () => {
        const { router, goto } = await startRouter('/')
        await router.navigate('/page#section')

        await router.navigate('/page2', { preserveHash: true })

        expect(goto).toHaveBeenCalledWith(expect.stringContaining('#section'), expect.any(Object))
      })

      it('should notify listeners after navigation', async () => {
        const { router } = await startRouter('/')
        const listener = vi.fn<RouteChangeListener>()

        router.subscribe(listener)
        await router.navigate('/new-page')

        // The location follows kit's, so the listener hears where the navigation landed.
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({ pathname: '/new-page' }),
          'push',
        )
      })

      it('should notify with replace action for replace navigation', async () => {
        const { router } = await startRouter('/')
        const listener = vi.fn<RouteChangeListener>()

        router.subscribe(listener)
        await router.navigate('/new-page', { replace: true })

        expect(listener).toHaveBeenCalledWith(expect.anything(), 'replace')
      })

      it('should fall back to window.location when no navigate function provided', () => {
        // The exported `provider` is the core browser router: with no native router it
        // navigates through the History API (`history.pushState`), which is what moves
        // `window.location`; React's bond assigns `location.href` instead.
        provider.navigate('/fallback-path')

        expect(window.location.pathname).toBe('/fallback-path')
      })
    })

    describe('navigateTo (named routes)', () => {
      it('should navigate to a named route', async () => {
        const { router, goto } = await startRouter('/', [{ path: '/products', name: 'products' }])

        await router.navigateTo('products')

        expect(goto).toHaveBeenCalledWith(kitUrl('/products'), expect.any(Object))
      })

      it('should navigate to a named route with params', async () => {
        const { router, goto } = await startRouter('/', [
          { path: '/products/:id', name: 'product-detail' },
        ])

        await router.navigateTo('product-detail', { id: '123' })

        expect(goto).toHaveBeenCalledWith(
          expect.stringContaining('/products/123'),
          expect.any(Object),
        )
      })

      it('should navigate to a named route with query params', async () => {
        const { router, goto } = await startRouter('/', [{ path: '/products', name: 'products' }])

        await router.navigateTo('products', undefined, { sort: 'price', order: 'asc' })

        expect(goto).toHaveBeenCalledWith(expect.stringContaining('sort=price'), expect.any(Object))
        expect(goto).toHaveBeenCalledWith(expect.stringContaining('order=asc'), expect.any(Object))
      })

      it('should throw error for unknown route name', async () => {
        const { router } = await startRouter('/', [{ path: '/products', name: 'products' }])

        expect(() => router.navigateTo('unknown')).toThrow('Route "unknown" not found')
      })

      it('should throw I18nError with routing.error.routeNotFound key for unknown route', async () => {
        const { router } = await startRouter('/', [{ path: '/products', name: 'products' }])

        let caught: unknown
        try {
          router.navigateTo('unknown')
        } catch (err) {
          caught = err
        }
        expect(caught).toBeInstanceOf(I18nError)
        expect((caught as I18nError).i18nKey).toBe('routing.error.routeNotFound')
        expect((caught as I18nError).i18nValues).toEqual({ name: 'unknown' })
      })
    })

    describe('back and forward', () => {
      it('should call navigateFn(-1) for back', async () => {
        const { router } = await startRouter('/')
        const go = vi.spyOn(window.history, 'go').mockImplementation(() => {})

        router.back()

        expect(go).toHaveBeenCalledWith(-1)
      })

      it('should call navigateFn(1) for forward', async () => {
        const { router } = await startRouter('/')
        const go = vi.spyOn(window.history, 'go').mockImplementation(() => {})

        router.forward()

        expect(go).toHaveBeenCalledWith(1)
      })

      it('should fall back to window.history.back when no navigate function', () => {
        // The core browser router moves with `history.go(delta)`, so a back is `go(-1)`.
        const go = vi.spyOn(window.history, 'go').mockImplementation(() => {})

        provider.back()

        expect(go).toHaveBeenCalledWith(-1)
      })

      it('should fall back to window.history.forward when no navigate function', () => {
        const go = vi.spyOn(window.history, 'go').mockImplementation(() => {})

        provider.forward()

        expect(go).toHaveBeenCalledWith(1)
      })
    })

    describe('go', () => {
      it('should call navigateFn with delta', async () => {
        const { router } = await startRouter('/')
        const go = vi.spyOn(window.history, 'go').mockImplementation(() => {})

        router.go(-2)

        expect(go).toHaveBeenCalledWith(-2)
      })

      it('should fall back to window.history.go when no navigate function', () => {
        const go = vi.spyOn(window.history, 'go').mockImplementation(() => {})

        provider.go(-3)

        expect(go).toHaveBeenCalledWith(-3)
      })
    })

    describe('setQuery', () => {
      it('should update query params via navigate', async () => {
        const { router, goto } = await startRouter('/search')

        await router.setQuery({ q: 'test', page: '1' })

        expect(goto).toHaveBeenCalledWith(expect.stringContaining('q=test'), expect.any(Object))
        expect(goto).toHaveBeenCalledWith(expect.stringContaining('page=1'), expect.any(Object))
      })

      it('should replace when replace option is true', async () => {
        const { router, goto } = await startRouter('/search')

        await router.setQuery({ q: 'test' }, { replace: true })

        expect(goto).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ replace: true }),
        )
      })
    })

    describe('setQueryParam', () => {
      it('should update a single query param', async () => {
        const { router, goto } = await startRouter('/search?existing=value')

        await router.setQueryParam('newParam', 'newValue')

        const callArg = goto.mock.calls[0][0]
        expect(callArg).toContain('existing=value')
        expect(callArg).toContain('newParam=newValue')
      })

      it('should remove query param when value is undefined', async () => {
        const { router, goto } = await startRouter('/search?toRemove=value&keep=this')

        await router.setQueryParam('toRemove', undefined)

        const callArg = goto.mock.calls[0][0]
        expect(callArg).toContain('keep=this')
        expect(callArg).not.toContain('toRemove')
      })
    })

    describe('setHash', () => {
      it('should set hash with # prefix', async () => {
        const { router, goto } = await startRouter('/page')

        await router.setHash('section1')

        expect(goto).toHaveBeenCalledWith(expect.stringContaining('#section1'), expect.any(Object))
      })

      it('should handle hash already having # prefix', async () => {
        const { router, goto } = await startRouter('/page')

        await router.setHash('#section2')

        expect(goto).toHaveBeenCalledWith(expect.stringContaining('#section2'), expect.any(Object))
        // Should not have double ##
        expect(goto.mock.calls[0][0]).not.toContain('##')
      })
    })

    describe('isActive', () => {
      it('should return true for matching path', async () => {
        const { router } = await startRouter('/products/123')

        expect(router.isActive('/products/:id')).toBe(true)
      })

      it('should return false for non-matching path', async () => {
        const { router } = await startRouter('/about')

        expect(router.isActive('/products')).toBe(false)
      })

      it('should support exact matching', async () => {
        const { router } = await startRouter('/products')

        expect(router.isActive('/products', true)).toBe(true)
      })
    })

    describe('matchPath', () => {
      it('should return match object for matching path', async () => {
        const { router } = await startRouter('/')

        const match = router.matchPath('/products/:id', '/products/123')

        expect(match).not.toBeNull()
        expect(match?.params.id).toBe('123')
        expect(match?.path).toBe('/products/:id')
        expect(match?.pathname).toBe('/products/123')
      })

      it('should return null for non-matching path', async () => {
        const { router } = await startRouter('/')

        const match = router.matchPath('/products/:id', '/users/123')

        expect(match).toBeNull()
      })

      it('should extract multiple params', async () => {
        const { router } = await startRouter('/')

        const match = router.matchPath('/users/:userId/posts/:postId', '/users/1/posts/2')

        expect(match?.params).toEqual({ userId: '1', postId: '2' })
      })
    })

    describe('generatePath', () => {
      it('should generate path from named route', async () => {
        const { router } = await startRouter('/', [{ path: '/products/:id', name: 'product' }])

        const path = router.generatePath('product', { id: '456' })

        expect(path).toBe('/products/456')
      })

      it('should generate path with query params', async () => {
        const { router } = await startRouter('/', [{ path: '/products', name: 'products' }])

        const path = router.generatePath('products', undefined, { sort: 'name' })

        expect(path).toContain('/products')
        expect(path).toContain('sort=name')
      })

      it('should throw for unknown route name', async () => {
        const { router } = await startRouter('/', [])

        expect(() => router.generatePath('unknown')).toThrow('Route "unknown" not found')
      })

      it('should throw I18nError with routing.error.routeNotFound key for unknown generatePath route', async () => {
        const { router } = await startRouter('/', [])

        let caught: unknown
        try {
          router.generatePath('missing')
        } catch (err) {
          caught = err
        }
        expect(caught).toBeInstanceOf(I18nError)
        expect((caught as I18nError).i18nKey).toBe('routing.error.routeNotFound')
        expect((caught as I18nError).i18nValues).toEqual({ name: 'missing' })
      })
    })

    describe('subscribe', () => {
      it('should add listener and return unsubscribe function', async () => {
        const { router } = await startRouter('/')
        const listener = vi.fn<RouteChangeListener>()

        const unsubscribe = router.subscribe(listener)
        await router.navigate('/test')

        expect(listener).toHaveBeenCalledTimes(1)

        unsubscribe()
        await router.navigate('/another')

        expect(listener).toHaveBeenCalledTimes(1)
      })

      it('should support multiple listeners', async () => {
        const { router } = await startRouter('/')
        const listener1 = vi.fn<RouteChangeListener>()
        const listener2 = vi.fn<RouteChangeListener>()

        router.subscribe(listener1)
        router.subscribe(listener2)
        await router.navigate('/test')

        expect(listener1).toHaveBeenCalled()
        expect(listener2).toHaveBeenCalled()
      })
    })

    describe('navigation guards', () => {
      it('should add guard and execute on navigation', async () => {
        const { router, goto } = await startRouter('/')
        const guard = vi.fn<NavigationGuard>(() => true)

        router.addGuard(guard)
        await router.navigate('/protected')

        expect(guard).toHaveBeenCalledWith(
          expect.objectContaining({ pathname: '/protected' }),
          expect.objectContaining({ pathname: '/' }),
        )
        expect(goto).toHaveBeenCalledWith(kitUrl('/protected'), expect.any(Object))
      })

      it('should prevent navigation when guard returns false', async () => {
        const { router, goto } = await startRouter('/')

        router.addGuard(() => false)
        await router.navigate('/protected')

        expect(goto).not.toHaveBeenCalled()
      })

      it('should redirect when guard returns string', async () => {
        const { router, goto } = await startRouter('/')

        router.addGuard((to) => (to.pathname === '/protected' ? '/login' : true))
        await router.navigate('/protected')

        // A redirect takes the place of the navigation it stopped: this was a push, and kit
        // is told to push (a replace carries `replace: true`; a push leaves it out).
        expect(goto).toHaveBeenCalledWith(
          kitUrl('/login'),
          expect.not.objectContaining({ replace: true }),
        )
      })

      it('should redirect when guard returns object with path', async () => {
        const { router, goto } = await startRouter('/')

        router.addGuard((to) =>
          to.pathname === '/protected' ? { path: '/login', replace: false } : true,
        )
        await router.navigate('/protected')

        expect(goto).toHaveBeenCalledWith(kitUrl('/login'), expect.any(Object))
      })

      it('should support async guards', async () => {
        const { router, goto } = await startRouter('/')

        router.addGuard(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return true
        })

        await router.navigate('/async-protected')

        expect(goto).toHaveBeenCalledWith(kitUrl('/async-protected'), expect.any(Object))
      })

      it('should remove guard when unsubscribe is called', async () => {
        const { router, goto } = await startRouter('/')
        const guard = vi.fn<NavigationGuard>(() => false)

        const removeGuard = router.addGuard(guard)
        await router.navigate('/test1')
        expect(goto).not.toHaveBeenCalled()

        removeGuard()
        await router.navigate('/test2')
        expect(goto).toHaveBeenCalledWith(kitUrl('/test2'), expect.any(Object))
      })

      it('should execute multiple guards in order', async () => {
        const { router } = await startRouter('/')
        const executionOrder: number[] = []

        router.addGuard(() => {
          executionOrder.push(1)
          return true
        })
        router.addGuard(() => {
          executionOrder.push(2)
          return true
        })

        await router.navigate('/multi-guard')

        expect(executionOrder).toEqual([1, 2])
      })

      it('should stop at first failing guard', async () => {
        const { router } = await startRouter('/')
        const guard1 = vi.fn<NavigationGuard>(() => false)
        const guard2 = vi.fn<NavigationGuard>(() => true)

        router.addGuard(guard1)
        router.addGuard(guard2)

        await router.navigate('/stop-early')

        expect(guard1).toHaveBeenCalled()
        expect(guard2).not.toHaveBeenCalled()
      })
    })

    describe('registerRoutes', () => {
      it('should register new routes', async () => {
        const { router } = await startRouter('/', [{ path: '/initial', name: 'initial' }])

        router.registerRoutes([{ path: '/new', name: 'new' }])

        expect(router.getRoutes()).toHaveLength(2)
      })

      it('should make newly registered routes navigable', async () => {
        const { router, goto } = await startRouter('/')

        router.registerRoutes([{ path: '/dynamic/:id', name: 'dynamic' }])

        await router.navigateTo('dynamic', { id: '999' })

        expect(goto).toHaveBeenCalledWith(
          expect.stringContaining('/dynamic/999'),
          expect.any(Object),
        )
      })

      it('should index nested child routes', async () => {
        const { router, goto } = await startRouter('/')

        router.registerRoutes([
          {
            path: '/parent',
            name: 'parent',
            children: [{ path: '/child', name: 'child' }],
          },
        ])

        await router.navigateTo('child')

        expect(goto).toHaveBeenCalledWith(
          expect.stringContaining('/parent/child'),
          expect.any(Object),
        )
      })
    })

    describe('destroy', () => {
      it('should clear all listeners and guards', async () => {
        const { router, goto } = await startRouter('/')
        const listener = vi.fn<RouteChangeListener>()
        const guard = vi.fn<NavigationGuard>(() => true)

        router.subscribe(listener)
        router.addGuard(guard)

        router.destroy()

        await router.navigate('/after-destroy')

        // Guard should not be called after destroy
        expect(guard).not.toHaveBeenCalled()
        // But navigation should still work (guards are cleared)
        expect(goto).toHaveBeenCalled()
      })
    })
  })

  describe('provider', () => {
    it('should be a pre-created router instance', () => {
      expect(provider).toBeDefined()
      expect(provider.getLocation).toBeInstanceOf(Function)
      expect(provider.navigate).toBeInstanceOf(Function)
    })

    it('should have default pathname', () => {
      expect(provider.getLocation().pathname).toBeDefined()
    })
  })

  describe('Utility Functions', () => {
    describe('parseSearchParams', () => {
      it('should parse simple search params', () => {
        const params = new URLSearchParams('page=1&limit=10')
        const result = parseSearchParams(params)

        expect(result.page).toBe('1')
        expect(result.limit).toBe('10')
      })

      it('should handle duplicate keys as arrays', () => {
        const params = new URLSearchParams('tag=react&tag=vue&tag=angular')
        const result = parseSearchParams(params)

        expect(result.tag).toEqual(['react', 'vue', 'angular'])
      })

      it('should return empty object for empty params', () => {
        const params = new URLSearchParams('')
        const result = parseSearchParams(params)

        expect(result).toEqual({})
      })

      it('should handle encoded values', () => {
        const params = new URLSearchParams('q=hello+world&path=%2Ffoo%2Fbar')
        const result = parseSearchParams(params)

        expect(result.q).toBe('hello world')
        expect(result.path).toBe('/foo/bar')
      })
    })

    describe('stringifyQuery', () => {
      it('should stringify simple params', () => {
        const result = stringifyQuery({ page: '1', limit: '10' })

        expect(result).toContain('page=1')
        expect(result).toContain('limit=10')
        expect(result.startsWith('?')).toBe(true)
      })

      it('should handle array values', () => {
        const result = stringifyQuery({ tags: ['react', 'vue'] })

        expect(result).toContain('tags=react')
        expect(result).toContain('tags=vue')
      })

      it('should filter undefined values', () => {
        const result = stringifyQuery({ page: '1', empty: undefined })

        expect(result).toContain('page=1')
        expect(result).not.toContain('empty')
      })

      it('should return empty string for empty params', () => {
        const result = stringifyQuery({})

        expect(result).toBe('')
      })

      it('should encode special characters', () => {
        const result = stringifyQuery({ q: 'hello world', path: '/foo/bar' })

        expect(result).toContain('q=hello%20world')
        expect(result).toContain('path=%2Ffoo%2Fbar')
      })
    })

    describe('matchPath', () => {
      it('should match simple path', () => {
        const match = matchPath('/products', '/products')

        expect(match).not.toBeNull()
        expect(match?.path).toBe('/products')
        expect(match?.isExact).toBe(true)
      })

      it('should match path with params', () => {
        const match = matchPath('/products/:id', '/products/123')

        expect(match).not.toBeNull()
        expect(match?.params.id).toBe('123')
      })

      it('should match path with multiple params', () => {
        const match = matchPath('/users/:userId/posts/:postId', '/users/1/posts/2')

        expect(match?.params).toEqual({ userId: '1', postId: '2' })
      })

      it('should return null for non-matching path', () => {
        const match = matchPath('/products/:id', '/users/123')

        expect(match).toBeNull()
      })

      it('should support wildcard matching', () => {
        const match = matchPath('/api/*', '/api/users/123')

        expect(match).not.toBeNull()
      })

      it('should respect exact option', () => {
        // exact=true by default (exact !== false)
        const exactMatch = matchPath('/products', '/products/extra')
        expect(exactMatch).toBeNull()

        // explicit exact=false for prefix matching
        const prefixMatch = matchPath('/products', '/products/extra', false)
        expect(prefixMatch).not.toBeNull()
      })
    })

    describe('generatePath', () => {
      it('should return pattern when no params', () => {
        const path = generatePath('/products')

        expect(path).toBe('/products')
      })

      it('should replace params in pattern', () => {
        const path = generatePath('/products/:id', { id: '123' })

        expect(path).toBe('/products/123')
      })

      it('should replace multiple params', () => {
        const path = generatePath('/users/:userId/posts/:postId', {
          userId: '1',
          postId: '2',
        })

        expect(path).toBe('/users/1/posts/2')
      })

      it('should throw for missing required param', () => {
        expect(() => generatePath('/products/:id', {})).toThrow(
          'Missing param "id" for path "/products/:id"',
        )
      })

      it('should throw I18nError with routing.error.missingParam key for missing param', () => {
        let caught: unknown
        try {
          generatePath('/products/:id', {})
        } catch (err) {
          caught = err
        }
        expect(caught).toBeInstanceOf(I18nError)
        expect((caught as I18nError).i18nKey).toBe('routing.error.missingParam')
        expect((caught as I18nError).i18nValues).toEqual({ name: 'id', pattern: '/products/:id' })
      })

      it('should encode param values', () => {
        const path = generatePath('/search/:query', { query: 'hello world' })

        expect(path).toBe('/search/hello%20world')
      })
    })

    describe('resolvePath', () => {
      it('should return absolute path as-is', () => {
        const result = resolvePath('/dashboard', '/any/path')

        expect(result).toBe('/dashboard')
      })

      it('should resolve relative path', () => {
        const result = resolvePath('details', '/products/123')

        expect(result).toBe('/products/details')
      })

      it('should resolve parent path with ..', () => {
        const result = resolvePath('../settings', '/users/123/profile')

        expect(result).toBe('/users/settings')
      })

      it('should handle current directory with .', () => {
        const result = resolvePath('./details', '/products/123')

        expect(result).toBe('/products/details')
      })

      it('should resolve multiple .. segments', () => {
        const result = resolvePath('../../dashboard', '/users/123/posts/456')

        expect(result).toBe('/users/dashboard')
      })
    })

    describe('normalizePath', () => {
      it('should remove trailing slash', () => {
        expect(normalizePath('/products/')).toBe('/products')
      })

      it('should remove multiple trailing slashes', () => {
        expect(normalizePath('/products///')).toBe('/products')
      })

      it('should keep root path', () => {
        expect(normalizePath('/')).toBe('/')
      })

      it('should not modify path without trailing slash', () => {
        expect(normalizePath('/products')).toBe('/products')
      })
    })
  })

  describe('Integration Tests', () => {
    it('should work end-to-end: create router -> add guard -> navigate -> subscribe', async () => {
      const { router, goto } = await startRouter('/', [
        { path: '/public', name: 'public' },
        { path: '/protected', name: 'protected' },
      ])

      let isAuthenticated = false
      const locations: RouteLocation[] = []

      // Add auth guard
      router.addGuard((to) => {
        if (to.pathname === '/protected' && !isAuthenticated) {
          return '/login'
        }
        return true
      })

      // Subscribe to changes
      router.subscribe((location) => {
        locations.push(location)
      })

      // Try to access protected route (should redirect). The redirect pushes, like the
      // navigation it stopped: a replace carries `replace: true`, a push leaves it out.
      await router.navigateTo('protected')
      expect(goto).toHaveBeenLastCalledWith(
        kitUrl('/login'),
        expect.not.objectContaining({ replace: true }),
      )

      // Authenticate and try again
      isAuthenticated = true
      await router.navigateTo('protected')
      expect(goto).toHaveBeenLastCalledWith(kitUrl('/protected'), expect.any(Object))

      // Navigate to public route
      await router.navigateTo('public')
      expect(goto).toHaveBeenLastCalledWith(kitUrl('/public'), expect.any(Object))
    })

    it('should handle complex query manipulation', async () => {
      const { router, goto } = await startRouter('/search?q=initial&page=1')

      // Get initial query
      expect(router.getQuery()).toEqual({ q: 'initial', page: '1' })

      // Update single param
      await router.setQueryParam('page', '2')
      expect(goto).toHaveBeenLastCalledWith(expect.stringContaining('page=2'), expect.any(Object))

      // Set new query
      await router.setQuery({ q: 'new-search', filter: 'active' })
      const lastCall = goto.mock.calls.slice(-1)[0][0]
      expect(lastCall).toContain('q=new-search')
      expect(lastCall).toContain('filter=active')
    })

    it('should generate and use paths correctly', async () => {
      const { router, goto } = await startRouter('/', [
        { path: '/blog/:year/:month/:slug', name: 'blog-post' },
      ])

      // Use router to generate path
      const generatedPath = router.generatePath('blog-post', {
        year: '2024',
        month: '01',
        slug: 'hello-world',
      })

      expect(generatedPath).toBe('/blog/2024/01/hello-world')

      // Navigate to generated path
      await router.navigate(generatedPath)
      expect(goto).toHaveBeenCalledWith(kitUrl('/blog/2024/01/hello-world'), expect.any(Object))
    })
  })
})
