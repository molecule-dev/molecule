/**
 * Tests for the webhook notifications provider.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

describe('@molecule/api-notifications-webhook', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.NOTIFICATIONS_WEBHOOK_URL
    delete process.env.NOTIFICATIONS_WEBHOOK_SECRET
  })

  describe('provider.name', () => {
    it('should be "webhook"', () => {
      const provider = createProvider({ url: 'https://example.com/hook' })

      expect(provider.name).toBe('webhook')
    })
  })

  describe('send', () => {
    it('should return failure when no URL is configured', async () => {
      const provider = createProvider()

      const result = await provider.send({ subject: 'Test', body: 'Hello' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Webhook URL not configured.')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should make a POST request with correct JSON body', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      const provider = createProvider({ url: 'https://example.com/hook' })

      await provider.send({ subject: 'Alert', body: 'Something happened' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://example.com/hook')
      expect(options.method).toBe('POST')
      expect(options.headers['Content-Type']).toBe('application/json')

      const parsed = JSON.parse(options.body)
      expect(parsed.subject).toBe('Alert')
      expect(parsed.body).toBe('Something happened')
      expect(parsed.timestamp).toBeDefined()
    })

    it('should include metadata fields in the JSON body', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      const provider = createProvider({ url: 'https://example.com/hook' })

      await provider.send({
        subject: 'Alert',
        body: 'Details',
        metadata: { severity: 'critical', source: 'api' },
      })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const parsed = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(parsed.severity).toBe('critical')
      expect(parsed.source).toBe('api')
    })

    it('should include HMAC signature header when secret is configured', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      const provider = createProvider({
        url: 'https://example.com/hook',
        secret: 'my-secret-key',
      })

      await provider.send({ subject: 'Signed', body: 'Payload' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers['X-Signature-256']).toBeDefined()
      expect(headers['X-Signature-256']).toMatch(/^sha256=[0-9a-f]{64}$/)
    })

    it('should not include signature header when no secret is configured', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      const provider = createProvider({ url: 'https://example.com/hook' })

      await provider.send({ subject: 'Unsigned', body: 'Payload' })

      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers['X-Signature-256']).toBeUndefined()
    })

    it('should return success on 2xx response', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      const provider = createProvider({ url: 'https://example.com/hook' })

      const result = await provider.send({ subject: 'OK', body: 'Fine' })

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return failure on non-2xx response', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503 })
      const provider = createProvider({ url: 'https://example.com/hook' })

      const result = await provider.send({ subject: 'Fail', body: 'Bad gateway' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Webhook returned HTTP 503')
    })

    it('should handle network error', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))
      const provider = createProvider({ url: 'https://example.com/hook' })

      const result = await provider.send({ subject: 'Net', body: 'Error' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('ECONNREFUSED')
    })

    it('should handle timeout via AbortController', async () => {
      vi.useFakeTimers()

      mockFetch.mockImplementation(
        (_url: string, options: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => {
              reject(new Error('The operation was aborted'))
            })
          }),
      )
      const provider = createProvider({
        url: 'https://example.com/hook',
        timeoutMs: 500,
      })

      const sendPromise = provider.send({ subject: 'Slow', body: 'Request' })
      vi.advanceTimersByTime(500)
      const result = await sendPromise

      expect(result.success).toBe(false)
      expect(result.error).toBe('The operation was aborted')

      vi.useRealTimers()
    })

    it('should read URL from environment variable when not in config', async () => {
      process.env.NOTIFICATIONS_WEBHOOK_URL = 'https://env.example.com/hook'
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      const provider = createProvider()

      await provider.send({ subject: 'Env', body: 'URL' })

      expect(mockFetch.mock.calls[0][0]).toBe('https://env.example.com/hook')
    })

    it('should read secret from environment variable when not in config', async () => {
      process.env.NOTIFICATIONS_WEBHOOK_SECRET = 'env-secret'
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      const provider = createProvider({ url: 'https://example.com/hook' })

      await provider.send({ subject: 'Env', body: 'Secret' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers['X-Signature-256']).toMatch(/^sha256=[0-9a-f]{64}$/)
    })

    it('should pass AbortController signal to fetch', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      const provider = createProvider({ url: 'https://example.com/hook' })

      await provider.send({ subject: 'Signal', body: 'Check' })

      const options = mockFetch.mock.calls[0][1]
      expect(options.signal).toBeDefined()
      expect(options.signal).toBeInstanceOf(AbortSignal)
    })
  })
})
