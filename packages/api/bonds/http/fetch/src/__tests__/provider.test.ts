import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchClient, provider } from '../provider.js'

describe('@molecule/api-http-fetch', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const mockResponse = (
    data: unknown,
    options: { status?: number; statusText?: string; headers?: Record<string, string> } = {},
  ): Record<string, unknown> => {
    const { status = 200, statusText = 'OK', headers = {} } = options
    const headersObj = new Headers(headers)
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText,
      headers: headersObj,
      text: vi.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
      json: vi.fn().mockResolvedValue(data),
      blob: vi.fn().mockResolvedValue(data),
      arrayBuffer: vi.fn().mockResolvedValue(data),
    }
  }

  describe('exports', () => {
    it('should export fetchClient and provider as the same object', () => {
      expect(fetchClient).toBe(provider)
    })

    it('should have all HTTP methods', () => {
      expect(typeof provider.request).toBe('function')
      expect(typeof provider.get).toBe('function')
      expect(typeof provider.post).toBe('function')
      expect(typeof provider.put).toBe('function')
      expect(typeof provider.patch).toBe('function')
      expect(typeof provider.delete).toBe('function')
    })
  })

  describe('request', () => {
    it('should make a GET request by default', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }))

      const result = await provider.request('https://api.example.com/data')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'GET',
        }),
      )
      expect(result.data).toEqual({ ok: true })
      expect(result.status).toBe(200)
    })

    it('should construct URL with baseURL', async () => {
      mockFetch.mockResolvedValue(mockResponse({}))

      await provider.request('/data', { baseURL: 'https://api.example.com' })

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', expect.any(Object))
    })

    it('should append query params', async () => {
      mockFetch.mockResolvedValue(mockResponse({}))

      await provider.request('https://api.example.com/search', {
        params: { q: 'hello', page: 1 },
      })

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('q=hello'), expect.any(Object))
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('page=1'), expect.any(Object))
    })

    it('should skip undefined params', async () => {
      mockFetch.mockResolvedValue(mockResponse({}))

      await provider.request('https://api.example.com/search', {
        params: { q: 'hello', empty: undefined },
      })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('q=hello')
      expect(url).not.toContain('empty')
    })

    it('should set Content-Type header by default', async () => {
      mockFetch.mockResolvedValue(mockResponse({}))

      await provider.request('https://api.example.com/data')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      )
    })

    it('should merge custom headers', async () => {
      mockFetch.mockResolvedValue(mockResponse({}))

      await provider.request('https://api.example.com/data', {
        headers: { Authorization: 'Bearer token' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer token',
          }),
        }),
      )
    })

    it('should stringify object body', async () => {
      mockFetch.mockResolvedValue(mockResponse({}))

      await provider.request('https://api.example.com/data', {
        method: 'POST',
        body: { name: 'test' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: '{"name":"test"}',
        }),
      )
    })

    it('should pass string body as-is', async () => {
      mockFetch.mockResolvedValue(mockResponse({}))

      await provider.request('https://api.example.com/data', {
        method: 'POST',
        body: 'raw-body',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: 'raw-body',
        }),
      )
    })

    it('should parse JSON response by default', async () => {
      mockFetch.mockResolvedValue(mockResponse({ id: 1, name: 'test' }))

      const result = await provider.request('https://api.example.com/data')

      expect(result.data).toEqual({ id: 1, name: 'test' })
    })

    it('should handle empty JSON response', async () => {
      const response = mockResponse('')
      response.text.mockResolvedValue('')
      mockFetch.mockResolvedValue(response)

      const result = await provider.request('https://api.example.com/data')

      expect(result.data).toBeNull()
    })

    it('should handle text response type', async () => {
      const response = mockResponse('plain text')
      response.text.mockResolvedValue('plain text')
      mockFetch.mockResolvedValue(response)

      const result = await provider.request('https://api.example.com/data', {
        responseType: 'text',
      })

      expect(result.data).toBe('plain text')
    })

    it('should return response headers', async () => {
      mockFetch.mockResolvedValue(
        mockResponse(
          {},
          {
            headers: { 'x-request-id': 'abc-123' },
          },
        ),
      )

      const result = await provider.request('https://api.example.com/data')

      expect(result.headers['x-request-id']).toBe('abc-123')
    })

    it('should throw HttpError for non-ok responses', async () => {
      mockFetch.mockResolvedValue(
        mockResponse({ error: 'Not found' }, { status: 404, statusText: 'Not Found' }),
      )

      try {
        await provider.request('https://api.example.com/missing')
        expect.fail('Should have thrown')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        expect(error.message).toBe('HTTP 404: Not Found')
        expect(error.response.status).toBe(404)
        expect(error.response.data).toEqual({ error: 'Not found' })
      }
    })

    it('should include request info in response', async () => {
      mockFetch.mockResolvedValue(mockResponse({}))

      const result = await provider.request('https://api.example.com/data', {
        method: 'POST',
      })

      expect(result.request.url).toBe('https://api.example.com/data')
    })
  })

  describe('convenience methods', () => {
    it('get() should use GET method', async () => {
      mockFetch.mockResolvedValue(mockResponse({}))

      await provider.get('https://api.example.com/data')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
        }),
      )
    })

    it('post() should use POST method with body', async () => {
      mockFetch.mockResolvedValue(mockResponse({}))

      await provider.post('https://api.example.com/data', { name: 'test' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: '{"name":"test"}',
        }),
      )
    })

    it('put() should use PUT method', async () => {
      mockFetch.mockResolvedValue(mockResponse({}))

      await provider.put('https://api.example.com/data/1', { name: 'updated' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
        }),
      )
    })

    it('patch() should use PATCH method', async () => {
      mockFetch.mockResolvedValue(mockResponse({}))

      await provider.patch('https://api.example.com/data/1', { name: 'patched' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
        }),
      )
    })

    it('delete() should use DELETE method', async () => {
      mockFetch.mockResolvedValue(mockResponse({}))

      await provider.delete('https://api.example.com/data/1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'DELETE',
        }),
      )
    })
  })
})
