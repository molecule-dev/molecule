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

    it('does not create dead per-field typed columns for schema fields', async () => {
      const p = createProvider()
      await p.createIndex('products', {
        fields: { price: 'number', name: 'text' },
        searchableFields: ['name'],
        filterableFields: ['price'],
      })

      const createTableCall = mockQuery.mock.calls
        .map((c: unknown[]) => c[0] as string)
        .find((sql) => sql.includes('CREATE TABLE IF NOT EXISTS search_products'))

      expect(createTableCall).toBeDefined()
      expect(createTableCall).not.toContain('DOUBLE PRECISION')
      expect(createTableCall).not.toContain(' price ')
    })

    it('records the schema field types in a metadata table for later sort-type casting', async () => {
      const p = createProvider()
      await p.createIndex('products', {
        fields: { price: 'number', name: 'text' },
        searchableFields: ['name'],
        sortableFields: ['price'],
      })

      const calls = mockQuery.mock.calls as [string, unknown[]?][]
      const metaCreate = calls.find(
        ([sql]) => sql.includes('CREATE TABLE') && sql.includes('search_schema_meta'),
      )
      const metaInsert = calls.find(
        ([sql]) => sql.includes('INSERT INTO') && sql.includes('search_schema_meta'),
      )

      expect(metaCreate).toBeDefined()
      expect(metaInsert).toBeDefined()
      expect(metaInsert?.[1]).toEqual([
        'search_products',
        JSON.stringify({ price: 'number', name: 'text' }),
      ])
    })

    it('does not write schema metadata when createIndex is called without a schema', async () => {
      const p = createProvider()
      await p.createIndex('products')

      const calls = mockQuery.mock.calls.map((c: unknown[]) => c[0] as string)
      expect(calls.some((sql) => sql.includes('schema_meta'))).toBe(false)
    })
  })

  describe('deleteIndex', () => {
    it('should drop the table', async () => {
      const p = createProvider()
      await p.deleteIndex('products')

      const sql = mockQuery.mock.calls[0][0]
      expect(sql).toContain('DROP TABLE IF EXISTS search_products')
    })

    it('also removes any recorded schema metadata for the index', async () => {
      const p = createProvider()
      await p.deleteIndex('products')

      const calls = mockQuery.mock.calls as [string, unknown[]?][]
      const metaDelete = calls.find(
        ([sql]) => sql.includes('DELETE FROM') && sql.includes('search_schema_meta'),
      )
      expect(metaDelete).toBeDefined()
      expect(metaDelete?.[1]).toEqual(['search_products'])
    })

    it('does not fail deleteIndex when the schema metadata table does not exist yet', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // DROP TABLE
        .mockRejectedValueOnce(
          Object.assign(new Error('relation "search_schema_meta" does not exist'), {
            code: '42P01',
          }),
        )

      const p = createProvider()
      await expect(p.deleteIndex('products')).resolves.toBeUndefined()
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
    it('indexes multiple documents with a single batched multi-row INSERT (not one query per doc)', async () => {
      const p = createProvider()
      const result = await p.bulkIndex('products', [
        { id: '1', document: { name: 'Widget' } },
        { id: '2', document: { name: 'Gadget' } },
        { id: '3', document: { name: 'Gizmo' } },
      ])

      expect(result.indexed).toBe(3)
      expect(result.failed).toBe(0)
      expect(mockQuery).toHaveBeenCalledTimes(1)

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).toContain('INSERT INTO search_products')
      expect((sql as string).match(/\(\$\d+, \$\d+, to_tsvector/g)).toHaveLength(3)
      expect(params).toHaveLength(12) // 4 params (id, document, config, content) × 3 docs
    })

    it('returns indexed:0 without querying for an empty document list', async () => {
      const p = createProvider()
      const result = await p.bulkIndex('products', [])

      expect(result).toEqual({ indexed: 0, failed: 0, errors: {} })
      expect(mockQuery).not.toHaveBeenCalled()
    })

    it('falls back to per-row inserts (preserving per-document errors) when the batch INSERT fails', async () => {
      mockQuery
        .mockRejectedValueOnce(new Error('duplicate key value violates unique constraint')) // batch attempt
        .mockResolvedValueOnce({ rows: [] }) // fallback: row 1 succeeds
        .mockRejectedValueOnce(new Error('Constraint violation')) // fallback: row 2 fails

      const p = createProvider()
      const result = await p.bulkIndex('products', [
        { id: '1', document: { name: 'Widget' } },
        { id: '2', document: { name: 'Bad' } },
      ])

      expect(result.indexed).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.errors['2']).toBe('Constraint violation')
      expect(mockQuery).toHaveBeenCalledTimes(3)
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

    it('escapes tsquery operators and quotes in user text (no tsquery syntax errors)', async () => {
      // Verified against a real PostgreSQL 16: unquoted `widget!:*` and `:*`
      // throw `syntax error in tsquery`; the quoted-lexeme forms below parse.
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })

      const p = createProvider()
      await p.search('products', { text: `widget! (deluxe) don't a\\b` })

      const [, params] = mockQuery.mock.calls[0]
      expect(params[1]).toBe(`'widget!':* & '(deluxe)':* & 'don''t':* & 'a\\\\b':*`)
    })

    it('treats empty/whitespace-only text as "browse" mode — matches all documents instead of erroring or returning zero hits', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: '1', document: '{"name":"Widget"}', score: 0 }],
        })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })

      const p = createProvider()
      const result = await p.search('products', { text: '   ' })

      expect(mockQuery).toHaveBeenCalled()
      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).not.toContain('to_tsquery')
      expect(sql).toContain('1 = 1')
      expect(params).toEqual([20, 0]) // just LIMIT/OFFSET — no config/tsquery params
      expect(result.total).toBe(1)
      expect(result.hits).toHaveLength(1)
    })

    it('binds the raw filter field name as a query parameter instead of a sanitized SQL identifier', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })

      const p = createProvider()
      await p.search('products', { text: 'widget', filters: { 'product-type': 'gadget' } })

      const [sql, params] = mockQuery.mock.calls[0]
      expect(sql).not.toContain('product_type')
      expect(sql).toContain('document->>$3::text = $4')
      expect(params).toContain('product-type')
      expect(params).toContain('gadget')
    })

    it('computes facet counts via a GROUP BY query per requested facet field', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // data
        .mockResolvedValueOnce({ rows: [{ total: '0' }] }) // count
        .mockResolvedValueOnce({
          rows: [
            { value: 'electronics', count: '5' },
            { value: 'clothing', count: '3' },
          ],
        }) // facet: category

      const p = createProvider()
      const result = await p.search('products', { text: 'widget', facets: ['category'] })

      expect(result.facets).toBeDefined()
      expect(result.facets!.category).toEqual([
        { value: 'electronics', count: 5 },
        { value: 'clothing', count: 3 },
      ])

      const [facetSql, facetParams] = mockQuery.mock.calls[2]
      expect(facetSql).toContain('GROUP BY')
      expect(facetSql).toContain('document->>$3::text')
      expect(facetParams).toContain('category')
    })

    it('casts a sort field to its declared type recorded at createIndex()', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ fields: { price: 'number' } }] }) // getFieldTypes
        .mockResolvedValueOnce({ rows: [] }) // data
        .mockResolvedValueOnce({ rows: [{ total: '0' }] }) // count

      const p = createProvider()
      await p.search('products', {
        text: 'widget',
        sort: [{ field: 'price', direction: 'asc' }],
      })

      const dataSql = mockQuery.mock.calls[1][0]
      expect(dataSql).toContain('::double precision')
      expect(dataSql).toContain('ASC')
    })

    it('falls back to text-comparison sort when no schema was ever recorded for the index', async () => {
      mockQuery
        .mockRejectedValueOnce(
          Object.assign(new Error('relation "search_schema_meta" does not exist'), {
            code: '42P01',
          }),
        )
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })

      const p = createProvider()
      await p.search('products', {
        text: 'widget',
        sort: [{ field: 'name', direction: 'asc' }],
      })

      const dataSql = mockQuery.mock.calls[1][0]
      expect(dataSql).not.toContain('::double precision')
      expect(dataSql).not.toContain('::timestamptz')
      expect(dataSql).toContain('document->>$3::text')
    })

    it('rethrows unexpected errors from the schema metadata lookup instead of swallowing them', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection lost'))

      const p = createProvider()

      await expect(
        p.search('products', { text: 'widget', sort: [{ field: 'name', direction: 'asc' }] }),
      ).rejects.toThrow('connection lost')
    })

    it('runs ts_headline over the dedicated content column, not the raw JSON document', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: '1',
              document: '{"name":"Widget"}',
              score: 0.5,
              headline: 'a <em>Widget</em>',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })

      const p = createProvider()
      const result = await p.search('products', { text: 'widget', highlight: true })

      const dataSql = mockQuery.mock.calls[0][0]
      expect(dataSql).toContain('ts_headline')
      expect(dataSql).toContain(', content,')
      expect(dataSql).not.toContain('document::text')
      expect(result.hits[0].highlights).toEqual({ _content: ['a <em>Widget</em>'] })
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

    it('escapes tsquery operators in suggest text', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const p = createProvider()
      await p.suggest('products', 'wid!')

      const [, params] = mockQuery.mock.calls[0]
      expect(params[1]).toBe(`'wid!':*`)
    })

    it('returns no suggestions for empty text without querying', async () => {
      const p = createProvider()
      const suggestions = await p.suggest('products', '')

      expect(suggestions).toEqual([])
      expect(mockQuery).not.toHaveBeenCalled()
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
