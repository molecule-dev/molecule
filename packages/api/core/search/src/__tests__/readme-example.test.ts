/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — through the Meilisearch bond and the
 * real `meilisearch` client. Only the network is replaced: `fetch` is stubbed
 * with a tiny in-memory Meilisearch (documents, tasks, search).
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-search-meilisearch'

import { deleteDocument, hasProvider, index, search, setProvider } from '../index.js'

type Doc = Record<string, unknown> & { id: string }

/**
 * A minimal fake Meilisearch HTTP API: enough for add/delete document tasks,
 * task polling, and substring search with highlighting.
 *
 * @returns The fetch stub and the backing document store.
 */
const fakeMeilisearch = (): {
  fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
  docs: Map<string, Doc>
} => {
  const docs = new Map<string, Doc>()
  let taskUid = 0
  const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  const task = (type: string): Response =>
    json(
      {
        taskUid: ++taskUid,
        indexUid: 'products',
        status: 'enqueued',
        type,
        enqueuedAt: new Date().toISOString(),
      },
      202,
    )

  const fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    const method = init?.method ?? 'GET'
    const body = init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined
    const path = url.pathname

    if (method === 'POST' && path === '/indexes/products/documents') {
      for (const doc of body as Doc[]) docs.set(doc.id, doc)
      return task('documentAdditionOrUpdate')
    }
    const del = /^\/indexes\/products\/documents\/(.+)$/.exec(path)
    if (method === 'DELETE' && del?.[1]) {
      docs.delete(decodeURIComponent(del[1]))
      return task('documentDeletion')
    }
    const polled = /^\/tasks\/(\d+)$/.exec(path)
    if (method === 'GET' && polled?.[1]) {
      return json({
        uid: Number(polled[1]),
        indexUid: 'products',
        status: 'succeeded',
        type: 'documentAdditionOrUpdate',
        enqueuedAt: new Date().toISOString(),
      })
    }
    if (method === 'POST' && path === '/indexes/products/search') {
      const { q = '' } = body as { q?: string }
      const hits = [...docs.values()]
        .filter((doc) => String(doc.name).toLowerCase().includes(q.toLowerCase()))
        .map((doc) => ({
          ...doc,
          _rankingScore: 0.9,
          _formatted: { ...doc, name: String(doc.name).replace(/widget/i, (m) => `<em>${m}</em>`) },
        }))
      return json({ hits, estimatedTotalHits: hits.length, processingTimeMs: 1, query: q })
    }
    return json({ message: `unhandled ${method} ${path}`, code: 'not_found' }, 404)
  }

  return { fetch, docs }
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('bonds Meilisearch when provisioned, indexes on write, and searches with highlights', async () => {
    const meili = fakeMeilisearch()
    vi.stubGlobal('fetch', vi.fn(meili.fetch))
    vi.stubEnv('MEILISEARCH_URL', 'http://meilisearch.example.com:7700')
    vi.stubEnv('MEILISEARCH_API_KEY', 'test-key')

    if (process.env.MEILISEARCH_URL) {
      setProvider(
        createProvider({
          host: process.env.MEILISEARCH_URL,
          apiKey: process.env.MEILISEARCH_API_KEY ?? '',
        }),
      )
    }

    if (hasProvider()) {
      await index('products', 'p1', { name: 'Blue Widget', category: 'tools', price: 9.99 })
      await index('products', 'p2', { name: 'Red Wagon', category: 'toys', price: 49 })
      await deleteDocument('products', 'p2')
    }
    expect([...meili.docs.keys()]).toEqual(['p1'])

    const searchProducts = async (text: string) =>
      hasProvider() ? search('products', { text, page: 1, perPage: 20, highlight: true }) : null

    const results = await searchProducts('widget')
    expect(results?.total).toBe(1)
    expect(results?.hits[0]).toMatchObject({
      id: 'p1',
      score: 0.9,
      document: { name: 'Blue Widget', category: 'tools', price: 9.99 },
      highlights: { name: ['Blue <em>Widget</em>'] },
    })

    // Browse mode: empty text returns everything still indexed.
    expect((await searchProducts(''))?.hits.map((hit) => hit.id)).toEqual(['p1'])
  })
})
