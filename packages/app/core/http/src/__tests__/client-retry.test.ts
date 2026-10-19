import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFetchClient } from '../index.js'

/** A fetch Response stand-in with a JSON body and real `Headers`. */
function response(body: unknown, status = 200, headers: Record<string, string> = {}): object {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  }
}

describe('fetch client retry', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const client = () => createFetchClient({ baseURL: '/api', retry: { baseDelayMs: 2 } })

  it('retries a GET on 503 and resolves on the following attempt', async () => {
    mockFetch
      .mockResolvedValueOnce(response({ error: 'boot' }, 503))
      .mockResolvedValueOnce(response({ ok: true }))

    const result = await client().get<{ ok: boolean }>('/projects')

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(result.data).toEqual({ ok: true })
  })

  it('honors Retry-After instead of backing off', async () => {
    mockFetch
      .mockResolvedValueOnce(response({}, 503, { 'retry-after': '0' }))
      .mockResolvedValueOnce(response({ ok: true }))

    const started = Date.now()
    await client().get('/projects')
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(Date.now() - started).toBeLessThan(200)
  })

  it('never retries a POST without an Idempotency-Key', async () => {
    mockFetch.mockResolvedValue(response({}, 503))

    await expect(client().post('/projects', { name: 'x' })).rejects.toMatchObject({ status: 503 })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries a POST that carries an Idempotency-Key', async () => {
    mockFetch
      .mockResolvedValueOnce(response({}, 503))
      .mockResolvedValueOnce(response({ id: 1 }, 201))

    const result = await client().post(
      '/projects',
      { name: 'x' },
      { headers: { 'Idempotency-Key': 'abc' } },
    )
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(result.status).toBe(201)
  })

  it('does not retry a 500 (a bug, not a rolling restart)', async () => {
    mockFetch.mockResolvedValue(response({}, 500))
    await expect(client().get('/projects')).rejects.toMatchObject({ status: 500 })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries a reset connection', async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(response({ ok: true }))

    const result = await client().get('/projects')
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(result.data).toEqual({ ok: true })
  })

  it('gives up after the bounded number of retries', async () => {
    mockFetch.mockResolvedValue(response({}, 503))
    await expect(client().get('/projects')).rejects.toMatchObject({ status: 503 })
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('does not retry an aborted request', async () => {
    const abortError = new Error('The operation was aborted.')
    abortError.name = 'AbortError'
    mockFetch.mockRejectedValue(abortError)

    await expect(client().get('/projects')).rejects.toMatchObject({ aborted: true })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('a per-request retry:false disables retries', async () => {
    mockFetch.mockResolvedValue(response({}, 503))
    await expect(client().get('/projects', { retry: false })).rejects.toMatchObject({ status: 503 })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
