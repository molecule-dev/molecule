/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real
 * `@molecule/api-ai-vector-store` core. Only the database driver (`pg` /
 * `pgvector`) is mocked, the same way `provider.test.ts` does.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const { mockPool, mockClient, poolOptions } = vi.hoisted(() => {
  const mockClient = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn(),
  }
  const mockPool = {
    connect: vi.fn().mockResolvedValue(mockClient),
    query: vi.fn(),
    end: vi.fn(),
  }
  const poolOptions: unknown[] = []
  return { mockPool, mockClient, poolOptions }
})

vi.mock('pg', () => ({
  default: {
    Pool: class MockPool {
      connect = mockPool.connect
      query = mockPool.query
      end = mockPool.end
      constructor(options: unknown) {
        poolOptions.push(options)
      }
    },
  },
}))

vi.mock('pgvector', () => ({
  fromSql: vi.fn((value: string) => value.replace('[', '').replace(']', '').split(',').map(Number)),
}))

vi.mock('pgvector/pg', () => ({
  registerTypes: vi.fn(),
  toSql: vi.fn((arr: number[]) => `[${arr.join(',')}]`),
}))

import { requireProvider, setProvider } from '@molecule/api-ai-vector-store'

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('creates a collection, upserts records and returns the nearest filtered match', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://app@db.example.com/app')
    let registered = false
    mockPool.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM "public"."mol_vectors_collections" WHERE name')) {
        return { rows: registered ? [{ name: 'docs', dimension: 3, metric: 'cosine' }] : [] }
      }
      if (sql.includes('AS distance')) {
        return {
          rows: [
            {
              id: 'login',
              embedding: '[0,0.2,0.9]',
              metadata: { topic: 'auth' },
              content: 'Reset password',
              distance: 0.01,
            },
          ],
        }
      }
      return { rows: [] }
    })
    mockClient.query.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO "public"."mol_vectors_collections"')) registered = true
      return { rows: [] }
    })

    setProvider(createProvider({ connectionString: process.env.DATABASE_URL }))

    const store = requireProvider()
    await store.createCollection({ name: 'docs', dimension: 3, metric: 'cosine' })
    await store.upsert({
      collection: 'docs',
      records: [
        {
          id: 'billing',
          embedding: [0.9, 0.1, 0],
          metadata: { topic: 'billing' },
          content: 'Invoices',
        },
        {
          id: 'login',
          embedding: [0, 0.2, 0.9],
          metadata: { topic: 'auth' },
          content: 'Reset password',
        },
      ],
    })

    const hits = await store.query({
      collection: 'docs',
      embedding: [0, 0.1, 1],
      topK: 1,
      filter: [{ field: 'topic', operator: 'eq', value: 'auth' }],
    })

    expect([hits[0]?.record.id, hits[0]?.record.content, hits[0]?.score]).toEqual([
      'login',
      'Reset password',
      0.99,
    ])

    expect(poolOptions.at(-1)).toEqual({
      connectionString: 'postgres://app@db.example.com/app',
      max: 5,
    })
    const clientSql = mockClient.query.mock.calls.map((call) => String(call[0]))
    expect(clientSql).toContain('CREATE EXTENSION IF NOT EXISTS vector')
    expect(clientSql.some((sql) => sql.includes('embedding vector(3) NOT NULL'))).toBe(true)
    expect(
      mockClient.query.mock.calls.filter((call) => String(call[0]).includes('ON CONFLICT (id)')),
    ).toHaveLength(2)
    const queryCall = mockPool.query.mock.calls.find((call) =>
      String(call[0]).includes('AS distance'),
    )
    expect(String(queryCall?.[0])).toContain("metadata->>'topic' = $2")
    expect(queryCall?.[1]).toEqual(['[0,0.1,1]', 'auth'])
  })
})
