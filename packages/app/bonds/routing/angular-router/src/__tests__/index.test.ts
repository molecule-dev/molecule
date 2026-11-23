// @vitest-environment jsdom
/**
 * The React routing bond's `index.test.ts`, carried to the Angular Router bond.
 *
 * Every case runs over a REAL Angular Router: one application is booted per file
 * (`provideRouter` behind `APP_BASE_HREF`, as the conformance suite bootstraps it), each
 * case navigates the native router to the URL it needs and builds the bond's router with
 * {@link createAngularRouter}. "navigateFn" is Angular's own native move, spied:
 * `Router.navigateByUrl` for a push or a replace, and `Location.historyGo` for a history
 * delta. The cases that say "no navigate function" drive the exported `provider`, which is
 * the core browser router.
 *
 * @module
 */

import '@angular/compiler'
import { APP_BASE_HREF, Location } from '@angular/common'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import {
  type NavigationBehaviorOptions,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  provideRouter,
  type Route,
  Router as AngularRouter,
  RouterOutlet,
} from '@angular/router'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { I18nError } from '@molecule/app-i18n'

import type { AngularRouterOptions, RouteDefinition, RouteLocation, Router } from '../index.js'
import {
  createAngularRouter,
  generatePath,
  matchPath,
  normalizePath,
  parseSearchParams,
  provider,
  resolvePath,
  stringifyQuery,
} from '../index.js'

/** A route target with no markup; the port matches routes, it never renders them. */
const Empty: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-index-empty',
  standalone: true,
  template: '',
})(class EmptyRouteComponent {})

/** The bootstrap root: an outlet, so Angular can activate the route it matched. */
const Root: Type<unknown> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-index-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})(class RootComponent {})

/**
 * The native route table: the param routes the port's params cases read (`/users/:id`,
 * `/products/:category/:id`) and a catch-all for every other path a case navigates to.
 */
const ROUTES: Route[] = [
  { path: 'users/:id', component: Empty },
  { path: 'products/:category/:id', component: Empty },
  { path: '**', component: Empty },
]

/** A settled macrotask: Angular chains a navigation's work through timers. */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/** Flushes the microtask queue, as the React file's `flush` does. */
const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Counts the navigations the native router has in flight, so a bootstrap can wait for the
 * initial navigation to settle before the first case drives the router.
 *
 * @param angularRouter - The booted Angular Router.
 * @returns The `settle` wait and the `stop` for the counter's subscription.
 */
const countNavigations = (
  angularRouter: AngularRouter,
): { settle: () => Promise<void>; stop: () => void } => {
  let inFlight = 0
  const subscription = angularRouter.events.subscribe((event) => {
    if (event instanceof NavigationStart) {
      inFlight += 1
    } else if (
      event instanceof NavigationEnd ||
      event instanceof NavigationCancel ||
      event instanceof NavigationError ||
      event instanceof NavigationSkipped
    ) {
      inFlight = Math.max(0, inFlight - 1)
    }
  })
  const settle = async (): Promise<void> => {
    for (let round = 0; round < 50; round += 1) {
      await tick()
      if (inFlight === 0) {
        await tick()
        if (inFlight === 0) return
      }
    }
    throw new Error(`the Angular Router never went idle (${inFlight} navigations in flight)`)
  }
  return { settle, stop: () => subscription.unsubscribe() }
}

describe('@molecule/app-routing-angular-router', () => {
  let appRef: ApplicationRef
  let angularRouter: AngularRouter
  let angularLocation: Location
  /** The routers this case built, destroyed after it so no case hears another's moves. */
  let routers: Router[] = []

  /**
   * Moves the native router to `path`, replacing the entry so cases do not pile up history.
   *
   * @param path - The URL to land on (query string and hash included).
   * @param extras - Extra native navigation options (a state, for instance).
   */
  const go = async (path: string, extras: NavigationBehaviorOptions = {}): Promise<void> => {
    await angularRouter.navigateByUrl(path, {
      replaceUrl: true,
      onSameUrlNavigation: 'reload',
      ...extras,
    })
  }

  /**
   * Builds the bond's router over the booted native router, as `provideMoleculeRouter` does.
   *
   * @param options - The molecule route definitions the router should know.
   * @returns The router, destroyed when the case ends.
   */
  const openRouter = (options: AngularRouterOptions = {}): Router => {
    const router = createAngularRouter(angularRouter, angularLocation, options)
    routers.push(router)
    return router
  }

  /**
   * Navigates the native router to `path` and builds the bond's router there.
   *
   * @param path - The URL the case starts from.
   * @param options - The molecule route definitions the router should know.
   * @returns The router.
   */
  const open = async (path: string, options: AngularRouterOptions = {}): Promise<Router> => {
    await go(path)
    return openRouter(options)
  }

  /** Spies the native navigate the bond calls for a push or a replace. */
  const spyNavigate = () => vi.spyOn(angularRouter, 'navigateByUrl')

  beforeAll(async () => {
    window.history.replaceState(null, '', '/')
    appRef = await createApplication({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(ROUTES),
        { provide: APP_BASE_HREF, useValue: '/' },
      ],
    })
    // Subscribe the idle counter before bootstrapping, so the initial navigation counts.
    angularRouter = appRef.injector.get(AngularRouter)
    angularLocation = appRef.injector.get(Location)
    const { settle, stop } = countNavigations(angularRouter)
    const host = document.createElement('mol-index-root')
    document.body.appendChild(host)
    appRef.bootstrap(Root, host)
    await settle()
    stop()
  })

  afterEach(() => {
    for (const router of routers) router.destroy()
    routers = []
    vi.restoreAllMocks()
  })

  afterAll(() => {
    appRef.destroy()
  })

  describe('createAngularRouter', () => {
    describe('initialization', () => {
      it('should create a router with default config', async () => {
        // The port's router always drives the native router, so "default config" is the
        // app's root URL with no molecule route definitions.
        const router = await open('/')

        expect(router).toBeDefined()
        expect(router.getLocation).toBeInstanceOf(Function)
        expect(router.getParams).toBeInstanceOf(Function)
        expect(router.getQuery).toBeInstanceOf(Function)
        expect(router.navigate).toBeInstanceOf(Function)
      })

      it('should create a router with a provided location', async () => {
        // React passed its location in the config; the port reads the location the native
        // router's navigation landed on.
        const router = await open('/dashboard?tab=settings#section')

        const location = router.getLocation()
        expect(location.pathname).toBe('/dashboard')
        expect(location.search).toBe('?tab=settings')
        expect(location.hash).toBe('#section')
      })

      it('should create a router with params', async () => {
        type UserParams = { id: string }

        const router = await open('/users/123', { routes: [{ path: '/users/:id', name: 'user' }] })

        const params = router.getParams<UserParams>()
        expect(params.id).toBe('123')
      })

      it('should create a router with named routes', async () => {
        const routes: RouteDefinition[] = [
          { path: '/products', name: 'products' },
          { path: '/products/:id', name: 'product-detail' },
          { path: '/users/:userId/posts/:postId', name: 'user-post' },
        ]

        const router = await open('/', { routes })

        expect(router.getRoutes()).toEqual(routes)
      })

      it('should filter undefined params', async () => {
        // React's config carried `optional: undefined`; the port reads the native router's
        // params, where a parameter the URL does not carry is never reported at all.
        const router = await open('/users/123')

        const params = router.getParams()
        expect(params.id).toBe('123')
        expect('optional' in params).toBe(false)
      })
    })

    describe('getLocation', () => {
      it('should return current location from provided location object', async () => {
        // The native navigation is the "provided location": it carries the state too.
        await go('/about?ref=home#top', { state: { from: 'nav' } })
        const router = openRouter()

        const location = router.getLocation()
        expect(location.pathname).toBe('/about')
        expect(location.search).toBe('?ref=home')
        expect(location.hash).toBe('#top')
        expect(location.state).toEqual({ from: 'nav' })
        // The entry's key is stamped into `history.state`; every read answers the same.
        expect(typeof location.key).toBe('string')
        expect(router.getLocation().key).toBe(location.key)
      })

      it('should return default location when no config provided', async () => {
        const router = await open('/')

        const location = router.getLocation()
        expect(location.pathname).toBe('/')
        expect(location.search).toBe('')
        expect(location.hash).toBe('')
      })
    })

    describe('getParams', () => {
      it('should return empty object when no params', async () => {
        const router = await open('/home')

        expect(router.getParams()).toEqual({})
      })

      it('should return typed params', async () => {
        type ProductParams = {
          id: string
          category: string
        }

        const router = await open('/products/electronics/123')

        const params = router.getParams<ProductParams>()
        expect(params.id).toBe('123')
        expect(params.category).toBe('electronics')
      })
    })

    describe('getQuery', () => {
      it('should return empty object when no search params', async () => {
        const router = await open('/home')

        expect(router.getQuery()).toEqual({})
      })

      it('should parse search string into query params', async () => {
        const router = await open('/search?page=1&limit=10')

        const query = router.getQuery()
        expect(query.page).toBe('1')
        expect(query.limit).toBe('10')
      })

      it('should handle duplicate keys as arrays', async () => {
        const router = await open('/search?tag=react&tag=vue')

        const query = router.getQuery()
        expect(query.tag).toEqual(['react', 'vue'])
      })
    })

    describe('getQueryParam', () => {
      it('should return undefined for missing param', async () => {
        const router = await open('/search')

        expect(router.getQueryParam('missing')).toBeUndefined()
      })

      it('should return string param value', async () => {
        const router = await open('/search?page=5')

        expect(router.getQueryParam('page')).toBe('5')
      })
    })

    describe('getHash', () => {
      it('should return hash from location', async () => {
        const router = await open('/page#section1')

        expect(router.getHash()).toBe('#section1')
      })

      it('should return empty string when no hash', async () => {
        const router = await open('/page')

        expect(router.getHash()).toBe('')
      })
    })

    describe('navigate', () => {
      it('should call navigateFn for regular navigation', async () => {
        const router = await open('/')
        const navigateFn = spyNavigate()

        await router.navigate('/products')

        expect(navigateFn).toHaveBeenCalledWith(
          '/products',
          expect.objectContaining({ replaceUrl: false }),
        )
        expect(angularRouter.url).toBe('/products')
      })

      it('should call navigateFn with replace option', async () => {
        const router = await open('/')
        const navigateFn = spyNavigate()

        await router.navigate('/products', { replace: true })

        expect(navigateFn).toHaveBeenCalledWith(
          '/products',
          expect.objectContaining({ replaceUrl: true }),
        )
        expect(angularRouter.url).toBe('/products')
      })

      it('should pass state to navigateFn', async () => {
        const router = await open('/')
        const navigateFn = spyNavigate()

        await router.navigate('/products', { state: { fromCart: true } })

        expect(navigateFn).toHaveBeenCalledWith(
          '/products',
          expect.objectContaining({ state: expect.objectContaining({ fromCart: true }) }),
        )
        expect(router.getLocation().state).toEqual({ fromCart: true })
      })

      it('should preserve query when preserveQuery is true', async () => {
        const router = await open('/search?q=test')
        const navigateFn = spyNavigate()

        await router.navigate('/results', { preserveQuery: true })

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('q=test'),
          expect.any(Object),
        )
      })

      it('should preserve hash when preserveHash is true', async () => {
        const router = await open('/#section')
        const navigateFn = spyNavigate()

        await router.navigate('/page', { preserveHash: true })

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('#section'),
          expect.any(Object),
        )
      })

      it('should notify listeners after navigation', async () => {
        const router = await open('/')
        const listener = vi.fn()

        router.subscribe(listener)
        await router.navigate('/new-page')

        // React's snapshot location stayed on the configured path; the port reports the
        // location the navigation landed on.
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({ pathname: '/new-page' }),
          'push',
        )
      })

      it('should notify with replace action for replace navigation', async () => {
        const router = await open('/')
        const listener = vi.fn()

        router.subscribe(listener)
        await router.navigate('/new-page', { replace: true })

        expect(listener).toHaveBeenCalledWith(expect.anything(), 'replace')
      })

      it('should fall back to window.location when no navigate function provided', async () => {
        // The navigate-less router is the exported `provider`, the core browser router: its
        // navigation writes the URL through the History API.
        await provider.navigate('/fallback-path')

        expect(window.location.pathname).toBe('/fallback-path')
      })
    })

    describe('navigateTo (named routes)', () => {
      it('should navigate to a named route', async () => {
        const router = await open('/', { routes: [{ path: '/products', name: 'products' }] })
        const navigateFn = spyNavigate()

        await router.navigateTo('products')

        expect(navigateFn).toHaveBeenCalledWith('/products', expect.any(Object))
      })

      it('should navigate to a named route with params', async () => {
        const router = await open('/', {
          routes: [{ path: '/products/:id', name: 'product-detail' }],
        })
        const navigateFn = spyNavigate()

        await router.navigateTo('product-detail', { id: '123' })

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('/products/123'),
          expect.any(Object),
        )
      })

      it('should navigate to a named route with query params', async () => {
        const router = await open('/', { routes: [{ path: '/products', name: 'products' }] })
        const navigateFn = spyNavigate()

        await router.navigateTo('products', undefined, { sort: 'price', order: 'asc' })

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('sort=price'),
          expect.any(Object),
        )
        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('order=asc'),
          expect.any(Object),
        )
      })

      it('should throw error for unknown route name', async () => {
        const router = await open('/', { routes: [{ path: '/products', name: 'products' }] })

        expect(() => router.navigateTo('unknown')).toThrow('Route "unknown" not found')
      })

      it('should throw I18nError with routing.error.routeNotFound key for unknown route', async () => {
        const router = await open('/', { routes: [{ path: '/products', name: 'products' }] })

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
        const router = await open('/')
        // The port's native history move is Angular's `Location.historyGo`.
        const navigateFn = vi.spyOn(angularLocation, 'historyGo').mockImplementation(() => {})

        router.back()

        expect(navigateFn).toHaveBeenCalledWith(-1)
      })

      it('should call navigateFn(1) for forward', async () => {
        const router = await open('/')
        const navigateFn = vi.spyOn(angularLocation, 'historyGo').mockImplementation(() => {})

        router.forward()

        expect(navigateFn).toHaveBeenCalledWith(1)
      })

      it('should fall back to window.history.back when no navigate function', () => {
        // React's snapshot history called `window.history.back()`; the port's navigate-less
        // router is the core browser router, whose back arrives as `history.go(-1)`.
        const mockHistory = vi.spyOn(window.history, 'go').mockImplementation(() => {})

        provider.back()

        expect(mockHistory).toHaveBeenCalledWith(-1)
      })

      it('should fall back to window.history.forward when no navigate function', () => {
        const mockHistory = vi.spyOn(window.history, 'go').mockImplementation(() => {})

        provider.forward()

        expect(mockHistory).toHaveBeenCalledWith(1)
      })
    })

    describe('go', () => {
      it('should call navigateFn with delta', async () => {
        const router = await open('/')
        const navigateFn = vi.spyOn(angularLocation, 'historyGo').mockImplementation(() => {})

        router.go(-2)

        expect(navigateFn).toHaveBeenCalledWith(-2)
      })

      it('should fall back to window.history.go when no navigate function', () => {
        const mockHistory = vi.spyOn(window.history, 'go').mockImplementation(() => {})

        provider.go(-3)

        expect(mockHistory).toHaveBeenCalledWith(-3)
      })
    })

    describe('setQuery', () => {
      it('should update query params via navigate', async () => {
        const router = await open('/search')
        const navigateFn = spyNavigate()

        await router.setQuery({ q: 'test', page: '1' })

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('q=test'),
          expect.any(Object),
        )
        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('page=1'),
          expect.any(Object),
        )
      })

      it('should replace when replace option is true', async () => {
        const router = await open('/search')
        const navigateFn = spyNavigate()

        await router.setQuery({ q: 'test' }, { replace: true })

        expect(navigateFn).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ replaceUrl: true }),
        )
      })
    })

    describe('setQueryParam', () => {
      it('should update a single query param', async () => {
        const router = await open('/search?existing=value')
        const navigateFn = spyNavigate()

        await router.setQueryParam('newParam', 'newValue')

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('existing=value'),
          expect.any(Object),
        )
        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('newParam=newValue'),
          expect.any(Object),
        )
      })

      it('should remove query param when value is undefined', async () => {
        const router = await open('/search?toRemove=value&keep=this')
        const navigateFn = spyNavigate()

        await router.setQueryParam('toRemove', undefined)

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('keep=this'),
          expect.any(Object),
        )
        expect(navigateFn).not.toHaveBeenCalledWith(
          expect.stringContaining('toRemove'),
          expect.any(Object),
        )
      })
    })

    describe('setHash', () => {
      it('should set hash with # prefix', async () => {
        const router = await open('/page')
        const navigateFn = spyNavigate()

        await router.setHash('section1')

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('#section1'),
          expect.any(Object),
        )
      })

      it('should handle hash already having # prefix', async () => {
        const router = await open('/page')
        const navigateFn = spyNavigate()

        await router.setHash('#section2')

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('#section2'),
          expect.any(Object),
        )
        // Should not have double ##
        expect(navigateFn).not.toHaveBeenCalledWith(
          expect.stringContaining('##'),
          expect.any(Object),
        )
      })
    })

    describe('isActive', () => {
      it('should return true for matching path', async () => {
        const router = await open('/products/123')

        expect(router.isActive('/products/:id')).toBe(true)
      })

      it('should return false for non-matching path', async () => {
        const router = await open('/about')

        expect(router.isActive('/products')).toBe(false)
      })

      it('should support exact matching', async () => {
        const router = await open('/products')

        expect(router.isActive('/products', true)).toBe(true)
      })
    })

    describe('matchPath', () => {
      it('should return match object for matching path', async () => {
        const router = await open('/')

        const match = router.matchPath('/products/:id', '/products/123')

        expect(match).not.toBeNull()
        expect(match?.params.id).toBe('123')
        expect(match?.path).toBe('/products/:id')
        expect(match?.pathname).toBe('/products/123')
      })

      it('should return null for non-matching path', async () => {
        const router = await open('/')

        const match = router.matchPath('/products/:id', '/users/123')

        expect(match).toBeNull()
      })

      it('should extract multiple params', async () => {
        const router = await open('/')

        const match = router.matchPath('/users/:userId/posts/:postId', '/users/1/posts/2')

        expect(match?.params).toEqual({ userId: '1', postId: '2' })
      })
    })

    describe('generatePath', () => {
      it('should generate path from named route', async () => {
        const router = await open('/', { routes: [{ path: '/products/:id', name: 'product' }] })

        const path = router.generatePath('product', { id: '456' })

        expect(path).toBe('/products/456')
      })

      it('should generate path with query params', async () => {
        const router = await open('/', { routes: [{ path: '/products', name: 'products' }] })

        const path = router.generatePath('products', undefined, { sort: 'name' })

        expect(path).toContain('/products')
        expect(path).toContain('sort=name')
      })

      it('should throw for unknown route name', async () => {
        const router = await open('/', { routes: [] })

        expect(() => router.generatePath('unknown')).toThrow('Route "unknown" not found')
      })

      it('should throw I18nError with routing.error.routeNotFound key for unknown generatePath route', async () => {
        const router = await open('/', { routes: [] })

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
        const router = await open('/')
        const listener = vi.fn()

        const unsubscribe = router.subscribe(listener)
        await router.navigate('/test')

        expect(listener).toHaveBeenCalledTimes(1)

        unsubscribe()
        await router.navigate('/another')

        expect(listener).toHaveBeenCalledTimes(1)
      })

      it('should support multiple listeners', async () => {
        const router = await open('/')
        const listener1 = vi.fn()
        const listener2 = vi.fn()

        router.subscribe(listener1)
        router.subscribe(listener2)
        await router.navigate('/test')

        expect(listener1).toHaveBeenCalled()
        expect(listener2).toHaveBeenCalled()
      })
    })

    describe('navigation guards', () => {
      it('should add guard and execute on navigation', async () => {
        const router = await open('/')
        const navigateFn = spyNavigate()
        const guard = vi.fn().mockReturnValue(true)

        router.addGuard(guard)
        await router.navigate('/protected')

        expect(guard).toHaveBeenCalledWith(
          expect.objectContaining({ pathname: '/protected' }),
          expect.objectContaining({ pathname: '/' }),
        )
        expect(navigateFn).toHaveBeenCalledWith('/protected', expect.any(Object))
      })

      it('should prevent navigation when guard returns false', async () => {
        const router = await open('/')
        const navigateFn = spyNavigate()

        router.addGuard(() => false)
        await router.navigate('/protected')

        expect(navigateFn).not.toHaveBeenCalled()
      })

      it('should redirect when guard returns string', async () => {
        const router = await open('/')
        const navigateFn = spyNavigate()

        router.addGuard((to) => (to.pathname === '/protected' ? '/login' : true))
        await router.navigate('/protected')
        await flush()

        // A redirect takes the place of the navigation it stopped: this was a push, so
        // the redirect navigates as a push too (the shared `createHistoryRouter`
        // semantics every routing bond's conformance suite enforces).
        expect(navigateFn).toHaveBeenCalledWith(
          '/login',
          expect.objectContaining({ replaceUrl: false }),
        )
      })

      it('should redirect when guard returns object with path', async () => {
        const router = await open('/')
        const navigateFn = spyNavigate()

        router.addGuard((to) =>
          to.pathname === '/protected' ? { path: '/login', replace: false } : true,
        )
        await router.navigate('/protected')
        await flush()

        expect(navigateFn).toHaveBeenCalledWith('/login', expect.any(Object))
      })

      it('should support async guards', async () => {
        const router = await open('/')
        const navigateFn = spyNavigate()

        router.addGuard(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return true
        })

        await router.navigate('/async-protected')

        expect(navigateFn).toHaveBeenCalledWith('/async-protected', expect.any(Object))
      })

      it('should remove guard when unsubscribe is called', async () => {
        const router = await open('/')
        const navigateFn = spyNavigate()
        const guard = vi.fn().mockReturnValue(false)

        const removeGuard = router.addGuard(guard)
        await router.navigate('/test1')
        expect(navigateFn).not.toHaveBeenCalled()

        removeGuard()
        await router.navigate('/test2')
        expect(navigateFn).toHaveBeenCalledWith('/test2', expect.any(Object))
      })

      it('should execute multiple guards in order', async () => {
        const router = await open('/')
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
        const router = await open('/')
        const guard1 = vi.fn().mockReturnValue(false)
        const guard2 = vi.fn().mockReturnValue(true)

        router.addGuard(guard1)
        router.addGuard(guard2)

        await router.navigate('/stop-early')

        expect(guard1).toHaveBeenCalled()
        expect(guard2).not.toHaveBeenCalled()
      })
    })

    describe('registerRoutes', () => {
      it('should register new routes', async () => {
        const router = await open('/', { routes: [{ path: '/initial', name: 'initial' }] })

        router.registerRoutes([{ path: '/new', name: 'new' }])

        expect(router.getRoutes()).toHaveLength(2)
      })

      it('should make newly registered routes navigable', async () => {
        const router = await open('/')
        const navigateFn = spyNavigate()

        router.registerRoutes([{ path: '/dynamic/:id', name: 'dynamic' }])

        await router.navigateTo('dynamic', { id: '999' })

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('/dynamic/999'),
          expect.any(Object),
        )
      })

      it('should index nested child routes', async () => {
        const router = await open('/')
        const navigateFn = spyNavigate()

        router.registerRoutes([
          {
            path: '/parent',
            name: 'parent',
            children: [{ path: '/child', name: 'child' }],
          },
        ])

        await router.navigateTo('child')

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('/parent/child'),
          expect.any(Object),
        )
      })
    })

    describe('destroy', () => {
      it('should clear all listeners and guards', async () => {
        const router = await open('/')
        const navigateFn = spyNavigate()
        const listener = vi.fn()
        const guard = vi.fn().mockReturnValue(true)

        router.subscribe(listener)
        router.addGuard(guard)

        router.destroy()

        await router.navigate('/after-destroy')

        // Guard should not be called after destroy
        expect(guard).not.toHaveBeenCalled()
        // But navigation should still work (guards are cleared)
        expect(navigateFn).toHaveBeenCalled()
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
      const router = await open('/', {
        routes: [
          { path: '/public', name: 'public' },
          { path: '/protected', name: 'protected' },
        ],
      })
      const navigateFn = spyNavigate()

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
      await router.navigateTo('protected')
      await flush()
      expect(navigateFn).toHaveBeenLastCalledWith(
        '/login',
        expect.objectContaining({ replaceUrl: false }),
      )

      // Authenticate and try again
      isAuthenticated = true
      await router.navigateTo('protected')
      await flush()
      expect(navigateFn).toHaveBeenLastCalledWith('/protected', expect.any(Object))

      // Navigate to public route
      await router.navigateTo('public')
      await flush()
      expect(navigateFn).toHaveBeenLastCalledWith('/public', expect.any(Object))
    })

    it('should handle complex query manipulation', async () => {
      const router = await open('/search?q=initial&page=1')
      const navigateFn = spyNavigate()

      // Get initial query
      expect(router.getQuery()).toEqual({ q: 'initial', page: '1' })

      // Update single param
      await router.setQueryParam('page', '2')
      expect(navigateFn).toHaveBeenLastCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object),
      )

      // Set new query
      await router.setQuery({ q: 'new-search', filter: 'active' })
      expect(navigateFn).toHaveBeenLastCalledWith(
        expect.stringContaining('q=new-search'),
        expect.any(Object),
      )
      expect(navigateFn).toHaveBeenLastCalledWith(
        expect.stringContaining('filter=active'),
        expect.any(Object),
      )
    })

    it('should generate and use paths correctly', async () => {
      const router = await open('/', {
        routes: [{ path: '/blog/:year/:month/:slug', name: 'blog-post' }],
      })
      const navigateFn = spyNavigate()

      // Use router to generate path
      const generatedPath = router.generatePath('blog-post', {
        year: '2024',
        month: '01',
        slug: 'hello-world',
      })

      expect(generatedPath).toBe('/blog/2024/01/hello-world')

      // Navigate to generated path
      await router.navigate(generatedPath)
      expect(navigateFn).toHaveBeenCalledWith('/blog/2024/01/hello-world', expect.any(Object))
    })
  })
})
