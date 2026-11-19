/**
 * The unit tests this bond carries from `@molecule/app-routing-react-router`'s
 * `src/__tests__/index.test.ts`, under the same titles, driving them over the bond's real
 * native router: every router here is a real Solid Router (`<MemoryRouter>` over
 * `createSolidMemoryHistory`), and "navigateFn" is that router's own `useNavigate()`,
 * recorded by a spy that forwards to it.
 *
 * Where a title names something only React's bond has (a config snapshot, the fallback to
 * `window.location` when there is no native navigate, a new location the snapshot cannot
 * update), the title keeps its words and its body tests what the port actually does instead;
 * a comment says so.
 */
import type * as SolidRouterModule from '@solidjs/router'
import type { NavigateOptions, RouteSectionProps } from '@solidjs/router'
import { MemoryRouter, Route } from '@solidjs/router'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Solid Router's own `useNavigate()`, recorded. Every router under test is the real memory
 * router; this spy stands in for `useNavigate` only so the tests can see what the bond asked
 * the native router to do, and it forwards each call, so the navigation really happens.
 */
const { navigateSpy } = vi.hoisted(() => ({
  navigateSpy: vi.fn<(to: string | number, options?: Partial<NavigateOptions>) => void>(),
}))

vi.mock('@solidjs/router', async (importOriginal) => {
  const actual = await importOriginal<typeof SolidRouterModule>()
  return {
    ...actual,
    useNavigate: () => {
      const native = actual.useNavigate()
      navigateSpy.mockImplementation((to, options) => {
        if (typeof to === 'number') native(to)
        else native(to, options)
      })
      return navigateSpy
    },
  }
})

import { I18nError } from '@molecule/app-i18n'
import type { RouteDefinition, RouteLocation, Router } from '@molecule/app-routing'

import {
  createSolidRouter,
  generatePath,
  matchPath,
  normalizePath,
  parseSearchParams,
  provider,
  resolvePath,
  stringifyQuery,
} from '../index.js'
import { createSolidMemoryHistory } from '../memory-history.js'

// Flush macrotasks so a navigation in flight commits
const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

// Save the original window location, which the provider's fallback tests move
const originalUrl = globalThis.location.href

/** The options one mounted router is built with. */
interface MountOptions {
  /** The paths the memory history starts at; the last one is current. Defaults to `['/']`. */
  entries?: string[]
  /** The native `<Route>` children the router matches, so `useParams()` reads them. */
  routeChildren?: JSX.Element
  /** Named route definitions handed to `createSolidRouter`. */
  namedRoutes?: RouteDefinition[]
}

/** One mounted router under test. */
interface Mounted {
  /** The molecule router the bond built. */
  router: Router
  /** The element its Solid Router rendered into. */
  container: HTMLElement
  /** Waits until a navigation in flight has committed. */
  settle: () => Promise<void>
  /** Removes the router and its native router. */
  unmount: () => void
}

describe('@molecule/app-routing-solid-router', () => {
  /** An empty page for a route that only has to match. */
  const Empty = (): JSX.Element => <div />

  /**
   * Mounts a real Solid Router at the given paths and builds the molecule router inside its
   * root component, the way the bond's example does.
   *
   * @param options - Where the memory history starts and what the native router matches.
   * @returns The mounted router and its helpers.
   */
  const mountRouter = (options: MountOptions = {}): Mounted => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const memory = createSolidMemoryHistory(options.entries ?? ['/'])
    let created: Router | undefined
    navigateSpy.mockClear()
    const Root = (props: RouteSectionProps): JSX.Element => {
      created = createSolidRouter({ history: memory, routes: options.namedRoutes })
      return props.children
    }
    const dispose = render(
      () => (
        <MemoryRouter history={memory} root={Root}>
          {options.routeChildren}
        </MemoryRouter>
      ),
      container,
    )
    if (created === undefined) {
      dispose()
      throw new Error('the Solid Router did not mount its root; the harness has no router')
    }
    const router: Router = created
    return {
      router,
      container,
      settle: async () => {
        for (let round = 0; round < 4; round++) await flush()
      },
      unmount: () => {
        router.destroy()
        dispose()
        container.remove()
      },
    }
  }

  describe('createSolidRouter', () => {
    describe('initialization', () => {
      it('should create a router with default config', () => {
        const { router, unmount } = mountRouter()

        expect(router).toBeDefined()
        expect(router.getLocation).toBeInstanceOf(Function)
        expect(router.getParams).toBeInstanceOf(Function)
        expect(router.getQuery).toBeInstanceOf(Function)
        expect(router.navigate).toBeInstanceOf(Function)

        unmount()
      })

      it('should create a router with a provided location', () => {
        // The port has no location config to provide: the native router's location is the
        // one the bond reads, so the memory history starts there instead.
        const { router, unmount } = mountRouter({ entries: ['/dashboard?tab=settings#section'] })

        const location = router.getLocation()
        expect(location.pathname).toBe('/dashboard')
        expect(location.search).toBe('?tab=settings')
        expect(location.hash).toBe('#section')

        unmount()
      })

      it('should create a router with params', () => {
        // The port has no params config to provide: the native router matches the route and
        // the bond reads the params Solid Router matched.
        const { router, unmount } = mountRouter({
          entries: ['/users/123'],
          routeChildren: <Route path="/users/:id" component={Empty} />,
        })

        const params = router.getParams<{ id: string }>()
        expect(params.id).toBe('123')

        unmount()
      })

      it('should create a router with named routes', () => {
        const routes: RouteDefinition[] = [
          { path: '/products', name: 'products' },
          { path: '/products/:id', name: 'product-detail' },
          { path: '/users/:userId/posts/:postId', name: 'user-post' },
        ]

        const { router, unmount } = mountRouter({ namedRoutes: routes })

        expect(router.getRoutes()).toEqual(routes)

        unmount()
      })

      it('should filter undefined params', () => {
        const { router, unmount } = mountRouter({
          entries: ['/things/123'],
          routeChildren: <Route path="/things/:id/:optional?" component={Empty} />,
        })

        const params = router.getParams()
        expect(params.id).toBe('123')
        expect('optional' in params).toBe(false)

        unmount()
      })
    })

    describe('getLocation', () => {
      it('should return current location from provided location object', async () => {
        // The location is the native router's, not a provided snapshot: navigate to the path
        // with its state, and the bond reads the location and the history entry's key back.
        const { router, settle, unmount } = mountRouter()

        await router.navigate('/about?ref=home#top', { state: { from: 'nav' } })
        await settle()

        const location = router.getLocation()
        expect(location.pathname).toBe('/about')
        expect(location.search).toBe('?ref=home')
        expect(location.hash).toBe('#top')
        expect(location.state).toEqual({ from: 'nav' })
        expect(location.key).toEqual(expect.any(String))

        unmount()
      })

      it('should return default location when no config provided', () => {
        const { router, unmount } = mountRouter()

        const location = router.getLocation()
        expect(location.pathname).toBe('/')
        expect(location.search).toBe('')
        expect(location.hash).toBe('')

        unmount()
      })
    })

    describe('getParams', () => {
      it('should return empty object when no params', () => {
        const { router, unmount } = mountRouter({ entries: ['/home'] })

        expect(router.getParams()).toEqual({})

        unmount()
      })

      it('should return typed params', () => {
        type ProductParams = {
          id: string
          category: string
        }

        const { router, unmount } = mountRouter({
          entries: ['/products/electronics/123'],
          routeChildren: <Route path="/products/:category/:id" component={Empty} />,
        })

        const params = router.getParams<ProductParams>()
        expect(params.id).toBe('123')
        expect(params.category).toBe('electronics')

        unmount()
      })
    })

    describe('getQuery', () => {
      it('should return empty object when no search params', () => {
        const { router, unmount } = mountRouter({ entries: ['/home'] })

        expect(router.getQuery()).toEqual({})

        unmount()
      })

      it('should parse search string into query params', () => {
        const { router, unmount } = mountRouter({ entries: ['/search?page=1&limit=10'] })

        const query = router.getQuery()
        expect(query.page).toBe('1')
        expect(query.limit).toBe('10')

        unmount()
      })

      it('should handle duplicate keys as arrays', () => {
        const { router, unmount } = mountRouter({ entries: ['/search?tag=react&tag=vue'] })

        const query = router.getQuery()
        expect(query.tag).toEqual(['react', 'vue'])

        unmount()
      })
    })

    describe('getQueryParam', () => {
      it('should return undefined for missing param', () => {
        const { router, unmount } = mountRouter({ entries: ['/search'] })

        expect(router.getQueryParam('missing')).toBeUndefined()

        unmount()
      })

      it('should return string param value', () => {
        const { router, unmount } = mountRouter({ entries: ['/search?page=5'] })

        expect(router.getQueryParam('page')).toBe('5')

        unmount()
      })
    })

    describe('getHash', () => {
      it('should return hash from location', () => {
        const { router, unmount } = mountRouter({ entries: ['/page#section1'] })

        expect(router.getHash()).toBe('#section1')

        unmount()
      })

      it('should return empty string when no hash', () => {
        const { router, unmount } = mountRouter({ entries: ['/page'] })

        expect(router.getHash()).toBe('')

        unmount()
      })
    })

    describe('navigate', () => {
      it('should call navigateFn for regular navigation', async () => {
        const { router, settle, unmount } = mountRouter()

        await router.navigate('/products')
        await settle()

        // The state is the port's own entry bookkeeping (it stamps each entry's key), so the
        // assertion covers the action, and the location shows the navigation landed.
        expect(navigateSpy).toHaveBeenCalledWith(
          '/products',
          expect.objectContaining({ replace: false }),
        )
        expect(router.getLocation().pathname).toBe('/products')

        unmount()
      })

      it('should call navigateFn with replace option', async () => {
        const { router, settle, unmount } = mountRouter()

        await router.navigate('/products', { replace: true })
        await settle()

        expect(navigateSpy).toHaveBeenCalledWith(
          '/products',
          expect.objectContaining({ replace: true }),
        )
        expect(router.getLocation().pathname).toBe('/products')

        unmount()
      })

      it('should pass state to navigateFn', async () => {
        const { router, settle, unmount } = mountRouter()

        await router.navigate('/products', { state: { fromCart: true } })
        await settle()

        expect(navigateSpy).toHaveBeenCalledWith(
          '/products',
          expect.objectContaining({ state: expect.objectContaining({ fromCart: true }) }),
        )
        expect(router.getLocation().state).toEqual({ fromCart: true })

        unmount()
      })

      it('should preserve query when preserveQuery is true', async () => {
        const { router, unmount } = mountRouter({ entries: ['/search?q=test'] })

        await router.navigate('/results', { preserveQuery: true })

        expect(navigateSpy).toHaveBeenCalledWith(
          expect.stringContaining('q=test'),
          expect.any(Object),
        )

        unmount()
      })

      it('should preserve hash when preserveHash is true', async () => {
        const { router, unmount } = mountRouter({ entries: ['/#section'] })

        await router.navigate('/page', { preserveHash: true })

        expect(navigateSpy).toHaveBeenCalledWith(
          expect.stringContaining('#section'),
          expect.any(Object),
        )

        unmount()
      })

      it('should notify listeners after navigation', async () => {
        const { router, settle, unmount } = mountRouter()
        const listener = vi.fn()

        router.subscribe(listener)
        await router.navigate('/new-page')
        await settle()

        // React's snapshot history cannot update its location, so React's listener hears the
        // location it was configured with; the real router reports the one it committed.
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({ pathname: '/new-page' }),
          'push',
        )

        unmount()
      })

      it('should notify with replace action for replace navigation', async () => {
        const { router, settle, unmount } = mountRouter()
        const listener = vi.fn()

        router.subscribe(listener)
        await router.navigate('/new-page', { replace: true })
        await settle()

        expect(listener).toHaveBeenCalledWith(expect.anything(), 'replace')

        unmount()
      })

      it('should fall back to window.location when no navigate function provided', async () => {
        // The exported `provider` is the core browser router, which writes the browser's own
        // history: there is no navigate function, so the URL itself moves.
        provider.navigate('/fallback-path')
        await flush()

        expect(window.location.pathname).toBe('/fallback-path')

        window.history.replaceState(null, '', '/')
      })
    })

    describe('navigateTo (named routes)', () => {
      it('should navigate to a named route', async () => {
        const { router, settle, unmount } = mountRouter({
          namedRoutes: [{ path: '/products', name: 'products' }],
        })

        router.navigateTo('products')
        await settle()

        expect(navigateSpy).toHaveBeenCalledWith('/products', expect.any(Object))

        unmount()
      })

      it('should navigate to a named route with params', async () => {
        const { router, settle, unmount } = mountRouter({
          namedRoutes: [{ path: '/products/:id', name: 'product-detail' }],
        })

        router.navigateTo('product-detail', { id: '123' })
        await settle()

        expect(navigateSpy).toHaveBeenCalledWith(
          expect.stringContaining('/products/123'),
          expect.any(Object),
        )

        unmount()
      })

      it('should navigate to a named route with query params', async () => {
        const { router, settle, unmount } = mountRouter({
          namedRoutes: [{ path: '/products', name: 'products' }],
        })

        router.navigateTo('products', undefined, { sort: 'price', order: 'asc' })
        await settle()

        expect(navigateSpy).toHaveBeenCalledWith(
          expect.stringContaining('sort=price'),
          expect.any(Object),
        )
        expect(navigateSpy).toHaveBeenCalledWith(
          expect.stringContaining('order=asc'),
          expect.any(Object),
        )

        unmount()
      })

      it('should throw error for unknown route name', () => {
        const { router, unmount } = mountRouter({
          namedRoutes: [{ path: '/products', name: 'products' }],
        })

        expect(() => router.navigateTo('unknown')).toThrow('Route "unknown" not found')

        unmount()
      })

      it('should throw I18nError with routing.error.routeNotFound key for unknown route', () => {
        const { router, unmount } = mountRouter({
          namedRoutes: [{ path: '/products', name: 'products' }],
        })

        let caught: unknown
        try {
          router.navigateTo('unknown')
        } catch (err) {
          caught = err
        }
        expect(caught).toBeInstanceOf(I18nError)
        if (!(caught instanceof I18nError)) throw new Error('not an I18nError')
        expect(caught.i18nKey).toBe('routing.error.routeNotFound')
        expect(caught.i18nValues).toEqual({ name: 'unknown' })

        unmount()
      })
    })

    describe('back and forward', () => {
      it('should call navigateFn(-1) for back', () => {
        const { router, unmount } = mountRouter()

        router.back()

        expect(navigateSpy).toHaveBeenCalledWith(-1)

        unmount()
      })

      it('should call navigateFn(1) for forward', () => {
        const { router, unmount } = mountRouter()

        router.forward()

        expect(navigateSpy).toHaveBeenCalledWith(1)

        unmount()
      })

      it('should fall back to window.history.back when no navigate function', () => {
        // The core browser router moves through `window.history.go(delta)`, so a back step is
        // that call with -1.
        const go = vi.spyOn(window.history, 'go').mockImplementation(() => undefined)

        provider.back()

        expect(go).toHaveBeenCalledWith(-1)
        go.mockRestore()
      })

      it('should fall back to window.history.forward when no navigate function', () => {
        const go = vi.spyOn(window.history, 'go').mockImplementation(() => undefined)

        provider.forward()

        expect(go).toHaveBeenCalledWith(1)
        go.mockRestore()
      })
    })

    describe('go', () => {
      it('should call navigateFn with delta', () => {
        const { router, unmount } = mountRouter()

        router.go(-2)

        expect(navigateSpy).toHaveBeenCalledWith(-2)

        unmount()
      })

      it('should fall back to window.history.go when no navigate function', () => {
        const go = vi.spyOn(window.history, 'go').mockImplementation(() => undefined)

        provider.go(-3)

        expect(go).toHaveBeenCalledWith(-3)
        go.mockRestore()
      })
    })

    describe('setQuery', () => {
      it('should update query params via navigate', async () => {
        const { router, settle, unmount } = mountRouter({ entries: ['/search'] })

        router.setQuery({ q: 'test', page: '1' })
        await settle()

        expect(navigateSpy).toHaveBeenCalledWith(
          expect.stringContaining('q=test'),
          expect.any(Object),
        )
        expect(navigateSpy).toHaveBeenCalledWith(
          expect.stringContaining('page=1'),
          expect.any(Object),
        )

        unmount()
      })

      it('should replace when replace option is true', async () => {
        const { router, settle, unmount } = mountRouter({ entries: ['/search'] })

        router.setQuery({ q: 'test' }, { replace: true })
        await settle()

        expect(navigateSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ replace: true }),
        )

        unmount()
      })
    })

    describe('setQueryParam', () => {
      it('should update a single query param', async () => {
        const { router, settle, unmount } = mountRouter({ entries: ['/search?existing=value'] })

        router.setQueryParam('newParam', 'newValue')
        await settle()

        const callArg = navigateSpy.mock.calls[0][0]
        expect(callArg).toContain('existing=value')
        expect(callArg).toContain('newParam=newValue')

        unmount()
      })

      it('should remove query param when value is undefined', async () => {
        const { router, settle, unmount } = mountRouter({
          entries: ['/search?toRemove=value&keep=this'],
        })

        router.setQueryParam('toRemove', undefined)
        await settle()

        const callArg = navigateSpy.mock.calls[0][0]
        expect(callArg).toContain('keep=this')
        expect(callArg).not.toContain('toRemove')

        unmount()
      })
    })

    describe('setHash', () => {
      it('should set hash with # prefix', async () => {
        const { router, settle, unmount } = mountRouter({ entries: ['/page'] })

        router.setHash('section1')
        await settle()

        expect(navigateSpy).toHaveBeenCalledWith(
          expect.stringContaining('#section1'),
          expect.any(Object),
        )

        unmount()
      })

      it('should handle hash already having # prefix', async () => {
        const { router, settle, unmount } = mountRouter({ entries: ['/page'] })

        router.setHash('#section2')
        await settle()

        expect(navigateSpy).toHaveBeenCalledWith(
          expect.stringContaining('#section2'),
          expect.any(Object),
        )
        // Should not have double ##
        expect(navigateSpy.mock.calls[0][0]).not.toContain('##')

        unmount()
      })
    })

    describe('isActive', () => {
      it('should return true for matching path', () => {
        const { router, unmount } = mountRouter({ entries: ['/products/123'] })

        expect(router.isActive('/products/:id')).toBe(true)

        unmount()
      })

      it('should return false for non-matching path', () => {
        const { router, unmount } = mountRouter({ entries: ['/about'] })

        expect(router.isActive('/products')).toBe(false)

        unmount()
      })

      it('should support exact matching', () => {
        const { router, unmount } = mountRouter({ entries: ['/products'] })

        expect(router.isActive('/products', true)).toBe(true)

        unmount()
      })
    })

    describe('matchPath', () => {
      it('should return match object for matching path', () => {
        const { router, unmount } = mountRouter()

        const match = router.matchPath('/products/:id', '/products/123')

        expect(match).not.toBeNull()
        expect(match?.params.id).toBe('123')
        expect(match?.path).toBe('/products/:id')
        expect(match?.pathname).toBe('/products/123')

        unmount()
      })

      it('should return null for non-matching path', () => {
        const { router, unmount } = mountRouter()

        const match = router.matchPath('/products/:id', '/users/123')

        expect(match).toBeNull()

        unmount()
      })

      it('should extract multiple params', () => {
        const { router, unmount } = mountRouter()

        const match = router.matchPath('/users/:userId/posts/:postId', '/users/1/posts/2')

        expect(match?.params).toEqual({ userId: '1', postId: '2' })

        unmount()
      })
    })

    describe('generatePath', () => {
      it('should generate path from named route', () => {
        const { router, unmount } = mountRouter({
          namedRoutes: [{ path: '/products/:id', name: 'product' }],
        })

        const path = router.generatePath('product', { id: '456' })

        expect(path).toBe('/products/456')

        unmount()
      })

      it('should generate path with query params', () => {
        const { router, unmount } = mountRouter({
          namedRoutes: [{ path: '/products', name: 'products' }],
        })

        const path = router.generatePath('products', undefined, { sort: 'name' })

        expect(path).toContain('/products')
        expect(path).toContain('sort=name')

        unmount()
      })

      it('should throw for unknown route name', () => {
        const { router, unmount } = mountRouter({ namedRoutes: [] })

        expect(() => router.generatePath('unknown')).toThrow('Route "unknown" not found')

        unmount()
      })

      it('should throw I18nError with routing.error.routeNotFound key for unknown generatePath route', () => {
        const { router, unmount } = mountRouter({ namedRoutes: [] })

        let caught: unknown
        try {
          router.generatePath('missing')
        } catch (err) {
          caught = err
        }
        expect(caught).toBeInstanceOf(I18nError)
        if (!(caught instanceof I18nError)) throw new Error('not an I18nError')
        expect(caught.i18nKey).toBe('routing.error.routeNotFound')
        expect(caught.i18nValues).toEqual({ name: 'missing' })

        unmount()
      })
    })

    describe('subscribe', () => {
      it('should add listener and return unsubscribe function', async () => {
        const { router, settle, unmount } = mountRouter()
        const listener = vi.fn()

        const unsubscribe = router.subscribe(listener)
        await router.navigate('/test')
        await settle()

        expect(listener).toHaveBeenCalledTimes(1)

        unsubscribe()
        await router.navigate('/another')
        await settle()

        expect(listener).toHaveBeenCalledTimes(1)

        unmount()
      })

      it('should support multiple listeners', async () => {
        const { router, settle, unmount } = mountRouter()
        const listener1 = vi.fn()
        const listener2 = vi.fn()

        router.subscribe(listener1)
        router.subscribe(listener2)
        await router.navigate('/test')
        await settle()

        expect(listener1).toHaveBeenCalled()
        expect(listener2).toHaveBeenCalled()

        unmount()
      })
    })

    describe('navigation guards', () => {
      it('should add guard and execute on navigation', async () => {
        const { router, settle, unmount } = mountRouter()
        const guard = vi.fn().mockReturnValue(true)

        router.addGuard(guard)
        await router.navigate('/protected')
        await settle()

        expect(guard).toHaveBeenCalledWith(
          expect.objectContaining({ pathname: '/protected' }),
          expect.objectContaining({ pathname: '/' }),
        )
        expect(navigateSpy).toHaveBeenCalledWith('/protected', expect.any(Object))

        unmount()
      })

      it('should prevent navigation when guard returns false', async () => {
        const { router, settle, unmount } = mountRouter()

        router.addGuard(() => false)
        await router.navigate('/protected')
        await settle()

        expect(navigateSpy).not.toHaveBeenCalled()

        unmount()
      })

      it('should redirect when guard returns string', async () => {
        const { router, settle, unmount } = mountRouter()

        router.addGuard((to) => (to.pathname === '/protected' ? '/login' : true))
        await router.navigate('/protected')
        await settle()

        // A redirect takes the place of the navigation it stopped: this was a push, so
        // the redirect navigates as a push too (the shared `createHistoryRouter`
        // semantics every routing bond's conformance suite enforces).
        expect(navigateSpy).toHaveBeenCalledWith(
          '/login',
          expect.objectContaining({ replace: false }),
        )

        unmount()
      })

      it('should redirect when guard returns object with path', async () => {
        const { router, settle, unmount } = mountRouter()

        router.addGuard((to) =>
          to.pathname === '/protected' ? { path: '/login', replace: false } : true,
        )
        await router.navigate('/protected')
        await settle()

        expect(navigateSpy).toHaveBeenCalledWith('/login', expect.any(Object))

        unmount()
      })

      it('should support async guards', async () => {
        const { router, settle, unmount } = mountRouter()

        router.addGuard(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return true
        })

        await router.navigate('/async-protected')
        await settle()

        expect(navigateSpy).toHaveBeenCalledWith('/async-protected', expect.any(Object))

        unmount()
      })

      it('should remove guard when unsubscribe is called', async () => {
        const { router, settle, unmount } = mountRouter()
        const guard = vi.fn().mockReturnValue(false)

        const removeGuard = router.addGuard(guard)
        await router.navigate('/test1')
        await settle()
        expect(navigateSpy).not.toHaveBeenCalled()

        removeGuard()
        await router.navigate('/test2')
        await settle()
        expect(navigateSpy).toHaveBeenCalledWith('/test2', expect.any(Object))

        unmount()
      })

      it('should execute multiple guards in order', async () => {
        const { router, settle, unmount } = mountRouter()
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
        await settle()

        expect(executionOrder).toEqual([1, 2])

        unmount()
      })

      it('should stop at first failing guard', async () => {
        const { router, settle, unmount } = mountRouter()
        const guard1 = vi.fn().mockReturnValue(false)
        const guard2 = vi.fn().mockReturnValue(true)

        router.addGuard(guard1)
        router.addGuard(guard2)

        await router.navigate('/stop-early')
        await settle()

        expect(guard1).toHaveBeenCalled()
        expect(guard2).not.toHaveBeenCalled()

        unmount()
      })
    })

    describe('registerRoutes', () => {
      it('should register new routes', () => {
        const { router, unmount } = mountRouter({
          namedRoutes: [{ path: '/initial', name: 'initial' }],
        })

        router.registerRoutes([{ path: '/new', name: 'new' }])

        expect(router.getRoutes()).toHaveLength(2)

        unmount()
      })

      it('should make newly registered routes navigable', async () => {
        const { router, settle, unmount } = mountRouter()

        router.registerRoutes([{ path: '/dynamic/:id', name: 'dynamic' }])

        router.navigateTo('dynamic', { id: '999' })
        await settle()

        expect(navigateSpy).toHaveBeenCalledWith(
          expect.stringContaining('/dynamic/999'),
          expect.any(Object),
        )

        unmount()
      })

      it('should index nested child routes', async () => {
        const { router, settle, unmount } = mountRouter()

        router.registerRoutes([
          {
            path: '/parent',
            name: 'parent',
            children: [{ path: '/child', name: 'child' }],
          },
        ])

        router.navigateTo('child')
        await settle()

        expect(navigateSpy).toHaveBeenCalledWith(
          expect.stringContaining('/parent/child'),
          expect.any(Object),
        )

        unmount()
      })
    })

    describe('destroy', () => {
      it('should clear all listeners and guards', async () => {
        const { router, settle, unmount } = mountRouter()
        const listener = vi.fn()
        const guard = vi.fn().mockReturnValue(true)

        router.subscribe(listener)
        router.addGuard(guard)

        router.destroy()

        await router.navigate('/after-destroy')
        await settle()

        // Guard should not be called after destroy
        expect(guard).not.toHaveBeenCalled()
        // But navigation should still work (guards are cleared)
        expect(navigateSpy).toHaveBeenCalled()

        unmount()
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
        if (!(caught instanceof I18nError)) throw new Error('not an I18nError')
        expect(caught.i18nKey).toBe('routing.error.missingParam')
        expect(caught.i18nValues).toEqual({ name: 'id', pattern: '/products/:id' })
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
      const { router, settle, unmount } = mountRouter({
        namedRoutes: [
          { path: '/public', name: 'public' },
          { path: '/protected', name: 'protected' },
        ],
      })

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

      // Try to access protected route (should redirect). The redirect navigates as a
      // push, like the navigation it stopped (the shared `createHistoryRouter`
      // semantics every routing bond's conformance suite enforces).
      router.navigateTo('protected')
      await settle()
      expect(navigateSpy).toHaveBeenLastCalledWith(
        '/login',
        expect.objectContaining({ replace: false }),
      )

      // Authenticate and try again
      isAuthenticated = true
      router.navigateTo('protected')
      await settle()
      expect(navigateSpy).toHaveBeenLastCalledWith('/protected', expect.any(Object))

      // Navigate to public route
      router.navigateTo('public')
      await settle()
      expect(navigateSpy).toHaveBeenLastCalledWith('/public', expect.any(Object))
      expect(locations.at(-1)?.pathname).toBe('/public')

      unmount()
    })

    it('should handle complex query manipulation', async () => {
      const { router, settle, unmount } = mountRouter({ entries: ['/search?q=initial&page=1'] })

      // Get initial query
      expect(router.getQuery()).toEqual({ q: 'initial', page: '1' })

      // Update single param
      router.setQueryParam('page', '2')
      await settle()
      expect(navigateSpy).toHaveBeenLastCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object),
      )

      // Set new query
      router.setQuery({ q: 'new-search', filter: 'active' })
      await settle()
      const lastCall = navigateSpy.mock.calls.slice(-1)[0][0]
      expect(lastCall).toContain('q=new-search')
      expect(lastCall).toContain('filter=active')

      unmount()
    })

    it('should generate and use paths correctly', async () => {
      const { router, settle, unmount } = mountRouter({
        namedRoutes: [{ path: '/blog/:year/:month/:slug', name: 'blog-post' }],
      })

      // Use router to generate path
      const generatedPath = router.generatePath('blog-post', {
        year: '2024',
        month: '01',
        slug: 'hello-world',
      })

      expect(generatedPath).toBe('/blog/2024/01/hello-world')

      // Navigate to generated path
      router.navigate(generatedPath)
      await settle()
      expect(navigateSpy).toHaveBeenCalledWith('/blog/2024/01/hello-world', expect.any(Object))

      unmount()
    })
  })
})

// Restore the URL the provider's fallback tests may have moved
afterEach(() => {
  window.history.replaceState(null, '', originalUrl)
})
