import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock setup — vi.hoisted ensures these exist before vi.mock factories run
// ---------------------------------------------------------------------------

const { mockClient, mockIndex } = vi.hoisted(() => {
  const mockIndex = {
    upsert: vi.fn(),
    query: vi.fn(),
    fetch: vi.fn(),
    deleteMany: vi.fn(),
  }
  const mockClient = {
    createIndex: vi.fn(),
    deleteIndex: vi.fn(),
    listIndexes: vi.fn(),
    describeIndex: vi.fn(),
    index: vi.fn().mockReturnValue(mockIndex),
  }
  return { mockClient, mockIndex }
})

vi.mock('@pinecone-database/pinecone', () => ({
  Pinecone: class MockPinecone {
    createIndex = mockClient.createIndex
    deleteIndex = mockClient.deleteIndex
    listIndexes = mockClient.listIndexes
    describeIndex = mockClient.describeIndex
    index = mockClient.index
  },
}))

import { createProvider } from '../provider.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetMocks(): void {
  mockIndex.upsert.mockReset()
  mockIndex.query.mockReset()
  mockIndex.fetch.mockReset()
  mockIndex.deleteMany.mockReset()
  mockClient.createIndex.mockReset()
  mockClient.deleteIndex.mockReset()
  mockClient.listIndexes.mockReset()
  mockClient.describeIndex.mockReset()
  mockClient.index.mockReset().mockReturnValue(mockIndex)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PineconeProvider', () => {
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
      const provider = createProvider({ apiKey: 'test-key' })
      expect(provider.name).toBe('pinecone')
    })

    it('falls back to PINECONE_API_KEY env var', () => {
      vi.stubEnv('PINECONE_API_KEY', 'env-api-key')
      createProvider()
      vi.unstubAllEnvs()
    })
  })

  // =========================================================================
  // createCollection()
  // =========================================================================

  describe('createCollection()', () => {
    it('creates a serverless index with cosine metric by default', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.createIndex.mockResolvedValue({})

      await provider.createCollection({ name: 'documents', dimension: 1536 })

      expect(mockClient.createIndex).toHaveBeenCalledWith({
        name: 'mol-documents',
        dimension: 1536,
        metric: 'cosine',
        spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
        waitUntilReady: true,
      })
    })

    it('uses euclidean metric when specified', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.createIndex.mockResolvedValue({})

      await provider.createCollection({ name: 'images', dimension: 512, metric: 'euclidean' })

      expect(mockClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({ metric: 'euclidean' }),
      )
    })

    it('maps inner_product to dotproduct', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.createIndex.mockResolvedValue({})

      await provider.createCollection({
        name: 'embeddings',
        dimension: 768,
        metric: 'inner_product',
      })

      expect(mockClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({ metric: 'dotproduct' }),
      )
    })

    it('uses custom cloud, region, and prefix', async () => {
      const provider = createProvider({
        apiKey: 'test-key',
        cloud: 'gcp',
        region: 'us-central1',
        indexPrefix: 'vs-',
      })
      mockClient.createIndex.mockResolvedValue({})

      await provider.createCollection({ name: 'docs', dimension: 256 })

      expect(mockClient.createIndex).toHaveBeenCalledWith({
        name: 'vs-docs',
        dimension: 256,
        metric: 'cosine',
        spec: { serverless: { cloud: 'gcp', region: 'us-central1' } },
        waitUntilReady: true,
      })
    })

    it('respects waitUntilReady config', async () => {
      const provider = createProvider({ apiKey: 'test-key', waitUntilReady: false })
      mockClient.createIndex.mockResolvedValue({})

      await provider.createCollection({ name: 'docs', dimension: 256 })

      expect(mockClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({ waitUntilReady: false }),
      )
    })
  })

  // =========================================================================
  // deleteCollection()
  // =========================================================================

  describe('deleteCollection()', () => {
    it('deletes the corresponding Pinecone index', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.deleteIndex.mockResolvedValue(undefined)

      await provider.deleteCollection('documents')

      expect(mockClient.deleteIndex).toHaveBeenCalledWith('mol-documents')
    })
  })

  // =========================================================================
  // listCollections()
  // =========================================================================

  describe('listCollections()', () => {
    it('returns collection names filtered by prefix and sorted', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.listIndexes.mockResolvedValue({
        indexes: [
          { name: 'mol-beta' },
          { name: 'other-index' },
          { name: 'mol-alpha' },
          { name: 'mol-gamma' },
        ],
      })

      const collections = await provider.listCollections()
      expect(collections).toEqual(['alpha', 'beta', 'gamma'])
    })

    it('returns empty array when no matching indexes exist', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.listIndexes.mockResolvedValue({ indexes: [] })

      const collections = await provider.listCollections()
      expect(collections).toEqual([])
    })

    it('handles undefined indexes in response', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.listIndexes.mockResolvedValue({})

      const collections = await provider.listCollections()
      expect(collections).toEqual([])
    })
  })

  // =========================================================================
  // upsert()
  // =========================================================================

  describe('upsert()', () => {
    it('upserts vectors with metadata and content', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockIndex.upsert.mockResolvedValue(undefined)

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

      expect(mockClient.index).toHaveBeenCalledWith('mol-documents')
      expect(mockIndex.upsert).toHaveBeenCalledWith({
        records: [
          {
            id: 'doc-1',
            values: [0.1, 0.2, 0.3],
            metadata: { source: 'web', _content: 'Hello world' },
          },
        ],
      })
    })

    it('handles records without metadata or content', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockIndex.upsert.mockResolvedValue(undefined)

      await provider.upsert({
        collection: 'documents',
        records: [{ id: 'doc-1', embedding: [0.1, 0.2] }],
      })

      expect(mockIndex.upsert).toHaveBeenCalledWith({
        records: [{ id: 'doc-1', values: [0.1, 0.2], metadata: {} }],
      })
    })

    it('batches upserts in groups of 100', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockIndex.upsert.mockResolvedValue(undefined)

      const records = Array.from({ length: 250 }, (_, i) => ({
        id: `doc-${i}`,
        embedding: [0.1, 0.2],
      }))

      await provider.upsert({ collection: 'documents', records })

      expect(mockIndex.upsert).toHaveBeenCalledTimes(3)
      expect(mockIndex.upsert.mock.calls[0][0].records).toHaveLength(100)
      expect(mockIndex.upsert.mock.calls[1][0].records).toHaveLength(100)
      expect(mockIndex.upsert.mock.calls[2][0].records).toHaveLength(50)
    })

    it('skips when records array is empty', async () => {
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.upsert({ collection: 'documents', records: [] })

      expect(mockClient.index).not.toHaveBeenCalled()
      expect(mockIndex.upsert).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // query()
  // =========================================================================

  describe('query()', () => {
    it('queries similar vectors with cosine scoring', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.describeIndex.mockResolvedValue({ metric: 'cosine' })
      mockIndex.query.mockResolvedValue({
        matches: [
          {
            id: 'doc-1',
            score: 0.95,
            values: [0.1, 0.2, 0.3],
            metadata: { source: 'web', _content: 'Hello world' },
          },
          {
            id: 'doc-2',
            score: 0.7,
            values: [0.4, 0.5, 0.6],
            metadata: {},
          },
        ],
      })

      const results = await provider.query({
        collection: 'documents',
        embedding: [0.1, 0.2, 0.3],
        topK: 5,
      })

      expect(results).toHaveLength(2)
      expect(results[0].record.id).toBe('doc-1')
      expect(results[0].score).toBeCloseTo(0.95)
      expect(results[0].record.embedding).toEqual([0.1, 0.2, 0.3])
      expect(results[0].record.metadata).toEqual({ source: 'web' })
      expect(results[0].record.content).toBe('Hello world')

      expect(results[1].record.id).toBe('doc-2')
      expect(results[1].score).toBeCloseTo(0.7)
      expect(results[1].record.metadata).toBeUndefined()
      expect(results[1].record.content).toBeUndefined()
    })

    it('includes metadata and values in query request', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.describeIndex.mockResolvedValue({ metric: 'cosine' })
      mockIndex.query.mockResolvedValue({ matches: [] })

      await provider.query({
        collection: 'docs',
        embedding: [0.1, 0.2],
        topK: 3,
      })

      expect(mockIndex.query).toHaveBeenCalledWith({
        vector: [0.1, 0.2],
        topK: 3,
        includeMetadata: true,
        includeValues: true,
      })
    })

    it('filters results by minScore', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.describeIndex.mockResolvedValue({ metric: 'cosine' })
      mockIndex.query.mockResolvedValue({
        matches: [
          { id: 'close', score: 0.95, values: [0.1, 0.2], metadata: {} },
          { id: 'far', score: 0.2, values: [0.9, 0.8], metadata: {} },
        ],
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
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.describeIndex.mockResolvedValue({ metric: 'cosine' })
      mockIndex.query.mockResolvedValue({ matches: [] })

      await provider.query({
        collection: 'docs',
        embedding: [0.1, 0.2],
        filter: [
          { field: 'source', operator: 'eq', value: 'web' },
          { field: 'score', operator: 'gt', value: 0.8 },
        ],
      })

      expect(mockIndex.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: {
            $and: [{ source: { $eq: 'web' } }, { score: { $gt: 0.8 } }],
          },
        }),
      )
    })

    it('uses single-condition filter without $and wrapper', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.describeIndex.mockResolvedValue({ metric: 'cosine' })
      mockIndex.query.mockResolvedValue({ matches: [] })

      await provider.query({
        collection: 'docs',
        embedding: [0.1, 0.2],
        filter: [{ field: 'type', operator: 'eq', value: 'pdf' }],
      })

      expect(mockIndex.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: { type: { $eq: 'pdf' } },
        }),
      )
    })

    it('applies in filter with multiple values', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.describeIndex.mockResolvedValue({ metric: 'cosine' })
      mockIndex.query.mockResolvedValue({ matches: [] })

      await provider.query({
        collection: 'docs',
        embedding: [0.1, 0.2],
        filter: [{ field: 'type', operator: 'in', value: ['pdf', 'doc'] }],
      })

      expect(mockIndex.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: { type: { $in: ['pdf', 'doc'] } },
        }),
      )
    })

    it('uses euclidean distance scoring', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.describeIndex.mockResolvedValue({ metric: 'euclidean' })
      mockIndex.query.mockResolvedValue({
        matches: [{ id: 'doc-1', score: 1.0, values: [0.1, 0.2], metadata: {} }],
      })

      const results = await provider.query({
        collection: 'docs',
        embedding: [0.1, 0.2],
      })

      // euclidean score = 1 / (1 + distance) = 1 / (1 + 1) = 0.5
      expect(results[0].score).toBeCloseTo(0.5)
    })

    it('maps dotproduct metric to inner_product scoring', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.describeIndex.mockResolvedValue({ metric: 'dotproduct' })
      mockIndex.query.mockResolvedValue({
        matches: [{ id: 'doc-1', score: 0.85, values: [0.1, 0.2], metadata: {} }],
      })

      const results = await provider.query({
        collection: 'docs',
        embedding: [0.1, 0.2],
      })

      // dotproduct score is passed through
      expect(results[0].score).toBeCloseTo(0.85)
    })

    it('defaults topK to 10', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.describeIndex.mockResolvedValue({ metric: 'cosine' })
      mockIndex.query.mockResolvedValue({ matches: [] })

      await provider.query({ collection: 'docs', embedding: [0.1, 0.2] })

      expect(mockIndex.query).toHaveBeenCalledWith(expect.objectContaining({ topK: 10 }))
    })

    it('caches metric after first describeIndex call', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.describeIndex.mockResolvedValue({ metric: 'cosine' })
      mockIndex.query.mockResolvedValue({ matches: [] })

      await provider.query({ collection: 'docs', embedding: [0.1] })
      await provider.query({ collection: 'docs', embedding: [0.2] })

      expect(mockClient.describeIndex).toHaveBeenCalledTimes(1)
    })

    it('handles undefined matches in response', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockClient.describeIndex.mockResolvedValue({ metric: 'cosine' })
      mockIndex.query.mockResolvedValue({})

      const results = await provider.query({
        collection: 'docs',
        embedding: [0.1, 0.2],
      })

      expect(results).toEqual([])
    })
  })

  // =========================================================================
  // fetch()
  // =========================================================================

  describe('fetch()', () => {
    it('fetches records by IDs', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockIndex.fetch.mockResolvedValue({
        records: {
          'doc-1': {
            id: 'doc-1',
            values: [0.1, 0.2, 0.3],
            metadata: { source: 'web', _content: 'Hello' },
          },
        },
      })

      const records = await provider.fetch({
        collection: 'documents',
        ids: ['doc-1', 'doc-missing'],
      })

      expect(mockClient.index).toHaveBeenCalledWith('mol-documents')
      expect(mockIndex.fetch).toHaveBeenCalledWith({ ids: ['doc-1', 'doc-missing'] })
      expect(records).toHaveLength(1)
      expect(records[0].id).toBe('doc-1')
      expect(records[0].embedding).toEqual([0.1, 0.2, 0.3])
      expect(records[0].metadata).toEqual({ source: 'web' })
      expect(records[0].content).toBe('Hello')
    })

    it('handles records without metadata or content', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockIndex.fetch.mockResolvedValue({
        records: {
          'doc-1': {
            id: 'doc-1',
            values: [0.1, 0.2],
            metadata: {},
          },
        },
      })

      const records = await provider.fetch({
        collection: 'docs',
        ids: ['doc-1'],
      })

      expect(records[0].metadata).toBeUndefined()
      expect(records[0].content).toBeUndefined()
    })

    it('returns empty array for empty ids', async () => {
      const provider = createProvider({ apiKey: 'test-key' })

      const records = await provider.fetch({ collection: 'documents', ids: [] })
      expect(records).toEqual([])
      expect(mockClient.index).not.toHaveBeenCalled()
    })

    it('handles undefined records in response', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockIndex.fetch.mockResolvedValue({})

      const records = await provider.fetch({
        collection: 'docs',
        ids: ['doc-1'],
      })

      expect(records).toEqual([])
    })
  })

  // =========================================================================
  // delete()
  // =========================================================================

  describe('delete()', () => {
    it('deletes records by IDs', async () => {
      const provider = createProvider({ apiKey: 'test-key' })
      mockIndex.deleteMany.mockResolvedValue(undefined)

      await provider.delete({ collection: 'documents', ids: ['doc-1', 'doc-2'] })

      expect(mockClient.index).toHaveBeenCalledWith('mol-documents')
      expect(mockIndex.deleteMany).toHaveBeenCalledWith({ ids: ['doc-1', 'doc-2'] })
    })

    it('skips when ids array is empty', async () => {
      const provider = createProvider({ apiKey: 'test-key' })

      await provider.delete({ collection: 'documents', ids: [] })

      expect(mockClient.index).not.toHaveBeenCalled()
      expect(mockIndex.deleteMany).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Custom configuration
  // =========================================================================

  describe('custom index prefix', () => {
    it('uses custom prefix for all operations', async () => {
      const provider = createProvider({ apiKey: 'test-key', indexPrefix: 'vs-' })
      mockClient.createIndex.mockResolvedValue({})
      mockClient.deleteIndex.mockResolvedValue(undefined)
      mockClient.listIndexes.mockResolvedValue({
        indexes: [{ name: 'vs-alpha' }, { name: 'mol-other' }],
      })

      await provider.createCollection({ name: 'docs', dimension: 256 })
      expect(mockClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'vs-docs' }),
      )

      await provider.deleteCollection('docs')
      expect(mockClient.deleteIndex).toHaveBeenCalledWith('vs-docs')

      const collections = await provider.listCollections()
      expect(collections).toEqual(['alpha'])
    })
  })
})
