import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAxiosInstance } = vi.hoisted(() => {
  const mockAxiosInstance = {
    request: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} as Record<string, string> } },
  }
  return { mockAxiosInstance }
})

vi.mock('axios', () => ({
  default: { create: vi.fn(() => mockAxiosInstance) },
}))

import { createAxiosClient } from '../index.js'

/**
 * An Axios-shaped failure.
 *
 * @param status - The HTTP status.
 * @param headers - Response headers.
 * @returns The rejection value.
 */
function axiosError(status: number, headers: Record<string, string> = {}): object {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, headers },
  })
}

describe('@molecule/app-http-axios retry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const client = () => createAxiosClient({ baseURL: '/api', retry: { baseDelayMs: 2 } })

  it('retries a GET on 503', async () => {
    mockAxiosInstance.get
      .mockRejectedValueOnce(axiosError(503))
      .mockResolvedValueOnce({ data: { ok: true }, status: 200, statusText: 'OK', headers: {} })

    const result = await client().get('/projects')

    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2)
    expect(result.data).toEqual({ ok: true })
  })

  it('honors Retry-After', async () => {
    mockAxiosInstance.get
      .mockRejectedValueOnce(axiosError(503, { 'retry-after': '0' }))
      .mockResolvedValueOnce({ data: {}, status: 200, statusText: 'OK', headers: {} })

    const started = Date.now()
    await client().get('/projects')
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2)
    expect(Date.now() - started).toBeLessThan(200)
  })

  it('never retries a POST without an Idempotency-Key', async () => {
    mockAxiosInstance.post.mockRejectedValue(axiosError(503))

    await expect(client().post('/projects', { name: 'x' })).rejects.toBeDefined()
    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1)
  })

  it('retries a POST carrying an Idempotency-Key', async () => {
    mockAxiosInstance.post
      .mockRejectedValueOnce(axiosError(503))
      .mockResolvedValueOnce({ data: { id: 1 }, status: 201, statusText: 'Created', headers: {} })

    const result = await client().post(
      '/projects',
      { name: 'x' },
      {
        headers: { 'Idempotency-Key': 'abc' },
      },
    )
    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2)
    expect(result.status).toBe(201)
  })

  it('does not retry a 500', async () => {
    mockAxiosInstance.get.mockRejectedValue(axiosError(500))
    await expect(client().get('/projects')).rejects.toBeDefined()
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1)
  })

  it('does not retry an aborted request', async () => {
    mockAxiosInstance.get.mockRejectedValue(
      Object.assign(new Error('canceled'), { code: 'ERR_CANCELED' }),
    )
    await expect(client().get('/projects')).rejects.toBeDefined()
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1)
  })

  it('stops after the bounded number of retries', async () => {
    mockAxiosInstance.get.mockRejectedValue(axiosError(503))
    await expect(client().get('/projects')).rejects.toBeDefined()
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3)
  })

  it('retries PUT and DELETE, and not PATCH without a key', async () => {
    mockAxiosInstance.put
      .mockRejectedValueOnce(axiosError(502))
      .mockResolvedValueOnce({ data: {}, status: 200, statusText: 'OK', headers: {} })
    mockAxiosInstance.delete
      .mockRejectedValueOnce(axiosError(504))
      .mockResolvedValueOnce({ data: {}, status: 200, statusText: 'OK', headers: {} })
    mockAxiosInstance.patch.mockRejectedValue(axiosError(503))

    await client().put('/projects/1', { name: 'x' })
    await client().delete('/projects/1')
    await expect(client().patch('/projects/1', { name: 'x' })).rejects.toBeDefined()

    expect(mockAxiosInstance.put).toHaveBeenCalledTimes(2)
    expect(mockAxiosInstance.delete).toHaveBeenCalledTimes(2)
    expect(mockAxiosInstance.patch).toHaveBeenCalledTimes(1)
  })
})
