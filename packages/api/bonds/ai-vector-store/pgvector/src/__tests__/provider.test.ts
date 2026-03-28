import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock setup — vi.hoisted ensures these exist before vi.mock factories run
// ---------------------------------------------------------------------------

const { mockPool, mockClient } = vi.hoisted(() => {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  }
  const mockPool = {
    connect: vi.fn().mockResolvedValue(mockClient),
    query: vi.fn(),
    end: vi.fn(),
  }
  return { mockPool, mockClient }
})

vi.mock('pg', () => ({
  default: {
    Pool: class MockPool {
      connect = mockPool.connect
      query = mockPool.query
      end = mockPool.end
    },
  },
}))

vi.mock('pgvector', () => ({
  fromSql: vi.fn((value: string) =>
    value
      .replace('[', '')
      .replace(']', '')
      .split(',')
      .map(Number),
  ),
}))

vi.mock('pgvector/pg', () => ({
  registerTypes: vi.fn(),
  toSql: vi.fn((arr: number[]) => `[${arr.join(',')}]`),
}))

import { createProvider } from '../provider.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetMocks(): void {
  mockClient.query.mockReset()
  mockClient.release.mockReset()
  mockPool.connect.mockReset().mockResolvedValue(mockClient)
  mockPool.query.mockReset()
  mockPool.end.mockReset()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PgvectorProvider', () => {
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
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      expect(provider.name).toBe('pgvector')
    })

    it('falls back to DATABASE_URL env var', () => {
      vi.stubEnv('DATABASE_URL', 'postgresql://env-host/testdb')
      createProvider()
      vi.unstubAllEnvs()
    })
  })

  // =========================================================================
  // createCollection()
  // =========================================================================

  describe('createCollection()', () => {
    it('creates extension, registry, and collection table', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })

      await provider.createCollection({ name: 'documents', dimension: 1536 })

      const calls = mockClient.query.mock.calls.map(
        (c: unknown[]) => (c[0] as string).trim().split('\n')[0],
      )

      expect(calls).toContain('CREATE EXTENSION IF NOT EXISTS vector')

      const registryCreate = mockClient.query.mock.calls.find(
        (c: unknown[]) =>
          typeof c[0] === 'string' &&
          (c[0] as string).includes('CREATE TABLE') &&
          (c[0] as string).includes('mol_vectors_collections'),
      )
      expect(registryCreate).toBeDefined()

      const registryInsert = mockClient.query.mock.calls.find(
        (c: unknown[]) =>
          typeof c[0] === 'string' &&
          (c[0] as string).includes('INSERT INTO') &&
          (c[0] as string).includes('mol_vectors_collections'),
      )
      expect(registryInsert).toBeDefined()
      expect(registryInsert![1]).toEqual(['documents', 1536, 'cosine'])

      const createTable = mockClient.query.mock.calls.find(
        (c: unknown[]) =>
          typeof c[0] === 'string' &&
          (c[0] as string).includes('CREATE TABLE') &&
          (c[0] as string).includes('mol_vectors_documents'),
      )
      expect(createTable).toBeDefined()
      expect(createTable![0] as string).toContain('vector(1536)')

      const hnswIndex = mockClient.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('hnsw'),
      )
      expect(hnswIndex).toBeDefined()
      expect(hnswIndex![0] as string).toContain('vector_cosine_ops')

      expect(calls).toContain('COMMIT')
    })

    it('uses euclidean metric when specified', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })

      await provider.createCollection({ name: 'images', dimension: 512, metric: 'euclidean' })

      const registryInsert = mockClient.query.mock.calls.find(
        (c: unknown[]) =>
          typeof c[0] === 'string' &&
          (c[0] as string).includes('INSERT INTO') &&
          (c[0] as string).includes('mol_vectors_collections'),
      )
      expect(registryInsert![1]).toEqual(['images', 512, 'euclidean'])

      const hnswIndex = mockClient.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('hnsw'),
      )
      expect(hnswIndex![0] as string).toContain('vector_l2_ops')
    })

    it('uses inner_product metric when specified', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })

      await provider.createCollection({
        name: 'embeddings',
        dimension: 768,
        metric: 'inner_product',
      })

      const hnswIndex = mockClient.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('hnsw'),
      )
      expect(hnswIndex![0] as string).toContain('vector_ip_ops')
    })

    it('rolls back on error', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })

      let callCount = 0
      mockClient.query.mockImplementation(() => {
        callCount++
        // Fail on the registry INSERT (after init: extension + registry table creation + BEGIN)
        if (callCount === 4) {
          throw new Error('duplicate key')
        }
        return { rows: [] }
      })

      await expect(
        provider.createCollection({ name: 'documents', dimension: 1536 }),
      ).rejects.toThrow('duplicate key')

      const calls = mockClient.query.mock.calls.map(
        (c: unknown[]) => (c[0] as string).trim().split('\n')[0],
      )
      expect(calls).toContain('ROLLBACK')
    })
  })

  // =========================================================================
  // deleteCollection()
  // =========================================================================

  describe('deleteCollection()', () => {
    it('drops table and removes registry entry', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })

      await provider.deleteCollection('documents')

      const calls = mockClient.query.mock.calls.map((c: unknown[]) => c[0] as string)

      expect(calls.some((c) => c.includes('DROP TABLE') && c.includes('mol_vectors_documents'))).toBe(
        true,
      )

      const deleteCall = mockClient.query.mock.calls.find(
        (c: unknown[]) =>
          typeof c[0] === 'string' &&
          (c[0] as string).includes('DELETE FROM') &&
          (c[0] as string).includes('mol_vectors_collections'),
      )
      expect(deleteCall).toBeDefined()
      expect(deleteCall![1]).toEqual(['documents'])
    })
  })

  // =========================================================================
  // listCollections()
  // =========================================================================

  describe('listCollections()', () => {
    it('returns collection names sorted', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })

      mockPool.query.mockResolvedValue({
        rows: [{ name: 'alpha' }, { name: 'beta' }, { name: 'gamma' }],
      })

      const collections = await provider.listCollections()
      expect(collections).toEqual(['alpha', 'beta', 'gamma'])
    })

    it('returns empty array when no collections exist', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })
      mockPool.query.mockResolvedValue({ rows: [] })

      const collections = await provider.listCollections()
      expect(collections).toEqual([])
    })
  })

  // =========================================================================
  // upsert()
  // =========================================================================

  describe('upsert()', () => {
    it('inserts vector records with ON CONFLICT update', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })

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

      const upsertCall = mockClient.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('ON CONFLICT'),
      )
      expect(upsertCall).toBeDefined()
      expect(upsertCall![1]).toEqual(['doc-1', '[0.1,0.2,0.3]', '{"source":"web"}', 'Hello world'])
    })

    it('handles multiple records in a single transaction', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })

      await provider.upsert({
        collection: 'documents',
        records: [
          { id: 'doc-1', embedding: [0.1, 0.2] },
          { id: 'doc-2', embedding: [0.3, 0.4] },
        ],
      })

      const upsertCalls = mockClient.query.mock.calls.filter(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('ON CONFLICT'),
      )
      expect(upsertCalls).toHaveLength(2)
    })

    it('skips when records array is empty', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })

      await provider.upsert({ collection: 'documents', records: [] })

      // No SQL queries should have been issued
      expect(mockClient.query).not.toHaveBeenCalled()
      expect(mockPool.query).not.toHaveBeenCalled()
    })

    it('handles null metadata and content', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })

      await provider.upsert({
        collection: 'documents',
        records: [{ id: 'doc-1', embedding: [0.1, 0.2] }],
      })

      const upsertCall = mockClient.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('ON CONFLICT'),
      )
      expect(upsertCall![1]).toEqual(['doc-1', '[0.1,0.2]', null, null])
    })
  })

  // =========================================================================
  // query()
  // =========================================================================

  describe('query()', () => {
    it('queries similar vectors with cosine distance', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ name: 'documents', dimension: 3, metric: 'cosine' }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'doc-1',
              embedding: '[0.1,0.2,0.3]',
              metadata: { source: 'web' },
              content: 'Hello world',
              distance: 0.1,
            },
            {
              id: 'doc-2',
              embedding: '[0.4,0.5,0.6]',
              metadata: null,
              content: null,
              distance: 0.5,
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
      expect(results[0].score).toBeCloseTo(0.9) // 1 - 0.1
      expect(results[0].record.embedding).toEqual([0.1, 0.2, 0.3])
      expect(results[0].record.metadata).toEqual({ source: 'web' })
      expect(results[0].record.content).toBe('Hello world')

      expect(results[1].record.id).toBe('doc-2')
      expect(results[1].score).toBeCloseTo(0.5) // 1 - 0.5
      expect(results[1].record.metadata).toBeUndefined()
      expect(results[1].record.content).toBeUndefined()
    })

    it('throws when collection does not exist', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })
      mockPool.query.mockResolvedValueOnce({ rows: [] })

      await expect(
        provider.query({ collection: 'nonexistent', embedding: [0.1], topK: 5 }),
      ).rejects.toThrow('Collection "nonexistent" does not exist')
    })

    it('filters results by minScore', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ name: 'docs', dimension: 2, metric: 'cosine' }],
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 'close', embedding: '[0.1,0.2]', metadata: null, content: null, distance: 0.05 },
            { id: 'far', embedding: '[0.9,0.8]', metadata: null, content: null, distance: 0.8 },
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
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ name: 'docs', dimension: 2, metric: 'cosine' }],
        })
        .mockResolvedValueOnce({ rows: [] })

      await provider.query({
        collection: 'docs',
        embedding: [0.1, 0.2],
        filter: [
          { field: 'source', operator: 'eq', value: 'web' },
          { field: 'score', operator: 'gt', value: 0.8 },
        ],
      })

      const queryCall = mockPool.query.mock.calls[1]
      const sql = queryCall[0] as string
      expect(sql).toContain('WHERE')
      expect(sql).toContain("metadata->>'source'")
      expect(sql).toContain("metadata->>'score'")
      expect(queryCall[1]).toContain('web')
    })

    it('applies in filter with multiple values', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ name: 'docs', dimension: 2, metric: 'cosine' }],
        })
        .mockResolvedValueOnce({ rows: [] })

      await provider.query({
        collection: 'docs',
        embedding: [0.1, 0.2],
        filter: [{ field: 'type', operator: 'in', value: ['pdf', 'doc'] }],
      })

      const queryCall = mockPool.query.mock.calls[1]
      const sql = queryCall[0] as string
      expect(sql).toContain('IN')
      expect(queryCall[1]).toContain('pdf')
      expect(queryCall[1]).toContain('doc')
    })

    it('uses euclidean distance scoring', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ name: 'docs', dimension: 2, metric: 'euclidean' }],
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 'doc-1', embedding: '[0.1,0.2]', metadata: null, content: null, distance: 1.0 },
          ],
        })

      const results = await provider.query({
        collection: 'docs',
        embedding: [0.1, 0.2],
      })

      // euclidean score = 1 / (1 + distance) = 1 / (1 + 1) = 0.5
      expect(results[0].score).toBeCloseTo(0.5)
    })

    it('defaults topK to 10', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ name: 'docs', dimension: 2, metric: 'cosine' }],
        })
        .mockResolvedValueOnce({ rows: [] })

      await provider.query({ collection: 'docs', embedding: [0.1, 0.2] })

      const sql = mockPool.query.mock.calls[1][0] as string
      expect(sql).toContain('LIMIT 10')
    })
  })

  // =========================================================================
  // fetch()
  // =========================================================================

  describe('fetch()', () => {
    it('fetches records by IDs', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'doc-1',
            embedding: '[0.1,0.2,0.3]',
            metadata: { source: 'web' },
            content: 'Hello',
          },
        ],
      })

      const records = await provider.fetch({
        collection: 'documents',
        ids: ['doc-1', 'doc-missing'],
      })

      expect(records).toHaveLength(1)
      expect(records[0].id).toBe('doc-1')
      expect(records[0].embedding).toEqual([0.1, 0.2, 0.3])
      expect(records[0].metadata).toEqual({ source: 'web' })
      expect(records[0].content).toBe('Hello')
    })

    it('returns empty array for empty ids', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })

      const records = await provider.fetch({ collection: 'documents', ids: [] })
      expect(records).toEqual([])
    })
  })

  // =========================================================================
  // delete()
  // =========================================================================

  describe('delete()', () => {
    it('deletes records by IDs', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })
      mockClient.query.mockResolvedValue({ rows: [] })
      mockPool.query.mockResolvedValue({ rows: [] })

      await provider.delete({ collection: 'documents', ids: ['doc-1', 'doc-2'] })

      const deleteCall = mockPool.query.mock.calls.find(
        (c: unknown[]) =>
          typeof c[0] === 'string' && (c[0] as string).includes('DELETE FROM'),
      )
      expect(deleteCall).toBeDefined()
      expect(deleteCall![1]).toEqual(['doc-1', 'doc-2'])
    })

    it('skips when ids array is empty', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })

      await provider.delete({ collection: 'documents', ids: [] })
      expect(mockPool.query).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // destroy()
  // =========================================================================

  describe('destroy()', () => {
    it('ends the connection pool', async () => {
      const provider = createProvider({ connectionString: 'postgresql://localhost/test' })

      await provider.destroy()

      expect(mockPool.end).toHaveBeenCalledTimes(1)
    })
  })

  // =========================================================================
  // Custom configuration
  // =========================================================================

  describe('custom table prefix and schema', () => {
    it('uses custom schema and prefix', async () => {
      const provider = createProvider({
        connectionString: 'postgresql://localhost/test',
        schema: 'vectors',
        tablePrefix: 'vs_',
      })
      mockClient.query.mockResolvedValue({ rows: [] })

      await provider.createCollection({ name: 'docs', dimension: 256 })

      const calls = mockClient.query.mock.calls.map((c: unknown[]) => c[0] as string)

      expect(calls.some((c) => c.includes('"vectors"."vs_docs"'))).toBe(true)
      expect(calls.some((c) => c.includes('"vectors"."vs_collections"'))).toBe(true)
    })
  })
})
