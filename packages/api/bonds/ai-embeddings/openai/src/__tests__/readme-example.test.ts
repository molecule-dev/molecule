/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real embeddings core.
 * Only the network is mocked: `fetch` returns real `/v1/embeddings` responses.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireProvider, setProvider } from '@molecule/api-ai-embeddings'

import { createProvider } from '../index.js'

/**
 * Builds an OpenAI `/v1/embeddings` JSON response with `count` vectors of `dims` length.
 *
 * @param count - Number of vectors.
 * @param dims - Vector length.
 * @param totalTokens - The reported token usage.
 * @returns The fetch Response.
 */
function embeddingsResponse(count: number, dims: number, totalTokens: number): Response {
  const data = Array.from({ length: count }, (_, index) => ({
    object: 'embedding',
    index,
    embedding: new Array<number>(dims).fill(index + 0.5),
  }))
  return new Response(
    JSON.stringify({
      object: 'list',
      data,
      model: 'text-embedding-3-small',
      usage: { prompt_tokens: totalTokens, total_tokens: totalTokens },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds the OpenAI provider, batch-embeds and embeds a query', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(embeddingsResponse(2, 512, 11))
      .mockResolvedValueOnce(embeddingsResponse(1, 512, 4))
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createProvider({
        apiKey: process.env.OPENAI_API_KEY,
        defaultModel: 'text-embedding-3-small',
        dimensions: 512,
      }),
    )

    const { embeddings, usage } = await requireProvider().embed({
      input: ['How do I reset my password?', 'Billing and invoices'],
    })
    const query = await requireProvider().embedQuery('forgot my password')

    expect([embeddings.length, embeddings[0]?.length, query.length, usage.totalTokens]).toEqual([
      2, 512, 512, 11,
    ])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/v1\/embeddings$/)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test')
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'text-embedding-3-small',
      input: ['How do I reset my password?', 'Billing and invoices'],
      encoding_format: 'float',
      dimensions: 512,
    })
  })
})
