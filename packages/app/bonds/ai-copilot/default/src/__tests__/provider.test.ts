import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider, DefaultCopilotProvider } from '../provider.js'

vi.mock('@molecule/app-i18n', () => ({
  t: vi.fn(
    (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  ),
}))

function createMockStreamResponse(lines: string[]): Response {
  const text = lines.join('\n') + '\n'
  const encoder = new TextEncoder()
  const encoded = encoder.encode(text)

  let position = 0
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (position < encoded.length) {
        controller.enqueue(encoded.slice(position))
        position = encoded.length
      } else {
        controller.close()
      }
    },
  })

  return {
    ok: true,
    status: 200,
    body: stream,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(JSON.parse(text)),
    headers: new Headers(),
  } as unknown as Response
}

describe('@molecule/app-ai-copilot-default', () => {
  const mockFetch = vi.fn()

  const config = {
    endpoint: '/api/copilot/suggest',
    maxSuggestions: 3,
    model: 'gpt-4',
  }

  const context = {
    prefix: 'function hello() {\n  return "',
    suffix: '"\n}',
    language: 'typescript',
    filePath: 'src/index.ts',
    cursorLine: 1,
    cursorColumn: 10,
  }

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const provider = createProvider()
      expect(provider).toBeInstanceOf(DefaultCopilotProvider)
      expect(provider.name).toBe('default')
    })

    it('should create a provider with custom config', () => {
      const provider = createProvider({
        baseUrl: 'http://localhost:3000',
        headers: { Authorization: 'Bearer token' },
      })
      expect(provider).toBeInstanceOf(DefaultCopilotProvider)
    })
  })

  describe('getSuggestions', () => {
    it('should send POST request with context and config', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse([
          'data: {"type":"suggestions","suggestions":[{"id":"s1","text":"Hello"}]}',
          'data: {"type":"done"}',
        ]),
      )

      const provider = new DefaultCopilotProvider({ baseUrl: 'http://localhost:3000' })
      const onEvent = vi.fn()

      await provider.getSuggestions(context, config, onEvent)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/copilot/suggest',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            prefix: context.prefix,
            suffix: context.suffix,
            language: context.language,
            filePath: context.filePath,
            cursorLine: context.cursorLine,
            cursorColumn: context.cursorColumn,
            model: config.model,
            maxSuggestions: config.maxSuggestions,
            projectId: undefined,
          }),
        }),
      )
    })

    it('should include custom headers from provider config', async () => {
      mockFetch.mockResolvedValue(createMockStreamResponse(['data: {"type":"done"}']))

      const provider = new DefaultCopilotProvider({
        headers: { Authorization: 'Bearer my-token' },
      })
      const onEvent = vi.fn()

      await provider.getSuggestions(context, config, onEvent)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer my-token',
          }),
        }),
      )
    })

    it('should parse SSE stream events', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse([
          'data: {"type":"suggestion","suggestion":{"id":"s1","text":"world"}}',
          'data: {"type":"suggestion","suggestion":{"id":"s2","text":"there"}}',
          'data: {"type":"done"}',
        ]),
      )

      const provider = new DefaultCopilotProvider()
      const onEvent = vi.fn()

      await provider.getSuggestions(context, config, onEvent)

      expect(onEvent).toHaveBeenCalledTimes(3)
      expect(onEvent).toHaveBeenCalledWith({
        type: 'suggestion',
        suggestion: { id: 's1', text: 'world' },
      })
      expect(onEvent).toHaveBeenCalledWith({
        type: 'suggestion',
        suggestion: { id: 's2', text: 'there' },
      })
      expect(onEvent).toHaveBeenCalledWith({ type: 'done' })
    })

    it('should handle batch suggestions event', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse([
          'data: {"type":"suggestions","suggestions":[{"id":"s1","text":"a"},{"id":"s2","text":"b"}]}',
          'data: {"type":"done"}',
        ]),
      )

      const provider = new DefaultCopilotProvider()
      const onEvent = vi.fn()

      await provider.getSuggestions(context, config, onEvent)

      expect(onEvent).toHaveBeenCalledWith({
        type: 'suggestions',
        suggestions: [
          { id: 's1', text: 'a' },
          { id: 's2', text: 'b' },
        ],
      })
    })

    it('should emit error event on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        body: null,
        text: () => Promise.resolve('Internal Server Error'),
      } as unknown as Response)

      const provider = new DefaultCopilotProvider()
      const onEvent = vi.fn()

      await provider.getSuggestions(context, config, onEvent)

      expect(onEvent).toHaveBeenCalledWith({
        type: 'error',
        message: 'HTTP {{status}}: {{text}}',
      })
    })

    it('should parse JSON error body', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        body: null,
        text: () => Promise.resolve(JSON.stringify({ error: 'Rate limit exceeded' })),
      } as unknown as Response)

      const provider = new DefaultCopilotProvider()
      const onEvent = vi.fn()

      await provider.getSuggestions(context, config, onEvent)

      expect(onEvent).toHaveBeenCalledWith({
        type: 'error',
        message: 'Rate limit exceeded',
      })
    })

    it('should emit error when response has no body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
      } as unknown as Response)

      const provider = new DefaultCopilotProvider()
      const onEvent = vi.fn()

      await provider.getSuggestions(context, config, onEvent)

      expect(onEvent).toHaveBeenCalledWith({
        type: 'error',
        message: 'No response body',
      })
    })

    it('should skip non-data SSE lines', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse([
          ': comment line',
          'event: heartbeat',
          'data: {"type":"suggestion","suggestion":{"id":"s1","text":"ok"}}',
          '',
          'data: {"type":"done"}',
        ]),
      )

      const provider = new DefaultCopilotProvider()
      const onEvent = vi.fn()

      await provider.getSuggestions(context, config, onEvent)

      expect(onEvent).toHaveBeenCalledTimes(2)
    })

    it('should skip malformed JSON in SSE data', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse(['data: not-valid-json', 'data: {"type":"done"}']),
      )

      const provider = new DefaultCopilotProvider()
      const onEvent = vi.fn()

      await provider.getSuggestions(context, config, onEvent)

      expect(onEvent).toHaveBeenCalledTimes(1)
      expect(onEvent).toHaveBeenCalledWith({ type: 'done' })
    })

    it('should abort previous request when getSuggestions is called again', async () => {
      let capturedSignal: AbortSignal | undefined
      mockFetch.mockImplementation((_url: string, opts: RequestInit) => {
        capturedSignal = opts.signal as AbortSignal
        return new Promise(() => {}) // Never resolves
      })

      const provider = new DefaultCopilotProvider()
      void provider.getSuggestions(context, config, vi.fn())

      const firstSignal = capturedSignal

      // Start a second request — should abort the first
      void provider.getSuggestions(context, config, vi.fn())

      expect(firstSignal?.aborted).toBe(true)
    })

    it('should silently handle AbortError', async () => {
      mockFetch.mockImplementation((_url: string, opts: RequestInit) => {
        const signal = opts.signal as AbortSignal
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            const err = new DOMException('The operation was aborted.', 'AbortError')
            reject(err)
          })
        })
      })

      const provider = new DefaultCopilotProvider()
      const onEvent = vi.fn()

      const promise = provider.getSuggestions(context, config, onEvent)
      provider.abort()
      await promise

      expect(onEvent).not.toHaveBeenCalled()
    })

    it('should emit error event for network errors', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

      const provider = new DefaultCopilotProvider()
      const onEvent = vi.fn()

      await provider.getSuggestions(context, config, onEvent)

      expect(onEvent).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to fetch',
      })
    })
  })

  describe('abort', () => {
    it('should abort the current request', () => {
      let capturedSignal: AbortSignal | undefined
      mockFetch.mockImplementation((_url: string, opts: RequestInit) => {
        capturedSignal = opts.signal as AbortSignal
        return new Promise(() => {})
      })

      const provider = new DefaultCopilotProvider()
      void provider.getSuggestions(context, config, vi.fn())

      provider.abort()

      expect(capturedSignal?.aborted).toBe(true)
    })

    it('should be safe to call when no request is in flight', () => {
      const provider = new DefaultCopilotProvider()
      expect(() => provider.abort()).not.toThrow()
    })
  })

  describe('acceptSuggestion', () => {
    it('should send accept feedback to the backend', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      const provider = new DefaultCopilotProvider({ baseUrl: 'http://localhost:3000' })
      const suggestion = { id: 's1', text: 'Hello world', metadata: { source: 'gpt' } }

      await provider.acceptSuggestion(suggestion, config)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/copilot/suggest/feedback',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            suggestionId: 's1',
            action: 'accept',
            text: 'Hello world',
            metadata: { source: 'gpt' },
          }),
        }),
      )
    })

    it('should not throw on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const provider = new DefaultCopilotProvider()
      const suggestion = { id: 's1', text: 'Hello' }

      await expect(provider.acceptSuggestion(suggestion, config)).resolves.toBeUndefined()
    })
  })

  describe('rejectSuggestion', () => {
    it('should send reject feedback to the backend', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      const provider = new DefaultCopilotProvider({ baseUrl: 'http://localhost:3000' })
      const suggestion = { id: 's2', text: 'Goodbye', metadata: { model: 'gpt-4' } }

      await provider.rejectSuggestion(suggestion, config)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/copilot/suggest/feedback',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            suggestionId: 's2',
            action: 'reject',
            metadata: { model: 'gpt-4' },
          }),
        }),
      )
    })

    it('should not throw on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const provider = new DefaultCopilotProvider()
      const suggestion = { id: 's2', text: 'Goodbye' }

      await expect(provider.rejectSuggestion(suggestion, config)).resolves.toBeUndefined()
    })
  })
})
