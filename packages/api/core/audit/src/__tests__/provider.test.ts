import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { AuditEntry, AuditProvider, AuditRecord, PaginatedResult } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let log: typeof ProviderModule.log
let query: typeof ProviderModule.query
let auditExport: typeof ProviderModule.auditExport

const makeEntry = (overrides?: Partial<AuditEntry>): AuditEntry => ({
  actor: 'user:1',
  action: 'create',
  resource: 'project',
  ...overrides,
})

const makeRecord = (overrides?: Partial<AuditRecord>): AuditRecord => ({
  id: 'rec-1',
  actor: 'user:1',
  action: 'create',
  resource: 'project',
  timestamp: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
})

const makePaginatedResult = (
  overrides?: Partial<PaginatedResult<AuditRecord>>,
): PaginatedResult<AuditRecord> => ({
  data: [makeRecord()],
  total: 1,
  page: 1,
  perPage: 20,
  totalPages: 1,
  ...overrides,
})

const makeMockProvider = (overrides?: Partial<AuditProvider>): AuditProvider => ({
  log: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue(makePaginatedResult()),
  export: vi.fn().mockResolvedValue(Buffer.from('[]')),
  ...overrides,
})

describe('audit provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    log = providerModule.log
    query = providerModule.query
    auditExport = providerModule.auditExport
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Audit provider not configured. Call setProvider() first.',
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

  describe('log', () => {
    it('should throw when no provider is set', async () => {
      await expect(log(makeEntry())).rejects.toThrow('Audit provider not configured')
    })

    it('should delegate to provider log', async () => {
      const mockLog = vi.fn().mockResolvedValue(undefined)
      setProvider(makeMockProvider({ log: mockLog }))

      const entry = makeEntry({ resourceId: 'proj-42', ip: '127.0.0.1' })
      await log(entry)

      expect(mockLog).toHaveBeenCalledWith(entry)
    })
  })

  describe('query', () => {
    it('should throw when no provider is set', async () => {
      await expect(query({ actor: 'user:1' })).rejects.toThrow('Audit provider not configured')
    })

    it('should delegate to provider query', async () => {
      const expected = makePaginatedResult()
      const mockQuery = vi.fn().mockResolvedValue(expected)
      setProvider(makeMockProvider({ query: mockQuery }))

      const options = { actor: 'user:1', page: 1, perPage: 10 }
      const result = await query(options)

      expect(mockQuery).toHaveBeenCalledWith(options)
      expect(result).toBe(expected)
    })
  })

  describe('auditExport', () => {
    it('should throw when no provider is set', async () => {
      await expect(auditExport({}, 'json')).rejects.toThrow('Audit provider not configured')
    })

    it('should delegate to provider export with json format', async () => {
      const buf = Buffer.from('[]')
      const mockExport = vi.fn().mockResolvedValue(buf)
      setProvider(makeMockProvider({ export: mockExport }))

      const options = { actor: 'user:1' }
      const result = await auditExport(options, 'json')

      expect(mockExport).toHaveBeenCalledWith(options, 'json')
      expect(result).toBe(buf)
    })

    it('should delegate to provider export with csv format', async () => {
      const buf = Buffer.from('id,actor')
      const mockExport = vi.fn().mockResolvedValue(buf)
      setProvider(makeMockProvider({ export: mockExport }))

      const result = await auditExport({}, 'csv')

      expect(mockExport).toHaveBeenCalledWith({}, 'csv')
      expect(result).toBe(buf)
    })
  })
})
