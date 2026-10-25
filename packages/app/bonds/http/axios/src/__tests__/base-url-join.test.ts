/**
 * The URL a request reaches through the REAL Axios join (Axios is not mocked here): the bonded
 * base's path is never repeated, whatever that path is, and a URL with its own host is
 * requested as written — the cases `@molecule/app-http`'s fetch client is tested with, which
 * it requests the same way.
 */
import axios, { type AxiosAdapter, type AxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'

import { createAxiosClient } from '../provider.js'
import type { AxiosHttpClientConfig } from '../types.js'

/**
 * The URLs Axios builds for requests, read by an adapter that answers instead of the network.
 *
 * @param config - The client config; its `axiosConfig` gets the adapter.
 * @param instanceConfig - When given, the client wraps an existing instance created with this.
 * @returns A `request(url, params?)` that resolves to the URL the request went to.
 */
function client(
  config: AxiosHttpClientConfig,
  instanceConfig?: AxiosRequestConfig,
): (url: string, params?: Record<string, string>) => Promise<string> {
  let seen = ''
  const adapter: AxiosAdapter = async (request) => {
    seen = axios.getUri(request)
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config: request, request: {} }
  }
  const http = instanceConfig
    ? createAxiosClient({ ...config, instance: axios.create({ ...instanceConfig, adapter }) })
    : createAxiosClient({ ...config, axiosConfig: { ...config.axiosConfig, adapter } })
  return async (url, params) => {
    await http.get(url, { params })
    return seen
  }
}

const requested = (
  baseURL: string,
  url: string,
  params?: Record<string, string>,
): Promise<string> => client({ baseURL })(url, params)

describe('the bonded base URL, through the real Axios join', () => {
  it.each([
    // The caller passes the full path under a base with a path, relative or absolute.
    ['/api', '/api/users', '/api/users'],
    ['/api', '/users', '/api/users'],
    ['https://api.example.com/api', '/api/users', 'https://api.example.com/api/users'],
    ['https://api.example.com/api', '/api', 'https://api.example.com/api'],
    ['https://api.example.com/api/', '/api/users', 'https://api.example.com/api/users'],
    ['https://api.example.com/api', '/users', 'https://api.example.com/api/users'],
    // The full path under a base ending in `/`.
    ['https://api.example.com/api/', '/api', 'https://api.example.com/api'],
    ['/api/', '/api?page=2', '/api?page=2'],
    // A URL with its own host is requested as written, under any base.
    ['/api', '//cdn.example.com/app.js', '//cdn.example.com/app.js'],
    ['https://api.example.com/api', '//cdn.example.com/app.js', '//cdn.example.com/app.js'],
    ['https://api.example.com/api', 'HTTPS://other.example/data', 'HTTPS://other.example/data'],
    // Exactly one `/` between the base and the path.
    ['https://api.example.com/', '/users', 'https://api.example.com/users'],
    ['/api/', '/users', '/api/users'],
    ['/api', 'users', '/api/users'],
    ['/api', '', '/api'],
    // Whatever the base's path is: nothing about `/api` is special.
    ['/backend', '/backend/items', '/backend/items'],
    ['/backend', '/items', '/backend/items'],
    ['https://api.example.com/api/v2', '/api/v2/items', 'https://api.example.com/api/v2/items'],
    ['https://api.example.com/api/v2', '/api/items', 'https://api.example.com/api/v2/api/items'],
    ['http://localhost:4000/api', '/api/users/1', 'http://localhost:4000/api/users/1'],
    // A base without a path prefixes every path.
    ['https://api.example.com', '/api/users', 'https://api.example.com/api/users'],
    // The base's path matches whole segments only.
    ['/api', '/apiary', '/api/apiary'],
    ['https://api.example.com/api', '/api-docs', 'https://api.example.com/api/api-docs'],
    // A query or fragment right after the base's path still makes it the full path.
    ['/api', '/api?page=2', '/api?page=2'],
    ['https://api.example.com/api', '/api#top', 'https://api.example.com/api#top'],
    [
      'https://api.example.com/api',
      '/api/users?page=2#top',
      'https://api.example.com/api/users?page=2#top',
    ],
  ])('joins baseURL %s and %s as %s', async (baseURL, url, expected) => {
    expect(await requested(baseURL, url)).toBe(expected)
  })

  it('appends query params after the joined path', async () => {
    expect(await requested('https://api.example.com/api', '/api/users', { q: 'ada' })).toBe(
      'https://api.example.com/api/users?q=ada',
    )
  })

  it('joins every request of an existing instance to the bonded base', async () => {
    const request = client({ baseURL: '/api' }, {})

    expect(await request('/users')).toBe('/api/users')
    expect(await request('/api/users')).toBe('/api/users')
  })

  it('leaves an existing instance its own base when no base is bonded', async () => {
    expect(await client({}, { baseURL: '/v1' })('/users')).toBe('/v1/users')
  })

  it('leaves a URL with its own host to Axios, allowAbsoluteUrls included', async () => {
    const request = client({ baseURL: '/api', axiosConfig: { allowAbsoluteUrls: false } })

    expect(await request('https://other.example/data')).toBe('/api/https://other.example/data')
  })
})
