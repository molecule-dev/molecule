import { describe, expect, it, vi } from 'vitest'

// Mock vue-router since it's a peer dependency
vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
  useRoute: vi.fn(),
}))

// Mock @molecule/app-routing since it's a peer dependency
vi.mock('@molecule/app-routing', () => ({}))

// Mock vue
vi.mock('vue', () => ({
  computed: vi.fn((fn: () => unknown) => ({ value: fn() })),
  ref: vi.fn((val: unknown) => ({ value: val })),
  watch: vi.fn(),
  onUnmounted: vi.fn(),
}))

import type { RouteLocationNormalizedLoaded, Router as VueRouterInstance } from 'vue-router'

import type { RouteDefinition, RouteLocation } from '../index.js'
import {
  createVueRouter,
  generatePath,
  matchPath,
  MOLECULE_ROUTER_KEY,
  normalizeParams,
  parseVueQuery,
  provider,
  stringifyQuery,
  toVueQuery,
} from '../index.js'

// Flush microtasks so async navigate() calls complete
const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

// Save original window
const originalWindow = globalThis.window

describe('@molecule/app-routing-vue-router', () => {
  // Helper to create a mock Vue Router instance
  const createMockVueRouter = (): {
    push: ReturnType<typeof vi.fn>
    replace: ReturnType<typeof vi.fn>
    back: ReturnType<typeof vi.fn>
    forward: ReturnType<typeof vi.fn>
    go: ReturnType<typeof vi.fn>
    resolve: ReturnType<typeof vi.fn>
    beforeEach: ReturnType<typeof vi.fn>
    afterEach: ReturnType<typeof vi.fn>
  } => ({
    push: vi.fn().mockResolvedValue(undefined),
    replace: vi.fn().mockResolvedValue(undefined),
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    resolve: vi.fn(
      (to: { name: string; params?: Record<string, string>; query?: Record<string, string> }) => ({
        fullPath: `/${to.name}`,
      }),
    ),
    beforeEach: vi.fn(),
    afterEach: vi.fn(),
  })

  // Helper to create a mock Vue route
  const createMockRoute = (
    path: string,
    options?: {
      fullPath?: string
      hash?: string
      query?: Record<string, string | string[] | null>
      params?: Record<string, string | string[]>
      meta?: Record<string, unknown>
      name?: string
    },
  ): {
    path: string
    fullPath: string
    hash: string
    query: Record<string, string | string[] | null>
    params: Record<string, string | string[]>
    meta: Record<string, unknown>
    name: string | undefined
    matched: never[]
    redirectedFrom: undefined
  } => ({
    path,
    fullPath: options?.fullPath ?? path,
    hash: options?.hash ?? '',
    query: options?.query ?? {},
    params: options?.params ?? {},
    meta: options?.meta ?? {},
    name: options?.name ?? undefined,
    matched: [],
    redirectedFrom: undefined,
  })

  describe('createVueRouter', () => {
    describe('initialization', () => {
      it('should create a router with default config', () => {
        const router = createVueRouter()

        expect(router).toBeDefined()
        expect(router.getLocation).toBeInstanceOf(Function)
        expect(router.getParams).toBeInstanceOf(Function)
        expect(router.getQuery).toBeInstanceOf(Function)
        expect(router.navigate).toBeInstanceOf(Function)
      })

      it('should create a router with a provided route', () => {
        const route = createMockRoute('/dashboard', {
          fullPath: '/dashboard?tab=settings',
          hash: '#section',
          query: { tab: 'settings' },
        })

        const router = createVueRouter({
          route: route as unknown as RouteLocationNormalizedLoaded,
        })

        const location = router.getLocation()
        expect(location.pathname).toBe('/dashboard')
        expect(location.search).toBe('?tab=settings')
        expect(location.hash).toBe('#section')
      })

      it('should create a router with params from route', () => {
        const route = createMockRoute('/users/123', {
          params: { id: '123' },
        })

        const router = createVueRouter({
          route: route as unknown as RouteLocationNormalizedLoaded,
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

        const router = createVueRouter({ routes })

        expect(router.getRoutes()).toEqual(routes)
      })

      it('should normalize array params by joining with /', () => {
        const route = createMockRoute('/blog/2024/01/hello', {
          params: { slug: ['2024', '01', 'hello'] },
        })

        const router = createVueRouter({
          route: route as unknown as RouteLocationNormalizedLoaded,
        })

        const params = router.getParams<{ slug: string }>()
        expect(params.slug).toBe('2024/01/hello')
      })
    })

    describe('getLocation', () => {
      it('should return current location from provided route', () => {
        const route = createMockRoute('/about', {
          fullPath: '/about?ref=home#top',
          hash: '#top',
          meta: { from: 'nav' },
          name: 'about',
        })

        const router = createVueRouter({ route: route as unknown as RouteLocationNormalizedLoaded })

        const location = router.getLocation()
        expect(location.pathname).toBe('/about')
        expect(location.search).toBe('?ref=home')
        expect(location.hash).toBe('#top')
        expect(location.state).toEqual({ from: 'nav' })
        expect(location.key).toBe('about')
      })

      it('should return default location when no config provided', () => {
        const router = createVueRouter()

        const location = router.getLocation()
        expect(location.pathname).toBe('/')
        expect(location.search).toBe('')
        expect(location.hash).toBe('')
      })

      it('should use route path as key when name is undefined', () => {
        const route = createMockRoute('/test', { name: undefined })

        const router = createVueRouter({ route: route as unknown as RouteLocationNormalizedLoaded })

        const location = router.getLocation()
        expect(location.key).toBe('/test')
      })
    })

    describe('getParams', () => {
      it('should return empty object when no route', () => {
        const router = createVueRouter()

        expect(router.getParams()).toEqual({})
      })

      it('should return typed params from route', () => {
        interface ProductParams {
          id: string
          category: string
        }

        const route = createMockRoute('/products/electronics/123', {
          params: { id: '123', category: 'electronics' },
        })

        const router = createVueRouter({ route: route as unknown as RouteLocationNormalizedLoaded })

        const params = router.getParams<ProductParams>()
        expect(params.id).toBe('123')
        expect(params.category).toBe('electronics')
      })
    })

    describe('getQuery', () => {
      it('should return empty object when no route', () => {
        const router = createVueRouter()

        expect(router.getQuery()).toEqual({})
      })

      it('should return query params from route', () => {
        const route = createMockRoute('/search', {
          fullPath: '/search?page=1&limit=10',
          query: { page: '1', limit: '10' },
        })

        const router = createVueRouter({ route: route as unknown as RouteLocationNormalizedLoaded })

        const query = router.getQuery()
        expect(query.page).toBe('1')
        expect(query.limit).toBe('10')
      })

      it('should filter null values from query', () => {
        const route = createMockRoute('/search', {
          fullPath: '/search?page=1',
          query: { page: '1', empty: null },
        })

        const router = createVueRouter({ route: route as unknown as RouteLocationNormalizedLoaded })

        const query = router.getQuery()
        expect(query.page).toBe('1')
        expect('empty' in query).toBe(false)
      })

      it('should handle array values in query, filtering nulls', () => {
        const route = createMockRoute('/search', {
          fullPath: '/search?tag=react&tag=vue',
          query: { tag: ['react', null, 'vue'] },
        })

        const router = createVueRouter({ route: route as unknown as RouteLocationNormalizedLoaded })

        const query = router.getQuery()
        expect(query.tag).toEqual(['react', 'vue'])
      })
    })

    describe('getQueryParam', () => {
      it('should return undefined when no route', () => {
        const router = createVueRouter()

        expect(router.getQueryParam('missing')).toBeUndefined()
      })

      it('should return string param from route query', () => {
        const route = createMockRoute('/search', {
          fullPath: '/search?page=5',
          query: { page: '5' },
        })

        const router = createVueRouter({ route: route as unknown as RouteLocationNormalizedLoaded })

        expect(router.getQueryParam('page')).toBe('5')
      })

      it('should return first value of array param', () => {
        const route = createMockRoute('/search', {
          fullPath: '/search?tags=first&tags=second',
          query: { tags: ['first', 'second'] },
        })

        const router = createVueRouter({ route: route as unknown as RouteLocationNormalizedLoaded })

        expect(router.getQueryParam('tags')).toBe('first')
      })

      it('should return undefined for null query value', () => {
        const route = createMockRoute('/search', {
          fullPath: '/search',
          query: { empty: null },
        })

        const router = createVueRouter({ route: route as unknown as RouteLocationNormalizedLoaded })

        expect(router.getQueryParam('empty')).toBeUndefined()
      })
    })

    describe('getHash', () => {
      it('should return hash from route', () => {
        const route = createMockRoute('/page', {
          hash: '#section1',
        })

        const router = createVueRouter({ route: route as unknown as RouteLocationNormalizedLoaded })

        expect(router.getHash()).toBe('#section1')
      })

      it('should return empty string when no hash', () => {
        const route = createMockRoute('/page')

        const router = createVueRouter({ route: route as unknown as RouteLocationNormalizedLoaded })

        expect(router.getHash()).toBe('')
      })
    })

    describe('navigate', () => {
      it('should call vueRouter.push for regular navigation', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })

        await router.navigate('/products')

        expect(vueRouter.push).toHaveBeenCalledWith('/products')
      })

      it('should call vueRouter.replace when replace option is true', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })

        await router.navigate('/products', { replace: true })

        expect(vueRouter.replace).toHaveBeenCalledWith('/products')
      })

      it('should preserve query when preserveQuery is true', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/search', {
          fullPath: '/search?q=test',
        })

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })

        await router.navigate('/results', { preserveQuery: true })

        expect(vueRouter.push).toHaveBeenCalledWith(expect.stringContaining('q=test'))
      })

      it('should preserve hash when preserveHash is true', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/', {
          hash: '#section',
        })

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })

        await router.navigate('/page', { preserveHash: true })

        expect(vueRouter.push).toHaveBeenCalledWith(expect.stringContaining('#section'))
      })

      it('should notify listeners after navigation', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })
        const listener = vi.fn()

        router.subscribe(listener)
        await router.navigate('/new-page')

        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/' }), 'push')
      })

      it('should notify with replace action for replace navigation', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })
        const listener = vi.fn()

        router.subscribe(listener)
        await router.navigate('/new-page', { replace: true })

        expect(listener).toHaveBeenCalledWith(expect.anything(), 'replace')
      })

      it('should fall back to window.location when no vue router provided', async () => {
        const mockLocation = { href: '', replace: vi.fn() }
        Object.defineProperty(globalThis, 'window', {
          value: {
            location: mockLocation,
            history: { back: vi.fn(), forward: vi.fn(), go: vi.fn() },
          },
          writable: true,
        })

        const router = createVueRouter()
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
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
          routes: [{ path: '/products', name: 'products' }],
        })

        router.navigateTo('products')
        await flush()

        expect(vueRouter.push).toHaveBeenCalledWith('/products')
      })

      it('should navigate to a named route with params', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
          routes: [{ path: '/products/:id', name: 'product-detail' }],
        })

        router.navigateTo('product-detail', { id: '123' })
        await flush()

        expect(vueRouter.push).toHaveBeenCalledWith(expect.stringContaining('/products/123'))
      })

      it('should navigate to a named route with query params', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
          routes: [{ path: '/products', name: 'products' }],
        })

        router.navigateTo('products', undefined, { sort: 'price', order: 'asc' })
        await flush()

        expect(vueRouter.push).toHaveBeenCalledWith(expect.stringContaining('sort=price'))
        expect(vueRouter.push).toHaveBeenCalledWith(expect.stringContaining('order=asc'))
      })

      it('should fall back to Vue Router named routes when not in molecule routes', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
          routes: [],
        })

        router.navigateTo('vue-route', { id: '1' }, { sort: 'name' })
        await flush()

        expect(vueRouter.push).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'vue-route',
            params: { id: '1' },
            query: { sort: 'name' },
          }),
        )
      })

      it('should throw error for unknown route name when no vue router', () => {
        const router = createVueRouter({
          routes: [{ path: '/products', name: 'products' }],
        })

        expect(() => router.navigateTo('unknown')).toThrow('Route "unknown" not found')
      })
    })

    describe('back and forward', () => {
      it('should call vueRouter.back', () => {
        const vueRouter = createMockVueRouter()

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
        })

        router.back()

        expect(vueRouter.back).toHaveBeenCalled()
      })

      it('should call vueRouter.forward', () => {
        const vueRouter = createMockVueRouter()

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
        })

        router.forward()

        expect(vueRouter.forward).toHaveBeenCalled()
      })

      it('should fall back to window.history.back when no vue router', () => {
        const mockHistory = { back: vi.fn(), forward: vi.fn(), go: vi.fn() }
        Object.defineProperty(globalThis, 'window', {
          value: { history: mockHistory, location: { pathname: '/', search: '', hash: '' } },
          writable: true,
        })

        const router = createVueRouter()
        router.back()

        expect(mockHistory.back).toHaveBeenCalled()

        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          writable: true,
        })
      })

      it('should fall back to window.history.forward when no vue router', () => {
        const mockHistory = { back: vi.fn(), forward: vi.fn(), go: vi.fn() }
        Object.defineProperty(globalThis, 'window', {
          value: { history: mockHistory, location: { pathname: '/', search: '', hash: '' } },
          writable: true,
        })

        const router = createVueRouter()
        router.forward()

        expect(mockHistory.forward).toHaveBeenCalled()

        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          writable: true,
        })
      })
    })

    describe('go', () => {
      it('should call vueRouter.go with delta', () => {
        const vueRouter = createMockVueRouter()

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
        })

        router.go(-2)

        expect(vueRouter.go).toHaveBeenCalledWith(-2)
      })

      it('should fall back to window.history.go when no vue router', () => {
        const mockHistory = { back: vi.fn(), forward: vi.fn(), go: vi.fn() }
        Object.defineProperty(globalThis, 'window', {
          value: { history: mockHistory, location: { pathname: '/', search: '', hash: '' } },
          writable: true,
        })

        const router = createVueRouter()
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
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/search')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })

        router.setQuery({ q: 'test', page: '1' })
        await flush()

        expect(vueRouter.push).toHaveBeenCalledWith(expect.stringContaining('q=test'))
        expect(vueRouter.push).toHaveBeenCalledWith(expect.stringContaining('page=1'))
      })

      it('should replace when replace option is true', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/search')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })

        router.setQuery({ q: 'test' }, { replace: true })
        await flush()

        expect(vueRouter.replace).toHaveBeenCalled()
      })
    })

    describe('setQueryParam', () => {
      it('should update a single query param', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/search', {
          fullPath: '/search?existing=value',
          query: { existing: 'value' },
        })

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })

        router.setQueryParam('newParam', 'newValue')
        await flush()

        const callArg = vueRouter.push.mock.calls[0][0] as string
        expect(callArg).toContain('existing=value')
        expect(callArg).toContain('newParam=newValue')
      })

      it('should remove query param when value is undefined', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/search', {
          fullPath: '/search?toRemove=value&keep=this',
          query: { toRemove: 'value', keep: 'this' },
        })

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })

        router.setQueryParam('toRemove', undefined)
        await flush()

        const callArg = vueRouter.push.mock.calls[0][0] as string
        expect(callArg).toContain('keep=this')
        expect(callArg).not.toContain('toRemove')
      })
    })

    describe('setHash', () => {
      it('should set hash with # prefix', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/page')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })

        router.setHash('section1')
        await flush()

        expect(vueRouter.push).toHaveBeenCalledWith(expect.stringContaining('#section1'))
      })

      it('should handle hash already having # prefix', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/page')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })

        router.setHash('#section2')
        await flush()

        expect(vueRouter.push).toHaveBeenCalledWith(expect.stringContaining('#section2'))
        // Should not have double ##
        expect(vueRouter.push.mock.calls[0][0] as string).not.toContain('##')
      })
    })

    describe('isActive', () => {
      it('should return true for matching path', () => {
        const route = createMockRoute('/products/123')

        const router = createVueRouter({ route: route as unknown as RouteLocationNormalizedLoaded })

        expect(router.isActive('/products/:id')).toBe(true)
      })

      it('should return false for non-matching path', () => {
        const route = createMockRoute('/about')

        const router = createVueRouter({ route: route as unknown as RouteLocationNormalizedLoaded })

        expect(router.isActive('/products')).toBe(false)
      })

      it('should support exact matching', () => {
        const route = createMockRoute('/products')

        const router = createVueRouter({ route: route as unknown as RouteLocationNormalizedLoaded })

        expect(router.isActive('/products', true)).toBe(true)
      })
    })

    describe('matchPath', () => {
      it('should return match object for matching path', () => {
        const router = createVueRouter()

        const match = router.matchPath('/products/:id', '/products/123')

        expect(match).not.toBeNull()
        expect(match?.params.id).toBe('123')
        expect(match?.path).toBe('/products/:id')
        expect(match?.pathname).toBe('/products/123')
      })

      it('should return null for non-matching path', () => {
        const router = createVueRouter()

        const match = router.matchPath('/products/:id', '/users/123')

        expect(match).toBeNull()
      })

      it('should extract multiple params', () => {
        const router = createVueRouter()

        const match = router.matchPath('/users/:userId/posts/:postId', '/users/1/posts/2')

        expect(match?.params).toEqual({ userId: '1', postId: '2' })
      })
    })

    describe('generatePath', () => {
      it('should generate path from named route', () => {
        const router = createVueRouter({
          routes: [{ path: '/products/:id', name: 'product' }],
        })

        const path = router.generatePath('product', { id: '456' })

        expect(path).toBe('/products/456')
      })

      it('should generate path with query params', () => {
        const router = createVueRouter({
          routes: [{ path: '/products', name: 'products' }],
        })

        const path = router.generatePath('products', undefined, { sort: 'name' })

        expect(path).toContain('/products')
        expect(path).toContain('sort=name')
      })

      it('should fall back to Vue Router resolve for unknown molecule route', () => {
        const vueRouter = createMockVueRouter()
        vueRouter.resolve.mockReturnValue({ fullPath: '/resolved-path' })

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          routes: [],
        })

        const path = router.generatePath('vue-route', { id: '1' })

        expect(vueRouter.resolve).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'vue-route', params: { id: '1' } }),
        )
        expect(path).toBe('/resolved-path')
      })

      it('should throw for unknown route name when no vue router', () => {
        const router = createVueRouter({ routes: [] })

        expect(() => router.generatePath('unknown')).toThrow('Route "unknown" not found')
      })
    })

    describe('subscribe', () => {
      it('should add listener and return unsubscribe function', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
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
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
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
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })
        const guard = vi.fn().mockReturnValue(true)

        router.addGuard(guard)
        await router.navigate('/protected')

        expect(guard).toHaveBeenCalledWith(
          expect.objectContaining({ pathname: '/protected' }),
          expect.objectContaining({ pathname: '/' }),
        )
        expect(vueRouter.push).toHaveBeenCalledWith('/protected')
      })

      it('should prevent navigation when guard returns false', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })

        router.addGuard(() => false)
        await router.navigate('/protected')

        expect(vueRouter.push).not.toHaveBeenCalled()
      })

      it('should redirect when guard returns string', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })

        router.addGuard((to) => (to.pathname === '/protected' ? '/login' : true))
        await router.navigate('/protected')
        await flush()

        expect(vueRouter.replace).toHaveBeenCalledWith('/login')
      })

      it('should redirect when guard returns object with path', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })

        router.addGuard((to) =>
          to.pathname === '/protected' ? { path: '/login', replace: false } : true,
        )
        await router.navigate('/protected')
        await flush()

        expect(vueRouter.push).toHaveBeenCalledWith('/login')
      })

      it('should support async guards', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })

        router.addGuard(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return true
        })

        await router.navigate('/async-protected')

        expect(vueRouter.push).toHaveBeenCalledWith('/async-protected')
      })

      it('should remove guard when unsubscribe is called', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })
        const guard = vi.fn().mockReturnValue(false)

        const removeGuard = router.addGuard(guard)
        await router.navigate('/test1')
        expect(vueRouter.push).not.toHaveBeenCalled()

        removeGuard()
        await router.navigate('/test2')
        expect(vueRouter.push).toHaveBeenCalledWith('/test2')
      })

      it('should execute multiple guards in order', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
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
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
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
        const router = createVueRouter({
          routes: [{ path: '/initial', name: 'initial' }],
        })

        router.registerRoutes([{ path: '/new', name: 'new' }])

        expect(router.getRoutes()).toHaveLength(2)
      })

      it('should make newly registered routes navigable', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
        })

        router.registerRoutes([{ path: '/dynamic/:id', name: 'dynamic' }])

        router.navigateTo('dynamic', { id: '999' })
        await flush()

        expect(vueRouter.push).toHaveBeenCalledWith(expect.stringContaining('/dynamic/999'))
      })

      it('should index nested child routes', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
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

        expect(vueRouter.push).toHaveBeenCalledWith(expect.stringContaining('/parent/child'))
      })
    })

    describe('destroy', () => {
      it('should clear all listeners and guards', async () => {
        const vueRouter = createMockVueRouter()
        const route = createMockRoute('/')

        const router = createVueRouter({
          router: vueRouter as unknown as VueRouterInstance,
          route: route as unknown as RouteLocationNormalizedLoaded,
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
        expect(vueRouter.push).toHaveBeenCalled()
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

  describe('MOLECULE_ROUTER_KEY', () => {
    it('should be a Symbol', () => {
      expect(typeof MOLECULE_ROUTER_KEY).toBe('symbol')
    })

    it('should have descriptive name', () => {
      expect(MOLECULE_ROUTER_KEY.toString()).toContain('molecule-router')
    })
  })

  describe('Utility Functions', () => {
    describe('parseVueQuery', () => {
      it('should parse simple string values', () => {
        const result = parseVueQuery({ page: '1', limit: '10' })

        expect(result.page).toBe('1')
        expect(result.limit).toBe('10')
      })

      it('should skip null values', () => {
        const result = parseVueQuery({ page: '1', empty: null })

        expect(result.page).toBe('1')
        expect('empty' in result).toBe(false)
      })

      it('should handle array values, filtering nulls', () => {
        const result = parseVueQuery({ tags: ['react', null, 'vue'] })

        expect(result.tags).toEqual(['react', 'vue'])
      })

      it('should return empty object for empty query', () => {
        const result = parseVueQuery({})

        expect(result).toEqual({})
      })
    })

    describe('toVueQuery', () => {
      it('should convert simple values', () => {
        const result = toVueQuery({ page: '1', limit: '10' })

        expect(result.page).toBe('1')
        expect(result.limit).toBe('10')
      })

      it('should skip undefined values', () => {
        const result = toVueQuery({ page: '1', empty: undefined })

        expect(result.page).toBe('1')
        expect('empty' in result).toBe(false)
      })

      it('should pass array values through', () => {
        const result = toVueQuery({ tags: ['react', 'vue'] })

        expect(result.tags).toEqual(['react', 'vue'])
      })

      it('should return empty object for empty params', () => {
        const result = toVueQuery({})

        expect(result).toEqual({})
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

      it('should encode param values', () => {
        const path = generatePath('/search/:query', { query: 'hello world' })

        expect(path).toBe('/search/hello%20world')
      })
    })

    describe('normalizeParams', () => {
      it('should pass through string values', () => {
        const result = normalizeParams({ id: '123', name: 'test' })

        expect(result).toEqual({ id: '123', name: 'test' })
      })

      it('should join array values with /', () => {
        const result = normalizeParams({ slug: ['2024', '01', 'hello'] })

        expect(result.slug).toBe('2024/01/hello')
      })

      it('should handle mixed string and array values', () => {
        const result = normalizeParams({
          version: 'v2',
          path: ['api', 'routing'],
        })

        expect(result.version).toBe('v2')
        expect(result.path).toBe('api/routing')
      })

      it('should return empty object for empty params', () => {
        const result = normalizeParams({})

        expect(result).toEqual({})
      })
    })
  })

  describe('Integration Tests', () => {
    it('should work end-to-end: create router -> add guard -> navigate -> subscribe', async () => {
      const vueRouter = createMockVueRouter()
      const route = createMockRoute('/')

      const router = createVueRouter({
        router: vueRouter as unknown as VueRouterInstance,
        route: route as unknown as RouteLocationNormalizedLoaded,
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
      expect(vueRouter.replace).toHaveBeenLastCalledWith('/login')

      // Authenticate and try again
      isAuthenticated = true
      router.navigateTo('protected')
      await flush()
      expect(vueRouter.push).toHaveBeenLastCalledWith('/protected')

      // Navigate to public route
      router.navigateTo('public')
      await flush()
      expect(vueRouter.push).toHaveBeenLastCalledWith('/public')
    })

    it('should handle complex query manipulation', async () => {
      const vueRouter = createMockVueRouter()
      const route = createMockRoute('/search', {
        fullPath: '/search?q=initial&page=1',
        query: { q: 'initial', page: '1' },
      })

      const router = createVueRouter({
        router: vueRouter as unknown as VueRouterInstance,
        route: route as unknown as RouteLocationNormalizedLoaded,
      })

      // Get initial query
      expect(router.getQuery()).toEqual({ q: 'initial', page: '1' })

      // Update single param
      router.setQueryParam('page', '2')
      await flush()
      expect(vueRouter.push).toHaveBeenLastCalledWith(expect.stringContaining('page=2'))

      // Set new query
      router.setQuery({ q: 'new-search', filter: 'active' })
      await flush()
      const lastCall = vueRouter.push.mock.calls.slice(-1)[0][0] as string
      expect(lastCall).toContain('q=new-search')
      expect(lastCall).toContain('filter=active')
    })

    it('should generate and use paths correctly', async () => {
      const vueRouter = createMockVueRouter()
      const route = createMockRoute('/')

      const router = createVueRouter({
        router: vueRouter as unknown as VueRouterInstance,
        route: route as unknown as RouteLocationNormalizedLoaded,
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
      expect(vueRouter.push).toHaveBeenCalledWith('/blog/2024/01/hello-world')
    })
  })
})
