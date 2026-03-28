import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider, DefaultAssistantProvider } from '../provider.js'

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
        releaseLock: vi.fn(),
      }),
    },
  }
}

describe('@molecule/app-ai-assistant-default', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const defaultConfig = {
    endpoint: '/api/assistant',
  }

  describe('panel lifecycle', () => {
    it('should start with panel closed', () => {
      const provider = new DefaultAssistantProvider()
      const state = provider.getState()
      expect(state.isOpen).toBe(false)
      expect(state.messages).toEqual([])
      expect(state.isLoading).toBe(false)
    })

    it('should open the panel', () => {
      const provider = new DefaultAssistantProvider()
      provider.open(defaultConfig)
      expect(provider.getState().isOpen).toBe(true)
    })

    it('should close the panel', () => {
      const provider = new DefaultAssistantProvider()
      provider.open(defaultConfig)
      provider.close()
      expect(provider.getState().isOpen).toBe(false)
    })

    it('should toggle the panel', () => {
      const provider = new DefaultAssistantProvider()
      provider.toggle(defaultConfig)
      expect(provider.getState().isOpen).toBe(true)
      provider.toggle(defaultConfig)
      expect(provider.getState().isOpen).toBe(false)
    })

    it('should apply position from config on open', () => {
      const provider = new DefaultAssistantProvider()
      provider.open({ ...defaultConfig, position: 'left' })
      expect(provider.getState().position).toBe('left')
    })

    it('should apply initial suggestions from config on open', () => {
      const suggestions = [{ id: 's1', label: 'Help me', action: 'help', description: 'Get help' }]
      const provider = new DefaultAssistantProvider()
      provider.open({ ...defaultConfig, suggestions })
      expect(provider.getState().suggestions).toEqual(suggestions)
    })
  })

  describe('state subscription', () => {
    it('should notify listeners on state change', () => {
      const provider = new DefaultAssistantProvider()
      const listener = vi.fn()
      provider.subscribe(listener)

      provider.open(defaultConfig)

      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ isOpen: true }))
    })

    it('should unsubscribe correctly', () => {
      const provider = new DefaultAssistantProvider()
      const listener = vi.fn()
      const unsub = provider.subscribe(listener)

      unsub()
      provider.open(defaultConfig)

      expect(listener).not.toHaveBeenCalled()
    })

    it('should return a snapshot, not a reference', () => {
      const provider = new DefaultAssistantProvider()
      const state1 = provider.getState()
      provider.open(defaultConfig)
      const state2 = provider.getState()
      expect(state1.isOpen).toBe(false)
      expect(state2.isOpen).toBe(true)
    })
  })

  describe('context management', () => {
    it('should set context items', () => {
      const provider = new DefaultAssistantProvider()
      const context = [{ type: 'file', label: 'main.ts', value: '/src/main.ts' }]
      provider.setContext(context)
      expect(provider.getState().context).toEqual(context)
    })

    it('should clear context items', () => {
      const provider = new DefaultAssistantProvider()
      provider.setContext([{ type: 'file', label: 'main.ts', value: '/src/main.ts' }])
      provider.clearContext()
      expect(provider.getState().context).toEqual([])
    })
  })

  describe('sendMessage', () => {
    it('should send POST request with message', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse([
          'data: {"type":"text","content":"Hello"}',
          'data: {"type":"done"}',
        ]),
      )

      const provider = new DefaultAssistantProvider({
        baseUrl: 'http://localhost:3000',
      })
      const onEvent = vi.fn()

      await provider.sendMessage('Hi', defaultConfig, onEvent)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/assistant',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ message: 'Hi' }),
        }),
      )
    })

    it('should parse SSE stream events and update state', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse([
          'data: {"type":"text","content":"Hello"}',
          'data: {"type":"text","content":" world"}',
          'data: {"type":"done"}',
        ]),
      )

      const provider = new DefaultAssistantProvider()
      const onEvent = vi.fn()

      await provider.sendMessage('Hi', defaultConfig, onEvent)

      expect(onEvent).toHaveBeenCalledTimes(3)
      expect(onEvent).toHaveBeenCalledWith({ type: 'text', content: 'Hello' })
      expect(onEvent).toHaveBeenCalledWith({ type: 'text', content: ' world' })
      expect(onEvent).toHaveBeenCalledWith({ type: 'done' })

      // State should have user + assistant messages
      const state = provider.getState()
      expect(state.messages).toHaveLength(2)
      expect(state.messages[0].role).toBe('user')
      expect(state.messages[0].content).toBe('Hi')
      expect(state.messages[1].role).toBe('assistant')
      expect(state.messages[1].content).toBe('Hello world')
      expect(state.messages[1].isStreaming).toBe(false)
      expect(state.isLoading).toBe(false)
    })

    it('should skip non-data lines', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse([
          ': comment',
          'event: heartbeat',
          'data: {"type":"text","content":"ok"}',
          'data: {"type":"done"}',
        ]),
      )

      const provider = new DefaultAssistantProvider()
      const onEvent = vi.fn()

      await provider.sendMessage('Hi', defaultConfig, onEvent)

      expect(onEvent).toHaveBeenCalledTimes(2)
      expect(onEvent).toHaveBeenCalledWith({ type: 'text', content: 'ok' })
    })

    it('should skip malformed JSON in SSE data', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse([
          'data: not-json',
          'data: {"type":"text","content":"valid"}',
          'data: {"type":"done"}',
        ]),
      )

      const provider = new DefaultAssistantProvider()
      const onEvent = vi.fn()

      await provider.sendMessage('Hi', defaultConfig, onEvent)

      expect(onEvent).toHaveBeenCalledTimes(2)
      expect(onEvent).toHaveBeenCalledWith({
        type: 'text',
        content: 'valid',
      })
    })

    it('should emit error event for non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: vi.fn().mockResolvedValue('Server broke'),
        body: null,
      })

      const provider = new DefaultAssistantProvider()
      const onEvent = vi.fn()

      await provider.sendMessage('Hi', defaultConfig, onEvent)

      expect(onEvent).toHaveBeenCalledWith({
        type: 'error',
        message: 'HTTP 500: Server broke',
      })

      expect(provider.getState().error).toBe('HTTP 500: Server broke')
      expect(provider.getState().isLoading).toBe(false)
    })

    it('should emit error when response has no body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
      })

      const provider = new DefaultAssistantProvider()
      const onEvent = vi.fn()

      await provider.sendMessage('Hi', defaultConfig, onEvent)

      expect(onEvent).toHaveBeenCalledWith({
        type: 'error',
        message: 'No response body',
      })
    })

    it('should include context in request body when set', async () => {
      mockFetch.mockResolvedValue(createMockStreamResponse(['data: {"type":"done"}']))

      const provider = new DefaultAssistantProvider()
      const context = [{ type: 'file', label: 'index.ts', value: '/src/index.ts' }]
      provider.setContext(context)

      const onEvent = vi.fn()
      await provider.sendMessage('Explain this', defaultConfig, onEvent)

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as Record<string, unknown>
      expect(body.context).toEqual(context)
    })

    it('should include systemContext in request body when configured', async () => {
      mockFetch.mockResolvedValue(createMockStreamResponse(['data: {"type":"done"}']))

      const provider = new DefaultAssistantProvider()
      const onEvent = vi.fn()

      await provider.sendMessage(
        'Hi',
        {
          ...defaultConfig,
          systemContext: 'You are a helpful assistant',
        },
        onEvent,
      )

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as Record<string, unknown>
      expect(body.systemContext).toBe('You are a helpful assistant')
    })

    it('should include custom headers from provider and config', async () => {
      mockFetch.mockResolvedValue(createMockStreamResponse(['data: {"type":"done"}']))

      const provider = new DefaultAssistantProvider({
        headers: { 'X-Provider': 'test' },
      })
      const onEvent = vi.fn()

      await provider.sendMessage(
        'Hi',
        {
          ...defaultConfig,
          headers: { Authorization: 'Bearer token' },
        },
        onEvent,
      )

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Provider': 'test',
            Authorization: 'Bearer token',
          }),
        }),
      )
    })

    it('should update suggestions on suggestion event', async () => {
      const newSuggestions = [{ id: 's1', label: 'Follow up', action: 'tell me more' }]
      mockFetch.mockResolvedValue(
        createMockStreamResponse([
          `data: {"type":"suggestion","suggestions":${JSON.stringify(newSuggestions)}}`,
          'data: {"type":"done"}',
        ]),
      )

      const provider = new DefaultAssistantProvider()
      const onEvent = vi.fn()

      await provider.sendMessage('Hi', defaultConfig, onEvent)

      expect(provider.getState().suggestions).toEqual(newSuggestions)
    })

    it('should trim messages when maxMessages is set', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse([
          'data: {"type":"text","content":"Response 1"}',
          'data: {"type":"done"}',
        ]),
      )

      const provider = new DefaultAssistantProvider()
      const onEvent = vi.fn()
      const config = { ...defaultConfig, maxMessages: 2 }

      // Send first message
      await provider.sendMessage('Message 1', config, onEvent)
      expect(provider.getState().messages).toHaveLength(2)

      // Send second — should trim to 2
      mockFetch.mockResolvedValue(
        createMockStreamResponse([
          'data: {"type":"text","content":"Response 2"}',
          'data: {"type":"done"}',
        ]),
      )
      await provider.sendMessage('Message 2', config, onEvent)

      expect(provider.getState().messages).toHaveLength(2)
      // Should keep only the most recent messages
      expect(provider.getState().messages[0].content).toBe('Message 2')
      expect(provider.getState().messages[1].content).toBe('Response 2')
    })
  })

  describe('abort', () => {
    it('should abort the current request', async () => {
      let capturedSignal: AbortSignal | undefined
      mockFetch.mockImplementation((_url: string, opts: RequestInit) => {
        capturedSignal = opts.signal as AbortSignal
        return new Promise(() => {}) // never resolves
      })

      const provider = new DefaultAssistantProvider()
      const onEvent = vi.fn()
      void provider.sendMessage('Hi', defaultConfig, onEvent)

      // Allow microtask to set up the fetch call
      await new Promise((r) => setTimeout(r, 10))

      provider.abort()

      expect(capturedSignal?.aborted).toBe(true)
    })

    it('should be a no-op when no request is active', () => {
      const provider = new DefaultAssistantProvider()
      expect(() => provider.abort()).not.toThrow()
    })

    it('should abort on close', async () => {
      let capturedSignal: AbortSignal | undefined
      mockFetch.mockImplementation((_url: string, opts: RequestInit) => {
        capturedSignal = opts.signal as AbortSignal
        return new Promise(() => {})
      })

      const provider = new DefaultAssistantProvider()
      provider.open(defaultConfig)
      const onEvent = vi.fn()
      void provider.sendMessage('Hi', defaultConfig, onEvent)

      await new Promise((r) => setTimeout(r, 10))

      provider.close()

      expect(capturedSignal?.aborted).toBe(true)
      expect(provider.getState().isOpen).toBe(false)
    })
  })

  describe('clearHistory', () => {
    it('should send DELETE request and clear local messages', async () => {
      // First send a message to have some state
      mockFetch.mockResolvedValue(
        createMockStreamResponse(['data: {"type":"text","content":"Hi"}', 'data: {"type":"done"}']),
      )

      const provider = new DefaultAssistantProvider({
        baseUrl: 'http://localhost:3000',
      })
      const onEvent = vi.fn()
      await provider.sendMessage('Hello', defaultConfig, onEvent)
      expect(provider.getState().messages).toHaveLength(2)

      // Now clear
      mockFetch.mockResolvedValue({ ok: true })
      await provider.clearHistory(defaultConfig)

      expect(mockFetch).toHaveBeenLastCalledWith(
        'http://localhost:3000/api/assistant',
        expect.objectContaining({ method: 'DELETE' }),
      )
      expect(provider.getState().messages).toEqual([])
    })

    it('should clear local state even if DELETE fails', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse(['data: {"type":"text","content":"Hi"}', 'data: {"type":"done"}']),
      )

      const provider = new DefaultAssistantProvider()
      const onEvent = vi.fn()
      await provider.sendMessage('Hello', defaultConfig, onEvent)

      mockFetch.mockRejectedValue(new Error('Network error'))
      await provider.clearHistory(defaultConfig)

      expect(provider.getState().messages).toEqual([])
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

      const provider = new DefaultAssistantProvider({
        baseUrl: 'http://localhost:3000',
      })
      const messages = await provider.loadHistory(defaultConfig)

      expect(messages).toHaveLength(2)
      expect(messages[0].id).toBe('msg-1')
      expect(messages[0].content).toBe('Hello')
      expect(messages[1].role).toBe('assistant')
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

      const provider = new DefaultAssistantProvider()
      const messages = await provider.loadHistory(defaultConfig)

      expect(messages[0].id).toBe('msg-0')
      expect(messages[1].id).toBe('msg-1')
    })

    it('should return empty array for non-ok response', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 })

      const provider = new DefaultAssistantProvider()
      const messages = await provider.loadHistory(defaultConfig)

      expect(messages).toEqual([])
    })

    it('should return empty array when no messages key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      })

      const provider = new DefaultAssistantProvider()
      const messages = await provider.loadHistory(defaultConfig)

      expect(messages).toEqual([])
    })

    it('should update internal state with loaded messages', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          messages: [{ id: 'msg-1', role: 'user', content: 'Hello', timestamp: 1000 }],
        }),
      })

      const provider = new DefaultAssistantProvider()
      await provider.loadHistory(defaultConfig)

      expect(provider.getState().messages).toHaveLength(1)
      expect(provider.getState().messages[0].content).toBe('Hello')
    })

    it('should return empty array on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const provider = new DefaultAssistantProvider()
      const messages = await provider.loadHistory(defaultConfig)

      expect(messages).toEqual([])
    })
  })

  describe('createProvider', () => {
    it('should return a DefaultAssistantProvider instance', () => {
      const provider = createProvider()
      expect(provider).toBeInstanceOf(DefaultAssistantProvider)
      expect(provider.name).toBe('default')
    })

    it('should pass config through', () => {
      const provider = createProvider({
        baseUrl: 'http://localhost:5000',
      })
      expect(provider).toBeInstanceOf(DefaultAssistantProvider)
    })
  })
})
