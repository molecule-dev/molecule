/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: real Anthropic chat, OpenAI embeddings
 * and in-memory vector-store bonds. Only the network is mocked — `fetch`
 * answers the OpenAI embeddings API with JSON and the Anthropic Messages API
 * with an SSE stream.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setProvider as setAIProvider } from '@molecule/api-ai'
import { createProvider as createChatProvider } from '@molecule/api-ai-anthropic'
import { setProvider as setEmbeddingsProvider } from '@molecule/api-ai-embeddings'
import { createProvider as createEmbeddingsProvider } from '@molecule/api-ai-embeddings-openai'
import {
  requireProvider as requireVectorStore,
  setProvider as setVectorStoreProvider,
} from '@molecule/api-ai-vector-store'
import { provider as memoryVectorStore } from '@molecule/api-ai-vector-store-memory'

import { answerQuestion, indexDocument } from '../index.js'

/**
 * Builds a streaming fetch Response whose Anthropic SSE stream yields `text` as one text block.
 *
 * @param text - The model's full reply text.
 * @returns A minimal streaming Response.
 */
function sseTextResponse(text: string): Response {
  const events: Array<Record<string, unknown>> = [
    { type: 'message_start', message: { usage: { input_tokens: 40 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', usage: { output_tokens: 30 } },
    { type: 'message_stop' },
  ]
  const body = events.map((e) => `data: ${JSON.stringify(e)}`).join('\n') + '\n'
  return new Response(new TextEncoder().encode(body), {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

/**
 * Builds an OpenAI embeddings JSON response with one fixed unit vector per input.
 *
 * @param count - Number of inputs in the request.
 * @returns A JSON Response shaped like `POST /v1/embeddings`.
 */
function embeddingsResponse(count: number): Response {
  const vector = [1, ...new Array<number>(255).fill(0)]
  const data = Array.from({ length: count }, (_, index) => ({
    object: 'embedding',
    index,
    embedding: vector,
  }))
  return new Response(
    JSON.stringify({
      object: 'list',
      data,
      model: 'text-embedding-3-small',
      usage: { prompt_tokens: 10, total_tokens: 10 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('indexes a document and answers a question grounded in it', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    vi.stubEnv('OPENAI_API_KEY', 'sk-openai-test')
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/v1/embeddings')) {
        const body = JSON.parse(init?.body as string) as { input: string[] }
        return embeddingsResponse(body.input.length)
      }
      if (url.endsWith('/v1/messages')) {
        return sseTextResponse('Set JWT_SECRET and bond an auth provider at startup [1].')
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    setAIProvider(createChatProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))
    setEmbeddingsProvider(
      createEmbeddingsProvider({ apiKey: process.env.OPENAI_API_KEY, dimensions: 256 }),
    )
    setVectorStoreProvider(memoryVectorStore)
    await requireVectorStore().createCollection({ name: 'docs', dimension: 256, metric: 'cosine' })

    const ids = await indexDocument({
      collection: 'docs',
      documentId: 'getting-started',
      text: 'To configure auth, set JWT_SECRET and bond an auth provider at startup.',
      metadata: { source: 'README.md' },
    })
    expect(ids).toEqual(['getting-started::0'])

    const { answer, sources } = await answerQuestion({
      collection: 'docs',
      question: 'How do I configure auth?',
    })

    expect(answer).toBe('Set JWT_SECRET and bond an auth provider at startup [1].')
    expect(sources).toHaveLength(1)
    expect(sources[0]?.metadata?.source).toBe('README.md')

    const chatCall = fetchMock.mock.calls.find(([url]) => url.endsWith('/v1/messages'))
    expect(chatCall).toBeDefined()
    const chatInit = (chatCall as unknown as [string, RequestInit])[1]
    const chatBody = JSON.parse(chatInit.body as string) as {
      messages: Array<{ content: string }>
    }
    expect(chatBody.messages[0]?.content).toContain('[1] To configure auth, set JWT_SECRET')
    const embedCall = fetchMock.mock.calls.find(([url]) => url.endsWith('/v1/embeddings'))
    const embedInit = (embedCall as unknown as [string, RequestInit])[1]
    expect(JSON.parse(embedInit.body as string)).toMatchObject({ dimensions: 256 })
  })
})
