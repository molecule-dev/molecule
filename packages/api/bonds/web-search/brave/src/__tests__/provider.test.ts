import { afterEach, describe, expect, it, vi } from 'vitest'

import { BraveWebSearchError, createProvider } from '../provider.js'

const BRAVE_RESPONSE = {
  query: { original: 'molecule.dev' },
  web: {
    results: [
      { title: 'Molecule.dev', url: 'https://www.molecule.dev/', description: 'Ship apps fast.' },
      { title: 'Docs', url: 'https://docs.molecule.dev/' },
    ],
  },
}

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
  delete process.env.BRAVE_SEARCH_API_KEY
})

describe('api-web-search-brave', () => {
  it('maps web.results into the core result shape', async () => {
    const fetchMock = stubFetch(200, BRAVE_RESPONSE)
    const result = await createProvider({ apiKey: 'BSAV_test' }).search('molecule.dev', {
      count: 2,
    })
    expect(result).toEqual({
      query: 'molecule.dev',
      results: [
        { title: 'Molecule.dev', url: 'https://www.molecule.dev/', description: 'Ship apps fast.' },
        { title: 'Docs', url: 'https://docs.molecule.dev/' },
      ],
    })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('https://api.search.brave.com/res/v1/web/search?')
    expect(url).toContain('q=molecule.dev')
    expect(url).toContain('count=2')
    expect((init.headers as Record<string, string>)['X-Subscription-Token']).toBe('BSAV_test')
  })

  it('throws locally on an oversized or empty query, before any request', async () => {
    const fetchMock = stubFetch(200, BRAVE_RESPONSE)
    const provider = createProvider({ apiKey: 'BSAV_test' })
    await expect(provider.search('')).rejects.toMatchObject({ status: 0 })
    await expect(provider.search('x'.repeat(401))).rejects.toMatchObject({ status: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws without a key, before any request', async () => {
    const fetchMock = stubFetch(200, BRAVE_RESPONSE)
    await expect(createProvider().search('q')).rejects.toMatchObject({ status: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [401, 'bad key'],
    [429, 'rate limited'],
    [422, 'bad params'],
  ])('maps a %i refusal to BraveWebSearchError', async (status) => {
    stubFetch(status, { error: 'refused' })
    const error = await createProvider({ apiKey: 'BSAV_bad' })
      .search('q')
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(BraveWebSearchError)
    expect((error as BraveWebSearchError).status).toBe(status)
  })

  it('reports a gateway error with its status and a body snippet', async () => {
    stubFetch(502, '<html>Bad Gateway</html>')
    const error = await createProvider({ apiKey: 'BSAV_test' })
      .search('q')
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(BraveWebSearchError)
    expect((error as BraveWebSearchError).status).toBe(502)
    expect((error as BraveWebSearchError).message).toContain('Bad Gateway')
  })
})
