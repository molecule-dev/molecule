import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ComplianceProvider, DataCategory } from '@molecule/api-compliance'

import { createProvider } from '../provider.js'
import type { DataCollector } from '../types.js'

describe('GDPR compliance provider', () => {
  let provider: ComplianceProvider

  beforeEach(() => {
    provider = createProvider()
  })

  describe('exportUserData', () => {
    it('should export user data with default settings', async () => {
      const result = await provider.exportUserData('user-1')

      expect(result.userId).toBe('user-1')
      expect(result.format).toBe('json')
      expect(result.exportedAt).toBeInstanceOf(Date)
      expect(result.categories).toEqual([
        'profile',
        'activity',
        'preferences',
        'communications',
        'billing',
        'analytics',
        'content',
        'authentication',
      ])
      expect(result.data).toBeDefined()
    })

    it('should export in the requested format', async () => {
      const result = await provider.exportUserData('user-1', 'csv')

      expect(result.format).toBe('csv')
    })

    it('should include consent data when available', async () => {
      await provider.setConsent('user-1', { purpose: 'marketing', granted: true })

      const result = await provider.exportUserData('user-1')

      expect(result.data['consents']).toBeDefined()
      expect(result.data['consents']).toHaveLength(1)
    })

    it('should use custom data collectors', async () => {
      const collector: DataCollector = {
        category: 'profile',
        collect: vi.fn().mockResolvedValue({ name: 'Test User', email: 'test@example.com' }),
      }

      const customProvider = createProvider({ dataCollectors: [collector] })
      const result = await customProvider.exportUserData('user-1')

      expect(collector.collect).toHaveBeenCalledWith('user-1')
      expect(result.data['profile']).toEqual({ name: 'Test User', email: 'test@example.com' })
    })

    it('should only collect data for configured categories', async () => {
      const profileCollector: DataCollector = {
        category: 'profile',
        collect: vi.fn().mockResolvedValue({ name: 'Test' }),
      }
      const billingCollector: DataCollector = {
        category: 'billing',
        collect: vi.fn().mockResolvedValue({ plan: 'pro' }),
      }

      const customProvider = createProvider({
        categories: ['profile'],
        dataCollectors: [profileCollector, billingCollector],
      })

      const result = await customProvider.exportUserData('user-1')

      expect(profileCollector.collect).toHaveBeenCalled()
      expect(billingCollector.collect).not.toHaveBeenCalled()
      expect(result.categories).toEqual(['profile'])
    })

    it('should record a processing log entry on export', async () => {
      await provider.exportUserData('user-1')

      const log = await provider.getDataProcessingLog('user-1')

      expect(log).toHaveLength(1)
      expect(log[0].activity).toBe('data_export')
      expect(log[0].userId).toBe('user-1')
    })
  })

  describe('deleteUserData', () => {
    /**
     * Builds a delete-capable collector backed by an in-memory store so tests
     * can prove the user's data is actually removed, not merely reported gone.
     *
     * @param category - The data category this collector owns.
     * @param store - The backing store keyed by userId.
     * @returns A collector whose `delete` removes the user's row from `store`.
     */
    const makeDeletingCollector = (
      category: DataCategory,
      store: Map<string, unknown>,
    ): DataCollector => ({
      category,
      collect: vi.fn(async (userId: string) => store.get(userId)),
      delete: vi.fn(async (userId: string) => {
        store.delete(userId)
      }),
    })

    it('should invoke the delete hook and actually remove the collector data', async () => {
      const store = new Map<string, unknown>([['user-1', { name: 'Test User' }]])
      const collector = makeDeletingCollector('profile', store)

      const customProvider = createProvider({
        categories: ['profile'],
        dataCollectors: [collector],
      })

      const result = await customProvider.deleteUserData('user-1', { categories: ['profile'] })

      expect(collector.delete).toHaveBeenCalledWith('user-1')
      expect(store.has('user-1')).toBe(false)
      expect(result.status).toBe('completed')
      expect(result.deletedCategories).toEqual(['profile'])
      expect(result.completedAt).toBeInstanceOf(Date)
    })

    it('should NOT report completed when a collector has no delete hook', async () => {
      const collector: DataCollector = {
        category: 'profile',
        collect: vi.fn(async () => ({ name: 'Test User' })),
        // no delete hook — this category cannot be erased
      }

      const customProvider = createProvider({
        categories: ['profile'],
        dataCollectors: [collector],
      })

      const result = await customProvider.deleteUserData('user-1', { categories: ['profile'] })

      expect(result.status).not.toBe('completed')
      expect(result.status).toBe('failed')
      expect(result.deletedCategories).not.toContain('profile')
      expect(result.deletedCategories).toEqual([])
      expect(result.completedAt).toBeUndefined()
    })

    it('should NOT report completed for a category with no collector at all', async () => {
      const result = await provider.deleteUserData('user-1', {
        categories: ['profile', 'activity'],
      })

      expect(result.status).toBe('failed')
      expect(result.deletedCategories).toEqual([])
    })

    it('should report partial when some categories erase and others cannot', async () => {
      const store = new Map<string, unknown>([['user-1', { name: 'Test User' }]])
      const profile = makeDeletingCollector('profile', store)
      const activity: DataCollector = {
        category: 'activity',
        collect: vi.fn(async () => []),
        // no delete hook
      }

      const customProvider = createProvider({
        categories: ['profile', 'activity'],
        dataCollectors: [profile, activity],
      })

      const result = await customProvider.deleteUserData('user-1', {
        categories: ['profile', 'activity'],
      })

      expect(result.status).toBe('partial')
      expect(result.deletedCategories).toEqual(['profile'])
      expect(result.deletedCategories).not.toContain('activity')
      expect(store.has('user-1')).toBe(false)
    })

    it('should reject (never claim success) when a delete hook throws', async () => {
      const boom: DataCollector = {
        category: 'profile',
        collect: vi.fn(),
        delete: vi.fn(async () => {
          throw new Error('data store unavailable')
        }),
      }

      const customProvider = createProvider({
        categories: ['profile'],
        dataCollectors: [boom],
      })

      await expect(
        customProvider.deleteUserData('user-1', { categories: ['profile'] }),
      ).rejects.toThrow('data store unavailable')
    })

    it('should retain legal obligation categories and report partial when only legal remain', async () => {
      const result = await provider.deleteUserData('user-1', { categories: ['billing'] })

      expect(result.status).toBe('partial')
      expect(result.retainedCategories).toContain('billing')
      expect(result.deletedCategories).not.toContain('billing')
      expect(result.deletedCategories).toEqual([])
    })

    it('should erase legal obligation categories when retainLegalObligations is false', async () => {
      const store = new Map<string, unknown>([['user-1', { plan: 'pro' }]])
      const billing = makeDeletingCollector('billing', store)

      const customProvider = createProvider({
        categories: ['billing'],
        dataCollectors: [billing],
      })

      const result = await customProvider.deleteUserData('user-1', {
        categories: ['billing'],
        retainLegalObligations: false,
      })

      expect(billing.delete).toHaveBeenCalledWith('user-1')
      expect(store.has('user-1')).toBe(false)
      expect(result.deletedCategories).toContain('billing')
      expect(result.retainedCategories).not.toContain('billing')
      expect(result.status).toBe('completed')
    })

    it('should support custom legal obligation categories', async () => {
      const customProvider = createProvider({
        legalObligationCategories: ['billing', 'authentication'],
      })

      const result = await customProvider.deleteUserData('user-1')

      expect(result.retainedCategories).toContain('billing')
      expect(result.retainedCategories).toContain('authentication')
    })

    it('should clear in-memory consent records when profile erasure is requested', async () => {
      await provider.setConsent('user-1', { purpose: 'marketing', granted: true })

      const consentBefore = await provider.getConsent('user-1')
      expect(consentBefore.consents).toHaveLength(1)

      await provider.deleteUserData('user-1', { categories: ['profile'] })

      const consentAfter = await provider.getConsent('user-1')
      expect(consentAfter.consents).toHaveLength(0)
    })

    it('should record a processing log entry when data is actually deleted', async () => {
      const store = new Map<string, unknown>([['user-1', {}]])
      const customProvider = createProvider({
        categories: ['activity'],
        dataCollectors: [makeDeletingCollector('activity', store)],
      })

      await customProvider.deleteUserData('user-1', { categories: ['activity'] })

      const log = await customProvider.getDataProcessingLog('user-1')

      expect(log.some((entry) => entry.activity === 'data_deletion')).toBe(true)
    })

    it('should not record a data_deletion log entry when nothing was erased', async () => {
      await provider.deleteUserData('user-1', { categories: ['activity'] })

      const log = await provider.getDataProcessingLog('user-1')

      expect(log.some((entry) => entry.activity === 'data_deletion')).toBe(false)
    })

    it('should return a well-formed result even when erasure could not complete', async () => {
      const result = await provider.deleteUserData('user-1', {
        categories: ['profile'],
        reason: 'User requested account deletion',
      })

      expect(result.userId).toBe('user-1')
      expect(result.requestedAt).toBeInstanceOf(Date)
      expect(result.status).not.toBe('completed')
    })
  })

  describe('getConsent', () => {
    it('should return empty consents for new user', async () => {
      const record = await provider.getConsent('user-1')

      expect(record.userId).toBe('user-1')
      expect(record.consents).toEqual([])
      expect(record.updatedAt).toBeInstanceOf(Date)
    })

    it('should return existing consents', async () => {
      await provider.setConsent('user-1', { purpose: 'marketing', granted: true })
      await provider.setConsent('user-1', { purpose: 'analytics', granted: false })

      const record = await provider.getConsent('user-1')

      expect(record.consents).toHaveLength(2)
      expect(record.consents[0].purpose).toBe('marketing')
      expect(record.consents[0].granted).toBe(true)
      expect(record.consents[1].purpose).toBe('analytics')
      expect(record.consents[1].granted).toBe(false)
    })

    it('should return the latest updatedAt across consents', async () => {
      await provider.setConsent('user-1', { purpose: 'marketing', granted: true })

      // Small delay to ensure different timestamps
      const beforeSecond = new Date()
      await provider.setConsent('user-1', { purpose: 'analytics', granted: false })

      const record = await provider.getConsent('user-1')

      expect(record.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeSecond.getTime())
    })
  })

  describe('setConsent', () => {
    it('should create a new consent entry', async () => {
      await provider.setConsent('user-1', { purpose: 'marketing', granted: true })

      const record = await provider.getConsent('user-1')

      expect(record.consents).toHaveLength(1)
      expect(record.consents[0].purpose).toBe('marketing')
      expect(record.consents[0].granted).toBe(true)
    })

    it('should update an existing consent entry', async () => {
      await provider.setConsent('user-1', { purpose: 'marketing', granted: true })
      await provider.setConsent('user-1', { purpose: 'marketing', granted: false })

      const record = await provider.getConsent('user-1')

      expect(record.consents).toHaveLength(1)
      expect(record.consents[0].granted).toBe(false)
    })

    it('should store legal basis when provided', async () => {
      await provider.setConsent('user-1', {
        purpose: 'marketing',
        granted: true,
        legalBasis: 'consent',
      })

      const record = await provider.getConsent('user-1')

      expect(record.consents[0].legalBasis).toBe('consent')
    })

    it('should record consent grant in processing log', async () => {
      await provider.setConsent('user-1', { purpose: 'marketing', granted: true })

      const log = await provider.getDataProcessingLog('user-1')

      expect(log).toHaveLength(1)
      expect(log[0].activity).toBe('consent_granted')
    })

    it('should record consent revocation in processing log', async () => {
      await provider.setConsent('user-1', { purpose: 'marketing', granted: false })

      const log = await provider.getDataProcessingLog('user-1')

      expect(log).toHaveLength(1)
      expect(log[0].activity).toBe('consent_revoked')
    })

    it('should manage consents independently per user', async () => {
      await provider.setConsent('user-1', { purpose: 'marketing', granted: true })
      await provider.setConsent('user-2', { purpose: 'marketing', granted: false })

      const record1 = await provider.getConsent('user-1')
      const record2 = await provider.getConsent('user-2')

      expect(record1.consents[0].granted).toBe(true)
      expect(record2.consents[0].granted).toBe(false)
    })
  })

  describe('getDataProcessingLog', () => {
    it('should return empty log for new user', async () => {
      const log = await provider.getDataProcessingLog('user-1')

      expect(log).toEqual([])
    })

    it('should accumulate log entries', async () => {
      const store = new Map<string, unknown>([['user-1', {}]])
      const customProvider = createProvider({
        categories: ['activity'],
        dataCollectors: [
          {
            category: 'activity',
            collect: vi.fn(async () => store.get('user-1')),
            delete: vi.fn(async () => {
              store.delete('user-1')
            }),
          },
        ],
      })

      await customProvider.setConsent('user-1', { purpose: 'marketing', granted: true })
      await customProvider.exportUserData('user-1')
      await customProvider.deleteUserData('user-1', { categories: ['activity'] })

      const log = await customProvider.getDataProcessingLog('user-1')

      expect(log.length).toBeGreaterThanOrEqual(3)
    })

    it('should have unique IDs for each log entry', async () => {
      await provider.setConsent('user-1', { purpose: 'marketing', granted: true })
      await provider.setConsent('user-1', { purpose: 'analytics', granted: false })

      const log = await provider.getDataProcessingLog('user-1')
      const ids = log.map((entry) => entry.id)

      expect(new Set(ids).size).toBe(ids.length)
    })

    it('should include correct processor name', async () => {
      await provider.setConsent('user-1', { purpose: 'marketing', granted: true })

      const log = await provider.getDataProcessingLog('user-1')

      expect(log[0].processor).toBe('gdpr-compliance-provider')
    })

    it('should use default legal basis', async () => {
      await provider.setConsent('user-1', { purpose: 'marketing', granted: true })

      const log = await provider.getDataProcessingLog('user-1')

      expect(log[0].legalBasis).toBe('consent')
    })

    it('should use custom default legal basis from config', async () => {
      const customProvider = createProvider({ defaultLegalBasis: 'legitimate_interests' })
      await customProvider.setConsent('user-1', { purpose: 'analytics', granted: true })

      const log = await customProvider.getDataProcessingLog('user-1')

      expect(log[0].legalBasis).toBe('legitimate_interests')
    })

    it('should isolate logs between users', async () => {
      await provider.setConsent('user-1', { purpose: 'marketing', granted: true })
      await provider.setConsent('user-2', { purpose: 'analytics', granted: false })

      const log1 = await provider.getDataProcessingLog('user-1')
      const log2 = await provider.getDataProcessingLog('user-2')

      expect(log1).toHaveLength(1)
      expect(log2).toHaveLength(1)
      expect(log1[0].userId).toBe('user-1')
      expect(log2[0].userId).toBe('user-2')
    })
  })

  describe('configuration', () => {
    it('should work with default configuration', () => {
      expect(() => createProvider()).not.toThrow()
    })

    it('should accept empty config', () => {
      expect(() => createProvider({})).not.toThrow()
    })

    it('should respect custom categories', async () => {
      const customProvider = createProvider({
        categories: ['profile', 'billing'],
      })

      const result = await customProvider.exportUserData('user-1')

      expect(result.categories).toEqual(['profile', 'billing'])
    })
  })

  describe('provider export', () => {
    it('should export a lazy provider instance', async () => {
      const { provider: lazyProvider } = await import('../provider.js')

      expect(lazyProvider).toBeDefined()
      expect(typeof lazyProvider.exportUserData).toBe('function')
      expect(typeof lazyProvider.deleteUserData).toBe('function')
      expect(typeof lazyProvider.getConsent).toBe('function')
      expect(typeof lazyProvider.setConsent).toBe('function')
      expect(typeof lazyProvider.getDataProcessingLog).toBe('function')
    })
  })
})
