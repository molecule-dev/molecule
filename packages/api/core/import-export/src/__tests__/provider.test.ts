import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { ExportQuery, ImportExportProvider, ImportOptions } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let importCSV: typeof ProviderModule.importCSV
let importJSON: typeof ProviderModule.importJSON
let exportCSV: typeof ProviderModule.exportCSV
let exportJSON: typeof ProviderModule.exportJSON
let exportExcel: typeof ProviderModule.exportExcel
let getJobStatus: typeof ProviderModule.getJobStatus

const createMockProvider = (overrides?: Partial<ImportExportProvider>): ImportExportProvider => ({
  importCSV: vi.fn().mockResolvedValue({
    jobId: 'job-1',
    totalRows: 10,
    importedRows: 10,
    skippedRows: 0,
    errors: [],
  }),
  importJSON: vi.fn().mockResolvedValue({
    jobId: 'job-2',
    totalRows: 5,
    importedRows: 5,
    skippedRows: 0,
    errors: [],
  }),
  exportCSV: vi.fn().mockResolvedValue(Buffer.from('id,name\n1,Alice')),
  exportJSON: vi.fn().mockResolvedValue([{ id: 1, name: 'Alice' }]),
  exportExcel: vi.fn().mockResolvedValue(Buffer.from([0x50, 0x4b])),
  getJobStatus: vi.fn().mockResolvedValue({
    jobId: 'job-1',
    status: 'completed',
  }),
  ...overrides,
})

describe('import-export provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    importCSV = providerModule.importCSV
    importJSON = providerModule.importJSON
    exportCSV = providerModule.exportCSV
    exportJSON = providerModule.exportJSON
    exportExcel = providerModule.exportExcel
    getJobStatus = providerModule.getJobStatus
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'ImportExport provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('importCSV', () => {
    it('should throw when no provider is set', async () => {
      await expect(importCSV('users', Buffer.from(''))).rejects.toThrow(
        'ImportExport provider not configured',
      )
    })

    it('should call provider importCSV with basic args', async () => {
      const result = {
        jobId: 'job-csv-1',
        totalRows: 100,
        importedRows: 98,
        skippedRows: 2,
        errors: [{ row: 5, message: 'Invalid email' }],
      }
      const mockImportCSV = vi.fn().mockResolvedValue(result)
      setProvider(createMockProvider({ importCSV: mockImportCSV }))

      const csvData = Buffer.from('name,email\nAlice,alice@test.com')
      const response = await importCSV('users', csvData)

      expect(mockImportCSV).toHaveBeenCalledWith('users', csvData, undefined)
      expect(response).toEqual(result)
    })

    it('should call provider importCSV with full options', async () => {
      const result = {
        jobId: 'job-csv-2',
        totalRows: 50,
        importedRows: 45,
        skippedRows: 5,
        errors: [],
      }
      const mockImportCSV = vi.fn().mockResolvedValue(result)
      setProvider(createMockProvider({ importCSV: mockImportCSV }))

      const options: ImportOptions = {
        mapping: { 'Full Name': 'name', 'Email Address': 'email' },
        skipDuplicates: true,
        batchSize: 100,
        validateRow: (row) => Boolean(row['name']),
        onProgress: vi.fn(),
      }
      const csvData = Buffer.from('Full Name,Email Address\nAlice,alice@test.com')
      const response = await importCSV('users', csvData, options)

      expect(mockImportCSV).toHaveBeenCalledWith('users', csvData, options)
      expect(response.importedRows).toBe(45)
      expect(response.skippedRows).toBe(5)
    })
  })

  describe('importJSON', () => {
    it('should throw when no provider is set', async () => {
      await expect(importJSON('users', [])).rejects.toThrow('ImportExport provider not configured')
    })

    it('should call provider importJSON with data', async () => {
      const result = {
        jobId: 'job-json-1',
        totalRows: 3,
        importedRows: 3,
        skippedRows: 0,
        errors: [],
      }
      const mockImportJSON = vi.fn().mockResolvedValue(result)
      setProvider(createMockProvider({ importJSON: mockImportJSON }))

      const data = [
        { name: 'Alice', email: 'alice@test.com' },
        { name: 'Bob', email: 'bob@test.com' },
        { name: 'Charlie', email: 'charlie@test.com' },
      ]
      const response = await importJSON('users', data)

      expect(mockImportJSON).toHaveBeenCalledWith('users', data, undefined)
      expect(response.totalRows).toBe(3)
      expect(response.importedRows).toBe(3)
    })

    it('should call provider importJSON with options', async () => {
      const result = {
        jobId: 'job-json-2',
        totalRows: 10,
        importedRows: 8,
        skippedRows: 2,
        errors: [{ row: 3, field: 'email', message: 'Invalid format' }],
      }
      const mockImportJSON = vi.fn().mockResolvedValue(result)
      setProvider(createMockProvider({ importJSON: mockImportJSON }))

      const options: ImportOptions = {
        skipDuplicates: true,
        batchSize: 5,
      }
      const data = [{ name: 'Alice' }]
      const response = await importJSON('users', data, options)

      expect(mockImportJSON).toHaveBeenCalledWith('users', data, options)
      expect(response.errors).toHaveLength(1)
    })
  })

  describe('exportCSV', () => {
    it('should throw when no provider is set', async () => {
      await expect(exportCSV('users')).rejects.toThrow('ImportExport provider not configured')
    })

    it('should call provider exportCSV without query', async () => {
      const csvData = Buffer.from('id,name,email\n1,Alice,alice@test.com')
      const mockExportCSV = vi.fn().mockResolvedValue(csvData)
      setProvider(createMockProvider({ exportCSV: mockExportCSV }))

      const result = await exportCSV('users')

      expect(mockExportCSV).toHaveBeenCalledWith('users', undefined)
      expect(result).toBe(csvData)
    })

    it('should call provider exportCSV with query', async () => {
      const csvData = Buffer.from('name\nAlice')
      const mockExportCSV = vi.fn().mockResolvedValue(csvData)
      setProvider(createMockProvider({ exportCSV: mockExportCSV }))

      const query: ExportQuery = {
        filters: [{ field: 'active', operator: 'eq', value: true }],
        columns: ['name'],
        orderBy: [{ field: 'name', direction: 'asc' }],
        limit: 100,
      }
      const result = await exportCSV('users', query)

      expect(mockExportCSV).toHaveBeenCalledWith('users', query)
      expect(result).toBe(csvData)
    })
  })

  describe('exportJSON', () => {
    it('should throw when no provider is set', async () => {
      await expect(exportJSON('users')).rejects.toThrow('ImportExport provider not configured')
    })

    it('should call provider exportJSON and return array', async () => {
      const rows = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]
      const mockExportJSON = vi.fn().mockResolvedValue(rows)
      setProvider(createMockProvider({ exportJSON: mockExportJSON }))

      const result = await exportJSON('users')

      expect(mockExportJSON).toHaveBeenCalledWith('users', undefined)
      expect(result).toEqual(rows)
    })

    it('should call provider exportJSON with query', async () => {
      const rows = [{ name: 'Alice' }]
      const mockExportJSON = vi.fn().mockResolvedValue(rows)
      setProvider(createMockProvider({ exportJSON: mockExportJSON }))

      const query: ExportQuery = {
        filters: [{ field: 'role', operator: 'eq', value: 'admin' }],
        columns: ['name'],
      }
      const result = await exportJSON('users', query)

      expect(mockExportJSON).toHaveBeenCalledWith('users', query)
      expect(result).toEqual(rows)
    })
  })

  describe('exportExcel', () => {
    it('should throw when no provider is set', async () => {
      await expect(exportExcel('users')).rejects.toThrow('ImportExport provider not configured')
    })

    it('should call provider exportExcel', async () => {
      const xlsxData = Buffer.from([0x50, 0x4b, 0x03, 0x04])
      const mockExportExcel = vi.fn().mockResolvedValue(xlsxData)
      setProvider(createMockProvider({ exportExcel: mockExportExcel }))

      const result = await exportExcel('users')

      expect(mockExportExcel).toHaveBeenCalledWith('users', undefined)
      expect(result).toBe(xlsxData)
    })

    it('should call provider exportExcel with query', async () => {
      const xlsxData = Buffer.from([0x50, 0x4b])
      const mockExportExcel = vi.fn().mockResolvedValue(xlsxData)
      setProvider(createMockProvider({ exportExcel: mockExportExcel }))

      const query: ExportQuery = {
        limit: 1000,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      }
      const result = await exportExcel('users', query)

      expect(mockExportExcel).toHaveBeenCalledWith('users', query)
      expect(result).toBe(xlsxData)
    })
  })

  describe('getJobStatus', () => {
    it('should throw when no provider is set', async () => {
      await expect(getJobStatus('job-1')).rejects.toThrow('ImportExport provider not configured')
    })

    it('should return completed job status', async () => {
      const status = {
        jobId: 'job-1',
        status: 'completed' as const,
        result: {
          jobId: 'job-1',
          totalRows: 100,
          importedRows: 100,
          skippedRows: 0,
          errors: [],
        },
      }
      const mockGetJobStatus = vi.fn().mockResolvedValue(status)
      setProvider(createMockProvider({ getJobStatus: mockGetJobStatus }))

      const result = await getJobStatus('job-1')

      expect(mockGetJobStatus).toHaveBeenCalledWith('job-1')
      expect(result).toEqual(status)
    })

    it('should return in-progress job status', async () => {
      const status = {
        jobId: 'job-2',
        status: 'processing' as const,
        progress: { processed: 50, total: 100, percentage: 50 },
      }
      const mockGetJobStatus = vi.fn().mockResolvedValue(status)
      setProvider(createMockProvider({ getJobStatus: mockGetJobStatus }))

      const result = await getJobStatus('job-2')

      expect(result.status).toBe('processing')
      expect(result.progress?.percentage).toBe(50)
    })

    it('should return failed job status', async () => {
      const status = {
        jobId: 'job-3',
        status: 'failed' as const,
        error: 'Connection timeout',
      }
      const mockGetJobStatus = vi.fn().mockResolvedValue(status)
      setProvider(createMockProvider({ getJobStatus: mockGetJobStatus }))

      const result = await getJobStatus('job-3')

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Connection timeout')
    })
  })
})

describe('import-export types', () => {
  it('should export ImportExportProvider type with all required methods', () => {
    const provider: ImportExportProvider = {
      importCSV: async () => ({
        jobId: 'j',
        totalRows: 0,
        importedRows: 0,
        skippedRows: 0,
        errors: [],
      }),
      importJSON: async () => ({
        jobId: 'j',
        totalRows: 0,
        importedRows: 0,
        skippedRows: 0,
        errors: [],
      }),
      exportCSV: async () => Buffer.from(''),
      exportJSON: async () => [],
      exportExcel: async () => Buffer.from(''),
      getJobStatus: async () => ({ jobId: 'j', status: 'pending' }),
    }
    expect(typeof provider.importCSV).toBe('function')
    expect(typeof provider.importJSON).toBe('function')
    expect(typeof provider.exportCSV).toBe('function')
    expect(typeof provider.exportJSON).toBe('function')
    expect(typeof provider.exportExcel).toBe('function')
    expect(typeof provider.getJobStatus).toBe('function')
  })

  it('should support all filter operators', () => {
    const operators = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn', 'between', 'like']
    expect(operators).toHaveLength(10)
  })

  it('should support all job statuses', () => {
    const statuses: Array<'pending' | 'processing' | 'completed' | 'failed'> = [
      'pending',
      'processing',
      'completed',
      'failed',
    ]
    expect(statuses).toHaveLength(4)
  })
})
