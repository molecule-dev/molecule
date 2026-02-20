/**
 * Tests for the Slack notifications provider.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

describe('@molecule/api-notifications-slack', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.NOTIFICATIONS_SLACK_WEBHOOK_URL
  })

  describe('provider.name', () => {
    it('should be "slack"', () => {
      const provider = createProvider({ webhookUrl: 'https://hooks.slack.com/services/test' })

      expect(provider.name).toBe('slack')
    })
  })

  describe('send', () => {
    it('should return failure when no webhook URL is configured', async () => {
      const provider = createProvider()

      const result = await provider.send({ subject: 'Test', body: 'Hello' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Slack webhook URL not configured.')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should make a POST request with Slack-formatted payload', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      const provider = createProvider({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
      })

      await provider.send({ subject: 'Deploy Alert', body: 'Version 2.0 deployed to prod.' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://hooks.slack.com/services/T00/B00/xxx')
      expect(options.method).toBe('POST')
      expect(options.headers['Content-Type']).toBe('application/json')

      const parsed = JSON.parse(options.body)
      expect(parsed.text).toBe('*Deploy Alert*\nVersion 2.0 deployed to prod.')
    })

    it('should format subject with bold markdown and body on new line', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      const provider = createProvider({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
      })

      await provider.send({ subject: 'Error', body: 'Database connection lost' })

      const parsed = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(parsed.text).toBe('*Error*\nDatabase connection lost')
    })

    it('should return success on 2xx response', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      const provider = createProvider({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
      })

      const result = await provider.send({ subject: 'OK', body: 'All good' })

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return failure on non-2xx response', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 })
      const provider = createProvider({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
      })

      const result = await provider.send({ subject: 'Fail', body: 'Not found' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Slack returned HTTP 404')
    })

    it('should handle network error', async () => {
      mockFetch.mockRejectedValue(new Error('ENOTFOUND'))
      const provider = createProvider({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
      })

      const result = await provider.send({ subject: 'Net', body: 'Error' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('ENOTFOUND')
    })

    it('should handle non-Error thrown values', async () => {
      mockFetch.mockRejectedValue('string error')
      const provider = createProvider({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
      })

      const result = await provider.send({ subject: 'Odd', body: 'Error' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('string error')
    })

    it('should read webhook URL from environment variable when not in config', async () => {
      process.env.NOTIFICATIONS_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/env'
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      const provider = createProvider()

      await provider.send({ subject: 'Env', body: 'URL' })

      expect(mockFetch.mock.calls[0][0]).toBe('https://hooks.slack.com/services/env')
    })

    it('should pass AbortController signal to fetch for timeout support', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      const provider = createProvider({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
      })

      await provider.send({ subject: 'Signal', body: 'Check' })

      const options = mockFetch.mock.calls[0][1]
      expect(options.signal).toBeDefined()
      expect(options.signal).toBeInstanceOf(AbortSignal)
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
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
        timeoutMs: 300,
      })

      const sendPromise = provider.send({ subject: 'Slow', body: 'Request' })
      vi.advanceTimersByTime(300)
      const result = await sendPromise

      expect(result.success).toBe(false)
      expect(result.error).toBe('The operation was aborted')

      vi.useRealTimers()
    })
  })
})
