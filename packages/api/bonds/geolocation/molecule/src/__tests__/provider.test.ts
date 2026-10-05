import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider, GEOCODING_SERVICE_LIMITS } from '../provider.js'

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

describe('api-geolocation-molecule', () => {
  it('posts the address to geocoding/geocode and returns GeoResult[]', async () => {
    const geo = { lat: 47.1411, lng: 9.5215, formattedAddress: 'Vaduz', components: {} }
    const fetchMock = stubFetch(200, [geo])
    const result = await createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    }).geocode('Vaduz')
    expect(result).toHaveLength(1)
    expect(result[0].formattedAddress).toBe('Vaduz')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:1/api/v1/services/geocoding/geocode')
    expect(JSON.parse(String(init.body))).toEqual({ address: 'Vaduz' })
  })

  it('posts lat/lng to geocoding/reverse', async () => {
    const fetchMock = stubFetch(200, [])
    const result = await createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    }).reverseGeocode(47.1411, 9.5215)
    expect(result).toEqual([])
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:1/api/v1/services/geocoding/reverse')
    expect(JSON.parse(String(init.body))).toEqual({ lat: 47.1411, lng: 9.5215 })
  })

  it('refuses an oversized address locally, before any request', async () => {
    const fetchMock = stubFetch(200, [])
    await expect(
      createProvider({ apiKey: 'mk_test' }).geocode(
        'x'.repeat(GEOCODING_SERVICE_LIMITS.maxAddressChars + 1),
      ),
    ).rejects.toMatchObject({ status: 413, errorKey: 'hostedServices.error.inputTooLarge' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses an empty address and out-of-range coordinates locally', async () => {
    const fetchMock = stubFetch(200, [])
    const provider = createProvider({ apiKey: 'mk_test' })
    await expect(provider.geocode('   ')).rejects.toMatchObject({ status: 400 })
    await expect(provider.reverseGeocode(91, 0)).rejects.toMatchObject({ status: 400 })
    await expect(provider.reverseGeocode(0, 181)).rejects.toMatchObject({ status: 400 })
    await expect(provider.reverseGeocode(Number.NaN, 0)).rejects.toMatchObject({ status: 400 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws MoleculeServiceError without a key, before any request', async () => {
    const fetchMock = stubFetch(200, [])
    const old = process.env.MOLECULE_API_KEY
    delete process.env.MOLECULE_API_KEY
    try {
      await expect(
        createProvider({ servicesUrl: 'http://localhost:1/api/v1/services' }).geocode('Vaduz'),
      ).rejects.toMatchObject({ status: 401 })
    } finally {
      if (old !== undefined) process.env.MOLECULE_API_KEY = old
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [401, 'hostedServices.error.tokenInvalid'],
    [402, undefined],
    [429, undefined],
  ])('maps an upstream %i to MoleculeServiceError', async (status, errorKey) => {
    stubFetch(status, { error: 'refused', errorKey })
    await expect(createProvider({ apiKey: 'mk_test' }).geocode('Vaduz')).rejects.toMatchObject({
      name: 'MoleculeServiceError',
      status,
      errorKey,
    })
  })

  it('surfaces a non-JSON gateway body as a status-only error', async () => {
    stubFetch(502, '<html>bad gateway</html>')
    await expect(createProvider({ apiKey: 'mk_test' }).geocode('Vaduz')).rejects.toMatchObject({
      name: 'MoleculeServiceError',
      status: 502,
      errorKey: undefined,
    })
  })

  it('refuses a public cleartext services URL', () => {
    expect(() =>
      createProvider({ apiKey: 'mk_test', servicesUrl: 'http://example.com/api/v1/services' }),
    ).toThrow(/must use https/)
  })

  it('allows loopback and private-network http URLs', () => {
    for (const url of [
      'http://localhost:4300/api/v1/services',
      'http://host.docker.internal:4310/api/v1/services',
      'http://10.0.0.5/api/v1/services',
    ]) {
      expect(() => createProvider({ apiKey: 'mk_test', servicesUrl: url })).not.toThrow()
    }
  })

  it('computes distance locally without a request', async () => {
    const fetchMock = stubFetch(200, [])
    const provider = createProvider({ apiKey: 'mk_test' })
    const km = provider.distance({ lat: 47.1411, lng: 9.5215 }, { lat: 47.1652, lng: 9.5093 })
    expect(km).toBeGreaterThan(2)
    expect(km).toBeLessThan(4)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
