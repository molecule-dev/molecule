import { firstValueFrom } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  NavigateOptions,
  QueryParams,
  RouteChangeListener,
  RouteLocation,
  RouteParams,
  Router,
} from '@molecule/app-routing'

vi.mock('@angular/core', () => ({
  Injectable: () => (target: unknown) => target,
  Inject: () => () => undefined,
  InjectionToken: class InjectionToken {
    _desc: string
    constructor(desc: string) {
      this._desc = desc
    }
  },
}))

vi.mock('@molecule/app-auth', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-http', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-i18n', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-logger', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-routing', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-state', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-storage', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-theme', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))

import { MoleculeRouterService } from '../services/router.service.js'
import { createTestRouter } from './helpers/test-providers.js'

describe('MoleculeRouterService', () => {
  let service: MoleculeRouterService
  let mockRouter: Router
  let subscribeCallback: RouteChangeListener | null

  beforeEach(() => {
    subscribeCallback = null

    mockRouter = createTestRouter()
    vi.mocked(mockRouter.subscribe).mockImplementation((listener) => {
      subscribeCallback = listener
      return () => {
        subscribeCallback = null
      }
    })

    service = new MoleculeRouterService(mockRouter)
  })

  /** Fires the captured route-change listener the way a real router does. */
  const emitRouteChange = (
    location: RouteLocation,
    params: RouteParams,
    query: QueryParams,
  ): void => {
    vi.mocked(mockRouter.getLocation).mockReturnValue(location)
    // getParams is generic, so it is a plain function the test replaces
    // instead of a `vi.fn` to override.
    mockRouter.getParams = <T extends RouteParams = RouteParams>(): T => params as T
    vi.mocked(mockRouter.getQuery).mockReturnValue(query)
    subscribeCallback!(location, 'push')
  }

  describe('constructor', () => {
    it('should initialize location$ with the current location', async () => {
      const location = await firstValueFrom(service.location$)
      expect(location).toEqual({ pathname: '/', search: '', hash: '' })
    })

    it('should initialize params$ with the current params', async () => {
      const params = await firstValueFrom(service.params$)
      expect(params).toEqual({})
    })

    it('should initialize query$ with the current query', async () => {
      const query = await firstValueFrom(service.query$)
      expect(query).toEqual({})
    })

    it('should initialize pathname$ derived from location$', async () => {
      const pathname = await firstValueFrom(service.pathname$)
      expect(pathname).toBe('/')
    })

    it('should subscribe to router changes', () => {
      expect(mockRouter.subscribe).toHaveBeenCalledTimes(1)
    })
  })

  describe('reactive state updates', () => {
    it('should update location$ on route change', () => {
      const locations: RouteLocation[] = []
      service.location$.subscribe((l) => locations.push(l))

      emitRouteChange({ pathname: '/about', search: '', hash: '' }, {}, {})

      expect(locations).toHaveLength(2)
      expect(locations[1].pathname).toBe('/about')
    })

    it('should update params$ on route change', () => {
      const paramValues: RouteParams[] = []
      service.params$.subscribe((p) => paramValues.push(p))

      emitRouteChange({ pathname: '/users/123', search: '', hash: '' }, { id: '123' }, {})

      expect(paramValues).toHaveLength(2)
      expect(paramValues[1]).toEqual({ id: '123' })
    })

    it('should update query$ on route change', () => {
      const queryValues: QueryParams[] = []
      service.query$.subscribe((q) => queryValues.push(q))

      emitRouteChange({ pathname: '/search', search: '?q=test', hash: '' }, {}, { q: 'test' })

      expect(queryValues).toHaveLength(2)
      expect(queryValues[1]).toEqual({ q: 'test' })
    })

    it('should update pathname$ on route change', () => {
      const pathnames: string[] = []
      service.pathname$.subscribe((p) => pathnames.push(p))

      emitRouteChange({ pathname: '/dashboard', search: '', hash: '' }, {}, {})

      expect(pathnames).toHaveLength(2)
      expect(pathnames[1]).toBe('/dashboard')
    })

    it('should deduplicate pathname$ emissions with distinctUntilChanged', () => {
      const pathnames: string[] = []
      service.pathname$.subscribe((p) => pathnames.push(p))

      // Same pathname, different search
      emitRouteChange({ pathname: '/', search: '?foo=bar', hash: '' }, {}, { foo: 'bar' })

      // pathname is still '/', so no new emission
      expect(pathnames).toHaveLength(1)
    })
  })

  describe('synchronous getters', () => {
    it('should return current location snapshot', () => {
      expect(service.location).toEqual({ pathname: '/', search: '', hash: '' })
    })

    it('should return current params snapshot', () => {
      expect(service.params).toEqual({})
    })

    it('should return current query snapshot', () => {
      expect(service.query).toEqual({})
    })
  })

  describe('navigate', () => {
    it('should delegate to the router', () => {
      service.navigate('/about')
      expect(mockRouter.navigate).toHaveBeenCalledWith('/about', undefined)
    })

    it('should pass navigation options', () => {
      const options: NavigateOptions = { replace: true }
      service.navigate('/about', options)
      expect(mockRouter.navigate).toHaveBeenCalledWith('/about', options)
    })
  })

  describe('navigateTo', () => {
    it('should delegate to the router with named route', () => {
      service.navigateTo('user-profile', { id: '123' }, { tab: 'settings' })
      expect(mockRouter.navigateTo).toHaveBeenCalledWith(
        'user-profile',
        { id: '123' },
        { tab: 'settings' },
        undefined,
      )
    })

    it('should pass navigation options', () => {
      const options: NavigateOptions = { replace: true }
      service.navigateTo('home', undefined, undefined, options)
      expect(mockRouter.navigateTo).toHaveBeenCalledWith('home', undefined, undefined, options)
    })
  })

  describe('back', () => {
    it('should delegate to the router', () => {
      service.back()
      expect(mockRouter.back).toHaveBeenCalledTimes(1)
    })
  })

  describe('forward', () => {
    it('should delegate to the router', () => {
      service.forward()
      expect(mockRouter.forward).toHaveBeenCalledTimes(1)
    })
  })

  describe('isActive', () => {
    it('should delegate to the router', () => {
      service.isActive('/about')
      expect(mockRouter.isActive).toHaveBeenCalledWith('/about', false)
    })

    it('should support exact matching', () => {
      service.isActive('/about', true)
      expect(mockRouter.isActive).toHaveBeenCalledWith('/about', true)
    })

    it('should return the result from the router', () => {
      vi.mocked(mockRouter.isActive).mockReturnValue(true)
      expect(service.isActive('/')).toBe(true)
    })
  })

  describe('ngOnDestroy', () => {
    it('should unsubscribe from router changes', () => {
      expect(subscribeCallback).not.toBeNull()
      service.ngOnDestroy()
      expect(subscribeCallback).toBeNull()
    })

    it('should complete all subjects', () => {
      const completeSpy1 = vi.fn()
      const completeSpy2 = vi.fn()
      const completeSpy3 = vi.fn()
      service.location$.subscribe({ complete: completeSpy1 })
      service.params$.subscribe({ complete: completeSpy2 })
      service.query$.subscribe({ complete: completeSpy3 })

      service.ngOnDestroy()

      expect(completeSpy1).toHaveBeenCalledTimes(1)
      expect(completeSpy2).toHaveBeenCalledTimes(1)
      expect(completeSpy3).toHaveBeenCalledTimes(1)
    })

    it('should handle being called multiple times', () => {
      service.ngOnDestroy()
      expect(() => service.ngOnDestroy()).not.toThrow()
    })
  })
})
