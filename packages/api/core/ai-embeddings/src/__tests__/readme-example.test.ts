/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the OpenAI embeddings bond.
 * Only the network is mocked: `fetch` returns real `/v1/embeddings` responses.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-ai-embeddings-openai'

import { requireProvider, setProvider } from '../index.js'

/**
 * Builds an OpenAI `/v1/embeddings` JSON response.
 *
 * @param embeddings - One vector per input.
 * @param totalTokens - The reported token usage.
 * @returns The fetch Response.
 */
function embeddingsResponse(embeddings: number[][], totalTokens: number): Response {
  return new Response(
    JSON.stringify({
      object: 'list',
      data: embeddings.map((embedding, index) => ({ object: 'embedding', index, embedding })),
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

  it('bonds the OpenAI provider, batch-embeds documents and embeds a query', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        embeddingsResponse(
          [
            [0.1, 0.2, 0.3],
            [0.4, 0.5, 0.6],
          ],
          11,
        ),
      )
      .mockResolvedValueOnce(embeddingsResponse([[0.1, 0.2, 0.25]], 4))
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createProvider({
        apiKey: process.env.OPENAI_API_KEY,
        defaultModel: 'text-embedding-3-small',
      }),
    )

    const { embeddings, model, usage } = await requireProvider().embed({
      input: ['How do I reset my password?', 'Billing and invoices'],
    })
    expect(embeddings).toHaveLength(2)
    expect(model).toBe('text-embedding-3-small')
    expect(usage.totalTokens).toBe(11)

    const queryVector = await requireProvider().embedQuery('forgot my password')
    expect(queryVector.length === embeddings[0]?.length).toBe(true)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/v1\/embeddings$/)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test')
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: 'text-embedding-3-small',
      input: ['How do I reset my password?', 'Billing and invoices'],
    })
  })
})
