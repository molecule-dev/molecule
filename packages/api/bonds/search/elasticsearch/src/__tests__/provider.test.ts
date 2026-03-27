import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SearchProvider } from '@molecule/api-search'

// Mock @elastic/elasticsearch
const mockIndicesCreate = vi.fn().mockResolvedValue({})
const mockIndicesDelete = vi.fn().mockResolvedValue({})
const mockIndex = vi.fn().mockResolvedValue({})
const mockBulk = vi.fn().mockResolvedValue({ errors: false, items: [] })
const mockSearch = vi.fn().mockResolvedValue({
  hits: { total: { value: 0 }, hits: [] },
})
const mockDelete = vi.fn().mockResolvedValue({})
const mockGet = vi.fn().mockResolvedValue({ _source: null })

vi.mock('@elastic/elasticsearch', () => ({
  Client: class MockClient {
    indices = {
      create: mockIndicesCreate,
      delete: mockIndicesDelete,
    }

    index = mockIndex
    bulk = mockBulk
    search = mockSearch
    delete = mockDelete
    get = mockGet
  },
}))

let createProvider: (options?: Record<string, unknown>) => SearchProvider
let provider: SearchProvider

describe('elasticsearch search provider', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const mod = await import('../provider.js')
    createProvider = mod.createProvider as (options?: Record<string, unknown>) => SearchProvider
    provider = mod.provider
  })

  describe('createProvider', () => {
    it('should create a provider with default options', () => {
      const p = createProvider()
      expect(p).toBeDefined()
      expect(typeof p.search).toBe('function')
      expect(typeof p.index).toBe('function')
    })

    it('should create a provider with custom options', () => {
      const p = createProvider({
        node: 'http://custom:9200',
        apiKey: 'test-key',
        requestTimeout: 5000,
        maxRetries: 1,
        indexPrefix: 'test',
      })
      expect(p).toBeDefined()
    })
  })

  describe('createIndex', () => {
    it('should create an index without schema', async () => {
      const p = createProvider()
      await p.createIndex('products')

      expect(mockIndicesCreate).toHaveBeenCalledWith({ index: 'products' })
    })

    it('should create an index with schema', async () => {
      const p = createProvider()
      await p.createIndex('products', {
        fields: { name: 'text', price: 'number' },
        searchableFields: ['name'],
      })

      expect(mockIndicesCreate).toHaveBeenCalledWith({
        index: 'products',
        mappings: {
          properties: {
            name: { type: 'text' },
            price: { type: 'double' },
          },
        },
      })
    })

    it('should apply index prefix', async () => {
      const p = createProvider({ indexPrefix: 'app' })
      await p.createIndex('products')

      expect(mockIndicesCreate).toHaveBeenCalledWith({ index: 'app-products' })
    })
  })

  describe('deleteIndex', () => {
    it('should delete an index', async () => {
      const p = createProvider()
      await p.deleteIndex('products')

      expect(mockIndicesDelete).toHaveBeenCalledWith({ index: 'products' })
    })
  })

  describe('index', () => {
    it('should index a document', async () => {
      const p = createProvider()
      await p.index('products', '1', { name: 'Widget', price: 9.99 })

      expect(mockIndex).toHaveBeenCalledWith({
        index: 'products',
        id: '1',
        document: { name: 'Widget', price: 9.99 },
        refresh: 'wait_for',
      })
    })
  })

  describe('bulkIndex', () => {
    it('should bulk index documents', async () => {
      mockBulk.mockResolvedValueOnce({ errors: false, items: [] })
      const p = createProvider()
      const result = await p.bulkIndex('products', [
        { id: '1', document: { name: 'Widget' } },
        { id: '2', document: { name: 'Gadget' } },
      ])

      expect(result.indexed).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.errors).toEqual({})
    })

    it('should report partial failures', async () => {
      mockBulk.mockResolvedValueOnce({
        errors: true,
        items: [
          { index: { _id: '1', status: 201 } },
          { index: { _id: '2', error: { reason: 'Parse error' } } },
        ],
      })
      const p = createProvider()
      const result = await p.bulkIndex('products', [
        { id: '1', document: { name: 'Widget' } },
        { id: '2', document: {} },
      ])

      expect(result.indexed).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.errors).toEqual({ '2': 'Parse error' })
    })
  })

  describe('search', () => {
    it('should execute a basic search', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: {
          total: { value: 1 },
          hits: [{ _id: '1', _score: 1.5, _source: { name: 'Widget' } }],
        },
      })
      const p = createProvider()
      const result = await p.search('products', { text: 'widget' })

      expect(result.total).toBe(1)
      expect(result.hits).toHaveLength(1)
      expect(result.hits[0].id).toBe('1')
      expect(result.hits[0].score).toBe(1.5)
      expect(result.hits[0].document).toEqual({ name: 'Widget' })
      expect(result.page).toBe(1)
      expect(result.perPage).toBe(20)
    })

    it('should pass filters to elasticsearch', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: { total: { value: 0 }, hits: [] },
      })
      const p = createProvider()
      await p.search('products', {
        text: 'widget',
        filters: { category: 'electronics' },
      })

      const callArgs = mockSearch.mock.calls[0][0]
      expect(callArgs.query.bool.filter).toBeDefined()
    })

    it('should handle pagination', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: { total: { value: 50 }, hits: [] },
      })
      const p = createProvider()
      const result = await p.search('products', {
        text: 'widget',
        page: 3,
        perPage: 10,
      })

      const callArgs = mockSearch.mock.calls[0][0]
      expect(callArgs.from).toBe(20)
      expect(callArgs.size).toBe(10)
      expect(result.page).toBe(3)
      expect(result.perPage).toBe(10)
    })

    it('should include highlights when requested', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: '1',
              _score: 1.0,
              _source: { name: 'Widget' },
              highlight: { name: ['<em>Widget</em>'] },
            },
          ],
        },
      })
      const p = createProvider()
      const result = await p.search('products', { text: 'widget', highlight: true })

      expect(result.hits[0].highlights).toEqual({ name: ['<em>Widget</em>'] })
    })

    it('should include facets when requested', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: { total: { value: 0 }, hits: [] },
        aggregations: {
          category: {
            buckets: [
              { key: 'electronics', doc_count: 5 },
              { key: 'clothing', doc_count: 3 },
            ],
          },
        },
      })
      const p = createProvider()
      const result = await p.search('products', {
        text: 'widget',
        facets: ['category'],
      })

      expect(result.facets).toBeDefined()
      expect(result.facets!.category).toHaveLength(2)
      expect(result.facets!.category[0]).toEqual({ value: 'electronics', count: 5 })
    })
  })

  describe('delete', () => {
    it('should delete a document', async () => {
      const p = createProvider()
      await p.delete('products', '1')

      expect(mockDelete).toHaveBeenCalledWith({
        index: 'products',
        id: '1',
        refresh: 'wait_for',
      })
    })
  })

  describe('suggest', () => {
    it('should return suggestions', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            { _id: '1', _score: 1.0, _source: { name: 'Widget' } },
            { _id: '2', _score: 0.8, _source: { name: 'Window' } },
          ],
        },
      })
      const p = createProvider()
      const suggestions = await p.suggest('products', 'wid')

      expect(suggestions).toHaveLength(2)
      expect(suggestions[0].text).toBe('Widget')
      expect(suggestions[0].score).toBe(1.0)
    })

    it('should respect limit option', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: { hits: [] },
      })
      const p = createProvider()
      await p.suggest('products', 'wid', { limit: 5 })

      const callArgs = mockSearch.mock.calls[0][0]
      expect(callArgs.size).toBe(5)
    })
  })

  describe('getDocument', () => {
    it('should return a document when found', async () => {
      mockGet.mockResolvedValueOnce({
        _source: { name: 'Widget', price: 9.99 },
      })
      const p = createProvider()
      const doc = await p.getDocument('products', '1')

      expect(doc).toEqual({ name: 'Widget', price: 9.99 })
    })

    it('should return null for missing documents', async () => {
      mockGet.mockRejectedValueOnce({ statusCode: 404 })
      const p = createProvider()
      const doc = await p.getDocument('products', 'missing')

      expect(doc).toBeNull()
    })

    it('should rethrow non-404 errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Connection refused'))
      const p = createProvider()

      await expect(p.getDocument('products', '1')).rejects.toThrow('Connection refused')
    })
  })

  describe('default provider export', () => {
    it('should expose a lazily-initialized provider', () => {
      expect(typeof provider.search).toBe('function')
      expect(typeof provider.index).toBe('function')
      expect(typeof provider.createIndex).toBe('function')
    })
  })
})
