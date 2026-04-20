import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock setup — vi.hoisted ensures these exist before vi.mock factories run
// ---------------------------------------------------------------------------

const { mockClient, mockCollection } = vi.hoisted(() => {
  const mockCollection = {
    name: 'mol_documents',
    metadata: { _mol_dimension: 1536, _mol_metric: 'cosine', 'hnsw:space': 'cosine' },
    upsert: vi.fn(),
    query: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  }
  const mockClient = {
    createCollection: vi.fn(),
    deleteCollection: vi.fn(),
    listCollections: vi.fn(),
    getCollection: vi.fn().mockResolvedValue(mockCollection),
  }
  return { mockClient, mockCollection }
})

vi.mock('chromadb', () => ({
  ChromaClient: class MockChromaClient {
    createCollection = mockClient.createCollection
    deleteCollection = mockClient.deleteCollection
    listCollections = mockClient.listCollections
    getCollection = mockClient.getCollection
  },
  IncludeEnum: {
    distances: 'distances',
    documents: 'documents',
    embeddings: 'embeddings',
    metadatas: 'metadatas',
    uris: 'uris',
  },
}))

import { createProvider } from '../provider.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetMocks(): void {
  mockCollection.upsert.mockReset()
  mockCollection.query.mockReset()
  mockCollection.get.mockReset()
  mockCollection.delete.mockReset()
  mockCollection.metadata = {
    _mol_dimension: 1536,
    _mol_metric: 'cosine',
    'hnsw:space': 'cosine',
  }
  mockClient.createCollection.mockReset()
  mockClient.deleteCollection.mockReset()
  mockClient.listCollections.mockReset()
  mockClient.getCollection.mockReset().mockResolvedValue(mockCollection)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChromaProvider', () => {
  beforeEach(() => {
    resetMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // =========================================================================
  // Configuration
  // =========================================================================

  describe('configuration', () => {
    it('has correct provider name', () => {
      const provider = createProvider()
      expect(provider.name).toBe('chroma')
    })

    it('falls back to CHROMA_API_KEY env var', () => {
      vi.stubEnv('CHROMA_API_KEY', 'env-api-key')
      createProvider()
      vi.unstubAllEnvs()
    })
  })

  // =========================================================================
  // createCollection()
  // =========================================================================

  describe('createCollection()', () => {
    it('creates a collection with cosine metric by default', async () => {
      const provider = createProvider()
      mockClient.createCollection.mockResolvedValue(mockCollection)

      await provider.createCollection({ name: 'documents', dimension: 1536 })

      expect(mockClient.createCollection).toHaveBeenCalledWith({
        name: 'mol_documents',
        metadata: {
          _mol_dimension: 1536,
          _mol_metric: 'cosine',
          'hnsw:space': 'cosine',
        },
      })
    })

    it('uses euclidean metric when specified', async () => {
      const provider = createProvider()
      mockClient.createCollection.mockResolvedValue(mockCollection)

      await provider.createCollection({ name: 'images', dimension: 512, metric: 'euclidean' })

      expect(mockClient.createCollection).toHaveBeenCalledWith({
        name: 'mol_images',
        metadata: {
          _mol_dimension: 512,
          _mol_metric: 'euclidean',
          'hnsw:space': 'l2',
        },
      })
    })

    it('maps inner_product to ip space', async () => {
      const provider = createProvider()
      mockClient.createCollection.mockResolvedValue(mockCollection)

      await provider.createCollection({
        name: 'embeddings',
        dimension: 768,
        metric: 'inner_product',
      })

      expect(mockClient.createCollection).toHaveBeenCalledWith({
        name: 'mol_embeddings',
        metadata: {
          _mol_dimension: 768,
          _mol_metric: 'inner_product',
          'hnsw:space': 'ip',
        },
      })
    })

    it('uses custom prefix', async () => {
      const provider = createProvider({ collectionPrefix: 'vs_' })
      mockClient.createCollection.mockResolvedValue(mockCollection)

      await provider.createCollection({ name: 'docs', dimension: 256 })

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'vs_docs' }),
      )
    })
  })

  // =========================================================================
  // deleteCollection()
  // =========================================================================

  describe('deleteCollection()', () => {
    it('deletes the corresponding ChromaDB collection', async () => {
      const provider = createProvider()
      mockClient.deleteCollection.mockResolvedValue(undefined)

      await provider.deleteCollection('documents')

      expect(mockClient.deleteCollection).toHaveBeenCalledWith({ name: 'mol_documents' })
    })
  })

  // =========================================================================
  // listCollections()
  // =========================================================================

  describe('listCollections()', () => {
    it('returns collection names filtered by prefix and sorted', async () => {
      const provider = createProvider()
      mockClient.listCollections.mockResolvedValue([
        { name: 'mol_beta' },
        { name: 'other_collection' },
        { name: 'mol_alpha' },
        { name: 'mol_gamma' },
      ])

      const collections = await provider.listCollections()
      expect(collections).toEqual(['alpha', 'beta', 'gamma'])
    })

    it('returns empty array when no matching collections exist', async () => {
      const provider = createProvider()
      mockClient.listCollections.mockResolvedValue([])

      const collections = await provider.listCollections()
      expect(collections).toEqual([])
    })

    it('filters only collections with configured prefix', async () => {
      const provider = createProvider({ collectionPrefix: 'vs_' })
      mockClient.listCollections.mockResolvedValue([{ name: 'vs_alpha' }, { name: 'mol_beta' }])

      const collections = await provider.listCollections()
      expect(collections).toEqual(['alpha'])
    })
  })

  // =========================================================================
  // upsert()
  // =========================================================================

  describe('upsert()', () => {
    it('upserts vectors with metadata and content', async () => {
      const provider = createProvider()
      mockCollection.upsert.mockResolvedValue(undefined)

      await provider.upsert({
        collection: 'documents',
        records: [
          {
            id: 'doc-1',
            embedding: [0.1, 0.2, 0.3],
            metadata: { source: 'web' },
            content: 'Hello world',
          },
        ],
      })

      expect(mockClient.getCollection).toHaveBeenCalledWith({ name: 'mol_documents' })
      expect(mockCollection.upsert).toHaveBeenCalledWith({
        ids: ['doc-1'],
        embeddings: [[0.1, 0.2, 0.3]],
        metadatas: [{ source: 'web', _content: 'Hello world' }],
      })
    })

    it('handles records without metadata or content', async () => {
      const provider = createProvider()
      mockCollection.upsert.mockResolvedValue(undefined)

      await provider.upsert({
        collection: 'documents',
        records: [{ id: 'doc-1', embedding: [0.1, 0.2] }],
      })

      expect(mockCollection.upsert).toHaveBeenCalledWith({
        ids: ['doc-1'],
        embeddings: [[0.1, 0.2]],
        metadatas: [{}],
      })
    })

    it('handles multiple records', async () => {
      const provider = createProvider()
      mockCollection.upsert.mockResolvedValue(undefined)

      await provider.upsert({
        collection: 'docs',
        records: [
          { id: 'a', embedding: [1, 2], metadata: { type: 'pdf' } },
          { id: 'b', embedding: [3, 4], content: 'text' },
        ],
      })

      expect(mockCollection.upsert).toHaveBeenCalledWith({
        ids: ['a', 'b'],
        embeddings: [
          [1, 2],
          [3, 4],
        ],
        metadatas: [{ type: 'pdf' }, { _content: 'text' }],
      })
    })

    it('filters out non-scalar metadata values', async () => {
      const provider = createProvider()
      mockCollection.upsert.mockResolvedValue(undefined)

      await provider.upsert({
        collection: 'docs',
        records: [
          {
            id: 'doc-1',
            embedding: [0.1],
            metadata: { name: 'test', nested: { deep: true } as unknown as string, count: 5 },
          },
        ],
      })

      expect(mockCollection.upsert).toHaveBeenCalledWith({
        ids: ['doc-1'],
        embeddings: [[0.1]],
        metadatas: [{ name: 'test', count: 5 }],
      })
    })

    it('skips when records array is empty', async () => {
      const provider = createProvider()

      await provider.upsert({ collection: 'documents', records: [] })

      expect(mockClient.getCollection).not.toHaveBeenCalled()
      expect(mockCollection.upsert).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // query()
  // =========================================================================

  describe('query()', () => {
    it('queries similar vectors with cosine scoring', async () => {
      const provider = createProvider()
      mockCollection.query.mockResolvedValue({
        ids: [['doc-1', 'doc-2']],
        embeddings: [
          [
            [0.1, 0.2, 0.3],
            [0.4, 0.5, 0.6],
          ],
        ],
        metadatas: [[{ source: 'web', _content: 'Hello world' }, {}]],
        distances: [[0.05, 0.3]],
        documents: [[null, null]],
        uris: [[null, null]],
        include: [],
      })

      const results = await provider.query({
        collection: 'documents',
        embedding: [0.1, 0.2, 0.3],
        topK: 5,
      })

      expect(results).toHaveLength(2)
      expect(results[0].record.id).toBe('doc-1')
      expect(results[0].score).toBeCloseTo(0.95) // 1 - 0.05
      expect(results[0].record.embedding).toEqual([0.1, 0.2, 0.3])
      expect(results[0].record.metadata).toEqual({ source: 'web' })
      expect(results[0].record.content).toBe('Hello world')

      expect(results[1].record.id).toBe('doc-2')
      expect(results[1].score).toBeCloseTo(0.7) // 1 - 0.3
      expect(results[1].record.metadata).toBeUndefined()
      expect(results[1].record.content).toBeUndefined()
    })

    it('passes correct query parameters', async () => {
      const provider = createProvider()
      mockCollection.query.mockResolvedValue({
        ids: [[]],
        embeddings: [[]],
        metadatas: [[]],
        distances: [[]],
        documents: [[]],
        uris: [[]],
        include: [],
      })

      await provider.query({
        collection: 'docs',
        embedding: [0.1, 0.2],
        topK: 3,
      })

      expect(mockCollection.query).toHaveBeenCalledWith({
        queryEmbeddings: [[0.1, 0.2]],
        nResults: 3,
        include: ['embeddings', 'metadatas', 'distances'],
        where: undefined,
      })
    })

    it('filters results by minScore', async () => {
      const provider = createProvider()
      mockCollection.query.mockResolvedValue({
        ids: [['close', 'far']],
        embeddings: [
          [
            [0.1, 0.2],
            [0.9, 0.8],
          ],
        ],
        metadatas: [[{}, {}]],
        distances: [[0.05, 0.8]],
        documents: [[null, null]],
        uris: [[null, null]],
        include: [],
      })

      const results = await provider.query({
        collection: 'docs',
        embedding: [0.1, 0.2],
        minScore: 0.5,
      })

      expect(results).toHaveLength(1)
      expect(results[0].record.id).toBe('close')
    })

    it('applies metadata filters', async () => {
      const provider = createProvider()
      mockCollection.query.mockResolvedValue({
        ids: [[]],
        embeddings: [[]],
        metadatas: [[]],
        distances: [[]],
        documents: [[]],
        uris: [[]],
        include: [],
      })

      await provider.query({
        collection: 'docs',
        embedding: [0.1, 0.2],
        filter: [
          { field: 'source', operator: 'eq', value: 'web' },
          { field: 'score', operator: 'gt', value: 0.8 },
        ],
      })

      expect(mockCollection.query).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            $and: [{ source: { $eq: 'web' } }, { score: { $gt: 0.8 } }],
          },
        }),
      )
    })

    it('uses single-condition filter without $and wrapper', async () => {
      const provider = createProvider()
      mockCollection.query.mockResolvedValue({
        ids: [[]],
        embeddings: [[]],
        metadatas: [[]],
        distances: [[]],
        documents: [[]],
        uris: [[]],
        include: [],
      })

      await provider.query({
        collection: 'docs',
        embedding: [0.1, 0.2],
        filter: [{ field: 'type', operator: 'eq', value: 'pdf' }],
      })

      expect(mockCollection.query).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: { $eq: 'pdf' } },
        }),
      )
    })

    it('applies in filter with multiple values', async () => {
      const provider = createProvider()
      mockCollection.query.mockResolvedValue({
        ids: [[]],
        embeddings: [[]],
        metadatas: [[]],
        distances: [[]],
        documents: [[]],
        uris: [[]],
        include: [],
      })

      await provider.query({
        collection: 'docs',
        embedding: [0.1, 0.2],
        filter: [{ field: 'type', operator: 'in', value: ['pdf', 'doc'] }],
      })

      expect(mockCollection.query).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: { $in: ['pdf', 'doc'] } },
        }),
      )
    })

    it('uses euclidean distance scoring', async () => {
      const provider = createProvider()
      mockCollection.metadata = {
        _mol_dimension: 128,
        _mol_metric: 'euclidean',
        'hnsw:space': 'l2',
      }
      mockCollection.query.mockResolvedValue({
        ids: [['doc-1']],
        embeddings: [[[0.1, 0.2]]],
        metadatas: [[{}]],
        distances: [[1.0]],
        documents: [[null]],
        uris: [[null]],
        include: [],
      })

      const results = await provider.query({
        collection: 'docs',
        embedding: [0.1, 0.2],
      })

      // euclidean score = 1 / (1 + distance) = 1 / (1 + 1) = 0.5
      expect(results[0].score).toBeCloseTo(0.5)
    })

    it('uses inner_product distance scoring', async () => {
      const provider = createProvider()
      mockCollection.metadata = {
        _mol_dimension: 128,
        _mol_metric: 'inner_product',
        'hnsw:space': 'ip',
      }
      mockCollection.query.mockResolvedValue({
        ids: [['doc-1']],
        embeddings: [[[0.1, 0.2]]],
        metadatas: [[{}]],
        distances: [[-0.85]],
        documents: [[null]],
        uris: [[null]],
        include: [],
      })

      const results = await provider.query({
        collection: 'docs',
        embedding: [0.1, 0.2],
      })

      // ip score = -distance = -(-0.85) = 0.85
      expect(results[0].score).toBeCloseTo(0.85)
    })

    it('defaults topK to 10', async () => {
      const provider = createProvider()
      mockCollection.query.mockResolvedValue({
        ids: [[]],
        embeddings: [[]],
        metadatas: [[]],
        distances: [[]],
        documents: [[]],
        uris: [[]],
        include: [],
      })

      await provider.query({ collection: 'docs', embedding: [0.1, 0.2] })

      expect(mockCollection.query).toHaveBeenCalledWith(expect.objectContaining({ nResults: 10 }))
    })

    it('skips results with null distances', async () => {
      const provider = createProvider()
      mockCollection.query.mockResolvedValue({
        ids: [['doc-1', 'doc-2']],
        embeddings: [[[0.1], [0.2]]],
        metadatas: [[{}, {}]],
        distances: [[0.1, null]],
        documents: [[null, null]],
        uris: [[null, null]],
        include: [],
      })

      const results = await provider.query({
        collection: 'docs',
        embedding: [0.1],
      })

      expect(results).toHaveLength(1)
      expect(results[0].record.id).toBe('doc-1')
    })
  })

  // =========================================================================
  // fetch()
  // =========================================================================

  describe('fetch()', () => {
    it('fetches records by IDs', async () => {
      const provider = createProvider()
      mockCollection.get.mockResolvedValue({
        ids: ['doc-1'],
        embeddings: [[0.1, 0.2, 0.3]],
        metadatas: [{ source: 'web', _content: 'Hello' }],
        documents: [null],
        uris: [null],
        include: [],
      })

      const records = await provider.fetch({
        collection: 'documents',
        ids: ['doc-1', 'doc-missing'],
      })

      expect(mockClient.getCollection).toHaveBeenCalledWith({ name: 'mol_documents' })
      expect(mockCollection.get).toHaveBeenCalledWith({
        ids: ['doc-1', 'doc-missing'],
        include: ['embeddings', 'metadatas'],
      })
      expect(records).toHaveLength(1)
      expect(records[0].id).toBe('doc-1')
      expect(records[0].embedding).toEqual([0.1, 0.2, 0.3])
      expect(records[0].metadata).toEqual({ source: 'web' })
      expect(records[0].content).toBe('Hello')
    })

    it('handles records without metadata or content', async () => {
      const provider = createProvider()
      mockCollection.get.mockResolvedValue({
        ids: ['doc-1'],
        embeddings: [[0.1, 0.2]],
        metadatas: [{}],
        documents: [null],
        uris: [null],
        include: [],
      })

      const records = await provider.fetch({
        collection: 'docs',
        ids: ['doc-1'],
      })

      expect(records[0].metadata).toBeUndefined()
      expect(records[0].content).toBeUndefined()
    })

    it('returns empty array for empty ids', async () => {
      const provider = createProvider()

      const records = await provider.fetch({ collection: 'documents', ids: [] })
      expect(records).toEqual([])
      expect(mockClient.getCollection).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // delete()
  // =========================================================================

  describe('delete()', () => {
    it('deletes records by IDs', async () => {
      const provider = createProvider()
      mockCollection.delete.mockResolvedValue({ deleted: 2 })

      await provider.delete({ collection: 'documents', ids: ['doc-1', 'doc-2'] })

      expect(mockClient.getCollection).toHaveBeenCalledWith({ name: 'mol_documents' })
      expect(mockCollection.delete).toHaveBeenCalledWith({ ids: ['doc-1', 'doc-2'] })
    })

    it('skips when ids array is empty', async () => {
      const provider = createProvider()

      await provider.delete({ collection: 'documents', ids: [] })

      expect(mockClient.getCollection).not.toHaveBeenCalled()
      expect(mockCollection.delete).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Custom configuration
  // =========================================================================

  describe('custom collection prefix', () => {
    it('uses custom prefix for all operations', async () => {
      const provider = createProvider({ collectionPrefix: 'vs_' })
      mockClient.createCollection.mockResolvedValue(mockCollection)
      mockClient.deleteCollection.mockResolvedValue(undefined)
      mockClient.listCollections.mockResolvedValue([{ name: 'vs_alpha' }, { name: 'mol_other' }])

      await provider.createCollection({ name: 'docs', dimension: 256 })
      expect(mockClient.createCollection).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'vs_docs' }),
      )

      await provider.deleteCollection('docs')
      expect(mockClient.deleteCollection).toHaveBeenCalledWith({ name: 'vs_docs' })

      const collections = await provider.listCollections()
      expect(collections).toEqual(['alpha'])
    })
  })
})
