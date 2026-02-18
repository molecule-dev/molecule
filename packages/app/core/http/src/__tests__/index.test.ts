import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ErrorInterceptor,
  FullRequestConfig,
  HttpClient,
  HttpClientConfig,
  HttpMethod,
  HttpResponse,
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
} from '../index.js'
import {
  createFetchClient,
  del,
  get,
  getClient,
  HttpError,
  patch,
  post,
  put,
  setClient,
} from '../index.js'

describe('@molecule/app-http', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
    // Reset the global client state by setting a new client
    setClient(createFetchClient())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const createMockResponse = (data: unknown, status = 200, statusText = 'OK'): Promise<object> => {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify(data)),
      json: () => Promise.resolve(data),
      blob: () => Promise.resolve(new Blob([JSON.stringify(data)])),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    })
  }

  describe('HttpError', () => {
    it('should create an HttpError with message and status', () => {
      const error = new HttpError('Not found', 404)

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(HttpError)
      expect(error.message).toBe('Not found')
      expect(error.status).toBe(404)
      expect(error.name).toBe('HttpError')
      expect(error.response).toBeUndefined()
      expect(error.config).toBeUndefined()
    })

    it('should create an HttpError with response and config', () => {
      const mockResponse: HttpResponse = {
        data: { error: 'Server error' },
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: { method: 'GET', url: '/test' },
      }
      const mockConfig: FullRequestConfig = { method: 'GET', url: '/test' }

      const error = new HttpError('Server error', 500, mockResponse, mockConfig)

      expect(error.status).toBe(500)
      expect(error.response).toBe(mockResponse)
      expect(error.config).toBe(mockConfig)
    })

    it('should have correct prototype chain', () => {
      const error = new HttpError('Test', 400)

      expect(Object.getPrototypeOf(error)).toBe(HttpError.prototype)
      expect(error instanceof Error).toBe(true)
    })
  })

  describe('setClient / getClient', () => {
    it('should set and get a custom client', () => {
      const customClient = createFetchClient({
        baseURL: 'https://custom.example.com',
      })

      setClient(customClient)
      const retrievedClient = getClient()

      expect(retrievedClient).toBe(customClient)
      expect(retrievedClient.baseURL).toBe('https://custom.example.com')
    })

    it('should create a default client if none is set', () => {
      // Create a fresh module context by setting null-like state
      const freshClient = createFetchClient()
      setClient(freshClient)

      const client = getClient()

      expect(client).toBeDefined()
      expect(typeof client.get).toBe('function')
      expect(typeof client.post).toBe('function')
    })

    it('should allow replacing the client multiple times', () => {
      const client1 = createFetchClient({ baseURL: 'https://one.com' })
      const client2 = createFetchClient({ baseURL: 'https://two.com' })

      setClient(client1)
      expect(getClient().baseURL).toBe('https://one.com')

      setClient(client2)
      expect(getClient().baseURL).toBe('https://two.com')
    })
  })

  describe('convenience methods', () => {
    describe('get()', () => {
      it('should make a GET request using the global client', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ id: 1 }))

        const response = await get('/users/1')

        expect(mockFetch).toHaveBeenCalledWith(
          '/users/1',
          expect.objectContaining({
            method: 'GET',
          }),
        )
        expect(response.data).toEqual({ id: 1 })
      })

      it('should pass request config to the client', async () => {
        mockFetch.mockImplementation(() => createMockResponse([]))

        await get('/users', { params: { page: 2 }, headers: { 'X-Custom': 'value' } })

        expect(mockFetch).toHaveBeenCalledWith(
          '/users?page=2',
          expect.objectContaining({
            headers: expect.objectContaining({ 'X-Custom': 'value' }),
          }),
        )
      })

      it('should use the configured client baseURL', async () => {
        mockFetch.mockImplementation(() => createMockResponse({}))
        setClient(createFetchClient({ baseURL: 'https://api.test.com' }))

        await get('/endpoint')

        expect(mockFetch).toHaveBeenCalledWith('https://api.test.com/endpoint', expect.any(Object))
      })
    })

    describe('post()', () => {
      it('should make a POST request using the global client', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ id: 1 }, 201))

        const response = await post('/users', { name: 'John' })

        expect(mockFetch).toHaveBeenCalledWith(
          '/users',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ name: 'John' }),
          }),
        )
        expect(response.status).toBe(201)
      })

      it('should handle POST without data', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ success: true }))

        await post('/trigger')

        expect(mockFetch).toHaveBeenCalledWith(
          '/trigger',
          expect.objectContaining({
            method: 'POST',
          }),
        )
      })

      it('should pass request config to the client', async () => {
        mockFetch.mockImplementation(() => createMockResponse({}))

        await post('/data', { value: 1 }, { headers: { 'X-Request-ID': 'abc' } })

        expect(mockFetch).toHaveBeenCalledWith(
          '/data',
          expect.objectContaining({
            headers: expect.objectContaining({ 'X-Request-ID': 'abc' }),
          }),
        )
      })
    })

    describe('put()', () => {
      it('should make a PUT request using the global client', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ updated: true }))

        const response = await put('/users/1', { name: 'Updated' })

        expect(mockFetch).toHaveBeenCalledWith(
          '/users/1',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ name: 'Updated' }),
          }),
        )
        expect(response.data).toEqual({ updated: true })
      })

      it('should handle PUT without data', async () => {
        mockFetch.mockImplementation(() => createMockResponse({}))

        await put('/resource/1')

        expect(mockFetch).toHaveBeenCalledWith(
          '/resource/1',
          expect.objectContaining({
            method: 'PUT',
          }),
        )
      })
    })

    describe('patch()', () => {
      it('should make a PATCH request using the global client', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ patched: true }))

        const response = await patch('/users/1', { status: 'active' })

        expect(mockFetch).toHaveBeenCalledWith(
          '/users/1',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ status: 'active' }),
          }),
        )
        expect(response.data).toEqual({ patched: true })
      })
    })

    describe('del()', () => {
      it('should make a DELETE request using the global client', async () => {
        mockFetch.mockImplementation(() => createMockResponse(null, 204))

        const response = await del('/users/1')

        expect(mockFetch).toHaveBeenCalledWith(
          '/users/1',
          expect.objectContaining({
            method: 'DELETE',
          }),
        )
        expect(response.status).toBe(204)
      })

      it('should pass request config to the client', async () => {
        mockFetch.mockImplementation(() => createMockResponse(null, 204))

        await del('/users/1', { headers: { 'X-Confirm': 'true' } })

        expect(mockFetch).toHaveBeenCalledWith(
          '/users/1',
          expect.objectContaining({
            headers: expect.objectContaining({ 'X-Confirm': 'true' }),
          }),
        )
      })
    })
  })

  describe('type exports', () => {
    it('should export HttpMethod type', () => {
      const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
      expect(methods).toHaveLength(7)
    })

    it('should export RequestConfig interface', () => {
      const config: RequestConfig = {
        headers: { 'Content-Type': 'application/json' },
        params: { page: 1, active: true },
        timeout: 5000,
        withCredentials: true,
        responseType: 'json',
      }
      expect(config.headers).toBeDefined()
      expect(config.params).toBeDefined()
    })

    it('should export FullRequestConfig interface', () => {
      const config: FullRequestConfig = {
        method: 'POST',
        url: '/api/data',
        data: { key: 'value' },
        headers: {},
      }
      expect(config.method).toBe('POST')
      expect(config.url).toBe('/api/data')
    })

    it('should export HttpResponse interface', () => {
      const response: HttpResponse<{ id: number }> = {
        data: { id: 1 },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        config: { method: 'GET', url: '/test' },
      }
      expect(response.data.id).toBe(1)
    })

    it('should export HttpClient interface', () => {
      const client: HttpClient = getClient()
      expect(typeof client.get).toBe('function')
      expect(typeof client.post).toBe('function')
      expect(typeof client.put).toBe('function')
      expect(typeof client.patch).toBe('function')
      expect(typeof client.delete).toBe('function')
      expect(typeof client.request).toBe('function')
      expect(typeof client.addRequestInterceptor).toBe('function')
      expect(typeof client.addResponseInterceptor).toBe('function')
      expect(typeof client.addErrorInterceptor).toBe('function')
      expect(typeof client.setAuthToken).toBe('function')
      expect(typeof client.getAuthToken).toBe('function')
      expect(typeof client.onAuthError).toBe('function')
    })

    it('should export HttpClientConfig interface', () => {
      const config: HttpClientConfig = {
        baseURL: 'https://api.example.com',
        defaultHeaders: { 'X-API-Key': 'secret' },
        timeout: 10000,
        withCredentials: false,
      }
      expect(config.baseURL).toBe('https://api.example.com')
    })

    it('should export interceptor types', () => {
      const requestInterceptor: RequestInterceptor = (config) => config
      const responseInterceptor: ResponseInterceptor = (response) => response
      const errorInterceptor: ErrorInterceptor = (error) => error

      expect(typeof requestInterceptor).toBe('function')
      expect(typeof responseInterceptor).toBe('function')
      expect(typeof errorInterceptor).toBe('function')
    })
  })

  describe('interceptor chaining', () => {
    it('should chain multiple request interceptors in order', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient()
      const order: number[] = []

      client.addRequestInterceptor((config) => {
        order.push(1)
        return { ...config, headers: { ...config.headers, 'X-First': 'true' } }
      })

      client.addRequestInterceptor((config) => {
        order.push(2)
        return { ...config, headers: { ...config.headers, 'X-Second': 'true' } }
      })

      await client.get('/test')

      expect(order).toEqual([1, 2])
      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-First': 'true',
            'X-Second': 'true',
          }),
        }),
      )
    })

    it('should chain multiple response interceptors in order', async () => {
      mockFetch.mockImplementation(() => createMockResponse({ count: 0 }))
      const client = createFetchClient()

      client.addResponseInterceptor((response) => ({
        ...response,
        data: {
          ...(response.data as object),
          count: (response.data as { count: number }).count + 1,
        },
      }))

      client.addResponseInterceptor((response) => ({
        ...response,
        data: {
          ...(response.data as object),
          count: (response.data as { count: number }).count + 10,
        },
      }))

      const response = await client.get('/test')

      expect(response.data).toEqual({ count: 11 })
    })

    it('should chain multiple error interceptors in order', async () => {
      mockFetch.mockImplementation(() => createMockResponse({ error: 'test' }, 500))
      const client = createFetchClient()
      const messages: string[] = []

      client.addErrorInterceptor((error) => {
        messages.push('first')
        error.message = error.message + ' [modified by first]'
        return error
      })

      client.addErrorInterceptor((error) => {
        messages.push('second')
        error.message = error.message + ' [modified by second]'
        return error
      })

      try {
        await client.get('/error')
      } catch (error) {
        expect(messages).toEqual(['first', 'second'])
        expect((error as HttpError).message).toContain('[modified by first]')
        expect((error as HttpError).message).toContain('[modified by second]')
      }
    })
  })

  describe('async interceptors', () => {
    it('should support async request interceptors', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient()

      client.addRequestInterceptor(async (config) => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return { ...config, headers: { ...config.headers, 'X-Async': 'true' } }
      })

      await client.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Async': 'true' }),
        }),
      )
    })

    it('should support async response interceptors', async () => {
      mockFetch.mockImplementation(() => createMockResponse({ value: 1 }))
      const client = createFetchClient()

      client.addResponseInterceptor(async (response) => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return { ...response, data: { value: 42 } }
      })

      const response = await client.get('/test')

      expect(response.data).toEqual({ value: 42 })
    })

    it('should support async error interceptors', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}, 500))
      const client = createFetchClient()

      client.addErrorInterceptor(async (error) => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        error.message = 'Async error handling'
        return error
      })

      try {
        await client.get('/error')
      } catch (error) {
        expect((error as HttpError).message).toBe('Async error handling')
      }
    })
  })

  describe('edge cases', () => {
    it('should handle empty response body', async () => {
      mockFetch.mockImplementation(() => ({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        text: () => Promise.resolve(''),
      }))
      const client = createFetchClient()

      const response = await client.delete('/users/1')

      expect(response.data).toBeNull()
    })

    it('should handle URL with existing query string', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient()

      await client.get('/search?q=test', { params: { page: 1 } })

      expect(mockFetch).toHaveBeenCalledWith('/search?q=test&page=1', expect.any(Object))
    })

    it('should handle boolean query params', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient()

      await client.get('/items', { params: { active: true, archived: false } })

      expect(mockFetch).toHaveBeenCalledWith(
        '/items?active=true&archived=false',
        expect.any(Object),
      )
    })

    it('should handle numeric query params', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient()

      await client.get('/items', { params: { minPrice: 100, maxPrice: 500 } })

      expect(mockFetch).toHaveBeenCalledWith('/items?minPrice=100&maxPrice=500', expect.any(Object))
    })

    it('should handle Blob data in POST request', async () => {
      mockFetch.mockImplementation(() => createMockResponse({ success: true }))
      const client = createFetchClient()
      const blob = new Blob(['test content'], { type: 'text/plain' })

      await client.post('/upload', blob)

      expect(mockFetch).toHaveBeenCalledWith(
        '/upload',
        expect.objectContaining({
          body: blob,
        }),
      )
    })

    it('should merge default headers with request headers', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient({
        defaultHeaders: { 'X-Default': 'default-value', 'X-Override': 'original' },
      })

      await client.get('/test', { headers: { 'X-Override': 'new-value', 'X-Custom': 'custom' } })

      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Default': 'default-value',
            'X-Override': 'new-value',
            'X-Custom': 'custom',
          }),
        }),
      )
    })

    it('should handle http:// absolute URLs without prepending baseURL', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient({ baseURL: 'https://api.example.com' })

      await client.get('http://insecure.example.com/data')

      expect(mockFetch).toHaveBeenCalledWith('http://insecure.example.com/data', expect.any(Object))
    })
  })

  describe('timeout handling', () => {
    it('should create AbortController for timeout when no signal is provided', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient({ timeout: 5000 })

      await client.get('/test')

      // Verify that a signal was passed to fetch (created internally for timeout)
      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      )
    })

    it('should use request timeout when specified', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient({ timeout: 5000 })

      await client.get('/test', { timeout: 1000 })

      // Verify that a signal was passed to fetch
      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      )
    })

    it('should not create timeout controller if signal is provided', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient({ timeout: 100 })
      const controller = new AbortController()

      await client.get('/test', { signal: controller.signal })

      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          signal: controller.signal,
        }),
      )
    })

    it('should handle abort error from user-provided signal', async () => {
      const controller = new AbortController()
      const abortError = new DOMException('The operation was aborted', 'AbortError')
      mockFetch.mockRejectedValue(abortError)
      const client = createFetchClient()

      controller.abort()

      await expect(client.get('/test', { signal: controller.signal })).rejects.toThrow(HttpError)
    })

    it('should not create signal if no timeout is configured', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient() // No timeout

      await client.get('/test')

      // Without timeout, signal should be undefined (same-origin credentials check)
      const callOptions = mockFetch.mock.calls[0][1]
      expect(callOptions.signal).toBeUndefined()
    })
  })

  describe('request method with generic request()', () => {
    it('should make a generic request with full config', async () => {
      mockFetch.mockImplementation(() => createMockResponse({ result: 'success' }))
      const client = createFetchClient()

      const response = await client.request({
        method: 'POST',
        url: '/api/action',
        data: { action: 'test' },
        headers: { 'X-Action': 'custom' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/action',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'test' }),
          headers: expect.objectContaining({ 'X-Action': 'custom' }),
        }),
      )
      expect(response.data).toEqual({ result: 'success' })
    })

    it('should support HEAD method', async () => {
      mockFetch.mockImplementation(() => createMockResponse(null))
      const client = createFetchClient()

      await client.request({ method: 'HEAD', url: '/check' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/check',
        expect.objectContaining({
          method: 'HEAD',
        }),
      )
    })

    it('should support OPTIONS method', async () => {
      mockFetch.mockImplementation(() => createMockResponse(null))
      const client = createFetchClient()

      await client.request({ method: 'OPTIONS', url: '/cors-check' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/cors-check',
        expect.objectContaining({
          method: 'OPTIONS',
        }),
      )
    })
  })

  describe('multiple auth error handlers', () => {
    it('should call all registered auth error handlers on 401', async () => {
      mockFetch.mockImplementation(() => createMockResponse({ error: 'Unauthorized' }, 401))
      const client = createFetchClient()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const handler3 = vi.fn()

      client.onAuthError(handler1)
      client.onAuthError(handler2)
      client.onAuthError(handler3)

      try {
        await client.get('/protected')
      } catch {
        // Expected error
      }

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
      expect(handler3).toHaveBeenCalledTimes(1)
    })

    it('should not call unregistered auth error handlers', async () => {
      mockFetch.mockImplementation(() => createMockResponse({ error: 'Unauthorized' }, 401))
      const client = createFetchClient()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      const unsubscribe1 = client.onAuthError(handler1)
      client.onAuthError(handler2)

      unsubscribe1()

      try {
        await client.get('/protected')
      } catch {
        // Expected error
      }

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledTimes(1)
    })
  })

  describe('error interceptors with network errors', () => {
    it('should apply error interceptors to network errors', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))
      const client = createFetchClient()
      const interceptorCalled = vi.fn()

      client.addErrorInterceptor((error) => {
        interceptorCalled()
        error.message = 'Custom network error message'
        return error
      })

      try {
        await client.get('/offline')
      } catch (error) {
        expect(interceptorCalled).toHaveBeenCalled()
        expect((error as HttpError).message).toBe('Custom network error message')
        expect((error as HttpError).status).toBe(0)
      }
    })

    it('should include config in network error HttpError', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'))
      const client = createFetchClient()

      try {
        await client.get('/unreachable')
      } catch (error) {
        expect((error as HttpError).config).toBeDefined()
        expect((error as HttpError).config?.method).toBe('GET')
        expect((error as HttpError).config?.url).toBe('/unreachable')
      }
    })
  })

  describe('response headers parsing', () => {
    it('should parse response headers correctly', async () => {
      const headers = new Headers({
        'Content-Type': 'application/json',
        'X-Request-ID': 'abc123',
        'X-Rate-Limit': '100',
      })
      mockFetch.mockImplementation(() => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers,
        text: () => Promise.resolve('{}'),
      }))
      const client = createFetchClient()

      const response = await client.get('/test')

      expect(response.headers['content-type']).toBe('application/json')
      expect(response.headers['x-request-id']).toBe('abc123')
      expect(response.headers['x-rate-limit']).toBe('100')
    })
  })

  describe('request config in response', () => {
    it('should include original request config in response', async () => {
      mockFetch.mockImplementation(() => createMockResponse({ data: 'test' }))
      const client = createFetchClient()

      const response = await client.post(
        '/api/data',
        { value: 1 },
        { headers: { 'X-Test': 'true' } },
      )

      expect(response.config.method).toBe('POST')
      expect(response.config.url).toBe('/api/data')
      expect(response.config.data).toEqual({ value: 1 })
    })
  })

  describe('typed responses', () => {
    interface User {
      id: number
      name: string
      email: string
    }

    it('should support typed responses with get', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({ id: 1, name: 'John', email: 'john@example.com' }),
      )
      const client = createFetchClient()

      const response = await client.get<User>('/users/1')

      expect(response.data.id).toBe(1)
      expect(response.data.name).toBe('John')
      expect(response.data.email).toBe('john@example.com')
    })

    it('should support typed responses with post', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({ id: 2, name: 'Jane', email: 'jane@example.com' }, 201),
      )
      const client = createFetchClient()

      const response = await client.post<User>('/users', {
        name: 'Jane',
        email: 'jane@example.com',
      })

      expect(response.data.id).toBe(2)
      expect(response.data.name).toBe('Jane')
    })

    it('should support typed responses with convenience methods', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({ id: 1, name: 'Test', email: 'test@example.com' }),
      )

      const response = await get<User>('/users/1')

      expect(response.data.id).toBe(1)
      expect(response.data.name).toBe('Test')
    })
  })

  describe('credentials with per-request override', () => {
    it('should override withCredentials on per-request basis', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient({ withCredentials: false })

      await client.get('/api', { withCredentials: true })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api',
        expect.objectContaining({
          credentials: 'include',
        }),
      )
    })

    it('should allow disabling credentials per-request when enabled globally', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient({ withCredentials: true })

      await client.get('/api', { withCredentials: false })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api',
        expect.objectContaining({
          credentials: 'same-origin',
        }),
      )
    })
  })
})
