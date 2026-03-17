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
  // Server tools (e.g. web_search)
  // =========================================================================

  describe('server tools', () => {
    it('includes serverTools in the request body alongside custom tools', async () => {
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

      const customTool = {
        name: 'read_file',
        description: 'Read a file',
        parameters: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
        },
        execute: vi.fn(),
      }

      await collectEvents(
        provider.chat({
          ...minimalParams,
          tools: [customTool],
          serverTools: [{ type: 'web_search_20250305', name: 'web_search' }],
        }),
      )

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      // Should have both custom + server tools
      expect(body.tools).toHaveLength(2)
      // Custom tool has input_schema
      expect(body.tools[0].name).toBe('read_file')
      expect(body.tools[0].input_schema).toBeDefined()
      // Server tool has type, no input_schema
      expect(body.tools[1].type).toBe('web_search_20250305')
      expect(body.tools[1].name).toBe('web_search')
      expect(body.tools[1].input_schema).toBeUndefined()
    })

    it('includes multiple server tools (code_execution + web_search + web_fetch) in request body', async () => {
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

      const customTool = {
        name: 'read_file',
        description: 'Read a file',
        parameters: {
          type: 'object',
          properties: { path: { type: 'string' } },
          required: ['path'],
        },
        execute: vi.fn(),
      }

      await collectEvents(
        provider.chat({
          ...minimalParams,
          tools: [customTool],
          serverTools: [
            { type: 'code_execution_20250825', name: 'code_execution' },
            { type: 'web_search_20260209', name: 'web_search' },
            { type: 'web_fetch_20260209', name: 'web_fetch' },
          ],
        }),
      )

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      // Should have 1 custom + 3 server tools
      expect(body.tools).toHaveLength(4)
      expect(body.tools[0].name).toBe('read_file')
      expect(body.tools[0].input_schema).toBeDefined()
      expect(body.tools[1].type).toBe('code_execution_20250825')
      expect(body.tools[1].name).toBe('code_execution')
      expect(body.tools[1].input_schema).toBeUndefined()
      expect(body.tools[2].type).toBe('web_search_20260209')
      expect(body.tools[2].name).toBe('web_search')
      expect(body.tools[3].type).toBe('web_fetch_20260209')
      expect(body.tools[3].name).toBe('web_fetch')
    })

    it('sends only server tools when no custom tools provided', async () => {
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

      await collectEvents(
        provider.chat({
          ...minimalParams,
          serverTools: [{ type: 'web_search_20250305', name: 'web_search' }],
        }),
      )

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.tools).toHaveLength(1)
      expect(body.tools[0].type).toBe('web_search_20250305')
    })

    it('cache_control breakpoint lands on last tool (server tool)', async () => {
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

      const customTool = {
        name: 'read_file',
        description: 'Read a file',
        parameters: { type: 'object', properties: {} },
        execute: vi.fn(),
      }

      await collectEvents(
        provider.chat({
          ...minimalParams,
          tools: [customTool],
          serverTools: [{ type: 'web_search_20250305', name: 'web_search' }],
          cacheControl: { type: 'ephemeral' as const },
        }),
      )

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      // Cache control should be on the LAST tool (the server tool)
      expect(body.tools[0].cache_control).toBeUndefined()
      expect(body.tools[1].cache_control).toEqual({ type: 'ephemeral' })
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
