/** Header precedence through a real Axios instance and its native header merge. */
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'

import { createAxiosClient } from '../provider.js'
import type { AxiosHttpClientConfig } from '../types.js'

function recordingClient(config: AxiosHttpClientConfig = {}, failFirst = false) {
  const sent: Headers[] = []
  const adapter = async (request: InternalAxiosRequestConfig) => {
    sent.push(new Headers(request.headers.toJSON() as Record<string, string>))
    const response = {
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config: request,
    }
    if (failFirst && sent.length === 1) {
      response.status = 503
      throw new AxiosError(
        'Request failed with status code 503',
        'ERR_BAD_RESPONSE',
        request,
        undefined,
        response,
      )
    }
    return response
  }
  if (config.instance) config.instance.defaults.adapter = adapter
  const client = createAxiosClient({
    baseURL: 'http://api.test',
    ...config,
    axiosConfig: { ...config.axiosConfig, adapter },
  })
  return { client, sent }
}

describe('Axios header names and mutable defaults', () => {
  it('control: merges request headers over differently spelled constructor defaults', async () => {
    const { client, sent } = recordingClient({ defaultHeaders: { 'X-Trace': 'default' } })
    await client.get('/items', { headers: { 'x-trace': 'request' } })
    expect(sent[0].get('x-trace')).toBe('request')
  })

  it('uses a default updated after construction under another spelling', async () => {
    const { client, sent } = recordingClient({ defaultHeaders: { 'X-Trace': 'old' } })
    client.defaultHeaders['x-trace'] = 'new'
    await client.get('/items')
    expect(sent[0].get('x-trace')).toBe('new')
  })

  it('removes a deleted default from subsequent requests', async () => {
    const { client, sent } = recordingClient({ defaultHeaders: { 'X-Trace': 'old' } })
    await client.get('/items')
    delete client.defaultHeaders['X-Trace']
    await client.get('/items')
    expect(sent.map((headers) => headers.get('x-trace'))).toEqual(['old', null])
  })

  it('replaces the default header object, including removing its old headers', async () => {
    const { client, sent } = recordingClient({ defaultHeaders: { 'X-Trace': 'old' } })
    client.defaultHeaders = { 'X-Other': 'new' }
    await client.get('/items')
    expect(sent[0].get('x-trace')).toBeNull()
    expect(sent[0].get('x-other')).toBe('new')
  })

  it('lets a request override a later default without joining the values', async () => {
    const { client, sent } = recordingClient()
    client.defaultHeaders['X-Trace'] = 'late'
    await client.get('/items', { headers: { 'x-trace': 'request' } })
    expect(sent[0].get('x-trace')).toBe('request')
  })

  it('uses a later content type instead of Axios JSON defaults', async () => {
    const { client, sent } = recordingClient()
    client.defaultHeaders['content-type'] = 'application/merge-patch+json'
    await client.patch('/items/1', { name: 'new' })
    expect(sent[0].get('content-type')).toBe('application/merge-patch+json')
  })

  it('applies constructor defaults when wrapping an existing Axios instance', async () => {
    const { client, sent } = recordingClient({
      instance: axios.create({ headers: { 'X-Trace': 'instance' } }),
      defaultHeaders: { 'x-trace': 'configured' },
    })
    await client.get('/items')
    expect(sent[0].get('x-trace')).toBe('configured')
  })

  it.each(['Authorization', 'authorization', 'AUTHORIZATION'])(
    'control: preserves explicit default %s over static and resolved tokens',
    async (name) => {
      const { client, sent } = recordingClient({ defaultHeaders: { [name]: 'Basic explicit' } })
      client.setAuthToken('static')
      await client.get('/items')
      client.setAuthTokenResolver?.(() => 'live')
      await client.get('/items')
      expect(sent.map((headers) => headers.get('authorization'))).toEqual([
        'Basic explicit',
        'Basic explicit',
      ])
    },
  )

  it('keeps an updated explicit auth default over the resolved token', async () => {
    const { client, sent } = recordingClient({ defaultHeaders: { Authorization: 'Basic old' } })
    client.setAuthToken('static')
    client.setAuthTokenResolver?.(() => 'live')
    client.defaultHeaders['authorization'] = 'Basic new'
    await client.get('/items')
    expect(sent[0].get('authorization')).toBe('Basic new')
  })

  it('updates and clears the managed token after the defaults object is replaced', async () => {
    const { client, sent } = recordingClient()
    client.defaultHeaders = { 'X-Trace': 'late' }
    client.setAuthToken('one')
    expect(client.defaultHeaders['Authorization']).toBe('Bearer one')
    await client.get('/items')
    client.setAuthToken('two')
    await client.get('/items')
    client.setAuthToken(null)
    await client.get('/items')
    expect(sent.map((headers) => headers.get('authorization'))).toEqual([
      'Bearer one',
      'Bearer two',
      null,
    ])
    expect(sent.map((headers) => headers.get('x-trace'))).toEqual(['late', 'late', 'late'])
    expect(new Headers(client.defaultHeaders).get('authorization')).toBeNull()
  })

  it('control: permits an interceptor to override the token with another header spelling', async () => {
    const { client, sent } = recordingClient()
    client.setAuthToken('static')
    client.addRequestInterceptor((config) => ({
      ...config,
      headers: { ...config.headers, authorization: 'Basic interceptor' },
    }))
    await client.get('/items')
    expect(sent[0].get('authorization')).toBe('Basic interceptor')
  })

  it('removes old headers when an interceptor replaces the header object', async () => {
    const { client, sent } = recordingClient({ defaultHeaders: { 'X-Trace': 'default' } })
    client.addRequestInterceptor((config) => ({ ...config, headers: { 'x-other': 'new' } }))
    await client.get('/items')
    expect(sent[0].get('x-trace')).toBeNull()
    expect(sent[0].get('x-other')).toBe('new')
  })
})

describe('Axios retries use the headers sent to the server', () => {
  const retry = { maxRetries: 1, baseDelayMs: 0 }

  it('retries a POST carrying an idempotency key from defaults', async () => {
    const { client, sent } = recordingClient(
      {
        defaultHeaders: { 'idempotency-key': 'one' },
        retry,
      },
      true,
    )
    await client.post('/items', { name: 'new' })
    expect(sent).toHaveLength(2)
    expect(sent.map((headers) => headers.get('idempotency-key'))).toEqual(['one', 'one'])
  })

  it('does not replay a POST whose interceptor removed the idempotency key', async () => {
    const { client, sent } = recordingClient({ retry }, true)
    client.addRequestInterceptor((config) => {
      // Mutate the existing native header map so this independently tests retry eligibility,
      // even before the separate replacement-object removal defect is repaired.
      for (const name of Object.keys(config.headers ?? {})) {
        if (name.toLowerCase() === 'idempotency-key') delete config.headers?.[name]
      }
      return config
    })
    await expect(
      client.post(
        '/items',
        { name: 'new' },
        {
          headers: { 'Idempotency-Key': 'one' },
        },
      ),
    ).rejects.toMatchObject({ status: 503 })
    expect(sent).toHaveLength(1)
    expect(sent[0].get('idempotency-key')).toBeNull()
  })

  it('does not replay a GET changed into a POST without a key', async () => {
    const { client, sent } = recordingClient({ retry }, true)
    client.addRequestInterceptor((config) => ({ ...config, method: 'POST', data: { name: 'new' } }))
    await expect(client.get('/items')).rejects.toMatchObject({ status: 503 })
    expect(sent).toHaveLength(1)
  })

  it('control: retries a lower-case request key without duplicating headers', async () => {
    const { client, sent } = recordingClient(
      {
        defaultHeaders: { 'Content-Type': 'application/json' },
        retry,
      },
      true,
    )
    await client.post(
      '/items',
      { name: 'new' },
      {
        headers: { 'idempotency-key': 'one', 'content-type': 'application/json' },
      },
    )
    expect(sent).toHaveLength(2)
    expect(sent.map((headers) => headers.get('content-type'))).toEqual([
      'application/json',
      'application/json',
    ])
  })
})
