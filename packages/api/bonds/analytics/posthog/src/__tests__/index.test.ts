import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  AnalyticsEvent,
  AnalyticsPageView,
  AnalyticsUserProps,
  PostHogOptions,
} from '../index.js'

/**
 * Mock the PostHog client
 */
const mockIdentify = vi.fn()
const mockCapture = vi.fn()
const mockGroupIdentify = vi.fn()
const mockFlush = vi.fn().mockResolvedValue(undefined)
const mockShutdown = vi.fn().mockResolvedValue(undefined)

vi.mock('posthog-node', () => ({
  PostHog: vi.fn(function () {
    return {
      identify: mockIdentify,
      capture: mockCapture,
      groupIdentify: mockGroupIdentify,
      flush: mockFlush,
      shutdown: mockShutdown,
    }
  }),
}))

describe('@molecule/api-analytics-posthog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    // Reset environment variables
    delete process.env.POSTHOG_API_KEY
    delete process.env.POSTHOG_HOST
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('module exports', () => {
    it('should export createProvider function', async () => {
      const module = await import('../index.js')
      expect(typeof module.createProvider).toBe('function')
    })

    it('should export provider instance', async () => {
      const module = await import('../index.js')
      expect(module.provider).toBeDefined()
      expect(typeof module.provider.identify).toBe('function')
      expect(typeof module.provider.track).toBe('function')
      expect(typeof module.provider.page).toBe('function')
    })

    it('should export shutdown function', async () => {
      const module = await import('../index.js')
      expect(typeof module.shutdown).toBe('function')
    })

    it('should export createClient function', async () => {
      const module = await import('../index.js')
      expect(typeof module.createClient).toBe('function')
    })

    it('should export type definitions', async () => {
      // Type exports don't have runtime values, but we can verify
      // the module compiles and type usage works
      const user: AnalyticsUserProps = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        traits: { role: 'admin' },
      }
      expect(user.userId).toBe('user-123')

      const event: AnalyticsEvent = {
        name: 'test_event',
        properties: { key: 'value' },
      }
      expect(event.name).toBe('test_event')

      const pageView: AnalyticsPageView = {
        name: 'Home',
        path: '/',
      }
      expect(pageView.name).toBe('Home')

      const options: PostHogOptions = {
        apiKey: 'test-key',
        host: 'https://app.posthog.com',
        flushAt: 10,
        flushInterval: 5000,
      }
      expect(options.apiKey).toBe('test-key')
    })
  })

  describe('createProvider', () => {
    it('should create a provider with explicit options', async () => {
      const { createProvider } = await import('../index.js')

      const provider = createProvider({
        apiKey: 'test-api-key',
        host: 'https://custom.posthog.com',
        flushAt: 10,
        flushInterval: 5000,
      })

      expect(provider).toBeDefined()
      expect(typeof provider.identify).toBe('function')
      expect(typeof provider.track).toBe('function')
      expect(typeof provider.page).toBe('function')
      expect(typeof provider.group).toBe('function')
      expect(typeof provider.reset).toBe('function')
      expect(typeof provider.flush).toBe('function')
    })

    it('should create a provider with environment variables', async () => {
      process.env.POSTHOG_API_KEY = 'env-api-key'
      process.env.POSTHOG_HOST = 'https://env.posthog.com'

      const { createProvider } = await import('../index.js')
      const provider = createProvider()

      expect(provider).toBeDefined()
    })

    it('should use defaults when no options or env vars provided', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider()

      expect(provider).toBeDefined()
    })

    it('should prefer explicit options over environment variables', async () => {
      process.env.POSTHOG_API_KEY = 'env-api-key'
      process.env.POSTHOG_HOST = 'https://env.posthog.com'

      const { PostHog } = await import('posthog-node')
      const { createProvider } = await import('../index.js')

      createProvider({
        apiKey: 'explicit-api-key',
        host: 'https://explicit.posthog.com',
      })

      expect(PostHog).toHaveBeenCalledWith('explicit-api-key', {
        host: 'https://explicit.posthog.com',
        flushAt: 20,
        flushInterval: 10000,
      })
    })
  })

  describe('provider.identify', () => {
    it('should identify a user with all properties', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.identify({
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        traits: { plan: 'premium', role: 'admin' },
      })

      expect(mockIdentify).toHaveBeenCalledWith({
        distinctId: 'user-123',
        properties: {
          email: 'test@example.com',
          name: 'Test User',
          plan: 'premium',
          role: 'admin',
        },
      })
    })

    it('should identify a user with minimal properties', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.identify({
        userId: 'user-456',
      })

      expect(mockIdentify).toHaveBeenCalledWith({
        distinctId: 'user-456',
        properties: {
          email: undefined,
          name: undefined,
        },
      })
    })

    it('should merge traits into properties', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.identify({
        userId: 'user-789',
        email: 'user@example.com',
        traits: {
          customField: 'value',
          numericField: 42,
          booleanField: true,
        },
      })

      expect(mockIdentify).toHaveBeenCalledWith({
        distinctId: 'user-789',
        properties: {
          email: 'user@example.com',
          name: undefined,
          customField: 'value',
          numericField: 42,
          booleanField: true,
        },
      })
    })
  })

  describe('provider.track', () => {
    it('should track an event with user ID', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.track({
        name: 'purchase.completed',
        userId: 'user-123',
        properties: {
          amount: 99.99,
          currency: 'USD',
        },
      })

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-123',
        event: 'purchase.completed',
        properties: {
          amount: 99.99,
          currency: 'USD',
        },
        timestamp: undefined,
      })
    })

    it('should track an event with anonymous ID', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.track({
        name: 'button.clicked',
        anonymousId: 'anon-456',
        properties: { buttonId: 'signup-btn' },
      })

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'anon-456',
        event: 'button.clicked',
        properties: { buttonId: 'signup-btn' },
        timestamp: undefined,
      })
    })

    it('should prefer userId over anonymousId', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.track({
        name: 'test.event',
        userId: 'user-123',
        anonymousId: 'anon-456',
      })

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-123',
        event: 'test.event',
        properties: undefined,
        timestamp: undefined,
      })
    })

    it('should use "anonymous" when no ID provided', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.track({
        name: 'page.loaded',
      })

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'anonymous',
        event: 'page.loaded',
        properties: undefined,
        timestamp: undefined,
      })
    })

    it('should include timestamp when provided', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      const timestamp = new Date('2024-01-15T10:30:00Z')
      await provider.track({
        name: 'historical.event',
        userId: 'user-123',
        timestamp,
      })

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-123',
        event: 'historical.event',
        properties: undefined,
        timestamp,
      })
    })

    it('should track events with complex properties', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.track({
        name: 'order.completed',
        userId: 'user-123',
        properties: {
          orderId: 'order-789',
          total: 199.98,
          currency: 'USD',
          products: [
            { productId: 'prod-1', name: 'Widget', quantity: 2 },
            { productId: 'prod-2', name: 'Gadget', quantity: 1 },
          ],
          discount: {
            code: 'SAVE20',
            amount: 20,
          },
        },
      })

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-123',
        event: 'order.completed',
        properties: {
          orderId: 'order-789',
          total: 199.98,
          currency: 'USD',
          products: [
            { productId: 'prod-1', name: 'Widget', quantity: 2 },
            { productId: 'prod-2', name: 'Gadget', quantity: 1 },
          ],
          discount: {
            code: 'SAVE20',
            amount: 20,
          },
        },
        timestamp: undefined,
      })
    })
  })

  describe('provider.page', () => {
    it('should track a page view with all properties', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.page({
        name: 'Dashboard',
        category: 'App',
        url: 'https://app.example.com/dashboard',
        path: '/dashboard',
        referrer: 'https://google.com',
        properties: { section: 'overview' },
      })

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'anonymous',
        event: '$pageview',
        properties: {
          $current_url: 'https://app.example.com/dashboard',
          $pathname: '/dashboard',
          $referrer: 'https://google.com',
          page_name: 'Dashboard',
          page_category: 'App',
          section: 'overview',
        },
      })
    })

    it('should track a minimal page view', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.page({})

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'anonymous',
        event: '$pageview',
        properties: {
          $current_url: undefined,
          $pathname: undefined,
          $referrer: undefined,
          page_name: undefined,
          page_category: undefined,
        },
      })
    })

    it('should merge custom properties with page properties', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.page({
        name: 'Product Page',
        path: '/product/123',
        properties: {
          productId: 'prod-123',
          variant: 'A',
        },
      })

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'anonymous',
        event: '$pageview',
        properties: {
          $current_url: undefined,
          $pathname: '/product/123',
          $referrer: undefined,
          page_name: 'Product Page',
          page_category: undefined,
          productId: 'prod-123',
          variant: 'A',
        },
      })
    })
  })

  describe('provider.group', () => {
    it('should identify a group with traits', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.group?.('org-123', {
        name: 'Acme Corporation',
        plan: 'enterprise',
        seats: 50,
      })

      expect(mockGroupIdentify).toHaveBeenCalledWith({
        groupType: 'company',
        groupKey: 'org-123',
        properties: {
          name: 'Acme Corporation',
          plan: 'enterprise',
          seats: 50,
        },
      })
    })

    it('should identify a group without traits', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.group?.('org-456')

      expect(mockGroupIdentify).toHaveBeenCalledWith({
        groupType: 'company',
        groupKey: 'org-456',
        properties: undefined,
      })
    })
  })

  describe('provider.reset', () => {
    it('should resolve without error', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await expect(provider.reset?.()).resolves.toBeUndefined()
    })
  })

  describe('provider.flush', () => {
    it('should flush the client', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.flush?.()

      expect(mockFlush).toHaveBeenCalled()
    })
  })

  describe('shutdown', () => {
    it('should shutdown the PostHog client', async () => {
      const { shutdown } = await import('../index.js')

      await shutdown()

      expect(mockShutdown).toHaveBeenCalled()
    })
  })

  describe('createClient (deprecated)', () => {
    it('should create a raw PostHog client with explicit parameters', async () => {
      const { PostHog } = await import('posthog-node')
      const { createClient } = await import('../index.js')

      createClient('explicit-key', 'https://explicit.posthog.com')

      expect(PostHog).toHaveBeenCalledWith('explicit-key', {
        host: 'https://explicit.posthog.com',
      })
    })

    it('should create a raw PostHog client with environment variables', async () => {
      process.env.POSTHOG_API_KEY = 'env-key'
      process.env.POSTHOG_HOST = 'https://env.posthog.com'

      const { PostHog } = await import('posthog-node')
      const { createClient } = await import('../index.js')

      createClient()

      expect(PostHog).toHaveBeenCalledWith('env-key', {
        host: 'https://env.posthog.com',
      })
    })

    it('should use defaults when no parameters or env vars provided', async () => {
      const { PostHog } = await import('posthog-node')
      const { createClient } = await import('../index.js')

      createClient()

      expect(PostHog).toHaveBeenCalledWith('', {
        host: 'https://app.posthog.com',
      })
    })
  })

  describe('AnalyticsProvider interface compliance', () => {
    it('should implement all required methods', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      // Required methods
      expect(typeof provider.identify).toBe('function')
      expect(typeof provider.track).toBe('function')
      expect(typeof provider.page).toBe('function')

      // Optional methods
      expect(typeof provider.group).toBe('function')
      expect(typeof provider.reset).toBe('function')
      expect(typeof provider.flush).toBe('function')
    })

    it('should return promises from all methods', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      const identifyResult = provider.identify({ userId: 'test' })
      const trackResult = provider.track({ name: 'test' })
      const pageResult = provider.page({})
      const groupResult = provider.group?.('test')
      const resetResult = provider.reset?.()
      const flushResult = provider.flush?.()

      expect(identifyResult).toBeInstanceOf(Promise)
      expect(trackResult).toBeInstanceOf(Promise)
      expect(pageResult).toBeInstanceOf(Promise)
      expect(groupResult).toBeInstanceOf(Promise)
      expect(resetResult).toBeInstanceOf(Promise)
      expect(flushResult).toBeInstanceOf(Promise)
    })
  })

  describe('real-world usage scenarios', () => {
    it('should handle user signup flow', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      // User views signup page
      await provider.page({
        name: 'Signup',
        category: 'Auth',
        path: '/signup',
      })

      // User completes signup
      await provider.identify({
        userId: 'new-user-123',
        email: 'newuser@example.com',
        name: 'New User',
        traits: {
          signupSource: 'organic',
          signupDate: '2024-01-01',
        },
      })

      await provider.track({
        name: 'user.signed_up',
        userId: 'new-user-123',
        properties: {
          plan: 'free',
          referralCode: null,
        },
      })

      expect(mockCapture).toHaveBeenCalledTimes(2) // page + track
      expect(mockIdentify).toHaveBeenCalledTimes(1)
    })

    it('should handle e-commerce purchase flow', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      // Track product view
      await provider.track({
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
      await provider.track({
        name: 'product.added_to_cart',
        userId: 'user-123',
        properties: {
          productId: 'prod-456',
          quantity: 2,
          cartTotal: 199.98,
        },
      })

      // Track purchase completed
      await provider.track({
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

      expect(mockCapture).toHaveBeenCalledTimes(3)
    })

    it('should handle user logout and session reset', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      // Track logout event
      await provider.track({
        name: 'user.logged_out',
        userId: 'user-123',
      })

      // Flush any pending events
      await provider.flush?.()

      // Reset analytics state
      await provider.reset?.()

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-123',
        event: 'user.logged_out',
        properties: undefined,
        timestamp: undefined,
      })
      expect(mockFlush).toHaveBeenCalled()
    })

    it('should handle team/organization tracking', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      // Identify user
      await provider.identify({
        userId: 'user-123',
        email: 'user@company.com',
        name: 'Team Member',
      })

      // Associate with organization
      await provider.group?.('org-456', {
        name: 'Acme Corporation',
        plan: 'enterprise',
        seats: 50,
        industry: 'Technology',
      })

      // Track team action
      await provider.track({
        name: 'team.member_invited',
        userId: 'user-123',
        properties: {
          organizationId: 'org-456',
          inviteeEmail: 'newmember@company.com',
        },
      })

      expect(mockIdentify).toHaveBeenCalled()
      expect(mockGroupIdentify).toHaveBeenCalledWith({
        groupType: 'company',
        groupKey: 'org-456',
        properties: {
          name: 'Acme Corporation',
          plan: 'enterprise',
          seats: 50,
          industry: 'Technology',
        },
      })
      expect(mockCapture).toHaveBeenCalled()
    })

    it('should handle feature flag evaluation tracking', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      // Track feature flag evaluation
      await provider.track({
        name: '$feature_flag_called',
        userId: 'user-123',
        properties: {
          $feature_flag: 'new-checkout-flow',
          $feature_flag_response: true,
        },
      })

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-123',
        event: '$feature_flag_called',
        properties: {
          $feature_flag: 'new-checkout-flow',
          $feature_flag_response: true,
        },
        timestamp: undefined,
      })
    })
  })

  describe('edge cases', () => {
    it('should handle empty properties object', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.track({
        name: 'test.event',
        userId: 'user-123',
        properties: {},
      })

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-123',
        event: 'test.event',
        properties: {},
        timestamp: undefined,
      })
    })

    it('should handle empty traits object', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.identify({
        userId: 'user-123',
        traits: {},
      })

      expect(mockIdentify).toHaveBeenCalledWith({
        distinctId: 'user-123',
        properties: {
          email: undefined,
          name: undefined,
        },
      })
    })

    it('should handle special characters in event names', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.track({
        name: 'User Clicked "Buy Now" Button!',
        userId: 'user-123',
      })

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-123',
        event: 'User Clicked "Buy Now" Button!',
        properties: undefined,
        timestamp: undefined,
      })
    })

    it('should handle unicode in properties', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.identify({
        userId: 'user-123',
        name: 'Test',
        traits: {
          location: 'Tokyo',
          greeting: 'Hello!',
        },
      })

      expect(mockIdentify).toHaveBeenCalledWith({
        distinctId: 'user-123',
        properties: {
          email: undefined,
          name: 'Test',
          location: 'Tokyo',
          greeting: 'Hello!',
        },
      })
    })

    it('should handle very long event names', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      const longEventName = 'a'.repeat(1000)
      await provider.track({
        name: longEventName,
        userId: 'user-123',
      })

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-123',
        event: longEventName,
        properties: undefined,
        timestamp: undefined,
      })
    })

    it('should handle null values in properties', async () => {
      const { createProvider } = await import('../index.js')
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.track({
        name: 'test.event',
        userId: 'user-123',
        properties: {
          nullValue: null,
          undefinedValue: undefined,
          emptyString: '',
          zero: 0,
          falseValue: false,
        },
      })

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-123',
        event: 'test.event',
        properties: {
          nullValue: null,
          undefinedValue: undefined,
          emptyString: '',
          zero: 0,
          falseValue: false,
        },
        timestamp: undefined,
      })
    })
  })

  describe('configuration options', () => {
    it('should use custom flushAt value', async () => {
      const { PostHog } = await import('posthog-node')
      const { createProvider } = await import('../index.js')

      createProvider({
        apiKey: 'test-key',
        flushAt: 5,
      })

      expect(PostHog).toHaveBeenCalledWith('test-key', {
        host: 'https://app.posthog.com',
        flushAt: 5,
        flushInterval: 10000,
      })
    })

    it('should use custom flushInterval value', async () => {
      const { PostHog } = await import('posthog-node')
      const { createProvider } = await import('../index.js')

      createProvider({
        apiKey: 'test-key',
        flushInterval: 2000,
      })

      expect(PostHog).toHaveBeenCalledWith('test-key', {
        host: 'https://app.posthog.com',
        flushAt: 20,
        flushInterval: 2000,
      })
    })

    it('should use custom host value', async () => {
      const { PostHog } = await import('posthog-node')
      const { createProvider } = await import('../index.js')

      createProvider({
        apiKey: 'test-key',
        host: 'https://eu.posthog.com',
      })

      expect(PostHog).toHaveBeenCalledWith('test-key', {
        host: 'https://eu.posthog.com',
        flushAt: 20,
        flushInterval: 10000,
      })
    })
  })
})
