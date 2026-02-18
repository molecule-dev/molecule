import { describe, expect, it, vi } from 'vitest'

// Mock @molecule/app-routing since it's a peer dependency
vi.mock('@molecule/app-routing', () => ({
  parseQuery: (search: string) => {
    const params: Record<string, string> = {}
    const query = search.startsWith('?') ? search.slice(1) : search
    if (!query) return params
    query.split('&').forEach((part) => {
      const [key, value] = part.split('=')
      params[decodeURIComponent(key)] = decodeURIComponent(value ?? '')
    })
    return params
  },
  stringifyQuery: (params: Record<string, string | string[] | undefined>) => {
    const entries = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => {
        if (Array.isArray(v)) {
          return v.map((val) => `${encodeURIComponent(k)}=${encodeURIComponent(val)}`).join('&')
        }
        return `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`
      })
    return entries.length ? `?${entries.join('&')}` : ''
  },
  matchPath: <T extends Record<string, string>>(pattern: string, path: string, exact = false) => {
    const regex = new RegExp(
      '^' + pattern.replace(/\//g, '\\/').replace(/:([^/]+)/g, '([^/]+)') + (exact ? '$' : ''),
    )
    const match = path.match(regex)
    if (!match) return null
    const paramNames = (pattern.match(/:([^/]+)/g) ?? []).map((p) => p.slice(1))
    const params: Record<string, string> = {}
    paramNames.forEach((name, i) => {
      params[name] = match[i + 1]
    })
    return { params, path: pattern, pathname: match[0], isExact: match[0] === path } as {
      params: T
      path: string
      pathname: string
      isExact: boolean
    }
  },
  generatePath: (pattern: string, params: Record<string, string> = {}) => {
    return pattern.replace(/:([^/]+)/g, (_, key) => params[key] ?? `:${key}`)
  },
}))

import type { NextNavigation, RouteDefinition, RouteLocation } from '../index.js'
import {
  createLinkHref,
  createMiddlewareGuard,
  createNextRouter,
  dynamicPath,
  parseCatchAllParams,
  provider,
} from '../index.js'

// Flush microtasks so async navigate() calls complete
const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

// Mock window object for SSR tests
const originalWindow = globalThis.window

describe('@molecule/app-routing-next', () => {
  // Mock Next.js navigation
  const createMockNavigation = (): NextNavigation => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })

  describe('createNextRouter', () => {
    describe('initialization', () => {
      it('should create a router with default config', () => {
        const router = createNextRouter()

        expect(router).toBeDefined()
        expect(router.getLocation).toBeInstanceOf(Function)
        expect(router.getParams).toBeInstanceOf(Function)
        expect(router.getQuery).toBeInstanceOf(Function)
        expect(router.navigate).toBeInstanceOf(Function)
      })

      it('should create a router with custom pathname', () => {
        const router = createNextRouter({
          pathname: '/dashboard',
        })

        expect(router.getLocation().pathname).toBe('/dashboard')
      })

      it('should create a router with search params', () => {
        const router = createNextRouter({
          pathname: '/products',
          searchParams: {
            category: 'shoes',
            sort: 'price',
          },
        })

        const query = router.getQuery()
        expect(query.category).toBe('shoes')
        expect(query.sort).toBe('price')
      })

      it('should create a router with dynamic params', () => {
        const router = createNextRouter({
          pathname: '/products/123',
          params: {
            id: '123',
          },
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

        const router = createNextRouter({ routes })

        expect(router.getRoutes()).toEqual(routes)
      })

      it('should handle array params by joining with /', () => {
        const router = createNextRouter({
          params: {
            slug: ['2024', '01', 'hello'],
          },
        })

        const params = router.getParams<{ slug: string }>()
        expect(params.slug).toBe('2024/01/hello')
      })
    })

    describe('getLocation', () => {
      it('should return current location with pathname', () => {
        const router = createNextRouter({
          pathname: '/about',
        })

        const location = router.getLocation()
        expect(location.pathname).toBe('/about')
        expect(location.key).toBeDefined()
      })

      it('should include search string in location', () => {
        const router = createNextRouter({
          pathname: '/search',
          searchParams: { q: 'test' },
        })

        const location = router.getLocation()
        expect(location.search).toContain('q=test')
      })

      it('should handle array search params', () => {
        const router = createNextRouter({
          pathname: '/search',
          searchParams: { tags: ['react', 'next'] },
        })

        const location = router.getLocation()
        expect(location.search).toContain('tags=react')
        expect(location.search).toContain('tags=next')
      })

      it('should filter undefined search params', () => {
        const router = createNextRouter({
          pathname: '/search',
          searchParams: { q: 'test', empty: undefined },
        })

        const location = router.getLocation()
        expect(location.search).toContain('q=test')
        expect(location.search).not.toContain('empty')
      })
    })

    describe('getParams', () => {
      it('should return empty object when no params', () => {
        const router = createNextRouter({
          pathname: '/home',
        })

        expect(router.getParams()).toEqual({})
      })

      it('should return typed params', () => {
        interface ProductParams {
          id: string
          category: string
        }

        const router = createNextRouter({
          params: { id: '123', category: 'electronics' },
        })

        const params = router.getParams<ProductParams>()
        expect(params.id).toBe('123')
        expect(params.category).toBe('electronics')
      })
    })

    describe('getQuery', () => {
      it('should return empty object when no search params', () => {
        const router = createNextRouter({
          pathname: '/home',
        })

        expect(router.getQuery()).toEqual({})
      })

      it('should return query params', () => {
        const router = createNextRouter({
          searchParams: { page: '1', limit: '10' },
        })

        const query = router.getQuery()
        expect(query.page).toBe('1')
        expect(query.limit).toBe('10')
      })

      it('should exclude undefined values', () => {
        const router = createNextRouter({
          searchParams: { page: '1', empty: undefined },
        })

        const query = router.getQuery()
        expect(query.page).toBe('1')
        expect('empty' in query).toBe(false)
      })
    })

    describe('getQueryParam', () => {
      it('should return undefined for missing param', () => {
        const router = createNextRouter({
          searchParams: {},
        })

        expect(router.getQueryParam('missing')).toBeUndefined()
      })

      it('should return string param', () => {
        const router = createNextRouter({
          searchParams: { page: '5' },
        })

        expect(router.getQueryParam('page')).toBe('5')
      })

      it('should return first value of array param', () => {
        const router = createNextRouter({
          searchParams: { tags: ['first', 'second'] },
        })

        expect(router.getQueryParam('tags')).toBe('first')
      })
    })

    describe('getHash', () => {
      it('should return hash from location', () => {
        // Mock window.location.hash
        Object.defineProperty(globalThis, 'window', {
          value: { location: { pathname: '/', hash: '#section1' } },
          writable: true,
        })

        const router = createNextRouter({
          pathname: '/',
        })

        expect(router.getHash()).toBe('#section1')

        // Restore
        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          writable: true,
        })
      })
    })

    describe('navigate', () => {
      it('should call navigation.push for regular navigation', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })

        await router.navigate('/products')

        expect(navigation.push).toHaveBeenCalledWith('/products')
      })

      it('should call navigation.replace when replace option is true', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })

        await router.navigate('/products', { replace: true })

        expect(navigation.replace).toHaveBeenCalledWith('/products')
      })

      it('should preserve query when preserveQuery is true', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({
          navigation,
          pathname: '/search',
          searchParams: { q: 'test' },
        })

        await router.navigate('/results', { preserveQuery: true })

        expect(navigation.push).toHaveBeenCalledWith(expect.stringContaining('q=test'))
      })

      it('should preserve hash when preserveHash is true', async () => {
        Object.defineProperty(globalThis, 'window', {
          value: { location: { pathname: '/', hash: '#section' } },
          writable: true,
        })

        const navigation = createMockNavigation()
        const router = createNextRouter({
          navigation,
          pathname: '/',
        })

        await router.navigate('/page', { preserveHash: true })

        expect(navigation.push).toHaveBeenCalledWith('/page#section')

        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          writable: true,
        })
      })

      it('should notify listeners after navigation', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })
        const listener = vi.fn()

        router.subscribe(listener)
        await router.navigate('/new-page')

        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/' }), 'push')
      })

      it('should notify with replace action for replace navigation', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })
        const listener = vi.fn()

        router.subscribe(listener)
        await router.navigate('/new-page', { replace: true })

        expect(listener).toHaveBeenCalledWith(expect.anything(), 'replace')
      })

      it('should fall back to window.location when no navigation provided', async () => {
        const mockLocation = { href: '', replace: vi.fn() }
        Object.defineProperty(globalThis, 'window', {
          value: {
            location: mockLocation,
            history: { back: vi.fn(), forward: vi.fn(), go: vi.fn() },
          },
          writable: true,
        })

        const router = createNextRouter({ pathname: '/' })
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
        const navigation = createMockNavigation()
        const router = createNextRouter({
          navigation,
          pathname: '/',
          routes: [{ path: '/products', name: 'products' }],
        })

        router.navigateTo('products')
        await flush()

        expect(navigation.push).toHaveBeenCalledWith('/products')
      })

      it('should navigate to a named route with params', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({
          navigation,
          pathname: '/',
          routes: [{ path: '/products/:id', name: 'product-detail' }],
        })

        router.navigateTo('product-detail', { id: '123' })
        await flush()

        expect(navigation.push).toHaveBeenCalledWith('/products/123')
      })

      it('should navigate to a named route with query params', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({
          navigation,
          pathname: '/',
          routes: [{ path: '/products', name: 'products' }],
        })

        router.navigateTo('products', undefined, { sort: 'price', order: 'asc' })
        await flush()

        expect(navigation.push).toHaveBeenCalledWith(expect.stringContaining('sort=price'))
        expect(navigation.push).toHaveBeenCalledWith(expect.stringContaining('order=asc'))
      })

      it('should throw error for unknown route name', () => {
        const router = createNextRouter({
          routes: [{ path: '/products', name: 'products' }],
        })

        expect(() => router.navigateTo('unknown')).toThrow('Route "unknown" not found')
      })
    })

    describe('back and forward', () => {
      it('should call navigation.back', () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })

        router.back()

        expect(navigation.back).toHaveBeenCalled()
      })

      it('should call navigation.forward', () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })

        router.forward()

        expect(navigation.forward).toHaveBeenCalled()
      })

      it('should fall back to window.history.back when no navigation', () => {
        const mockHistory = { back: vi.fn(), forward: vi.fn(), go: vi.fn() }
        Object.defineProperty(globalThis, 'window', {
          value: { history: mockHistory, location: { pathname: '/', hash: '' } },
          writable: true,
        })

        const router = createNextRouter({ pathname: '/' })
        router.back()

        expect(mockHistory.back).toHaveBeenCalled()

        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          writable: true,
        })
      })

      it('should fall back to window.history.forward when no navigation', () => {
        const mockHistory = { back: vi.fn(), forward: vi.fn(), go: vi.fn() }
        Object.defineProperty(globalThis, 'window', {
          value: { history: mockHistory, location: { pathname: '/', hash: '' } },
          writable: true,
        })

        const router = createNextRouter({ pathname: '/' })
        router.forward()

        expect(mockHistory.forward).toHaveBeenCalled()

        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          writable: true,
        })
      })
    })

    describe('go', () => {
      it('should call window.history.go with delta', () => {
        const mockHistory = { back: vi.fn(), forward: vi.fn(), go: vi.fn() }
        Object.defineProperty(globalThis, 'window', {
          value: { history: mockHistory, location: { pathname: '/', hash: '' } },
          writable: true,
        })

        const router = createNextRouter({ pathname: '/' })
        router.go(-2)

        expect(mockHistory.go).toHaveBeenCalledWith(-2)

        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          writable: true,
        })
      })
    })

    describe('setQuery', () => {
      it('should update query params via navigation', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({
          navigation,
          pathname: '/search',
          searchParams: {},
        })

        router.setQuery({ q: 'test', page: '1' })
        await flush()

        expect(navigation.push).toHaveBeenCalledWith(expect.stringContaining('q=test'))
        expect(navigation.push).toHaveBeenCalledWith(expect.stringContaining('page=1'))
      })

      it('should replace when replace option is true', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({
          navigation,
          pathname: '/search',
          searchParams: {},
        })

        router.setQuery({ q: 'test' }, { replace: true })
        await flush()

        expect(navigation.replace).toHaveBeenCalled()
      })
    })

    describe('setQueryParam', () => {
      it('should update a single query param', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({
          navigation,
          pathname: '/search',
          searchParams: { existing: 'value' },
        })

        router.setQueryParam('newParam', 'newValue')
        await flush()

        expect(navigation.push).toHaveBeenCalledWith(expect.stringContaining('existing=value'))
        expect(navigation.push).toHaveBeenCalledWith(expect.stringContaining('newParam=newValue'))
      })

      it('should remove query param when value is undefined', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({
          navigation,
          pathname: '/search',
          searchParams: { toRemove: 'value', keep: 'this' },
        })

        router.setQueryParam('toRemove', undefined)
        await flush()

        const callArg = (navigation.push as ReturnType<typeof vi.fn>).mock.calls[0][0]
        expect(callArg).toContain('keep=this')
        expect(callArg).not.toContain('toRemove')
      })
    })

    describe('setHash', () => {
      it('should set hash with # prefix', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({
          navigation,
          pathname: '/page',
          searchParams: {},
        })

        router.setHash('section1')
        await flush()

        expect(navigation.push).toHaveBeenCalledWith('/page#section1')
      })

      it('should handle hash already having # prefix', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({
          navigation,
          pathname: '/page',
          searchParams: {},
        })

        router.setHash('#section2')
        await flush()

        expect(navigation.push).toHaveBeenCalledWith('/page#section2')
      })
    })

    describe('isActive', () => {
      it('should return true for matching path', () => {
        const router = createNextRouter({
          pathname: '/products/123',
        })

        expect(router.isActive('/products/:id')).toBe(true)
      })

      it('should return false for non-matching path', () => {
        const router = createNextRouter({
          pathname: '/about',
        })

        expect(router.isActive('/products')).toBe(false)
      })

      it('should support exact matching', () => {
        const router = createNextRouter({
          pathname: '/products',
        })

        expect(router.isActive('/products', true)).toBe(true)
        expect(router.isActive('/products/123', true)).toBe(false)
      })

      it('should match prefix by default (non-exact)', () => {
        const router = createNextRouter({
          pathname: '/products/123/details',
        })

        expect(router.isActive('/products')).toBe(true)
        expect(router.isActive('/products/123')).toBe(true)
      })
    })

    describe('matchPath', () => {
      it('should return match object for matching path', () => {
        const router = createNextRouter({ pathname: '/' })

        const match = router.matchPath('/products/:id', '/products/123')

        expect(match).not.toBeNull()
        expect(match?.params.id).toBe('123')
        expect(match?.path).toBe('/products/:id')
        expect(match?.pathname).toBe('/products/123')
      })

      it('should return null for non-matching path', () => {
        const router = createNextRouter({ pathname: '/' })

        const match = router.matchPath('/products/:id', '/users/123')

        expect(match).toBeNull()
      })

      it('should extract multiple params', () => {
        const router = createNextRouter({ pathname: '/' })

        const match = router.matchPath('/users/:userId/posts/:postId', '/users/1/posts/2')

        expect(match?.params).toEqual({ userId: '1', postId: '2' })
      })
    })

    describe('generatePath', () => {
      it('should generate path from named route', () => {
        const router = createNextRouter({
          routes: [{ path: '/products/:id', name: 'product' }],
        })

        const path = router.generatePath('product', { id: '456' })

        expect(path).toBe('/products/456')
      })

      it('should generate path with query params', () => {
        const router = createNextRouter({
          routes: [{ path: '/products', name: 'products' }],
        })

        const path = router.generatePath('products', undefined, { sort: 'name' })

        expect(path).toContain('/products')
        expect(path).toContain('sort=name')
      })

      it('should throw for unknown route name', () => {
        const router = createNextRouter({ routes: [] })

        expect(() => router.generatePath('unknown')).toThrow('Route "unknown" not found')
      })
    })

    describe('subscribe', () => {
      it('should add listener and return unsubscribe function', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })
        const listener = vi.fn()

        const unsubscribe = router.subscribe(listener)
        await router.navigate('/test')

        expect(listener).toHaveBeenCalledTimes(1)

        unsubscribe()
        await router.navigate('/another')

        expect(listener).toHaveBeenCalledTimes(1)
      })

      it('should support multiple listeners', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })
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
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })
        const guard = vi.fn().mockReturnValue(true)

        router.addGuard(guard)
        await router.navigate('/protected')

        expect(guard).toHaveBeenCalledWith(
          expect.objectContaining({ pathname: '/protected' }),
          expect.objectContaining({ pathname: '/' }),
        )
        expect(navigation.push).toHaveBeenCalledWith('/protected')
      })

      it('should prevent navigation when guard returns false', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })

        router.addGuard(() => false)
        await router.navigate('/protected')

        expect(navigation.push).not.toHaveBeenCalled()
      })

      it('should redirect when guard returns string', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })

        router.addGuard((to) => (to.pathname === '/protected' ? '/login' : true))
        await router.navigate('/protected')

        expect(navigation.replace).toHaveBeenCalledWith('/login')
      })

      it('should redirect when guard returns object with path', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })

        router.addGuard((to) =>
          to.pathname === '/protected' ? { path: '/login', replace: false } : true,
        )
        await router.navigate('/protected')

        expect(navigation.push).toHaveBeenCalledWith('/login')
      })

      it('should support async guards', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })

        router.addGuard(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return true
        })

        await router.navigate('/async-protected')

        expect(navigation.push).toHaveBeenCalledWith('/async-protected')
      })

      it('should remove guard when unsubscribe is called', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })
        const guard = vi.fn().mockReturnValue(false)

        const removeGuard = router.addGuard(guard)
        await router.navigate('/test1')
        expect(navigation.push).not.toHaveBeenCalled()

        removeGuard()
        await router.navigate('/test2')
        expect(navigation.push).toHaveBeenCalledWith('/test2')
      })

      it('should execute multiple guards in order', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })
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
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })
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
        const router = createNextRouter({
          routes: [{ path: '/initial', name: 'initial' }],
        })

        router.registerRoutes([{ path: '/new', name: 'new' }])

        expect(router.getRoutes()).toHaveLength(2)
      })

      it('should make newly registered routes navigable', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })

        router.registerRoutes([{ path: '/dynamic/:id', name: 'dynamic' }])

        router.navigateTo('dynamic', { id: '999' })
        await flush()

        expect(navigation.push).toHaveBeenCalledWith('/dynamic/999')
      })

      it('should index nested child routes', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })

        router.registerRoutes([
          {
            path: '/parent',
            name: 'parent',
            children: [{ path: '/child', name: 'child' }],
          },
        ])

        router.navigateTo('child')
        await flush()

        expect(navigation.push).toHaveBeenCalledWith('/parent/child')
      })
    })

    describe('destroy', () => {
      it('should clear all listeners and guards', async () => {
        const navigation = createMockNavigation()
        const router = createNextRouter({ navigation, pathname: '/' })
        const listener = vi.fn()
        const guard = vi.fn().mockReturnValue(true)

        router.subscribe(listener)
        router.addGuard(guard)

        router.destroy()

        await router.navigate('/after-destroy')

        // Guard should not be called after destroy
        expect(guard).not.toHaveBeenCalled()
        // But navigation should still work (guards are cleared)
        expect(navigation.push).toHaveBeenCalled()
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
      // In SSR/test environment, pathname defaults to '/'
      expect(provider.getLocation().pathname).toBeDefined()
    })
  })

  describe('createMiddlewareGuard', () => {
    // Mock request object
    const createMockRequest = (
      pathname: string,
      options?: {
        cookies?: Record<string, string>
        headers?: Record<string, string>
      },
    ): {
      url: string
      nextUrl: { pathname: string }
      cookies: { get: (name: string) => { value: string } | undefined }
      headers: { get: (name: string) => string | null }
    } => ({
      url: `http://localhost${pathname}`,
      nextUrl: { pathname },
      cookies: {
        get: (name: string) => {
          const value = options?.cookies?.[name]
          return value ? { value } : undefined
        },
      },
      headers: {
        get: (name: string) => options?.headers?.[name] || null,
      },
    })

    it('should return continue for non-matching paths', async () => {
      const guard = createMiddlewareGuard([
        {
          match: '/admin/*',
          check: () => false,
        },
      ])

      const result = await guard(createMockRequest('/public'))

      expect(result).toEqual({ continue: true })
    })

    it('should match exact path', async () => {
      const guard = createMiddlewareGuard([
        {
          match: '/dashboard',
          check: () => '/login',
        },
      ])

      const result = await guard(createMockRequest('/dashboard'))

      expect(result).toEqual({ redirect: '/login' })
    })

    it('should match wildcard path', async () => {
      const guard = createMiddlewareGuard([
        {
          match: '/admin/*',
          check: () => '/login',
        },
      ])

      const result = await guard(createMockRequest('/admin/users'))

      expect(result).toEqual({ redirect: '/login' })
    })

    it('should allow when check returns true', async () => {
      const guard = createMiddlewareGuard([
        {
          match: '/dashboard',
          check: () => true,
        },
      ])

      const result = await guard(createMockRequest('/dashboard'))

      expect(result).toEqual({ continue: true })
    })

    it('should redirect to / when check returns false', async () => {
      const guard = createMiddlewareGuard([
        {
          match: '/protected',
          check: () => false,
        },
      ])

      const result = await guard(createMockRequest('/protected'))

      expect(result).toEqual({ redirect: '/' })
    })

    it('should redirect to custom path when check returns string', async () => {
      const guard = createMiddlewareGuard([
        {
          match: '/members',
          check: () => '/signup',
        },
      ])

      const result = await guard(createMockRequest('/members'))

      expect(result).toEqual({ redirect: '/signup' })
    })

    it('should pass request info to check function', async () => {
      const checkFn = vi.fn().mockReturnValue(true)
      const guard = createMiddlewareGuard([
        {
          match: '/api/*',
          check: checkFn,
        },
      ])

      await guard(
        createMockRequest('/api/users', {
          cookies: { session: 'abc123' },
          headers: { authorization: 'Bearer token' },
        }),
      )

      expect(checkFn).toHaveBeenCalledWith({
        url: 'http://localhost/api/users',
        pathname: '/api/users',
        cookies: expect.objectContaining({
          get: expect.any(Function),
        }),
        headers: expect.objectContaining({
          get: expect.any(Function),
        }),
      })
    })

    it('should access cookies in check function', async () => {
      const guard = createMiddlewareGuard([
        {
          match: '/dashboard/*',
          check: (req) => {
            const token = req.cookies.get('token')
            return token ? true : '/login'
          },
        },
      ])

      const resultWithToken = await guard(
        createMockRequest('/dashboard/home', {
          cookies: { token: 'valid-token' },
        }),
      )
      expect(resultWithToken).toEqual({ continue: true })

      const resultWithoutToken = await guard(createMockRequest('/dashboard/home'))
      expect(resultWithoutToken).toEqual({ redirect: '/login' })
    })

    it('should access headers in check function', async () => {
      const guard = createMiddlewareGuard([
        {
          match: '/api/*',
          check: (req) => {
            const auth = req.headers.get('authorization')
            return auth?.startsWith('Bearer ') ? true : '/unauthorized'
          },
        },
      ])

      const resultWithAuth = await guard(
        createMockRequest('/api/data', {
          headers: { authorization: 'Bearer token123' },
        }),
      )
      expect(resultWithAuth).toEqual({ continue: true })

      const resultWithoutAuth = await guard(createMockRequest('/api/data'))
      expect(resultWithoutAuth).toEqual({ redirect: '/unauthorized' })
    })

    it('should support async check function', async () => {
      const guard = createMiddlewareGuard([
        {
          match: '/async/*',
          check: async () => {
            await new Promise((resolve) => setTimeout(resolve, 10))
            return true
          },
        },
      ])

      const result = await guard(createMockRequest('/async/route'))

      expect(result).toEqual({ continue: true })
    })

    it('should process multiple rules in order', async () => {
      const guard = createMiddlewareGuard([
        {
          match: '/admin/*',
          check: () => '/admin-login',
        },
        {
          match: '/dashboard/*',
          check: () => '/dashboard-login',
        },
      ])

      const adminResult = await guard(createMockRequest('/admin/panel'))
      expect(adminResult).toEqual({ redirect: '/admin-login' })

      const dashboardResult = await guard(createMockRequest('/dashboard/home'))
      expect(dashboardResult).toEqual({ redirect: '/dashboard-login' })
    })

    it('should stop at first matching rule', async () => {
      const firstCheck = vi.fn().mockReturnValue('/first')
      const secondCheck = vi.fn().mockReturnValue('/second')

      const guard = createMiddlewareGuard([
        { match: '/path', check: firstCheck },
        { match: '/path', check: secondCheck },
      ])

      await guard(createMockRequest('/path'))

      expect(firstCheck).toHaveBeenCalled()
      expect(secondCheck).not.toHaveBeenCalled()
    })
  })

  describe('createLinkHref', () => {
    it('should create href with pathname only', () => {
      const href = createLinkHref('/products')

      expect(href).toBe('/products')
    })

    it('should create href with query params', () => {
      const href = createLinkHref('/products', { category: 'shoes', sort: 'price' })

      expect(href).toContain('/products?')
      expect(href).toContain('category=shoes')
      expect(href).toContain('sort=price')
    })

    it('should create href with hash', () => {
      const href = createLinkHref('/page', undefined, 'section1')

      expect(href).toBe('/page#section1')
    })

    it('should handle hash with # prefix', () => {
      const href = createLinkHref('/page', undefined, '#section2')

      expect(href).toBe('/page#section2')
    })

    it('should create href with both query and hash', () => {
      const href = createLinkHref('/page', { tab: 'settings' }, 'advanced')

      expect(href).toContain('/page?')
      expect(href).toContain('tab=settings')
      expect(href).toContain('#advanced')
    })

    it('should handle array query params', () => {
      const href = createLinkHref('/filter', { tags: ['react', 'next'] })

      expect(href).toContain('tags=react')
      expect(href).toContain('tags=next')
    })
  })

  describe('dynamicPath', () => {
    it('should create path generator for single param', () => {
      const productPath = dynamicPath('/products/[id]')

      expect(productPath({ id: '123' })).toBe('/products/123')
    })

    it('should create path generator for multiple params', () => {
      const userPostPath = dynamicPath('/users/[userId]/posts/[postId]')

      expect(userPostPath({ userId: '1', postId: '2' })).toBe('/users/1/posts/2')
    })

    it('should handle catch-all params with array', () => {
      const blogPath = dynamicPath('/blog/[...slug]')

      expect(blogPath({ slug: ['2024', '01', 'hello'] })).toBe('/blog/2024/01/hello')
    })

    it('should handle catch-all params with string', () => {
      const blogPath = dynamicPath('/blog/[...slug]')

      expect(blogPath({ slug: 'single' })).toBe('/blog/single')
    })

    it('should handle mixed params', () => {
      const docsPath = dynamicPath('/docs/[version]/[...path]')

      expect(docsPath({ version: 'v2', path: ['api', 'routing'] })).toBe('/docs/v2/api/routing')
    })

    it('should handle optional catch-all returning first element for single param', () => {
      const path = dynamicPath('/optional/[param]')

      expect(path({ param: ['first', 'second'] })).toBe('/optional/first')
    })
  })

  describe('parseCatchAllParams', () => {
    it('should return empty array for undefined', () => {
      expect(parseCatchAllParams(undefined)).toEqual([])
    })

    it('should return array as-is', () => {
      expect(parseCatchAllParams(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
    })

    it('should wrap string in array', () => {
      expect(parseCatchAllParams('single')).toEqual(['single'])
    })

    it('should handle empty array', () => {
      expect(parseCatchAllParams([])).toEqual([])
    })
  })

  describe('Integration Tests', () => {
    it('should work end-to-end: create router -> add guard -> navigate -> subscribe', async () => {
      const navigation = createMockNavigation()
      const router = createNextRouter({
        navigation,
        pathname: '/',
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
      expect(navigation.replace).toHaveBeenLastCalledWith('/login')

      // Authenticate and try again
      isAuthenticated = true
      router.navigateTo('protected')
      await flush()
      expect(navigation.push).toHaveBeenLastCalledWith('/protected')

      // Navigate to public route
      router.navigateTo('public')
      await flush()
      expect(navigation.push).toHaveBeenLastCalledWith('/public')
    })

    it('should handle complex query manipulation', async () => {
      const navigation = createMockNavigation()
      const router = createNextRouter({
        navigation,
        pathname: '/search',
        searchParams: {
          q: 'initial',
          page: '1',
        },
      })

      // Get initial query
      expect(router.getQuery()).toEqual({ q: 'initial', page: '1' })

      // Update single param
      router.setQueryParam('page', '2')
      await flush()
      expect(navigation.push).toHaveBeenLastCalledWith(expect.stringContaining('page=2'))

      // Set new query
      router.setQuery({ q: 'new-search', filter: 'active' })
      await flush()
      const lastCall = (navigation.push as ReturnType<typeof vi.fn>).mock.calls.slice(-1)[0][0]
      expect(lastCall).toContain('q=new-search')
      expect(lastCall).toContain('filter=active')
    })

    it('should create middleware guard that works with auth flow', async () => {
      const createMockRequest = (
        pathname: string,
        token?: string,
      ): {
        url: string
        nextUrl: { pathname: string }
        cookies: { get: (name: string) => { value: string } | undefined }
        headers: { get: () => null }
      } => ({
        url: `http://localhost${pathname}`,
        nextUrl: { pathname },
        cookies: {
          get: (name: string) => (name === 'token' && token ? { value: token } : undefined),
        },
        headers: {
          get: () => null,
        },
      })

      const guard = createMiddlewareGuard([
        {
          match: '/dashboard/*',
          check: (req) => {
            const token = req.cookies.get('token')
            if (!token) return '/login'
            if (token.value === 'expired') return '/refresh'
            return true
          },
        },
        {
          match: '/admin/*',
          check: (req) => {
            const token = req.cookies.get('token')
            if (token?.value !== 'admin-token') return '/unauthorized'
            return true
          },
        },
      ])

      // No token
      expect(await guard(createMockRequest('/dashboard/home'))).toEqual({ redirect: '/login' })

      // Expired token
      expect(await guard(createMockRequest('/dashboard/home', 'expired'))).toEqual({
        redirect: '/refresh',
      })

      // Valid token
      expect(await guard(createMockRequest('/dashboard/home', 'valid'))).toEqual({ continue: true })

      // Admin route without admin token
      expect(await guard(createMockRequest('/admin/panel', 'valid'))).toEqual({
        redirect: '/unauthorized',
      })

      // Admin route with admin token
      expect(await guard(createMockRequest('/admin/panel', 'admin-token'))).toEqual({
        continue: true,
      })
    })

    it('should generate and use dynamic paths correctly', async () => {
      const navigation = createMockNavigation()
      const router = createNextRouter({
        navigation,
        pathname: '/',
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
      expect(navigation.push).toHaveBeenCalledWith('/blog/2024/01/hello-world')

      // Use dynamicPath utility for Next.js style paths
      const nextStylePath = dynamicPath('/blog/[year]/[month]/[slug]')
      expect(
        nextStylePath({
          year: '2024',
          month: '01',
          slug: 'hello-world',
        }),
      ).toBe('/blog/2024/01/hello-world')
    })
  })
})
