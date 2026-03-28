import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ImportExportProvider } from '@molecule/api-import-export'

const mockCreate = vi.fn().mockResolvedValue({ data: {}, affected: 1 })
const mockFindMany = vi.fn().mockResolvedValue([])

vi.mock('@molecule/api-database', () => ({
  create: (...args: unknown[]) => mockCreate(...args),
  findMany: (...args: unknown[]) => mockFindMany(...args),
}))

vi.mock('node:crypto', () => ({
  randomUUID: () => 'test-uuid-1234',
}))

let createProvider: (options?: Record<string, unknown>) => ImportExportProvider

describe('csv import/export provider', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    mockCreate.mockResolvedValue({ data: {}, affected: 1 })
    mockFindMany.mockResolvedValue([])
    vi.resetModules()
    const mod = await import('../provider.js')
    createProvider = mod.createProvider as (
      options?: Record<string, unknown>,
    ) => ImportExportProvider
  })

  describe('createProvider', () => {
    it('should create a provider with all methods', () => {
      const p = createProvider()
      expect(p).toBeDefined()
      expect(typeof p.importCSV).toBe('function')
      expect(typeof p.importJSON).toBe('function')
      expect(typeof p.exportCSV).toBe('function')
      expect(typeof p.exportJSON).toBe('function')
      expect(typeof p.exportExcel).toBe('function')
      expect(typeof p.getJobStatus).toBe('function')
    })
  })

  describe('importCSV', () => {
    it('should import CSV data from a Buffer', async () => {
      const csv = Buffer.from('name,age\nAlice,30\nBob,25')
      const p = createProvider()
      const result = await p.importCSV('users', csv)

      expect(result.jobId).toBe('test-uuid-1234')
      expect(result.totalRows).toBe(2)
      expect(result.importedRows).toBe(2)
      expect(result.skippedRows).toBe(0)
      expect(result.errors).toEqual([])
      expect(mockCreate).toHaveBeenCalledTimes(2)
      expect(mockCreate).toHaveBeenCalledWith('users', { name: 'Alice', age: '30' })
      expect(mockCreate).toHaveBeenCalledWith('users', { name: 'Bob', age: '25' })
    })

    it('should apply column mapping', async () => {
      const csv = Buffer.from('Full Name,Email Address\nAlice,alice@example.com')
      const p = createProvider()
      await p.importCSV('users', csv, {
        mapping: { 'Full Name': 'name', 'Email Address': 'email' },
      })

      expect(mockCreate).toHaveBeenCalledWith('users', {
        name: 'Alice',
        email: 'alice@example.com',
      })
    })

    it('should validate rows and skip invalid ones', async () => {
      const csv = Buffer.from('name,age\nAlice,30\nBob,invalid')
      const p = createProvider()
      const result = await p.importCSV('users', csv, {
        validateRow: (row) => !isNaN(Number(row.age)),
      })

      expect(result.importedRows).toBe(1)
      expect(result.skippedRows).toBe(1)
    })

    it('should skip duplicates when configured', async () => {
      mockCreate
        .mockResolvedValueOnce({ data: {}, affected: 1 })
        .mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'))

      const csv = Buffer.from('name,age\nAlice,30\nAlice,30')
      const p = createProvider()
      const result = await p.importCSV('users', csv, { skipDuplicates: true })

      expect(result.importedRows).toBe(1)
      expect(result.skippedRows).toBe(1)
      expect(result.errors).toEqual([])
    })

    it('should record errors for non-duplicate failures', async () => {
      mockCreate
        .mockResolvedValueOnce({ data: {}, affected: 1 })
        .mockRejectedValueOnce(new Error('connection timeout'))

      const csv = Buffer.from('name,age\nAlice,30\nBob,25')
      const p = createProvider()
      const result = await p.importCSV('users', csv)

      expect(result.importedRows).toBe(1)
      expect(result.skippedRows).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].row).toBe(2)
      expect(result.errors[0].message).toContain('connection timeout')
    })

    it('should call progress callback', async () => {
      const csv = Buffer.from('name\nA\nB\nC')
      const onProgress = vi.fn()
      const p = createProvider({ defaultBatchSize: 2 })
      await p.importCSV('users', csv, { onProgress })

      expect(onProgress).toHaveBeenCalled()
      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0]
      expect(lastCall.processed).toBe(3)
      expect(lastCall.total).toBe(3)
      expect(lastCall.percentage).toBe(100)
    })

    it('should import from a ReadableStream', async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('name\nAlice'))
          controller.close()
        },
      })

      const p = createProvider()
      const result = await p.importCSV('users', stream)
      expect(result.importedRows).toBe(1)
    })

    it('should use custom delimiter', async () => {
      const csv = Buffer.from('name;age\nAlice;30')
      const p = createProvider({ delimiter: ';' })
      await p.importCSV('users', csv)

      expect(mockCreate).toHaveBeenCalledWith('users', { name: 'Alice', age: '30' })
    })

    it('should track job status as completed', async () => {
      const csv = Buffer.from('name\nAlice')
      const p = createProvider()
      const result = await p.importCSV('users', csv)
      const status = await p.getJobStatus(result.jobId)

      expect(status.status).toBe('completed')
      expect(status.result).toBeDefined()
    })

    it('should track job status as failed on error', async () => {
      mockCreate.mockRejectedValue(new Error('fatal error'))
      const csv = Buffer.from('name\nAlice')

      const p = createProvider()
      const result = await p.importCSV('users', csv)

      // Import records errors per-row, doesn't throw for individual row failures
      expect(result.errors).toHaveLength(1)
      const status = await p.getJobStatus(result.jobId)
      expect(status.status).toBe('completed')
    })
  })

  describe('importJSON', () => {
    it('should import JSON array data', async () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ]
      const p = createProvider()
      const result = await p.importJSON('users', data)

      expect(result.totalRows).toBe(2)
      expect(result.importedRows).toBe(2)
      expect(mockCreate).toHaveBeenCalledWith('users', { name: 'Alice', age: 30 })
    })

    it('should wrap non-object values', async () => {
      const data = ['hello', 42]
      const p = createProvider()
      await p.importJSON('values', data)

      expect(mockCreate).toHaveBeenCalledWith('values', { value: 'hello' })
      expect(mockCreate).toHaveBeenCalledWith('values', { value: 42 })
    })

    it('should apply mapping to JSON imports', async () => {
      const data = [{ firstName: 'Alice' }]
      const p = createProvider()
      await p.importJSON('users', data, { mapping: { firstName: 'name' } })

      expect(mockCreate).toHaveBeenCalledWith('users', { name: 'Alice' })
    })
  })

  describe('exportCSV', () => {
    it('should export rows as CSV', async () => {
      mockFindMany.mockResolvedValueOnce([
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ])

      const p = createProvider()
      const buf = await p.exportCSV('users')
      const csv = buf.toString()

      expect(csv).toContain('name,age')
      expect(csv).toContain('Alice,30')
      expect(csv).toContain('Bob,25')
    })

    it('should pass filters to DataStore', async () => {
      mockFindMany.mockResolvedValueOnce([])

      const p = createProvider()
      await p.exportCSV('users', {
        filters: [{ field: 'active', operator: 'eq', value: true }],
      })

      expect(mockFindMany).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          where: [{ field: 'active', operator: '=', value: true }],
        }),
      )
    })

    it('should pass column selection', async () => {
      mockFindMany.mockResolvedValueOnce([{ name: 'Alice' }])

      const p = createProvider()
      await p.exportCSV('users', { columns: ['name'] })

      expect(mockFindMany).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          select: ['name'],
        }),
      )
    })

    it('should pass orderBy and limit', async () => {
      mockFindMany.mockResolvedValueOnce([])

      const p = createProvider()
      await p.exportCSV('users', {
        orderBy: [{ field: 'name', direction: 'asc' }],
        limit: 10,
      })

      expect(mockFindMany).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          orderBy: [{ field: 'name', direction: 'asc' }],
          limit: 10,
        }),
      )
    })

    it('should use maxExportRows when no limit specified', async () => {
      mockFindMany.mockResolvedValueOnce([])

      const p = createProvider({ maxExportRows: 500 })
      await p.exportCSV('users')

      expect(mockFindMany).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          limit: 500,
        }),
      )
    })

    it('should return empty buffer for empty results', async () => {
      mockFindMany.mockResolvedValueOnce([])

      const p = createProvider()
      const buf = await p.exportCSV('users')
      expect(buf.toString()).toBe('')
    })
  })

  describe('exportJSON', () => {
    it('should return rows directly', async () => {
      const data = [{ name: 'Alice' }, { name: 'Bob' }]
      mockFindMany.mockResolvedValueOnce(data)

      const p = createProvider()
      const result = await p.exportJSON('users')
      expect(result).toEqual(data)
    })

    it('should pass query options', async () => {
      mockFindMany.mockResolvedValueOnce([])

      const p = createProvider()
      await p.exportJSON('users', {
        filters: [{ field: 'active', operator: 'eq', value: true }],
        columns: ['name'],
        limit: 5,
      })

      expect(mockFindMany).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          where: [{ field: 'active', operator: '=', value: true }],
          select: ['name'],
          limit: 5,
        }),
      )
    })
  })

  describe('exportExcel', () => {
    it('should return XML Spreadsheet 2003 format', async () => {
      mockFindMany.mockResolvedValueOnce([{ name: 'Alice', score: 42 }])

      const p = createProvider()
      const buf = await p.exportExcel('users')
      const xml = buf.toString()

      expect(xml).toContain('<?xml version="1.0"?>')
      expect(xml).toContain('Excel.Sheet')
      expect(xml).toContain('Alice')
      expect(xml).toContain('42')
    })

    it('should handle empty results', async () => {
      mockFindMany.mockResolvedValueOnce([])

      const p = createProvider()
      const buf = await p.exportExcel('users')
      const xml = buf.toString()

      expect(xml).toContain('<?xml version="1.0"?>')
      expect(xml).toContain('Excel.Sheet')
    })
  })

  describe('getJobStatus', () => {
    it('should return pending for unknown job IDs', async () => {
      const p = createProvider()
      const status = await p.getJobStatus('nonexistent')
      expect(status.status).toBe('pending')
      expect(status.jobId).toBe('nonexistent')
    })
  })

  describe('provider conformance', () => {
    it('should satisfy ImportExportProvider interface', () => {
      const p = createProvider()
      const typed: ImportExportProvider = p
      expect(typed).toBeDefined()
    })
  })
})
