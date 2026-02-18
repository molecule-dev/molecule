/**
 * Tests for `@molecule/api-http-axios` package.
 *
 * These tests verify the Axios HTTP client provider implementation.
 *
 * @module
 */

import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import type {
  ErrorInterceptor,
  HttpClient,
  HttpError,
  HttpRequestOptions,
  HttpResponse,
  RequestInterceptor,
  ResponseInterceptor,
} from '@molecule/api-http'

import type {
  axios as AxiosType,
  client as ClientType,
  createClient as CreateClientFn,
  provider as ProviderType,
} from '../index.js'

// Mock axios
vi.mock('axios', () => {
  const mockInstance = {
    request: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }
  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
  }
})

// We need to reset the module state between tests
let createClient: typeof CreateClientFn
let client: typeof ClientType
let provider: typeof ProviderType
let exportedAxios: typeof AxiosType

describe('@molecule/api-http-axios', () => {
  let mockAxiosInstance: {
    request: Mock
    interceptors: {
      request: { use: Mock }
      response: { use: Mock }
    }
  }

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    // Re-setup mock for each test
    mockAxiosInstance = {
      request: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    }
    vi.mocked(axios.create).mockReturnValue(mockAxiosInstance as unknown as AxiosInstance)

    // Import fresh module
    const indexModule = await import('../index.js')
    createClient = indexModule.createClient
    client = indexModule.client
    provider = indexModule.provider
    exportedAxios = indexModule.axios
  })

  describe('exports', () => {
    it('should export createClient function', () => {
      expect(typeof createClient).toBe('function')
    })

    it('should export client instance', () => {
      expect(client).toBeDefined()
      expect(typeof client.request).toBe('function')
      expect(typeof client.get).toBe('function')
      expect(typeof client.post).toBe('function')
      expect(typeof client.put).toBe('function')
      expect(typeof client.patch).toBe('function')
      expect(typeof client.delete).toBe('function')
    })

    it('should export provider as alias for client', () => {
      expect(provider).toBeDefined()
      expect(typeof provider.request).toBe('function')
    })

    it('should export axios for legacy usage', () => {
      expect(exportedAxios).toBeDefined()
    })

    it('should export type definitions', async () => {
      const typeExports = await import('../index.js')
      // Type exports are verified at compile time; just verify module loads
      expect(typeExports).toBeDefined()
    })
  })

  describe('createClient', () => {
    it('should create a new client without options', () => {
      const httpClient = createClient()
      expect(httpClient).toBeDefined()
      expect(typeof httpClient.request).toBe('function')
      expect(typeof httpClient.get).toBe('function')
      expect(typeof httpClient.post).toBe('function')
      expect(typeof httpClient.put).toBe('function')
      expect(typeof httpClient.patch).toBe('function')
      expect(typeof httpClient.delete).toBe('function')
      expect(typeof httpClient.create).toBe('function')
      expect(typeof httpClient.addRequestInterceptor).toBe('function')
      expect(typeof httpClient.addResponseInterceptor).toBe('function')
      expect(typeof httpClient.addErrorInterceptor).toBe('function')
    })

    it('should create axios instance with baseURL option', () => {
      createClient({ baseURL: 'https://api.example.com' })
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.example.com',
        timeout: undefined,
        headers: undefined,
      })
    })

    it('should create axios instance with timeout option', () => {
      createClient({ timeout: 5000 })
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: undefined,
        timeout: 5000,
        headers: undefined,
      })
    })

    it('should create axios instance with headers option', () => {
      createClient({
        headers: {
          Authorization: 'Bearer token',
          'X-Custom-Header': 'value',
        },
      })
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: undefined,
        timeout: undefined,
        headers: {
          Authorization: 'Bearer token',
          'X-Custom-Header': 'value',
        },
      })
    })

    it('should create axios instance with all options', () => {
      createClient({
        baseURL: 'https://api.example.com',
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      })
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.example.com',
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    it('should use provided axios instance if given', () => {
      const customInstance = {
        request: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      } as unknown as AxiosInstance

      const beforeCallCount = vi.mocked(axios.create).mock.calls.length
      createClient({ instance: customInstance })
      const afterCallCount = vi.mocked(axios.create).mock.calls.length

      // Should not create a new instance when one is provided
      expect(afterCallCount).toBe(beforeCallCount)
    })
  })

  describe('request method', () => {
    it('should make a GET request by default', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { id: 1, name: 'Test' },
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      const result = await httpClient.request<{ id: number; name: string }>('/users/1')

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        url: '/users/1',
        method: 'GET',
        headers: undefined,
        data: undefined,
        params: undefined,
        timeout: undefined,
        baseURL: undefined,
        signal: undefined,
        responseType: undefined,
        withCredentials: false,
      })
      expect(result.status).toBe(200)
      expect(result.statusText).toBe('OK')
      expect(result.data).toEqual({ id: 1, name: 'Test' })
    })

    it('should make a POST request with body', async () => {
      const mockResponse: AxiosResponse = {
        status: 201,
        statusText: 'Created',
        headers: {},
        data: { id: 1, name: 'New User' },
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      const result = await httpClient.request('/users', {
        method: 'POST',
        body: { name: 'New User' },
      })

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          data: { name: 'New User' },
        }),
      )
      expect(result.status).toBe(201)
    })

    it('should pass query parameters', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: [],
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      await httpClient.request('/users', {
        params: { page: 1, limit: 10, active: true },
      })

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { page: 1, limit: 10, active: true },
        }),
      )
    })

    it('should pass custom headers', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      await httpClient.request('/protected', {
        headers: {
          Authorization: 'Bearer token123',
          'X-Request-ID': 'uuid-1234',
        },
      })

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer token123',
            'X-Request-ID': 'uuid-1234',
          },
        }),
      )
    })

    it('should pass timeout option', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      await httpClient.request('/slow', { timeout: 30000 })

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 30000 }),
      )
    })

    it('should pass baseURL option', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      await httpClient.request('/users', { baseURL: 'https://api.example.com' })

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({ baseURL: 'https://api.example.com' }),
      )
    })

    it('should pass abort signal', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const controller = new AbortController()
      const httpClient = createClient()
      await httpClient.request('/cancellable', { signal: controller.signal })

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({ signal: controller.signal }),
      )
    })

    it('should pass responseType option', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: 'text content',
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      await httpClient.request('/text', { responseType: 'text' })

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({ responseType: 'text' }),
      )
    })

    it('should convert credentials include to withCredentials true', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      await httpClient.request('/cookies', { credentials: 'include' })

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({ withCredentials: true }),
      )
    })

    it('should convert credentials omit to withCredentials false', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      await httpClient.request('/no-cookies', { credentials: 'omit' })

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({ withCredentials: false }),
      )
    })

    it('should return properly formatted HttpResponse', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'uuid-5678',
        },
        data: { success: true },
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      const result = await httpClient.request<{ success: boolean }>('/test')

      expect(result).toEqual({
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'uuid-5678',
        },
        data: { success: true },
        request: { url: '/test' },
      })
    })

    it('should handle array header values', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {
          'set-cookie': ['cookie1=value1', 'cookie2=value2'],
        },
        data: {},
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      const result = await httpClient.request('/cookies')

      expect(result.headers['set-cookie']).toBe('cookie1=value1, cookie2=value2')
    })
  })

  describe('HTTP method shortcuts', () => {
    let httpClient: HttpClient
    const mockResponse: AxiosResponse = {
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { id: 1 },
      config: {} as InternalAxiosRequestConfig,
    }

    beforeEach(() => {
      mockAxiosInstance.request.mockResolvedValue(mockResponse)
      httpClient = createClient()
    })

    describe('get', () => {
      it('should make GET request', async () => {
        await httpClient.get('/users')
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({ method: 'GET' }),
        )
      })

      it('should pass options to request', async () => {
        await httpClient.get('/users', {
          headers: { Authorization: 'Bearer token' },
          params: { active: true },
        })
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            headers: { Authorization: 'Bearer token' },
            params: { active: true },
          }),
        )
      })
    })

    describe('post', () => {
      it('should make POST request with body', async () => {
        await httpClient.post('/users', { name: 'John' })
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'POST',
            data: { name: 'John' },
          }),
        )
      })

      it('should make POST request without body', async () => {
        await httpClient.post('/trigger')
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'POST',
            data: undefined,
          }),
        )
      })

      it('should pass options to request', async () => {
        await httpClient.post(
          '/users',
          { name: 'John' },
          {
            headers: { 'Content-Type': 'application/json' },
          },
        )
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'POST',
            data: { name: 'John' },
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      })
    })

    describe('put', () => {
      it('should make PUT request with body', async () => {
        await httpClient.put('/users/1', { name: 'John Updated' })
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'PUT',
            data: { name: 'John Updated' },
          }),
        )
      })

      it('should make PUT request without body', async () => {
        await httpClient.put('/users/1/activate')
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'PUT',
            data: undefined,
          }),
        )
      })
    })

    describe('patch', () => {
      it('should make PATCH request with body', async () => {
        await httpClient.patch('/users/1', { status: 'active' })
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'PATCH',
            data: { status: 'active' },
          }),
        )
      })

      it('should make PATCH request without body', async () => {
        await httpClient.patch('/users/1/touch')
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'PATCH',
            data: undefined,
          }),
        )
      })
    })

    describe('delete', () => {
      it('should make DELETE request', async () => {
        await httpClient.delete('/users/1')
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({ method: 'DELETE' }),
        )
      })

      it('should pass options to delete request', async () => {
        await httpClient.delete('/users/1', {
          headers: { Authorization: 'Bearer token' },
        })
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'DELETE',
            headers: { Authorization: 'Bearer token' },
          }),
        )
      })

      it('should allow body in delete request via options', async () => {
        await httpClient.delete('/items', {
          body: { ids: [1, 2, 3] },
        })
        expect(mockAxiosInstance.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'DELETE',
            data: { ids: [1, 2, 3] },
          }),
        )
      })
    })
  })

  describe('create method', () => {
    it('should create a new client with defaults', () => {
      const httpClient = createClient({ baseURL: 'https://api.example.com' })
      const newClient = httpClient.create({ timeout: 5000 })

      expect(newClient).toBeDefined()
      expect(typeof newClient.request).toBe('function')
      // The new client should have both the original baseURL and new timeout
      expect(axios.create).toHaveBeenLastCalledWith({
        baseURL: 'https://api.example.com',
        timeout: 5000,
        headers: undefined,
      })
    })

    it('should override defaults with new values', () => {
      const httpClient = createClient({
        baseURL: 'https://api.example.com',
        timeout: 10000,
      })
      httpClient.create({
        baseURL: 'https://api2.example.com',
        timeout: 5000,
      })

      expect(axios.create).toHaveBeenLastCalledWith({
        baseURL: 'https://api2.example.com',
        timeout: 5000,
        headers: undefined,
      })
    })
  })

  describe('error handling', () => {
    it('should convert axios error to HttpError', async () => {
      const axiosError = new Error('Request failed') as AxiosError
      axiosError.code = 'ERR_BAD_REQUEST'
      axiosError.response = {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'content-type': 'application/json' },
        data: { error: 'Invalid input' },
        config: {} as InternalAxiosRequestConfig,
      } as AxiosResponse
      mockAxiosInstance.request.mockRejectedValue(axiosError)

      const httpClient = createClient()

      try {
        await httpClient.request('/users', { method: 'POST', body: {} })
        expect.fail('Should have thrown')
      } catch (error) {
        const httpError = error as HttpError
        expect(httpError.message).toBe('Request failed')
        expect(httpError.code).toBe('ERR_BAD_REQUEST')
        expect(httpError.response?.status).toBe(400)
        expect(httpError.response?.data).toEqual({ error: 'Invalid input' })
        expect(httpError.request.url).toBe('/users')
      }
    })

    it('should handle network error (no response)', async () => {
      const axiosError = new Error('Network Error') as AxiosError
      axiosError.code = 'ERR_NETWORK'
      mockAxiosInstance.request.mockRejectedValue(axiosError)

      const httpClient = createClient()

      try {
        await httpClient.get('/test')
        expect.fail('Should have thrown')
      } catch (error) {
        const httpError = error as HttpError
        expect(httpError.message).toBe('Network Error')
        expect(httpError.code).toBe('ERR_NETWORK')
        expect(httpError.response).toBeUndefined()
      }
    })

    it('should handle timeout error', async () => {
      const axiosError = new Error('timeout of 5000ms exceeded') as AxiosError
      axiosError.code = 'ECONNABORTED'
      mockAxiosInstance.request.mockRejectedValue(axiosError)

      const httpClient = createClient()

      try {
        await httpClient.get('/slow', { timeout: 5000 })
        expect.fail('Should have thrown')
      } catch (error) {
        const httpError = error as HttpError
        expect(httpError.code).toBe('ECONNABORTED')
        expect(httpError.isTimeout).toBe(true)
      }
    })

    it('should handle canceled request', async () => {
      const axiosError = new Error('Request aborted') as AxiosError
      axiosError.code = 'ERR_CANCELED'
      mockAxiosInstance.request.mockRejectedValue(axiosError)

      const httpClient = createClient()
      const controller = new AbortController()

      try {
        await httpClient.get('/test', { signal: controller.signal })
        expect.fail('Should have thrown')
      } catch (error) {
        const httpError = error as HttpError
        expect(httpError.code).toBe('ERR_CANCELED')
        expect(httpError.isAborted).toBe(true)
      }
    })
  })

  describe('request interceptors', () => {
    it('should add request interceptor', () => {
      const httpClient = createClient()
      const interceptor: RequestInterceptor = (options) => ({
        ...options,
        headers: { ...options.headers, 'X-Added': 'by interceptor' },
      })

      const remove = httpClient.addRequestInterceptor!(interceptor)
      expect(typeof remove).toBe('function')
    })

    it('should apply request interceptor before request', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      httpClient.addRequestInterceptor!((options) => ({
        ...options,
        headers: { ...options.headers, 'X-Auth': 'token123' },
      }))

      await httpClient.get('/test')

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Auth': 'token123' }),
        }),
      )
    })

    it('should apply multiple request interceptors in order', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      const order: number[] = []

      httpClient.addRequestInterceptor!((options) => {
        order.push(1)
        return { ...options, headers: { ...options.headers, 'X-First': '1' } }
      })

      httpClient.addRequestInterceptor!((options) => {
        order.push(2)
        return { ...options, headers: { ...options.headers, 'X-Second': '2' } }
      })

      await httpClient.get('/test')

      expect(order).toEqual([1, 2])
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-First': '1',
            'X-Second': '2',
          }),
        }),
      )
    })

    it('should support async request interceptors', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      httpClient.addRequestInterceptor!(async (options) => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return { ...options, headers: { ...options.headers, 'X-Async': 'token' } }
      })

      await httpClient.get('/test')

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Async': 'token' }),
        }),
      )
    })

    it('should allow removing request interceptor', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      const remove = httpClient.addRequestInterceptor!((options) => ({
        ...options,
        headers: { ...options.headers, 'X-Intercepted': 'yes' },
      }))

      // First request should have interceptor
      await httpClient.get('/test1')
      expect(mockAxiosInstance.request).toHaveBeenLastCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Intercepted': 'yes' }),
        }),
      )

      // Remove interceptor
      remove()

      // Second request should not have interceptor
      await httpClient.get('/test2')
      expect(mockAxiosInstance.request).toHaveBeenLastCalledWith(
        expect.objectContaining({
          headers: undefined,
        }),
      )
    })

    it('should allow modifying URL in request interceptor', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      httpClient.addRequestInterceptor!((options) => ({
        ...options,
        url: options.url + '?intercepted=true',
      }))

      await httpClient.get('/test')

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/test?intercepted=true',
        }),
      )
    })
  })

  describe('response interceptors', () => {
    it('should add response interceptor', () => {
      const httpClient = createClient()
      const interceptor: ResponseInterceptor = (response) => ({
        ...response,
        data: { ...(response.data as object), intercepted: true },
      })

      const remove = httpClient.addResponseInterceptor!(interceptor)
      expect(typeof remove).toBe('function')
    })

    it('should apply response interceptor after request', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { original: true },
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      httpClient.addResponseInterceptor!((response) => ({
        ...response,
        data: { ...(response.data as object), modified: true },
      }))

      const result = await httpClient.get<{ original: boolean; modified: boolean }>('/test')

      expect(result.data.original).toBe(true)
      expect(result.data.modified).toBe(true)
    })

    it('should apply multiple response interceptors in order', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { value: 0 },
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()

      httpClient.addResponseInterceptor!((response) => ({
        ...response,
        data: { value: (response.data as { value: number }).value + 1 },
      }))

      httpClient.addResponseInterceptor!((response) => ({
        ...response,
        data: { value: (response.data as { value: number }).value * 10 },
      }))

      const result = await httpClient.get<{ value: number }>('/test')

      // First interceptor: 0 + 1 = 1, Second interceptor: 1 * 10 = 10
      expect(result.data.value).toBe(10)
    })

    it('should support async response interceptors', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { id: 1 },
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      httpClient.addResponseInterceptor!(async (response) => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return {
          ...response,
          data: { ...(response.data as object), asyncProcessed: true },
        }
      })

      const result = await httpClient.get<{ id: number; asyncProcessed: boolean }>('/test')

      expect(result.data.asyncProcessed).toBe(true)
    })

    it('should allow removing response interceptor', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { value: 'original' },
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      const remove = httpClient.addResponseInterceptor!((response) => ({
        ...response,
        data: { value: 'intercepted' },
      }))

      // First request should have interceptor
      const result1 = await httpClient.get<{ value: string }>('/test1')
      expect(result1.data.value).toBe('intercepted')

      // Remove interceptor
      remove()

      // Second request should not have interceptor
      const result2 = await httpClient.get<{ value: string }>('/test2')
      expect(result2.data.value).toBe('original')
    })

    it('should allow modifying headers in response interceptor', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: {},
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      httpClient.addResponseInterceptor!((response) => ({
        ...response,
        headers: { ...response.headers, 'x-processed': 'true' },
      }))

      const result = await httpClient.get('/test')

      expect(result.headers['x-processed']).toBe('true')
    })
  })

  describe('error interceptors', () => {
    it('should add error interceptor', () => {
      const httpClient = createClient()
      const interceptor: ErrorInterceptor = (error) => {
        error.message = `Intercepted: ${error.message}`
        return error
      }

      const remove = httpClient.addErrorInterceptor!(interceptor)
      expect(typeof remove).toBe('function')
    })

    it('should apply error interceptor on error', async () => {
      const axiosError = new Error('Original error') as AxiosError
      axiosError.code = 'ERR_BAD_REQUEST'
      mockAxiosInstance.request.mockRejectedValue(axiosError)

      const httpClient = createClient()
      httpClient.addErrorInterceptor!((error) => {
        error.message = `Intercepted: ${error.message}`
        return error
      })

      try {
        await httpClient.get('/test')
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as HttpError).message).toBe('Intercepted: Original error')
      }
    })

    it('should apply multiple error interceptors in order', async () => {
      const axiosError = new Error('error') as AxiosError
      axiosError.code = 'ERR_BAD_REQUEST'
      mockAxiosInstance.request.mockRejectedValue(axiosError)

      const httpClient = createClient()

      httpClient.addErrorInterceptor!((error) => {
        error.message = `[First] ${error.message}`
        return error
      })

      httpClient.addErrorInterceptor!((error) => {
        error.message = `[Second] ${error.message}`
        return error
      })

      try {
        await httpClient.get('/test')
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as HttpError).message).toBe('[Second] [First] error')
      }
    })

    it('should support async error interceptors', async () => {
      const axiosError = new Error('error') as AxiosError
      axiosError.code = 'ERR_BAD_REQUEST'
      mockAxiosInstance.request.mockRejectedValue(axiosError)

      const httpClient = createClient()
      httpClient.addErrorInterceptor!(async (error) => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        error.message = `Async: ${error.message}`
        return error
      })

      try {
        await httpClient.get('/test')
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as HttpError).message).toBe('Async: error')
      }
    })

    it('should allow removing error interceptor', async () => {
      const axiosError = new Error('error') as AxiosError
      axiosError.code = 'ERR_BAD_REQUEST'
      mockAxiosInstance.request.mockRejectedValue(axiosError)

      const httpClient = createClient()
      const remove = httpClient.addErrorInterceptor!((error) => {
        error.message = 'intercepted'
        return error
      })

      // First request should have interceptor
      try {
        await httpClient.get('/test1')
      } catch (error) {
        expect((error as HttpError).message).toBe('intercepted')
      }

      // Remove interceptor
      remove()

      // Second request should not have interceptor
      try {
        await httpClient.get('/test2')
      } catch (error) {
        expect((error as HttpError).message).toBe('error')
      }
    })

    it('should allow modifying error properties', async () => {
      const axiosError = new Error('error') as AxiosError
      axiosError.code = 'ERR_BAD_REQUEST'
      mockAxiosInstance.request.mockRejectedValue(axiosError)

      const httpClient = createClient()
      httpClient.addErrorInterceptor!((error) => {
        ;(error as HttpError & { retryCount: number }).retryCount = 0
        return error
      })

      try {
        await httpClient.get('/test')
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as HttpError & { retryCount: number }).retryCount).toBe(0)
      }
    })
  })

  describe('combined interceptor scenarios', () => {
    it('should apply request, response, and error interceptors together', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { success: true },
        config: {} as InternalAxiosRequestConfig,
      }
      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const httpClient = createClient()
      const logs: string[] = []

      httpClient.addRequestInterceptor!((options) => {
        logs.push('request')
        return options
      })

      httpClient.addResponseInterceptor!((response) => {
        logs.push('response')
        return response
      })

      httpClient.addErrorInterceptor!((error) => {
        logs.push('error')
        return error
      })

      await httpClient.get('/test')

      expect(logs).toEqual(['request', 'response'])
    })

    it('should apply request and error interceptors on error', async () => {
      const axiosError = new Error('error') as AxiosError
      axiosError.code = 'ERR_BAD_REQUEST'
      mockAxiosInstance.request.mockRejectedValue(axiosError)

      const httpClient = createClient()
      const logs: string[] = []

      httpClient.addRequestInterceptor!((options) => {
        logs.push('request')
        return options
      })

      httpClient.addResponseInterceptor!((response) => {
        logs.push('response')
        return response
      })

      httpClient.addErrorInterceptor!((error) => {
        logs.push('error')
        return error
      })

      try {
        await httpClient.get('/test')
      } catch {
        // expected
      }

      expect(logs).toEqual(['request', 'error'])
    })
  })

  describe('type exports verification', () => {
    it('should properly export HttpClient type', () => {
      const httpClient: HttpClient = createClient()
      expect(httpClient).toBeDefined()
    })

    it('should properly export HttpRequestOptions type', () => {
      const options: HttpRequestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { data: 'value' },
        params: { page: 1 },
        timeout: 5000,
        baseURL: 'https://api.example.com',
        credentials: 'include',
        responseType: 'json',
      }
      expect(options.method).toBe('POST')
    })

    it('should properly export HttpResponse type', () => {
      const response: HttpResponse<{ id: number }> = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { id: 1 },
        request: { url: '/test' },
      }
      expect(response.status).toBe(200)
      expect(response.data.id).toBe(1)
    })

    it('should properly export HttpError type', () => {
      const error: HttpError = Object.assign(new Error('Test error'), {
        request: { url: '/test' },
        code: 'ERR_TEST',
        isAborted: false,
        isTimeout: false,
      })
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('ERR_TEST')
    })

    it('should properly export interceptor types', () => {
      const requestInterceptor: RequestInterceptor = (options) => options
      const responseInterceptor: ResponseInterceptor = (response) => response
      const errorInterceptor: ErrorInterceptor = (error) => error

      expect(typeof requestInterceptor).toBe('function')
      expect(typeof responseInterceptor).toBe('function')
      expect(typeof errorInterceptor).toBe('function')
    })
  })

  describe('integration scenarios', () => {
    it('should support typical CRUD workflow', async () => {
      const httpClient = createClient()

      // Create
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 201,
        statusText: 'Created',
        headers: {},
        data: { id: 1, name: 'New Item' },
        config: {} as InternalAxiosRequestConfig,
      })
      const createResult = await httpClient.post<{ id: number; name: string }>('/items', {
        name: 'New Item',
      })
      expect(createResult.status).toBe(201)
      expect(createResult.data.id).toBe(1)

      // Read
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { id: 1, name: 'New Item' },
        config: {} as InternalAxiosRequestConfig,
      })
      const readResult = await httpClient.get<{ id: number; name: string }>('/items/1')
      expect(readResult.status).toBe(200)
      expect(readResult.data.name).toBe('New Item')

      // Update
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { id: 1, name: 'Updated Item' },
        config: {} as InternalAxiosRequestConfig,
      })
      const updateResult = await httpClient.put<{ id: number; name: string }>('/items/1', {
        name: 'Updated Item',
      })
      expect(updateResult.status).toBe(200)
      expect(updateResult.data.name).toBe('Updated Item')

      // Delete
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 204,
        statusText: 'No Content',
        headers: {},
        data: null,
        config: {} as InternalAxiosRequestConfig,
      })
      const deleteResult = await httpClient.delete('/items/1')
      expect(deleteResult.status).toBe(204)
    })

    it('should support authentication workflow with interceptors', async () => {
      const httpClient = createClient({ baseURL: 'https://api.example.com' })
      let authToken = 'initial-token'

      // Add auth interceptor
      httpClient.addRequestInterceptor!((options) => ({
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${authToken}` },
      }))

      // First request with initial token
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { protected: 'data' },
        config: {} as InternalAxiosRequestConfig,
      })
      await httpClient.get('/protected')

      expect(mockAxiosInstance.request).toHaveBeenLastCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer initial-token',
          }),
        }),
      )

      // Update token
      authToken = 'refreshed-token'

      // Second request with refreshed token
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { protected: 'data' },
        config: {} as InternalAxiosRequestConfig,
      })
      await httpClient.get('/protected')

      expect(mockAxiosInstance.request).toHaveBeenLastCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer refreshed-token',
          }),
        }),
      )
    })

    it('should support logging interceptor workflow', async () => {
      const httpClient = createClient()
      const logs: string[] = []

      // Add logging interceptors
      httpClient.addRequestInterceptor!((options) => {
        logs.push(`Request: ${options.method || 'GET'} ${options.url}`)
        return options
      })

      httpClient.addResponseInterceptor!((response) => {
        logs.push(`Response: ${response.status} ${response.request.url}`)
        return response
      })

      httpClient.addErrorInterceptor!((error) => {
        logs.push(`Error: ${error.code} ${error.request.url}`)
        return error
      })

      // Successful request
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
        config: {} as InternalAxiosRequestConfig,
      })
      await httpClient.get('/success')

      // Failed request
      const axiosError = new Error('Not Found') as AxiosError
      axiosError.code = 'ERR_BAD_REQUEST'
      mockAxiosInstance.request.mockRejectedValueOnce(axiosError)
      try {
        await httpClient.get('/failure')
      } catch {
        // expected
      }

      expect(logs).toEqual([
        'Request: GET /success',
        'Response: 200 /success',
        'Request: GET /failure',
        'Error: ERR_BAD_REQUEST /failure',
      ])
    })
  })
})
