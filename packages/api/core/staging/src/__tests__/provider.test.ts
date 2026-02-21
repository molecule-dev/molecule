import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { StagingDriver } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider

function createMockDriver(name: string = 'test'): StagingDriver {
  return {
    name,
    checkPrerequisites: vi.fn(() => Promise.resolve({ met: true, missing: [] })),
    up: vi.fn(() =>
      Promise.resolve({ api: 'http://localhost:4001', app: 'http://localhost:5174' }),
    ),
    down: vi.fn(() => Promise.resolve()),
    health: vi.fn(() => Promise.resolve({ healthy: true })),
    logs: vi.fn(() => Promise.resolve({ lines: [], service: 'all' as const })),
    list: vi.fn(() => Promise.resolve([])),
  }
}

describe('staging provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
  })

  describe('provider management', () => {
    it('should return null when no provider is set', () => {
      expect(getProvider()).toBeNull()
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockDriver = createMockDriver()
      setProvider(mockDriver)
      expect(getProvider()).toBe(mockDriver)
      expect(hasProvider()).toBe(true)
    })

    it('should replace existing provider', () => {
      const first = createMockDriver('first')
      const second = createMockDriver('second')
      setProvider(first)
      setProvider(second)
      expect(getProvider()?.name).toBe('second')
    })
  })
})
