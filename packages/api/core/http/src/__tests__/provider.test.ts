import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ClientModule from '../client.js'
import type * as ProviderModule from '../provider.js'
import type {
  ErrorInterceptor,
  HttpClient,
  HttpError,
  HttpRequestOptions,
  HttpResponse,
  RequestInterceptor,
  ResponseInterceptor,
} from '../types.js'

// We need to reset the module state between tests
let setClient: typeof ProviderModule.setClient
let getClient: typeof ProviderModule.getClient
let hasClient: typeof ProviderModule.hasClient
let request: typeof ProviderModule.request
let get: typeof ProviderModule.get
let post: typeof ProviderModule.post
let put: typeof ProviderModule.put
let patch: typeof ProviderModule.patch
let del: typeof ProviderModule.del

describe('http provider', () => {
  beforeEach(async () => {
    // Reset modules to get fresh state
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setClient = providerModule.setClient
    getClient = providerModule.getClient
    hasClient = providerModule.hasClient
    request = providerModule.request
    get = providerModule.get
    post = providerModule.post
    put = providerModule.put
    patch = providerModule.patch
    del = providerModule.del
  })

  describe('client management', () => {
    it('should return default client when none is set', () => {
      // HTTP has a default fetch-based client
      const client = getClient()
      expect(client).toBeDefined()
      expect(typeof client.request).toBe('function')
    })

    it('should return false when no custom client is configured', () => {
      expect(hasClient()).toBe(false)
    })

    it('should set and get custom client', () => {
      const mockClient: HttpClient = {
        request: vi.fn(),
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
      }
      setClient(mockClient)
      expect(getClient()).toBe(mockClient)
    })

    it('should return true when custom client is configured', () => {
      const mockClient: HttpClient = {
        request: vi.fn(),
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
      }
      setClient(mockClient)
      expect(hasClient()).toBe(true)
    })
  })

  describe('request methods with mock client', () => {
    let mockClient: HttpClient
    const mockResponse: HttpResponse<{ data: string }> = {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: { data: 'test' },
      request: { url: 'https://api.example.com/test' },
    }

    beforeEach(() => {
      mockClient = {
        request: vi.fn().mockResolvedValue(mockResponse),
        get: vi.fn().mockResolvedValue(mockResponse),
        post: vi.fn().mockResolvedValue(mockResponse),
        put: vi.fn().mockResolvedValue(mockResponse),
        patch: vi.fn().mockResolvedValue(mockResponse),
        delete: vi.fn().mockResolvedValue(mockResponse),
      }
      setClient(mockClient)
    })

    it('should call client request', async () => {
      const result = await request('https://api.example.com/test', { method: 'GET' })

      expect(mockClient.request).toHaveBeenCalledWith('https://api.example.com/test', {
        method: 'GET',
      })
      expect(result).toBe(mockResponse)
    })

    it('should call client get', async () => {
      const result = await get('https://api.example.com/test', { headers: { 'X-Custom': 'value' } })

      expect(mockClient.get).toHaveBeenCalledWith('https://api.example.com/test', {
        headers: { 'X-Custom': 'value' },
      })
      expect(result).toBe(mockResponse)
    })

    it('should call client post', async () => {
      const body = { key: 'value' }
      const result = await post('https://api.example.com/test', body, { headers: {} })

      expect(mockClient.post).toHaveBeenCalledWith('https://api.example.com/test', body, {
        headers: {},
      })
      expect(result).toBe(mockResponse)
    })

    it('should call client put', async () => {
      const body = { updated: true }
      const result = await put('https://api.example.com/test', body)

      expect(mockClient.put).toHaveBeenCalledWith('https://api.example.com/test', body, undefined)
      expect(result).toBe(mockResponse)
    })

    it('should call client patch', async () => {
      const body = { partial: 'update' }
      const result = await patch('https://api.example.com/test', body)

      expect(mockClient.patch).toHaveBeenCalledWith('https://api.example.com/test', body, undefined)
      expect(result).toBe(mockResponse)
    })

    it('should call client delete', async () => {
      const result = await del('https://api.example.com/test')

      expect(mockClient.delete).toHaveBeenCalledWith('https://api.example.com/test', undefined)
      expect(result).toBe(mockResponse)
    })
  })
})

describe('default http client', () => {
  let defaultClient: typeof ClientModule.defaultClient

  beforeEach(async () => {
    vi.resetModules()
    const clientModule = await import('../client.js')
    defaultClient = clientModule.defaultClient

    // Mock global fetch
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should make GET request with default method', async () => {
    const mockResponse = new Response(JSON.stringify({ result: 'ok' }), {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
    })
    vi.mocked(global.fetch).mockResolvedValue(mockResponse)

    const result = await defaultClient.request('https://api.example.com/test')

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result.status).toBe(200)
    expect(result.data).toEqual({ result: 'ok' })
  })

  it('should add query params to URL', async () => {
    const mockResponse = new Response('{}', { status: 200 })
    vi.mocked(global.fetch).mockResolvedValue(mockResponse)

    await defaultClient.request('https://api.example.com/test', {
      params: { foo: 'bar', num: 42, flag: true, empty: undefined },
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/test?foo=bar&num=42&flag=true',
      expect.anything(),
    )
  })

  it('should append query params to existing URL params', async () => {
    const mockResponse = new Response('{}', { status: 200 })
    vi.mocked(global.fetch).mockResolvedValue(mockResponse)

    await defaultClient.request('https://api.example.com/test?existing=param', {
      params: { added: 'value' },
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/test?existing=param&added=value',
      expect.anything(),
    )
  })

  it('should prepend baseURL', async () => {
    const mockResponse = new Response('{}', { status: 200 })
    vi.mocked(global.fetch).mockResolvedValue(mockResponse)

    await defaultClient.request('/users', {
      baseURL: 'https://api.example.com',
    })

    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/users', expect.anything())
  })

  it('should send JSON body', async () => {
    const mockResponse = new Response('{}', { status: 200 })
    vi.mocked(global.fetch).mockResolvedValue(mockResponse)

    await defaultClient.request('https://api.example.com/test', {
      method: 'POST',
      body: { data: 'value' },
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        method: 'POST',
        body: '{"data":"value"}',
      }),
    )
  })

  it('should send string body as-is', async () => {
    const mockResponse = new Response('{}', { status: 200 })
    vi.mocked(global.fetch).mockResolvedValue(mockResponse)

    await defaultClient.request('https://api.example.com/test', {
      method: 'POST',
      body: 'raw string body',
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        body: 'raw string body',
      }),
    )
  })

  it('should handle text response type', async () => {
    const mockResponse = new Response('plain text', { status: 200 })
    vi.mocked(global.fetch).mockResolvedValue(mockResponse)

    const result = await defaultClient.request<string>('https://api.example.com/test', {
      responseType: 'text',
    })

    expect(result.data).toBe('plain text')
  })

  it('should throw HttpError for non-ok response', async () => {
    const mockResponse = new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      statusText: 'Not Found',
    })
    vi.mocked(global.fetch).mockResolvedValue(mockResponse)

    await expect(defaultClient.request('https://api.example.com/missing')).rejects.toThrow(
      'HTTP 404: Not Found',
    )
  })

  it('should include response in HttpError', async () => {
    const mockResponse = new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      statusText: 'Forbidden',
    })
    vi.mocked(global.fetch).mockResolvedValue(mockResponse)

    try {
      await defaultClient.request('https://api.example.com/forbidden')
      expect.fail('Should have thrown')
    } catch (error) {
      const httpError = error as HttpError
      expect(httpError.response?.status).toBe(403)
      expect(httpError.response?.data).toEqual({ error: 'Forbidden' })
    }
  })

  it('should use provided abort signal', async () => {
    const mockResponse = new Response('{}', { status: 200 })
    vi.mocked(global.fetch).mockResolvedValue(mockResponse)

    const controller = new AbortController()
    await defaultClient.request('https://api.example.com/test', {
      signal: controller.signal,
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/test',
      expect.objectContaining({
        signal: controller.signal,
      }),
    )
  })

  it('should handle empty response body', async () => {
    // Note: In Node.js, Response with status 204 must have null body
    const mockResponse = new Response(null, { status: 204 })
    vi.mocked(global.fetch).mockResolvedValue(mockResponse)

    const result = await defaultClient.request('https://api.example.com/test')

    expect(result.status).toBe(204)
    expect(result.data).toBeNull()
  })

  describe('convenience methods', () => {
    beforeEach(() => {
      const mockResponse = new Response('{}', { status: 200 })
      vi.mocked(global.fetch).mockResolvedValue(mockResponse)
    })

    it('should make GET request', async () => {
      await defaultClient.get('https://api.example.com/test')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({ method: 'GET' }),
      )
    })

    it('should make POST request', async () => {
      await defaultClient.post('https://api.example.com/test', { data: 'value' })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({ method: 'POST', body: '{"data":"value"}' }),
      )
    })

    it('should make PUT request', async () => {
      await defaultClient.put('https://api.example.com/test', { update: true })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({ method: 'PUT', body: '{"update":true}' }),
      )
    })

    it('should make PATCH request', async () => {
      await defaultClient.patch('https://api.example.com/test', { partial: 'update' })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({ method: 'PATCH', body: '{"partial":"update"}' }),
      )
    })

    it('should make DELETE request', async () => {
      await defaultClient.delete('https://api.example.com/test')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({ method: 'DELETE' }),
      )
    })
  })
})

describe('http types', () => {
  it('should export HttpRequestOptions type', () => {
    const options: HttpRequestOptions = {
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
      body: { data: 'value' },
      params: { page: 1, limit: 10 },
      timeout: 5000,
      baseURL: 'https://api.example.com',
      credentials: 'include',
      responseType: 'json',
    }
    expect(options.method).toBe('POST')
  })

  it('should export HttpResponse type', () => {
    const response: HttpResponse<{ id: number }> = {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: { id: 1 },
      request: { url: 'https://api.example.com/test' },
    }
    expect(response.status).toBe(200)
    expect(response.data.id).toBe(1)
  })

  it('should export HttpError type', () => {
    const error: HttpError = Object.assign(new Error('HTTP 404'), {
      response: {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        data: { error: 'Not Found' },
        request: { url: 'https://api.example.com/missing' },
      },
      request: { url: 'https://api.example.com/missing' },
      code: 'ERR_NOT_FOUND',
      isAborted: false,
      isTimeout: false,
    })
    expect(error.response?.status).toBe(404)
  })

  it('should export RequestInterceptor type', () => {
    const interceptor: RequestInterceptor = (options) => {
      return { ...options, headers: { ...options.headers, 'X-Custom': 'value' } }
    }
    const result = interceptor({ url: 'https://test.com', headers: {} })
    expect(result.headers).toHaveProperty('X-Custom')
  })

  it('should export ResponseInterceptor type', () => {
    const interceptor: ResponseInterceptor = (response) => {
      return { ...response, data: { wrapped: response.data } }
    }
    const result = interceptor({
      status: 200,
      statusText: 'OK',
      headers: {},
      data: 'original',
      request: { url: 'https://test.com' },
    })
    expect(result.data).toEqual({ wrapped: 'original' })
  })

  it('should export ErrorInterceptor type', () => {
    const interceptor: ErrorInterceptor = (error) => {
      return { ...error, message: 'Modified: ' + error.message }
    }
    const error: HttpError = Object.assign(new Error('original'), {
      request: { url: 'https://test.com' },
    })
    const result = interceptor(error)
    expect(result.message).toBe('Modified: original')
  })

  it('should export HttpClient type with required methods', () => {
    const client: HttpClient = {
      request: async <T>(
        _url: string,
        _options?: HttpRequestOptions,
      ): Promise<HttpResponse<T>> => ({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: null as T,
        request: { url: _url },
      }),
      get: async <T>(_url: string): Promise<HttpResponse<T>> => ({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: null as T,
        request: { url: _url },
      }),
      post: async <T>(_url: string, _body?: unknown): Promise<HttpResponse<T>> => ({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: null as T,
        request: { url: _url },
      }),
      put: async <T>(_url: string, _body?: unknown): Promise<HttpResponse<T>> => ({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: null as T,
        request: { url: _url },
      }),
      patch: async <T>(_url: string, _body?: unknown): Promise<HttpResponse<T>> => ({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: null as T,
        request: { url: _url },
      }),
      delete: async <T>(_url: string): Promise<HttpResponse<T>> => ({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: null as T,
        request: { url: _url },
      }),
    }
    expect(typeof client.request).toBe('function')
    expect(typeof client.get).toBe('function')
    expect(typeof client.post).toBe('function')
    expect(typeof client.put).toBe('function')
    expect(typeof client.patch).toBe('function')
    expect(typeof client.delete).toBe('function')
  })

  it('should export HttpClient type with optional methods', () => {
    const client: HttpClient = {
      request: async () => ({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: null,
        request: { url: '' },
      }),
      get: async () => ({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: null,
        request: { url: '' },
      }),
      post: async () => ({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: null,
        request: { url: '' },
      }),
      put: async () => ({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: null,
        request: { url: '' },
      }),
      patch: async () => ({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: null,
        request: { url: '' },
      }),
      delete: async () => ({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: null,
        request: { url: '' },
      }),
      create: (_defaults: HttpRequestOptions) => client,
      addRequestInterceptor: (_interceptor: RequestInterceptor) => () => {},
      addResponseInterceptor: (_interceptor: ResponseInterceptor) => () => {},
      addErrorInterceptor: (_interceptor: ErrorInterceptor) => () => {},
    }
    expect(typeof client.create).toBe('function')
    expect(typeof client.addRequestInterceptor).toBe('function')
    expect(typeof client.addResponseInterceptor).toBe('function')
    expect(typeof client.addErrorInterceptor).toBe('function')
  })
})
