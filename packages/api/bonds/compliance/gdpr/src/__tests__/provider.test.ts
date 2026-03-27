import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ComplianceProvider } from '@molecule/api-compliance'

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
    it('should delete all categories by default', async () => {
      const result = await provider.deleteUserData('user-1')

      expect(result.userId).toBe('user-1')
      expect(result.status).toBe('completed')
      expect(result.deletedCategories.length).toBeGreaterThan(0)
      expect(result.requestedAt).toBeInstanceOf(Date)
      expect(result.completedAt).toBeInstanceOf(Date)
    })

    it('should retain legal obligation categories by default', async () => {
      const result = await provider.deleteUserData('user-1')

      expect(result.retainedCategories).toContain('billing')
      expect(result.deletedCategories).not.toContain('billing')
    })

    it('should delete legal obligation categories when retainLegalObligations is false', async () => {
      const result = await provider.deleteUserData('user-1', {
        retainLegalObligations: false,
      })

      expect(result.deletedCategories).toContain('billing')
      expect(result.retainedCategories).not.toContain('billing')
    })

    it('should delete only specified categories', async () => {
      const result = await provider.deleteUserData('user-1', {
        categories: ['profile', 'activity'],
      })

      expect(result.deletedCategories).toEqual(['profile', 'activity'])
      expect(result.retainedCategories).toEqual([])
    })

    it('should return partial status when all requested categories are retained', async () => {
      const result = await provider.deleteUserData('user-1', {
        categories: ['billing'],
        retainLegalObligations: true,
      })

      expect(result.status).toBe('partial')
      expect(result.retainedCategories).toContain('billing')
      expect(result.deletedCategories).toEqual([])
    })

    it('should support custom legal obligation categories', async () => {
      const customProvider = createProvider({
        legalObligationCategories: ['billing', 'authentication'],
      })

      const result = await customProvider.deleteUserData('user-1')

      expect(result.retainedCategories).toContain('billing')
      expect(result.retainedCategories).toContain('authentication')
    })

    it('should clear consent records when profile is deleted', async () => {
      await provider.setConsent('user-1', { purpose: 'marketing', granted: true })

      const consentBefore = await provider.getConsent('user-1')
      expect(consentBefore.consents).toHaveLength(1)

      await provider.deleteUserData('user-1', { categories: ['profile'] })

      const consentAfter = await provider.getConsent('user-1')
      expect(consentAfter.consents).toHaveLength(0)
    })

    it('should record a processing log entry on deletion', async () => {
      await provider.deleteUserData('user-1')

      const log = await provider.getDataProcessingLog('user-1')

      expect(log.some((entry) => entry.activity === 'data_deletion')).toBe(true)
    })

    it('should include reason in deletion request', async () => {
      const result = await provider.deleteUserData('user-1', {
        reason: 'User requested account deletion',
      })

      expect(result.status).toBe('completed')
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
      await provider.setConsent('user-1', { purpose: 'marketing', granted: true })
      await provider.exportUserData('user-1')
      await provider.deleteUserData('user-1', { categories: ['activity'] })

      const log = await provider.getDataProcessingLog('user-1')

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
