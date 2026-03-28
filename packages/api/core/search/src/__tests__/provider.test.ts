import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { SearchProvider, SearchQuery, SuggestOptions } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let createIndex: typeof ProviderModule.createIndex
let deleteIndex: typeof ProviderModule.deleteIndex
let index: typeof ProviderModule.index
let bulkIndex: typeof ProviderModule.bulkIndex
let search: typeof ProviderModule.search
let deleteDocument: typeof ProviderModule.deleteDocument
let suggest: typeof ProviderModule.suggest
let getDocument: typeof ProviderModule.getDocument

const createMockProvider = (overrides?: Partial<SearchProvider>): SearchProvider => ({
  createIndex: vi.fn().mockResolvedValue(undefined),
  deleteIndex: vi.fn().mockResolvedValue(undefined),
  index: vi.fn().mockResolvedValue(undefined),
  bulkIndex: vi.fn().mockResolvedValue({ indexed: 0, failed: 0, errors: {} }),
  search: vi
    .fn()
    .mockResolvedValue({ hits: [], total: 0, page: 1, perPage: 20, processingTimeMs: 0 }),
  delete: vi.fn().mockResolvedValue(undefined),
  suggest: vi.fn().mockResolvedValue([]),
  getDocument: vi.fn().mockResolvedValue(null),
  ...overrides,
})

describe('search provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    createIndex = providerModule.createIndex
    deleteIndex = providerModule.deleteIndex
    index = providerModule.index
    bulkIndex = providerModule.bulkIndex
    search = providerModule.search
    deleteDocument = providerModule.deleteDocument
    suggest = providerModule.suggest
    getDocument = providerModule.getDocument
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Search provider not configured. Call setProvider() first.',
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

  describe('createIndex', () => {
    it('should throw when no provider is set', async () => {
      await expect(createIndex('products')).rejects.toThrow('Search provider not configured')
    })

    it('should call provider createIndex without schema', async () => {
      const mockCreateIndex = vi.fn().mockResolvedValue(undefined)
      setProvider(createMockProvider({ createIndex: mockCreateIndex }))

      await createIndex('products')

      expect(mockCreateIndex).toHaveBeenCalledWith('products', undefined)
    })

    it('should call provider createIndex with schema', async () => {
      const mockCreateIndex = vi.fn().mockResolvedValue(undefined)
      setProvider(createMockProvider({ createIndex: mockCreateIndex }))

      const schema = {
        fields: { name: 'text' as const, price: 'number' as const },
        searchableFields: ['name'],
        filterableFields: ['price'],
      }
      await createIndex('products', schema)

      expect(mockCreateIndex).toHaveBeenCalledWith('products', schema)
    })
  })

  describe('deleteIndex', () => {
    it('should throw when no provider is set', async () => {
      await expect(deleteIndex('products')).rejects.toThrow('Search provider not configured')
    })

    it('should call provider deleteIndex', async () => {
      const mockDeleteIndex = vi.fn().mockResolvedValue(undefined)
      setProvider(createMockProvider({ deleteIndex: mockDeleteIndex }))

      await deleteIndex('products')

      expect(mockDeleteIndex).toHaveBeenCalledWith('products')
    })
  })

  describe('index', () => {
    it('should throw when no provider is set', async () => {
      await expect(index('products', '1', { name: 'Widget' })).rejects.toThrow(
        'Search provider not configured',
      )
    })

    it('should call provider index', async () => {
      const mockIndex = vi.fn().mockResolvedValue(undefined)
      setProvider(createMockProvider({ index: mockIndex }))

      const doc = { name: 'Widget', price: 9.99 }
      await index('products', '1', doc)

      expect(mockIndex).toHaveBeenCalledWith('products', '1', doc)
    })
  })

  describe('bulkIndex', () => {
    it('should throw when no provider is set', async () => {
      await expect(bulkIndex('products', [])).rejects.toThrow('Search provider not configured')
    })

    it('should call provider bulkIndex', async () => {
      const result = { indexed: 2, failed: 0, errors: {} }
      const mockBulkIndex = vi.fn().mockResolvedValue(result)
      setProvider(createMockProvider({ bulkIndex: mockBulkIndex }))

      const docs = [
        { id: '1', document: { name: 'Widget' } },
        { id: '2', document: { name: 'Gadget' } },
      ]
      const response = await bulkIndex('products', docs)

      expect(mockBulkIndex).toHaveBeenCalledWith('products', docs)
      expect(response).toEqual(result)
    })

    it('should return partial failures', async () => {
      const result = { indexed: 1, failed: 1, errors: { '2': 'Invalid document' } }
      const mockBulkIndex = vi.fn().mockResolvedValue(result)
      setProvider(createMockProvider({ bulkIndex: mockBulkIndex }))

      const docs = [
        { id: '1', document: { name: 'Widget' } },
        { id: '2', document: {} },
      ]
      const response = await bulkIndex('products', docs)

      expect(response.indexed).toBe(1)
      expect(response.failed).toBe(1)
      expect(response.errors).toEqual({ '2': 'Invalid document' })
    })
  })

  describe('search', () => {
    it('should throw when no provider is set', async () => {
      await expect(search('products', { text: 'widget' })).rejects.toThrow(
        'Search provider not configured',
      )
    })

    it('should call provider search with basic query', async () => {
      const searchResult = {
        hits: [{ id: '1', score: 1.5, document: { name: 'Widget' } }],
        total: 1,
        page: 1,
        perPage: 20,
        processingTimeMs: 5,
      }
      const mockSearch = vi.fn().mockResolvedValue(searchResult)
      setProvider(createMockProvider({ search: mockSearch }))

      const query: SearchQuery = { text: 'widget' }
      const result = await search('products', query)

      expect(mockSearch).toHaveBeenCalledWith('products', query)
      expect(result).toEqual(searchResult)
    })

    it('should call provider search with full query options', async () => {
      const searchResult = {
        hits: [],
        total: 0,
        page: 2,
        perPage: 10,
        facets: { category: [{ value: 'electronics', count: 5 }] },
        processingTimeMs: 3,
      }
      const mockSearch = vi.fn().mockResolvedValue(searchResult)
      setProvider(createMockProvider({ search: mockSearch }))

      const query: SearchQuery = {
        text: 'widget',
        filters: { category: 'electronics' },
        facets: ['category'],
        sort: [{ field: 'price', direction: 'asc' }],
        page: 2,
        perPage: 10,
        highlight: true,
      }
      const result = await search('products', query)

      expect(mockSearch).toHaveBeenCalledWith('products', query)
      expect(result.facets).toBeDefined()
    })
  })

  describe('deleteDocument', () => {
    it('should throw when no provider is set', async () => {
      await expect(deleteDocument('products', '1')).rejects.toThrow(
        'Search provider not configured',
      )
    })

    it('should call provider delete', async () => {
      const mockDelete = vi.fn().mockResolvedValue(undefined)
      setProvider(createMockProvider({ delete: mockDelete }))

      await deleteDocument('products', '1')

      expect(mockDelete).toHaveBeenCalledWith('products', '1')
    })
  })

  describe('suggest', () => {
    it('should throw when no provider is set', async () => {
      await expect(suggest('products', 'wid')).rejects.toThrow('Search provider not configured')
    })

    it('should call provider suggest without options', async () => {
      const suggestions = [{ text: 'widget', score: 1.0 }]
      const mockSuggest = vi.fn().mockResolvedValue(suggestions)
      setProvider(createMockProvider({ suggest: mockSuggest }))

      const result = await suggest('products', 'wid')

      expect(mockSuggest).toHaveBeenCalledWith('products', 'wid', undefined)
      expect(result).toEqual(suggestions)
    })

    it('should call provider suggest with options', async () => {
      const suggestions = [
        { text: 'widget', score: 1.0, highlighted: '<em>wid</em>get' },
        { text: 'window', score: 0.8 },
      ]
      const mockSuggest = vi.fn().mockResolvedValue(suggestions)
      setProvider(createMockProvider({ suggest: mockSuggest }))

      const options: SuggestOptions = { limit: 5, fields: ['name'], fuzzy: true }
      const result = await suggest('products', 'wid', options)

      expect(mockSuggest).toHaveBeenCalledWith('products', 'wid', options)
      expect(result).toHaveLength(2)
    })
  })

  describe('getDocument', () => {
    it('should throw when no provider is set', async () => {
      await expect(getDocument('products', '1')).rejects.toThrow('Search provider not configured')
    })

    it('should return document when found', async () => {
      const doc = { name: 'Widget', price: 9.99 }
      const mockGetDocument = vi.fn().mockResolvedValue(doc)
      setProvider(createMockProvider({ getDocument: mockGetDocument }))

      const result = await getDocument('products', '1')

      expect(mockGetDocument).toHaveBeenCalledWith('products', '1')
      expect(result).toEqual(doc)
    })

    it('should return null when document not found', async () => {
      const mockGetDocument = vi.fn().mockResolvedValue(null)
      setProvider(createMockProvider({ getDocument: mockGetDocument }))

      const result = await getDocument('products', 'nonexistent')

      expect(result).toBeNull()
    })
  })
})

describe('search types', () => {
  it('should export SearchProvider type with all required methods', () => {
    const provider: SearchProvider = {
      createIndex: async () => {},
      deleteIndex: async () => {},
      index: async () => {},
      bulkIndex: async () => ({ indexed: 0, failed: 0, errors: {} }),
      search: async () => ({ hits: [], total: 0, page: 1, perPage: 20, processingTimeMs: 0 }),
      delete: async () => {},
      suggest: async () => [],
      getDocument: async () => null,
    }
    expect(typeof provider.createIndex).toBe('function')
    expect(typeof provider.deleteIndex).toBe('function')
    expect(typeof provider.index).toBe('function')
    expect(typeof provider.bulkIndex).toBe('function')
    expect(typeof provider.search).toBe('function')
    expect(typeof provider.delete).toBe('function')
    expect(typeof provider.suggest).toBe('function')
    expect(typeof provider.getDocument).toBe('function')
  })

  it('should support SearchQuery with all options', () => {
    const query: SearchQuery = {
      text: 'test',
      filters: { category: 'electronics' },
      facets: ['category', 'brand'],
      sort: [{ field: 'price', direction: 'asc' }],
      page: 1,
      perPage: 20,
      highlight: true,
    }
    expect(query.text).toBe('test')
    expect(query.facets).toHaveLength(2)
  })

  it('should support IndexSchema', () => {
    const schema = {
      fields: {
        name: 'text' as const,
        price: 'number' as const,
        active: 'boolean' as const,
        created: 'date' as const,
        location: 'geo' as const,
        sku: 'keyword' as const,
      },
      searchableFields: ['name'],
      filterableFields: ['price', 'active'],
      sortableFields: ['price', 'created'],
    }
    expect(Object.keys(schema.fields)).toHaveLength(6)
  })
})
