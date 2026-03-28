import { beforeEach, describe, expect, it } from 'vitest'

import { configure, reset } from '@molecule/api-bond'

import { getProvider, hasProvider, requireProvider, setProvider } from '../provider.js'
import type { ContentModerationProvider } from '../types.js'

// ---------------------------------------------------------------------------
// Mock provider
// ---------------------------------------------------------------------------

const mockProvider: ContentModerationProvider = {
  name: 'test-moderation',
  async check() {
    return { flagged: false, categories: [] }
  },
  async checkImage() {
    return { flagged: false, categories: [] }
  },
  async report(input) {
    return {
      id: 'r1',
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      reporterId: input.reporterId,
      reason: input.reason,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
  async getReports() {
    return { data: [], total: 0, limit: 20, offset: 0 }
  },
  async resolveReport() {
    // no-op
  },
}

const alternateProvider: ContentModerationProvider = {
  name: 'alternate-moderation',
  async check() {
    return { flagged: true, categories: [{ category: 'spam', flagged: true, score: 0.95 }] }
  },
  async checkImage() {
    return { flagged: true, categories: [{ category: 'violence', flagged: true, score: 0.8 }] }
  },
  async report(input) {
    return {
      id: 'r2',
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      reporterId: input.reporterId,
      reason: input.reason,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },
  async getReports() {
    return { data: [], total: 0, limit: 20, offset: 0 }
  },
  async resolveReport() {
    // no-op
  },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Content moderation provider bond', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  // -------------------------------------------------------------------------
  // setProvider
  // -------------------------------------------------------------------------

  describe('setProvider', () => {
    it('registers a provider', () => {
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('overwrites a previous provider', () => {
      setProvider(mockProvider)
      setProvider(alternateProvider)
      expect(getProvider()).toBe(alternateProvider)
    })
  })

  // -------------------------------------------------------------------------
  // getProvider
  // -------------------------------------------------------------------------

  describe('getProvider', () => {
    it('returns null when no provider is bonded', () => {
      expect(getProvider()).toBeNull()
    })

    it('returns the bonded provider', () => {
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })
  })

  // -------------------------------------------------------------------------
  // hasProvider
  // -------------------------------------------------------------------------

  describe('hasProvider', () => {
    it('returns false when no provider is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('returns true when a provider is bonded', () => {
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // requireProvider
  // -------------------------------------------------------------------------

  describe('requireProvider', () => {
    it('returns the bonded provider', () => {
      setProvider(mockProvider)
      expect(requireProvider()).toBe(mockProvider)
    })

    it('throws when no provider is bonded', () => {
      expect(() => requireProvider()).toThrow(/not configured/)
    })
  })

  // -------------------------------------------------------------------------
  // Provider conformance
  // -------------------------------------------------------------------------

  describe('provider conformance', () => {
    it('check returns a moderation result', async () => {
      setProvider(mockProvider)
      const provider = requireProvider()
      const result = await provider.check('hello world')
      expect(result).toEqual({ flagged: false, categories: [] })
    })

    it('checkImage returns a moderation result', async () => {
      setProvider(mockProvider)
      const provider = requireProvider()
      const result = await provider.checkImage(new Uint8Array([1, 2, 3]))
      expect(result).toEqual({ flagged: false, categories: [] })
    })

    it('report creates and returns a report', async () => {
      setProvider(mockProvider)
      const provider = requireProvider()
      const report = await provider.report({
        resourceType: 'comment',
        resourceId: 'c1',
        reporterId: 'user-1',
        reason: 'spam',
      })
      expect(report.id).toBe('r1')
      expect(report.resourceType).toBe('comment')
      expect(report.status).toBe('pending')
    })

    it('getReports returns paginated results', async () => {
      setProvider(mockProvider)
      const provider = requireProvider()
      const result = await provider.getReports()
      expect(result).toEqual({ data: [], total: 0, limit: 20, offset: 0 })
    })

    it('resolveReport completes without error', async () => {
      setProvider(mockProvider)
      const provider = requireProvider()
      await expect(
        provider.resolveReport('r1', { action: 'approve', resolvedBy: 'mod-1' }),
      ).resolves.toBeUndefined()
    })

    it('alternate provider flags content', async () => {
      setProvider(alternateProvider)
      const provider = requireProvider()
      const result = await provider.check('bad content')
      expect(result.flagged).toBe(true)
      expect(result.categories).toHaveLength(1)
      expect(result.categories[0].category).toBe('spam')
      expect(result.categories[0].score).toBe(0.95)
    })
  })
})
