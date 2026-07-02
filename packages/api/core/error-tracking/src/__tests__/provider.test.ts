import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { ErrorTrackingContext, ErrorTrackingProvider, ErrorTrackingUser } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let getOptionalProvider: typeof ProviderModule.getOptionalProvider

function createMockProvider(overrides?: Partial<ErrorTrackingProvider>): ErrorTrackingProvider {
  return {
    captureException: vi.fn().mockReturnValue('event-1'),
    captureMessage: vi.fn().mockReturnValue('event-2'),
    setUser: vi.fn(),
    flush: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
}

describe('error tracking provider accessor', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    getOptionalProvider = providerModule.getOptionalProvider
  })

  it('throws when no provider is set', () => {
    expect(() => getProvider()).toThrow(
      'Error tracking provider not configured. Call setProvider() first.',
    )
  })

  it('reports no provider via hasProvider', () => {
    expect(hasProvider()).toBe(false)
  })

  it('returns null from getOptionalProvider when unbonded (the never-throw accessor)', () => {
    expect(getOptionalProvider()).toBeNull()
  })

  it('sets and gets the provider', () => {
    const mockProvider = createMockProvider()
    setProvider(mockProvider)
    expect(getProvider()).toBe(mockProvider)
    expect(getOptionalProvider()).toBe(mockProvider)
    expect(hasProvider()).toBe(true)
  })
})

describe('error tracking types', () => {
  it('exports ErrorTrackingProvider with optional setUser/flush', () => {
    // A minimal provider — only the two capture methods are required.
    const minimal: ErrorTrackingProvider = {
      captureException: () => undefined,
      captureMessage: () => undefined,
    }
    expect(minimal.setUser).toBeUndefined()
    expect(minimal.flush).toBeUndefined()
  })

  it('exports the normalized context shape (tags/user/extra/request)', () => {
    const user: ErrorTrackingUser = {
      id: 'user-1',
      email: 'a@example.com',
      username: 'alice',
      ipAddress: '203.0.113.7',
    }
    const context: ErrorTrackingContext = {
      tags: { source: 'express', attempt: 2, retried: true },
      user,
      extra: { orderId: 'order-1' },
      request: { method: 'POST', url: '/api/orders?draft=true', query: { draft: 'true' } },
    }
    expect(context.tags?.source).toBe('express')
    expect(context.user?.ipAddress).toBe('203.0.113.7')
    expect(context.request?.method).toBe('POST')
  })
})
