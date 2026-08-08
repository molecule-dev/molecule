/**
 * Tests for the Fly Machines API transport: auth, JSON handling, `nullOn`, and
 * the rate-limit-aware retry policy that a sandbox boot depends on.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createFetchDouble, mockLogger } from './helpers.js'

vi.mock('@molecule/api-bond', () => ({ getLogger: () => mockLogger }))
vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}))

const { FlyApiClient, FlyApiError, isRetryableStatus, normalizeApiUrl, retryDelayMs } =
  await import('../api.js')

/**
 * Builds a client wired to a fetch double with retry sleeps collapsed to nothing.
 * @param double - The fetch double.
 * @param token - Token resolver result.
 * @returns The client and the recorded sleep durations.
 */
function makeClient(double: ReturnType<typeof createFetchDouble>, token: string | null = 'tok') {
  const sleeps: number[] = []
  const client = new FlyApiClient({
    token: () => token ?? undefined,
    baseUrl: 'https://api.machines.dev/v1',
    fetchImpl: double.fetch,
    sleep: async (ms: number) => {
      sleeps.push(ms)
    },
  })
  return { client, sleeps }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('normalizeApiUrl', () => {
  it('defaults to the documented public Machines API base', () => {
    expect(normalizeApiUrl(undefined)).toBe('https://api.machines.dev/v1')
    expect(normalizeApiUrl('   ')).toBe('https://api.machines.dev/v1')
  })

  it('appends /v1 to a bare host, matching FLY_API_HOSTNAME', () => {
    expect(normalizeApiUrl('https://api.machines.dev')).toBe('https://api.machines.dev/v1')
    expect(normalizeApiUrl('http://_api.internal:4280')).toBe('http://_api.internal:4280/v1')
    expect(normalizeApiUrl('https://api.machines.dev/')).toBe('https://api.machines.dev/v1')
  })

  it('leaves a value that already carries a path alone', () => {
    expect(normalizeApiUrl('https://proxy.example/fly/v1')).toBe('https://proxy.example/fly/v1')
  })

  it('throws on a non-absolute URL rather than guessing a base', () => {
    expect(() => normalizeApiUrl('api.machines.dev')).toThrow(/Invalid Fly API URL/)
  })
})

describe('retry policy', () => {
  it('treats 429, 5xx and transport failures as retryable and other 4xx as final', () => {
    expect(isRetryableStatus(429)).toBe(true)
    expect(isRetryableStatus(500)).toBe(true)
    expect(isRetryableStatus(503)).toBe(true)
    expect(isRetryableStatus(0)).toBe(true)
    expect(isRetryableStatus(404)).toBe(false)
    expect(isRetryableStatus(409)).toBe(false)
    expect(isRetryableStatus(422)).toBe(false)
    expect(isRetryableStatus(401)).toBe(false)
  })

  it('honors Retry-After, clamped, and otherwise backs off exponentially', () => {
    expect(retryDelayMs(1, '2')).toBe(2000)
    expect(retryDelayMs(1, '9999')).toBe(10_000)
    expect(retryDelayMs(1, 'not-a-number')).toBe(1000)
    expect(retryDelayMs(1)).toBe(1000)
    expect(retryDelayMs(2)).toBe(2000)
    expect(retryDelayMs(3)).toBe(4000)
    expect(retryDelayMs(9)).toBe(10_000)
  })
})

describe('FlyApiClient.request', () => {
  it('sends the bearer token and parses a JSON body', async () => {
    const double = createFetchDouble().on('GET /apps/x', { body: { name: 'x' } })
    const { client } = makeClient(double)

    await expect(client.request('/apps/x')).resolves.toEqual({ name: 'x' })

    const init = (double.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(init.headers.Authorization).toBe('Bearer tok')
    expect(double.calls[0].url).toBe('https://api.machines.dev/v1/apps/x')
  })

  it('sets a JSON content type only when there is a body', async () => {
    const double = createFetchDouble()
    const { client } = makeClient(double)

    await client.request('/apps/x/machines', { method: 'POST', body: { region: 'iad' } })
    await client.request('/apps/x/machines/m1/start', { method: 'POST' })

    const mock = double.fetch as unknown as ReturnType<typeof vi.fn>
    expect(mock.mock.calls[0][1].headers['Content-Type']).toBe('application/json')
    expect(mock.mock.calls[0][1].body).toBe('{"region":"iad"}')
    expect(mock.mock.calls[1][1].headers['Content-Type']).toBeUndefined()
    expect(mock.mock.calls[1][1].body).toBeUndefined()
  })

  it('throws a named error when no token is resolvable', async () => {
    const double = createFetchDouble()
    const { client } = makeClient(double, null)
    await expect(client.request('/apps/x')).rejects.toThrow(/No Fly API token/)
    expect(double.calls).toHaveLength(0)
  })

  it('returns null for an empty 2xx body', async () => {
    const double = createFetchDouble().on('POST /apps/x/machines/m1/suspend', {
      status: 200,
      text: '',
    })
    const { client } = makeClient(double)
    await expect(
      client.request('/apps/x/machines/m1/suspend', { method: 'POST' }),
    ).resolves.toBeNull()
  })

  it('returns null for a status listed in nullOn instead of throwing', async () => {
    const double = createFetchDouble().on('GET /apps/gone', {
      status: 404,
      body: { error: 'nope' },
    })
    const { client } = makeClient(double)
    await expect(client.request('/apps/gone', { nullOn: [404] })).resolves.toBeNull()
    expect(double.calls).toHaveLength(1)
  })

  it('throws FlyApiError carrying the status and body for an unhandled 4xx', async () => {
    const double = createFetchDouble().on('GET /apps/x', {
      status: 422,
      body: { error: 'validation failed' },
    })
    const { client } = makeClient(double)

    await expect(client.request('/apps/x')).rejects.toMatchObject({
      name: 'FlyApiError',
      status: 422,
      method: 'GET',
      path: '/apps/x',
    })
    expect(double.calls).toHaveLength(1)
  })

  it('retries a 429 with the Retry-After delay and succeeds', async () => {
    const double = createFetchDouble()
      .on('POST /apps/x/machines', { status: 429, headers: { 'retry-after': '2' } })
      .on('POST /apps/x/machines', { status: 200, body: { id: 'm1' } })
    const { client, sleeps } = makeClient(double)

    await expect(client.request('/apps/x/machines', { method: 'POST', body: {} })).resolves.toEqual(
      {
        id: 'm1',
      },
    )
    expect(double.calls).toHaveLength(2)
    expect(sleeps).toEqual([2000])
    expect(mockLogger.warn).toHaveBeenCalled()
  })

  it('retries an extra status listed in retryStatuses (exec 404 under load) and succeeds', async () => {
    const double = createFetchDouble()
      .on('POST /apps/x/machines/m1/exec', { status: 404, body: { error: 'machine not found' } })
      .on('POST /apps/x/machines/m1/exec', { status: 200, body: { exit_code: 0 } })
    const { client } = makeClient(double)

    await expect(
      client.request('/apps/x/machines/m1/exec', {
        method: 'POST',
        body: {},
        retryStatuses: [404],
      }),
    ).resolves.toEqual({ exit_code: 0 })
    expect(double.calls).toHaveLength(2)
  })

  it('does not retry a 404 unless retryStatuses opts in', async () => {
    const double = createFetchDouble().fallback({ status: 404, body: { error: 'nope' } })
    const { client } = makeClient(double)

    await expect(
      client.request('/apps/x/machines/m1/exec', { method: 'POST' }),
    ).rejects.toMatchObject({ status: 404 })
    expect(double.calls).toHaveLength(1)
  })

  it('retries 5xx up to the attempt budget and then throws the last error', async () => {
    const double = createFetchDouble().fallback({ status: 503, body: { error: 'unavailable' } })
    const { client, sleeps } = makeClient(double)

    await expect(client.request('/apps/x', { attempts: 3 })).rejects.toMatchObject({ status: 503 })
    expect(double.calls).toHaveLength(3)
    expect(sleeps).toHaveLength(2)
  })

  it('never retries a non-retryable 4xx, protecting the per-action rate budget', async () => {
    const double = createFetchDouble().fallback({ status: 409, body: { error: 'taken' } })
    const { client, sleeps } = makeClient(double)

    await expect(client.request('/apps', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 409,
    })
    expect(double.calls).toHaveLength(1)
    expect(sleeps).toHaveLength(0)
  })

  it('models a transport failure as status 0 and retries it', async () => {
    let attempts = 0
    const failing = vi.fn(async () => {
      attempts++
      if (attempts < 2) throw new Error('ECONNRESET')
      return {
        status: 200,
        headers: { get: () => null },
        text: async () => '{"ok":true}',
      } as unknown as Response
    }) as unknown as typeof fetch

    const sleeps: number[] = []
    const client = new FlyApiClient({
      token: () => 'tok',
      baseUrl: 'https://api.machines.dev/v1',
      fetchImpl: failing,
      sleep: async (ms) => {
        sleeps.push(ms)
      },
    })

    await expect(client.request('/apps/x')).resolves.toEqual({ ok: true })
    expect(attempts).toBe(2)
    expect(sleeps).toEqual([1000])
  })

  it('refuses a 2xx whose body is not JSON rather than silently returning nothing', async () => {
    const double = createFetchDouble().on('GET /apps/x', { status: 200, text: '<html>oops</html>' })
    const { client } = makeClient(double)
    await expect(client.request('/apps/x')).rejects.toBeInstanceOf(FlyApiError)
  })
})
