// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatEventHandler, ChatProvider, ChatStreamEvent } from '@molecule/app-ai-chat'

import { ChatContext } from '../../contexts.js'
import { useChat } from '../useChat.js'

// ── Mock provider factory ─────────────────────────────────────────────────

interface Deferred {
  resolve: () => void
  onEvent: ChatEventHandler
  message: string
  settled: boolean
}

/**
 * Creates a mock ChatProvider where each `sendMessage` call returns a promise
 * that the test controls. Use `complete(i)` to emit a `done` event and resolve
 * the i-th call, or `completeWithError(i, msg)` for an error event.
 * @returns The mock provider, deferred list, and helper methods to control responses.
 */
function createMockProvider(): { provider: ChatProvider; deferreds: Deferred[]; complete: (index: number) => void; completeWithError: (index: number, message: string) => void; emitText: (index: number, content: string) => void; emit: (index: number, event: ChatStreamEvent) => void } {
  const deferreds: Deferred[] = []

  const provider: ChatProvider = {
    name: 'mock',
    sendMessage: vi.fn(async (message: string, _config, onEvent: ChatEventHandler) => {
      return new Promise<void>((resolve) => {
        deferreds.push({ resolve, onEvent, message, settled: false })
      })
    }),
    abort: vi.fn(() => {
      // Resolve all pending promises so the await in the while-loop unblocks
      for (const d of deferreds) {
        if (!d.settled) {
          d.settled = true
          d.resolve()
        }
      }
    }),
    clearHistory: vi.fn().mockResolvedValue(undefined),
    loadHistory: vi.fn().mockResolvedValue([]),
  }

  return {
    provider,
    deferreds,
    /**
     * Emit a `done` event and resolve the i-th sendMessage call.
     * @param index - The zero-based index of the sendMessage call to complete.
     */
    complete(index: number) {
      const d = deferreds[index]
      d.onEvent({ type: 'done' })
      d.settled = true
      d.resolve()
    },
    /**
     * Emit an `error` event and resolve the i-th sendMessage call.
     * @param index - The zero-based index of the sendMessage call to complete with an error.
     * @param message - The error message to include in the error event.
     */
    completeWithError(index: number, message: string) {
      const d = deferreds[index]
      d.onEvent({ type: 'error', message })
      d.settled = true
      d.resolve()
    },
    /**
     * Emit a `text` event on the i-th call.
     * @param index - The zero-based index of the sendMessage call to emit text on.
     * @param content - The text content to emit.
     */
    emitText(index: number, content: string) {
      deferreds[index].onEvent({ type: 'text', content })
    },
    /**
     * Emit an arbitrary event on the i-th call.
     * @param index - The zero-based index of the sendMessage call to emit on.
     * @param event - The chat stream event to emit.
     */
    emit(index: number, event: ChatStreamEvent) {
      deferreds[index].onEvent(event)
    },
  }
}

// ── Test wrapper ──────────────────────────────────────────────────────────

/**
 * Creates a React wrapper component that provides the given ChatProvider via context.
 * @param chatProvider - The ChatProvider instance to inject into the component tree.
 * @returns A wrapper component that renders children within the ChatContext.
 */
function createWrapper(chatProvider: ChatProvider): ({ children }: { children: ReactNode }) => React.JSX.Element {
  return function Wrapper({ children }: { children: ReactNode }): React.JSX.Element {
    return <ChatContext.Provider value={chatProvider}>{children}</ChatContext.Provider>
  }
}

const PROJECT_ID = 'test-project'
const ENDPOINT = '/api/chat'

// ── Tests ─────────────────────────────────────────────────────────────────

describe('useChat', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  // ── Basic send ────────────────────────────────────────────────────────

  it('sends a message and creates user + assistant messages', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('Hello')
    })

    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0].role).toBe('user')
    expect(result.current.messages[0].content).toBe('Hello')
    expect(result.current.messages[1].role).toBe('assistant')
    expect(result.current.messages[1].isStreaming).toBe(true)
    expect(result.current.isLoading).toBe(true)
    expect(deferreds).toHaveLength(1)
    expect(deferreds[0].message).toBe('Hello')

    await act(async () => {
      complete(0)
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.messages[1].isStreaming).toBe(false)
  })

  it('accumulates text events into assistant content', async () => {
    const { provider, emitText, complete } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('Hi')
    })

    await act(async () => {
      emitText(0, 'Hello ')
      emitText(0, 'world')
    })

    // Text events are throttle-flushed every 50ms — wait for the update
    await waitFor(() => {
      const assistant = result.current.messages.find((m) => m.role === 'assistant')
      expect(assistant?.content).toBe('Hello world')
    })

    await act(async () => {
      complete(0)
    })
  })

  it('handles error events', async () => {
    const { provider, completeWithError } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('Hi')
    })

    await act(async () => {
      completeWithError(0, 'Server error')
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe('Server error')
    expect(result.current.messages[1].isStreaming).toBe(false)
  })

  // ── Queuing ───────────────────────────────────────────────────────────

  it('queues messages sent while streaming and drains them in order', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    // Send A → starts streaming
    await act(async () => {
      result.current.sendMessage('A')
    })
    expect(deferreds).toHaveLength(1)

    // Send B and C while A is streaming → queued
    await act(async () => {
      result.current.sendMessage('B')
    })
    await act(async () => {
      result.current.sendMessage('C')
    })
    expect(deferreds).toHaveLength(1) // Still only one provider call

    // All user messages should be visible immediately
    const userMsgs = result.current.messages.filter((m) => m.role === 'user')
    expect(userMsgs).toHaveLength(3)
    expect(userMsgs.map((m) => m.content)).toEqual(['A', 'B', 'C'])
    // A is not queued (sent directly), B and C are queued
    expect(userMsgs[0].queued).toBeFalsy()
    expect(userMsgs[1].queued).toBe(true)
    expect(userMsgs[2].queued).toBe(true)
    expect(result.current.isLoading).toBe(true)

    // Complete A → B is sent
    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(deferreds).toHaveLength(2))
    expect(deferreds[1].message).toBe('B')
    expect(result.current.isLoading).toBe(true)

    // Complete B → C is sent
    await act(async () => {
      complete(1)
    })
    await waitFor(() => expect(deferreds).toHaveLength(3))
    expect(deferreds[2].message).toBe('C')
    expect(result.current.isLoading).toBe(true)

    // Complete C → queue drained, loading finishes
    await act(async () => {
      complete(2)
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  it('creates an assistant placeholder for each queued message when it is sent', async () => {
    const { provider, complete } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('A')
    })
    await act(async () => {
      result.current.sendMessage('B')
    })

    // Only one assistant message exists (for A); B has no placeholder yet
    let assistants = result.current.messages.filter((m) => m.role === 'assistant')
    expect(assistants).toHaveLength(1)

    // Complete A → B is sent, a new assistant placeholder appears
    await act(async () => {
      complete(0)
    })
    await waitFor(() => {
      assistants = result.current.messages.filter((m) => m.role === 'assistant')
      expect(assistants).toHaveLength(2)
    })
    expect(assistants[1].isStreaming).toBe(true)

    await act(async () => {
      complete(1)
    })
  })

  it('clears the queued flag when a queued message starts being sent', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('A')
    })
    await act(async () => {
      result.current.sendMessage('B')
    })

    // B should be queued
    const bMsg = result.current.messages.find((m) => m.content === 'B')
    expect(bMsg?.queued).toBe(true)

    // Complete A → B starts being processed, queued flag should clear
    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(deferreds).toHaveLength(2))

    const bMsgAfter = result.current.messages.find((m) => m.content === 'B')
    expect(bMsgAfter?.queued).toBeFalsy()

    await act(async () => {
      complete(1)
    })
  })

  it('continues processing queue after an error on the current message', async () => {
    const { provider, deferreds, completeWithError, complete } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('A')
    })
    await act(async () => {
      result.current.sendMessage('B')
    })

    // A errors
    await act(async () => {
      completeWithError(0, 'Server error')
    })

    // B should be sent next, error cleared
    await waitFor(() => expect(deferreds).toHaveLength(2))
    expect(deferreds[1].message).toBe('B')
    expect(result.current.error).toBeNull()

    // Complete B normally
    await act(async () => {
      complete(1)
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBeNull()
  })

  it('continues processing queue after provider.sendMessage throws', async () => {
    const { provider, deferreds, complete } = createMockProvider()

    // Override sendMessage to throw on the first call
    let callCount = 0
    ;(provider.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
      async (message: string, _config: unknown, onEvent: ChatEventHandler) => {
        callCount++
        if (callCount === 1) {
          throw new Error('Network failure')
        }
        return new Promise<void>((resolve) => {
          deferreds.push({ resolve, onEvent, message, settled: false })
        })
      },
    )

    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('A')
    })
    await act(async () => {
      result.current.sendMessage('B')
    })

    // A threw, B should be sent next
    await waitFor(() => expect(deferreds).toHaveLength(1))
    expect(deferreds[0].message).toBe('B')

    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  // ── Abort ─────────────────────────────────────────────────────────────

  it('abort clears the queue, stops loading, and cleans sessionStorage', async () => {
    const { provider } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('A')
    })
    await act(async () => {
      result.current.sendMessage('B')
    })
    await act(async () => {
      result.current.sendMessage('C')
    })

    await act(async () => {
      result.current.abort()
    })

    expect(result.current.isLoading).toBe(false)
    expect(provider.abort).toHaveBeenCalled()
    expect(sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)).toBeNull()
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBeNull()

    // Streaming messages should be marked as aborted
    const streamingMsgs = result.current.messages.filter((m) => m.role === 'assistant')
    for (const m of streamingMsgs) {
      expect(m.isStreaming).toBe(false)
      expect(m.aborted).toBe(true)
    }
  })

  // ── Clear history ─────────────────────────────────────────────────────

  it('clearHistory clears the queue, messages, and sessionStorage', async () => {
    const { provider } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('A')
    })
    await act(async () => {
      result.current.sendMessage('B')
    })

    await act(async () => {
      await result.current.clearHistory()
    })

    expect(result.current.messages).toHaveLength(0)
    expect(result.current.error).toBeNull()
    expect(provider.clearHistory).toHaveBeenCalled()
    expect(sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)).toBeNull()
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBeNull()
  })

  // ── sessionStorage persistence ────────────────────────────────────────

  it('persists queue to sessionStorage when messages are queued', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('A')
    })

    await act(async () => {
      result.current.sendMessage('B')
    })
    await act(async () => {
      result.current.sendMessage('C')
    })

    const raw = sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)
    expect(raw).not.toBeNull()
    const queue = JSON.parse(raw!)
    expect(queue).toHaveLength(2)
    expect(queue[0].message).toBe('B')
    expect(queue[1].message).toBe('C')

    // After draining, queue is cleared
    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(deferreds).toHaveLength(2))
    await act(async () => {
      complete(1)
    })
    await waitFor(() => expect(deferreds).toHaveLength(3))
    await act(async () => {
      complete(2)
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)).toBeNull()
  })

  it('sets streaming flag during send and clears on completion', async () => {
    const { provider, complete } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBeNull()

    await act(async () => {
      result.current.sendMessage('A')
    })
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBe('1')

    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBeNull()
  })

  it('preserves streaming flag when beforeunload fires (page refresh)', async () => {
    const { provider } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('A')
    })
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBe('1')

    // Simulate page refresh: beforeunload fires, then the provider's fetch
    // abort causes the send loop to exit and run cleanup
    await act(async () => {
      window.dispatchEvent(new Event('beforeunload'))
    })

    // Complete the stream (simulates the AbortError path resolving the promise)
    await act(async () => {
      provider.abort()
    })

    // The streaming flag should still be set — not cleared during unload
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBe('1')
  })

  // ── Resume on mount ───────────────────────────────────────────────────

  it('restores persisted queue on mount and sends messages (no interrupted stream)', async () => {
    // Queue exists but no streaming flag — just send queued messages directly
    sessionStorage.setItem(
      `mol-chat-queue-${PROJECT_ID}`,
      JSON.stringify([{ message: 'queued-1' }, { message: 'queued-2' }]),
    )

    const { provider, deferreds, complete } = createMockProvider()
    ;(provider.loadHistory as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'h1', role: 'user', content: 'old msg', timestamp: 1000 },
    ])

    renderHook(() => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: true }), {
      wrapper: createWrapper(provider),
    })

    // loadHistory fires, then the first queued message is sent via setTimeout
    await waitFor(() => expect(deferreds).toHaveLength(1))
    expect(deferreds[0].message).toBe('queued-1')

    // Complete first → second queued message is sent
    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(deferreds).toHaveLength(2))
    expect(deferreds[1].message).toBe('queued-2')

    await act(async () => {
      complete(1)
    })
  })

  it('waits for server to finish, then sends resume request for real streaming', async () => {
    sessionStorage.setItem(`mol-chat-streaming-${PROJECT_ID}`, '1')

    const { provider, deferreds, emitText, complete } = createMockProvider()

    // Phase 1: server is still streaming (polling)
    const streamingProvider = provider as unknown as { isServerStreaming: boolean }
    streamingProvider.isServerStreaming = true
    let pollCount = 0
    ;(provider.loadHistory as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      pollCount++
      if (pollCount <= 2) {
        streamingProvider.isServerStreaming = true
      } else {
        streamingProvider.isServerStreaming = false
      }
      return [
        { id: 'h1', role: 'user', content: 'old msg', timestamp: 1000 },
        { id: 'h2', role: 'assistant', content: 'partial...', timestamp: 1001 },
      ]
    })

    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: true }),
      { wrapper: createWrapper(provider) },
    )

    // Spinner should show during polling
    await waitFor(() => {
      const h2 = result.current.messages.find((m) => m.id === 'h2')
      expect(h2?.isStreaming).toBe(true)
    })

    // Phase 2: after polling, a resume request is sent (provider.sendMessage called)
    await waitFor(() => expect(deferreds).toHaveLength(1), { timeout: 10000 })
    // Empty message = resume mode
    expect(deferreds[0].message).toBe('')

    // Real streaming works — text events append to the existing message
    await act(async () => {
      emitText(0, ' continued response')
    })

    // Text events are throttle-flushed every 50ms — wait for the update
    await waitFor(() => {
      const h2 = result.current.messages.find((m) => m.id === 'h2')
      expect(h2?.content).toBe('partial... continued response')
    })

    // No new user message was created
    expect(result.current.messages.filter((m) => m.role === 'user')).toHaveLength(1)

    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  it('does not auto-continue when streaming flag is set but history is empty', async () => {
    sessionStorage.setItem(`mol-chat-streaming-${PROJECT_ID}`, '1')

    const { provider, deferreds } = createMockProvider()
    ;(provider.loadHistory as ReturnType<typeof vi.fn>).mockResolvedValue([])

    renderHook(() => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: true }), {
      wrapper: createWrapper(provider),
    })

    // Wait for history load + potential setTimeout — no sendMessage should fire
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(deferreds).toHaveLength(0)
  })

  it('does not restore queue when loadOnMount is false', async () => {
    sessionStorage.setItem(`mol-chat-queue-${PROJECT_ID}`, JSON.stringify([{ message: 'queued' }]))
    sessionStorage.setItem(`mol-chat-streaming-${PROJECT_ID}`, '1')

    const { provider, deferreds } = createMockProvider()

    renderHook(() => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }), {
      wrapper: createWrapper(provider),
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(deferreds).toHaveLength(0)
    expect(provider.loadHistory).not.toHaveBeenCalled()
  })

  it('resumes then drains queued messages', async () => {
    sessionStorage.setItem(`mol-chat-streaming-${PROJECT_ID}`, '1')
    sessionStorage.setItem(
      `mol-chat-queue-${PROJECT_ID}`,
      JSON.stringify([{ message: 'my queued msg' }]),
    )

    const { provider, deferreds, complete } = createMockProvider()
    const streamingProvider = provider as unknown as { isServerStreaming: boolean }
    streamingProvider.isServerStreaming = false // Server already done
    ;(provider.loadHistory as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      streamingProvider.isServerStreaming = false
      return [
        { id: 'h1', role: 'user', content: 'old', timestamp: 1000 },
        { id: 'h2', role: 'assistant', content: 'final', timestamp: 1001 },
      ]
    })

    renderHook(() => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: true }), {
      wrapper: createWrapper(provider),
    })

    // First call is the resume request (empty message)
    await waitFor(() => expect(deferreds).toHaveLength(1), { timeout: 10000 })
    expect(deferreds[0].message).toBe('')

    // Complete resume → queued message sent next
    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(deferreds).toHaveLength(2), { timeout: 5000 })
    expect(deferreds[1].message).toBe('my queued msg')

    await act(async () => {
      complete(1)
    })
  })

  // ── projectId fallback ────────────────────────────────────────────────

  it('uses "default" storage key when projectId is undefined', async () => {
    const { provider } = createMockProvider()
    const { result } = renderHook(() => useChat({ endpoint: ENDPOINT, loadOnMount: false }), {
      wrapper: createWrapper(provider),
    })

    await act(async () => {
      result.current.sendMessage('A')
    })
    await act(async () => {
      result.current.sendMessage('B')
    })

    expect(sessionStorage.getItem('mol-chat-queue-default')).not.toBeNull()
    expect(sessionStorage.getItem('mol-chat-streaming-default')).toBe('1')
  })

  // ── Stream events ─────────────────────────────────────────────────────

  it('handles tool_use and tool_result events', async () => {
    const { provider, emit, complete } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('Do something')
    })

    await act(async () => {
      emit(0, { type: 'tool_use', id: 'tc1', name: 'write_file', input: { path: '/a.ts' } })
    })

    // Streaming events are throttle-flushed every 50ms — wait for the update
    await waitFor(() => {
      const assistant = result.current.messages.find((m) => m.role === 'assistant')!
      expect(assistant.toolCalls).toHaveLength(1)
      expect(assistant.toolCalls![0].status).toBe('running')
    })

    await act(async () => {
      emit(0, { type: 'tool_result', id: 'tc1', output: { success: true } })
    })

    await waitFor(() => {
      const assistant = result.current.messages.find((m) => m.role === 'assistant')!
      expect(assistant.toolCalls![0].status).toBe('done')
      expect(assistant.toolCalls![0].output).toEqual({ success: true })
    })

    await act(async () => {
      complete(0)
    })
  })

  it('handles mode and conversation events', async () => {
    const onModeChange = vi.fn()
    const onConversationId = vi.fn()
    const { provider, emit, complete } = createMockProvider()
    const { result } = renderHook(
      () =>
        useChat({
          endpoint: ENDPOINT,
          projectId: PROJECT_ID,
          loadOnMount: false,
          onModeChange,
          onConversationId,
        }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('Hi')
    })

    await act(async () => {
      emit(0, { type: 'mode', mode: 'plan' })
      emit(0, { type: 'conversation', id: 'conv-123' })
    })

    expect(result.current.mode).toBe('plan')
    expect(onModeChange).toHaveBeenCalledWith('plan')
    expect(onConversationId).toHaveBeenCalledWith('conv-123')

    await act(async () => {
      complete(0)
    })
  })

  it('handles thinking events', async () => {
    const { provider, emit, complete } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('Think hard')
    })

    await act(async () => {
      emit(0, { type: 'thinking', content: 'Let me ' })
      emit(0, { type: 'thinking', content: 'think...' })
    })

    // Streaming events are throttle-flushed every 50ms — wait for the update
    await waitFor(() => {
      const assistant = result.current.messages.find((m) => m.role === 'assistant')!
      const thinkingBlock = assistant.blocks?.find((b) => b.type === 'thinking')
      expect(thinkingBlock).toBeDefined()
      expect(thinkingBlock!.type === 'thinking' && thinkingBlock!.content).toBe('Let me think...')
    })

    await act(async () => {
      complete(0)
    })
  })

  it('handles file_diff events with onFileChange callback', async () => {
    const onFileChange = vi.fn()
    const { provider, emit, complete } = createMockProvider()
    const { result } = renderHook(
      () =>
        useChat({
          endpoint: ENDPOINT,
          projectId: PROJECT_ID,
          loadOnMount: false,
          onFileChange,
        }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('Edit file')
    })

    await act(async () => {
      emit(0, { type: 'tool_use', id: 'tc1', name: 'write_file', input: { path: 'app.ts' } })
      emit(0, { type: 'file_diff', path: 'app.ts', oldContent: 'old', newContent: 'new' })
    })

    const assistant = result.current.messages.find((m) => m.role === 'assistant')!
    expect(assistant.toolCalls![0].fileDiff).toEqual({ original: 'old', modified: 'new' })
    expect(onFileChange).toHaveBeenCalledWith('app.ts', 'new')

    await act(async () => {
      complete(0)
    })
  })

  it('handles commit_suggestion events', async () => {
    const { provider, emit, complete } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('Commit')
    })

    await act(async () => {
      emit(0, { type: 'commit_suggestion', files: ['a.ts', 'b.ts'] })
    })

    // Streaming events are throttle-flushed every 50ms — wait for the update
    await waitFor(() => {
      const assistant = result.current.messages.find((m) => m.role === 'assistant')!
      expect(assistant.commitSuggestion).toEqual({ files: ['a.ts', 'b.ts'], status: 'pending' })
    })

    await act(async () => {
      complete(0)
    })
  })

  it('handles loop_limit_reached events', async () => {
    const { provider, emit, complete } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('Go')
    })

    await act(async () => {
      emit(0, { type: 'loop_limit_reached', maxLoops: 25 })
    })

    // Streaming events are throttle-flushed every 50ms — wait for the update
    await waitFor(() => {
      const assistant = result.current.messages.find((m) => m.role === 'assistant')!
      expect(assistant.loopLimitReached).toBe(25)
    })

    await act(async () => {
      complete(0)
    })
  })

  // ── History loading ───────────────────────────────────────────────────

  it('loads history on mount when loadOnMount is true', async () => {
    const { provider } = createMockProvider()
    ;(provider.loadHistory as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'h1', role: 'user', content: 'old message', timestamp: 1000 },
      { id: 'h2', role: 'assistant', content: 'old reply', timestamp: 1001 },
    ])

    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: true }),
      { wrapper: createWrapper(provider) },
    )

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[0].content).toBe('old message')
    expect(result.current.messages[1].content).toBe('old reply')
  })

  it('does not load history when loadOnMount is false', async () => {
    const { provider } = createMockProvider()
    renderHook(() => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }), {
      wrapper: createWrapper(provider),
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(provider.loadHistory).not.toHaveBeenCalled()
  })

  // ── Provider context ──────────────────────────────────────────────────

  it('throws when used outside ChatProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      renderHook(() => useChat({ endpoint: ENDPOINT, loadOnMount: false }))
    }).toThrow('useChatProvider must be used within a ChatProvider')
    consoleSpy.mockRestore()
  })

  // ── editQueuedMessage ────────────────────────────────────────────────

  it('editQueuedMessage updates content in messages and persists to queue', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    // Send A (starts streaming), then queue B and C
    await act(async () => {
      result.current.sendMessage('A')
    })
    await act(async () => {
      result.current.sendMessage('B')
    })
    await act(async () => {
      result.current.sendMessage('C')
    })

    expect(deferreds).toHaveLength(1)

    // Find the queued B message
    const bMsg = result.current.messages.find((m) => m.content === 'B')
    expect(bMsg).toBeDefined()
    expect(bMsg!.queued).toBe(true)

    // Edit B's content
    await act(async () => {
      result.current.editQueuedMessage(bMsg!.id, 'B-edited')
    })

    // Message content should be updated
    const bMsgAfter = result.current.messages.find((m) => m.id === bMsg!.id)
    expect(bMsgAfter?.content).toBe('B-edited')
    expect(bMsgAfter?.queued).toBe(true)

    // sessionStorage should reflect the edit
    const raw = sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)
    expect(raw).not.toBeNull()
    const queue = JSON.parse(raw!)
    const editedEntry = queue.find((e: { message: string }) => e.message === 'B-edited')
    expect(editedEntry).toBeDefined()

    // Complete A → B-edited should be sent (with the edited content)
    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(deferreds).toHaveLength(2))
    expect(deferreds[1].message).toBe('B-edited')

    // Complete B and C
    await act(async () => {
      complete(1)
    })
    await waitFor(() => expect(deferreds).toHaveLength(3))
    await act(async () => {
      complete(2)
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  it('editQueuedMessage does nothing for non-queued messages', async () => {
    const { provider, complete } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    // Send A (not queued — sent directly)
    await act(async () => {
      result.current.sendMessage('A')
    })

    const aMsg = result.current.messages.find((m) => m.content === 'A')
    expect(aMsg).toBeDefined()
    expect(aMsg!.queued).toBeFalsy()

    // Attempt to edit a non-queued message
    await act(async () => {
      result.current.editQueuedMessage(aMsg!.id, 'A-edited')
    })

    // Content should be unchanged
    const aMsgAfter = result.current.messages.find((m) => m.id === aMsg!.id)
    expect(aMsgAfter?.content).toBe('A')

    await act(async () => {
      complete(0)
    })
  })

  // ── deleteQueuedMessage ──────────────────────────────────────────────

  it('deleteQueuedMessage removes a queued message from messages and queue', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    // Send A (starts streaming), then queue B and C
    await act(async () => {
      result.current.sendMessage('A')
    })
    await act(async () => {
      result.current.sendMessage('B')
    })
    await act(async () => {
      result.current.sendMessage('C')
    })

    expect(deferreds).toHaveLength(1)

    // Find the queued B message
    const bMsg = result.current.messages.find((m) => m.content === 'B')
    expect(bMsg).toBeDefined()
    expect(bMsg!.queued).toBe(true)

    // Delete B from the queue
    await act(async () => {
      result.current.deleteQueuedMessage(bMsg!.id)
    })

    // B should no longer be in messages
    const bMsgAfter = result.current.messages.find((m) => m.id === bMsg!.id)
    expect(bMsgAfter).toBeUndefined()

    // sessionStorage should only contain C
    const raw = sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)
    expect(raw).not.toBeNull()
    const queue = JSON.parse(raw!)
    expect(queue).toHaveLength(1)
    expect(queue[0].message).toBe('C')

    // Complete A → C should be sent (B was deleted)
    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(deferreds).toHaveLength(2))
    expect(deferreds[1].message).toBe('C')

    await act(async () => {
      complete(1)
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  it('deleteQueuedMessage does nothing for non-queued messages', async () => {
    const { provider, complete } = createMockProvider()
    const { result } = renderHook(
      () => useChat({ endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false }),
      { wrapper: createWrapper(provider) },
    )

    // Send A (not queued)
    await act(async () => {
      result.current.sendMessage('A')
    })

    const aMsg = result.current.messages.find((m) => m.content === 'A')
    expect(aMsg).toBeDefined()
    const msgCountBefore = result.current.messages.length

    // Attempt to delete a non-queued message
    await act(async () => {
      result.current.deleteQueuedMessage(aMsg!.id)
    })

    // Messages should be unchanged
    expect(result.current.messages).toHaveLength(msgCountBefore)
    const aMsgAfter = result.current.messages.find((m) => m.id === aMsg!.id)
    expect(aMsgAfter).toBeDefined()

    await act(async () => {
      complete(0)
    })
  })

  // ── onStreamEvent callback ───────────────────────────────────────────

  it('calls onStreamEvent for each streaming event', async () => {
    const onStreamEvent = vi.fn()
    const { provider, emitText, complete } = createMockProvider()
    const { result } = renderHook(
      () =>
        useChat({
          endpoint: ENDPOINT,
          projectId: PROJECT_ID,
          loadOnMount: false,
          onStreamEvent,
        }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('Hi')
    })

    await act(async () => {
      emitText(0, 'Hello ')
      emitText(0, 'world')
    })

    expect(onStreamEvent).toHaveBeenCalledTimes(2)
    expect(onStreamEvent).toHaveBeenNthCalledWith(1, { type: 'text', content: 'Hello ' })
    expect(onStreamEvent).toHaveBeenNthCalledWith(2, { type: 'text', content: 'world' })

    await act(async () => {
      complete(0)
    })

    // The done event should also be forwarded
    expect(onStreamEvent).toHaveBeenCalledWith({ type: 'done' })
  })

  it('forwards different event types to onStreamEvent', async () => {
    const onStreamEvent = vi.fn()
    const { provider, emit, emitText, complete } = createMockProvider()
    const { result } = renderHook(
      () =>
        useChat({
          endpoint: ENDPOINT,
          projectId: PROJECT_ID,
          loadOnMount: false,
          onStreamEvent,
        }),
      { wrapper: createWrapper(provider) },
    )

    await act(async () => {
      result.current.sendMessage('Do stuff')
    })

    await act(async () => {
      emit(0, { type: 'thinking', content: 'Hmm...' })
      emitText(0, 'Result: ')
      emit(0, { type: 'tool_use', id: 'tc1', name: 'write_file', input: { path: '/a.ts' } })
      emit(0, { type: 'tool_result', id: 'tc1', output: { success: true } })
      emit(0, { type: 'mode', mode: 'plan' })
    })

    expect(onStreamEvent).toHaveBeenCalledWith({ type: 'thinking', content: 'Hmm...' })
    expect(onStreamEvent).toHaveBeenCalledWith({ type: 'text', content: 'Result: ' })
    expect(onStreamEvent).toHaveBeenCalledWith({
      type: 'tool_use',
      id: 'tc1',
      name: 'write_file',
      input: { path: '/a.ts' },
    })
    expect(onStreamEvent).toHaveBeenCalledWith({
      type: 'tool_result',
      id: 'tc1',
      output: { success: true },
    })
    expect(onStreamEvent).toHaveBeenCalledWith({ type: 'mode', mode: 'plan' })

    await act(async () => {
      complete(0)
    })
  })
})
