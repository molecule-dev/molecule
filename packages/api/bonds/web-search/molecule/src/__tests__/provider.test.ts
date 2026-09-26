import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider, MoleculeServiceError, WEB_SEARCH_SERVICE_LIMITS } from '../provider.js'

/** Stub fetch with `status` and `body`. */
function stubFetch(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const fn = vi
    .fn()
    .mockResolvedValue(
      new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
    )
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api-web-search-molecule', () => {
  it('posts the query to web-search/search and returns the result', async () => {
    const fetchMock = stubFetch(200, {
      query: 'q',
      results: [{ title: 'T', url: 'https://x.test/' }],
    })
    const result = await createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    }).search('q', { count: 3, country: 'us' })
    expect(result.results).toHaveLength(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:1/api/v1/services/web-search/search')
    expect(JSON.parse(String(init.body))).toEqual({ query: 'q', count: 3, country: 'us' })
  })

  it('refuses an oversized query locally, before any request', async () => {
    const fetchMock = stubFetch(200, {})
    await expect(
      createProvider({ apiKey: 'mk_test' }).search(
        'x'.repeat(WEB_SEARCH_SERVICE_LIMITS.maxQueryChars + 1),
      ),
    ).rejects.toMatchObject({ status: 413, errorKey: 'hostedServices.error.inputTooLarge' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws MoleculeServiceError without a key, before any request', async () => {
    const fetchMock = stubFetch(200, {})
    const old = process.env.MOLECULE_API_KEY
    delete process.env.MOLECULE_API_KEY
    try {
      await expect(
        createProvider({ servicesUrl: 'http://localhost:1/api/v1/services' }).search('q'),
      ).rejects.toMatchObject({ status: 401 })
    } finally {
      if (old !== undefined) process.env.MOLECULE_API_KEY = old
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([[401], [402], [429]])(
    'maps a %i refusal to a MoleculeServiceError with the service errorKey',
    async (status) => {
      stubFetch(status, { error: 'refused', errorKey: 'some.key' })
      const error = await createProvider({ apiKey: 'mk_bad' })
        .search('q')
        .catch((e: unknown) => e)
      expect(error).toBeInstanceOf(MoleculeServiceError)
      expect((error as MoleculeServiceError).status).toBe(status)
      expect((error as MoleculeServiceError).errorKey).toBe('some.key')
    },
  )
})
