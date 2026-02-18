import { beforeEach, describe, expect, it, vi } from 'vitest'

// -------------------------------------------------------------------
// Use vi.hoisted so the mock instance is available inside the hoisted
// vi.mock factory (Vitest hoists vi.mock to the top of the file).
// -------------------------------------------------------------------

const { mockAxiosInstance, mockInterceptorsRequest, mockInterceptorsResponse } = vi.hoisted(() => {
  const mockInterceptorsRequest = {
    use: vi.fn(),
  }
  const mockInterceptorsResponse = {
    use: vi.fn(),
  }

  const mockAxiosInstance = {
    request: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: mockInterceptorsRequest,
      response: mockInterceptorsResponse,
    },
    defaults: {
      headers: {
        common: {} as Record<string, string>,
      },
    },
  }

  return { mockAxiosInstance, mockInterceptorsRequest, mockInterceptorsResponse }
})

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
  AxiosError: class AxiosError extends Error {
    response: unknown
    config: unknown
    constructor(message: string) {
      super(message)
      this.name = 'AxiosError'
    }
  },
}))

vi.mock('@molecule/app-http', () => {
  class HttpError extends Error {
    status: number
    response: unknown
    config: unknown
    constructor(message: string, status: number, response?: unknown, config?: unknown) {
      super(message)
      this.name = 'HttpError'
      this.status = status
      this.response = response
      this.config = config
    }
  }
  return { HttpError }
})

import type { AxiosInstance } from 'axios'

import { createAxiosClient, provider } from '../index.js'
import type { AxiosHttpClientConfig } from '../types.js'

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

/**
 * Creates a mock Axios response matching the AxiosResponse shape.
 */
function mockAxiosResponse<T>(
  data: T,
  status = 200,
  statusText = 'OK',
): {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
  config: { method: string; url: string; headers: Record<string, never>; data: undefined }
} {
  return {
    data,
    status,
    statusText,
    headers: { 'content-type': 'application/json' },
    config: {
      method: 'get',
      url: '/test',
      headers: {},
      data: undefined,
    },
  }
}

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('@molecule/app-http-axios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset common headers
    mockAxiosInstance.defaults.headers.common = {}
  })

  // ===================================================================
  // createAxiosClient - basic creation
  // ===================================================================

  describe('createAxiosClient', () => {
    it('should create a client with default config', () => {
      const client = createAxiosClient()

      expect(client).toBeDefined()
      expect(client.baseURL).toBe('')
      expect(client.defaultHeaders).toEqual({})
    })

    it('should create a client with custom baseURL', () => {
      const client = createAxiosClient({ baseURL: 'https://api.example.com' })

      expect(client.baseURL).toBe('https://api.example.com')
    })

    it('should create a client with custom default headers', () => {
      const headers = { 'X-Custom': 'value', Accept: 'application/json' }
      const client = createAxiosClient({ defaultHeaders: headers })

      expect(client.defaultHeaders).toEqual(headers)
    })

    it('should create a client with full config', () => {
      const config: AxiosHttpClientConfig = {
        baseURL: 'https://api.test.com',
        defaultHeaders: { 'X-App': 'test' },
        timeout: 5000,
        withCredentials: true,
        axiosConfig: { maxRedirects: 3 },
      }

      const client = createAxiosClient(config)

      expect(client.baseURL).toBe('https://api.test.com')
      expect(client.defaultHeaders).toEqual({ 'X-App': 'test' })
    })

    it('should use an existing Axios instance when provided', () => {
      const existingInstance = { ...mockAxiosInstance } as unknown as AxiosInstance
      const client = createAxiosClient({ instance: existingInstance })

      expect(client).toBeDefined()
      expect(client.baseURL).toBe('')
    })

    it('should register request and response interceptors on the axios instance', () => {
      createAxiosClient()

      expect(mockInterceptorsRequest.use).toHaveBeenCalledTimes(1)
      expect(mockInterceptorsResponse.use).toHaveBeenCalledTimes(1)
    })
  })

  // ===================================================================
  // HTTP methods
  // ===================================================================

  describe('HTTP methods', () => {
    describe('get', () => {
      it('should call axiosInstance.get and return HttpResponse', async () => {
        const client = createAxiosClient()
        const responseData = { id: 1, name: 'Test' }
        mockAxiosInstance.get.mockResolvedValueOnce(mockAxiosResponse(responseData))

        const result = await client.get('/users/1')

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users/1', expect.any(Object))
        expect(result.data).toEqual(responseData)
        expect(result.status).toBe(200)
        expect(result.statusText).toBe('OK')
        expect(result.config.method).toBe('GET')
        expect(result.config.url).toBe('/users/1')
      })

      it('should pass request config to axios', async () => {
        const client = createAxiosClient()
        mockAxiosInstance.get.mockResolvedValueOnce(mockAxiosResponse([]))

        await client.get('/users', {
          headers: { Authorization: 'Bearer token' },
          params: { page: 1 },
          timeout: 5000,
        })

        expect(mockAxiosInstance.get).toHaveBeenCalledWith(
          '/users',
          expect.objectContaining({
            headers: { Authorization: 'Bearer token' },
            params: { page: 1 },
            timeout: 5000,
          }),
        )
      })
    })

    describe('post', () => {
      it('should call axiosInstance.post with data and return HttpResponse', async () => {
        const client = createAxiosClient()
        const body = { name: 'New User' }
        const responseData = { id: 2, name: 'New User' }
        mockAxiosInstance.post.mockResolvedValueOnce(
          mockAxiosResponse(responseData, 201, 'Created'),
        )

        const result = await client.post('/users', body)

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/users', body, expect.any(Object))
        expect(result.data).toEqual(responseData)
        expect(result.status).toBe(201)
        expect(result.config.method).toBe('POST')
        expect(result.config.data).toBe(body)
      })

      it('should handle post with no data', async () => {
        const client = createAxiosClient()
        mockAxiosInstance.post.mockResolvedValueOnce(mockAxiosResponse(null, 204, 'No Content'))

        const result = await client.post('/action')

        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/action',
          undefined,
          expect.any(Object),
        )
        expect(result.status).toBe(204)
      })
    })

    describe('put', () => {
      it('should call axiosInstance.put with data and return HttpResponse', async () => {
        const client = createAxiosClient()
        const body = { name: 'Updated User' }
        mockAxiosInstance.put.mockResolvedValueOnce(mockAxiosResponse(body))

        const result = await client.put('/users/1', body)

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/users/1', body, expect.any(Object))
        expect(result.data).toEqual(body)
        expect(result.config.method).toBe('PUT')
      })
    })

    describe('patch', () => {
      it('should call axiosInstance.patch with data and return HttpResponse', async () => {
        const client = createAxiosClient()
        const body = { name: 'Patched' }
        mockAxiosInstance.patch.mockResolvedValueOnce(mockAxiosResponse(body))

        const result = await client.patch('/users/1', body)

        expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/users/1', body, expect.any(Object))
        expect(result.data).toEqual(body)
        expect(result.config.method).toBe('PATCH')
      })
    })

    describe('delete', () => {
      it('should call axiosInstance.delete and return HttpResponse', async () => {
        const client = createAxiosClient()
        mockAxiosInstance.delete.mockResolvedValueOnce(mockAxiosResponse(null, 204, 'No Content'))

        const result = await client.delete('/users/1')

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/users/1', expect.any(Object))
        expect(result.status).toBe(204)
        expect(result.config.method).toBe('DELETE')
      })
    })

    describe('request', () => {
      it('should call axiosInstance.request with full config', async () => {
        const client = createAxiosClient()
        const responseData = { items: [] }
        mockAxiosInstance.request.mockResolvedValueOnce(mockAxiosResponse(responseData))

        const result = await client.request({
          method: 'GET',
          url: '/items',
          headers: { Accept: 'application/json' },
        })

        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'get',
            url: '/items',
            headers: { Accept: 'application/json' },
          }),
        )
        expect(result.data).toEqual(responseData)
      })

      it('should support POST with data through request method', async () => {
        const client = createAxiosClient()
        const body = { key: 'value' }
        mockAxiosInstance.request.mockResolvedValueOnce(
          mockAxiosResponse({ ok: true }, 201, 'Created'),
        )

        const result = await client.request({
          method: 'POST',
          url: '/endpoint',
          data: body,
        })

        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'post',
            url: '/endpoint',
            data: body,
          }),
        )
        expect(result.status).toBe(201)
      })
    })
  })

  // ===================================================================
  // Response header conversion
  // ===================================================================

  describe('response header conversion', () => {
    it('should convert string headers to plain object', async () => {
      const client = createAxiosClient()
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'abc123',
        },
        config: { method: 'get', url: '/test', headers: {}, data: undefined },
      })

      const result = await client.get('/test')

      expect(result.headers['content-type']).toBe('application/json')
      expect(result.headers['x-request-id']).toBe('abc123')
    })

    it('should join array headers with comma-space', async () => {
      const client = createAxiosClient()
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {
          'set-cookie': ['cookie1=a', 'cookie2=b'],
        },
        config: { method: 'get', url: '/test', headers: {}, data: undefined },
      })

      const result = await client.get('/test')

      expect(result.headers['set-cookie']).toBe('cookie1=a, cookie2=b')
    })

    it('should handle empty headers', async () => {
      const client = createAxiosClient()
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { method: 'get', url: '/test', headers: {}, data: undefined },
      })

      const result = await client.get('/test')

      expect(result.headers).toEqual({})
    })
  })

  // ===================================================================
  // Auth token management
  // ===================================================================

  describe('auth token management', () => {
    it('should start with no auth token', () => {
      const client = createAxiosClient()

      expect(client.getAuthToken()).toBeNull()
    })

    it('should set auth token and update headers', () => {
      const client = createAxiosClient()

      client.setAuthToken('my-jwt-token')

      expect(client.getAuthToken()).toBe('my-jwt-token')
      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBe('Bearer my-jwt-token')
      expect(client.defaultHeaders['Authorization']).toBe('Bearer my-jwt-token')
    })

    it('should clear auth token when set to null', () => {
      const client = createAxiosClient()

      client.setAuthToken('token-123')
      expect(client.getAuthToken()).toBe('token-123')

      client.setAuthToken(null)
      expect(client.getAuthToken()).toBeNull()
      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBeUndefined()
      expect(client.defaultHeaders['Authorization']).toBeUndefined()
    })

    it('should allow changing auth token', () => {
      const client = createAxiosClient()

      client.setAuthToken('token-1')
      expect(client.getAuthToken()).toBe('token-1')

      client.setAuthToken('token-2')
      expect(client.getAuthToken()).toBe('token-2')
      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBe('Bearer token-2')
    })
  })

  // ===================================================================
  // Auth error handling
  // ===================================================================

  describe('auth error handling (onAuthError)', () => {
    it('should register an auth error handler and return unsubscribe function', () => {
      const client = createAxiosClient()
      const handler = vi.fn()

      const unsubscribe = client.onAuthError(handler)

      expect(typeof unsubscribe).toBe('function')
    })

    it('should unsubscribe auth error handler', () => {
      const client = createAxiosClient()
      const handler = vi.fn()

      const unsubscribe = client.onAuthError(handler)
      unsubscribe()

      // Handler should be removed - verify the function does not throw
      expect(unsubscribe).not.toThrow()
    })

    it('should allow multiple auth error handlers', () => {
      const client = createAxiosClient()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      const unsub1 = client.onAuthError(handler1)
      const unsub2 = client.onAuthError(handler2)

      expect(typeof unsub1).toBe('function')
      expect(typeof unsub2).toBe('function')
    })
  })

  // ===================================================================
  // Request interceptors
  // ===================================================================

  describe('request interceptors', () => {
    it('should add a request interceptor and return unsubscribe function', () => {
      const client = createAxiosClient()
      const interceptor = vi.fn((config) => config)

      const unsubscribe = client.addRequestInterceptor(interceptor)

      expect(typeof unsubscribe).toBe('function')
    })

    it('should remove a request interceptor via unsubscribe', () => {
      const client = createAxiosClient()
      const interceptor = vi.fn((config) => config)

      const unsubscribe = client.addRequestInterceptor(interceptor)
      unsubscribe()

      // Calling unsubscribe again should not throw
      expect(() => unsubscribe()).not.toThrow()
    })

    it('should support multiple request interceptors', () => {
      const client = createAxiosClient()
      const interceptor1 = vi.fn((config) => config)
      const interceptor2 = vi.fn((config) => config)

      const unsub1 = client.addRequestInterceptor(interceptor1)
      const unsub2 = client.addRequestInterceptor(interceptor2)

      expect(typeof unsub1).toBe('function')
      expect(typeof unsub2).toBe('function')
    })
  })

  // ===================================================================
  // Response interceptors
  // ===================================================================

  describe('response interceptors', () => {
    it('should add a response interceptor and return unsubscribe function', () => {
      const client = createAxiosClient()
      const interceptor = vi.fn((response) => response)

      const unsubscribe = client.addResponseInterceptor(interceptor)

      expect(typeof unsubscribe).toBe('function')
    })

    it('should remove a response interceptor via unsubscribe', () => {
      const client = createAxiosClient()
      const interceptor = vi.fn((response) => response)

      const unsubscribe = client.addResponseInterceptor(interceptor)
      unsubscribe()

      expect(() => unsubscribe()).not.toThrow()
    })
  })

  // ===================================================================
  // Error interceptors
  // ===================================================================

  describe('error interceptors', () => {
    it('should add an error interceptor and return unsubscribe function', () => {
      const client = createAxiosClient()
      const interceptor = vi.fn((error) => {
        throw error
      })

      const unsubscribe = client.addErrorInterceptor(interceptor)

      expect(typeof unsubscribe).toBe('function')
    })

    it('should remove an error interceptor via unsubscribe', () => {
      const client = createAxiosClient()
      const interceptor = vi.fn((error) => {
        throw error
      })

      const unsubscribe = client.addErrorInterceptor(interceptor)
      unsubscribe()

      expect(() => unsubscribe()).not.toThrow()
    })
  })

  // ===================================================================
  // Request config conversion
  // ===================================================================

  describe('request config conversion (toAxiosConfig)', () => {
    it('should pass withCredentials option', async () => {
      const client = createAxiosClient()
      mockAxiosInstance.get.mockResolvedValueOnce(mockAxiosResponse({}))

      await client.get('/test', { withCredentials: true })

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({ withCredentials: true }),
      )
    })

    it('should pass responseType option', async () => {
      const client = createAxiosClient()
      mockAxiosInstance.get.mockResolvedValueOnce(mockAxiosResponse('blob'))

      await client.get('/file', { responseType: 'blob' })

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/file',
        expect.objectContaining({ responseType: 'blob' }),
      )
    })

    it('should pass AbortSignal', async () => {
      const client = createAxiosClient()
      const controller = new AbortController()
      mockAxiosInstance.get.mockResolvedValueOnce(mockAxiosResponse({}))

      await client.get('/test', { signal: controller.signal })

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({ signal: controller.signal }),
      )
    })

    it('should spread custom options', async () => {
      const client = createAxiosClient()
      mockAxiosInstance.get.mockResolvedValueOnce(mockAxiosResponse({}))

      await client.get('/test', { options: { maxRedirects: 5 } })

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({ maxRedirects: 5 }),
      )
    })

    it('should handle empty config', async () => {
      const client = createAxiosClient()
      mockAxiosInstance.get.mockResolvedValueOnce(mockAxiosResponse({}))

      await client.get('/test')

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', expect.any(Object))
    })
  })

  // ===================================================================
  // Default provider
  // ===================================================================

  describe('provider (default export)', () => {
    it('should be a valid HttpClient', () => {
      expect(provider).toBeDefined()
      expect(typeof provider.get).toBe('function')
      expect(typeof provider.post).toBe('function')
      expect(typeof provider.put).toBe('function')
      expect(typeof provider.patch).toBe('function')
      expect(typeof provider.delete).toBe('function')
      expect(typeof provider.request).toBe('function')
      expect(typeof provider.addRequestInterceptor).toBe('function')
      expect(typeof provider.addResponseInterceptor).toBe('function')
      expect(typeof provider.addErrorInterceptor).toBe('function')
      expect(typeof provider.setAuthToken).toBe('function')
      expect(typeof provider.getAuthToken).toBe('function')
      expect(typeof provider.onAuthError).toBe('function')
    })

    it('should have default baseURL of empty string', () => {
      expect(provider.baseURL).toBe('')
    })

    it('should have empty defaultHeaders', () => {
      expect(provider.defaultHeaders).toEqual({})
    })
  })

  // ===================================================================
  // Type exports
  // ===================================================================

  describe('type exports', () => {
    it('should export AxiosHttpClientConfig interface (compile-time check)', () => {
      const config: AxiosHttpClientConfig = {
        baseURL: 'https://api.example.com',
        defaultHeaders: { 'X-Custom': 'value' },
        timeout: 5000,
        withCredentials: false,
        axiosConfig: {},
      }
      expect(config).toBeDefined()
    })

    it('should allow partial AxiosHttpClientConfig', () => {
      const config: AxiosHttpClientConfig = {}
      expect(config).toBeDefined()
    })

    it('should allow config with only baseURL', () => {
      const config: AxiosHttpClientConfig = {
        baseURL: 'https://example.com',
      }
      expect(config.baseURL).toBe('https://example.com')
    })
  })

  // ===================================================================
  // Edge cases
  // ===================================================================

  describe('edge cases', () => {
    it('should handle errors thrown by axios methods', async () => {
      const client = createAxiosClient()
      const error = new Error('Network Error')
      mockAxiosInstance.get.mockRejectedValueOnce(error)

      await expect(client.get('/fail')).rejects.toThrow('Network Error')
    })

    it('should handle HTTP error responses', async () => {
      const client = createAxiosClient()
      const error = new Error('Not Found')
      mockAxiosInstance.get.mockRejectedValueOnce(error)

      await expect(client.get('/not-found')).rejects.toThrow('Not Found')
    })

    it('should handle concurrent requests', async () => {
      const client = createAxiosClient()
      mockAxiosInstance.get
        .mockResolvedValueOnce(mockAxiosResponse({ id: 1 }))
        .mockResolvedValueOnce(mockAxiosResponse({ id: 2 }))
        .mockResolvedValueOnce(mockAxiosResponse({ id: 3 }))

      const [r1, r2, r3] = await Promise.all([
        client.get('/item/1'),
        client.get('/item/2'),
        client.get('/item/3'),
      ])

      expect(r1.data).toEqual({ id: 1 })
      expect(r2.data).toEqual({ id: 2 })
      expect(r3.data).toEqual({ id: 3 })
    })

    it('should handle generic type parameter on responses', async () => {
      interface User {
        id: number
        name: string
      }

      const client = createAxiosClient()
      mockAxiosInstance.get.mockResolvedValueOnce(mockAxiosResponse({ id: 1, name: 'Alice' }))

      const result = await client.get<User>('/users/1')

      expect(result.data.id).toBe(1)
      expect(result.data.name).toBe('Alice')
    })

    it('should handle response with non-string, non-array header values gracefully', async () => {
      const client = createAxiosClient()
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'text/plain',
          'x-numeric': 42,
        },
        config: { method: 'get', url: '/test', headers: {}, data: undefined },
      })

      const result = await client.get('/test')

      // Only string headers should be included
      expect(result.headers['content-type']).toBe('text/plain')
      expect(result.headers['x-numeric']).toBeUndefined()
    })

    it('should handle response with no headers', async () => {
      const client = createAxiosClient()
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: undefined,
        config: { method: 'get', url: '/test', headers: {}, data: undefined },
      })

      const result = await client.get('/test')

      expect(result.headers).toEqual({})
    })
  })
})
