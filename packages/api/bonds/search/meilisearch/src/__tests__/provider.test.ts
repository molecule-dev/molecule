import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SearchProvider } from '@molecule/api-search'

const mockSearch = vi.fn().mockResolvedValue({ hits: [], estimatedTotalHits: 0 })
const mockAddDocuments = vi.fn().mockReturnValue({ waitTask: vi.fn().mockResolvedValue({}) })
const mockDeleteDocument = vi.fn().mockReturnValue({ waitTask: vi.fn().mockResolvedValue({}) })
const mockGetDocument = vi.fn().mockResolvedValue({})
const mockUpdateSearchable = vi.fn().mockReturnValue({ waitTask: vi.fn().mockResolvedValue({}) })
const mockUpdateFilterable = vi.fn().mockReturnValue({ waitTask: vi.fn().mockResolvedValue({}) })
const mockUpdateSortable = vi.fn().mockReturnValue({ waitTask: vi.fn().mockResolvedValue({}) })

const mockIndex = vi.fn().mockReturnValue({
  search: mockSearch,
  addDocuments: mockAddDocuments,
  deleteDocument: mockDeleteDocument,
  getDocument: mockGetDocument,
  updateSearchableAttributes: mockUpdateSearchable,
  updateFilterableAttributes: mockUpdateFilterable,
  updateSortableAttributes: mockUpdateSortable,
})

vi.mock('meilisearch', () => ({
  MeiliSearch: class MockMeiliSearch {
    index = mockIndex
    createIndex = vi.fn().mockReturnValue({ waitTask: vi.fn().mockResolvedValue({}) })
    deleteIndex = vi.fn().mockReturnValue({ waitTask: vi.fn().mockResolvedValue({}) })
  },
}))

let createProvider: (options?: Record<string, unknown>) => SearchProvider

describe('meilisearch search provider', () => {
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
  })

  describe('createIndex', () => {
    it('should create an index without schema', async () => {
      const p = createProvider()
      await p.createIndex('products')
      // MeiliSearch.createIndex was called
    })

    it('should create an index with schema', async () => {
      const p = createProvider()
      await p.createIndex('products', {
        fields: { name: 'text', price: 'number' },
        searchableFields: ['name'],
        filterableFields: ['price'],
        sortableFields: ['price'],
      })

      expect(mockUpdateSearchable).toHaveBeenCalledWith(['name'])
      expect(mockUpdateFilterable).toHaveBeenCalledWith(['price'])
      expect(mockUpdateSortable).toHaveBeenCalledWith(['price'])
    })
  })

  describe('index', () => {
    it('should index a document', async () => {
      const p = createProvider()
      await p.index('products', '1', { name: 'Widget', price: 9.99 })

      expect(mockAddDocuments).toHaveBeenCalledWith([{ id: '1', name: 'Widget', price: 9.99 }])
    })
  })

  describe('bulkIndex', () => {
    it('should bulk index documents', async () => {
      const p = createProvider()
      const result = await p.bulkIndex('products', [
        { id: '1', document: { name: 'Widget' } },
        { id: '2', document: { name: 'Gadget' } },
      ])

      expect(result.indexed).toBe(2)
      expect(result.failed).toBe(0)
    })

    it('should handle failures', async () => {
      mockAddDocuments.mockReturnValueOnce({
        waitTask: vi.fn().mockRejectedValue(new Error('Bulk failed')),
      })
      const p = createProvider()
      const result = await p.bulkIndex('products', [{ id: '1', document: { name: 'Widget' } }])

      expect(result.failed).toBe(1)
      expect(result.errors['1']).toBe('Bulk failed')
    })
  })

  describe('search', () => {
    it('should execute a basic search', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [{ id: '1', name: 'Widget', _rankingScore: 0.9 }],
        estimatedTotalHits: 1,
      })
      const p = createProvider()
      const result = await p.search('products', { text: 'widget' })

      expect(result.total).toBe(1)
      expect(result.hits).toHaveLength(1)
      expect(result.hits[0].id).toBe('1')
    })

    it('should handle facets', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [],
        estimatedTotalHits: 0,
        facetDistribution: { category: { electronics: 5, clothing: 3 } },
      })
      const p = createProvider()
      const result = await p.search('products', {
        text: 'widget',
        facets: ['category'],
      })

      expect(result.facets).toBeDefined()
      expect(result.facets!.category).toHaveLength(2)
    })
  })

  describe('delete', () => {
    it('should delete a document', async () => {
      const p = createProvider()
      await p.delete('products', '1')

      expect(mockDeleteDocument).toHaveBeenCalledWith('1')
    })
  })

  describe('suggest', () => {
    it('should return suggestions', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: [
          { id: '1', name: 'Widget', _rankingScore: 0.9 },
          { id: '2', name: 'Window', _rankingScore: 0.7 },
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
      mockGetDocument.mockResolvedValueOnce({ id: '1', name: 'Widget', price: 9.99 })
      const p = createProvider()
      const doc = await p.getDocument('products', '1')

      expect(doc).toEqual({ name: 'Widget', price: 9.99 })
    })

    it('should return null when not found', async () => {
      mockGetDocument.mockRejectedValueOnce({ code: 'document_not_found' })
      const p = createProvider()
      const doc = await p.getDocument('products', 'missing')

      expect(doc).toBeNull()
    })
  })
})
