// @vitest-environment jsdom

/**
 * Chat behaviour ported from React's `useChat` tests. The transcript,
 * streaming, queueing, retries, page-lifecycle recovery and pushed frames of
 * turns running elsewhere all live in `createChatSession` from
 * `@molecule/app-ai-chat`; the composable exposes that session's state and
 * controls, so the same inputs and expectations apply here.
 *
 * @module
 */

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { defineComponent, h, nextTick, shallowRef } from 'vue'

import type {
  ChatConfig,
  ChatEventHandler,
  ChatMessage,
  ChatProvider,
  ChatStreamEvent,
} from '@molecule/app-ai-chat'

import {
  convergeHistory,
  localOnlyMessages,
  resetChatStoresForTests,
  useChat,
  type UseChatOptions,
} from '../composables/useChat.js'
import { createChatPlugin } from '../plugin.js'

// ── Mock provider factory ─────────────────────────────────────────────────

/** One controllable `sendMessage` call. */
interface Deferred {
  resolve: () => void
  onEvent: ChatEventHandler
  message: string
  settled: boolean
}

/**
 * A chat provider whose sends the test completes itself, plus the extra
 * provider capabilities the shared session probes for (`isServerStreaming`,
 * `lastMeta`, `abortOnServer`, `sendSideMessage`).
 */
interface MockProvider extends ChatProvider {
  sendMessage: Mock<ChatProvider['sendMessage']>
  abort: Mock<ChatProvider['abort']>
  clearHistory: Mock<ChatProvider['clearHistory']>
  loadHistory: Mock<ChatProvider['loadHistory']>
  isServerStreaming?: boolean
  lastMeta?: Record<string, unknown>
  abortOnServer?: (
    config: ChatConfig,
    conversationId?: string,
    options?: { userInitiated?: boolean },
  ) => void
  sendSideMessage?: Mock<NonNullable<ChatProvider['sendSideMessage']>>
}

/** The mock provider and the helpers that drive its stream. */
interface MockProviderControl {
  provider: MockProvider
  deferreds: Deferred[]
  complete: (index: number) => void
  completeWithError: (index: number, message: string, status?: number) => void
  emitText: (index: number, content: string) => void
  emit: (index: number, event: ChatStreamEvent) => void
  startMessage: (index: number, id?: string, timestamp?: number) => void
  drop: (index: number) => void
}

/**
 * Creates a mock ChatProvider where each `sendMessage` call returns a promise
 * the test controls.
 *
 * @returns The mock provider, deferred list, and helpers that control responses.
 */
function createMockProvider(): MockProviderControl {
  const deferreds: Deferred[] = []

  const provider: MockProvider = {
    name: 'mock',
    sendMessage: vi.fn<ChatProvider['sendMessage']>(
      (message: string, _config: ChatConfig, onEvent: ChatEventHandler) =>
        new Promise<void>((resolve) => {
          deferreds.push({ resolve, onEvent, message, settled: false })
        }),
    ),
    abort: vi.fn<ChatProvider['abort']>(() => {
      // Resolve all pending promises so the await in the send loop unblocks.
      for (const deferred of deferreds) {
        if (!deferred.settled) {
          deferred.settled = true
          deferred.resolve()
        }
      }
    }),
    clearHistory: vi.fn<ChatProvider['clearHistory']>(async () => undefined),
    loadHistory: vi.fn<ChatProvider['loadHistory']>(async () => []),
  }

  return {
    provider,
    deferreds,
    /**
     * Emit a `done` event and resolve the i-th sendMessage call.
     *
     * @param index - The zero-based index of the sendMessage call to complete.
     */
    complete(index: number): void {
      const deferred = deferreds[index]
      deferred.onEvent({ type: 'done' })
      deferred.settled = true
      deferred.resolve()
    },
    /**
     * Emit an `error` event and resolve the i-th sendMessage call.
     *
     * @param index - The zero-based index of the sendMessage call to complete with an error.
     * @param message - The error message to include in the error event.
     * @param status - Optional HTTP status to include (e.g. 503 to exercise 5XX retry).
     */
    completeWithError(index: number, message: string, status?: number): void {
      const deferred = deferreds[index]
      deferred.onEvent({ type: 'error', message, ...(status != null ? { status } : {}) })
      deferred.settled = true
      deferred.resolve()
    },
    /**
     * Emit a `text` event on the i-th call.
     *
     * @param index - The zero-based index of the sendMessage call to emit text on.
     * @param content - The text content to emit.
     */
    emitText(index: number, content: string): void {
      deferreds[index].onEvent({ type: 'text', content })
    },
    /**
     * Emit an arbitrary event on the i-th call.
     *
     * @param index - The zero-based index of the sendMessage call to emit on.
     * @param event - The chat stream event to emit.
     */
    emit(index: number, event: ChatStreamEvent): void {
      deferreds[index].onEvent(event)
    },
    /**
     * Open a new assistant message on the i-th stream (the server's `message_start`).
     *
     * @param index - The zero-based index of the sendMessage call.
     * @param id - The message id (defaults to `asst-<index>`).
     * @param timestamp - The server timestamp in ms (defaults to a fixed value).
     */
    startMessage(index: number, id = `asst-${index}`, timestamp = 1_000): void {
      deferreds[index].onEvent({ type: 'message_start', id, timestamp })
    },
    /**
     * Close the i-th stream WITHOUT a terminal event — the socket dying, the
     * edge proxy recycling the connection, a phone screen locking.
     *
     * @param index - The zero-based index of the sendMessage call to drop.
     */
    drop(index: number): void {
      const deferred = deferreds[index]
      deferred.settled = true
      deferred.resolve()
    },
  }
}

// ── Test harness ──────────────────────────────────────────────────────────

const wrappers: VueWrapper[] = []

/** The mounted composable plus the controls a test needs to drive it. */
interface RenderedChat {
  chat: ReturnType<typeof useChat>
  setOptions: (next: UseChatOptions) => Promise<void>
  unmount: () => void
}

/**
 * Mounts `useChat` against `provider`, with an options ref the test can move
 * (a changed endpoint is React's re-render with new props).
 *
 * @param provider - The chat provider to inject.
 * @param initial - The options the composable starts with.
 * @returns The composable result and controls to move or unmount it.
 */
function renderChat(provider: ChatProvider, initial: UseChatOptions): RenderedChat {
  const options = shallowRef<UseChatOptions>(initial)
  let chat!: ReturnType<typeof useChat>
  const Harness = defineComponent({
    setup() {
      chat = useChat(options)
      return () => h('div')
    },
  })
  const wrapper = mount(Harness, { global: { plugins: [createChatPlugin(provider)] } })
  wrappers.push(wrapper)
  return {
    chat,
    setOptions: async (next: UseChatOptions): Promise<void> => {
      options.value = next
      await nextTick()
    },
    unmount: (): void => {
      wrapper.unmount()
      const index = wrappers.indexOf(wrapper)
      if (index >= 0) wrappers.splice(index, 1)
    },
  }
}

/** Let queued microtasks and zero-delay timers run. */
const settle = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0)
  await nextTick()
}

/**
 * Runs `work`, then flushes whatever it queued — React's `act` in this
 * composable's terms.
 *
 * @param work - The synchronous or asynchronous work to run.
 */
const act = async (work: () => void | Promise<void>): Promise<void> => {
  await work()
  await settle()
}

/**
 * Retries `check` while advancing fake timers, so a throttled flush or a poll
 * lands — React's `waitFor`.
 *
 * @param check - The assertion to retry.
 * @param timeoutMs - How much virtual time to allow before rethrowing.
 */
const waitFor = async (check: () => void, timeoutMs = 2_000): Promise<void> => {
  let elapsed = 0
  for (;;) {
    try {
      check()
      return
    } catch (error) {
      if (elapsed >= timeoutMs) throw error
    }
    await vi.advanceTimersByTimeAsync(50)
    await nextTick()
    elapsed += 50
  }
}

const PROJECT_ID = 'test-project'
const ENDPOINT = '/api/chat'

beforeEach(() => {
  vi.useFakeTimers()
  sessionStorage.clear()
  // The conversation message store is module-level (outlives mounts), so it
  // leaks across test cases unless reset — same rationale as clearing sessionStorage.
  resetChatStoresForTests()
})

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.clearAllTimers()
  vi.useRealTimers()
  sessionStorage.clear()
  resetChatStoresForTests()
})

// ── Tests ─────────────────────────────────────────────────────────────────

describe('useChat', () => {
  // ── Basic send ────────────────────────────────────────────────────────

  it('sends a message and creates user + assistant messages', async () => {
    const { provider, deferreds, complete, startMessage, emitText } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('Hello')
    })

    // No upfront placeholder — the assistant message appears only on the server's
    // message_start (the spinner in the gap is driven by isLoading).
    expect(chat.messages.value).toHaveLength(1)
    expect(chat.messages.value[0].role).toBe('user')
    expect(chat.messages.value[0].content).toBe('Hello')
    expect(chat.isLoading.value).toBe(true)
    expect(deferreds).toHaveLength(1)
    expect(deferreds[0].message).toBe('Hello')

    await act(async () => {
      startMessage(0)
      emitText(0, 'hi')
    })
    await waitFor(() => {
      expect(chat.messages.value).toHaveLength(2)
      expect(chat.messages.value[1].role).toBe('assistant')
      expect(chat.messages.value[1].isStreaming).toBe(true)
    })

    await act(async () => {
      complete(0)
    })

    expect(chat.isLoading.value).toBe(false)
    expect(chat.messages.value[1].isStreaming).toBe(false)
  })

  it('appends a `card` event as a role:system card-message in the ONE store (de-duped by id)', async () => {
    const { provider, emit, complete, startMessage, emitText } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('build it')
    })
    await act(async () => {
      startMessage(0)
      emitText(0, 'working')
      emit(0, {
        type: 'card',
        id: 'card-model-1',
        timestamp: 999,
        card: { kind: 'model', model: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
      })
    })

    await waitFor(() => {
      const card = chat.messages.value.find((message) => message.id === 'card-model-1')
      expect(card).toBeDefined()
      expect(card?.role).toBe('system')
      expect(card?.cardEvent).toEqual({
        kind: 'model',
        model: 'deepseek-v4-flash',
        label: 'DeepSeek V4 Flash',
      })
      expect(card?.timestamp).toBe(999)
    })

    // The same card id arriving again (own broadcast echo) must NOT double-add.
    await act(async () => {
      emit(0, {
        type: 'card',
        id: 'card-model-1',
        timestamp: 999,
        card: { kind: 'model', model: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
      })
      complete(0)
    })
    expect(chat.messages.value.filter((message) => message.id === 'card-model-1')).toHaveLength(1)
    // The card-message is distinct from the streaming assistant message.
    expect(chat.messages.value.find((message) => message.role === 'assistant')?.content).toBe(
      'working',
    )
  })

  it('carries a render-check advisory into the live verification block', async () => {
    const { provider, emit, complete, startMessage } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('build it')
    })
    await act(async () => {
      startMessage(0)
      emit(0, {
        type: 'verification_result',
        status: 'ok',
        workspaces: ['app'],
        renderCheckUnavailable: true,
      })
    })

    await waitFor(() => {
      expect(chat.messages.value.find((message) => message.role === 'assistant')?.blocks).toEqual([
        {
          type: 'verification',
          status: 'ok',
          workspaces: ['app'],
          renderCheckUnavailable: true,
        },
      ])
    })
    await act(async () => {
      complete(0)
    })
  })

  it('accumulates text events into assistant content', async () => {
    const { provider, emitText, complete, startMessage } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('Hi')
    })

    await act(async () => {
      startMessage(0)
      emitText(0, 'Hello ')
      emitText(0, 'world')
    })

    await waitFor(() => {
      const assistant = chat.messages.value.find((message) => message.role === 'assistant')
      expect(assistant?.content).toBe('Hello world')
    })

    await act(async () => {
      complete(0)
    })
  })

  it('handles error events', async () => {
    const { provider, completeWithError, startMessage, emitText } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('Hi')
    })

    await act(async () => {
      startMessage(0)
      emitText(0, 'partial')
    })
    await act(async () => {
      completeWithError(0, 'Server error')
    })

    await waitFor(() => expect(chat.isLoading.value).toBe(false))
    expect(chat.error.value).toBe('Server error')
    expect(chat.messages.value[1].isStreaming).toBe(false)
  })

  // ── Queuing ───────────────────────────────────────────────────────────

  it('queues messages sent while streaming and drains them in order', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('A')
    })
    expect(deferreds).toHaveLength(1)

    await act(async () => {
      void chat.sendMessage('B')
    })
    await act(async () => {
      void chat.sendMessage('C')
    })
    expect(deferreds).toHaveLength(1)

    const userMessages = chat.messages.value.filter((message) => message.role === 'user')
    expect(userMessages).toHaveLength(3)
    expect(userMessages.map((message) => message.content)).toEqual(['A', 'B', 'C'])
    expect(userMessages[0].queued).toBeFalsy()
    expect(userMessages[1].queued).toBe(true)
    expect(userMessages[2].queued).toBe(true)
    expect(chat.isLoading.value).toBe(true)

    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(deferreds).toHaveLength(2))
    expect(deferreds[1].message).toBe('B')
    expect(chat.isLoading.value).toBe(true)

    await act(async () => {
      complete(1)
    })
    await waitFor(() => expect(deferreds).toHaveLength(3))
    expect(deferreds[2].message).toBe('C')
    expect(chat.isLoading.value).toBe(true)

    await act(async () => {
      complete(2)
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(false))
  })

  it('creates an assistant message per turn as each queued message is sent', async () => {
    const { provider, deferreds, complete, startMessage, emitText } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('A')
    })
    await act(async () => {
      void chat.sendMessage('B')
    })

    let assistants = chat.messages.value.filter((message) => message.role === 'assistant')
    expect(assistants).toHaveLength(0)
    await act(async () => {
      startMessage(0)
      emitText(0, 'a')
    })
    await waitFor(() => {
      assistants = chat.messages.value.filter((message) => message.role === 'assistant')
      expect(assistants).toHaveLength(1)
    })

    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(deferreds).toHaveLength(2))
    await act(async () => {
      startMessage(1)
      emitText(1, 'b')
    })
    await waitFor(() => {
      assistants = chat.messages.value.filter((message) => message.role === 'assistant')
      expect(assistants).toHaveLength(2)
    })
    expect(assistants[1].isStreaming).toBe(true)

    await act(async () => {
      complete(1)
    })
  })

  it('clears the queued flag when a queued message starts being sent', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('A')
    })
    await act(async () => {
      void chat.sendMessage('B')
    })

    const queuedB = chat.messages.value.find((message) => message.content === 'B')
    expect(queuedB?.queued).toBe(true)

    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(deferreds).toHaveLength(2))

    const sentB = chat.messages.value.find((message) => message.content === 'B')
    expect(sentB).toBeDefined()
    expect(sentB!.queued).toBeFalsy()

    await act(async () => {
      complete(1)
    })
  })

  it('continues processing queue after an error on the current message', async () => {
    const { provider, deferreds, completeWithError, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('A')
    })
    await act(async () => {
      void chat.sendMessage('B')
    })

    await act(async () => {
      completeWithError(0, 'Server error')
    })

    await waitFor(() => expect(deferreds).toHaveLength(2))
    expect(deferreds[1].message).toBe('B')
    expect(chat.error.value).toBeNull()

    await act(async () => {
      complete(1)
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(false))
    expect(chat.error.value).toBeNull()
  })

  it('continues processing queue after provider.sendMessage throws', async () => {
    const { provider, deferreds, complete } = createMockProvider()

    let callCount = 0
    provider.sendMessage.mockImplementation(
      async (message: string, _config: ChatConfig, onEvent: ChatEventHandler) => {
        callCount++
        if (callCount === 1) {
          throw new Error('Network failure')
        }
        return new Promise<void>((resolve) => {
          deferreds.push({ resolve, onEvent, message, settled: false })
        })
      },
    )

    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('A')
    })
    await act(async () => {
      void chat.sendMessage('B')
    })

    await waitFor(() => expect(deferreds).toHaveLength(1))
    expect(deferreds[0].message).toBe('B')

    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(false))
  })

  // ── Abort ─────────────────────────────────────────────────────────────

  it('abort clears the queue, stops loading, and cleans sessionStorage', async () => {
    const { provider } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('A')
    })
    await act(async () => {
      void chat.sendMessage('B')
    })
    await act(async () => {
      void chat.sendMessage('C')
    })

    await act(async () => {
      chat.abort()
    })

    expect(chat.isLoading.value).toBe(false)
    expect(provider.abort).toHaveBeenCalled()
    expect(sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)).toBeNull()
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBeNull()

    const streamingMessages = chat.messages.value.filter((message) => message.role === 'assistant')
    for (const message of streamingMessages) {
      expect(message.isStreaming).toBe(false)
      expect(message.aborted).toBe(true)
    }
  })

  // ── Auto-sent / suppressed message flags (C2 + C3) ─────────────────────

  it('forwards the automatic flag to the server config and flags the optimistic message (C2)', async () => {
    const { provider, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('Fix these issues', undefined, { automatic: true })
    })

    const userMessage = chat.messages.value.find((message) => message.role === 'user')
    expect(userMessage?.automatic).toBe(true)

    const config = provider.sendMessage.mock.calls[0]?.[1]
    expect(config?.automatic).toBe(true)

    await act(async () => {
      complete(0)
    })
  })

  it('forwards suppressUserMessage to the server config and appends no optimistic bubble (C3)', async () => {
    const { provider, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('internal driver', undefined, { suppressUserMessage: true })
    })

    expect(chat.messages.value.filter((message) => message.role === 'user')).toHaveLength(0)

    const config = provider.sendMessage.mock.calls[0]?.[1]
    expect(config?.suppressUserMessage).toBe(true)

    await act(async () => {
      complete(0)
    })
  })

  // ── Server mode is authoritative on every history load (G33) ───────────

  it('applies the server mode on reconcile, including execute, so a tab that missed the plan→build flip heals', async () => {
    const { provider } = createMockProvider()
    provider.lastMeta = { mode: 'plan' }
    const onModeChange = vi.fn()

    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      onModeChange,
    })
    await waitFor(() => expect(chat.mode.value).toBe('plan'))
    expect(onModeChange).toHaveBeenLastCalledWith('plan')

    // The live flip to execute never reached this tab; the next history load
    // carries the server's persisted mode.
    provider.lastMeta = { mode: 'execute' }
    await act(async () => {
      await chat.reconcileHistory()
    })
    expect(chat.mode.value).toBe('execute')
    expect(onModeChange).toHaveBeenLastCalledWith('execute')

    // Idempotent: a matching mode fires nothing.
    onModeChange.mockClear()
    await act(async () => {
      await chat.reconcileHistory()
    })
    expect(onModeChange).not.toHaveBeenCalled()
  })

  // ── Stop keeps streamed content (C4) ───────────────────────────────────

  it('keeps streamed content on user abort and does NOT overwrite it with reloaded history (C4)', async () => {
    const { provider, emitText, startMessage } = createMockProvider()
    // A reload here would return STALE history lacking this in-flight turn.
    provider.loadHistory.mockResolvedValue([
      { id: 'old', role: 'user', content: 'previous turn', timestamp: 1 },
    ])

    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('go')
    })
    await act(async () => {
      startMessage(0)
      emitText(0, 'partial streamed answer')
    })

    await act(async () => {
      chat.abort()
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(false))

    const assistant = chat.messages.value.find((message) => message.role === 'assistant')
    expect(assistant?.content).toContain('partial streamed answer')
    expect(assistant?.aborted).toBe(true)

    expect(chat.messages.value.some((message) => message.content === 'previous turn')).toBe(false)
  })

  // ── Clear history ─────────────────────────────────────────────────────

  it('clearHistory clears the queue, messages, and sessionStorage', async () => {
    const { provider } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('A')
    })
    await act(async () => {
      void chat.sendMessage('B')
    })

    await act(async () => {
      await chat.clearHistory()
    })

    expect(chat.messages.value).toHaveLength(0)
    expect(chat.error.value).toBeNull()
    expect(provider.clearHistory).toHaveBeenCalled()
    expect(sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)).toBeNull()
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBeNull()
  })

  // ── sessionStorage persistence ────────────────────────────────────────

  it('persists queue to sessionStorage when messages are queued', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('A')
    })
    await act(async () => {
      void chat.sendMessage('B')
    })
    await act(async () => {
      void chat.sendMessage('C')
    })

    const raw = sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)
    expect(raw).not.toBeNull()
    const queue = JSON.parse(raw ?? '[]') as { message: string }[]
    expect(queue).toHaveLength(2)
    expect(queue[0].message).toBe('B')
    expect(queue[1].message).toBe('C')

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
    await waitFor(() => expect(chat.isLoading.value).toBe(false))

    expect(sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)).toBeNull()
  })

  it('sets streaming flag during send and clears on completion', async () => {
    const { provider, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBeNull()

    await act(async () => {
      void chat.sendMessage('A')
    })
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBe('1')

    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(false))
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBeNull()
  })

  it('preserves streaming flag when beforeunload fires (page refresh)', async () => {
    const { provider } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('A')
    })
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBe('1')

    // Simulate page refresh: beforeunload fires, then the provider's fetch
    // abort causes the send loop to exit and run cleanup.
    await act(async () => {
      window.dispatchEvent(new Event('beforeunload'))
    })

    await act(async () => {
      provider.abort()
    })

    // The streaming flag should still be set — not cleared during unload.
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBe('1')
  })

  // ── Resume on mount ───────────────────────────────────────────────────

  it('restores persisted queue on mount and sends messages (no interrupted stream)', async () => {
    sessionStorage.setItem(
      `mol-chat-queue-${PROJECT_ID}`,
      JSON.stringify([{ message: 'queued-1' }, { message: 'queued-2' }]),
    )

    const { provider, deferreds, complete } = createMockProvider()
    provider.loadHistory.mockResolvedValue([
      { id: 'h1', role: 'user', content: 'old msg', timestamp: 1000 },
    ])

    renderChat(provider, { endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: true })

    await waitFor(() => expect(deferreds).toHaveLength(1))
    expect(deferreds[0].message).toBe('queued-1')

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

    const { provider, deferreds, emitText, complete, startMessage } = createMockProvider()
    provider.isServerStreaming = true
    let pollCount = 0
    provider.loadHistory.mockImplementation(async () => {
      pollCount++
      provider.isServerStreaming = pollCount <= 2
      return [
        { id: 'h1', role: 'user', content: 'old msg', timestamp: 1000 },
        { id: 'h2', role: 'assistant', content: 'partial...', timestamp: 1001 },
      ]
    })

    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: true,
    })

    await waitFor(() => {
      const partial = chat.messages.value.find((message) => message.id === 'h2')
      expect(partial?.isStreaming).toBe(true)
    })

    await waitFor(() => expect(deferreds).toHaveLength(1), 12_000)
    // Empty message = resume mode.
    expect(deferreds[0].message).toBe('')

    await act(async () => {
      startMessage(0, 'h3')
      emitText(0, ' continued response')
    })
    await waitFor(() => {
      const continued = chat.messages.value.find((message) => message.id === 'h3')
      expect(continued?.content).toBe(' continued response')
    })
    expect(chat.messages.value.find((message) => message.id === 'h2')?.content).toBe('partial...')

    expect(chat.messages.value.filter((message) => message.role === 'user')).toHaveLength(1)

    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(false))
  })

  it('does not auto-continue when streaming flag is set but history is empty', async () => {
    sessionStorage.setItem(`mol-chat-streaming-${PROJECT_ID}`, '1')

    const { provider, deferreds } = createMockProvider()
    provider.loadHistory.mockResolvedValue([])

    renderChat(provider, { endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: true })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(deferreds).toHaveLength(0)
  })

  it('does not restore queue when loadOnMount is false', async () => {
    sessionStorage.setItem(`mol-chat-queue-${PROJECT_ID}`, JSON.stringify([{ message: 'queued' }]))
    sessionStorage.setItem(`mol-chat-streaming-${PROJECT_ID}`, '1')

    const { provider, deferreds } = createMockProvider()

    renderChat(provider, { endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
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
    provider.isServerStreaming = false
    provider.loadHistory.mockImplementation(async () => {
      provider.isServerStreaming = false
      return [
        { id: 'h1', role: 'user', content: 'old', timestamp: 1000 },
        { id: 'h2', role: 'assistant', content: 'final', timestamp: 1001 },
      ]
    })

    renderChat(provider, { endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: true })

    await waitFor(() => expect(deferreds).toHaveLength(1), 12_000)
    expect(deferreds[0].message).toBe('')

    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(deferreds).toHaveLength(2), 6_000)
    expect(deferreds[1].message).toBe('my queued msg')

    await act(async () => {
      complete(1)
    })
  })

  // ── projectId fallback ────────────────────────────────────────────────

  it('uses "default" storage key when projectId is undefined', async () => {
    const { provider } = createMockProvider()
    const { chat } = renderChat(provider, { endpoint: ENDPOINT, loadOnMount: false })

    await act(async () => {
      void chat.sendMessage('A')
    })
    await act(async () => {
      void chat.sendMessage('B')
    })

    expect(sessionStorage.getItem('mol-chat-queue-default')).not.toBeNull()
    expect(sessionStorage.getItem('mol-chat-streaming-default')).toBe('1')
  })

  // ── Conversation switching ────────────────────────────────────────────

  it('a switched-away conversation’s still-running stream stops writing into the store', async () => {
    const { provider, emitText, startMessage, complete } = createMockProvider()

    // Conversation A: mount, send, stream begins.
    const conversationA = renderChat(provider, {
      endpoint: `${ENDPOINT}?conversationId=conv-a`,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })
    await act(async () => {
      void conversationA.chat.sendMessage('build it')
    })
    await act(async () => {
      startMessage(0)
      emitText(0, 'old turn text')
    })
    await waitFor(() => expect(conversationA.chat.messages.value).toHaveLength(2))

    // User clicks "new chat" → the panel remounts pointing at conversation B.
    conversationA.unmount()
    const conversationB = renderChat(provider, {
      endpoint: `${ENDPOINT}?conversationId=conv-b`,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    // The switch cleared the old transcript + streaming state…
    expect(conversationB.chat.messages.value).toHaveLength(0)
    expect(conversationB.chat.isLoading.value).toBe(false)

    // …and the OLD stream's late events no longer bleed into the new view.
    await act(async () => {
      emitText(0, ' more old text')
      startMessage(0, 'asst-late')
      emitText(0, 'a whole late message')
      complete(0)
    })
    expect(conversationB.chat.messages.value).toHaveLength(0)
    expect(conversationB.chat.isLoading.value).toBe(false)
  })

  it('a brand-new conversation adopting its server id mid-stream is NOT a switch', async () => {
    const { provider, emitText, startMessage } = createMockProvider()

    const first = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })
    await act(async () => {
      void first.chat.sendMessage('start')
    })
    await act(async () => {
      startMessage(0)
      emitText(0, 'streaming…')
    })
    await waitFor(() => expect(first.chat.messages.value).toHaveLength(2))

    // Server assigns the conversation id → panel remounts with it in the URL.
    first.unmount()
    const second = renderChat(provider, {
      endpoint: `${ENDPOINT}?conversationId=conv-new`,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    // Live messages kept, and the original stream keeps filling the store.
    expect(second.chat.messages.value).toHaveLength(2)
    await act(async () => {
      emitText(0, ' still going')
    })
    await waitFor(() =>
      expect(second.chat.messages.value[1].content).toBe('streaming… still going'),
    )
  })

  // ── Stream events ─────────────────────────────────────────────────────

  it('handles tool_use and tool_result events', async () => {
    const { provider, emit, complete, startMessage } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('Do something')
    })

    await act(async () => {
      startMessage(0)
      emit(0, { type: 'tool_use', id: 'tc1', name: 'write_file', input: { path: '/a.ts' } })
    })

    await waitFor(() => {
      const assistant = chat.messages.value.find((message) => message.role === 'assistant')
      expect(assistant?.toolCalls).toHaveLength(1)
      expect(assistant?.toolCalls?.[0].status).toBe('running')
    })

    await act(async () => {
      emit(0, { type: 'tool_result', id: 'tc1', output: { success: true } })
    })

    await waitFor(() => {
      const assistant = chat.messages.value.find((message) => message.role === 'assistant')
      expect(assistant?.toolCalls?.[0].status).toBe('done')
      expect(assistant?.toolCalls?.[0].output).toEqual({ success: true })
    })

    await act(async () => {
      complete(0)
    })
  })

  it('handles mode and conversation events', async () => {
    const onModeChange = vi.fn()
    const onConversationId = vi.fn()
    const { provider, emit, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
      onModeChange,
      onConversationId,
    })

    await act(async () => {
      void chat.sendMessage('Hi')
    })

    await act(async () => {
      emit(0, { type: 'mode', mode: 'plan' })
      emit(0, { type: 'conversation', id: 'conv-123' })
    })

    expect(chat.mode.value).toBe('plan')
    expect(onModeChange).toHaveBeenCalledWith('plan')
    expect(onConversationId).toHaveBeenCalledWith('conv-123')

    await act(async () => {
      complete(0)
    })
  })

  it('handles thinking events', async () => {
    const { provider, emit, complete, startMessage } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('Think hard')
    })

    await act(async () => {
      startMessage(0)
      emit(0, { type: 'thinking', content: 'Let me ' })
      emit(0, { type: 'thinking', content: 'think...' })
    })

    await waitFor(() => {
      const assistant = chat.messages.value.find((message) => message.role === 'assistant')
      const thinkingBlock = assistant?.blocks?.find((block) => block.type === 'thinking')
      expect(thinkingBlock).toBeDefined()
      expect(thinkingBlock?.type === 'thinking' && thinkingBlock.content).toBe('Let me think...')
    })

    await act(async () => {
      complete(0)
    })
  })

  it('handles file_diff events with onFileChange callback', async () => {
    const onFileChange = vi.fn()
    const { provider, emit, complete, startMessage } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
      onFileChange,
    })

    await act(async () => {
      void chat.sendMessage('Edit file')
    })

    await act(async () => {
      startMessage(0)
      emit(0, { type: 'tool_use', id: 'tc1', name: 'write_file', input: { path: 'app.ts' } })
      emit(0, { type: 'file_diff', path: 'app.ts', oldContent: 'old', newContent: 'new' })
    })

    await waitFor(() => {
      const assistant = chat.messages.value.find((message) => message.role === 'assistant')
      expect(assistant?.toolCalls?.[0].fileDiff).toEqual({ original: 'old', modified: 'new' })
    })
    expect(onFileChange).toHaveBeenCalledWith('app.ts', 'new')

    await act(async () => {
      complete(0)
    })
  })

  it('handles commit_suggestion events', async () => {
    const { provider, emit, complete, startMessage, emitText } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('Commit')
    })

    await act(async () => {
      startMessage(0)
      emitText(0, 'done')
      emit(0, { type: 'commit_suggestion', files: ['a.ts', 'b.ts'] })
    })

    await waitFor(() => {
      const assistant = chat.messages.value.find((message) => message.role === 'assistant')
      expect(assistant?.commitSuggestion).toEqual({ files: ['a.ts', 'b.ts'], status: 'pending' })
    })

    await act(async () => {
      complete(0)
    })
  })

  it('handles loop_limit_reached events', async () => {
    const { provider, emit, complete, startMessage } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('Go')
    })

    await act(async () => {
      startMessage(0)
      emit(0, { type: 'loop_limit_reached', maxLoops: 25 })
    })

    await waitFor(() => {
      const assistant = chat.messages.value.find((message) => message.role === 'assistant')
      expect(assistant?.loopLimitReached).toBe(25)
    })

    await act(async () => {
      complete(0)
    })
  })

  // ── Per-message structure (message_start) ─────────────────────────────

  it('creates a separate assistant message per message_start within one send', async () => {
    const { provider, emitText, complete, startMessage } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('build it')
    })

    await act(async () => {
      startMessage(0, 'm1', 100)
      emitText(0, 'planning')
    })
    await waitFor(() => {
      expect(chat.messages.value.filter((message) => message.role === 'assistant')).toHaveLength(1)
    })
    await act(async () => {
      startMessage(0, 'm2', 200)
      emitText(0, 'building')
    })

    await waitFor(() => {
      const assistants = chat.messages.value.filter((message) => message.role === 'assistant')
      expect(assistants).toHaveLength(2)
      expect(assistants[0].content).toBe('planning')
      expect(assistants[1].content).toBe('building')
      expect(assistants[0].isStreaming).toBe(false)
      expect(assistants[1].isStreaming).toBe(true)
    })

    await act(async () => {
      complete(0)
    })
    const assistants = chat.messages.value.filter((message) => message.role === 'assistant')
    expect(assistants[1].isStreaming).toBe(false)
  })

  it('stamps each assistant message with the server timestamp from message_start', async () => {
    const { provider, emitText, complete, startMessage } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('go')
    })
    await act(async () => {
      startMessage(0, 'm1', 4242)
      emitText(0, 'hi')
    })

    await waitFor(() => {
      const assistant = chat.messages.value.find((message) => message.id === 'm1')
      expect(assistant?.timestamp).toBe(4242)
    })

    await act(async () => {
      complete(0)
    })
  })

  it('drops a truly-empty assistant turn (message_start with no content)', async () => {
    const { provider, emitText, complete, startMessage } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('go')
    })
    // An empty iteration opens a message but streams nothing.
    await act(async () => {
      startMessage(0, 'empty', 100)
    })

    // The next iteration opens a real message — finalizing the empty one drops it.
    await act(async () => {
      startMessage(0, 'real', 200)
      emitText(0, 'hello')
    })

    await waitFor(() => {
      const assistants = chat.messages.value.filter((message) => message.role === 'assistant')
      expect(assistants).toHaveLength(1)
      expect(assistants[0].id).toBe('real')
      expect(assistants[0].content).toBe('hello')
    })

    await act(async () => {
      complete(0)
    })
  })

  // ── History loading ───────────────────────────────────────────────────

  it('loads history on mount when loadOnMount is true', async () => {
    const { provider } = createMockProvider()
    provider.loadHistory.mockResolvedValue([
      { id: 'h1', role: 'user', content: 'old message', timestamp: 1000 },
      { id: 'h2', role: 'assistant', content: 'old reply', timestamp: 1001 },
    ])

    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: true,
    })

    await waitFor(() => expect(chat.messages.value).toHaveLength(2))
    expect(chat.messages.value[0].content).toBe('old message')
    expect(chat.messages.value[1].content).toBe('old reply')
  })

  it('does not load history when loadOnMount is false', async () => {
    const { provider } = createMockProvider()
    renderChat(provider, { endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: false })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(provider.loadHistory).not.toHaveBeenCalled()
  })

  // ── Provider context ──────────────────────────────────────────────────

  it('throws when used outside ChatProvider', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => {
      useChat({ endpoint: ENDPOINT, loadOnMount: false })
    }).toThrow('useChatProvider must be used within a ChatProvider')
    warnSpy.mockRestore()
  })

  // ── editQueuedMessage ────────────────────────────────────────────────

  it('editQueuedMessage updates content in messages and persists to queue', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('A')
    })
    await act(async () => {
      void chat.sendMessage('B')
    })
    await act(async () => {
      void chat.sendMessage('C')
    })

    expect(deferreds).toHaveLength(1)

    const queuedB = chat.messages.value.find((message) => message.content === 'B')
    expect(queuedB).toBeDefined()
    expect(queuedB?.queued).toBe(true)

    await act(async () => {
      void chat.editQueuedMessage(queuedB?.id ?? '', 'B-edited')
    })

    const editedB = chat.messages.value.find((message) => message.id === queuedB?.id)
    expect(editedB?.content).toBe('B-edited')
    expect(editedB?.queued).toBe(true)

    const raw = sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)
    expect(raw).not.toBeNull()
    const queue = JSON.parse(raw ?? '[]') as { message: string }[]
    const editedEntry = queue.find((entry) => entry.message === 'B-edited')
    expect(editedEntry).toBeDefined()

    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(deferreds).toHaveLength(2))
    expect(deferreds[1].message).toBe('B-edited')

    await act(async () => {
      complete(1)
    })
    await waitFor(() => expect(deferreds).toHaveLength(3))
    await act(async () => {
      complete(2)
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(false))
  })

  it('editQueuedMessage does nothing for non-queued messages', async () => {
    const { provider, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('A')
    })

    const sentA = chat.messages.value.find((message) => message.content === 'A')
    expect(sentA).toBeDefined()
    expect(sentA!.queued).toBeFalsy()

    await act(async () => {
      void chat.editQueuedMessage(sentA?.id ?? '', 'A-edited')
    })

    const unchangedA = chat.messages.value.find((message) => message.id === sentA?.id)
    expect(unchangedA?.content).toBe('A')

    await act(async () => {
      complete(0)
    })
  })

  // ── deleteQueuedMessage ──────────────────────────────────────────────

  it('deleteQueuedMessage removes a queued message from messages and queue', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('A')
    })
    await act(async () => {
      void chat.sendMessage('B')
    })
    await act(async () => {
      void chat.sendMessage('C')
    })

    expect(deferreds).toHaveLength(1)

    const queuedB = chat.messages.value.find((message) => message.content === 'B')
    expect(queuedB).toBeDefined()
    expect(queuedB?.queued).toBe(true)

    await act(async () => {
      void chat.deleteQueuedMessage(queuedB?.id ?? '')
    })

    const deletedB = chat.messages.value.find((message) => message.id === queuedB?.id)
    expect(deletedB).toBeUndefined()

    const raw = sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)
    expect(raw).not.toBeNull()
    const queue = JSON.parse(raw ?? '[]') as { message: string }[]
    expect(queue).toHaveLength(1)
    expect(queue[0].message).toBe('C')

    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(deferreds).toHaveLength(2))
    expect(deferreds[1].message).toBe('C')

    await act(async () => {
      complete(1)
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(false))
  })

  it('deleteQueuedMessage does nothing for non-queued messages', async () => {
    const { provider, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('A')
    })

    const sentA = chat.messages.value.find((message) => message.content === 'A')
    expect(sentA).toBeDefined()
    const messageCountBefore = chat.messages.value.length

    await act(async () => {
      void chat.deleteQueuedMessage(sentA?.id ?? '')
    })

    expect(chat.messages.value).toHaveLength(messageCountBefore)
    const keptA = chat.messages.value.find((message) => message.id === sentA?.id)
    expect(keptA).toBeDefined()

    await act(async () => {
      complete(0)
    })
  })

  // ── onStreamEvent callback ───────────────────────────────────────────

  it('calls onStreamEvent for each streaming event', async () => {
    const onStreamEvent = vi.fn()
    const { provider, emitText, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
      onStreamEvent,
    })

    await act(async () => {
      void chat.sendMessage('Hi')
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

    // The done event should also be forwarded.
    expect(onStreamEvent).toHaveBeenCalledWith({ type: 'done' })
  })

  it('forwards different event types to onStreamEvent', async () => {
    const onStreamEvent = vi.fn()
    const { provider, emit, emitText, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
      onStreamEvent,
    })

    await act(async () => {
      void chat.sendMessage('Do stuff')
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

  // ── 5XX backoff auto-retry ─────────────────────────────────────────────

  describe('5XX backoff auto-retry', () => {
    it('starts a cancelable countdown on a 5XX error instead of surfacing it', async () => {
      const { provider, completeWithError } = createMockProvider()
      const { chat } = renderChat(provider, {
        endpoint: ENDPOINT,
        projectId: PROJECT_ID,
        loadOnMount: false,
      })

      await act(async () => {
        void chat.sendMessage('go')
      })
      await act(async () => {
        completeWithError(0, 'Service Unavailable', 503)
      })

      expect(chat.error.value).toBeNull()
      expect(chat.retryCountdown.value).toEqual({ secondsRemaining: 5, attempt: 1 })
      expect(chat.isLoading.value).toBe(false)
    })

    it('surfaces a 4XX error and does NOT start a countdown', async () => {
      const { provider, completeWithError } = createMockProvider()
      const { chat } = renderChat(provider, {
        endpoint: ENDPOINT,
        projectId: PROJECT_ID,
        loadOnMount: false,
      })

      await act(async () => {
        void chat.sendMessage('go')
      })
      await act(async () => {
        completeWithError(0, 'Bad request', 400)
      })

      expect(chat.error.value).toBe('Bad request')
      expect(chat.retryCountdown.value).toBeNull()
    })

    it('surfaces an error with no status (transport error) without retrying', async () => {
      const { provider, completeWithError } = createMockProvider()
      const { chat } = renderChat(provider, {
        endpoint: ENDPOINT,
        projectId: PROJECT_ID,
        loadOnMount: false,
      })

      await act(async () => {
        void chat.sendMessage('go')
      })
      await act(async () => {
        completeWithError(0, 'Stream error')
      })

      expect(chat.error.value).toBe('Stream error')
      expect(chat.retryCountdown.value).toBeNull()
    })

    it('does NOT retry a 5XX that is a limit/quota error', async () => {
      const { provider, deferreds, emit } = createMockProvider()
      const { chat } = renderChat(provider, {
        endpoint: ENDPOINT,
        projectId: PROJECT_ID,
        loadOnMount: false,
      })

      await act(async () => {
        void chat.sendMessage('go')
      })
      await act(async () => {
        emit(0, { type: 'error', message: 'Out of quota', status: 503, limitType: 'messages' })
        deferreds[0].settled = true
        deferreds[0].resolve()
      })

      expect(chat.retryCountdown.value).toBeNull()
      expect(chat.error.value).toBe('Out of quota')
      expect(chat.errorMeta.value).toEqual({ limitType: 'messages', requiresSignup: undefined })
    })

    it('does NOT retry a 5XX that requires signup', async () => {
      const { provider, deferreds, emit } = createMockProvider()
      const { chat } = renderChat(provider, {
        endpoint: ENDPOINT,
        projectId: PROJECT_ID,
        loadOnMount: false,
      })

      await act(async () => {
        void chat.sendMessage('go')
      })
      await act(async () => {
        emit(0, { type: 'error', message: 'Sign up', status: 503, requiresSignup: true })
        deferreds[0].settled = true
        deferreds[0].resolve()
      })

      expect(chat.retryCountdown.value).toBeNull()
      expect(chat.error.value).toBe('Sign up')
    })

    it('ticks the countdown down once per second', async () => {
      const { provider, completeWithError } = createMockProvider()
      const { chat } = renderChat(provider, {
        endpoint: ENDPOINT,
        projectId: PROJECT_ID,
        loadOnMount: false,
      })

      await act(async () => {
        void chat.sendMessage('go')
      })
      await act(async () => {
        completeWithError(0, 'boom', 503)
      })
      expect(chat.retryCountdown.value?.secondsRemaining).toBe(5)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
      expect(chat.retryCountdown.value?.secondsRemaining).toBe(4)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000)
      })
      expect(chat.retryCountdown.value?.secondsRemaining).toBe(2)
    })

    it('cancelRetry clears the countdown and surfaces the original error', async () => {
      const { provider, completeWithError } = createMockProvider()
      const { chat } = renderChat(provider, {
        endpoint: ENDPOINT,
        projectId: PROJECT_ID,
        loadOnMount: false,
      })

      await act(async () => {
        void chat.sendMessage('go')
      })
      await act(async () => {
        completeWithError(0, 'Service Unavailable', 503)
      })
      expect(chat.retryCountdown.value).not.toBeNull()
      expect(chat.error.value).toBeNull()

      await act(async () => {
        chat.cancelRetry()
      })

      expect(chat.retryCountdown.value).toBeNull()
      expect(chat.error.value).toBe('Service Unavailable')
    })

    it('a new message clears a pending retry (no surfaced error)', async () => {
      const { provider, completeWithError } = createMockProvider()
      const { chat } = renderChat(provider, {
        endpoint: ENDPOINT,
        projectId: PROJECT_ID,
        loadOnMount: false,
      })

      await act(async () => {
        void chat.sendMessage('go')
      })
      await act(async () => {
        completeWithError(0, 'boom', 503)
      })
      expect(chat.retryCountdown.value).not.toBeNull()

      await act(async () => {
        void chat.sendMessage('a new message')
      })

      expect(chat.retryCountdown.value).toBeNull()
      expect(chat.error.value).toBeNull()
    })

    it('abort clears a pending retry without surfacing the error', async () => {
      const { provider, completeWithError } = createMockProvider()
      const { chat } = renderChat(provider, {
        endpoint: ENDPOINT,
        projectId: PROJECT_ID,
        loadOnMount: false,
      })

      await act(async () => {
        void chat.sendMessage('go')
      })
      await act(async () => {
        completeWithError(0, 'boom', 503)
      })
      expect(chat.retryCountdown.value).not.toBeNull()

      await act(async () => {
        chat.abort()
      })

      expect(chat.retryCountdown.value).toBeNull()
      expect(chat.error.value).toBeNull()
    })

    it('clearHistory clears a pending retry', async () => {
      const { provider, completeWithError } = createMockProvider()
      const { chat } = renderChat(provider, {
        endpoint: ENDPOINT,
        projectId: PROJECT_ID,
        loadOnMount: false,
      })

      await act(async () => {
        void chat.sendMessage('go')
      })
      await act(async () => {
        completeWithError(0, 'boom', 503)
      })
      expect(chat.retryCountdown.value).not.toBeNull()

      await act(async () => {
        await chat.clearHistory()
      })

      expect(chat.retryCountdown.value).toBeNull()
    })

    it('auto-resumes the turn via resume:true after the countdown elapses', async () => {
      const { provider, deferreds, emit, completeWithError } = createMockProvider()
      provider.isServerStreaming = false
      provider.loadHistory.mockResolvedValue([
        { id: 'h1', role: 'user', content: 'go', timestamp: 1000 },
        { id: 'h2', role: 'assistant', content: 'partial', timestamp: 1001 },
      ])

      const { chat } = renderChat(provider, {
        endpoint: ENDPOINT,
        projectId: PROJECT_ID,
        loadOnMount: false,
      })

      await act(async () => {
        void chat.sendMessage('go')
      })
      await act(async () => {
        // The turn STARTED server-side before failing — the retry must RESUME.
        emit(0, { type: 'conversation', id: 'conv-1' })
        completeWithError(0, 'Service Unavailable', 503)
      })
      expect(chat.retryCountdown.value).toEqual({ secondsRemaining: 5, attempt: 1 })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000)
      })
      expect(chat.retryCountdown.value).toBeNull()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })

      expect(deferreds).toHaveLength(2)
      const resumeCall = provider.sendMessage.mock.calls[1]
      expect(resumeCall?.[0]).toBe('')
      expect(resumeCall?.[1].resume).toBe(true)
    })

    it('bounds auto-retry to 8 attempts (5/10/20 then 30s holds), then surfaces the original error', async () => {
      const { provider, deferreds, emit, completeWithError } = createMockProvider()
      provider.isServerStreaming = false
      provider.loadHistory.mockResolvedValue([
        { id: 'h1', role: 'user', content: 'go', timestamp: 1000 },
        { id: 'h2', role: 'assistant', content: 'partial', timestamp: 1001 },
      ])

      const { chat } = renderChat(provider, {
        endpoint: ENDPOINT,
        projectId: PROJECT_ID,
        loadOnMount: false,
      })

      await act(async () => {
        void chat.sendMessage('go')
      })

      await act(async () => {
        emit(0, { type: 'conversation', id: 'conv-1' })
        completeWithError(0, 'err-1', 503)
      })
      expect(chat.retryCountdown.value).toEqual({ secondsRemaining: 5, attempt: 1 })

      const ladder = [5, 10, 20, 30, 30, 30, 30, 30]
      for (let attempt = 1; attempt < ladder.length; attempt++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync((ladder[attempt - 1] + 1) * 1000)
        })
        expect(deferreds).toHaveLength(attempt + 1)
        await act(async () => {
          completeWithError(attempt, `err-${attempt + 1}`, 503)
        })
        expect(chat.retryCountdown.value).toEqual({
          secondsRemaining: ladder[attempt],
          attempt: attempt + 1,
        })
      }

      await act(async () => {
        await vi.advanceTimersByTimeAsync(31_000)
      })
      expect(deferreds).toHaveLength(9)
      await act(async () => {
        completeWithError(8, 'err-final', 503)
      })

      expect(chat.retryCountdown.value).toBeNull()
      expect(chat.error.value).toBe('err-final')
    })
  })
})

// ── User Stop is a standing order ─────────────────────────────────────────

describe('useChat — user stop suppression + remote streaming', () => {
  it('drops an AUTONOMOUS automatic send after a user Stop', async () => {
    const { provider, deferreds } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('build the app')
    })
    expect(deferreds).toHaveLength(1)

    // User clicks Stop mid-stream.
    await act(async () => {
      chat.abort()
    })
    expect(chat.isLoading.value).toBe(false)

    // The platform dispatches an auto-fix — it must be swallowed.
    await act(async () => {
      void chat.sendMessage('[Preview health check] preview broken', undefined, {
        automatic: true,
      })
    })
    expect(deferreds).toHaveLength(1)
    expect(chat.isLoading.value).toBe(false)
    expect(
      chat.messages.value.some((message) => message.content.includes('Preview health check')),
    ).toBe(false)
  })

  it('lets a USER-INITIATED automatic send ("Fix with AI" click) through after a Stop — and it clears the stop', async () => {
    const { provider, deferreds, complete, startMessage, emitText } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('build the app')
    })
    await act(async () => {
      chat.abort()
    })

    // The user clicks "Fix with AI" — automatic styling, but a direct request.
    await act(async () => {
      void chat.sendMessage('Fix the broken preview', undefined, {
        automatic: true,
        userInitiated: true,
      })
    })
    expect(deferreds).toHaveLength(2)
    await act(async () => {
      startMessage(1)
      emitText(1, 'on it')
      complete(1)
    })

    // The stop is cleared — a later autonomous automatic send works again.
    await act(async () => {
      void chat.sendMessage('Fix these issues: …', undefined, { automatic: true })
    })
    expect(deferreds).toHaveLength(3)
  })

  it('a plain user send after a Stop clears the suppression', async () => {
    const { provider, deferreds, complete, startMessage, emitText } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('build the app')
    })
    await act(async () => {
      chat.abort()
    })

    // The user types a new message — that IS the re-engagement.
    await act(async () => {
      void chat.sendMessage('actually, keep going')
    })
    expect(deferreds).toHaveLength(2)
    await act(async () => {
      startMessage(1)
      emitText(1, 'continuing')
      complete(1)
    })

    // Autonomous automatic sends work again after the user re-engaged.
    await act(async () => {
      void chat.sendMessage('Fix these issues: …', undefined, { automatic: true })
    })
    expect(deferreds).toHaveLength(3)
  })

  it('marks the server abort as user-initiated (the durable server-side stop marker)', async () => {
    const { provider } = createMockProvider()
    const abortOnServer = vi.fn()
    provider.abortOnServer = abortOnServer
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('build the app')
    })
    await act(async () => {
      chat.abort()
    })

    expect(abortOnServer).toHaveBeenCalledWith(
      { endpoint: ENDPOINT, projectId: PROJECT_ID },
      undefined,
      { userInitiated: true },
    )
  })

  // ── Remote streaming (the vanished Stop button) ─────────────────────────

  it('confirms a remote backend turn from a pushed event and clears it when the server reports done', async () => {
    const { provider } = createMockProvider()
    let serverStreaming = true
    provider.loadHistory.mockImplementation(async () => {
      provider.isServerStreaming = serverStreaming
      return []
    })
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    // A pushed (broadcast) chat event arrived for this conversation.
    await act(async () => {
      chat.noteRemoteStreamEvent()
    })
    // The immediate confirm poll runs → server says streaming → flag on.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5)
    })
    expect(chat.isRemoteStreaming.value).toBe(true)

    // The remote turn finishes server-side → the next reconcile clears it.
    serverStreaming = false
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100)
    })
    expect(chat.isRemoteStreaming.value).toBe(false)
  })

  it('a Stop clears remote-turn tracking immediately (the abort endpoint kills the remote turn)', async () => {
    const { provider } = createMockProvider()
    provider.loadHistory.mockImplementation(async () => {
      provider.isServerStreaming = true
      return []
    })
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      chat.noteRemoteStreamEvent()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5)
    })
    expect(chat.isRemoteStreaming.value).toBe(true)

    // Stop: abortOnServer kills the backend turn — the control retires at once.
    await act(async () => {
      chat.abort()
    })
    expect(chat.isRemoteStreaming.value).toBe(false)
  })
})

describe('useChat — remote stream ingestion (applyRemoteEvent)', () => {
  const REMOTE_ENDPOINT = '/projects/p1/chat'
  const REMOTE_PROJECT = 'p1'

  it('materializes a remote turn — message_start, deltas, tools, done — into the store', async () => {
    const { provider } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: REMOTE_ENDPOINT,
      projectId: REMOTE_PROJECT,
      loadOnMount: false,
    })

    await act(async () => {
      chat.applyRemoteEvent({ type: 'message_start', id: 'remote-1', timestamp: 1_000 })
    })
    expect(chat.isRemoteStreaming.value).toBe(true)
    expect(chat.messages.value).toHaveLength(1)
    expect(chat.messages.value[0]).toMatchObject({
      id: 'remote-1',
      role: 'assistant',
      isStreaming: true,
    })

    await act(async () => {
      chat.applyRemoteEvent({ type: 'text', content: 'Hello ' })
      chat.applyRemoteEvent({ type: 'text', content: 'world' })
      chat.applyRemoteEvent({
        type: 'tool_use',
        id: 't1',
        name: 'write_file',
        input: { path: 'a.ts' },
      })
      chat.applyRemoteEvent({ type: 'tool_result', id: 't1', output: 'ok' })
    })

    await act(async () => {
      chat.applyRemoteEvent({ type: 'done' })
    })
    expect(chat.isRemoteStreaming.value).toBe(false)
    await waitFor(() => {
      expect(chat.messages.value[0].content).toBe('Hello world')
    })
    expect(chat.messages.value[0].toolCalls).toEqual([
      expect.objectContaining({ id: 't1', name: 'write_file', status: 'done', output: 'ok' }),
    ])
    expect(chat.messages.value[0].isStreaming).toBeFalsy()
  })

  it('adopts the trailing assistant message when attaching mid-turn (no message_start seen)', async () => {
    const { provider } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: REMOTE_ENDPOINT,
      projectId: REMOTE_PROJECT,
      loadOnMount: false,
    })
    // The history snapshot already produced the partial assistant message.
    await act(async () => {
      chat.appendCompleteMessage({
        id: 'snap-1',
        role: 'assistant',
        content: 'partial',
        timestamp: 500,
      })
    })
    await act(async () => {
      chat.applyRemoteEvent({ type: 'text', content: ' + live' })
    })
    await waitFor(() => {
      expect(chat.messages.value[0].content).toBe('partial + live')
    })
    expect(chat.messages.value[0].isStreaming).toBe(true)
  })

  it('drops its own WS echo while a local send owns the stream, but still applies cards', async () => {
    const { provider, startMessage, emitText, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: REMOTE_ENDPOINT,
      projectId: REMOTE_PROJECT,
      loadOnMount: false,
    })
    await act(async () => {
      void chat.sendMessage('build it')
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(true))
    await act(async () => {
      startMessage(0, 'own-1')
      emitText(0, 'own text')
    })
    // Echo of the same turn arriving over the push channel — must not double-apply.
    await act(async () => {
      chat.applyRemoteEvent({ type: 'message_start', id: 'own-1', timestamp: 1_000 })
      chat.applyRemoteEvent({ type: 'text', content: 'own text' })
    })
    // A shared card still lands (id-deduped), even mid-own-turn.
    await act(async () => {
      chat.applyRemoteEvent({
        type: 'card',
        id: 'card-1',
        timestamp: 2_000,
        card: { kind: 'setting', setting: 'fastMode', value: true },
      })
      chat.applyRemoteEvent({
        type: 'card',
        id: 'card-1',
        timestamp: 2_000,
        card: { kind: 'setting', setting: 'fastMode', value: true },
      })
    })
    await waitFor(() => {
      const own = chat.messages.value.find((message) => message.id === 'own-1')
      expect(own?.content).toBe('own text')
    })
    expect(chat.messages.value.filter((message) => message.id === 'card-1')).toHaveLength(1)
    await act(async () => {
      complete(0)
    })
  })

  it('applies a broadcast user message when idle and drops it while locally streaming', async () => {
    const { provider, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: REMOTE_ENDPOINT,
      projectId: REMOTE_PROJECT,
      loadOnMount: false,
    })
    // Idle: a teammate's prompt lands live.
    await act(async () => {
      chat.applyRemoteEvent({
        type: 'message',
        message: { id: 'u-remote', role: 'user', content: 'teammate prompt', timestamp: 1 },
      })
    })
    expect(chat.messages.value.some((message) => message.id === 'u-remote')).toBe(true)

    // While this client streams its own send, a user-message echo is dropped.
    await act(async () => {
      void chat.sendMessage('mine')
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(true))
    await act(async () => {
      chat.applyRemoteEvent({
        type: 'message',
        message: { id: 'u-echo', role: 'user', content: 'mine', timestamp: 2 },
      })
    })
    expect(chat.messages.value.some((message) => message.id === 'u-echo')).toBe(false)
    await act(async () => {
      complete(0)
    })
  })

  // ── Side-channel sends (team notes) ────────────────────────────────────

  it('sends a side-channel message immediately during an active turn — no queue, stream untouched', async () => {
    const { provider, deferreds, complete, startMessage } = createMockProvider()
    const sideSend = vi.fn<NonNullable<ChatProvider['sendSideMessage']>>(
      async (_message: string, _config: ChatConfig, onEvent: ChatEventHandler): Promise<void> => {
        onEvent({
          type: 'message',
          message: { id: 'note-1', role: 'user', content: 'hi team', timestamp: 5 },
        })
        onEvent({ type: 'done' })
      },
    )
    provider.sendSideMessage = sideSend

    const { chat } = renderChat(provider, {
      endpoint: REMOTE_ENDPOINT,
      projectId: REMOTE_PROJECT,
      loadOnMount: false,
    })

    // A turn is streaming.
    await act(async () => {
      void chat.sendMessage('build it')
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(true))
    await act(async () => {
      startMessage(0)
    })

    // The team note goes out mid-turn.
    await act(async () => {
      await chat.sendMessage('/teamsay hi team', undefined, {
        suppressUserMessage: true,
        sideChannel: true,
      })
    })

    expect(sideSend).toHaveBeenCalledTimes(1)
    // Rendered immediately from its own response — never queued.
    expect(chat.messages.value.some((message) => message.id === 'note-1')).toBe(true)
    expect(chat.messages.value.some((message) => message.queued)).toBe(false)
    // The running turn is untouched: still streaming, and no second turn POST.
    expect(chat.isLoading.value).toBe(true)
    expect(deferreds).toHaveLength(1)
    await act(async () => {
      complete(0)
    })
  })

  it('falls back to the normal send path when the provider has no side channel', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: REMOTE_ENDPOINT,
      projectId: REMOTE_PROJECT,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('/teamsay hi', undefined, {
        suppressUserMessage: true,
        sideChannel: true,
      })
    })

    // No sendSideMessage on the provider — the message went through sendMessage.
    expect(deferreds).toHaveLength(1)
    expect(deferreds[0].message).toBe('/teamsay hi')
    await act(async () => {
      complete(0)
    })
  })
})

describe('localOnlyMessages (remote-history merge)', () => {
  /**
   * A minimal message for the remote-history merge tests.
   *
   * @param id - The message id.
   * @param role - The message role.
   * @param content - The message content.
   * @param extra - Extra message fields.
   * @returns The message.
   */
  function message(
    id: string,
    role: 'user' | 'assistant',
    content: string,
    extra: Partial<ChatMessage> = {},
  ): ChatMessage {
    return { id, role, content, timestamp: 1, ...extra }
  }

  it('drops the optimistic echo of a user message the server already persisted', () => {
    const prev = [
      message('user-1', 'user', 'Build this.'),
      message('assistant-1', 'assistant', 'On it.'),
    ]
    const history = [
      message('srv-u1', 'user', 'Build this.'),
      message('srv-a1', 'assistant', 'On it.'),
    ]
    expect(localOnlyMessages(prev, history)).toEqual([
      message('assistant-1', 'assistant', 'On it.'),
    ])
  })

  it('keeps a queued (not yet sent) user message and any session-local card', () => {
    const prev = [
      message('user-2', 'user', 'and this', { queued: true }),
      message('card-1', 'assistant', 'local card'),
    ]
    const history = [message('srv-u1', 'user', 'Build this.')]
    expect(localOnlyMessages(prev, history)).toEqual(prev)
  })
})

describe('reconcileHistory keeps what the server does not have yet', () => {
  it('keeps a just-sent answer that the reloaded history does not carry yet', async () => {
    const { provider, startMessage, emitText, complete } = createMockProvider()
    provider.loadHistory.mockResolvedValue([
      { id: 'srv-1', role: 'user', content: 'earlier question', timestamp: 1 },
      { id: 'srv-2', role: 'assistant', content: 'earlier answer', timestamp: 2 },
    ])

    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('App not found or not live')
    })
    await act(async () => {
      startMessage(0)
      emitText(0, 'Thanks — checking.')
      complete(0)
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(false))

    await act(async () => {
      await chat.reconcileHistory()
    })

    const contents = chat.messages.value.map((message) => message.content)
    expect(contents).toContain('App not found or not live')
    expect(contents).toContain('Thanks — checking.')
    expect(contents).toContain('earlier question')
    expect(chat.messages.value[0]?.id).toBe('srv-1')
  })

  it('still drops the optimistic echo once the server has persisted it', async () => {
    const { provider, startMessage, complete } = createMockProvider()
    provider.loadHistory.mockResolvedValue([
      { id: 'srv-u', role: 'user', content: 'App not found or not live', timestamp: 1 },
      { id: 'srv-a', role: 'assistant', content: 'Thanks — checking.', timestamp: 2 },
    ])

    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('App not found or not live')
    })
    await act(async () => {
      startMessage(0)
      complete(0)
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(false))

    await act(async () => {
      await chat.reconcileHistory()
    })

    const userCopies = chat.messages.value.filter(
      (message) => message.role === 'user' && message.content === 'App not found or not live',
    )
    expect(userCopies).toHaveLength(1)
    expect(userCopies[0]?.id).toBe('srv-u')
  })
})

describe('applying a server history never rewinds what is already on screen', () => {
  it('keeps a card the user just answered when the server still has it awaiting', async () => {
    const { provider, startMessage, emit, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    // A turn that ends on an ask_user card.
    await act(async () => {
      void chat.sendMessage('deploy it')
    })
    await act(async () => {
      startMessage(0, 'asst-ask', 1_000)
      emit(0, {
        type: 'tool_use',
        id: 'tc-ask',
        name: 'ask_user',
        input: { question: 'Could you open the site and tell me what you see?' },
      })
      emit(0, { type: 'tool_result', id: 'tc-ask', output: { status: 'awaiting_response' } })
      complete(0)
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(false))

    // The user answers it — the store resolves the card right away.
    await act(async () => {
      void chat.sendMessage('App not found or not live', undefined, {
        suppressUserMessage: true,
        askUserAnswer: true,
      })
    })
    await act(async () => {
      complete(1)
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(false))

    // The server's transcript as it stood a moment before the answer persisted.
    provider.loadHistory.mockResolvedValue([
      {
        id: 'asst-ask',
        role: 'assistant',
        content: '',
        timestamp: 1_000,
        toolCalls: [
          {
            id: 'tc-ask',
            name: 'ask_user',
            input: { question: 'Could you open the site and tell me what you see?' },
            output: { status: 'awaiting_response' },
            status: 'done',
          },
        ],
      },
    ])

    await act(async () => {
      await chat.reconcileHistory()
    })

    const card = chat.messages.value
      .find((message) => message.id === 'asst-ask')
      ?.toolCalls?.find((toolCall) => toolCall.id === 'tc-ask')
    expect(card?.output).toBe('App not found or not live')
  })

  it('keeps the text a message has streamed when the server copy is shorter', async () => {
    const { provider, startMessage, emitText, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('go')
    })
    await act(async () => {
      startMessage(0, 'asst-live', 1_000)
      emitText(0, 'The full answer the user can already read.')
      complete(0)
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(false))

    // A snapshot taken mid-turn: same id, less content.
    provider.loadHistory.mockResolvedValue([
      { id: 'asst-live', role: 'assistant', content: 'The full', timestamp: 1_000 },
    ])

    await act(async () => {
      await chat.reconcileHistory()
    })

    expect(chat.messages.value.find((message) => message.id === 'asst-live')?.content).toBe(
      'The full answer the user can already read.',
    )
  })

  it('takes the server copy once it is the one that is further along', async () => {
    const { provider, startMessage, emitText, complete } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('go')
    })
    await act(async () => {
      startMessage(0, 'asst-live', 1_000)
      emitText(0, 'partial')
      complete(0)
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(false))
    provider.loadHistory.mockResolvedValue([
      {
        id: 'asst-live',
        role: 'assistant',
        content: 'partial, and then everything the turn went on to say',
        timestamp: 1_000,
      },
    ])

    await act(async () => {
      await chat.reconcileHistory()
    })

    expect(chat.messages.value.find((message) => message.id === 'asst-live')?.content).toBe(
      'partial, and then everything the turn went on to say',
    )
  })

  it('does not wipe the turn when the stream drops before the server has persisted it', async () => {
    const { provider, startMessage, emitText, drop } = createMockProvider()
    // A history read taken while the turn is still running returns the PRE-turn
    // transcript.
    provider.loadHistory.mockResolvedValue([
      { id: 'srv-old', role: 'user', content: 'deploy it', timestamp: 1 },
    ])

    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('deploy it')
    })
    await act(async () => {
      startMessage(0, 'asst-inflight', 2_000)
      emitText(0, 'Deploying now…')
      // The socket dies with no done/error event.
      drop(0)
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(false))

    const contents = chat.messages.value.map((message) => message.content)
    expect(contents).toContain('Deploying now…')
  })
})

describe('convergeHistory', () => {
  /**
   * A minimal message for the converge unit tests.
   *
   * @param id - The message id.
   * @param content - The message content.
   * @param toolCalls - Optional tool calls to attach.
   * @returns The message.
   */
  function message(
    id: string,
    content: string,
    toolCalls?: { id: string; name: string; output?: unknown }[],
  ): ChatMessage {
    return {
      id,
      role: 'assistant',
      content,
      timestamp: 1,
      ...(toolCalls
        ? {
            toolCalls: toolCalls.map((toolCall) => ({
              id: toolCall.id,
              name: toolCall.name,
              input: {},
              status: 'done' as const,
              ...(toolCall.output === undefined ? {} : { output: toolCall.output }),
            })),
          }
        : {}),
    }
  }

  it('returns the same object references when nothing moved, so a poll cannot churn', () => {
    const prev = [message('a', 'hello'), message('b', 'world')]
    const history = [message('a', 'hello'), message('b', 'world')]
    const next = convergeHistory(prev, history)
    expect(next[0]).toBe(prev[0])
    expect(next[1]).toBe(prev[1])
  })

  it('does not count a call still awaiting the user as a finished one', () => {
    const answered = message('a', '', [{ id: 't', name: 'ask_user', output: 'my answer' }])
    const awaiting = message('a', '', [
      { id: 't', name: 'ask_user', output: { status: 'awaiting_response' } },
    ])
    expect(convergeHistory([answered], [awaiting])[0]).toBe(answered)
  })

  it('does not count a call still blocked by a hook as a finished one', () => {
    const approved = message('a', '', [{ id: 't', name: 'exec_command', output: 'ok' }])
    const blocked = message('a', '', [
      { id: 't', name: 'exec_command', output: { status: 'blocked_by_hook' } },
    ])
    expect(convergeHistory([approved], [blocked])[0]).toBe(approved)
  })

  it('takes the server copy once it carries more', () => {
    const local = message('a', 'partial')
    const server = message('a', 'partial and the rest of it')
    expect(convergeHistory([local], [server])[0]).toBe(server)
  })

  it('keeps a turn the server has not persisted yet, after the rows it has', () => {
    const prev = [message('srv-1', 'earlier'), message('live-1', 'streaming now')]
    const history = [message('srv-1', 'earlier')]
    expect(convergeHistory(prev, history).map((entry) => entry.id)).toEqual(['srv-1', 'live-1'])
  })

  it('adds rows only the server has, in the server order', () => {
    const prev = [message('srv-1', 'earlier')]
    const history = [message('srv-1', 'earlier'), message('srv-2', "a teammate's note")]
    expect(convergeHistory(prev, history).map((entry) => entry.id)).toEqual(['srv-1', 'srv-2'])
  })
})

describe('useChat — attaching to a live turn (the `attached` frame)', () => {
  it('adopts the message the server is inside and appends the deltas that follow to it', async () => {
    const { provider, deferreds, emit, emitText, complete } = createMockProvider()
    provider.loadHistory.mockResolvedValue([
      { id: 'u1', role: 'user', content: 'go', timestamp: 1000 },
      { id: 'a1', role: 'assistant', content: 'persisted prefix', timestamp: 1001 },
    ])
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: true,
    })
    await waitFor(() =>
      expect(chat.messages.value.find((message) => message.id === 'a1')).toBeDefined(),
    )

    await act(async () => {
      void chat.sendMessage('continue')
    })
    await waitFor(() => expect(deferreds).toHaveLength(1))
    provider.loadHistory.mockClear()

    await act(async () => {
      emit(0, { type: 'attached', messageId: 'a1', timestamp: 1001 })
      emitText(0, ' and the live rest')
    })
    await waitFor(() => {
      const attached = chat.messages.value.find((message) => message.id === 'a1')
      expect(attached?.content).toBe('persisted prefix and the live rest')
      expect(attached?.isStreaming).toBe(true)
    })
    // The attach converged on the server transcript (one read), no new message
    // was opened for the deltas.
    expect(provider.loadHistory).toHaveBeenCalledTimes(1)
    expect(chat.messages.value.filter((message) => message.role === 'assistant')).toHaveLength(1)

    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(false))
    expect(chat.messages.value.find((message) => message.id === 'a1')?.isStreaming).toBe(false)
  })

  it('opens the named message fresh when the store has no copy, then folds in the persisted prefix', async () => {
    const { provider, deferreds, emit, emitText, complete } = createMockProvider()
    provider.loadHistory.mockResolvedValue([
      { id: 'u1', role: 'user', content: 'go', timestamp: 1000 },
      {
        id: 'a2',
        role: 'assistant',
        content: 'the prefix streamed before the attach',
        timestamp: 1002,
      },
    ])
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })
    await act(async () => {
      void chat.sendMessage('go')
    })
    await waitFor(() => expect(deferreds).toHaveLength(1))

    await act(async () => {
      emit(0, { type: 'attached', messageId: 'a2', timestamp: 1002 })
    })
    await waitFor(() =>
      expect(chat.messages.value.find((message) => message.id === 'a2')?.content).toBe(
        'the prefix streamed before the attach',
      ),
    )
    await act(async () => {
      emitText(0, ' + live tail')
    })
    await waitFor(() =>
      expect(chat.messages.value.find((message) => message.id === 'a2')?.content).toBe(
        'the prefix streamed before the attach + live tail',
      ),
    )
    await act(async () => {
      complete(0)
    })
    await waitFor(() => expect(chat.isLoading.value).toBe(false))
  })

  it('converges on the server transcript again at the terminal, so nothing streamed before the attach is lost', async () => {
    const { provider, deferreds, emit, complete } = createMockProvider()
    provider.loadHistory.mockResolvedValue([
      { id: 'u1', role: 'user', content: 'go', timestamp: 1000 },
    ])
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })
    await act(async () => {
      void chat.sendMessage('go')
    })
    await waitFor(() => expect(deferreds).toHaveLength(1))

    await act(async () => {
      emit(0, { type: 'attached' }) // between messages — nothing to adopt
    })
    await waitFor(() => expect(provider.loadHistory).toHaveBeenCalledTimes(1))
    // By the time the turn ends the server has persisted a whole message this
    // stream never received a frame of.
    provider.loadHistory.mockResolvedValue([
      { id: 'u1', role: 'user', content: 'go', timestamp: 1000 },
      { id: 'a9', role: 'assistant', content: 'streamed while we were away', timestamp: 1009 },
    ])
    await act(async () => {
      complete(0)
    })
    await waitFor(() =>
      expect(chat.messages.value.find((message) => message.id === 'a9')?.content).toBe(
        'streamed while we were away',
      ),
    )
    expect(provider.loadHistory).toHaveBeenCalledTimes(2)
  })

  it('a resume sends as soon as the server answers, even while it reports the turn still live', async () => {
    sessionStorage.setItem(`mol-chat-streaming-${PROJECT_ID}`, '1')
    const { provider, deferreds } = createMockProvider()
    let polls = 0
    provider.loadHistory.mockImplementation(async () => {
      polls++
      provider.isServerStreaming = true
      return [
        { id: 'h1', role: 'user', content: 'old msg', timestamp: 1000 },
        { id: 'h2', role: 'assistant', content: 'partial...', timestamp: 1001 },
      ]
    })

    renderChat(provider, { endpoint: ENDPOINT, projectId: PROJECT_ID, loadOnMount: true })
    await waitFor(() => expect(deferreds).toHaveLength(1), 6_000)
    expect(deferreds[0].message).toBe('')
    expect(polls).toBeLessThanOrEqual(3)
  })
})

// ── A turn the server resumes ─────────────────────────────────────────────

describe('useChat — resumed turns', () => {
  it('applies a tool_result that arrives before any message_start to the message holding the call', async () => {
    const { provider, emit, complete, startMessage, emitText } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('build it')
    })
    await act(async () => {
      startMessage(0, 'a1')
      emit(0, { type: 'tool_use', id: 'tc-1', name: 'write_file', input: { path: 'a.ts' } })
      complete(0)
    })
    const running = chat.messages.value.find((message) => message.id === 'a1')
    expect(running?.toolCalls?.[0].status).toBe('running')

    await act(async () => {
      void chat.sendMessage('go on')
    })
    const interrupted = { status: 'interrupted_by_restart', message: 'unknown effect' }
    await act(async () => {
      // The restarted turn settles the previous message's call first.
      emit(1, { type: 'tool_result', id: 'tc-1', output: interrupted })
      startMessage(1, 'a2')
      emitText(1, 'checking the file')
      complete(1)
    })

    await waitFor(() => {
      const holder = chat.messages.value.find((message) => message.id === 'a1')
      expect(holder?.toolCalls?.[0].status).toBe('done')
      expect(holder?.toolCalls?.[0].output).toEqual(interrupted)
    })
  })

  it('attaches a repeated call id to the newest pending call, leaving an older finished call untouched', async () => {
    const { provider, emit, complete, startMessage } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('one')
    })
    await act(async () => {
      startMessage(0, 'a1')
      emit(0, { type: 'tool_use', id: 'call_1', name: 'read_file', input: {} })
      emit(0, { type: 'tool_result', id: 'call_1', output: { success: true, old: true } })
      complete(0)
    })
    await act(async () => {
      void chat.sendMessage('two')
    })
    await act(async () => {
      startMessage(1, 'a2')
      emit(1, { type: 'tool_use', id: 'call_1', name: 'write_file', input: {} })
      complete(1)
    })
    await act(async () => {
      void chat.sendMessage('three')
    })
    const fresh = { success: true, fresh: true }
    await act(async () => {
      emit(2, { type: 'tool_result', id: 'call_1', output: fresh })
      startMessage(2, 'a3')
      complete(2)
    })

    await waitFor(() => {
      const newer = chat.messages.value.find((message) => message.id === 'a2')
      expect(newer?.toolCalls?.[0].output).toEqual(fresh)
    })
    const older = chat.messages.value.find((message) => message.id === 'a1')
    expect(older?.toolCalls?.[0].output).toEqual({ success: true, old: true })
  })

  it('a status line does not end the turn, and clears once the resumed reply starts', async () => {
    const { provider, emit, complete, startMessage, emitText } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('build it')
    })
    await act(async () => {
      startMessage(0, 'a1')
      emitText(0, 'partial')
      emit(0, {
        type: 'status',
        label: 'The AI provider dropped the reply, so Synthase is resuming it…',
      })
    })
    await waitFor(() => {
      expect(chat.streamingStatus.value).toBe(
        'The AI provider dropped the reply, so Synthase is resuming it…',
      )
    })
    expect(chat.isLoading.value).toBe(true)
    expect(chat.error.value).toBeNull()

    await act(async () => {
      startMessage(0, 'a2')
      emitText(0, 'continuing')
    })
    await waitFor(() => {
      expect(chat.streamingStatus.value).toBeNull()
    }, 2_500)
    expect(chat.isLoading.value).toBe(true)

    await act(async () => {
      complete(0)
    })
    expect(chat.isLoading.value).toBe(false)
  })
})

// A stream nothing writes to any more must never freeze the chat.
describe('useChat — a silent own stream recovers instead of freezing the chat', () => {
  const SILENT_ENDPOINT = '/projects/p1/chat'
  const SILENT_PROJECT = 'p1'
  const history: ChatMessage[] = [
    { id: 'h1', role: 'user', content: 'go', timestamp: 1000 },
    { id: 'h2', role: 'assistant', content: 'partial', timestamp: 1001 },
  ]

  /**
   * Calls to sendMessage that asked to resume.
   *
   * @param provider - The mock provider.
   * @returns The configs of the resume sends.
   */
  function resumeCalls(provider: MockProvider): ChatConfig[] {
    return provider.sendMessage.mock.calls
      .map((call) => call[1])
      .filter((config) => config.resume === true)
  }

  it('aborts a silent RESUME stream after the stall window and resumes again', async () => {
    const { provider, deferreds, emit, completeWithError } = createMockProvider()
    provider.isServerStreaming = true
    provider.loadHistory.mockResolvedValue(history)
    const { chat } = renderChat(provider, {
      endpoint: SILENT_ENDPOINT,
      projectId: SILENT_PROJECT,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('go')
    })
    await act(async () => {
      emit(0, { type: 'conversation', id: 'conv-1' })
      completeWithError(0, 'Service Unavailable', 503)
    })
    // Countdown (5 s) → resume → one history read (1 s) → the resume request.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000)
    })
    expect(resumeCalls(provider)).toHaveLength(1)
    const resumeIndex = deferreds.length - 1
    // It attached to the live turn, then nothing was ever written to it again.
    await act(async () => {
      emit(resumeIndex, { type: 'attached' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(179_000)
    })
    expect(provider.abort).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })
    expect(provider.abort).toHaveBeenCalledTimes(1)
    // The no-terminal path reloaded history, saw the turn still running, and resumed.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500)
    })
    expect(resumeCalls(provider)).toHaveLength(2)
  })

  it('aborts its own stream when it is silent while pushed frames of the turn keep arriving', async () => {
    const { provider, emit, startMessage, emitText } = createMockProvider()
    provider.isServerStreaming = true
    provider.loadHistory.mockResolvedValue(history)
    const { chat } = renderChat(provider, {
      endpoint: SILENT_ENDPOINT,
      projectId: SILENT_PROJECT,
      loadOnMount: false,
    })

    await act(async () => {
      void chat.sendMessage('go')
    })
    await act(async () => {
      emit(0, { type: 'conversation', id: 'conv-1' })
      startMessage(0, 'own-1')
      emitText(0, 'working')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(21_000)
    })
    // Well inside the 180 s watchdog: only the pushed frame can reveal the deaf stream.
    expect(provider.abort).not.toHaveBeenCalled()
    await act(async () => {
      chat.applyRemoteEvent({ type: 'text', content: ' still working' })
    })
    expect(provider.abort).toHaveBeenCalledTimes(1)
    // A second pushed frame before the recovery lands does not abort again.
    await act(async () => {
      chat.applyRemoteEvent({ type: 'text', content: ' and more' })
    })
    expect(provider.abort).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500)
    })
    expect(resumeCalls(provider)).toHaveLength(1)
  })

  it('leaves a healthy stream alone: its own frames keep arriving with the echo', async () => {
    const { provider, emit, startMessage, emitText } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: SILENT_ENDPOINT,
      projectId: SILENT_PROJECT,
      loadOnMount: false,
    })
    await act(async () => {
      void chat.sendMessage('go')
    })
    await act(async () => {
      emit(0, { type: 'conversation', id: 'conv-1' })
      startMessage(0, 'own-1')
    })
    for (let index = 0; index < 6; index++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000)
        emitText(0, `chunk ${index} `)
        chat.applyRemoteEvent({ type: 'text', content: `chunk ${index} ` })
      })
    }
    expect(provider.abort).not.toHaveBeenCalled()
  })

  it('never aborts a send whose stream has delivered nothing yet (it may be waiting behind another turn)', async () => {
    const { provider } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: SILENT_ENDPOINT,
      projectId: SILENT_PROJECT,
      loadOnMount: false,
    })
    await act(async () => {
      void chat.sendMessage('go')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    // A teammate's turn on the same conversation streams over the push channel.
    await act(async () => {
      chat.applyRemoteEvent({ type: 'text', content: 'their turn' })
    })
    expect(provider.abort).not.toHaveBeenCalled()
  })

  it('does not judge a stream on a hidden page (its timers are throttled)', async () => {
    const { provider, emit } = createMockProvider()
    const { chat } = renderChat(provider, {
      endpoint: SILENT_ENDPOINT,
      projectId: SILENT_PROJECT,
      loadOnMount: false,
    })
    await act(async () => {
      void chat.sendMessage('go')
    })
    await act(async () => {
      emit(0, { type: 'conversation', id: 'conv-1' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    try {
      await act(async () => {
        chat.applyRemoteEvent({ type: 'text', content: 'pushed' })
      })
      expect(provider.abort).not.toHaveBeenCalled()
    } finally {
      Reflect.deleteProperty(document, 'visibilityState')
      expect(document.visibilityState).toBe('visible')
    }
  })
})
