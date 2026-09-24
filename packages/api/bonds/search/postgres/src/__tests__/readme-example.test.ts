/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the pool is bonded through the real
 * `setPool`, with only the postgresql driver pool replaced by an in-test pool
 * that records SQL and answers the search queries.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import { setPool } from '@molecule/api-database'
import { pool } from '@molecule/api-database-postgresql'
import { createIndex, index, search, setProvider } from '@molecule/api-search'

const { calls, fakePool } = vi.hoisted(() => {
  const calls: Array<{ sql: string; params: unknown[] }> = []
  const fakePool = {
    async query(sql: string, params: unknown[] = []) {
      calls.push({ sql, params })
      if (sql.startsWith('SELECT fields FROM search_schema_meta')) {
        return { rows: [{ fields: { name: 'text', category: 'keyword', price: 'number' } }] }
      }
      if (sql.startsWith('SELECT COUNT(*)')) return { rows: [{ total: '1' }], rowCount: 1 }
      if (sql.startsWith('SELECT id, document')) {
        return {
          rows: [
            {
              id: 'p1',
              document: { name: 'Wireless Headphones', category: 'audio', price: 99 },
              score: 0.06,
            },
          ],
          rowCount: 1,
        }
      }
      return { rows: [], rowCount: 0 }
    },
    connect: vi.fn(),
    end: vi.fn(),
  }
  return { calls, fakePool }
})

vi.mock('@molecule/api-database-postgresql', () => ({ pool: fakePool }))

import { createProvider } from '../index.js'

describe('README @example', () => {
  it('creates the index table, indexes a document and full-text searches it', async () => {
    setPool(pool)
    setProvider(createProvider({ searchConfig: 'english', tablePrefix: 'search_' }))

    await createIndex('products', {
      fields: { name: 'text', category: 'keyword', price: 'number' },
      sortableFields: ['price'],
    })

    await index('products', 'p1', { name: 'Wireless Headphones', category: 'audio', price: 99 })

    const result = await search('products', {
      text: 'headphones',
      filters: { category: 'audio' },
      sort: [{ field: 'price', direction: 'asc' }],
      page: 1,
      perPage: 20,
    })

    const sqls = calls.map((c) => c.sql)
    expect(sqls[0]).toContain('CREATE TABLE IF NOT EXISTS search_products')

    const insert = calls.find((c) => c.sql.includes('INSERT INTO search_products'))
    expect(insert?.params).toEqual([
      'p1',
      JSON.stringify({ name: 'Wireless Headphones', category: 'audio', price: 99 }),
      'english',
      expect.stringContaining('Wireless Headphones'),
    ])

    const select = calls.find((c) => c.sql.startsWith('SELECT id, document'))
    expect(select?.sql).toContain('search_vector @@ to_tsquery($1, $2)')
    expect(select?.sql).toContain('document->>$3::text = $4')
    expect(select?.sql).toContain('(document->>$5::text)::double precision ASC')
    expect(select?.params).toEqual([
      'english',
      "'headphones':*",
      'category',
      'audio',
      'price',
      20,
      0,
    ])

    expect(result.total).toBe(1)
    expect(result.hits[0]?.id).toBe('p1')
    expect(result.hits[0]?.document.name).toBe('Wireless Headphones')
  })
})
