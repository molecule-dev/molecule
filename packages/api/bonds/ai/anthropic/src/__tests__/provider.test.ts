import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  }),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (key: string) => key,
}))

import { createProvider } from '../provider.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()

/** Collects all events from the async iterable returned by provider.chat(). */
async function collectEvents(
  iterable: AsyncIterable<{ type: string; message?: string; [k: string]: unknown }>,
): Promise<Array<{ type: string; message?: string; [k: string]: unknown }>> {
  const events: Array<{ type: string; message?: string; [k: string]: unknown }> = []
  for await (const event of iterable) {
    events.push(event)
  }
  return events
}

/** Creates a minimal mock Response with the given status and body text. */
function mockErrorResponse(status: number, body: string): Record<string, unknown> {
  return {
    ok: false,
    status,
    statusText: `Status ${status}`,
    text: vi.fn().mockResolvedValue(body),
    json: vi.fn().mockRejectedValue(new Error('not json')),
    headers: new Headers(),
    body: null,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AnthropicAIProvider — error sanitization and timeout', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const provider = createProvider({ apiKey: 'test-key', baseUrl: 'https://test.api' })

  const minimalParams = {
    messages: [{ role: 'user' as const, content: 'Hello' }],
  }

  // =========================================================================
  // Error sanitization
  // =========================================================================

  describe('error sanitization', () => {
    it('429 response yields sanitized rate-limit message', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(
          429,
          JSON.stringify({ error: { message: 'Rate limit hit, retry after 30s' } }),
        ),
      )

      const events = await collectEvents(provider.chat(minimalParams))

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('error')
      expect(events[0].message).toBe('AI rate limit exceeded. Please try again shortly.')
    })

    it('401 response yields sanitized configuration error message', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(
          401,
          JSON.stringify({ error: { message: 'Invalid API key: sk-ant-xxxxx' } }),
        ),
      )

      const events = await collectEvents(provider.chat(minimalParams))

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('error')
      expect(events[0].message).toBe('AI service configuration error.')
    })

    it('500 response yields generic unavailable message', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(
          500,
          JSON.stringify({ error: { message: 'Internal server error in region us-east-1' } }),
        ),
      )

      const events = await collectEvents(provider.chat(minimalParams))

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('error')
      expect(events[0].message).toBe('AI service temporarily unavailable.')
    })

    it('other 4xx (e.g. 400) also yields generic unavailable message', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(400, JSON.stringify({ error: { message: 'max_tokens must be > 0' } })),
      )

      const events = await collectEvents(provider.chat(minimalParams))

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('error')
      expect(events[0].message).toBe('AI service temporarily unavailable.')
    })

    it('raw API error body is NOT leaked to the client', async () => {
      const sensitiveBody = JSON.stringify({
        error: {
          message: 'Invalid API key: sk-ant-api03-REAL_SECRET_KEY_HERE',
          type: 'authentication_error',
        },
      })
      mockFetch.mockResolvedValue(mockErrorResponse(401, sensitiveBody))

      const events = await collectEvents(provider.chat(minimalParams))

      // The client-facing message should NOT contain the API key or raw detail
      const errorEvent = events[0]
      expect(errorEvent.message).not.toContain('sk-ant')
      expect(errorEvent.message).not.toContain('REAL_SECRET_KEY')
      expect(errorEvent.message).not.toContain('authentication_error')
      expect(errorEvent.message).toBe('AI service configuration error.')
    })

    it('non-JSON error body is NOT leaked to the client', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(
          503,
          '<html>Service Unavailable - internal proxy error at 10.0.0.5</html>',
        ),
      )

      const events = await collectEvents(provider.chat(minimalParams))

      expect(events[0].message).toBe('AI service temporarily unavailable.')
      expect(events[0].message).not.toContain('10.0.0.5')
      expect(events[0].message).not.toContain('proxy')
    })

    it('all error events include errorKey for i18n', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(429, '{}'))

      const events = await collectEvents(provider.chat(minimalParams))

      expect(events[0].errorKey).toBe('ai.error.apiError')
    })
  })

  // =========================================================================
  // Default timeout
  // =========================================================================

  describe('default timeout signal', () => {
    it('sets default 5-minute timeout signal when no caller signal provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
            releaseLock: vi.fn(),
          }),
        },
      })

      await collectEvents(provider.chat(minimalParams))

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit]
      const init = callArgs[1]
      // A signal must be present even when the caller doesn't provide one
      expect(init.signal).toBeDefined()
      expect(init.signal).toBeInstanceOf(AbortSignal)
      // It should not already be aborted (5-minute timeout hasn't elapsed)
      expect(init.signal!.aborted).toBe(false)
    })

    it('caller-provided signal overrides default timeout', async () => {
      const callerController = new AbortController()
      const callerSignal = callerController.signal

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
            releaseLock: vi.fn(),
          }),
        },
      })

      await collectEvents(provider.chat({ ...minimalParams, signal: callerSignal }))

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit]
      const init = callArgs[1]
      // The signal passed to fetch should be the CALLER's signal, not the default
      expect(init.signal).toBe(callerSignal)
    })
  })
})
