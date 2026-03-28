import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()

/** Creates a successful OpenAI embeddings API response. */
function mockEmbeddingsResponse(
  embeddings: number[][],
  model = 'text-embedding-3-small',
  promptTokens = 10,
  totalTokens = 10,
): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue({
      object: 'list',
      data: embeddings.map((embedding, index) => ({
        object: 'embedding',
        index,
        embedding,
      })),
      model,
      usage: { prompt_tokens: promptTokens, total_tokens: totalTokens },
    }),
  }
}

/** Creates a mock error response. */
function mockErrorResponse(status: number, body: string): Record<string, unknown> {
  return {
    ok: false,
    status,
    statusText: `Status ${status}`,
    text: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OpenaiEmbeddingsProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const provider = createProvider({ apiKey: 'test-key', baseUrl: 'https://test.api' })

  // =========================================================================
  // embed()
  // =========================================================================

  describe('embed()', () => {
    it('generates embeddings for a single text input', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4]
      mockFetch.mockResolvedValue(mockEmbeddingsResponse([embedding]))

      const result = await provider.embed({ input: 'Hello world' })

      expect(result.embeddings).toEqual([embedding])
      expect(result.model).toBe('text-embedding-3-small')
      expect(result.usage).toEqual({ promptTokens: 10, totalTokens: 10 })

      // Verify fetch was called correctly
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://test.api/v1/embeddings')
      const body = JSON.parse(init.body as string)
      expect(body.model).toBe('text-embedding-3-small')
      expect(body.input).toEqual(['Hello world'])
      expect(body.encoding_format).toBe('float')
    })

    it('generates embeddings for multiple text inputs', async () => {
      const embeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ]
      mockFetch.mockResolvedValue(
        mockEmbeddingsResponse(embeddings, 'text-embedding-3-small', 20, 20),
      )

      const result = await provider.embed({ input: ['Hello', 'World'] })

      expect(result.embeddings).toEqual(embeddings)
      expect(result.usage.promptTokens).toBe(20)
    })

    it('returns empty result for empty input array', async () => {
      const result = await provider.embed({ input: [] })

      expect(result.embeddings).toEqual([])
      expect(result.usage.promptTokens).toBe(0)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('uses custom model when specified', async () => {
      mockFetch.mockResolvedValue(mockEmbeddingsResponse([[0.1]], 'text-embedding-3-large'))

      await provider.embed({ input: 'test', model: 'text-embedding-3-large' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.model).toBe('text-embedding-3-large')
    })

    it('sends dimensions parameter when specified', async () => {
      mockFetch.mockResolvedValue(mockEmbeddingsResponse([[0.1, 0.2]]))

      await provider.embed({ input: 'test', dimensions: 256 })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.dimensions).toBe(256)
    })

    it('does not send dimensions when not specified', async () => {
      mockFetch.mockResolvedValue(mockEmbeddingsResponse([[0.1, 0.2]]))

      await provider.embed({ input: 'test' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.dimensions).toBeUndefined()
    })

    it('uses default dimensions from config when not overridden in params', async () => {
      const providerWithDims = createProvider({
        apiKey: 'test-key',
        baseUrl: 'https://test.api',
        dimensions: 512,
      })
      mockFetch.mockResolvedValue(mockEmbeddingsResponse([[0.1]]))

      await providerWithDims.embed({ input: 'test' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.dimensions).toBe(512)
    })

    it('sends correct Authorization header', async () => {
      mockFetch.mockResolvedValue(mockEmbeddingsResponse([[0.1]]))

      await provider.embed({ input: 'test' })

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = init.headers as Record<string, string>
      expect(headers['Authorization']).toBe('Bearer test-key')
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('sorts response embeddings by index', async () => {
      // Simulate out-of-order response
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({
          object: 'list',
          data: [
            { object: 'embedding', index: 1, embedding: [0.4, 0.5] },
            { object: 'embedding', index: 0, embedding: [0.1, 0.2] },
          ],
          model: 'text-embedding-3-small',
          usage: { prompt_tokens: 10, total_tokens: 10 },
        }),
      })

      const result = await provider.embed({ input: ['first', 'second'] })

      expect(result.embeddings[0]).toEqual([0.1, 0.2])
      expect(result.embeddings[1]).toEqual([0.4, 0.5])
    })
  })

  // =========================================================================
  // embedQuery()
  // =========================================================================

  describe('embedQuery()', () => {
    it('returns a single embedding vector', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5]
      mockFetch.mockResolvedValue(mockEmbeddingsResponse([embedding]))

      const result = await provider.embedQuery('What is the meaning of life?')

      expect(result).toEqual(embedding)
    })
  })

  // =========================================================================
  // embedDocuments()
  // =========================================================================

  describe('embedDocuments()', () => {
    it('returns embeddings for multiple documents', async () => {
      const embeddings = [
        [0.1, 0.2],
        [0.3, 0.4],
        [0.5, 0.6],
      ]
      mockFetch.mockResolvedValue(
        mockEmbeddingsResponse(embeddings, 'text-embedding-3-small', 30, 30),
      )

      const result = await provider.embedDocuments(['doc1', 'doc2', 'doc3'])

      expect(result).toEqual(embeddings)
      expect(result).toHaveLength(3)
    })

    it('returns empty array for empty input', async () => {
      const result = await provider.embedDocuments([])

      expect(result).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Batching
  // =========================================================================

  describe('batching', () => {
    it('splits large inputs into batches', async () => {
      const smallProvider = createProvider({
        apiKey: 'test-key',
        baseUrl: 'https://test.api',
        maxBatchSize: 2,
      })

      mockFetch
        .mockResolvedValueOnce(
          mockEmbeddingsResponse([[0.1], [0.2]], 'text-embedding-3-small', 10, 10),
        )
        .mockResolvedValueOnce(mockEmbeddingsResponse([[0.3]], 'text-embedding-3-small', 5, 5))

      const result = await smallProvider.embed({
        input: ['text1', 'text2', 'text3'],
      })

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.embeddings).toEqual([[0.1], [0.2], [0.3]])
      expect(result.usage.promptTokens).toBe(15)
      expect(result.usage.totalTokens).toBe(15)
    })
  })

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    it('throws on 401 unauthorized with API error message', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(
          401,
          JSON.stringify({ error: { message: 'Incorrect API key provided' } }),
        ),
      )

      await expect(provider.embed({ input: 'test' })).rejects.toThrow(
        'OpenAI Embeddings API error: Incorrect API key provided',
      )
    })

    it('throws on 400 bad request', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(
          400,
          JSON.stringify({ error: { message: 'Invalid input: too many tokens' } }),
        ),
      )

      await expect(provider.embed({ input: 'test' })).rejects.toThrow(
        'OpenAI Embeddings API error: Invalid input: too many tokens',
      )
    })

    it('throws with HTTP status when error body is not JSON', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(500, 'Internal Server Error'))

      await expect(provider.embed({ input: 'test' })).rejects.toThrow(
        'OpenAI Embeddings API error: Internal Server Error',
      )
    })

    it('retries on 429 rate limit', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: vi.fn().mockResolvedValue('{}'),
          headers: new Headers(),
        })
        .mockResolvedValueOnce(mockEmbeddingsResponse([[0.1, 0.2]]))

      const promise = provider.embed({ input: 'test' })
      await vi.advanceTimersByTimeAsync(5000)
      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.embeddings).toEqual([[0.1, 0.2]])
    })

    it('retries on 503 service unavailable', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: vi.fn().mockResolvedValue('{}'),
          headers: new Headers(),
        })
        .mockResolvedValueOnce(mockEmbeddingsResponse([[0.1]]))

      const promise = provider.embed({ input: 'test' })
      await vi.advanceTimersByTimeAsync(5000)
      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.embeddings).toEqual([[0.1]])
    })

    it('respects Retry-After header', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: vi.fn().mockResolvedValue('{}'),
          headers: new Headers({ 'retry-after': '2' }),
        })
        .mockResolvedValueOnce(mockEmbeddingsResponse([[0.1]]))

      const promise = provider.embed({ input: 'test' })
      await vi.advanceTimersByTimeAsync(3000)
      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.embeddings).toEqual([[0.1]])
    })

    it('throws after exhausting retries', async () => {
      const makeErrorResp = () => ({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: vi
          .fn()
          .mockResolvedValue(JSON.stringify({ error: { message: 'Rate limit exceeded' } })),
        headers: new Headers(),
      })
      mockFetch
        .mockResolvedValueOnce(makeErrorResp())
        .mockResolvedValueOnce(makeErrorResp())
        .mockResolvedValueOnce(makeErrorResp())
        .mockResolvedValueOnce(makeErrorResp())

      const promise = provider.embed({ input: 'test' })
      // Attach rejection handler before advancing timers to avoid unhandled rejection
      const assertion = expect(promise).rejects.toThrow(
        'OpenAI Embeddings API error: Rate limit exceeded',
      )
      // Advance enough to unblock all retry delays (1s + 2s + 4s)
      await vi.advanceTimersByTimeAsync(60_000)
      await assertion

      expect(mockFetch).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
    })
  })

  // =========================================================================
  // Configuration
  // =========================================================================

  describe('configuration', () => {
    it('uses OPENAI_API_KEY env var when no key provided', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'env-key')
      const envProvider = createProvider({ baseUrl: 'https://test.api' })
      mockFetch.mockResolvedValue(mockEmbeddingsResponse([[0.1]]))

      await envProvider.embed({ input: 'test' })

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = init.headers as Record<string, string>
      expect(headers['Authorization']).toBe('Bearer env-key')
    })

    it('has correct provider name', () => {
      expect(provider.name).toBe('openai')
    })

    it('defaults to text-embedding-3-small model', async () => {
      mockFetch.mockResolvedValue(mockEmbeddingsResponse([[0.1]]))

      await provider.embed({ input: 'test' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.model).toBe('text-embedding-3-small')
    })

    it('respects custom default model from config', async () => {
      const customProvider = createProvider({
        apiKey: 'test-key',
        baseUrl: 'https://test.api',
        defaultModel: 'text-embedding-3-large',
      })
      mockFetch.mockResolvedValue(mockEmbeddingsResponse([[0.1]], 'text-embedding-3-large'))

      await customProvider.embed({ input: 'test' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.model).toBe('text-embedding-3-large')
    })
  })
})
