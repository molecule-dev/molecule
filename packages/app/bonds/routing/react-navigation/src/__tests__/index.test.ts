import { describe, expect, it, vi } from 'vitest'

// Mock @molecule/app-i18n
vi.mock('@molecule/app-i18n', () => ({
  t: vi.fn((_key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
    let text = opts?.defaultValue ?? _key
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        text = text.replaceAll(`{{${k}}}`, String(v))
      }
    }
    return text
  }),
}))

// Mock @molecule/app-routing since it's a peer dependency
vi.mock('@molecule/app-routing', () => ({}))

import type { NavigationGuard, RouteDefinition } from '../index.js'
import {
  createReactNavigationRouter,
  generatePath,
  matchPath,
  parseSearchString,
  resolvePathFromScreen,
  resolveScreenFromPath,
  stringifyQuery,
} from '../index.js'
import type { NavigationRef } from '../types.js'

// Flush microtasks so async navigate() calls complete
const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

describe('@molecule/app-routing-react-navigation', () => {
  // Helper: create a mock NavigationRef
  const createMockNavigationRef = (overrides: Partial<NavigationRef> = {}): NavigationRef => ({
    navigate: vi.fn(),
    goBack: vi.fn(),
    canGoBack: vi.fn().mockReturnValue(true),
    getCurrentRoute: vi.fn().mockReturnValue(undefined),
    getState: vi.fn().mockReturnValue(undefined),
    dispatch: vi.fn(),
    addListener: vi.fn().mockReturnValue(vi.fn()),
    ...overrides,
  })

  // Helper: create a linking config for screen <-> path resolution
  const createScreens = (): Record<string, string> => ({
    Home: '/',
    Products: '/products',
    ProductDetail: '/products/:id',
    UserProfile: '/users/:userId',
    UserPost: '/users/:userId/posts/:postId',
    Settings: '/settings',
    Login: '/login',
  })

  describe('createReactNavigationRouter', () => {
    describe('initialization', () => {
      it('should create a router with default config', () => {
        const router = createReactNavigationRouter({})

        expect(router).toBeDefined()
        expect(router.getLocation).toBeInstanceOf(Function)
        expect(router.getParams).toBeInstanceOf(Function)
        expect(router.getQuery).toBeInstanceOf(Function)
        expect(router.navigate).toBeInstanceOf(Function)
        expect(router.back).toBeInstanceOf(Function)
        expect(router.forward).toBeInstanceOf(Function)
        expect(router.go).toBeInstanceOf(Function)
        expect(router.subscribe).toBeInstanceOf(Function)
        expect(router.addGuard).toBeInstanceOf(Function)
        expect(router.registerRoutes).toBeInstanceOf(Function)
        expect(router.getRoutes).toBeInstanceOf(Function)
        expect(router.destroy).toBeInstanceOf(Function)
        expect(router.isActive).toBeInstanceOf(Function)
        expect(router.matchPath).toBeInstanceOf(Function)
        expect(router.generatePath).toBeInstanceOf(Function)
        expect(router.navigateTo).toBeInstanceOf(Function)
        expect(router.setQuery).toBeInstanceOf(Function)
        expect(router.setQueryParam).toBeInstanceOf(Function)
        expect(router.setHash).toBeInstanceOf(Function)
        expect(router.getQueryParam).toBeInstanceOf(Function)
        expect(router.getHash).toBeInstanceOf(Function)
      })

      it('should create a router with a navigation ref', () => {
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'home-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens: { Home: '/' } },
        })

        const location = router.getLocation()
        expect(location.pathname).toBe('/')
      })

      it('should register state listener when navigationRef is provided', () => {
        const addListenerMock = vi.fn().mockReturnValue(vi.fn())
        const navRef = createMockNavigationRef({ addListener: addListenerMock })

        createReactNavigationRouter({ navigationRef: navRef })

        expect(addListenerMock).toHaveBeenCalledWith('state', expect.any(Function))
      })

      it('should not register state listener when no navigationRef is provided', () => {
        const router = createReactNavigationRouter({})

        // Should not throw and should be functional
        expect(router.getLocation().pathname).toBe('/')
      })

      it('should create a router with initial routes', () => {
        const routes: RouteDefinition[] = [
          { path: '/products', name: 'products' },
          { path: '/products/:id', name: 'product-detail' },
        ]

        const router = createReactNavigationRouter({ routes })

        expect(router.getRoutes()).toEqual(routes)
      })

      it('should create a router with linking config', () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'ProductDetail',
            params: { id: '42' },
            key: 'pd-1',
          }),
        })

        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        const location = router.getLocation()
        expect(location.pathname).toBe('/products/42')
      })
    })

    describe('getLocation', () => {
      it('should return default location when no navigation ref', () => {
        const router = createReactNavigationRouter({})

        const location = router.getLocation()
        expect(location.pathname).toBe('/')
        expect(location.search).toBe('')
        expect(location.hash).toBe('')
      })

      it('should return default location when getCurrentRoute returns undefined', () => {
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue(undefined),
        })
        const router = createReactNavigationRouter({ navigationRef: navRef })

        const location = router.getLocation()
        expect(location.pathname).toBe('/')
        expect(location.search).toBe('')
        expect(location.hash).toBe('')
      })

      it('should resolve pathname from screen name and params', () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'UserProfile',
            params: { userId: '7' },
            key: 'up-1',
          }),
        })

        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        const location = router.getLocation()
        expect(location.pathname).toBe('/users/7')
        expect(location.state).toEqual({ userId: '7' })
        expect(location.key).toBe('up-1')
      })

      it('should return "/" when screen has no matching pattern', () => {
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'UnknownScreen',
            params: {},
            key: 'u-1',
          }),
        })

        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens: { Home: '/' } },
        })

        const location = router.getLocation()
        expect(location.pathname).toBe('/')
      })
    })

    describe('getParams', () => {
      it('should return empty object when no current route', () => {
        const router = createReactNavigationRouter({})

        expect(router.getParams()).toEqual({})
      })

      it('should return empty object when route has no params', () => {
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({ navigationRef: navRef })

        expect(router.getParams()).toEqual({})
      })

      it('should return stringified params', () => {
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'ProductDetail',
            params: { id: 42, category: 'electronics' },
            key: 'pd-1',
          }),
        })
        const router = createReactNavigationRouter({ navigationRef: navRef })

        const params = router.getParams<{ id: string; category: string }>()
        expect(params.id).toBe('42')
        expect(params.category).toBe('electronics')
      })

      it('should filter out undefined param values', () => {
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'ProductDetail',
            params: { id: '123', optional: undefined },
            key: 'pd-1',
          }),
        })
        const router = createReactNavigationRouter({ navigationRef: navRef })

        const params = router.getParams()
        expect(params.id).toBe('123')
        expect('optional' in params).toBe(false)
      })
    })

    describe('getQuery', () => {
      it('should return empty object when search is empty', () => {
        const router = createReactNavigationRouter({})

        expect(router.getQuery()).toEqual({})
      })

      it('should parse query from current location search', () => {
        // Since React Navigation doesn't natively use query strings,
        // and getCurrentLocation() always returns search: '', this returns {}
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens: { Home: '/' } },
        })

        expect(router.getQuery()).toEqual({})
      })
    })

    describe('getQueryParam', () => {
      it('should return undefined when query is empty', () => {
        const router = createReactNavigationRouter({})

        expect(router.getQueryParam('page')).toBeUndefined()
      })
    })

    describe('getHash', () => {
      it('should return empty string (React Navigation has no hash support)', () => {
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens: { Home: '/' } },
        })

        expect(router.getHash()).toBe('')
      })
    })

    describe('navigate', () => {
      it('should throw when no navigation ref is set', () => {
        const router = createReactNavigationRouter({})

        expect(() => router.navigate('/products')).toThrow('Navigation ref not set')
      })

      it('should call navigationRef.navigate for screen navigation', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        router.navigate('/products')
        await flush()

        expect(navRef.navigate).toHaveBeenCalledWith('Products', {})
      })

      it('should dispatch REPLACE action when replace option is true', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        router.navigate('/products', { replace: true })
        await flush()

        expect(navRef.dispatch).toHaveBeenCalledWith({
          type: 'REPLACE',
          payload: { name: 'Products', params: {} },
        })
      })

      it('should resolve path with params', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        router.navigate('/products/456')
        await flush()

        expect(navRef.navigate).toHaveBeenCalledWith('ProductDetail', { id: '456' })
      })

      it('should parse query from path', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        // Path with query string — only pathname is used for screen resolution
        router.navigate('/products?sort=price')
        await flush()

        expect(navRef.navigate).toHaveBeenCalledWith('Products', {})
      })

      it('should parse hash from path', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        // Hash is stripped before screen resolution
        router.navigate('/products#featured')
        await flush()

        expect(navRef.navigate).toHaveBeenCalledWith('Products', {})
      })

      it('should not navigate when screen cannot be resolved', async () => {
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens: { Home: '/' } },
        })

        router.navigate('/nonexistent-path')
        await flush()

        expect(navRef.navigate).not.toHaveBeenCalled()
        expect(navRef.dispatch).not.toHaveBeenCalled()
      })

      it('should pass state through navigate options', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        // State is used in guard/to construction but not passed directly to React Navigation navigate
        router.navigate('/products', { state: { fromCart: true } })
        await flush()

        expect(navRef.navigate).toHaveBeenCalled()
      })
    })

    describe('navigateTo (named routes)', () => {
      it('should navigate to a named route', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
          routes: [{ path: '/products', name: 'products' }],
        })

        router.navigateTo('products')
        await flush()

        expect(navRef.navigate).toHaveBeenCalledWith('Products', {})
      })

      it('should navigate to a named route with params', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
          routes: [{ path: '/products/:id', name: 'product-detail' }],
        })

        router.navigateTo('product-detail', { id: '789' })
        await flush()

        expect(navRef.navigate).toHaveBeenCalledWith('ProductDetail', { id: '789' })
      })

      it('should navigate to a named route with query params', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
          routes: [{ path: '/products', name: 'products' }],
        })

        router.navigateTo('products', undefined, { sort: 'price', order: 'asc' })
        await flush()

        // Query is appended to path; screen resolution strips it
        expect(navRef.navigate).toHaveBeenCalledWith('Products', {})
      })

      it('should throw error for unknown route name', () => {
        const router = createReactNavigationRouter({
          routes: [{ path: '/products', name: 'products' }],
        })

        expect(() => router.navigateTo('unknown')).toThrow('Route "unknown" not found')
      })

      it('should support replace option in navigateTo', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
          routes: [{ path: '/products', name: 'products' }],
        })

        router.navigateTo('products', undefined, undefined, { replace: true })
        await flush()

        expect(navRef.dispatch).toHaveBeenCalledWith({
          type: 'REPLACE',
          payload: { name: 'Products', params: {} },
        })
      })
    })

    describe('back', () => {
      it('should call goBack when canGoBack returns true', () => {
        const navRef = createMockNavigationRef({
          canGoBack: vi.fn().mockReturnValue(true),
        })
        const router = createReactNavigationRouter({ navigationRef: navRef })

        router.back()

        expect(navRef.goBack).toHaveBeenCalled()
      })

      it('should not call goBack when canGoBack returns false', () => {
        const navRef = createMockNavigationRef({
          canGoBack: vi.fn().mockReturnValue(false),
        })
        const router = createReactNavigationRouter({ navigationRef: navRef })

        router.back()

        expect(navRef.goBack).not.toHaveBeenCalled()
      })

      it('should not throw when no navigation ref', () => {
        const router = createReactNavigationRouter({})

        expect(() => router.back()).not.toThrow()
      })
    })

    describe('forward', () => {
      it('should be a no-op (React Navigation has no forward)', () => {
        const navRef = createMockNavigationRef()
        const router = createReactNavigationRouter({ navigationRef: navRef })

        // Should not throw or call anything
        expect(() => router.forward()).not.toThrow()
        expect(navRef.navigate).not.toHaveBeenCalled()
        expect(navRef.goBack).not.toHaveBeenCalled()
      })
    })

    describe('go', () => {
      it('should call goBack for negative delta', () => {
        const navRef = createMockNavigationRef({
          canGoBack: vi.fn().mockReturnValue(true),
        })
        const router = createReactNavigationRouter({ navigationRef: navRef })

        router.go(-1)

        expect(navRef.goBack).toHaveBeenCalled()
      })

      it('should not call goBack for positive delta', () => {
        const navRef = createMockNavigationRef()
        const router = createReactNavigationRouter({ navigationRef: navRef })

        router.go(1)

        expect(navRef.goBack).not.toHaveBeenCalled()
      })

      it('should not call goBack for zero delta', () => {
        const navRef = createMockNavigationRef()
        const router = createReactNavigationRouter({ navigationRef: navRef })

        router.go(0)

        expect(navRef.goBack).not.toHaveBeenCalled()
      })

      it('should not call goBack when canGoBack returns false', () => {
        const navRef = createMockNavigationRef({
          canGoBack: vi.fn().mockReturnValue(false),
        })
        const router = createReactNavigationRouter({ navigationRef: navRef })

        router.go(-2)

        expect(navRef.goBack).not.toHaveBeenCalled()
      })
    })

    describe('setQuery', () => {
      it('should navigate with updated query params', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Products',
            params: {},
            key: 'p-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        router.setQuery({ q: 'test', page: '1' })
        await flush()

        // setQuery calls navigate, which resolves to a screen
        expect(navRef.navigate).toHaveBeenCalled()
      })
    })

    describe('setQueryParam', () => {
      it('should set a single query param', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Products',
            params: {},
            key: 'p-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        router.setQueryParam('page', '2')
        await flush()

        expect(navRef.navigate).toHaveBeenCalled()
      })

      it('should remove a query param when value is undefined', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Products',
            params: {},
            key: 'p-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        router.setQueryParam('filter', undefined)
        await flush()

        expect(navRef.navigate).toHaveBeenCalled()
      })
    })

    describe('setHash', () => {
      it('should navigate with hash', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Products',
            params: {},
            key: 'p-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        router.setHash('section1')
        await flush()

        expect(navRef.navigate).toHaveBeenCalled()
      })

      it('should handle hash with existing # prefix', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Products',
            params: {},
            key: 'p-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        router.setHash('#section2')
        await flush()

        expect(navRef.navigate).toHaveBeenCalled()
      })
    })

    describe('isActive', () => {
      it('should return true for matching path', () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'ProductDetail',
            params: { id: '123' },
            key: 'pd-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        expect(router.isActive('/products/:id')).toBe(true)
      })

      it('should return false for non-matching path', () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        expect(router.isActive('/products')).toBe(false)
      })

      it('should support exact matching', () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Products',
            params: {},
            key: 'p-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        expect(router.isActive('/products', true)).toBe(true)
      })

      it('should support prefix matching with exact=false', () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'ProductDetail',
            params: { id: '123' },
            key: 'pd-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        expect(router.isActive('/products', false)).toBe(true)
      })
    })

    describe('matchPath (router method)', () => {
      it('should return match object for matching path', () => {
        const router = createReactNavigationRouter({})

        const match = router.matchPath('/products/:id', '/products/123')

        expect(match).not.toBeNull()
        expect(match?.params.id).toBe('123')
        expect(match?.path).toBe('/products/:id')
        expect(match?.pathname).toBe('/products/123')
      })

      it('should return null for non-matching path', () => {
        const router = createReactNavigationRouter({})

        const match = router.matchPath('/products/:id', '/users/123')

        expect(match).toBeNull()
      })

      it('should extract multiple params', () => {
        const router = createReactNavigationRouter({})

        const match = router.matchPath('/users/:userId/posts/:postId', '/users/1/posts/2')

        expect(match?.params).toEqual({ userId: '1', postId: '2' })
      })
    })

    describe('generatePath (router method)', () => {
      it('should generate path from named route', () => {
        const router = createReactNavigationRouter({
          routes: [{ path: '/products/:id', name: 'product' }],
        })

        const path = router.generatePath('product', { id: '456' })

        expect(path).toBe('/products/456')
      })

      it('should generate path with query params', () => {
        const router = createReactNavigationRouter({
          routes: [{ path: '/products', name: 'products' }],
        })

        const path = router.generatePath('products', undefined, { sort: 'name' })

        expect(path).toContain('/products')
        expect(path).toContain('sort=name')
      })

      it('should throw for unknown route name', () => {
        const router = createReactNavigationRouter({ routes: [] })

        expect(() => router.generatePath('unknown')).toThrow('Route "unknown" not found')
      })
    })

    describe('subscribe', () => {
      it('should add listener and return unsubscribe function', () => {
        const navRef = createMockNavigationRef()
        const router = createReactNavigationRouter({ navigationRef: navRef })
        const listener = vi.fn()

        const unsubscribe = router.subscribe(listener)

        expect(unsubscribe).toBeInstanceOf(Function)
      })

      it('should receive notifications on state change', () => {
        let stateCallback: ((...args: unknown[]) => void) | undefined
        const navRef = createMockNavigationRef({
          addListener: vi
            .fn()
            .mockImplementation((_event: string, cb: (...args: unknown[]) => void) => {
              stateCallback = cb
              return vi.fn()
            }),
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens: { Home: '/' } },
        })
        const listener = vi.fn()

        router.subscribe(listener)

        // Simulate a state change
        stateCallback?.()

        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/' }), 'push')
      })

      it('should stop notifying after unsubscribe', () => {
        let stateCallback: ((...args: unknown[]) => void) | undefined
        const navRef = createMockNavigationRef({
          addListener: vi
            .fn()
            .mockImplementation((_event: string, cb: (...args: unknown[]) => void) => {
              stateCallback = cb
              return vi.fn()
            }),
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens: { Home: '/' } },
        })
        const listener = vi.fn()

        const unsubscribe = router.subscribe(listener)
        stateCallback?.()
        expect(listener).toHaveBeenCalledTimes(1)

        unsubscribe()
        stateCallback?.()
        expect(listener).toHaveBeenCalledTimes(1)
      })

      it('should support multiple listeners', () => {
        let stateCallback: ((...args: unknown[]) => void) | undefined
        const navRef = createMockNavigationRef({
          addListener: vi
            .fn()
            .mockImplementation((_event: string, cb: (...args: unknown[]) => void) => {
              stateCallback = cb
              return vi.fn()
            }),
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens: { Home: '/' } },
        })
        const listener1 = vi.fn()
        const listener2 = vi.fn()

        router.subscribe(listener1)
        router.subscribe(listener2)
        stateCallback?.()

        expect(listener1).toHaveBeenCalled()
        expect(listener2).toHaveBeenCalled()
      })
    })

    describe('navigation guards', () => {
      it('should add guard and execute on navigation', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const guard = vi.fn().mockReturnValue(true) as unknown as NavigationGuard
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        router.addGuard(guard)
        router.navigate('/products')
        await flush()

        expect(guard).toHaveBeenCalledWith(
          expect.objectContaining({ pathname: '/products' }),
          expect.objectContaining({ pathname: '/' }),
        )
        expect(navRef.navigate).toHaveBeenCalledWith('Products', {})
      })

      it('should prevent navigation when guard returns false', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        router.addGuard(() => false)
        router.navigate('/products')
        await flush()

        expect(navRef.navigate).not.toHaveBeenCalled()
      })

      it('should redirect when guard returns string', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        router.addGuard((to) => (to.pathname === '/settings' ? '/login' : true))
        router.navigate('/settings')
        await flush()
        await flush() // Second flush for the redirect navigate call

        // Should not navigate to Settings — should redirect to Login
        expect(navRef.navigate).toHaveBeenCalledWith('Login', {})
      })

      it('should redirect when guard returns object with path', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        router.addGuard((to) =>
          to.pathname === '/settings' ? { path: '/login', replace: true } : true,
        )
        router.navigate('/settings')
        await flush()
        await flush()

        expect(navRef.dispatch).toHaveBeenCalledWith({
          type: 'REPLACE',
          payload: { name: 'Login', params: {} },
        })
      })

      it('should support async guards', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        router.addGuard(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return true
        })

        router.navigate('/products')
        await new Promise((resolve) => setTimeout(resolve, 50))

        expect(navRef.navigate).toHaveBeenCalledWith('Products', {})
      })

      it('should remove guard when unsubscribe is called', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })
        const guard = vi.fn().mockReturnValue(false) as unknown as NavigationGuard

        const removeGuard = router.addGuard(guard)
        router.navigate('/products')
        await flush()
        expect(navRef.navigate).not.toHaveBeenCalled()

        removeGuard()
        router.navigate('/products')
        await flush()
        expect(navRef.navigate).toHaveBeenCalledWith('Products', {})
      })

      it('should execute multiple guards in order', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
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

        router.navigate('/products')
        await flush()

        expect(executionOrder).toEqual([1, 2])
      })

      it('should stop at first failing guard', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })
        const guard1 = vi.fn().mockReturnValue(false) as unknown as NavigationGuard
        const guard2 = vi.fn().mockReturnValue(true) as unknown as NavigationGuard

        router.addGuard(guard1)
        router.addGuard(guard2)

        router.navigate('/products')
        await flush()

        expect(guard1).toHaveBeenCalled()
        expect(guard2).not.toHaveBeenCalled()
      })
    })

    describe('registerRoutes', () => {
      it('should register new routes', () => {
        const router = createReactNavigationRouter({
          routes: [{ path: '/initial', name: 'initial' }],
        })

        router.registerRoutes([{ path: '/new', name: 'new' }])

        expect(router.getRoutes()).toHaveLength(2)
      })

      it('should make newly registered routes navigable via navigateTo', async () => {
        const screens = { Dynamic: '/dynamic/:id' }
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })

        router.registerRoutes([{ path: '/dynamic/:id', name: 'dynamic' }])
        router.navigateTo('dynamic', { id: '999' })
        await flush()

        expect(navRef.navigate).toHaveBeenCalledWith('Dynamic', { id: '999' })
      })

      it('should index nested child routes', () => {
        const router = createReactNavigationRouter({})

        router.registerRoutes([
          {
            path: '/parent',
            name: 'parent',
            children: [{ path: '/child', name: 'child' }],
          },
        ])

        // child should be navigable and generate path /parent/child
        const path = router.generatePath('child')
        expect(path).toBe('/parent/child')
      })

      it('should preserve existing routes when registering new ones', () => {
        const routes: RouteDefinition[] = [
          { path: '/one', name: 'one' },
          { path: '/two', name: 'two' },
        ]
        const router = createReactNavigationRouter({ routes })

        router.registerRoutes([{ path: '/three', name: 'three' }])

        const allRoutes = router.getRoutes()
        expect(allRoutes).toHaveLength(3)
        expect(allRoutes[0].name).toBe('one')
        expect(allRoutes[1].name).toBe('two')
        expect(allRoutes[2].name).toBe('three')
      })
    })

    describe('getRoutes', () => {
      it('should return registered routes', () => {
        const routes: RouteDefinition[] = [
          { path: '/a', name: 'a' },
          { path: '/b', name: 'b' },
        ]
        const router = createReactNavigationRouter({ routes })

        expect(router.getRoutes()).toEqual(routes)
      })

      it('should return empty array when no routes registered', () => {
        const router = createReactNavigationRouter({})

        expect(router.getRoutes()).toEqual([])
      })
    })

    describe('destroy', () => {
      it('should clear all listeners and guards', async () => {
        const screens = createScreens()
        const navRef = createMockNavigationRef({
          getCurrentRoute: vi.fn().mockReturnValue({
            name: 'Home',
            params: {},
            key: 'h-1',
          }),
        })
        const router = createReactNavigationRouter({
          navigationRef: navRef,
          linking: { screens },
        })
        const listener = vi.fn()
        const guard = vi.fn().mockReturnValue(true) as unknown as NavigationGuard

        router.subscribe(listener)
        router.addGuard(guard)

        router.destroy()

        router.navigate('/products')
        await flush()

        // Guard should not have been called after destroy
        expect(guard).not.toHaveBeenCalled()
        // But navigation should still work (guards are cleared)
        expect(navRef.navigate).toHaveBeenCalled()
      })

      it('should unsubscribe from state changes', () => {
        const unsubscribeMock = vi.fn()
        const navRef = createMockNavigationRef({
          addListener: vi.fn().mockReturnValue(unsubscribeMock),
        })
        const router = createReactNavigationRouter({ navigationRef: navRef })

        router.destroy()

        expect(unsubscribeMock).toHaveBeenCalled()
      })

      it('should be safe to call destroy multiple times', () => {
        const unsubscribeMock = vi.fn()
        const navRef = createMockNavigationRef({
          addListener: vi.fn().mockReturnValue(unsubscribeMock),
        })
        const router = createReactNavigationRouter({ navigationRef: navRef })

        router.destroy()
        router.destroy()

        // Should only unsubscribe once
        expect(unsubscribeMock).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Utility Functions', () => {
    describe('parseSearchString', () => {
      it('should parse simple search params', () => {
        const result = parseSearchString('?page=1&limit=10')

        expect(result.page).toBe('1')
        expect(result.limit).toBe('10')
      })

      it('should parse without leading ?', () => {
        const result = parseSearchString('page=1&limit=10')

        expect(result.page).toBe('1')
        expect(result.limit).toBe('10')
      })

      it('should handle duplicate keys as arrays', () => {
        const result = parseSearchString('?tag=react&tag=vue&tag=angular')

        expect(result.tag).toEqual(['react', 'vue', 'angular'])
      })

      it('should return empty object for empty string', () => {
        expect(parseSearchString('')).toEqual({})
      })

      it('should return empty object for just "?"', () => {
        expect(parseSearchString('?')).toEqual({})
      })

      it('should handle encoded values', () => {
        const result = parseSearchString('?q=hello%20world&path=%2Ffoo%2Fbar')

        expect(result.q).toBe('hello world')
        expect(result.path).toBe('/foo/bar')
      })

      it('should handle missing values as empty string', () => {
        const result = parseSearchString('?key=')

        expect(result.key).toBe('')
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
        expect(stringifyQuery({})).toBe('')
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

      it('should respect exact option (default exact=true)', () => {
        const exactMatch = matchPath('/products', '/products/extra')
        expect(exactMatch).toBeNull()

        const prefixMatch = matchPath('/products', '/products/extra', false)
        expect(prefixMatch).not.toBeNull()
      })

      it('should set isExact correctly', () => {
        const match = matchPath('/products', '/products', false)
        expect(match?.isExact).toBe(true)

        const partialMatch = matchPath('/products', '/products/extra', false)
        expect(partialMatch?.isExact).toBe(false)
      })
    })

    describe('generatePath', () => {
      it('should return pattern when no params', () => {
        expect(generatePath('/products')).toBe('/products')
      })

      it('should replace params in pattern', () => {
        expect(generatePath('/products/:id', { id: '123' })).toBe('/products/123')
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

    describe('resolveScreenFromPath', () => {
      it('should resolve screen from exact path', () => {
        const screens = createScreens()
        const result = resolveScreenFromPath('/products', screens)

        expect(result).not.toBeNull()
        expect(result?.screen).toBe('Products')
      })

      it('should resolve screen from parameterized path', () => {
        const screens = createScreens()
        const result = resolveScreenFromPath('/products/42', screens)

        expect(result).not.toBeNull()
        expect(result?.screen).toBe('ProductDetail')
        expect(result?.params?.id).toBe('42')
      })

      it('should resolve screen with multiple params', () => {
        const screens = createScreens()
        const result = resolveScreenFromPath('/users/5/posts/10', screens)

        expect(result).not.toBeNull()
        expect(result?.screen).toBe('UserPost')
        expect(result?.params).toEqual({ userId: '5', postId: '10' })
      })

      it('should return null for unmatched path', () => {
        const screens = createScreens()
        const result = resolveScreenFromPath('/unknown/path', screens)

        expect(result).toBeNull()
      })

      it('should return null for empty screens config', () => {
        const result = resolveScreenFromPath('/products', {})

        expect(result).toBeNull()
      })
    })

    describe('resolvePathFromScreen', () => {
      it('should resolve path from screen name', () => {
        const screens = createScreens()
        const path = resolvePathFromScreen('Products', undefined, screens)

        expect(path).toBe('/products')
      })

      it('should resolve path with params', () => {
        const screens = createScreens()
        const path = resolvePathFromScreen('ProductDetail', { id: 99 }, screens)

        expect(path).toBe('/products/99')
      })

      it('should return "/" for unknown screen', () => {
        const screens = createScreens()
        const path = resolvePathFromScreen('UnknownScreen', undefined, screens)

        expect(path).toBe('/')
      })

      it('should handle undefined params', () => {
        const screens = createScreens()
        const path = resolvePathFromScreen('Home', undefined, screens)

        expect(path).toBe('/')
      })

      it('should filter out undefined param values', () => {
        const screens = createScreens()
        const path = resolvePathFromScreen(
          'UserProfile',
          { userId: '7', extra: undefined },
          screens,
        )

        expect(path).toBe('/users/7')
      })

      it('should stringify non-string param values', () => {
        const screens = createScreens()
        const path = resolvePathFromScreen('UserProfile', { userId: 42 }, screens)

        expect(path).toBe('/users/42')
      })
    })
  })

  describe('Integration Tests', () => {
    it('should work end-to-end: create router -> add guard -> navigate -> subscribe', async () => {
      const screens = createScreens()
      const navRef = createMockNavigationRef({
        getCurrentRoute: vi.fn().mockReturnValue({
          name: 'Home',
          params: {},
          key: 'h-1',
        }),
      })
      const router = createReactNavigationRouter({
        navigationRef: navRef,
        linking: { screens },
        routes: [
          { path: '/', name: 'home' },
          { path: '/products', name: 'products' },
          { path: '/settings', name: 'settings' },
          { path: '/login', name: 'login' },
        ],
      })

      let isAuthenticated = false
      const guardCalls: string[] = []

      // Add auth guard
      router.addGuard((to) => {
        guardCalls.push(to.pathname)
        if (to.pathname === '/settings' && !isAuthenticated) {
          return '/login'
        }
        return true
      })

      // Subscribe to changes
      const listener = vi.fn()
      router.subscribe(listener)

      // Try to access protected route (should redirect to login)
      router.navigate('/settings')
      await flush()
      await flush()

      expect(guardCalls).toContain('/settings')
      expect(navRef.navigate).toHaveBeenCalledWith('Login', {})

      // Reset mocks for next navigation
      vi.mocked(navRef.navigate).mockClear()
      vi.mocked(navRef.dispatch).mockClear()

      // Authenticate and try again
      isAuthenticated = true
      router.navigate('/settings')
      await flush()

      expect(navRef.navigate).toHaveBeenCalledWith('Settings', {})
    })

    it('should handle named route navigation with params and query', async () => {
      const screens = {
        ...createScreens(),
        BlogPost: '/blog/:year/:month/:slug',
      }
      const navRef = createMockNavigationRef({
        getCurrentRoute: vi.fn().mockReturnValue({
          name: 'Home',
          params: {},
          key: 'h-1',
        }),
      })
      const router = createReactNavigationRouter({
        navigationRef: navRef,
        linking: { screens },
        routes: [{ path: '/blog/:year/:month/:slug', name: 'blog-post' }],
      })

      // Generate path from named route
      const generatedPath = router.generatePath('blog-post', {
        year: '2024',
        month: '01',
        slug: 'hello-world',
      })

      expect(generatedPath).toBe('/blog/2024/01/hello-world')

      // Navigate to generated path
      router.navigate(generatedPath)
      await flush()

      expect(navRef.navigate).toHaveBeenCalledWith('BlogPost', {
        year: '2024',
        month: '01',
        slug: 'hello-world',
      })
    })

    it('should support full lifecycle: create, navigate, destroy', async () => {
      const unsubscribeMock = vi.fn()
      const screens = createScreens()
      const navRef = createMockNavigationRef({
        addListener: vi.fn().mockReturnValue(unsubscribeMock),
        getCurrentRoute: vi.fn().mockReturnValue({
          name: 'Home',
          params: {},
          key: 'h-1',
        }),
      })
      const router = createReactNavigationRouter({
        navigationRef: navRef,
        linking: { screens },
        routes: [{ path: '/products', name: 'products' }],
      })

      // Navigate
      router.navigate('/products')
      await flush()
      expect(navRef.navigate).toHaveBeenCalled()

      // Destroy
      router.destroy()
      expect(unsubscribeMock).toHaveBeenCalled()

      // Routes should still be retrievable after destroy
      expect(router.getRoutes()).toHaveLength(1)
    })
  })
})
