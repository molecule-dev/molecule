vi.mock('@molecule/app-i18n', () => ({
  t: vi.fn(
    (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  ),
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider, HttpChatProvider } from '../provider.js'

function createMockStreamResponse(lines: string[]): Record<string, unknown> {
  const encoder = new TextEncoder()
  const body = lines.join('\n') + '\n'
  const chunks = [encoder.encode(body)]
  let readIndex = 0

  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    body: {
      getReader: () => ({
        read: vi.fn().mockImplementation(() => {
          if (readIndex < chunks.length) {
            return Promise.resolve({ done: false, value: chunks[readIndex++] })
          }
          return Promise.resolve({ done: true, value: undefined })
        }),
      }),
    },
  }
}

describe('@molecule/app-ai-chat-http', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const defaultConfig = {
    endpoint: '/api/chat',
    model: 'test-model',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  describe('sendMessage', () => {
    it('should send POST request with message and model', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse([
          'data: {"type":"token","content":"Hello"}',
          'data: {"type":"done"}',
        ]),
      )

      const provider = new HttpChatProvider({ baseUrl: 'http://localhost:3000' })
      const onEvent = vi.fn()

      await provider.sendMessage('Hi', defaultConfig, onEvent)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ message: 'Hi', model: 'test-model' }),
        }),
      )
    })

    it('should parse SSE stream events', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse([
          'data: {"type":"token","content":"Hello"}',
          'data: {"type":"token","content":" world"}',
          'data: {"type":"done"}',
        ]),
      )

      const provider = new HttpChatProvider()
      const onEvent = vi.fn()

      await provider.sendMessage('Hi', defaultConfig, onEvent)

      expect(onEvent).toHaveBeenCalledTimes(3)
      expect(onEvent).toHaveBeenCalledWith({ type: 'token', content: 'Hello' })
      expect(onEvent).toHaveBeenCalledWith({ type: 'token', content: ' world' })
      expect(onEvent).toHaveBeenCalledWith({ type: 'done' })
    })

    it('should skip non-data lines', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse([
          ': comment',
          'event: heartbeat',
          'data: {"type":"token","content":"ok"}',
        ]),
      )

      const provider = new HttpChatProvider()
      const onEvent = vi.fn()

      await provider.sendMessage('Hi', defaultConfig, onEvent)

      expect(onEvent).toHaveBeenCalledTimes(1)
      expect(onEvent).toHaveBeenCalledWith({ type: 'token', content: 'ok' })
    })

    it('should skip malformed JSON in SSE data', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse(['data: not-json', 'data: {"type":"token","content":"valid"}']),
      )

      const provider = new HttpChatProvider()
      const onEvent = vi.fn()

      await provider.sendMessage('Hi', defaultConfig, onEvent)

      expect(onEvent).toHaveBeenCalledTimes(1)
      expect(onEvent).toHaveBeenCalledWith({ type: 'token', content: 'valid' })
    })

    it('should emit error event for non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: vi.fn().mockResolvedValue('Server broke'),
        body: null,
      })

      const provider = new HttpChatProvider()
      const onEvent = vi.fn()

      await provider.sendMessage('Hi', defaultConfig, onEvent)

      expect(onEvent).toHaveBeenCalledWith({
        type: 'error',
        message: 'HTTP {{status}}: {{text}}',
      })
    })

    it('should emit error when response has no body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
      })

      const provider = new HttpChatProvider()
      const onEvent = vi.fn()

      await provider.sendMessage('Hi', defaultConfig, onEvent)

      expect(onEvent).toHaveBeenCalledWith({
        type: 'error',
        message: 'No response body',
      })
    })

    it('should include custom headers from config', async () => {
      mockFetch.mockResolvedValue(createMockStreamResponse(['data: {"type":"done"}']))

      const provider = new HttpChatProvider({
        baseUrl: '',
        headers: { Authorization: 'Bearer token' },
      })
      const onEvent = vi.fn()

      await provider.sendMessage('Hi', defaultConfig, onEvent)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token',
            'Content-Type': 'application/json',
          }),
        }),
      )
    })
  })

  describe('abort', () => {
    it('should abort the current request', async () => {
      let capturedSignal: AbortSignal | undefined
      mockFetch.mockImplementation((_url: string, opts: RequestInit) => {
        capturedSignal = opts.signal as AbortSignal
        return new Promise(() => {}) // never resolves
      })

      const provider = new HttpChatProvider()
      const onEvent = vi.fn()
      void provider.sendMessage('Hi', defaultConfig, onEvent)

      provider.abort()

      expect(capturedSignal?.aborted).toBe(true)
    })

    it('should be a no-op when no request is active', () => {
      const provider = new HttpChatProvider()
      expect(() => provider.abort()).not.toThrow()
    })
  })

  describe('clearHistory', () => {
    it('should send DELETE request', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      const provider = new HttpChatProvider({ baseUrl: 'http://localhost:3000' })
      await provider.clearHistory(defaultConfig)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/chat',
        expect.objectContaining({
          method: 'DELETE',
        }),
      )
    })
  })

  describe('loadHistory', () => {
    it('should return normalized messages', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          messages: [
            { id: 'msg-1', role: 'user', content: 'Hello', timestamp: 1000 },
            { role: 'assistant', content: 'Hi!' },
          ],
        }),
      })

      const provider = new HttpChatProvider({ baseUrl: 'http://localhost:3000' })
      const messages = await provider.loadHistory(defaultConfig)

      expect(messages).toHaveLength(2)
      expect(messages[0].id).toBe('msg-1')
      expect(messages[1].id).toBe('msg-1')
    })

    it('should assign default ids to messages without id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi!' },
          ],
        }),
      })

      const provider = new HttpChatProvider()
      const messages = await provider.loadHistory(defaultConfig)

      expect(messages[0].id).toBe('msg-0')
      expect(messages[1].id).toBe('msg-1')
    })

    it('should return empty array for non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      const provider = new HttpChatProvider()
      const messages = await provider.loadHistory(defaultConfig)

      expect(messages).toEqual([])
    })

    it('should handle response with no messages key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      })

      const provider = new HttpChatProvider()
      const messages = await provider.loadHistory(defaultConfig)

      expect(messages).toEqual([])
    })
  })

  describe('createProvider', () => {
    it('should return an HttpChatProvider instance', () => {
      const provider = createProvider()
      expect(provider).toBeInstanceOf(HttpChatProvider)
    })

    it('should pass config through', () => {
      const provider = createProvider({ baseUrl: 'http://localhost:5000' })
      expect(provider).toBeInstanceOf(HttpChatProvider)
    })
  })
})
