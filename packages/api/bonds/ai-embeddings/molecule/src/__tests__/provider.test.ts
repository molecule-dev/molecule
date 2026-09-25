import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  batchInputs,
  createProvider,
  DEFAULT_SERVICES_URL,
  MoleculeServiceError,
  SERVICE_LIMITS,
} from '../provider.js'

const mockFetch = vi.fn()

/** A service response for `n` inputs. */
function ok(n: number, tokens = 3, model = 'text-embedding-3-small'): Response {
  return new Response(
    JSON.stringify({
      embeddings: Array.from({ length: n }, (_, i) => [i, i + 0.5]),
      model,
      usage: { promptTokens: tokens, totalTokens: tokens },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

/** An error response in the service's shape. */
function err(status: number, errorKey: string, error = 'nope'): Response {
  return new Response(JSON.stringify({ error, errorKey }), { status })
}

describe('MoleculeEmbeddingsProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.resetAllMocks()
    delete process.env.MOLECULE_API_KEY
    delete process.env.MOLECULE_SERVICES_URL
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the core request to <servicesUrl>/embeddings/embed with the key as a bearer', async () => {
    mockFetch.mockResolvedValueOnce(ok(2))
    const p = createProvider({ apiKey: 'mk_test' })
    const result = await p.embed({ input: ['a', 'b'], dimensions: 2 })

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${DEFAULT_SERVICES_URL}/embeddings/embed`)
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer mk_test')
    expect(JSON.parse(init.body as string)).toEqual({
      input: ['a', 'b'],
      model: 'text-embedding-3-small',
      dimensions: 2,
    })
    expect(result.embeddings).toHaveLength(2)
    expect(result.usage.totalTokens).toBe(3)
  })

  it('reads MOLECULE_API_KEY and MOLECULE_SERVICES_URL (trailing slash trimmed)', async () => {
    process.env.MOLECULE_API_KEY = 'mk_env'
    process.env.MOLECULE_SERVICES_URL = 'http://localhost:4000/api/v1/services/'
    mockFetch.mockResolvedValueOnce(ok(1))
    await createProvider().embedQuery('q')
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:4000/api/v1/services/embeddings/embed')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer mk_env')
  })

  it('throws a clear 401 error without calling the service when no key is set', async () => {
    await expect(createProvider().embed({ input: 'x' })).rejects.toMatchObject({
      status: 401,
      message: expect.stringContaining('MOLECULE_API_KEY'),
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('splits large inputs into several requests and keeps order + sums usage', async () => {
    const n = SERVICE_LIMITS.maxInputs + 10
    mockFetch
      .mockResolvedValueOnce(ok(SERVICE_LIMITS.maxInputs, 100))
      .mockResolvedValueOnce(ok(10, 5))
    const texts = Array.from({ length: n }, (_, i) => `t${i}`)
    const vectors = await createProvider({ apiKey: 'mk_x' }).embedDocuments(texts)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(vectors).toHaveLength(n)
    const second = JSON.parse((mockFetch.mock.calls[1] as [string, RequestInit])[1].body as string)
    expect(second.input).toEqual(texts.slice(SERVICE_LIMITS.maxInputs))
  })

  it('reports usage summed across batches', async () => {
    mockFetch
      .mockResolvedValueOnce(ok(SERVICE_LIMITS.maxInputs, 100))
      .mockResolvedValueOnce(ok(1, 7))
    const texts = Array.from({ length: SERVICE_LIMITS.maxInputs + 1 }, () => 'x')
    const r = await createProvider({ apiKey: 'mk_x' }).embed({ input: texts })
    expect(r.usage).toEqual({ promptTokens: 107, totalTokens: 107 })
  })

  it.each([
    [401, 'hostedServices.error.tokenInvalid', 'MOLECULE_API_KEY'],
    [402, 'broker.error.budgetExceeded', 'usage billing'],
    [429, 'broker.error.rateLimited', 'Slow down'],
    [503, 'broker.error.capacityPaused', 'Retry'],
  ])('turns %i into a MoleculeServiceError with errorKey and a hint', async (status, key, hint) => {
    mockFetch.mockResolvedValueOnce(err(status, key))
    const e = await createProvider({ apiKey: 'mk_x' })
      .embed({ input: 'x' })
      .catch((error: unknown) => error)
    expect(e).toBeInstanceOf(MoleculeServiceError)
    expect(e).toMatchObject({ status, errorKey: key })
    expect((e as Error).message).toContain(hint)
  })

  it('reports a non-JSON error page by status, keeping the parse error as cause', async () => {
    mockFetch.mockResolvedValueOnce(new Response('<html>bad gateway</html>', { status: 502 }))
    const e = await createProvider({ apiKey: 'mk_x' })
      .embed({ input: 'x' })
      .catch((error: unknown) => error)
    expect(e).toMatchObject({ status: 502 })
    expect((e as Error).cause).toBeInstanceOf(SyntaxError)
  })

  it('returns an empty result for an empty input list without a request', async () => {
    const r = await createProvider({ apiKey: 'mk_x' }).embed({ input: [] })
    expect(r.embeddings).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('batchInputs', () => {
  it('splits on the total-character bound too', () => {
    const big = 'x'.repeat(SERVICE_LIMITS.maxCharsPerInput)
    const count = Math.ceil(SERVICE_LIMITS.maxTotalChars / SERVICE_LIMITS.maxCharsPerInput) + 1
    const batches = batchInputs(Array.from({ length: count }, () => big))
    expect(batches.length).toBeGreaterThan(1)
    for (const b of batches) {
      expect(b.reduce((n, s) => n + s.length, 0)).toBeLessThanOrEqual(SERVICE_LIMITS.maxTotalChars)
    }
  })

  it('refuses one input over the per-input limit instead of truncating it', () => {
    expect(() => batchInputs(['x'.repeat(SERVICE_LIMITS.maxCharsPerInput + 1)])).toThrow(
      MoleculeServiceError,
    )
  })
})
