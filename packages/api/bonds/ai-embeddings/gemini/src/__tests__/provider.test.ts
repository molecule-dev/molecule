import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createProvider,
  GEMINI_EMBEDDINGS_DEFAULT_BASE_URL,
  GeminiEmbeddingsError,
  provider,
} from '../provider.js'
import { aiEmbeddingsGeminiSecretDefinitions } from '../secrets.js'

const mockFetch = vi.fn()

/** A successful batchEmbedContents response with one vector per request. */
function okResponse(vectors: number[][], promptTokenCount = 7): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue({
      embeddings: vectors.map((values) => ({ values })),
      usageMetadata: { promptTokenCount },
    }),
  }
}

/** An error response. */
function errorResponse(status: number, body: string): Record<string, unknown> {
  return { ok: false, status, headers: new Headers(), text: vi.fn().mockResolvedValue(body) }
}

/** Echo one vector per request in the body. */
function echo(): void {
  mockFetch.mockImplementation(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as { requests: unknown[] }
    return okResponse(body.requests.map((_, i) => [i, 0.5]))
  })
}

/** The parsed body of fetch call `n`. */
function sentBody(n = 0): {
  requests: { model: string; content: { parts: unknown[] }; output_dimensionality?: number }[]
} {
  return JSON.parse((mockFetch.mock.calls[n] as [string, RequestInit])[1].body as string)
}

describe('@molecule/api-ai-embeddings-gemini', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.useFakeTimers()
    mockFetch.mockReset()
    delete process.env.GOOGLE_AI_API_KEY
    delete process.env.GEMINI_API_KEY
    delete process.env.GOOGLE_AI_BASE_URL
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('posts batchEmbedContents with the key header and a document-prefixed text', async () => {
    mockFetch.mockResolvedValue(okResponse([[0.1, 0.2]], 12))
    const result = await createProvider({ apiKey: 'k' }).embed({ input: 'Mars is red.' })

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(
      `${GEMINI_EMBEDDINGS_DEFAULT_BASE_URL}/models/gemini-embedding-2:batchEmbedContents`,
    )
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', 'x-goog-api-key': 'k' })
    expect(sentBody()).toEqual({
      requests: [
        {
          model: 'models/gemini-embedding-2',
          content: { parts: [{ text: 'title: none | text: Mars is red.' }] },
        },
      ],
    })
    expect(result).toEqual({
      embeddings: [[0.1, 0.2]],
      model: 'gemini-embedding-2',
      usage: { promptTokens: 12, totalTokens: 12 },
    })
  })

  it('sends one request per text (never one merged vector) and keeps order', async () => {
    echo()
    const vectors = await createProvider({ apiKey: 'k' }).embedDocuments(['a', 'b', 'c'])
    expect(sentBody().requests).toHaveLength(3)
    expect(vectors.map((vector) => vector[0])).toEqual([0, 1, 2])
  })

  it('embedQuery uses the query prefix; task and applyPrefixes are honoured', async () => {
    echo()
    await createProvider({ apiKey: 'k' }).embedQuery('red planet?')
    await createProvider({ apiKey: 'k', task: 'code-retrieval' }).embedQuery('sort a list')
    await createProvider({ apiKey: 'k', applyPrefixes: false }).embedQuery('raw')
    await createProvider({ apiKey: 'k' }).embed({ input: 'task: clustering | query: x' })
    expect([0, 1, 2, 3].map((n) => sentBody(n).requests[0]?.content.parts[0])).toEqual([
      { text: 'task: search result | query: red planet?' },
      { text: 'task: code retrieval | query: sort a list' },
      { text: 'raw' },
      { text: 'task: clustering | query: x' },
    ])
  })

  it('sends output_dimensionality and validates its range', async () => {
    echo()
    await createProvider({ apiKey: 'k', dimensions: 768 }).embed({ input: 'x' })
    expect(sentBody().requests[0]?.output_dimensionality).toBe(768)
    await expect(
      createProvider({ apiKey: 'k' }).embed({ input: 'x', dimensions: 64 }),
    ).rejects.toThrow(/128 to 3072/)
  })

  it('splits large lists into maxBatchSize chunks and sums usage', async () => {
    echo()
    const result = await createProvider({ apiKey: 'k', maxBatchSize: 2 }).embed({
      input: ['a', 'b', 'c', 'd', 'e'],
    })
    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(result.embeddings).toHaveLength(5)
    expect(result.usage.promptTokens).toBe(21)
  })

  it('embedContent builds multi-part requests: inline bytes, file URIs, placeholders stripped', async () => {
    echo()
    const gemini = createProvider({ apiKey: 'k' })
    expect(gemini.modalities).toEqual(['text', 'image', 'audio', 'video'])
    const result = await gemini.embedContent!({
      inputs: [
        {
          text: 'my cats <|image|>',
          image: { data: new Uint8Array([1, 2, 3]), mimeType: 'image/png' },
        },
        {
          video: {
            data: 'https://generativelanguage.googleapis.com/v1beta/files/abc',
            mimeType: 'video/mp4',
          },
        },
        { audio: { data: new Uint8Array([9]), mimeType: 'audio/wav' } },
      ],
      inputType: 'query',
      dimensions: 1536,
    })
    expect(result.embeddings).toHaveLength(3)
    expect(sentBody().requests.map((request) => request.content.parts)).toEqual([
      [
        { text: 'task: search result | query: my cats' },
        { inline_data: { mime_type: 'image/png', data: 'AQID' } },
      ],
      [
        {
          file_data: {
            mime_type: 'video/mp4',
            file_uri: 'https://generativelanguage.googleapis.com/v1beta/files/abc',
          },
        },
      ],
      [{ inline_data: { mime_type: 'audio/wav', data: 'CQ==' } }],
    ])
    expect(sentBody().requests[0]?.output_dimensionality).toBe(1536)
  })

  it('embedContent rejects media without a MIME type and empty inputs', async () => {
    const gemini = createProvider({ apiKey: 'k' })
    await expect(
      gemini.embedContent!({ inputs: [{ image: new Uint8Array([1]) }] }),
    ).rejects.toThrow(/MIME type/)
    await expect(gemini.embedContent!({ inputs: [{ text: '<|image|>' }] })).rejects.toThrow(
      /needs text, image, audio or video/,
    )
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns empty results without calling the API', async () => {
    const gemini = createProvider({ apiKey: 'k' })
    expect((await gemini.embed({ input: [] })).embeddings).toEqual([])
    expect(await gemini.embedDocuments([])).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('a missing key throws the tagged config error at call time', async () => {
    const gemini = createProvider()
    const error = await gemini.embed({ input: 'x' }).catch((caught: unknown) => caught)
    expect(error).toMatchObject({ statusCode: 503, errorKey: 'config.notConfigured' })
    expect((error as Error).message).toMatch(/GOOGLE_AI_API_KEY/)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('reads GOOGLE_AI_API_KEY, then GEMINI_API_KEY, per request', async () => {
    echo()
    const gemini = createProvider()
    process.env.GEMINI_API_KEY = 'gemini-key'
    await gemini.embedQuery('x')
    process.env.GOOGLE_AI_API_KEY = 'google-key'
    await gemini.embedQuery('x')
    const keys = mockFetch.mock.calls.map(
      (call) =>
        ((call as [string, RequestInit])[1].headers as Record<string, string>)['x-goog-api-key'],
    )
    expect(keys).toEqual(['gemini-key', 'google-key'])
  })

  it('honours GOOGLE_AI_BASE_URL and allows a keyless gateway', async () => {
    echo()
    process.env.GOOGLE_AI_BASE_URL = 'https://gateway.test/v1beta/'
    await createProvider({ defaultModel: 'gemini-embedding-001' }).embedQuery('x')
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://gateway.test/v1beta/models/gemini-embedding-001:batchEmbedContents')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('throws GeminiEmbeddingsError with Google’s status and code', async () => {
    mockFetch.mockResolvedValue(
      errorResponse(
        400,
        JSON.stringify({ error: { code: 400, message: 'bad part', status: 'INVALID_ARGUMENT' } }),
      ),
    )
    const error = await createProvider({ apiKey: 'k' })
      .embed({ input: 'x' })
      .catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(GeminiEmbeddingsError)
    expect(error).toMatchObject({ status: 400, code: 'INVALID_ARGUMENT' })
    expect(error).not.toHaveProperty('statusCode')
    expect((error as Error).message).toMatch(/bad part/)
  })

  it('retries 429 then succeeds; gives up after 3 retries', async () => {
    mockFetch
      .mockResolvedValueOnce(errorResponse(429, 'slow down'))
      .mockResolvedValueOnce(okResponse([[1]]))
    const pending = createProvider({ apiKey: 'k' }).embedQuery('x')
    await vi.runAllTimersAsync()
    expect(await pending).toEqual([1])
    expect(mockFetch).toHaveBeenCalledTimes(2)

    mockFetch.mockReset()
    mockFetch.mockResolvedValue(errorResponse(503, '<html>unavailable</html>'))
    const failing = createProvider({ apiKey: 'k' })
      .embedQuery('x')
      .catch((caught: unknown) => caught)
    await vi.runAllTimersAsync()
    expect(await failing).toMatchObject({ status: 503 })
    expect(mockFetch).toHaveBeenCalledTimes(4)
  })

  it('rejects a response with the wrong number of embeddings', async () => {
    mockFetch.mockResolvedValue(okResponse([[1]]))
    await expect(createProvider({ apiKey: 'k' }).embedDocuments(['a', 'b'])).rejects.toBeInstanceOf(
      GeminiEmbeddingsError,
    )
  })

  it('exports a lazy provider and the shared key definition', () => {
    expect(provider.name).toBe('gemini')
    expect(typeof provider.embedContent).toBe('function')
    expect(aiEmbeddingsGeminiSecretDefinitions[0]?.key).toBe('GOOGLE_AI_API_KEY')
  })
})
