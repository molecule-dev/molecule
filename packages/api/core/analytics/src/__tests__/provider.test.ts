import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type {
  AnalyticsEvent,
  AnalyticsPageView,
  AnalyticsProvider,
  AnalyticsUserProps,
} from '../types.js'

// We need to reset the module state between tests
let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let identify: typeof ProviderModule.identify
let track: typeof ProviderModule.track
let page: typeof ProviderModule.page
let group: typeof ProviderModule.group
let reset: typeof ProviderModule.reset
let flush: typeof ProviderModule.flush

describe('analytics provider', () => {
  beforeEach(async () => {
    // Reset modules to get fresh state
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    identify = providerModule.identify
    track = providerModule.track
    page = providerModule.page
    group = providerModule.group
    reset = providerModule.reset
    flush = providerModule.flush
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Analytics provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider: AnalyticsProvider = {
        identify: vi.fn(),
        track: vi.fn(),
        page: vi.fn(),
      }
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      const mockProvider: AnalyticsProvider = {
        identify: vi.fn(),
        track: vi.fn(),
        page: vi.fn(),
      }
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('identify', () => {
    it('should throw when no provider is set', async () => {
      const user: AnalyticsUserProps = { userId: 'user-123' }
      await expect(identify(user)).rejects.toThrow('Analytics provider not configured')
    })

    it('should call provider identify', async () => {
      const mockIdentify = vi.fn().mockResolvedValue(undefined)
      const mockProvider: AnalyticsProvider = {
        identify: mockIdentify,
        track: vi.fn(),
        page: vi.fn(),
      }
      setProvider(mockProvider)

      const user: AnalyticsUserProps = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        traits: { plan: 'premium' },
      }
      await identify(user)

      expect(mockIdentify).toHaveBeenCalledWith(user)
    })
  })

  describe('track', () => {
    it('should throw when no provider is set', async () => {
      const event: AnalyticsEvent = { name: 'test_event' }
      await expect(track(event)).rejects.toThrow('Analytics provider not configured')
    })

    it('should call provider track', async () => {
      const mockTrack = vi.fn().mockResolvedValue(undefined)
      const mockProvider: AnalyticsProvider = {
        identify: vi.fn(),
        track: mockTrack,
        page: vi.fn(),
      }
      setProvider(mockProvider)

      const event: AnalyticsEvent = {
        name: 'purchase.completed',
        properties: { amount: 99.99 },
        userId: 'user-123',
      }
      await track(event)

      expect(mockTrack).toHaveBeenCalledWith(event)
    })
  })

  describe('page', () => {
    it('should throw when no provider is set', async () => {
      const pageView: AnalyticsPageView = { name: 'Home' }
      await expect(page(pageView)).rejects.toThrow('Analytics provider not configured')
    })

    it('should call provider page', async () => {
      const mockPage = vi.fn().mockResolvedValue(undefined)
      const mockProvider: AnalyticsProvider = {
        identify: vi.fn(),
        track: vi.fn(),
        page: mockPage,
      }
      setProvider(mockProvider)

      const pageView: AnalyticsPageView = {
        name: 'Dashboard',
        category: 'App',
        url: 'https://example.com/dashboard',
        path: '/dashboard',
      }
      await page(pageView)

      expect(mockPage).toHaveBeenCalledWith(pageView)
    })
  })

  describe('group', () => {
    it('should throw when no provider is set', async () => {
      await expect(group('org-123')).rejects.toThrow('Analytics provider not configured')
    })

    it('should throw when provider does not support group', async () => {
      const mockProvider: AnalyticsProvider = {
        identify: vi.fn(),
        track: vi.fn(),
        page: vi.fn(),
        // group is not defined
      }
      setProvider(mockProvider)

      await expect(group('org-123')).rejects.toThrow('Analytics provider does not support group()')
    })

    it('should call provider group with traits', async () => {
      const mockGroup = vi.fn().mockResolvedValue(undefined)
      const mockProvider: AnalyticsProvider = {
        identify: vi.fn(),
        track: vi.fn(),
        page: vi.fn(),
        group: mockGroup,
      }
      setProvider(mockProvider)

      const traits = { name: 'Acme Corp', plan: 'enterprise' }
      await group('org-123', traits)

      expect(mockGroup).toHaveBeenCalledWith('org-123', traits)
    })
  })

  describe('reset', () => {
    it('should throw when no provider is set', async () => {
      await expect(reset()).rejects.toThrow('Analytics provider not configured')
    })

    it('should not throw when provider does not support reset', async () => {
      const mockProvider: AnalyticsProvider = {
        identify: vi.fn(),
        track: vi.fn(),
        page: vi.fn(),
        // reset is not defined
      }
      setProvider(mockProvider)

      await expect(reset()).resolves.toBeUndefined()
    })

    it('should call provider reset when available', async () => {
      const mockReset = vi.fn().mockResolvedValue(undefined)
      const mockProvider: AnalyticsProvider = {
        identify: vi.fn(),
        track: vi.fn(),
        page: vi.fn(),
        reset: mockReset,
      }
      setProvider(mockProvider)

      await reset()

      expect(mockReset).toHaveBeenCalled()
    })
  })

  describe('flush', () => {
    it('should throw when no provider is set', async () => {
      await expect(flush()).rejects.toThrow('Analytics provider not configured')
    })

    it('should not throw when provider does not support flush', async () => {
      const mockProvider: AnalyticsProvider = {
        identify: vi.fn(),
        track: vi.fn(),
        page: vi.fn(),
        // flush is not defined
      }
      setProvider(mockProvider)

      await expect(flush()).resolves.toBeUndefined()
    })

    it('should call provider flush when available', async () => {
      const mockFlush = vi.fn().mockResolvedValue(undefined)
      const mockProvider: AnalyticsProvider = {
        identify: vi.fn(),
        track: vi.fn(),
        page: vi.fn(),
        flush: mockFlush,
      }
      setProvider(mockProvider)

      await flush()

      expect(mockFlush).toHaveBeenCalled()
    })
  })
})

describe('analytics types', () => {
  it('should export AnalyticsUserProps type', () => {
    const user: AnalyticsUserProps = {
      userId: 'test-user',
      email: 'test@example.com',
      name: 'Test',
      traits: { custom: 'value' },
    }
    expect(user.userId).toBe('test-user')
  })

  it('should export AnalyticsEvent type', () => {
    const event: AnalyticsEvent = {
      name: 'test_event',
      properties: { key: 'value' },
      timestamp: new Date(),
      userId: 'user-123',
      anonymousId: 'anon-456',
    }
    expect(event.name).toBe('test_event')
  })

  it('should export AnalyticsPageView type', () => {
    const pageView: AnalyticsPageView = {
      name: 'Home',
      category: 'Marketing',
      url: 'https://example.com',
      path: '/',
      referrer: 'https://google.com',
      properties: { variant: 'A' },
    }
    expect(pageView.name).toBe('Home')
  })

  it('should export AnalyticsProvider type', () => {
    const provider: AnalyticsProvider = {
      identify: async () => {},
      track: async () => {},
      page: async () => {},
      group: async () => {},
      reset: async () => {},
      flush: async () => {},
    }
    expect(typeof provider.identify).toBe('function')
  })
})
