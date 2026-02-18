/**
 * Tests for `@molecule/app-analytics` module.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockBond, mockGet, mockIsBonded } = vi.hoisted(() => ({
  mockBond: vi.fn(),
  mockGet: vi.fn(),
  mockIsBonded: vi.fn(),
}))

vi.mock('@molecule/app-bond', () => ({
  bond: mockBond,
  get: mockGet,
  isBonded: mockIsBonded,
}))

import {
  flush,
  getProvider,
  group,
  hasProvider,
  identify,
  page,
  reset,
  setProvider,
  setupAutoTracking,
  track,
} from '../index.js'
import type { AnalyticsProvider } from '../types.js'

function createMockProvider(): AnalyticsProvider & {
  identify: ReturnType<typeof vi.fn>
  track: ReturnType<typeof vi.fn>
  page: ReturnType<typeof vi.fn>
  group: ReturnType<typeof vi.fn>
  reset: ReturnType<typeof vi.fn>
  flush: ReturnType<typeof vi.fn>
} {
  return {
    identify: vi.fn().mockResolvedValue(undefined),
    track: vi.fn().mockResolvedValue(undefined),
    page: vi.fn().mockResolvedValue(undefined),
    group: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn().mockResolvedValue(undefined),
    flush: vi.fn().mockResolvedValue(undefined),
  }
}

describe('@molecule/app-analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('setProvider', () => {
    it('should bond the provider', () => {
      const provider = createMockProvider()
      setProvider(provider)
      expect(mockBond).toHaveBeenCalledWith('app-analytics', provider)
    })
  })

  describe('getProvider', () => {
    it('should return no-op provider when not bonded', () => {
      mockIsBonded.mockReturnValue(false)
      const provider = getProvider()
      expect(provider).toBeDefined()
      expect(typeof provider.identify).toBe('function')
      expect(typeof provider.track).toBe('function')
      expect(typeof provider.page).toBe('function')
    })

    it('should return bonded provider', () => {
      const mockProvider = createMockProvider()
      mockIsBonded.mockReturnValue(true)
      mockGet.mockReturnValue(mockProvider)

      const provider = getProvider()
      expect(provider).toBe(mockProvider)
    })

    it('no-op provider methods should resolve without error', async () => {
      mockIsBonded.mockReturnValue(false)
      const provider = getProvider()

      await expect(provider.identify({ userId: 'test' })).resolves.toBeUndefined()
      await expect(provider.track({ name: 'test' })).resolves.toBeUndefined()
      await expect(provider.page({})).resolves.toBeUndefined()
      await expect(provider.reset!()).resolves.toBeUndefined()
      await expect(provider.flush!()).resolves.toBeUndefined()
    })
  })

  describe('hasProvider', () => {
    it('should return false when not bonded', () => {
      mockIsBonded.mockReturnValue(false)
      expect(hasProvider()).toBe(false)
    })

    it('should return true when bonded', () => {
      mockIsBonded.mockReturnValue(true)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('convenience functions', () => {
    let mockProvider: ReturnType<typeof createMockProvider>

    beforeEach(() => {
      mockProvider = createMockProvider()
      mockIsBonded.mockReturnValue(true)
      mockGet.mockReturnValue(mockProvider)
    })

    it('identify should delegate to provider', async () => {
      const user = { userId: 'u1', email: 'test@example.com' }
      await identify(user)
      expect(mockProvider.identify).toHaveBeenCalledWith(user)
    })

    it('track should delegate to provider', async () => {
      const event = { name: 'button.click', properties: { label: 'submit' } }
      await track(event)
      expect(mockProvider.track).toHaveBeenCalledWith(event)
    })

    it('page should delegate to provider', async () => {
      const pageView = { path: '/home', name: 'Home' }
      await page(pageView)
      expect(mockProvider.page).toHaveBeenCalledWith(pageView)
    })

    it('group should delegate to provider', async () => {
      await group('org-1', { name: 'Acme' })
      expect(mockProvider.group).toHaveBeenCalledWith('org-1', { name: 'Acme' })
    })

    it('reset should delegate to provider', async () => {
      await reset()
      expect(mockProvider.reset).toHaveBeenCalled()
    })

    it('flush should delegate to provider', async () => {
      await flush()
      expect(mockProvider.flush).toHaveBeenCalled()
    })

    it('convenience functions should not throw on provider errors', async () => {
      mockProvider.track.mockRejectedValue(new Error('network error'))
      await expect(track({ name: 'test' })).resolves.toBeUndefined()
    })
  })

  describe('setupAutoTracking', () => {
    let mockProvider: ReturnType<typeof createMockProvider>

    beforeEach(() => {
      mockProvider = createMockProvider()
      mockIsBonded.mockReturnValue(true)
      mockGet.mockReturnValue(mockProvider)
    })

    describe('auth events', () => {
      it('should track login events', () => {
        const listeners: ((event: unknown) => void)[] = []
        const authClient = {
          addEventListener: (listener: (event: unknown) => void) => {
            listeners.push(listener)
            return () => {
              const idx = listeners.indexOf(listener)
              if (idx >= 0) listeners.splice(idx, 1)
            }
          },
        }

        setupAutoTracking({ authClient })

        listeners[0]({ type: 'login', user: { id: 'u1', email: 'a@b.com', name: 'User' } })

        expect(mockProvider.identify).toHaveBeenCalledWith({
          userId: 'u1',
          email: 'a@b.com',
          name: 'User',
        })
        expect(mockProvider.track).toHaveBeenCalledWith({
          name: 'auth.login',
          properties: { userId: 'u1' },
        })
      })

      it('should track register events', () => {
        const listeners: ((event: unknown) => void)[] = []
        const authClient = {
          addEventListener: (listener: (event: unknown) => void) => {
            listeners.push(listener)
            return () => {
              const idx = listeners.indexOf(listener)
              if (idx >= 0) listeners.splice(idx, 1)
            }
          },
        }

        setupAutoTracking({ authClient })
        listeners[0]({ type: 'register', user: { id: 'u2' } })

        expect(mockProvider.identify).toHaveBeenCalledWith({
          userId: 'u2',
          email: undefined,
          name: undefined,
        })
        expect(mockProvider.track).toHaveBeenCalledWith({
          name: 'auth.register',
          properties: { userId: 'u2' },
        })
      })

      it('should track logout events and reset', () => {
        const listeners: ((event: unknown) => void)[] = []
        const authClient = {
          addEventListener: (listener: (event: unknown) => void) => {
            listeners.push(listener)
            return () => {
              const idx = listeners.indexOf(listener)
              if (idx >= 0) listeners.splice(idx, 1)
            }
          },
        }

        setupAutoTracking({ authClient })
        listeners[0]({ type: 'logout' })

        expect(mockProvider.track).toHaveBeenCalledWith({ name: 'auth.logout' })
        expect(mockProvider.reset).toHaveBeenCalled()
      })

      it('should track auth errors', () => {
        const listeners: ((event: unknown) => void)[] = []
        const authClient = {
          addEventListener: (listener: (event: unknown) => void) => {
            listeners.push(listener)
            return () => {
              const idx = listeners.indexOf(listener)
              if (idx >= 0) listeners.splice(idx, 1)
            }
          },
        }

        setupAutoTracking({ authClient })
        listeners[0]({ type: 'error', error: 'session expired' })

        expect(mockProvider.track).toHaveBeenCalledWith({
          name: 'auth.error',
          properties: { error: 'session expired' },
        })
      })
    })

    describe('route changes', () => {
      it('should track page views on route changes', () => {
        const listeners: ((location: unknown, action: string) => void)[] = []
        const router = {
          subscribe: (listener: (location: unknown, action: string) => void) => {
            listeners.push(listener)
            return () => {
              const idx = listeners.indexOf(listener)
              if (idx >= 0) listeners.splice(idx, 1)
            }
          },
        }

        setupAutoTracking({ router })
        listeners[0]({ pathname: '/dashboard', search: '?tab=overview', hash: '' }, 'push')

        expect(mockProvider.page).toHaveBeenCalledWith({
          path: '/dashboard',
          url: '/dashboard?tab=overview',
        })
      })
    })

    describe('HTTP errors', () => {
      it('should track HTTP errors', () => {
        const interceptors: ((error: unknown) => unknown)[] = []
        const httpClient = {
          addErrorInterceptor: (interceptor: (error: unknown) => unknown) => {
            interceptors.push(interceptor)
            return () => {
              const idx = interceptors.indexOf(interceptor)
              if (idx >= 0) interceptors.splice(idx, 1)
            }
          },
        }

        setupAutoTracking({ httpClient })

        const error = {
          message: 'Not Found',
          status: 404,
          config: { method: 'GET', url: '/api/users/123' },
        }
        const result = interceptors[0](error)

        expect(mockProvider.track).toHaveBeenCalledWith({
          name: 'http.error',
          properties: {
            status: 404,
            method: 'GET',
            url: '/api/users/123',
            message: 'Not Found',
          },
        })
        // Should pass through the error
        expect(result).toBe(error)
      })
    })

    describe('cleanup', () => {
      it('should remove all listeners on cleanup', () => {
        const authRemove = vi.fn()
        const routerRemove = vi.fn()
        const httpRemove = vi.fn()

        const authClient = { addEventListener: vi.fn().mockReturnValue(authRemove) }
        const router = { subscribe: vi.fn().mockReturnValue(routerRemove) }
        const httpClient = { addErrorInterceptor: vi.fn().mockReturnValue(httpRemove) }

        const cleanup = setupAutoTracking({ authClient, router, httpClient })

        expect(authRemove).not.toHaveBeenCalled()
        expect(routerRemove).not.toHaveBeenCalled()
        expect(httpRemove).not.toHaveBeenCalled()

        cleanup()

        expect(authRemove).toHaveBeenCalledOnce()
        expect(routerRemove).toHaveBeenCalledOnce()
        expect(httpRemove).toHaveBeenCalledOnce()
      })

      it('should work with partial options', () => {
        const routerRemove = vi.fn()
        const router = { subscribe: vi.fn().mockReturnValue(routerRemove) }

        const cleanup = setupAutoTracking({ router })
        cleanup()

        expect(routerRemove).toHaveBeenCalledOnce()
      })

      it('should work with no options', () => {
        const cleanup = setupAutoTracking({})
        expect(() => cleanup()).not.toThrow()
      })
    })

    it('should not throw if analytics methods fail', () => {
      mockProvider.track.mockRejectedValue(new Error('analytics down'))
      mockProvider.identify.mockRejectedValue(new Error('analytics down'))
      mockProvider.page.mockRejectedValue(new Error('analytics down'))

      const listeners: ((event: unknown) => void)[] = []
      const authClient = {
        addEventListener: (listener: (event: unknown) => void) => {
          listeners.push(listener)
          return () => {}
        },
      }

      setupAutoTracking({ authClient })

      // Should not throw
      expect(() => listeners[0]({ type: 'login', user: { id: 'u1' } })).not.toThrow()
    })
  })
})
