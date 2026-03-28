import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type {
  ComplianceProvider,
  ConsentRecord,
  DeletionResult,
  ProcessingLogEntry,
  UserDataExport,
} from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let exportUserData: typeof ProviderModule.exportUserData
let deleteUserData: typeof ProviderModule.deleteUserData
let getConsent: typeof ProviderModule.getConsent
let setConsent: typeof ProviderModule.setConsent
let getDataProcessingLog: typeof ProviderModule.getDataProcessingLog

const mockExport: UserDataExport = {
  userId: 'user-1',
  exportedAt: new Date('2026-01-01'),
  format: 'json',
  data: { profile: { name: 'Test' } },
  categories: ['profile'],
}

const mockDeletionResult: DeletionResult = {
  userId: 'user-1',
  status: 'completed',
  deletedCategories: ['profile', 'activity'],
  retainedCategories: ['billing'],
  requestedAt: new Date('2026-01-01'),
  completedAt: new Date('2026-01-01'),
}

const mockConsentRecord: ConsentRecord = {
  userId: 'user-1',
  consents: [
    { purpose: 'marketing', granted: true, updatedAt: new Date('2026-01-01') },
    {
      purpose: 'analytics',
      granted: false,
      updatedAt: new Date('2026-01-01'),
      legalBasis: 'consent',
    },
  ],
  updatedAt: new Date('2026-01-01'),
}

const mockProcessingLog: ProcessingLogEntry[] = [
  {
    id: 'log-1',
    userId: 'user-1',
    activity: 'profile export',
    category: 'profile',
    legalBasis: 'consent',
    processor: 'export-service',
    timestamp: new Date('2026-01-01'),
  },
]

const makeMockProvider = (overrides?: Partial<ComplianceProvider>): ComplianceProvider => ({
  exportUserData: vi.fn().mockResolvedValue(mockExport),
  deleteUserData: vi.fn().mockResolvedValue(mockDeletionResult),
  getConsent: vi.fn().mockResolvedValue(mockConsentRecord),
  setConsent: vi.fn().mockResolvedValue(undefined),
  getDataProcessingLog: vi.fn().mockResolvedValue(mockProcessingLog),
  ...overrides,
})

describe('compliance provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    exportUserData = providerModule.exportUserData
    deleteUserData = providerModule.deleteUserData
    getConsent = providerModule.getConsent
    setConsent = providerModule.setConsent
    getDataProcessingLog = providerModule.getDataProcessingLog
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Compliance provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = makeMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      setProvider(makeMockProvider())
      expect(hasProvider()).toBe(true)
    })
  })

  describe('exportUserData', () => {
    it('should throw when no provider is set', async () => {
      await expect(exportUserData('user-1')).rejects.toThrow('Compliance provider not configured')
    })

    it('should delegate to provider exportUserData', async () => {
      const mockFn = vi.fn().mockResolvedValue(mockExport)
      setProvider(makeMockProvider({ exportUserData: mockFn }))

      const result = await exportUserData('user-1', 'json')

      expect(mockFn).toHaveBeenCalledWith('user-1', 'json')
      expect(result).toBe(mockExport)
    })

    it('should delegate without format parameter', async () => {
      const mockFn = vi.fn().mockResolvedValue(mockExport)
      setProvider(makeMockProvider({ exportUserData: mockFn }))

      const result = await exportUserData('user-1')

      expect(mockFn).toHaveBeenCalledWith('user-1', undefined)
      expect(result).toBe(mockExport)
    })
  })

  describe('deleteUserData', () => {
    it('should throw when no provider is set', async () => {
      await expect(deleteUserData('user-1')).rejects.toThrow('Compliance provider not configured')
    })

    it('should delegate to provider deleteUserData with options', async () => {
      const mockFn = vi.fn().mockResolvedValue(mockDeletionResult)
      setProvider(makeMockProvider({ deleteUserData: mockFn }))

      const options = { categories: ['profile' as const], retainLegalObligations: true }
      const result = await deleteUserData('user-1', options)

      expect(mockFn).toHaveBeenCalledWith('user-1', options)
      expect(result).toBe(mockDeletionResult)
    })

    it('should delegate without options', async () => {
      const mockFn = vi.fn().mockResolvedValue(mockDeletionResult)
      setProvider(makeMockProvider({ deleteUserData: mockFn }))

      const result = await deleteUserData('user-1')

      expect(mockFn).toHaveBeenCalledWith('user-1', undefined)
      expect(result).toBe(mockDeletionResult)
    })
  })

  describe('getConsent', () => {
    it('should throw when no provider is set', async () => {
      await expect(getConsent('user-1')).rejects.toThrow('Compliance provider not configured')
    })

    it('should delegate to provider getConsent', async () => {
      const mockFn = vi.fn().mockResolvedValue(mockConsentRecord)
      setProvider(makeMockProvider({ getConsent: mockFn }))

      const result = await getConsent('user-1')

      expect(mockFn).toHaveBeenCalledWith('user-1')
      expect(result).toBe(mockConsentRecord)
    })
  })

  describe('setConsent', () => {
    it('should throw when no provider is set', async () => {
      await expect(setConsent('user-1', { purpose: 'marketing', granted: true })).rejects.toThrow(
        'Compliance provider not configured',
      )
    })

    it('should delegate to provider setConsent', async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined)
      setProvider(makeMockProvider({ setConsent: mockFn }))

      const consent = { purpose: 'marketing', granted: false, legalBasis: 'consent' as const }
      await setConsent('user-1', consent)

      expect(mockFn).toHaveBeenCalledWith('user-1', consent)
    })
  })

  describe('getDataProcessingLog', () => {
    it('should throw when no provider is set', async () => {
      await expect(getDataProcessingLog('user-1')).rejects.toThrow(
        'Compliance provider not configured',
      )
    })

    it('should delegate to provider getDataProcessingLog', async () => {
      const mockFn = vi.fn().mockResolvedValue(mockProcessingLog)
      setProvider(makeMockProvider({ getDataProcessingLog: mockFn }))

      const result = await getDataProcessingLog('user-1')

      expect(mockFn).toHaveBeenCalledWith('user-1')
      expect(result).toBe(mockProcessingLog)
    })

    it('should return empty array when no logs exist', async () => {
      const mockFn = vi.fn().mockResolvedValue([])
      setProvider(makeMockProvider({ getDataProcessingLog: mockFn }))

      const result = await getDataProcessingLog('user-2')

      expect(mockFn).toHaveBeenCalledWith('user-2')
      expect(result).toEqual([])
    })
  })
})
