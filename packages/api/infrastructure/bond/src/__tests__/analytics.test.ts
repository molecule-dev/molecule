import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAnalytics } from '../analytics.js'
import { bond } from '../bond.js'
import { reset } from '../registry.js'

describe('getAnalytics()', () => {
  beforeEach(() => {
    reset()
  })

  it('returns an object with identify, track, and page methods', () => {
    const analytics = getAnalytics()
    expect(typeof analytics.identify).toBe('function')
    expect(typeof analytics.track).toBe('function')
    expect(typeof analytics.page).toBe('function')
  })

  it('no-ops when no analytics provider is bonded', async () => {
    const analytics = getAnalytics()

    // Should not throw
    await analytics.identify({ userId: 'test' })
    await analytics.track({ name: 'test.event' })
    await analytics.page({ path: '/test' })
  })

  it('delegates to bonded provider', async () => {
    const mockProvider = {
      identify: vi.fn().mockResolvedValue(undefined),
      track: vi.fn().mockResolvedValue(undefined),
      page: vi.fn().mockResolvedValue(undefined),
    }

    bond('analytics', mockProvider)

    const analytics = getAnalytics()

    await analytics.identify({ userId: '123', email: 'test@example.com' })
    expect(mockProvider.identify).toHaveBeenCalledWith({ userId: '123', email: 'test@example.com' })

    await analytics.track({ name: 'user.login', userId: '123' })
    expect(mockProvider.track).toHaveBeenCalledWith({ name: 'user.login', userId: '123' })

    await analytics.page({ path: '/dashboard', url: '/dashboard' })
    expect(mockProvider.page).toHaveBeenCalledWith({ path: '/dashboard', url: '/dashboard' })
  })

  it('resolves lazily (bond after getAnalytics call)', async () => {
    const analytics = getAnalytics()

    // Initially no-ops
    await analytics.track({ name: 'before.bond' })

    // Bond a provider after getAnalytics was called
    const mockProvider = {
      identify: vi.fn().mockResolvedValue(undefined),
      track: vi.fn().mockResolvedValue(undefined),
      page: vi.fn().mockResolvedValue(undefined),
    }
    bond('analytics', mockProvider)

    // Now should delegate to the provider
    await analytics.track({ name: 'after.bond' })
    expect(mockProvider.track).toHaveBeenCalledWith({ name: 'after.bond' })
    expect(mockProvider.track).toHaveBeenCalledTimes(1)
  })
})
