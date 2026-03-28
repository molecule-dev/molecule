import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SearchProvider } from '@molecule/api-search'

const mockQuery = vi.fn().mockResolvedValue({ rows: [] })

vi.mock('@molecule/api-database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}))

let createProvider: (options?: Record<string, unknown>) => SearchProvider

describe('postgres search provider', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const mod = await import('../provider.js')
    createProvider = mod.createProvider as (options?: Record<string, unknown>) => SearchProvider
  })

  describe('createProvider', () => {
    it('should create a provider', () => {
      const p = createProvider()
      expect(p).toBeDefined()
      expect(typeof p.search).toBe('function')
    })

    it('should accept custom options', () => {
      const p = createProvider({
        searchConfig: 'simple',
        tablePrefix: 'idx_',
        useGinIndex: false,
      })
      expect(p).toBeDefined()
    })
  })

  describe('createIndex', () => {
    it('should create a table with default schema', async () => {
      const p = createProvider()
      await p.createIndex('products')

      expect(mockQuery).toHaveBeenCalled()
      const sql = mockQuery.mock.calls[0][0]
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS search_products')
    })

    it('should create GIN indexes by default', async () => {
      const p = createProvider()
      await p.createIndex('products')

      const calls = mockQuery.mock.calls.map((c: unknown[]) => c[0])
      expect(calls.some((sql: string) => sql.includes('USING GIN'))).toBe(true)
    })

    it('should skip GIN indexes when disabled', async () => {
      const p = createProvider({ useGinIndex: false })
      await p.createIndex('products')

      const calls = mockQuery.mock.calls.map((c: unknown[]) => c[0])
      const ginCalls = calls.filter((sql: string) => sql.includes('USING GIN(search_vector)'))
      expect(ginCalls).toHaveLength(0)
    })
  })

  describe('deleteIndex', () => {
    it('should drop the table', async () => {
      const p = createProvider()
      await p.deleteIndex('products')

      const sql = mockQuery.mock.calls[0][0]
      expect(sql).toContain('DROP TABLE IF EXISTS search_products')
    })
  })

  describe('index', () => {
    it('should upsert a document', async () => {
      const p = createProvider()
      await p.index('products', '1', { name: 'Widget', price: 9.99 })

      expect(mockQuery).toHaveBeenCalled()
      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('INSERT INTO search_products')
      expect(sql).toContain('ON CONFLICT (id)')
      expect(params[0]).toBe('1')
    })
  })

  describe('bulkIndex', () => {
    it('should index multiple documents', async () => {
      const p = createProvider()
      const result = await p.bulkIndex('products', [
        { id: '1', document: { name: 'Widget' } },
        { id: '2', document: { name: 'Gadget' } },
      ])

      expect(result.indexed).toBe(2)
      expect(result.failed).toBe(0)
    })

    it('should handle individual failures', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Constraint violation'))

      const p = createProvider()
      const result = await p.bulkIndex('products', [
        { id: '1', document: { name: 'Widget' } },
        { id: '2', document: { name: 'Bad' } },
      ])

      expect(result.indexed).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.errors['2']).toBe('Constraint violation')
    })
  })

  describe('search', () => {
    it('should execute a full-text search', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: '1', document: '{"name":"Widget"}', score: 0.5 }],
        })
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
        })

      const p = createProvider()
      const result = await p.search('products', { text: 'widget' })

      expect(result.total).toBe(1)
      expect(result.hits).toHaveLength(1)
      expect(result.hits[0].id).toBe('1')
      expect(result.hits[0].document).toEqual({ name: 'Widget' })
    })

    it('should handle pagination', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '50' }] })

      const p = createProvider()
      const result = await p.search('products', {
        text: 'widget',
        page: 3,
        perPage: 10,
      })

      expect(result.page).toBe(3)
      expect(result.perPage).toBe(10)
    })
  })

  describe('delete', () => {
    it('should delete a document by id', async () => {
      const p = createProvider()
      await p.delete('products', '1')

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('DELETE FROM search_products')
      expect(params[0]).toBe('1')
    })
  })

  describe('suggest', () => {
    it('should return suggestions', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: '1', document: '{"name":"Widget"}', score: 0.9 },
          { id: '2', document: '{"name":"Window"}', score: 0.7 },
        ],
      })

      const p = createProvider()
      const suggestions = await p.suggest('products', 'wid')

      expect(suggestions).toHaveLength(2)
      expect(suggestions[0].text).toBe('Widget')
    })
  })

  describe('getDocument', () => {
    it('should return a document when found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ document: '{"name":"Widget","price":9.99}' }],
      })

      const p = createProvider()
      const doc = await p.getDocument('products', '1')

      expect(doc).toEqual({ name: 'Widget', price: 9.99 })
    })

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const p = createProvider()
      const doc = await p.getDocument('products', 'missing')

      expect(doc).toBeNull()
    })
  })
})
