import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  AnalyticsEvent,
  AnalyticsPageView,
  AnalyticsProvider,
  AnalyticsUserProps,
} from '../index.js'

/**
 * Tests for the `@molecule/api-analytics` module exports.
 *
 * This file tests the public API exported from the main index.ts entry point.
 * For detailed provider functionality tests, see provider.test.ts.
 */

describe('@molecule/api-analytics module exports', () => {
  describe('type exports', () => {
    it('should export AnalyticsUserProps type', async () => {
      // Type exports don't have runtime values, but we can verify
      // the module compiles and type usage works
      const user: AnalyticsUserProps = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        traits: { role: 'admin' },
      }

      expect(user.userId).toBe('user-123')
      expect(user.email).toBe('test@example.com')
      expect(user.name).toBe('Test User')
      expect(user.traits).toEqual({ role: 'admin' })
    })

    it('should allow minimal AnalyticsUserProps with only userId', async () => {
      const user: AnalyticsUserProps = {
        userId: 'user-456',
      }

      expect(user.userId).toBe('user-456')
      expect(user.email).toBeUndefined()
      expect(user.name).toBeUndefined()
      expect(user.traits).toBeUndefined()
    })

    it('should export AnalyticsEvent type', async () => {
      const event: AnalyticsEvent = {
        name: 'button.clicked',
        properties: { buttonId: 'submit-btn' },
        timestamp: new Date('2024-01-01T00:00:00Z'),
        userId: 'user-123',
        anonymousId: 'anon-456',
      }

      expect(event.name).toBe('button.clicked')
      expect(event.properties).toEqual({ buttonId: 'submit-btn' })
      expect(event.timestamp).toBeInstanceOf(Date)
      expect(event.userId).toBe('user-123')
      expect(event.anonymousId).toBe('anon-456')
    })

    it('should allow minimal AnalyticsEvent with only name', async () => {
      const event: AnalyticsEvent = {
        name: 'simple_event',
      }

      expect(event.name).toBe('simple_event')
      expect(event.properties).toBeUndefined()
      expect(event.timestamp).toBeUndefined()
      expect(event.userId).toBeUndefined()
      expect(event.anonymousId).toBeUndefined()
    })

    it('should export AnalyticsPageView type', async () => {
      const pageView: AnalyticsPageView = {
        name: 'Dashboard',
        category: 'App',
        url: 'https://app.example.com/dashboard',
        path: '/dashboard',
        referrer: 'https://google.com',
        properties: { section: 'overview' },
      }

      expect(pageView.name).toBe('Dashboard')
      expect(pageView.category).toBe('App')
      expect(pageView.url).toBe('https://app.example.com/dashboard')
      expect(pageView.path).toBe('/dashboard')
      expect(pageView.referrer).toBe('https://google.com')
      expect(pageView.properties).toEqual({ section: 'overview' })
    })

    it('should allow empty AnalyticsPageView', async () => {
      const pageView: AnalyticsPageView = {}

      expect(pageView.name).toBeUndefined()
      expect(pageView.category).toBeUndefined()
      expect(pageView.url).toBeUndefined()
      expect(pageView.path).toBeUndefined()
      expect(pageView.referrer).toBeUndefined()
      expect(pageView.properties).toBeUndefined()
    })

    it('should export AnalyticsProvider type with required methods', async () => {
      const provider: AnalyticsProvider = {
        identify: vi.fn().mockResolvedValue(undefined),
        track: vi.fn().mockResolvedValue(undefined),
        page: vi.fn().mockResolvedValue(undefined),
      }

      expect(typeof provider.identify).toBe('function')
      expect(typeof provider.track).toBe('function')
      expect(typeof provider.page).toBe('function')
    })

    it('should export AnalyticsProvider type with optional methods', async () => {
      const provider: AnalyticsProvider = {
        identify: vi.fn().mockResolvedValue(undefined),
        track: vi.fn().mockResolvedValue(undefined),
        page: vi.fn().mockResolvedValue(undefined),
        group: vi.fn().mockResolvedValue(undefined),
        reset: vi.fn().mockResolvedValue(undefined),
        flush: vi.fn().mockResolvedValue(undefined),
      }

      expect(typeof provider.group).toBe('function')
      expect(typeof provider.reset).toBe('function')
      expect(typeof provider.flush).toBe('function')
    })
  })

  describe('provider function exports', () => {
    beforeEach(async () => {
      vi.resetModules()
    })

    it('should export setProvider function', async () => {
      const { setProvider } = await import('../index.js')
      expect(typeof setProvider).toBe('function')
    })

    it('should export getProvider function', async () => {
      const { getProvider } = await import('../index.js')
      expect(typeof getProvider).toBe('function')
    })

    it('should export hasProvider function', async () => {
      const { hasProvider } = await import('../index.js')
      expect(typeof hasProvider).toBe('function')
    })

    it('should export identify function', async () => {
      const { identify } = await import('../index.js')
      expect(typeof identify).toBe('function')
    })

    it('should export track function', async () => {
      const { track } = await import('../index.js')
      expect(typeof track).toBe('function')
    })

    it('should export page function', async () => {
      const { page } = await import('../index.js')
      expect(typeof page).toBe('function')
    })

    it('should export group function', async () => {
      const { group } = await import('../index.js')
      expect(typeof group).toBe('function')
    })

    it('should export reset function', async () => {
      const { reset } = await import('../index.js')
      expect(typeof reset).toBe('function')
    })

    it('should export flush function', async () => {
      const { flush } = await import('../index.js')
      expect(typeof flush).toBe('function')
    })
  })

  describe('integration: exports work together', () => {
    beforeEach(async () => {
      vi.resetModules()
    })

    it('should allow setting a provider and using all functions', async () => {
      const { setProvider, getProvider, hasProvider, identify, track, page, group, reset, flush } =
        await import('../index.js')

      // Create a mock provider
      const mockProvider: AnalyticsProvider = {
        identify: vi.fn().mockResolvedValue(undefined),
        track: vi.fn().mockResolvedValue(undefined),
        page: vi.fn().mockResolvedValue(undefined),
        group: vi.fn().mockResolvedValue(undefined),
        reset: vi.fn().mockResolvedValue(undefined),
        flush: vi.fn().mockResolvedValue(undefined),
      }

      // Initially no provider
      expect(hasProvider()).toBe(false)

      // Set provider
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
      expect(getProvider()).toBe(mockProvider)

      // Use identify
      const user: AnalyticsUserProps = {
        userId: 'user-123',
        email: 'test@example.com',
      }
      await identify(user)
      expect(mockProvider.identify).toHaveBeenCalledWith(user)

      // Use track
      const event: AnalyticsEvent = {
        name: 'test_event',
        properties: { key: 'value' },
      }
      await track(event)
      expect(mockProvider.track).toHaveBeenCalledWith(event)

      // Use page
      const pageView: AnalyticsPageView = {
        name: 'Test Page',
        path: '/test',
      }
      await page(pageView)
      expect(mockProvider.page).toHaveBeenCalledWith(pageView)

      // Use group
      await group('org-123', { name: 'Test Org' })
      expect(mockProvider.group).toHaveBeenCalledWith('org-123', { name: 'Test Org' })

      // Use reset
      await reset()
      expect(mockProvider.reset).toHaveBeenCalled()

      // Use flush
      await flush()
      expect(mockProvider.flush).toHaveBeenCalled()
    })

    it('should allow replacing the provider', async () => {
      const { setProvider, getProvider } = await import('../index.js')

      const provider1: AnalyticsProvider = {
        identify: vi.fn(),
        track: vi.fn(),
        page: vi.fn(),
      }

      const provider2: AnalyticsProvider = {
        identify: vi.fn(),
        track: vi.fn(),
        page: vi.fn(),
      }

      setProvider(provider1)
      expect(getProvider()).toBe(provider1)

      setProvider(provider2)
      expect(getProvider()).toBe(provider2)
    })

    it('should throw meaningful error when no provider is set', async () => {
      const { identify, track, page, group, reset, flush } = await import('../index.js')

      const expectedError = 'Analytics provider not configured. Call setProvider() first.'

      await expect(identify({ userId: 'test' })).rejects.toThrow(expectedError)
      await expect(track({ name: 'test' })).rejects.toThrow(expectedError)
      await expect(page({})).rejects.toThrow(expectedError)
      await expect(group('org-123')).rejects.toThrow(expectedError)
      await expect(reset()).rejects.toThrow(expectedError)
      await expect(flush()).rejects.toThrow(expectedError)
    })
  })

  describe('real-world usage scenarios', () => {
    beforeEach(async () => {
      vi.resetModules()
    })

    it('should handle user signup flow', async () => {
      const { setProvider, identify, track, page } = await import('../index.js')

      const mockProvider: AnalyticsProvider = {
        identify: vi.fn().mockResolvedValue(undefined),
        track: vi.fn().mockResolvedValue(undefined),
        page: vi.fn().mockResolvedValue(undefined),
      }
      setProvider(mockProvider)

      // User views signup page
      await page({
        name: 'Signup',
        category: 'Auth',
        path: '/signup',
      })

      // User completes signup
      await identify({
        userId: 'new-user-123',
        email: 'newuser@example.com',
        name: 'New User',
        traits: {
          signupSource: 'organic',
          signupDate: '2024-01-01',
        },
      })

      await track({
        name: 'user.signed_up',
        userId: 'new-user-123',
        properties: {
          plan: 'free',
          referralCode: null,
        },
      })

      expect(mockProvider.page).toHaveBeenCalledTimes(1)
      expect(mockProvider.identify).toHaveBeenCalledTimes(1)
      expect(mockProvider.track).toHaveBeenCalledTimes(1)
    })

    it('should handle e-commerce purchase flow', async () => {
      const { setProvider, track } = await import('../index.js')

      const mockProvider: AnalyticsProvider = {
        identify: vi.fn().mockResolvedValue(undefined),
        track: vi.fn().mockResolvedValue(undefined),
        page: vi.fn().mockResolvedValue(undefined),
      }
      setProvider(mockProvider)

      // Track product view
      await track({
        name: 'product.viewed',
        userId: 'user-123',
        properties: {
          productId: 'prod-456',
          productName: 'Premium Widget',
          price: 99.99,
          currency: 'USD',
        },
      })

      // Track add to cart
      await track({
        name: 'product.added_to_cart',
        userId: 'user-123',
        properties: {
          productId: 'prod-456',
          quantity: 2,
          cartTotal: 199.98,
        },
      })

      // Track purchase completed
      await track({
        name: 'order.completed',
        userId: 'user-123',
        timestamp: new Date(),
        properties: {
          orderId: 'order-789',
          total: 199.98,
          currency: 'USD',
          products: [{ productId: 'prod-456', quantity: 2, price: 99.99 }],
        },
      })

      expect(mockProvider.track).toHaveBeenCalledTimes(3)
    })

    it('should handle user logout flow', async () => {
      const { setProvider, track, reset, flush } = await import('../index.js')

      const mockProvider: AnalyticsProvider = {
        identify: vi.fn().mockResolvedValue(undefined),
        track: vi.fn().mockResolvedValue(undefined),
        page: vi.fn().mockResolvedValue(undefined),
        reset: vi.fn().mockResolvedValue(undefined),
        flush: vi.fn().mockResolvedValue(undefined),
      }
      setProvider(mockProvider)

      // Track logout event
      await track({
        name: 'user.logged_out',
        userId: 'user-123',
      })

      // Flush any pending events
      await flush()

      // Reset analytics state
      await reset()

      expect(mockProvider.track).toHaveBeenCalledWith({
        name: 'user.logged_out',
        userId: 'user-123',
      })
      expect(mockProvider.flush).toHaveBeenCalled()
      expect(mockProvider.reset).toHaveBeenCalled()
    })

    it('should handle organization/team tracking', async () => {
      const { setProvider, identify, group, track } = await import('../index.js')

      const mockProvider: AnalyticsProvider = {
        identify: vi.fn().mockResolvedValue(undefined),
        track: vi.fn().mockResolvedValue(undefined),
        page: vi.fn().mockResolvedValue(undefined),
        group: vi.fn().mockResolvedValue(undefined),
      }
      setProvider(mockProvider)

      // Identify user
      await identify({
        userId: 'user-123',
        email: 'user@company.com',
        name: 'Team Member',
      })

      // Associate with organization
      await group('org-456', {
        name: 'Acme Corporation',
        plan: 'enterprise',
        seats: 50,
        industry: 'Technology',
      })

      // Track team action
      await track({
        name: 'team.member_invited',
        userId: 'user-123',
        properties: {
          organizationId: 'org-456',
          inviteeEmail: 'newmember@company.com',
        },
      })

      expect(mockProvider.identify).toHaveBeenCalled()
      expect(mockProvider.group).toHaveBeenCalledWith('org-456', {
        name: 'Acme Corporation',
        plan: 'enterprise',
        seats: 50,
        industry: 'Technology',
      })
      expect(mockProvider.track).toHaveBeenCalled()
    })

    it('should handle anonymous user tracking', async () => {
      const { setProvider, track, page } = await import('../index.js')

      const mockProvider: AnalyticsProvider = {
        identify: vi.fn().mockResolvedValue(undefined),
        track: vi.fn().mockResolvedValue(undefined),
        page: vi.fn().mockResolvedValue(undefined),
      }
      setProvider(mockProvider)

      // Track page view without user
      await page({
        name: 'Landing Page',
        path: '/',
        referrer: 'https://google.com/search?q=product',
        properties: {
          campaign: 'google-ads',
        },
      })

      // Track event with anonymous ID
      await track({
        name: 'cta.clicked',
        anonymousId: 'anon-abc-123',
        properties: {
          ctaText: 'Get Started Free',
          ctaPosition: 'hero',
        },
      })

      expect(mockProvider.page).toHaveBeenCalled()
      expect(mockProvider.track).toHaveBeenCalledWith({
        name: 'cta.clicked',
        anonymousId: 'anon-abc-123',
        properties: {
          ctaText: 'Get Started Free',
          ctaPosition: 'hero',
        },
      })
    })
  })
})
