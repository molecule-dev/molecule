import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFetchClient } from '../provider.js'
import { HttpError } from '../types.js'

describe('HTTP Provider', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
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

  describe('createFetchClient', () => {
    it('should create a client with default configuration', () => {
      const client = createFetchClient()

      expect(client.baseURL).toBe('')
      expect(client.defaultHeaders).toEqual({})
      expect(typeof client.get).toBe('function')
      expect(typeof client.post).toBe('function')
      expect(typeof client.put).toBe('function')
      expect(typeof client.patch).toBe('function')
      expect(typeof client.delete).toBe('function')
    })

    it('should create a client with custom configuration', () => {
      const client = createFetchClient({
        baseURL: 'https://api.example.com',
        defaultHeaders: { 'X-Custom': 'header' },
      })

      expect(client.baseURL).toBe('https://api.example.com')
      expect(client.defaultHeaders).toEqual({ 'X-Custom': 'header' })
    })
  })

  describe('request methods', () => {
    describe('GET', () => {
      it('should make a GET request', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ id: 1, name: 'Test' }))
        const client = createFetchClient()

        const response = await client.get('/users/1')

        expect(mockFetch).toHaveBeenCalledWith(
          '/users/1',
          expect.objectContaining({
            method: 'GET',
          }),
        )
        expect(response.data).toEqual({ id: 1, name: 'Test' })
        expect(response.status).toBe(200)
      })

      it('should append query params to URL', async () => {
        mockFetch.mockImplementation(() => createMockResponse([]))
        const client = createFetchClient()

        await client.get('/users', { params: { page: 1, limit: 10 } })

        expect(mockFetch).toHaveBeenCalledWith('/users?page=1&limit=10', expect.any(Object))
      })

      it('should handle undefined query params', async () => {
        mockFetch.mockImplementation(() => createMockResponse([]))
        const client = createFetchClient()

        await client.get('/users', { params: { page: 1, filter: undefined } })

        expect(mockFetch).toHaveBeenCalledWith('/users?page=1', expect.any(Object))
      })
    })

    describe('POST', () => {
      it('should make a POST request with data', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ id: 1 }, 201))
        const client = createFetchClient()

        const response = await client.post('/users', { name: 'John' })

        expect(mockFetch).toHaveBeenCalledWith(
          '/users',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ name: 'John' }),
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          }),
        )
        expect(response.status).toBe(201)
      })

      it('should handle FormData without Content-Type', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ success: true }))
        const client = createFetchClient()
        const formData = new FormData()
        formData.append('file', 'test')

        await client.post('/upload', formData)

        expect(mockFetch).toHaveBeenCalledWith(
          '/upload',
          expect.objectContaining({
            body: formData,
          }),
        )
        // Content-Type should not be set for FormData
        const callHeaders = mockFetch.mock.calls[0][1].headers
        expect(callHeaders['Content-Type']).toBeUndefined()
      })
    })

    describe('PUT', () => {
      it('should make a PUT request with data', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ id: 1, name: 'Updated' }))
        const client = createFetchClient()

        await client.put('/users/1', { name: 'Updated' })

        expect(mockFetch).toHaveBeenCalledWith(
          '/users/1',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ name: 'Updated' }),
          }),
        )
      })
    })

    describe('PATCH', () => {
      it('should make a PATCH request with data', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ id: 1, name: 'Patched' }))
        const client = createFetchClient()

        await client.patch('/users/1', { name: 'Patched' })

        expect(mockFetch).toHaveBeenCalledWith(
          '/users/1',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ name: 'Patched' }),
          }),
        )
      })
    })

    describe('DELETE', () => {
      it('should make a DELETE request', async () => {
        mockFetch.mockImplementation(() => createMockResponse(null, 204))
        const client = createFetchClient()

        await client.delete('/users/1')

        expect(mockFetch).toHaveBeenCalledWith(
          '/users/1',
          expect.objectContaining({
            method: 'DELETE',
          }),
        )
      })
    })
  })

  describe('baseURL handling', () => {
    it('should prepend baseURL to relative URLs', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient({ baseURL: 'https://api.example.com' })

      await client.get('/users')

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users', expect.any(Object))
    })

    it('should not prepend baseURL to absolute URLs', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient({ baseURL: 'https://api.example.com' })

      await client.get('https://other.com/data')

      expect(mockFetch).toHaveBeenCalledWith('https://other.com/data', expect.any(Object))
    })
  })

  describe('auth token', () => {
    it('should set and include auth token in requests', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient()

      client.setAuthToken('test-token-123')
      await client.get('/protected')

      expect(mockFetch).toHaveBeenCalledWith(
        '/protected',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        }),
      )
    })

    it('should get the current auth token', () => {
      const client = createFetchClient()

      expect(client.getAuthToken()).toBeNull()

      client.setAuthToken('my-token')
      expect(client.getAuthToken()).toBe('my-token')

      client.setAuthToken(null)
      expect(client.getAuthToken()).toBeNull()
    })

    it('should not include auth header when token is null', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient()

      await client.get('/public')

      const callHeaders = mockFetch.mock.calls[0][1].headers
      expect(callHeaders.Authorization).toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('should throw HttpError for non-ok responses', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({ error: 'Not found' }, 404, 'Not Found'),
      )
      const client = createFetchClient()

      await expect(client.get('/notfound')).rejects.toThrow(HttpError)
    })

    it('should include status and response in HttpError', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({ error: 'Forbidden' }, 403, 'Forbidden'),
      )
      const client = createFetchClient()

      try {
        await client.get('/forbidden')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError)
        expect((error as HttpError).status).toBe(403)
        expect((error as HttpError).response?.data).toEqual({ error: 'Forbidden' })
      }
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      const client = createFetchClient()

      await expect(client.get('/test')).rejects.toThrow(HttpError)
    })

    it('should trigger auth error handler on 401', async () => {
      mockFetch.mockImplementation(() => createMockResponse({ error: 'Unauthorized' }, 401))
      const client = createFetchClient()
      const authHandler = vi.fn()

      client.onAuthError(authHandler)

      try {
        await client.get('/protected')
      } catch {
        // Expected error
      }

      expect(authHandler).toHaveBeenCalled()
    })

    it('should allow removing auth error handler', async () => {
      mockFetch.mockImplementation(() => createMockResponse({ error: 'Unauthorized' }, 401))
      const client = createFetchClient()
      const authHandler = vi.fn()

      const unsubscribe = client.onAuthError(authHandler)
      unsubscribe()

      try {
        await client.get('/protected')
      } catch {
        // Expected error
      }

      expect(authHandler).not.toHaveBeenCalled()
    })
  })

  describe('interceptors', () => {
    describe('request interceptors', () => {
      it('should modify request config', async () => {
        mockFetch.mockImplementation(() => createMockResponse({}))
        const client = createFetchClient()

        client.addRequestInterceptor((config) => ({
          ...config,
          headers: { ...config.headers, 'X-Custom': 'intercepted' },
        }))

        await client.get('/test')

        expect(mockFetch).toHaveBeenCalledWith(
          '/test',
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-Custom': 'intercepted',
            }),
          }),
        )
      })

      it('should allow removing request interceptor', async () => {
        mockFetch.mockImplementation(() => createMockResponse({}))
        const client = createFetchClient()

        const remove = client.addRequestInterceptor((config) => ({
          ...config,
          headers: { ...config.headers, 'X-Remove': 'test' },
        }))

        remove()
        await client.get('/test')

        const callHeaders = mockFetch.mock.calls[0][1].headers
        expect(callHeaders['X-Remove']).toBeUndefined()
      })
    })

    describe('response interceptors', () => {
      it('should modify response', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ original: true }))
        const client = createFetchClient()

        client.addResponseInterceptor((response) => ({
          ...response,
          data: { ...(response.data as object), modified: true },
        }))

        const response = await client.get('/test')

        expect(response.data).toEqual({ original: true, modified: true })
      })

      it('should allow removing response interceptor', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ value: 1 }))
        const client = createFetchClient()

        const remove = client.addResponseInterceptor((response) => ({
          ...response,
          data: { value: 99 },
        }))

        remove()
        const response = await client.get('/test')

        expect(response.data).toEqual({ value: 1 })
      })
    })

    describe('error interceptors', () => {
      it('should modify error', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ error: 'test' }, 500))
        const client = createFetchClient()

        client.addErrorInterceptor((error) => {
          error.message = 'Modified error message'
          return error
        })

        try {
          await client.get('/error')
          expect.fail('Should have thrown')
        } catch (error) {
          expect((error as HttpError).message).toBe('Modified error message')
        }
      })

      it('should allow removing error interceptor', async () => {
        mockFetch.mockImplementation(() => createMockResponse({ error: 'test' }, 500))
        const client = createFetchClient()

        const remove = client.addErrorInterceptor((error) => {
          error.message = 'Should not appear'
          return error
        })

        remove()

        try {
          await client.get('/error')
          expect.fail('Should have thrown')
        } catch (error) {
          expect((error as HttpError).message).not.toBe('Should not appear')
        }
      })
    })
  })

  describe('response types', () => {
    it('should handle text response type', async () => {
      mockFetch.mockImplementation(() => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: () => Promise.resolve('Plain text response'),
      }))
      const client = createFetchClient()

      const response = await client.get('/text', { responseType: 'text' })

      expect(response.data).toBe('Plain text response')
    })

    it('should handle blob response type', async () => {
      const mockBlob = new Blob(['test'])
      mockFetch.mockImplementation(() => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        blob: () => Promise.resolve(mockBlob),
      }))
      const client = createFetchClient()

      const response = await client.get('/file', { responseType: 'blob' })

      expect(response.data).toBe(mockBlob)
    })

    it('should handle arraybuffer response type', async () => {
      const mockBuffer = new ArrayBuffer(8)
      mockFetch.mockImplementation(() => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        arrayBuffer: () => Promise.resolve(mockBuffer),
      }))
      const client = createFetchClient()

      const response = await client.get('/binary', { responseType: 'arraybuffer' })

      expect(response.data).toBe(mockBuffer)
    })

    it('should handle non-JSON response gracefully', async () => {
      mockFetch.mockImplementation(() => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: () => Promise.resolve('Not JSON'),
      }))
      const client = createFetchClient()

      const response = await client.get('/html')

      // Should return the raw text when JSON parsing fails
      expect(response.data).toBe('Not JSON')
    })
  })

  describe('credentials', () => {
    it('should include credentials when withCredentials is true', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient({ withCredentials: true })

      await client.get('/api')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api',
        expect.objectContaining({
          credentials: 'include',
        }),
      )
    })

    it('should use same-origin by default', async () => {
      mockFetch.mockImplementation(() => createMockResponse({}))
      const client = createFetchClient()

      await client.get('/api')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api',
        expect.objectContaining({
          credentials: 'same-origin',
        }),
      )
    })
  })
})
