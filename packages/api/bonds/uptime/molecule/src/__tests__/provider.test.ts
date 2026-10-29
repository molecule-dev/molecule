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

describe('molecule uptime provider scheduled monitors', () => {
  const MONITOR = {
    id: 'm1',
    url: 'https://example.com/health',
    spec: { url: 'https://example.com/health', method: 'GET', timeoutMs: 10_000 },
    intervalSeconds: 60,
    alerting: true,
    paused: false,
    lastStatus: 'operational',
    lastCheckedAt: '2026-10-29T00:00:00.000Z',
    nextRunAt: '2026-10-29T00:01:00.000Z',
    consecutiveFails: 0,
    lastAlertAt: null,
    createdAt: '2026-10-28T00:00:00.000Z',
  }

  it('schedules a monitor with the normalized spec and the alert subscription', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ monitor: MONITOR }))
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider({ apiKey: 'mk_test' })
    const monitor = await provider.scheduleMonitor({
      url: 'https://example.com/health',
      intervalSeconds: 300,
      alertPush: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
        keys: { p256dh: 'k', auth: 'a' },
      },
    })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.molecule.dev/api/v1/services/uptime/schedule')
    expect(JSON.parse(init.body as string)).toEqual({
      url: 'https://example.com/health',
      method: 'GET',
      timeoutMs: 10_000,
      degradedLatencyMs: 2000,
      intervalSeconds: 300,
      alertPush: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
        keys: { p256dh: 'k', auth: 'a' },
      },
    })
    expect(monitor.id).toBe('m1')
    expect(monitor.alerting).toBe(true)
  })

  it('mirrors the schedule bounds locally without any request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider({ apiKey: 'mk_test' })
    for (const intervalSeconds of [0, 30, 59, 86_401, 1.5, '300' as never]) {
      await expect(
        provider.scheduleMonitor({ url: 'https://example.com', intervalSeconds }),
      ).rejects.toThrow(/intervalSeconds/)
    }
    await expect(
      provider.scheduleMonitor({ url: 'ftp://example.com', intervalSeconds: 60 }),
    ).rejects.toThrow(/http\(s\)/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('lists monitors, reads history and removes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ monitors: [MONITOR] }))
      .mockResolvedValueOnce(
        jsonResponse({
          monitor: MONITOR,
          checks: [
            {
              checkedAt: '2026-10-29T00:01:00.000Z',
              status: 'operational',
              latencyMs: 40,
              httpStatus: 200,
              message: null,
            },
          ],
          summary: { total: 1, operational: 1, degraded: 0, down: 0, uptimePercent: 100 },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ removed: true, id: 'm1' }))
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider({ apiKey: 'mk_test' })
    expect((await provider.listMonitors()).map((m) => m.id)).toEqual(['m1'])
    const history = await provider.monitorHistory('m1', 100)
    expect(history.summary.uptimePercent).toBe(100)
    expect(
      (JSON.parse(fetchMock.mock.calls[1][1].body as string) as { monitorId: string }).monitorId,
    ).toBe('m1')
    expect(await provider.removeMonitor('m1')).toEqual({ removed: true, id: 'm1' })
  })

  it('mirrors the history bounds and the id requirements locally', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider({ apiKey: 'mk_test' })
    for (const limit of [0, -1, 1.5, 501]) {
      await expect(provider.monitorHistory('m1', limit)).rejects.toThrow(/limit/)
    }
    await expect(provider.monitorHistory('')).rejects.toThrow('monitorId')
    await expect(provider.removeMonitor('')).rejects.toThrow('id')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a foreign monitor id reads as 404 with the hint', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(
          { error: 'No such monitor', errorKey: 'hostedServices.error.monitorNotFound' },
          404,
        ),
      )
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider({ apiKey: 'mk_test' })
    try {
      await provider.monitorHistory('other')
      expect.fail('should have thrown')
    } catch (error) {
      const e = error as { status: number; errorKey?: string; message: string }
      expect(e.status).toBe(404)
      expect(e.errorKey).toBe('hostedServices.error.monitorNotFound')
      expect(e.message).toContain('list your monitors')
    }
  })
})
