import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SearchProvider } from '@molecule/api-search'

const mockCollectionCreate = vi.fn().mockResolvedValue({})
const mockCollectionDelete = vi.fn().mockResolvedValue({})
const mockDocUpsert = vi.fn().mockResolvedValue({})
const mockDocImport = vi.fn().mockResolvedValue([])
const mockDocSearch = vi.fn().mockResolvedValue({ hits: [], found: 0 })
const mockDocDelete = vi.fn().mockResolvedValue({})
const mockDocRetrieve = vi.fn().mockResolvedValue({})

vi.mock('typesense', () => ({
  default: {
    Client: class MockClient {
      collections(name?: string) {
        if (name) {
          return {
            delete: mockCollectionDelete,
            documents: (id?: string) => {
              if (id) {
                return { delete: mockDocDelete, retrieve: mockDocRetrieve }
              }
              return {
                upsert: mockDocUpsert,
                import: mockDocImport,
                search: mockDocSearch,
              }
            },
          }
        }
        return { create: mockCollectionCreate }
      }
    },
  },
}))

let createProvider: (options?: Record<string, unknown>) => SearchProvider

describe('typesense search provider', () => {
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

      expect(mockCollectionCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'products' }),
      )
    })

    it('should create an index with schema', async () => {
      const p = createProvider()
      await p.createIndex('products', {
        fields: { name: 'text', price: 'number' },
        filterableFields: ['price'],
      })

      const call = mockCollectionCreate.mock.calls[0][0]
      expect(call.name).toBe('products')
      expect(call.fields).toHaveLength(2)
    })
  })

  describe('index', () => {
    it('should index a document', async () => {
      const p = createProvider()
      await p.index('products', '1', { name: 'Widget' })

      expect(mockDocUpsert).toHaveBeenCalledWith({ id: '1', name: 'Widget' })
    })
  })

  describe('bulkIndex', () => {
    it('should bulk index documents', async () => {
      mockDocImport.mockResolvedValueOnce([{ success: true }, { success: true }])
      const p = createProvider()
      const result = await p.bulkIndex('products', [
        { id: '1', document: { name: 'Widget' } },
        { id: '2', document: { name: 'Gadget' } },
      ])

      expect(result.indexed).toBe(2)
      expect(result.failed).toBe(0)
    })

    it('should report failures', async () => {
      mockDocImport.mockResolvedValueOnce([
        { success: true },
        { success: false, document: { id: '2' }, error: 'Bad data' },
      ])
      const p = createProvider()
      const result = await p.bulkIndex('products', [
        { id: '1', document: { name: 'Widget' } },
        { id: '2', document: {} },
      ])

      expect(result.indexed).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.errors['2']).toBe('Bad data')
    })
  })

  describe('search', () => {
    it('should execute a basic search', async () => {
      mockDocSearch.mockResolvedValueOnce({
        hits: [{ document: { id: '1', name: 'Widget' }, text_match: 100 }],
        found: 1,
      })
      const p = createProvider()
      const result = await p.search('products', { text: 'widget' })

      expect(result.total).toBe(1)
      expect(result.hits).toHaveLength(1)
      expect(result.hits[0].id).toBe('1')
    })

    it('should handle empty results', async () => {
      mockDocSearch.mockResolvedValueOnce({ hits: [], found: 0 })
      const p = createProvider()
      const result = await p.search('products', { text: 'nonexistent' })

      expect(result.total).toBe(0)
      expect(result.hits).toHaveLength(0)
    })
  })

  describe('delete', () => {
    it('should delete a document', async () => {
      const p = createProvider()
      await p.delete('products', '1')

      expect(mockDocDelete).toHaveBeenCalled()
    })
  })

  describe('suggest', () => {
    it('should return suggestions', async () => {
      mockDocSearch.mockResolvedValueOnce({
        hits: [
          { document: { id: '1', name: 'Widget' }, text_match: 100 },
          { document: { id: '2', name: 'Window' }, text_match: 80 },
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
      mockDocRetrieve.mockResolvedValueOnce({ id: '1', name: 'Widget', price: 9.99 })
      const p = createProvider()
      const doc = await p.getDocument('products', '1')

      expect(doc).toEqual({ name: 'Widget', price: 9.99 })
    })

    it('should return null for missing documents', async () => {
      mockDocRetrieve.mockRejectedValueOnce({ httpStatus: 404 })
      const p = createProvider()
      const doc = await p.getDocument('products', 'missing')

      expect(doc).toBeNull()
    })
  })
})
