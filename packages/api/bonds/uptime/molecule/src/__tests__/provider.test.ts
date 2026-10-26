import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

const OK_RESULT = {
  status: 'operational',
  checkedAt: '2026-10-26T00:00:00.000Z',
  url: 'https://example.com/health',
  method: 'GET',
  httpStatus: 200,
  latencyMs: 42,
  bodyBytesRead: 11,
  expectTextMatched: true,
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.MOLECULE_API_KEY
  delete process.env.MOLECULE_SERVICES_URL
})

describe('molecule uptime provider local refusals', () => {
  it('refuses bad input locally without any request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider({ apiKey: 'mk_test' })
    for (const spec of [
      {} as never,
      { url: '' },
      { url: 'notaurl' },
      { url: 'ftp://example.com' },
      { url: 'https://a.com', timeoutMs: 999 },
      { url: 'https://a.com', timeoutMs: 30_001 },
      { url: 'https://a.com', expectStatus: 42 },
      { url: 'https://a.com', expectText: '' },
      { url: 'https://a.com', method: 'HEAD', expectText: 'ok' },
      { url: 'https://a.com', degradedLatencyMs: -1 },
    ]) {
      await expect(provider.probe(spec), JSON.stringify(spec)).rejects.toThrow(
        /MoleculeServiceError|characters|http\(s\)|integer|GET|HEAD/,
      )
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses a missing API key locally', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider({ apiKey: '' })
    await expect(provider.probe({ url: 'https://example.com' })).rejects.toThrow(
      'MOLECULE_API_KEY is not set',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses a public plain-http services URL at construction', () => {
    expect(() => createProvider({ apiKey: 'k', servicesUrl: 'http://api.example.com' })).toThrow(
      'must use https',
    )
    // Loopback http is allowed (a local services instance).
    expect(() =>
      createProvider({ apiKey: 'k', servicesUrl: 'http://127.0.0.1:4319/api/v1/services' }),
    ).not.toThrow()
    // Private-network http is allowed (the in-sandbox gateway).
    expect(() =>
      createProvider({
        apiKey: 'k',
        servicesUrl: 'http://host.docker.internal:4319/api/v1/services',
      }),
    ).not.toThrow()
  })
})

describe('molecule uptime provider requests', () => {
  it('probes through the hosted service with the normalized spec', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(OK_RESULT))
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider({ apiKey: 'mk_test' })
    const r = await provider.probe({ url: 'https://example.com/health', expectText: '"ok"' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.molecule.dev/api/v1/services/uptime/probe')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer mk_test')
    expect(JSON.parse(init.body as string)).toEqual({
      url: 'https://example.com/health',
      method: 'GET',
      timeoutMs: 10_000,
      degradedLatencyMs: 2000,
      expectText: '"ok"',
    })
    expect(r.status).toBe('operational')
    expect(r.latencyMs).toBe(42)
  })

  it('a down verdict is a RESOLVED result, not an error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: 'down',
        checkedAt: '2026-10-26T00:00:00.000Z',
        url: 'https://example.com',
        message: 'HTTP 503.',
        httpStatus: 503,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider({ apiKey: 'mk_test' })
    const r = await provider.probe({ url: 'https://example.com' })
    expect(r.status).toBe('down')
    expect(r.message).toBe('HTTP 503.')
  })

  it('maps service refusals to MoleculeServiceError with the hint', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(
          { error: 'token invalid', errorKey: 'hostedServices.error.tokenInvalid' },
          401,
        ),
      )
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider({ apiKey: 'mk_dead' })
    try {
      await provider.probe({ url: 'https://example.com' })
      expect.fail('should have thrown')
    } catch (error) {
      const e = error as { status: number; errorKey?: string; message: string }
      expect(e.status).toBe(401)
      expect(e.errorKey).toBe('hostedServices.error.tokenInvalid')
      expect(e.message).toContain('broker:uptime')
    }
  })

  it('a non-JSON body becomes a MoleculeServiceError', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('<html>bad gateway</html>', { status: 502 }))
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider({ apiKey: 'mk_test' })
    await expect(provider.probe({ url: 'https://example.com' })).rejects.toThrow('non-JSON body')
  })

  it('a verdictless 200 becomes an upstream failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ hello: true }))
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider({ apiKey: 'mk_test' })
    await expect(provider.probe({ url: 'https://example.com' })).rejects.toThrow('no probe verdict')
  })
})
