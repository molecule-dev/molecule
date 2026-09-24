/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real LLM RAG bond over the
 * OpenAI embeddings, in-memory vector store and Anthropic chat bonds. Only the
 * network is mocked: `fetch` answers the OpenAI embeddings and Anthropic
 * Messages endpoints with real response bodies.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setProvider as setAi } from '@molecule/api-ai'
import { createProvider as createAnthropic } from '@molecule/api-ai-anthropic'
import { setProvider as setEmbeddings } from '@molecule/api-ai-embeddings'
import { createProvider as createOpenaiEmbeddings } from '@molecule/api-ai-embeddings-openai'
import { provider as rag } from '@molecule/api-ai-rag-llm'
import { setProvider as setVectorStore } from '@molecule/api-ai-vector-store'
import { provider as vectorStore } from '@molecule/api-ai-vector-store-memory'

import { requireProvider, setProvider } from '../index.js'

const VECTORS: Record<string, number[]> = {
  'Employees accrue 15 PTO days per year.': [1, 0, 0],
  'Remote work is allowed up to 3 days per week.': [0, 1, 0],
  'How many PTO days do I get?': [0.9, 0.1, 0],
}

/**
 * Serves the two upstream APIs the example reaches.
 *
 * @param url - The requested URL.
 * @param init - The request options.
 * @returns A real-shaped JSON response for the endpoint.
 */
async function upstream(url: string, init: RequestInit): Promise<Response> {
  const body = JSON.parse(init.body as string) as Record<string, unknown>
  if (url.endsWith('/v1/embeddings')) {
    const inputs = body.input as string[]
    return Response.json({
      object: 'list',
      data: inputs.map((text, index) => ({
        object: 'embedding',
        index,
        embedding: VECTORS[text] ?? [0, 0, 1],
      })),
      model: 'text-embedding-3-small',
      usage: { prompt_tokens: 10, total_tokens: 10 },
    })
  }
  if (url.endsWith('/v1/messages')) {
    return Response.json({
      content: [{ type: 'text', text: 'You accrue 15 PTO days per year [1].' }],
      usage: { input_tokens: 80, output_tokens: 12 },
    })
  }
  return new Response('not found', { status: 404 })
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('wires all dependencies, ingests a corpus and answers grounded in the top source', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-openai-test')
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    const fetchMock = vi.fn(upstream)
    vi.stubGlobal('fetch', fetchMock)

    setEmbeddings(createOpenaiEmbeddings({ apiKey: process.env.OPENAI_API_KEY }))
    setVectorStore(vectorStore)
    setAi(createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))
    setProvider(rag)

    const { indexed } = await requireProvider().ingest({
      collection: 'handbook',
      documents: [
        { id: 'pto', text: 'Employees accrue 15 PTO days per year.' },
        { id: 'wfh', text: 'Remote work is allowed up to 3 days per week.' },
      ],
    })

    const { answer, sources } = await requireProvider().query({
      collection: 'handbook',
      query: 'How many PTO days do I get?',
      topK: 1,
    })

    expect(indexed).toBe(2)
    expect(answer).toBe('You accrue 15 PTO days per year [1].')
    expect(sources).toHaveLength(1)
    expect(sources[0]?.id).toBe('pto')

    // The chat request carried the retrieved chunk as numbered context.
    const chatCall = fetchMock.mock.calls.find(([url]) => url.endsWith('/v1/messages'))
    const chatBody = JSON.parse(chatCall?.[1].body as string) as {
      messages: Array<{ content: string }>
    }
    expect(chatBody.messages[0]?.content).toContain('[1] Employees accrue 15 PTO days per year.')
  })
})
