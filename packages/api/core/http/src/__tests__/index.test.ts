/**
 * Tests for the `@molecule/api-http` package exports.
 *
 * These tests verify that all public API exports are available
 * and function correctly when imported from the main entry point.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ErrorInterceptor,
  HttpClient,
  HttpError,
  HttpRequestOptions,
  HttpResponse,
  RequestInterceptor,
  ResponseInterceptor,
} from '../index.js'
import type * as IndexModule from '../index.js'

// We need to reset the module state between tests
let setClient: typeof IndexModule.setClient
let getClient: typeof IndexModule.getClient
let hasClient: typeof IndexModule.hasClient
let request: typeof IndexModule.request
let get: typeof IndexModule.get
let post: typeof IndexModule.post
let put: typeof IndexModule.put
let patch: typeof IndexModule.patch
let del: typeof IndexModule.del

describe('@molecule/api-http exports', () => {
  beforeEach(async () => {
    // Reset modules to get fresh state
    vi.resetModules()
    const indexModule = await import('../index.js')
    setClient = indexModule.setClient
    getClient = indexModule.getClient
    hasClient = indexModule.hasClient
    request = indexModule.request
    get = indexModule.get
    post = indexModule.post
    put = indexModule.put
    patch = indexModule.patch
    del = indexModule.del
  })

  describe('type exports', () => {
    it('should export HttpRequestOptions type with all properties', () => {
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
      expect(options.headers).toEqual({ Authorization: 'Bearer token' })
      expect(options.body).toEqual({ data: 'value' })
      expect(options.params).toEqual({ page: 1, limit: 10 })
      expect(options.timeout).toBe(5000)
      expect(options.baseURL).toBe('https://api.example.com')
      expect(options.credentials).toBe('include')
      expect(options.responseType).toBe('json')
    })

    it('should export HttpRequestOptions type with method variants', () => {
      const methods: HttpRequestOptions['method'][] = [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'HEAD',
        'OPTIONS',
      ]
      methods.forEach((method) => {
        const options: HttpRequestOptions = { method }
        expect(options.method).toBe(method)
      })
    })

    it('should export HttpRequestOptions type with credential variants', () => {
      const credentials: HttpRequestOptions['credentials'][] = ['omit', 'same-origin', 'include']
      credentials.forEach((cred) => {
        const options: HttpRequestOptions = { credentials: cred }
        expect(options.credentials).toBe(cred)
      })
    })

    it('should export HttpRequestOptions type with responseType variants', () => {
      const responseTypes: HttpRequestOptions['responseType'][] = [
        'json',
        'text',
        'blob',
        'arraybuffer',
      ]
      responseTypes.forEach((type) => {
        const options: HttpRequestOptions = { responseType: type }
        expect(options.responseType).toBe(type)
      })
    })

    it('should export HttpRequestOptions type with AbortSignal', () => {
      const controller = new AbortController()
      const options: HttpRequestOptions = { signal: controller.signal }
      expect(options.signal).toBe(controller.signal)
    })

    it('should export HttpRequestOptions type with custom properties', () => {
      const options: HttpRequestOptions = {
        customOption: 'value',
        anotherCustom: 123,
      }
      expect(options.customOption).toBe('value')
      expect(options.anotherCustom).toBe(123)
    })

    it('should export HttpResponse type with generic data', () => {
      interface UserData {
        id: number
        name: string
      }
      const response: HttpResponse<UserData> = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { id: 1, name: 'John' },
        request: { url: 'https://api.example.com/users/1' },
      }
      expect(response.status).toBe(200)
      expect(response.statusText).toBe('OK')
      expect(response.headers['content-type']).toBe('application/json')
      expect(response.data.id).toBe(1)
      expect(response.data.name).toBe('John')
      expect(response.request.url).toBe('https://api.example.com/users/1')
    })

    it('should export HttpResponse type with array data', () => {
      const response: HttpResponse<string[]> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: ['item1', 'item2', 'item3'],
        request: { url: 'https://api.example.com/items' },
      }
      expect(response.data).toHaveLength(3)
      expect(response.data[0]).toBe('item1')
    })

    it('should export HttpError type with all properties', () => {
      const error: HttpError = Object.assign(new Error('HTTP 500: Internal Server Error'), {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          headers: { 'content-type': 'application/json' },
          data: { message: 'Something went wrong' },
          request: { url: 'https://api.example.com/error' },
        },
        request: { url: 'https://api.example.com/error', method: 'POST' as const },
        code: 'ERR_HTTP_500',
        isAborted: false,
        isTimeout: false,
      })
      expect(error.message).toBe('HTTP 500: Internal Server Error')
      expect(error.response?.status).toBe(500)
      expect(error.request.url).toBe('https://api.example.com/error')
      expect(error.code).toBe('ERR_HTTP_500')
      expect(error.isAborted).toBe(false)
      expect(error.isTimeout).toBe(false)
    })

    it('should export HttpError type for aborted requests', () => {
      const error: HttpError = Object.assign(new Error('Request aborted'), {
        request: { url: 'https://api.example.com/aborted' },
        isAborted: true,
      })
      expect(error.isAborted).toBe(true)
      expect(error.response).toBeUndefined()
    })

    it('should export HttpError type for timeout requests', () => {
      const error: HttpError = Object.assign(new Error('Request timeout'), {
        request: { url: 'https://api.example.com/slow' },
        code: 'ETIMEDOUT',
        isTimeout: true,
      })
      expect(error.isTimeout).toBe(true)
      expect(error.code).toBe('ETIMEDOUT')
    })

    it('should export RequestInterceptor type', () => {
      const interceptor: RequestInterceptor = (options) => {
        return {
          ...options,
          headers: {
            ...options.headers,
            'X-Request-ID': 'uuid-1234',
          },
        }
      }
      const result = interceptor({ url: 'https://api.example.com', headers: {} })
      expect(result.headers).toHaveProperty('X-Request-ID', 'uuid-1234')
    })

    it('should export async RequestInterceptor type', async () => {
      const interceptor: RequestInterceptor = async (options) => {
        // Simulate async token fetch
        await Promise.resolve()
        return {
          ...options,
          headers: {
            ...options.headers,
            Authorization: 'Bearer async-token',
          },
        }
      }
      const result = await interceptor({ url: 'https://api.example.com', headers: {} })
      expect(result.headers).toHaveProperty('Authorization', 'Bearer async-token')
    })

    it('should export ResponseInterceptor type', () => {
      const interceptor: ResponseInterceptor = (response) => {
        return {
          ...response,
          data: { ...(response.data as object), intercepted: true },
        }
      }
      const result = interceptor({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { original: 'data' },
        request: { url: 'https://api.example.com' },
      })
      expect(result.data).toEqual({ original: 'data', intercepted: true })
    })

    it('should export async ResponseInterceptor type', async () => {
      const interceptor: ResponseInterceptor = async (response) => {
        await Promise.resolve()
        return {
          ...response,
          headers: { ...response.headers, 'X-Processed': 'true' },
        }
      }
      const result = await interceptor({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: null,
        request: { url: 'https://api.example.com' },
      })
      expect(result.headers).toHaveProperty('X-Processed', 'true')
    })

    it('should export ErrorInterceptor type', () => {
      const interceptor: ErrorInterceptor = (error) => {
        return Object.assign(error, {
          message: `Intercepted: ${error.message}`,
        })
      }
      const originalError: HttpError = Object.assign(new Error('Original error'), {
        request: { url: 'https://api.example.com' },
      })
      const result = interceptor(originalError)
      expect(result.message).toBe('Intercepted: Original error')
    })

    it('should export async ErrorInterceptor type', async () => {
      const interceptor: ErrorInterceptor = async (error) => {
        await Promise.resolve()
        return Object.assign(error, { logged: true })
      }
      const originalError: HttpError = Object.assign(new Error('Error'), {
        request: { url: 'https://api.example.com' },
      })
      const result = await interceptor(originalError)
      expect((result as HttpError & { logged: boolean }).logged).toBe(true)
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
          data: {} as T,
          request: { url: _url },
        }),
        get: async <T>(
          _url: string,
          _options?: Omit<HttpRequestOptions, 'method' | 'body'>,
        ): Promise<HttpResponse<T>> => ({
          status: 200,
          statusText: 'OK',
          headers: {},
          data: {} as T,
          request: { url: _url },
        }),
        post: async <T>(
          _url: string,
          _body?: unknown,
          _options?: Omit<HttpRequestOptions, 'method' | 'body'>,
        ): Promise<HttpResponse<T>> => ({
          status: 200,
          statusText: 'OK',
          headers: {},
          data: {} as T,
          request: { url: _url },
        }),
        put: async <T>(
          _url: string,
          _body?: unknown,
          _options?: Omit<HttpRequestOptions, 'method' | 'body'>,
        ): Promise<HttpResponse<T>> => ({
          status: 200,
          statusText: 'OK',
          headers: {},
          data: {} as T,
          request: { url: _url },
        }),
        patch: async <T>(
          _url: string,
          _body?: unknown,
          _options?: Omit<HttpRequestOptions, 'method' | 'body'>,
        ): Promise<HttpResponse<T>> => ({
          status: 200,
          statusText: 'OK',
          headers: {},
          data: {} as T,
          request: { url: _url },
        }),
        delete: async <T>(
          _url: string,
          _options?: Omit<HttpRequestOptions, 'method'>,
        ): Promise<HttpResponse<T>> => ({
          status: 200,
          statusText: 'OK',
          headers: {},
          data: {} as T,
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
      const baseClient: HttpClient = {
        request: async <T>(): Promise<HttpResponse<T>> => ({
          status: 200,
          statusText: 'OK',
          headers: {},
          data: {} as T,
          request: { url: '' },
        }),
        get: async <T>(): Promise<HttpResponse<T>> => ({
          status: 200,
          statusText: 'OK',
          headers: {},
          data: {} as T,
          request: { url: '' },
        }),
        post: async <T>(): Promise<HttpResponse<T>> => ({
          status: 200,
          statusText: 'OK',
          headers: {},
          data: {} as T,
          request: { url: '' },
        }),
        put: async <T>(): Promise<HttpResponse<T>> => ({
          status: 200,
          statusText: 'OK',
          headers: {},
          data: {} as T,
          request: { url: '' },
        }),
        patch: async <T>(): Promise<HttpResponse<T>> => ({
          status: 200,
          statusText: 'OK',
          headers: {},
          data: {} as T,
          request: { url: '' },
        }),
        delete: async <T>(): Promise<HttpResponse<T>> => ({
          status: 200,
          statusText: 'OK',
          headers: {},
          data: {} as T,
          request: { url: '' },
        }),
      }

      const clientWithOptionals: HttpClient = {
        ...baseClient,
        create: (_defaults: HttpRequestOptions) => baseClient,
        addRequestInterceptor: (_interceptor: RequestInterceptor) => () => {},
        addResponseInterceptor: (_interceptor: ResponseInterceptor) => () => {},
        addErrorInterceptor: (_interceptor: ErrorInterceptor) => () => {},
      }

      expect(typeof clientWithOptionals.create).toBe('function')
      expect(typeof clientWithOptionals.addRequestInterceptor).toBe('function')
      expect(typeof clientWithOptionals.addResponseInterceptor).toBe('function')
      expect(typeof clientWithOptionals.addErrorInterceptor).toBe('function')
    })
  })

  describe('provider function exports', () => {
    it('should export setClient function', () => {
      expect(typeof setClient).toBe('function')
    })

    it('should export getClient function', () => {
      expect(typeof getClient).toBe('function')
    })

    it('should export hasClient function', () => {
      expect(typeof hasClient).toBe('function')
    })

    it('should export request function', () => {
      expect(typeof request).toBe('function')
    })

    it('should export get function', () => {
      expect(typeof get).toBe('function')
    })

    it('should export post function', () => {
      expect(typeof post).toBe('function')
    })

    it('should export put function', () => {
      expect(typeof put).toBe('function')
    })

    it('should export patch function', () => {
      expect(typeof patch).toBe('function')
    })

    it('should export del function', () => {
      expect(typeof del).toBe('function')
    })
  })

  describe('client management integration', () => {
    it('should have default client available', () => {
      const client = getClient()
      expect(client).toBeDefined()
      expect(typeof client.request).toBe('function')
      expect(typeof client.get).toBe('function')
      expect(typeof client.post).toBe('function')
      expect(typeof client.put).toBe('function')
      expect(typeof client.patch).toBe('function')
      expect(typeof client.delete).toBe('function')
    })

    it('should report no custom client initially', () => {
      expect(hasClient()).toBe(false)
    })

    it('should set and retrieve custom client', () => {
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
      expect(hasClient()).toBe(true)
    })

    it('should use custom client for all request methods', async () => {
      const mockResponse: HttpResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { success: true },
        request: { url: 'https://api.example.com' },
      }

      const mockClient: HttpClient = {
        request: vi.fn().mockResolvedValue(mockResponse),
        get: vi.fn().mockResolvedValue(mockResponse),
        post: vi.fn().mockResolvedValue(mockResponse),
        put: vi.fn().mockResolvedValue(mockResponse),
        patch: vi.fn().mockResolvedValue(mockResponse),
        delete: vi.fn().mockResolvedValue(mockResponse),
      }

      setClient(mockClient)

      const url = 'https://api.example.com/test'
      const body = { data: 'value' }
      const options = { headers: { 'X-Custom': 'header' } }

      await request(url, { method: 'GET' })
      expect(mockClient.request).toHaveBeenCalledWith(url, { method: 'GET' })

      await get(url, options)
      expect(mockClient.get).toHaveBeenCalledWith(url, options)

      await post(url, body, options)
      expect(mockClient.post).toHaveBeenCalledWith(url, body, options)

      await put(url, body, options)
      expect(mockClient.put).toHaveBeenCalledWith(url, body, options)

      await patch(url, body, options)
      expect(mockClient.patch).toHaveBeenCalledWith(url, body, options)

      await del(url, options)
      expect(mockClient.delete).toHaveBeenCalledWith(url, options)
    })
  })

  describe('default client integration', () => {
    beforeEach(() => {
      // Mock global fetch for default client tests
      global.fetch = vi.fn()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should make request using default client when no custom client set', async () => {
      const mockFetchResponse = new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
      })
      vi.mocked(global.fetch).mockResolvedValue(mockFetchResponse)

      const result = await request<{ id: number }>('https://api.example.com/resource', {
        method: 'GET',
      })

      expect(global.fetch).toHaveBeenCalled()
      expect(result.status).toBe(200)
      expect(result.data).toEqual({ id: 1 })
    })

    it('should make GET request using default client', async () => {
      const mockFetchResponse = new Response(JSON.stringify([1, 2, 3]), {
        status: 200,
        statusText: 'OK',
      })
      vi.mocked(global.fetch).mockResolvedValue(mockFetchResponse)

      const result = await get<number[]>('https://api.example.com/items')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/items',
        expect.objectContaining({ method: 'GET' }),
      )
      expect(result.data).toEqual([1, 2, 3])
    })

    it('should make POST request using default client', async () => {
      const mockFetchResponse = new Response(JSON.stringify({ created: true }), {
        status: 201,
        statusText: 'Created',
      })
      vi.mocked(global.fetch).mockResolvedValue(mockFetchResponse)

      const result = await post<{ created: boolean }>('https://api.example.com/items', {
        name: 'New Item',
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/items',
        expect.objectContaining({
          method: 'POST',
          body: '{"name":"New Item"}',
        }),
      )
      expect(result.status).toBe(201)
      expect(result.data).toEqual({ created: true })
    })

    it('should make PUT request using default client', async () => {
      const mockFetchResponse = new Response(JSON.stringify({ updated: true }), {
        status: 200,
        statusText: 'OK',
      })
      vi.mocked(global.fetch).mockResolvedValue(mockFetchResponse)

      const result = await put<{ updated: boolean }>('https://api.example.com/items/1', {
        name: 'Updated Item',
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/items/1',
        expect.objectContaining({
          method: 'PUT',
          body: '{"name":"Updated Item"}',
        }),
      )
      expect(result.data).toEqual({ updated: true })
    })

    it('should make PATCH request using default client', async () => {
      const mockFetchResponse = new Response(JSON.stringify({ patched: true }), {
        status: 200,
        statusText: 'OK',
      })
      vi.mocked(global.fetch).mockResolvedValue(mockFetchResponse)

      const result = await patch<{ patched: boolean }>('https://api.example.com/items/1', {
        status: 'active',
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/items/1',
        expect.objectContaining({
          method: 'PATCH',
          body: '{"status":"active"}',
        }),
      )
      expect(result.data).toEqual({ patched: true })
    })

    it('should make DELETE request using default client', async () => {
      const mockFetchResponse = new Response(JSON.stringify({ deleted: true }), {
        status: 200,
        statusText: 'OK',
      })
      vi.mocked(global.fetch).mockResolvedValue(mockFetchResponse)

      const result = await del<{ deleted: boolean }>('https://api.example.com/items/1')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/items/1',
        expect.objectContaining({ method: 'DELETE' }),
      )
      expect(result.data).toEqual({ deleted: true })
    })

    it('should handle query parameters with default client', async () => {
      const mockFetchResponse = new Response(JSON.stringify({ items: [] }), {
        status: 200,
        statusText: 'OK',
      })
      vi.mocked(global.fetch).mockResolvedValue(mockFetchResponse)

      await get('https://api.example.com/search', {
        params: { q: 'test', page: 1, active: true },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/search?q=test&page=1&active=true',
        expect.anything(),
      )
    })

    it('should handle baseURL with default client', async () => {
      const mockFetchResponse = new Response('{}', { status: 200 })
      vi.mocked(global.fetch).mockResolvedValue(mockFetchResponse)

      await get('/users', { baseURL: 'https://api.example.com' })

      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/users', expect.anything())
    })

    it('should handle custom headers with default client', async () => {
      const mockFetchResponse = new Response('{}', { status: 200 })
      vi.mocked(global.fetch).mockResolvedValue(mockFetchResponse)

      await get('https://api.example.com/protected', {
        headers: {
          Authorization: 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/protected',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token123',
            'X-Custom-Header': 'custom-value',
          }),
        }),
      )
    })

    it('should handle error responses with default client', async () => {
      const mockFetchResponse = new Response(JSON.stringify({ error: 'Resource not found' }), {
        status: 404,
        statusText: 'Not Found',
      })
      vi.mocked(global.fetch).mockResolvedValue(mockFetchResponse)

      await expect(get('https://api.example.com/missing')).rejects.toThrow('HTTP 404: Not Found')
    })

    it('should handle network errors with default client', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      await expect(get('https://api.example.com/test')).rejects.toThrow('Network error')
    })

    it('should handle text response type with default client', async () => {
      const mockFetchResponse = new Response('Plain text response', {
        status: 200,
        statusText: 'OK',
      })
      vi.mocked(global.fetch).mockResolvedValue(mockFetchResponse)

      const result = await get<string>('https://api.example.com/text', {
        responseType: 'text',
      })

      expect(result.data).toBe('Plain text response')
    })

    it('should handle empty response body with default client', async () => {
      // Note: In Node.js, Response with status 204 must have null body
      const mockFetchResponse = new Response(null, {
        status: 204,
        statusText: 'No Content',
      })
      vi.mocked(global.fetch).mockResolvedValue(mockFetchResponse)

      const result = await del('https://api.example.com/items/1')

      expect(result.status).toBe(204)
      expect(result.data).toBeNull()
    })

    it('should pass abort signal to default client', async () => {
      const mockFetchResponse = new Response('{}', { status: 200 })
      vi.mocked(global.fetch).mockResolvedValue(mockFetchResponse)

      const controller = new AbortController()
      await get('https://api.example.com/test', { signal: controller.signal })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({ signal: controller.signal }),
      )
    })
  })

  describe('end-to-end scenarios', () => {
    beforeEach(() => {
      global.fetch = vi.fn()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should support typical CRUD workflow', async () => {
      // Create
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1, name: 'New Item' }), { status: 201 }),
      )
      const createResult = await post<{ id: number; name: string }>(
        'https://api.example.com/items',
        { name: 'New Item' },
      )
      expect(createResult.status).toBe(201)
      expect(createResult.data.id).toBe(1)

      // Read
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1, name: 'New Item' }), { status: 200 }),
      )
      const readResult = await get<{ id: number; name: string }>('https://api.example.com/items/1')
      expect(readResult.status).toBe(200)
      expect(readResult.data.name).toBe('New Item')

      // Update
      vi.mocked(global.fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1, name: 'Updated Item' }), { status: 200 }),
      )
      const updateResult = await put<{ id: number; name: string }>(
        'https://api.example.com/items/1',
        { name: 'Updated Item' },
      )
      expect(updateResult.status).toBe(200)
      expect(updateResult.data.name).toBe('Updated Item')

      // Delete
      // Note: In Node.js, Response with status 204 must have null body
      vi.mocked(global.fetch).mockResolvedValueOnce(new Response(null, { status: 204 }))
      const deleteResult = await del('https://api.example.com/items/1')
      expect(deleteResult.status).toBe(204)
    })

    it('should support paginated list queries', async () => {
      vi.mocked(global.fetch).mockResolvedValue(
        new Response(
          JSON.stringify({
            items: [{ id: 1 }, { id: 2 }],
            total: 100,
            page: 1,
            pageSize: 10,
          }),
          { status: 200 },
        ),
      )

      interface PaginatedResponse {
        items: { id: number }[]
        total: number
        page: number
        pageSize: number
      }

      const result = await get<PaginatedResponse>('https://api.example.com/items', {
        params: { page: 1, pageSize: 10, sort: 'createdAt', order: 'desc' },
      })

      expect(result.data.items).toHaveLength(2)
      expect(result.data.total).toBe(100)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        expect.anything(),
      )
    })

    it('should support switching between clients', async () => {
      // Start with default client
      const mockFetchResponse = new Response('{"source":"default"}', { status: 200 })
      vi.mocked(global.fetch).mockResolvedValue(mockFetchResponse)

      const defaultResult = await get<{ source: string }>('https://api.example.com/test')
      expect(defaultResult.data.source).toBe('default')
      expect(global.fetch).toHaveBeenCalled()

      // Switch to custom client
      const customResponse: HttpResponse<{ source: string }> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { source: 'custom' },
        request: { url: 'https://api.example.com/test' },
      }
      const mockClient: HttpClient = {
        request: vi.fn().mockResolvedValue(customResponse),
        get: vi.fn().mockResolvedValue(customResponse),
        post: vi.fn().mockResolvedValue(customResponse),
        put: vi.fn().mockResolvedValue(customResponse),
        patch: vi.fn().mockResolvedValue(customResponse),
        delete: vi.fn().mockResolvedValue(customResponse),
      }
      setClient(mockClient)

      const customResult = await get<{ source: string }>('https://api.example.com/test')
      expect(customResult.data.source).toBe('custom')
      expect(mockClient.get).toHaveBeenCalled()
    })
  })
})
