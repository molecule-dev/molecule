/** Header merging through mutable defaults, interceptors and retry attempts. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFetchClient } from '../provider.js'

const mockFetch = vi.fn<typeof fetch>()

const sent = (): Headers => new Headers(mockFetch.mock.calls.at(-1)?.[1]?.headers)

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockReset()
  mockFetch.mockImplementation(async () => new Response('{}'))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('header merging on every fetch client path', () => {
  it.each(['request', 'default'] as const)(
    'preserves a %s header named __proto__',
    async (source) => {
      // Computed names create a real own header property, rather than setting an object prototype.
      const headers = { ['__proto__']: 'trace-value' }
      const client = createFetchClient(source === 'default' ? { defaultHeaders: headers } : {})
      await client.get('/items', source === 'request' ? { headers } : undefined)
      expect(sent().get('__proto__')).toBe('trace-value')
      expect(headers['__proto__']).toBe('trace-value')
    },
  )

  it('reads defaultHeaders replaced after construction and applies request precedence', async () => {
    const client = createFetchClient({ defaultHeaders: { 'X-Trace': 'old' } })
    client.defaultHeaders = { 'X-TRACE': 'new', 'content-type': 'application/merge-patch+json' }
    await client.patch('/items/1', { name: 'new' }, { headers: { 'x-trace': 'request' } })
    expect(sent().get('x-trace')).toBe('request')
    expect(sent().get('content-type')).toBe('application/merge-patch+json')
  })

  it('merges interceptor headers with defaults without mutating either input', async () => {
    const defaults = { 'Content-Type': 'application/json' }
    const headers = { 'content-type': 'application/merge-patch+json' }
    const client = createFetchClient({ defaultHeaders: defaults })
    client.addRequestInterceptor((config) => ({ ...config, headers }))
    await client.patch('/items/1', { name: 'new' })
    expect(sent().get('content-type')).toBe('application/merge-patch+json')
    expect(defaults).toEqual({ 'Content-Type': 'application/json' })
    expect(headers).toEqual({ 'content-type': 'application/merge-patch+json' })
  })

  it('keeps the resolved token over default, request and interceptor spellings', async () => {
    const client = createFetchClient({ defaultHeaders: { AUTHORIZATION: 'Basic default' } })
    client.setAuthToken('static')
    client.setAuthTokenResolver?.(() => 'live')
    client.addRequestInterceptor((config) => ({
      ...config,
      headers: { ...config.headers, aUtHoRiZaTiOn: 'Basic interceptor' },
    }))
    await client.get('/items', { headers: { authorization: 'Basic request' } })
    expect(sent().get('authorization')).toBe('Bearer live')
  })

  it('lets a request replace default auth when the client supplies no token', async () => {
    const client = createFetchClient({ defaultHeaders: { Authorization: 'Basic default' } })
    client.setAuthToken('stale')
    client.setAuthTokenResolver?.(() => null)
    await client.get('/items', { headers: { authorization: 'Basic request' } })
    expect(sent().get('authorization')).toBe('Basic request')
  })

  it('uses the merged headers, including a lower-case idempotency key, on retries', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 503 }))
    const client = createFetchClient({
      defaultHeaders: { 'Content-Type': 'application/json', 'X-Trace': 'default' },
      retry: { maxRetries: 1, baseDelayMs: 0 },
    })
    await client.post(
      '/items',
      { name: 'new' },
      {
        headers: {
          'content-type': 'application/json',
          'x-trace': 'request',
          'idempotency-key': 'one',
        },
      },
    )
    expect(mockFetch).toHaveBeenCalledTimes(2)
    for (const [, init] of mockFetch.mock.calls) {
      const headers = new Headers(init?.headers)
      expect(headers.get('content-type')).toBe('application/json')
      expect(headers.get('x-trace')).toBe('request')
      expect(headers.get('idempotency-key')).toBe('one')
    }
  })

  it('lets native Request encode FormData with a matching boundary', async () => {
    const form = new FormData()
    form.append('name', 'new')
    const client = createFetchClient({ defaultHeaders: { 'CONTENT-TYPE': 'application/json' } })
    await client.post('http://example.test/items', form, {
      headers: { 'content-type': 'multipart/form-data' },
    })
    const [url, init] = mockFetch.mock.calls[0]
    const request = new Request(url, init)
    expect(request.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/)
    expect((await request.formData()).get('name')).toBe('new')
  })
})
