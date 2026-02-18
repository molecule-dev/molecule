/**
 * Tests for the Mixpanel analytics provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Use vi.hoisted() to ensure mocks are available before vi.mock() runs
const { mockPeopleSet, mockTrack, mockGroupsSet } = vi.hoisted(() => ({
  mockPeopleSet: vi.fn(),
  mockTrack: vi.fn(),
  mockGroupsSet: vi.fn(),
}))

// Mock the mixpanel module before importing the provider
vi.mock('mixpanel', () => ({
  default: {
    init: vi.fn(() => ({
      people: {
        set: mockPeopleSet,
      },
      track: mockTrack,
      groups: {
        set: mockGroupsSet,
      },
    })),
  },
}))

import Mixpanel from 'mixpanel'

import { createProvider } from '../provider.js'
import type { AnalyticsEvent, AnalyticsPageView, AnalyticsUserProps } from '../types.js'

describe('Mixpanel Analytics Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variable
    delete process.env.MIXPANEL_TOKEN
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createProvider', () => {
    it('should create a provider with provided token', () => {
      const provider = createProvider({ token: 'test-token-123' })

      expect(Mixpanel.init).toHaveBeenCalledWith('test-token-123', { debug: false })
      expect(provider).toBeDefined()
      expect(typeof provider.identify).toBe('function')
      expect(typeof provider.track).toBe('function')
      expect(typeof provider.page).toBe('function')
      expect(typeof provider.group).toBe('function')
      expect(typeof provider.flush).toBe('function')
    })

    it('should create a provider with environment variable token', () => {
      process.env.MIXPANEL_TOKEN = 'env-token-456'
      const provider = createProvider()

      expect(Mixpanel.init).toHaveBeenCalledWith('env-token-456', { debug: false })
      expect(provider).toBeDefined()
    })

    it('should use empty string when no token is provided', () => {
      const provider = createProvider()

      expect(Mixpanel.init).toHaveBeenCalledWith('', { debug: false })
      expect(provider).toBeDefined()
    })

    it('should enable debug mode when specified', () => {
      const provider = createProvider({ token: 'test-token', debug: true })

      expect(Mixpanel.init).toHaveBeenCalledWith('test-token', { debug: true })
      expect(provider).toBeDefined()
    })

    it('should prefer provided token over environment variable', () => {
      process.env.MIXPANEL_TOKEN = 'env-token'
      const provider = createProvider({ token: 'provided-token' })

      expect(Mixpanel.init).toHaveBeenCalledWith('provided-token', { debug: false })
      expect(provider).toBeDefined()
    })
  })

  describe('identify', () => {
    it('should identify a user with userId', async () => {
      mockPeopleSet.mockImplementation((userId, props, callback) => {
        callback(null)
      })

      const provider = createProvider({ token: 'test-token' })
      const user: AnalyticsUserProps = {
        userId: 'user-123',
      }

      await provider.identify(user)

      expect(mockPeopleSet).toHaveBeenCalledWith(
        'user-123',
        {
          $email: undefined,
          $name: undefined,
        },
        expect.any(Function),
      )
    })

    it('should identify a user with all properties', async () => {
      mockPeopleSet.mockImplementation((userId, props, callback) => {
        callback(null)
      })

      const provider = createProvider({ token: 'test-token' })
      const user: AnalyticsUserProps = {
        userId: 'user-456',
        email: 'test@example.com',
        name: 'Test User',
        traits: {
          plan: 'premium',
          company: 'Acme Inc',
        },
      }

      await provider.identify(user)

      expect(mockPeopleSet).toHaveBeenCalledWith(
        'user-456',
        {
          $email: 'test@example.com',
          $name: 'Test User',
          plan: 'premium',
          company: 'Acme Inc',
        },
        expect.any(Function),
      )
    })

    it('should reject on error', async () => {
      const error = new Error('Mixpanel API error')
      mockPeopleSet.mockImplementation((userId, props, callback) => {
        callback(error)
      })

      const provider = createProvider({ token: 'test-token' })
      const user: AnalyticsUserProps = {
        userId: 'user-789',
      }

      await expect(provider.identify(user)).rejects.toThrow('Mixpanel API error')
    })
  })

  describe('track', () => {
    it('should track an event with userId', async () => {
      mockTrack.mockImplementation((name, props, callback) => {
        callback(null)
      })

      const provider = createProvider({ token: 'test-token' })
      const event: AnalyticsEvent = {
        name: 'button.clicked',
        userId: 'user-123',
      }

      await provider.track(event)

      expect(mockTrack).toHaveBeenCalledWith(
        'button.clicked',
        {
          distinct_id: 'user-123',
          time: undefined,
        },
        expect.any(Function),
      )
    })

    it('should track an event with anonymousId', async () => {
      mockTrack.mockImplementation((name, props, callback) => {
        callback(null)
      })

      const provider = createProvider({ token: 'test-token' })
      const event: AnalyticsEvent = {
        name: 'page.viewed',
        anonymousId: 'anon-456',
      }

      await provider.track(event)

      expect(mockTrack).toHaveBeenCalledWith(
        'page.viewed',
        {
          distinct_id: 'anon-456',
          time: undefined,
        },
        expect.any(Function),
      )
    })

    it('should prefer userId over anonymousId', async () => {
      mockTrack.mockImplementation((name, props, callback) => {
        callback(null)
      })

      const provider = createProvider({ token: 'test-token' })
      const event: AnalyticsEvent = {
        name: 'test.event',
        userId: 'user-123',
        anonymousId: 'anon-456',
      }

      await provider.track(event)

      expect(mockTrack).toHaveBeenCalledWith(
        'test.event',
        {
          distinct_id: 'user-123',
          time: undefined,
        },
        expect.any(Function),
      )
    })

    it('should track an event with properties', async () => {
      mockTrack.mockImplementation((name, props, callback) => {
        callback(null)
      })

      const provider = createProvider({ token: 'test-token' })
      const event: AnalyticsEvent = {
        name: 'purchase.completed',
        userId: 'user-123',
        properties: {
          amount: 99.99,
          currency: 'USD',
          productId: 'prod-789',
        },
      }

      await provider.track(event)

      expect(mockTrack).toHaveBeenCalledWith(
        'purchase.completed',
        {
          distinct_id: 'user-123',
          time: undefined,
          amount: 99.99,
          currency: 'USD',
          productId: 'prod-789',
        },
        expect.any(Function),
      )
    })

    it('should track an event with timestamp', async () => {
      mockTrack.mockImplementation((name, props, callback) => {
        callback(null)
      })

      const provider = createProvider({ token: 'test-token' })
      const timestamp = new Date('2024-01-15T10:30:00Z')
      const event: AnalyticsEvent = {
        name: 'user.signup',
        userId: 'user-123',
        timestamp,
      }

      await provider.track(event)

      expect(mockTrack).toHaveBeenCalledWith(
        'user.signup',
        {
          distinct_id: 'user-123',
          time: Math.floor(timestamp.getTime() / 1000),
        },
        expect.any(Function),
      )
    })

    it('should reject on error', async () => {
      const error = new Error('Track failed')
      mockTrack.mockImplementation((name, props, callback) => {
        callback(error)
      })

      const provider = createProvider({ token: 'test-token' })
      const event: AnalyticsEvent = {
        name: 'test.event',
        userId: 'user-123',
      }

      await expect(provider.track(event)).rejects.toThrow('Track failed')
    })
  })

  describe('page', () => {
    it('should track a page view with minimal data', async () => {
      mockTrack.mockImplementation((name, props, callback) => {
        callback(null)
      })

      const provider = createProvider({ token: 'test-token' })
      const pageView: AnalyticsPageView = {}

      await provider.page(pageView)

      expect(mockTrack).toHaveBeenCalledWith(
        'Page View',
        {
          page_name: undefined,
          page_category: undefined,
          page_url: undefined,
          page_path: undefined,
          page_referrer: undefined,
        },
        expect.any(Function),
      )
    })

    it('should track a page view with all properties', async () => {
      mockTrack.mockImplementation((name, props, callback) => {
        callback(null)
      })

      const provider = createProvider({ token: 'test-token' })
      const pageView: AnalyticsPageView = {
        name: 'Home Page',
        category: 'Marketing',
        url: 'https://example.com/home',
        path: '/home',
        referrer: 'https://google.com',
      }

      await provider.page(pageView)

      expect(mockTrack).toHaveBeenCalledWith(
        'Page View',
        {
          page_name: 'Home Page',
          page_category: 'Marketing',
          page_url: 'https://example.com/home',
          page_path: '/home',
          page_referrer: 'https://google.com',
        },
        expect.any(Function),
      )
    })

    it('should track a page view with additional properties', async () => {
      mockTrack.mockImplementation((name, props, callback) => {
        callback(null)
      })

      const provider = createProvider({ token: 'test-token' })
      const pageView: AnalyticsPageView = {
        name: 'Product Page',
        path: '/products/123',
        properties: {
          productId: '123',
          productName: 'Widget',
          price: 29.99,
        },
      }

      await provider.page(pageView)

      expect(mockTrack).toHaveBeenCalledWith(
        'Page View',
        {
          page_name: 'Product Page',
          page_category: undefined,
          page_url: undefined,
          page_path: '/products/123',
          page_referrer: undefined,
          productId: '123',
          productName: 'Widget',
          price: 29.99,
        },
        expect.any(Function),
      )
    })

    it('should reject on error', async () => {
      const error = new Error('Page track failed')
      mockTrack.mockImplementation((name, props, callback) => {
        callback(error)
      })

      const provider = createProvider({ token: 'test-token' })
      const pageView: AnalyticsPageView = {
        name: 'Test Page',
      }

      await expect(provider.page(pageView)).rejects.toThrow('Page track failed')
    })
  })

  describe('group', () => {
    it('should associate a user with a group', async () => {
      mockGroupsSet.mockImplementation((groupKey, groupId, traits, callback) => {
        callback(null)
      })

      const provider = createProvider({ token: 'test-token' })

      await provider.group!('company-123')

      expect(mockGroupsSet).toHaveBeenCalledWith('company', 'company-123', {}, expect.any(Function))
    })

    it('should associate a user with a group and traits', async () => {
      mockGroupsSet.mockImplementation((groupKey, groupId, traits, callback) => {
        callback(null)
      })

      const provider = createProvider({ token: 'test-token' })

      await provider.group!('company-456', {
        name: 'Acme Corporation',
        industry: 'Technology',
        employees: 500,
      })

      expect(mockGroupsSet).toHaveBeenCalledWith(
        'company',
        'company-456',
        {
          name: 'Acme Corporation',
          industry: 'Technology',
          employees: 500,
        },
        expect.any(Function),
      )
    })

    it('should reject on error', async () => {
      const error = new Error('Group set failed')
      mockGroupsSet.mockImplementation((groupKey, groupId, traits, callback) => {
        callback(error)
      })

      const provider = createProvider({ token: 'test-token' })

      await expect(provider.group!('company-789')).rejects.toThrow('Group set failed')
    })
  })

  describe('flush', () => {
    it('should resolve immediately (Mixpanel sends events immediately)', async () => {
      const provider = createProvider({ token: 'test-token' })

      await expect(provider.flush!()).resolves.toBeUndefined()
    })
  })
})

describe('Mixpanel instance', () => {
  it('should export mixpanel instance', async () => {
    // Import the mixpanel instance
    const { mixpanel } = await import('../mixpanel.js')

    expect(mixpanel).toBeDefined()
    expect(Mixpanel.init).toHaveBeenCalled()
  })
})

describe('Type exports', () => {
  it('should export all required types', async () => {
    // This test verifies that the types can be imported without errors
    const types = await import('../index.js')

    expect(types.createProvider).toBeDefined()
    expect(typeof types.createProvider).toBe('function')
    expect(types.mixpanel).toBeDefined()
  })
})
