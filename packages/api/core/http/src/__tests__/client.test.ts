/**
 * Tests for the default HTTP client's timeout and AbortController support.
 *
 * These tests verify the audit changes that added timeout enforcement
 * via AbortController and proper error tagging.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpError } from '../types.js'

let defaultClient: HttpClient

describe('defaultClient timeout and abort handling', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()
    const clientModule = await import('../client.js')
    defaultClient = clientModule.defaultClient

    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('timeout option', () => {
    it('should abort the request after the specified timeout', async () => {
      // fetch hangs until the signal aborts it, simulating a slow server
      vi.mocked(global.fetch).mockImplementation((_url, init) => {
        return new Promise<Response>((_resolve, reject) => {
          const signal = (init as RequestInit)?.signal
          if (signal) {
            signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted')
              err.name = 'AbortError'
              reject(err)
            })
          }
        })
      })

      const requestPromise = defaultClient.request('https://api.example.com/slow', {
        timeout: 5000,
      })

      // Advance time past the timeout
      vi.advanceTimersByTime(5000)

      await expect(requestPromise).rejects.toThrow('Request timed out after 5000ms')
    })

    it('should tag timeout errors with isTimeout: true', async () => {
      // Make fetch reject with AbortError when signal is aborted
      vi.mocked(global.fetch).mockImplementation((_url, init) => {
        return new Promise<Response>((_resolve, reject) => {
          const signal = (init as RequestInit)?.signal
          if (signal) {
            signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted')
              err.name = 'AbortError'
              reject(err)
            })
          }
        })
      })

      const requestPromise = defaultClient.request('https://api.example.com/slow', {
        timeout: 3000,
      })

      vi.advanceTimersByTime(3000)

      try {
        await requestPromise
        expect.fail('Should have thrown')
      } catch (error) {
        const httpError = error as HttpError
        expect(httpError.isTimeout).toBe(true)
        expect(httpError.message).toBe('Request timed out after 3000ms')
        expect(httpError.request.url).toBe('https://api.example.com/slow')
      }
    })

    it('should clear the timeout when the request succeeds', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const mockResponse = new Response(JSON.stringify({ ok: true }), {
        status: 200,
        statusText: 'OK',
      })
      vi.mocked(global.fetch).mockResolvedValue(mockResponse)

      await defaultClient.request('https://api.example.com/fast', {
        timeout: 10000,
      })

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })

    it('should clear the timeout when the request fails with non-timeout error', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const networkError = new Error('Network failure')
      vi.mocked(global.fetch).mockRejectedValue(networkError)

      await expect(
        defaultClient.request('https://api.example.com/fail', { timeout: 10000 }),
      ).rejects.toThrow('Network failure')

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })

    it('should not set up AbortController when timeout is 0', async () => {
      const mockResponse = new Response('{}', { status: 200 })
      vi.mocked(global.fetch).mockResolvedValue(mockResponse)

      await defaultClient.request('https://api.example.com/test', { timeout: 0 })

      // With timeout=0, no AbortController is created, so signal should be undefined
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({ signal: undefined }),
      )
    })

    it('should not set up AbortController when timeout is not provided', async () => {
      const mockResponse = new Response('{}', { status: 200 })
      vi.mocked(global.fetch).mockResolvedValue(mockResponse)

      await defaultClient.request('https://api.example.com/test')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({ signal: undefined }),
      )
    })

    it('should pass an AbortSignal to fetch when timeout is set', async () => {
      const mockResponse = new Response('{}', { status: 200 })
      vi.mocked(global.fetch).mockResolvedValue(mockResponse)

      await defaultClient.request('https://api.example.com/test', { timeout: 5000 })

      const fetchCall = vi.mocked(global.fetch).mock.calls[0]
      const fetchInit = fetchCall[1] as RequestInit
      expect(fetchInit.signal).toBeInstanceOf(AbortSignal)
    })
  })

  describe('caller-provided signal with timeout', () => {
    it('should abort when caller signal fires even before timeout', async () => {
      const callerController = new AbortController()

      vi.mocked(global.fetch).mockImplementation((_url, init) => {
        return new Promise<Response>((_resolve, reject) => {
          const signal = (init as RequestInit)?.signal
          if (signal) {
            signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted')
              err.name = 'AbortError'
              reject(err)
            })
          }
        })
      })

      const requestPromise = defaultClient.request('https://api.example.com/test', {
        timeout: 30000,
        signal: callerController.signal,
      })

      // Caller aborts before timeout
      callerController.abort()

      // When caller aborts with a timeout also set, the AbortError fires
      // but since options.timeout is set, it's tagged as a timeout error.
      // This is the current behavior: any AbortError with timeout option gets tagged.
      await expect(requestPromise).rejects.toThrow()
    })

    it('should use the timeout signal when no caller signal is provided', async () => {
      vi.mocked(global.fetch).mockImplementation((_url, init) => {
        return new Promise<Response>((_resolve, reject) => {
          const signal = (init as RequestInit)?.signal
          if (signal) {
            signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted')
              err.name = 'AbortError'
              reject(err)
            })
          }
        })
      })

      const requestPromise = defaultClient.request('https://api.example.com/test', {
        timeout: 2000,
      })

      vi.advanceTimersByTime(2000)

      try {
        await requestPromise
        expect.fail('Should have thrown')
      } catch (error) {
        const httpError = error as HttpError
        expect(httpError.isTimeout).toBe(true)
      }
    })

    it('should still pass caller signal to fetch when no timeout is set', async () => {
      const callerController = new AbortController()
      const mockResponse = new Response('{}', { status: 200 })
      vi.mocked(global.fetch).mockResolvedValue(mockResponse)

      await defaultClient.request('https://api.example.com/test', {
        signal: callerController.signal,
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({ signal: callerController.signal }),
      )
    })
  })

  describe('response headers conversion', () => {
    it('should convert Fetch Headers to a plain object', async () => {
      const mockResponse = new Response(JSON.stringify({ ok: true }), {
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'abc-123',
          'x-rate-limit': '100',
        },
      })
      vi.mocked(global.fetch).mockResolvedValue(mockResponse)

      const result = await defaultClient.request('https://api.example.com/test')

      expect(result.headers).toBeTypeOf('object')
      expect(result.headers).not.toBeInstanceOf(Headers)
      expect(result.headers['content-type']).toBe('application/json')
      expect(result.headers['x-request-id']).toBe('abc-123')
      expect(result.headers['x-rate-limit']).toBe('100')
    })

    it('should include response headers in error responses', async () => {
      const mockResponse = new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        statusText: 'Forbidden',
        headers: {
          'x-error-code': 'AUTH_REQUIRED',
        },
      })
      vi.mocked(global.fetch).mockResolvedValue(mockResponse)

      try {
        await defaultClient.request('https://api.example.com/protected')
        expect.fail('Should have thrown')
      } catch (error) {
        const httpError = error as HttpError
        expect(httpError.response?.headers['x-error-code']).toBe('AUTH_REQUIRED')
      }
    })
  })

  describe('non-AbortError fetch failures with timeout', () => {
    it('should re-throw non-AbortError even when timeout is set', async () => {
      const typeError = new TypeError('Failed to fetch')
      vi.mocked(global.fetch).mockRejectedValue(typeError)

      await expect(
        defaultClient.request('https://api.example.com/test', { timeout: 5000 }),
      ).rejects.toThrow('Failed to fetch')
    })

    it('should not tag non-AbortError as timeout', async () => {
      const networkError = new Error('DNS resolution failed')
      vi.mocked(global.fetch).mockRejectedValue(networkError)

      try {
        await defaultClient.request('https://api.example.com/test', { timeout: 5000 })
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as HttpError).isTimeout).toBeUndefined()
      }
    })
  })
})
