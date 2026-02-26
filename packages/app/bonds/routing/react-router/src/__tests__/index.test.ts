import { describe, expect, it, vi } from 'vitest'

// Mock react-router-dom since it's a peer dependency
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
  useLocation: vi.fn(),
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
}))

// Mock @molecule/app-routing since it's a peer dependency
vi.mock('@molecule/app-routing', () => ({}))

// Mock react
vi.mock('react', () => ({
  default: {},
  createContext: vi.fn(() => ({ Provider: 'MockProvider' })),
  useContext: vi.fn(),
  useMemo: vi.fn((fn: () => unknown) => fn()),
  useEffect: vi.fn(),
}))

import { I18nError } from '@molecule/app-i18n'

import type { RouteDefinition, RouteLocation } from '../index.js'
import {
  createReactRouter,
  generatePath,
  matchPath,
  normalizePath,
  parseSearchParams,
  provider,
  resolvePath,
  stringifyQuery,
} from '../index.js'

// Flush microtasks so async navigate() calls complete
const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

// Save original window
const originalWindow = globalThis.window

describe('@molecule/app-routing-react-router', () => {
  // Helper to create a mock React Router navigate function
  const createMockNavigateFn = (): ReturnType<typeof vi.fn> => vi.fn()

  // Helper to create a mock location object
  const createMockLocation = (
    pathname: string,
    search = '',
    hash = '',
    state?: unknown,
    key?: string,
  ): { pathname: string; search: string; hash: string; state: unknown; key: string } => ({
    pathname,
    search,
    hash,
    state,
    key: key ?? 'default',
  })

  describe('createReactRouter', () => {
    describe('initialization', () => {
      it('should create a router with default config', () => {
        const router = createReactRouter()

        expect(router).toBeDefined()
        expect(router.getLocation).toBeInstanceOf(Function)
        expect(router.getParams).toBeInstanceOf(Function)
        expect(router.getQuery).toBeInstanceOf(Function)
        expect(router.navigate).toBeInstanceOf(Function)
      })

      it('should create a router with a provided location', () => {
        const router = createReactRouter({
          location: createMockLocation('/dashboard', '?tab=settings', '#section'),
        })

        const location = router.getLocation()
        expect(location.pathname).toBe('/dashboard')
        expect(location.search).toBe('?tab=settings')
        expect(location.hash).toBe('#section')
      })

      it('should create a router with params', () => {
        const router = createReactRouter({
          location: createMockLocation('/users/123'),
          params: { id: '123' },
        })

        const params = router.getParams<{ id: string }>()
        expect(params.id).toBe('123')
      })

      it('should create a router with named routes', () => {
        const routes: RouteDefinition[] = [
          { path: '/products', name: 'products' },
          { path: '/products/:id', name: 'product-detail' },
          { path: '/users/:userId/posts/:postId', name: 'user-post' },
        ]

        const router = createReactRouter({ routes })

        expect(router.getRoutes()).toEqual(routes)
      })

      it('should filter undefined params', () => {
        const router = createReactRouter({
          params: { id: '123', optional: undefined },
        })

        const params = router.getParams()
        expect(params.id).toBe('123')
        expect('optional' in params).toBe(false)
      })
    })

    describe('getLocation', () => {
      it('should return current location from provided location object', () => {
        const router = createReactRouter({
          location: createMockLocation('/about', '?ref=home', '#top', { from: 'nav' }, 'abc123'),
        })

        const location = router.getLocation()
        expect(location.pathname).toBe('/about')
        expect(location.search).toBe('?ref=home')
        expect(location.hash).toBe('#top')
        expect(location.state).toEqual({ from: 'nav' })
        expect(location.key).toBe('abc123')
      })

      it('should return default location when no config provided', () => {
        const router = createReactRouter()

        const location = router.getLocation()
        expect(location.pathname).toBe('/')
        expect(location.search).toBe('')
        expect(location.hash).toBe('')
      })
    })

    describe('getParams', () => {
      it('should return empty object when no params', () => {
        const router = createReactRouter({
          location: createMockLocation('/home'),
        })

        expect(router.getParams()).toEqual({})
      })

      it('should return typed params', () => {
        interface ProductParams {
          id: string
          category: string
        }

        const router = createReactRouter({
          params: { id: '123', category: 'electronics' },
        })

        const params = router.getParams<ProductParams>()
        expect(params.id).toBe('123')
        expect(params.category).toBe('electronics')
      })
    })

    describe('getQuery', () => {
      it('should return empty object when no search params', () => {
        const router = createReactRouter({
          location: createMockLocation('/home'),
        })

        expect(router.getQuery()).toEqual({})
      })

      it('should parse search string into query params', () => {
        const router = createReactRouter({
          location: createMockLocation('/search', '?page=1&limit=10'),
        })

        const query = router.getQuery()
        expect(query.page).toBe('1')
        expect(query.limit).toBe('10')
      })

      it('should handle duplicate keys as arrays', () => {
        const router = createReactRouter({
          location: createMockLocation('/search', '?tag=react&tag=vue'),
        })

        const query = router.getQuery()
        expect(query.tag).toEqual(['react', 'vue'])
      })
    })

    describe('getQueryParam', () => {
      it('should return undefined for missing param', () => {
        const router = createReactRouter({
          location: createMockLocation('/search', ''),
        })

        expect(router.getQueryParam('missing')).toBeUndefined()
      })

      it('should return string param value', () => {
        const router = createReactRouter({
          location: createMockLocation('/search', '?page=5'),
        })

        expect(router.getQueryParam('page')).toBe('5')
      })
    })

    describe('getHash', () => {
      it('should return hash from location', () => {
        const router = createReactRouter({
          location: createMockLocation('/page', '', '#section1'),
        })

        expect(router.getHash()).toBe('#section1')
      })

      it('should return empty string when no hash', () => {
        const router = createReactRouter({
          location: createMockLocation('/page'),
        })

        expect(router.getHash()).toBe('')
      })
    })

    describe('navigate', () => {
      it('should call navigateFn for regular navigation', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })

        await router.navigate('/products')

        expect(navigateFn).toHaveBeenCalledWith('/products', { replace: false, state: undefined })
      })

      it('should call navigateFn with replace option', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })

        await router.navigate('/products', { replace: true })

        expect(navigateFn).toHaveBeenCalledWith('/products', { replace: true, state: undefined })
      })

      it('should pass state to navigateFn', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })

        await router.navigate('/products', { state: { fromCart: true } })

        expect(navigateFn).toHaveBeenCalledWith('/products', {
          replace: false,
          state: { fromCart: true },
        })
      })

      it('should preserve query when preserveQuery is true', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/search', '?q=test'),
        })

        await router.navigate('/results', { preserveQuery: true })

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('q=test'),
          expect.any(Object),
        )
      })

      it('should preserve hash when preserveHash is true', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/', '', '#section'),
        })

        await router.navigate('/page', { preserveHash: true })

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('#section'),
          expect.any(Object),
        )
      })

      it('should notify listeners after navigation', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })
        const listener = vi.fn()

        router.subscribe(listener)
        await router.navigate('/new-page')

        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/' }), 'push')
      })

      it('should notify with replace action for replace navigation', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })
        const listener = vi.fn()

        router.subscribe(listener)
        await router.navigate('/new-page', { replace: true })

        expect(listener).toHaveBeenCalledWith(expect.anything(), 'replace')
      })

      it('should fall back to window.location when no navigate function provided', async () => {
        const mockLocation = { href: '', replace: vi.fn() }
        Object.defineProperty(globalThis, 'window', {
          value: {
            location: mockLocation,
            history: { back: vi.fn(), forward: vi.fn(), go: vi.fn() },
          },
          writable: true,
        })

        const router = createReactRouter({
          location: createMockLocation('/'),
        })
        await router.navigate('/fallback-path')

        expect(mockLocation.href).toBe('/fallback-path')

        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          writable: true,
        })
      })
    })

    describe('navigateTo (named routes)', () => {
      it('should navigate to a named route', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
          routes: [{ path: '/products', name: 'products' }],
        })

        router.navigateTo('products')
        await flush()

        expect(navigateFn).toHaveBeenCalledWith('/products', expect.any(Object))
      })

      it('should navigate to a named route with params', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
          routes: [{ path: '/products/:id', name: 'product-detail' }],
        })

        router.navigateTo('product-detail', { id: '123' })
        await flush()

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('/products/123'),
          expect.any(Object),
        )
      })

      it('should navigate to a named route with query params', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
          routes: [{ path: '/products', name: 'products' }],
        })

        router.navigateTo('products', undefined, { sort: 'price', order: 'asc' })
        await flush()

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('sort=price'),
          expect.any(Object),
        )
        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('order=asc'),
          expect.any(Object),
        )
      })

      it('should throw error for unknown route name', () => {
        const router = createReactRouter({
          routes: [{ path: '/products', name: 'products' }],
        })

        expect(() => router.navigateTo('unknown')).toThrow('Route "unknown" not found')
      })

      it('should throw I18nError with routing.error.routeNotFound key for unknown route', () => {
        const router = createReactRouter({
          routes: [{ path: '/products', name: 'products' }],
        })

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
      it('should call navigateFn(-1) for back', () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })

        router.back()

        expect(navigateFn).toHaveBeenCalledWith(-1)
      })

      it('should call navigateFn(1) for forward', () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })

        router.forward()

        expect(navigateFn).toHaveBeenCalledWith(1)
      })

      it('should fall back to window.history.back when no navigate function', () => {
        const mockHistory = { back: vi.fn(), forward: vi.fn(), go: vi.fn() }
        Object.defineProperty(globalThis, 'window', {
          value: { history: mockHistory, location: { pathname: '/', search: '', hash: '' } },
          writable: true,
        })

        const router = createReactRouter({
          location: createMockLocation('/'),
        })
        router.back()

        expect(mockHistory.back).toHaveBeenCalled()

        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          writable: true,
        })
      })

      it('should fall back to window.history.forward when no navigate function', () => {
        const mockHistory = { back: vi.fn(), forward: vi.fn(), go: vi.fn() }
        Object.defineProperty(globalThis, 'window', {
          value: { history: mockHistory, location: { pathname: '/', search: '', hash: '' } },
          writable: true,
        })

        const router = createReactRouter({
          location: createMockLocation('/'),
        })
        router.forward()

        expect(mockHistory.forward).toHaveBeenCalled()

        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          writable: true,
        })
      })
    })

    describe('go', () => {
      it('should call navigateFn with delta', () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })

        router.go(-2)

        expect(navigateFn).toHaveBeenCalledWith(-2)
      })

      it('should fall back to window.history.go when no navigate function', () => {
        const mockHistory = { back: vi.fn(), forward: vi.fn(), go: vi.fn() }
        Object.defineProperty(globalThis, 'window', {
          value: { history: mockHistory, location: { pathname: '/', search: '', hash: '' } },
          writable: true,
        })

        const router = createReactRouter({
          location: createMockLocation('/'),
        })
        router.go(-3)

        expect(mockHistory.go).toHaveBeenCalledWith(-3)

        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          writable: true,
        })
      })
    })

    describe('setQuery', () => {
      it('should update query params via navigate', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/search', ''),
        })

        router.setQuery({ q: 'test', page: '1' })
        await flush()

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
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/search', ''),
        })

        router.setQuery({ q: 'test' }, { replace: true })
        await flush()

        expect(navigateFn).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ replace: true }),
        )
      })
    })

    describe('setQueryParam', () => {
      it('should update a single query param', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/search', '?existing=value'),
        })

        router.setQueryParam('newParam', 'newValue')
        await flush()

        const callArg = navigateFn.mock.calls[0][0]
        expect(callArg).toContain('existing=value')
        expect(callArg).toContain('newParam=newValue')
      })

      it('should remove query param when value is undefined', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/search', '?toRemove=value&keep=this'),
        })

        router.setQueryParam('toRemove', undefined)
        await flush()

        const callArg = navigateFn.mock.calls[0][0]
        expect(callArg).toContain('keep=this')
        expect(callArg).not.toContain('toRemove')
      })
    })

    describe('setHash', () => {
      it('should set hash with # prefix', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/page', ''),
        })

        router.setHash('section1')
        await flush()

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('#section1'),
          expect.any(Object),
        )
      })

      it('should handle hash already having # prefix', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/page', ''),
        })

        router.setHash('#section2')
        await flush()

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('#section2'),
          expect.any(Object),
        )
        // Should not have double ##
        expect(navigateFn.mock.calls[0][0]).not.toContain('##')
      })
    })

    describe('isActive', () => {
      it('should return true for matching path', () => {
        const router = createReactRouter({
          location: createMockLocation('/products/123'),
        })

        expect(router.isActive('/products/:id')).toBe(true)
      })

      it('should return false for non-matching path', () => {
        const router = createReactRouter({
          location: createMockLocation('/about'),
        })

        expect(router.isActive('/products')).toBe(false)
      })

      it('should support exact matching', () => {
        const router = createReactRouter({
          location: createMockLocation('/products'),
        })

        expect(router.isActive('/products', true)).toBe(true)
      })
    })

    describe('matchPath', () => {
      it('should return match object for matching path', () => {
        const router = createReactRouter()

        const match = router.matchPath('/products/:id', '/products/123')

        expect(match).not.toBeNull()
        expect(match?.params.id).toBe('123')
        expect(match?.path).toBe('/products/:id')
        expect(match?.pathname).toBe('/products/123')
      })

      it('should return null for non-matching path', () => {
        const router = createReactRouter()

        const match = router.matchPath('/products/:id', '/users/123')

        expect(match).toBeNull()
      })

      it('should extract multiple params', () => {
        const router = createReactRouter()

        const match = router.matchPath('/users/:userId/posts/:postId', '/users/1/posts/2')

        expect(match?.params).toEqual({ userId: '1', postId: '2' })
      })
    })

    describe('generatePath', () => {
      it('should generate path from named route', () => {
        const router = createReactRouter({
          routes: [{ path: '/products/:id', name: 'product' }],
        })

        const path = router.generatePath('product', { id: '456' })

        expect(path).toBe('/products/456')
      })

      it('should generate path with query params', () => {
        const router = createReactRouter({
          routes: [{ path: '/products', name: 'products' }],
        })

        const path = router.generatePath('products', undefined, { sort: 'name' })

        expect(path).toContain('/products')
        expect(path).toContain('sort=name')
      })

      it('should throw for unknown route name', () => {
        const router = createReactRouter({ routes: [] })

        expect(() => router.generatePath('unknown')).toThrow('Route "unknown" not found')
      })

      it('should throw I18nError with routing.error.routeNotFound key for unknown generatePath route', () => {
        const router = createReactRouter({ routes: [] })

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
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })
        const listener = vi.fn()

        const unsubscribe = router.subscribe(listener)
        await router.navigate('/test')

        expect(listener).toHaveBeenCalledTimes(1)

        unsubscribe()
        await router.navigate('/another')

        expect(listener).toHaveBeenCalledTimes(1)
      })

      it('should support multiple listeners', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })
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
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })
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
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })

        router.addGuard(() => false)
        await router.navigate('/protected')

        expect(navigateFn).not.toHaveBeenCalled()
      })

      it('should redirect when guard returns string', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })

        router.addGuard((to) => (to.pathname === '/protected' ? '/login' : true))
        await router.navigate('/protected')
        await flush()

        expect(navigateFn).toHaveBeenCalledWith(
          '/login',
          expect.objectContaining({ replace: true }),
        )
      })

      it('should redirect when guard returns object with path', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })

        router.addGuard((to) =>
          to.pathname === '/protected' ? { path: '/login', replace: false } : true,
        )
        await router.navigate('/protected')
        await flush()

        expect(navigateFn).toHaveBeenCalledWith('/login', expect.any(Object))
      })

      it('should support async guards', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })

        router.addGuard(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return true
        })

        await router.navigate('/async-protected')

        expect(navigateFn).toHaveBeenCalledWith('/async-protected', expect.any(Object))
      })

      it('should remove guard when unsubscribe is called', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })
        const guard = vi.fn().mockReturnValue(false)

        const removeGuard = router.addGuard(guard)
        await router.navigate('/test1')
        expect(navigateFn).not.toHaveBeenCalled()

        removeGuard()
        await router.navigate('/test2')
        expect(navigateFn).toHaveBeenCalledWith('/test2', expect.any(Object))
      })

      it('should execute multiple guards in order', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })
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
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })
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
      it('should register new routes', () => {
        const router = createReactRouter({
          routes: [{ path: '/initial', name: 'initial' }],
        })

        router.registerRoutes([{ path: '/new', name: 'new' }])

        expect(router.getRoutes()).toHaveLength(2)
      })

      it('should make newly registered routes navigable', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })

        router.registerRoutes([{ path: '/dynamic/:id', name: 'dynamic' }])

        router.navigateTo('dynamic', { id: '999' })
        await flush()

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('/dynamic/999'),
          expect.any(Object),
        )
      })

      it('should index nested child routes', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })

        router.registerRoutes([
          {
            path: '/parent',
            name: 'parent',
            children: [{ path: '/child', name: 'child' }],
          },
        ])

        router.navigateTo('child')
        await flush()

        expect(navigateFn).toHaveBeenCalledWith(
          expect.stringContaining('/parent/child'),
          expect.any(Object),
        )
      })
    })

    describe('destroy', () => {
      it('should clear all listeners and guards', async () => {
        const navigateFn = createMockNavigateFn()
        const router = createReactRouter({
          navigate: navigateFn,
          location: createMockLocation('/'),
        })
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
        expect(() => generatePath('/products/:id', {})).toThrow('Missing required param "id"')
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
      const navigateFn = createMockNavigateFn()
      const router = createReactRouter({
        navigate: navigateFn,
        location: createMockLocation('/'),
        routes: [
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

      // Try to access protected route (should redirect)
      router.navigateTo('protected')
      await flush()
      expect(navigateFn).toHaveBeenLastCalledWith(
        '/login',
        expect.objectContaining({ replace: true }),
      )

      // Authenticate and try again
      isAuthenticated = true
      router.navigateTo('protected')
      await flush()
      expect(navigateFn).toHaveBeenLastCalledWith('/protected', expect.any(Object))

      // Navigate to public route
      router.navigateTo('public')
      await flush()
      expect(navigateFn).toHaveBeenLastCalledWith('/public', expect.any(Object))
    })

    it('should handle complex query manipulation', async () => {
      const navigateFn = createMockNavigateFn()
      const router = createReactRouter({
        navigate: navigateFn,
        location: createMockLocation('/search', '?q=initial&page=1'),
      })

      // Get initial query
      expect(router.getQuery()).toEqual({ q: 'initial', page: '1' })

      // Update single param
      router.setQueryParam('page', '2')
      await flush()
      expect(navigateFn).toHaveBeenLastCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object),
      )

      // Set new query
      router.setQuery({ q: 'new-search', filter: 'active' })
      await flush()
      const lastCall = navigateFn.mock.calls.slice(-1)[0][0]
      expect(lastCall).toContain('q=new-search')
      expect(lastCall).toContain('filter=active')
    })

    it('should generate and use paths correctly', async () => {
      const navigateFn = createMockNavigateFn()
      const router = createReactRouter({
        navigate: navigateFn,
        location: createMockLocation('/'),
        routes: [{ path: '/blog/:year/:month/:slug', name: 'blog-post' }],
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
      await flush()
      expect(navigateFn).toHaveBeenCalledWith('/blog/2024/01/hello-world', expect.any(Object))
    })
  })
})
