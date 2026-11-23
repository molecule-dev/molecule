// @vitest-environment jsdom

/**
 * The chat contract React's `useChat.test.tsx` pins, run against the Angular
 * function. Every title is the React test's; only the framework-forced
 * mechanics change: a mounted probe component replaces `renderHook`, the chat
 * state is read through signals, and the send/queue promises are driven with
 * explicit microtask/timer flushes instead of `act`.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  provideZonelessChangeDetection,
  signal,
  type Type,
  type WritableSignal,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest'

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
  type UseChatResult,
} from '../chat.js'
import { provideMolecule } from '../providers.js'

// ── Mock provider factory ─────────────────────────────────────────────────

/** One controlled `sendMessage` call. */
interface Deferred {
  resolve: () => void
  onEvent: ChatEventHandler
  message: string
  settled: boolean
}

/**
 * The mock provider: the contract plus the fields the shared session reads off
 * a provider after a history load (streaming flag, metadata) and the mocks the
 * assertions inspect.
 */
interface MockProvider extends ChatProvider {
  sendMessage: Mock<ChatProvider['sendMessage']>
  abort: Mock<ChatProvider['abort']>
  clearHistory: Mock<ChatProvider['clearHistory']>
  loadHistory: Mock<ChatProvider['loadHistory']>
  sendSideMessage?: Mock<NonNullable<ChatProvider['sendSideMessage']>>
  abortOnServer?: Mock<
    (config: ChatConfig, cid?: string, opts?: { userInitiated?: boolean }) => void
  >
  /** Whether the server reports a stream still running (the resume poll). */
  isServerStreaming?: boolean
  /** Fields the shared session reads off the provider after a history load. */
  lastMeta?: Record<string, unknown>
}

/**
 * Creates a mock ChatProvider whose `sendMessage` returns a promise the test
 * controls. `complete(i)` emits a `done` event and resolves the i-th call;
 * `completeWithError(i, message, status?)` emits an `error` event instead.
 *
 * @returns The mock provider, the deferred list, and helpers to control responses.
 */
function createMockProvider(): {
  provider: MockProvider
  deferreds: Deferred[]
  complete: (index: number) => void
  completeWithError: (index: number, message: string, status?: number) => void
  emitText: (index: number, content: string) => void
  emit: (index: number, event: ChatStreamEvent) => void
  startMessage: (index: number, id?: string, timestamp?: number) => void
  drop: (index: number) => void
} {
  const deferreds: Deferred[] = []

  const provider: MockProvider = {
    name: 'mock',
    sendMessage: vi.fn<ChatProvider['sendMessage']>(
      async (message: string, _config, onEvent: ChatEventHandler) =>
        new Promise<void>((resolve) => {
          deferreds.push({ resolve, onEvent, message, settled: false })
        }),
    ),
    abort: vi.fn<ChatProvider['abort']>(() => {
      // Resolve all pending promises so the await in the send loop unblocks.
      for (const d of deferreds) {
        if (!d.settled) {
          d.settled = true
          d.resolve()
        }
      }
    }),
    clearHistory: vi.fn<ChatProvider['clearHistory']>(async () => {}),
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
    complete(index: number) {
      const d = deferreds[index]
      d.onEvent({ type: 'done' })
      d.settled = true
      d.resolve()
    },
    /**
     * Emit an `error` event and resolve the i-th sendMessage call.
     *
     * @param index - The zero-based index of the sendMessage call.
     * @param message - The error message to include in the error event.
     * @param status - Optional HTTP status (e.g. 503 to exercise 5XX retry).
     */
    completeWithError(index: number, message: string, status?: number) {
      const d = deferreds[index]
      d.onEvent({ type: 'error', message, ...(status != null ? { status } : {}) })
      d.settled = true
      d.resolve()
    },
    /**
     * Emit a `text` event on the i-th call.
     *
     * @param index - The zero-based index of the sendMessage call.
     * @param content - The text content to emit.
     */
    emitText(index: number, content: string) {
      deferreds[index].onEvent({ type: 'text', content })
    },
    /**
     * Emit an arbitrary event on the i-th call.
     *
     * @param index - The zero-based index of the sendMessage call.
     * @param event - The chat stream event to emit.
     */
    emit(index: number, event: ChatStreamEvent) {
      deferreds[index].onEvent(event)
    },
    /**
     * Open a new assistant message on the i-th stream.
     *
     * @param index - The zero-based index of the sendMessage call.
     * @param id - The message id (defaults to `asst-<index>`).
     * @param timestamp - The server timestamp in ms (defaults to a fixed value).
     */
    startMessage(index: number, id = `asst-${index}`, timestamp = 1_000) {
      deferreds[index].onEvent({ type: 'message_start', id, timestamp })
    },
    /**
     * Close the i-th stream WITHOUT a terminal event (a dead socket).
     *
     * @param index - The zero-based index of the sendMessage call to drop.
     */
    drop(index: number) {
      const d = deferreds[index]
      d.settled = true
      d.resolve()
    },
  }
}

// ── Mounting ──────────────────────────────────────────────────────────────

/** The instance shape every probe component exposes. */
interface ChatProbe {
  readonly chat: UseChatResult
}

/** A probe whose chat options are a signal, so the endpoint can change. */
interface SignalChatProbe extends ChatProbe {
  readonly endpoint: WritableSignal<string>
}

/**
 * Builds a probe component that calls `useChat` with fixed options.
 *
 * @param options - The chat options the probe passes once, at creation.
 * @returns The probe component class.
 */
function makeProbe(options: UseChatOptions): Type<ChatProbe> {
  @Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'app-test-usechat-probe',
    template: '',
  })
  class UseChatProbe implements ChatProbe {
    readonly chat = useChat(options)
  }
  return UseChatProbe
}

/**
 * Builds a probe component whose endpoint is a signal.
 *
 * @param endpoint - The initial endpoint.
 * @param projectId - The project id.
 * @returns The probe component class.
 */
function makeSignalProbe(endpoint: string, projectId: string): Type<SignalChatProbe> {
  @Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'app-test-usechat-signal-probe',
    template: '',
  })
  class UseChatSignalProbe implements SignalChatProbe {
    readonly endpoint = signal(endpoint)
    readonly chat = useChat(
      computed(() => ({
        endpoint: this.endpoint(),
        projectId,
        loadOnMount: false,
      })),
    )
  }
  return UseChatSignalProbe
}

/**
 * Configures the TestBed with one probe plus the molecule providers and mounts
 * it, running one change detection pass.
 *
 * @param component - The probe component class.
 * @param provider - The chat provider to inject.
 * @returns The mounted fixture.
 */
function mount<P extends ChatProbe>(
  component: Type<P>,
  provider: ChatProvider,
): ComponentFixture<P> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection(), provideMolecule({ chat: provider })],
  })
  const fixture = TestBed.createComponent(component)
  fixture.detectChanges()
  return fixture
}

/**
 * Mounts `useChat` against `provider`.
 *
 * @param provider - The chat provider to inject.
 * @param options - The chat options.
 * @returns The mounted fixture and its chat result.
 */
function mountChat(
  provider: ChatProvider,
  options: UseChatOptions,
): { fixture: ComponentFixture<ChatProbe>; chat: UseChatResult } {
  const fixture = mount(makeProbe(options), provider)
  return { fixture, chat: fixture.componentInstance.chat }
}

/**
 * Flushes queued microtasks and zero-delay timers (fake timers are active).
 *
 * @returns A promise that settles after the flush.
 */
async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0)
}

/**
 * Advances past the 50 ms streaming-flush window.
 *
 * @returns A promise that settles after the flush.
 */
async function flushStream(): Promise<void> {
  await vi.advanceTimersByTimeAsync(60)
}

const PROJECT_ID = 'test-project'
const ENDPOINT = '/api/chat'

/** The default options most tests mount with. */
const baseOptions: UseChatOptions = {
  endpoint: ENDPOINT,
  projectId: PROJECT_ID,
  loadOnMount: false,
}

// ── Tests ─────────────────────────────────────────────────────────────────

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

beforeEach(() => {
  vi.useFakeTimers()
  sessionStorage.clear()
  // The conversation message store is module-level (outlives mounts), so it
  // leaks across test cases unless reset — same rationale as clearing sessionStorage.
  resetChatStoresForTests()
})

afterEach(() => {
  TestBed.resetTestingModule()
  vi.clearAllTimers()
  vi.useRealTimers()
  sessionStorage.clear()
  resetChatStoresForTests()
})

describe('useChat', () => {
  // ── Basic send ────────────────────────────────────────────────────────

  it('sends a message and creates user + assistant messages', async () => {
    const { provider, deferreds, complete, startMessage, emitText } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('Hello')
    await flush()

    // No upfront placeholder — the assistant message appears only on the server's
    // message_start. After send there is just the user message.
    expect(chat.messages()).toHaveLength(1)
    expect(chat.messages()[0].role).toBe('user')
    expect(chat.messages()[0].content).toBe('Hello')
    expect(chat.isLoading()).toBe(true)
    expect(deferreds).toHaveLength(1)
    expect(deferreds[0].message).toBe('Hello')

    // message_start opens the streaming assistant message; content keeps it from
    // being dropped as an empty turn.
    startMessage(0)
    emitText(0, 'hi')
    await flushStream()
    expect(chat.messages()).toHaveLength(2)
    expect(chat.messages()[1].role).toBe('assistant')
    expect(chat.messages()[1].isStreaming).toBe(true)

    complete(0)
    await flush()

    expect(chat.isLoading()).toBe(false)
    expect(chat.messages()[1].isStreaming).toBe(false)
  })

  it('appends a `card` event as a role:system card-message in the ONE store (de-duped by id)', async () => {
    const { provider, emit, complete, startMessage, emitText } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('build it')
    await flush()
    // A model-switch card arrives mid-stream; it does NOT belong to the
    // streaming assistant message.
    startMessage(0)
    emitText(0, 'working')
    emit(0, {
      type: 'card',
      id: 'card-model-1',
      timestamp: 999,
      card: { kind: 'model', model: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
    })
    await flushStream()

    const card = chat.messages().find((m) => m.id === 'card-model-1')
    expect(card).toBeDefined()
    expect(card?.role).toBe('system')
    expect(card?.cardEvent).toEqual({
      kind: 'model',
      model: 'deepseek-v4-flash',
      label: 'DeepSeek V4 Flash',
    })
    expect(card?.timestamp).toBe(999)

    // The same card id arriving again (own broadcast echo) must NOT double-add.
    emit(0, {
      type: 'card',
      id: 'card-model-1',
      timestamp: 999,
      card: { kind: 'model', model: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
    })
    complete(0)
    await flush()
    expect(chat.messages().filter((m) => m.id === 'card-model-1')).toHaveLength(1)
    // The card-message is distinct from the streaming assistant message.
    expect(chat.messages().find((m) => m.role === 'assistant')?.content).toBe('working')
  })

  it('carries a render-check advisory into the live verification block', async () => {
    const { provider, emit, complete, startMessage } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('build it')
    await flush()
    startMessage(0)
    emit(0, {
      type: 'verification_result',
      status: 'ok',
      workspaces: ['app'],
      renderCheckUnavailable: true,
    })
    await flushStream()

    expect(chat.messages().find((message) => message.role === 'assistant')?.blocks).toEqual([
      {
        type: 'verification',
        status: 'ok',
        workspaces: ['app'],
        renderCheckUnavailable: true,
      },
    ])
    complete(0)
    await flush()
  })

  it('accumulates text events into assistant content', async () => {
    const { provider, emitText, complete, startMessage } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('Hi')
    await flush()

    startMessage(0)
    emitText(0, 'Hello ')
    emitText(0, 'world')
    // Text events are throttle-flushed every 50ms — wait for the update.
    await flushStream()
    const assistant = chat.messages().find((m) => m.role === 'assistant')
    expect(assistant?.content).toBe('Hello world')

    complete(0)
    await flush()
  })

  it('handles error events', async () => {
    const { provider, completeWithError, startMessage, emitText } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('Hi')
    await flush()

    // Open a streaming assistant message + partial content, then the stream errors.
    startMessage(0)
    emitText(0, 'partial')
    await flushStream()
    completeWithError(0, 'Server error')
    await flush()

    expect(chat.isLoading()).toBe(false)
    expect(chat.error()).toBe('Server error')
    expect(chat.messages()[1].isStreaming).toBe(false)
  })

  // ── Queuing ───────────────────────────────────────────────────────────

  it('queues messages sent while streaming and drains them in order', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    // Send A → starts streaming
    void chat.sendMessage('A')
    await flush()
    expect(deferreds).toHaveLength(1)

    // Send B and C while A is streaming → queued
    void chat.sendMessage('B')
    await flush()
    void chat.sendMessage('C')
    await flush()
    expect(deferreds).toHaveLength(1) // Still only one provider call

    // All user messages should be visible immediately
    const userMsgs = chat.messages().filter((m) => m.role === 'user')
    expect(userMsgs).toHaveLength(3)
    expect(userMsgs.map((m) => m.content)).toEqual(['A', 'B', 'C'])
    // A is not queued (sent directly), B and C are queued
    expect(userMsgs[0].queued).toBeFalsy()
    expect(userMsgs[1].queued).toBe(true)
    expect(userMsgs[2].queued).toBe(true)
    expect(chat.isLoading()).toBe(true)

    // Complete A → B is sent
    complete(0)
    await flush()
    expect(deferreds).toHaveLength(2)
    expect(deferreds[1].message).toBe('B')
    expect(chat.isLoading()).toBe(true)

    // Complete B → C is sent
    complete(1)
    await flush()
    expect(deferreds).toHaveLength(3)
    expect(deferreds[2].message).toBe('C')
    expect(chat.isLoading()).toBe(true)

    // Complete C → queue drained, loading finishes
    complete(2)
    await flush()
    expect(chat.isLoading()).toBe(false)
  })

  it('creates an assistant message per turn as each queued message is sent', async () => {
    const { provider, deferreds, complete, startMessage, emitText } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('A')
    await flush()
    void chat.sendMessage('B')
    await flush()

    // No upfront placeholders — A's assistant message appears on ITS message_start.
    let assistants = chat.messages().filter((m) => m.role === 'assistant')
    expect(assistants).toHaveLength(0)
    startMessage(0)
    emitText(0, 'a')
    await flushStream()
    assistants = chat.messages().filter((m) => m.role === 'assistant')
    expect(assistants).toHaveLength(1)

    // Complete A → B is sent; B's assistant message appears on its own message_start.
    complete(0)
    await flush()
    expect(deferreds).toHaveLength(2)
    startMessage(1)
    emitText(1, 'b')
    await flushStream()
    assistants = chat.messages().filter((m) => m.role === 'assistant')
    expect(assistants).toHaveLength(2)
    expect(assistants[1].isStreaming).toBe(true)

    complete(1)
    await flush()
  })

  it('clears the queued flag when a queued message starts being sent', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('A')
    await flush()
    void chat.sendMessage('B')
    await flush()

    // B should be queued
    const bMsg = chat.messages().find((m) => m.content === 'B')
    expect(bMsg?.queued).toBe(true)

    // Complete A → B starts being processed, queued flag should clear
    complete(0)
    await flush()
    expect(deferreds).toHaveLength(2)

    const bMsgAfter = chat.messages().find((m) => m.content === 'B')
    expect(bMsgAfter).toBeDefined()
    expect(bMsgAfter!.queued).toBeFalsy()

    complete(1)
    await flush()
  })

  it('continues processing queue after an error on the current message', async () => {
    const { provider, deferreds, completeWithError, complete } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('A')
    await flush()
    void chat.sendMessage('B')
    await flush()

    // A errors
    completeWithError(0, 'Server error')
    await flush()

    // B should be sent next, error cleared
    expect(deferreds).toHaveLength(2)
    expect(deferreds[1].message).toBe('B')
    expect(chat.error()).toBeNull()

    // Complete B normally
    complete(1)
    await flush()
    expect(chat.isLoading()).toBe(false)
    expect(chat.error()).toBeNull()
  })

  it('continues processing queue after provider.sendMessage throws', async () => {
    const { provider, deferreds, complete } = createMockProvider()

    // Override sendMessage to throw on the first call
    let callCount = 0
    provider.sendMessage.mockImplementation(
      async (message: string, _config, onEvent: ChatEventHandler) => {
        callCount++
        if (callCount === 1) {
          throw new Error('Network failure')
        }
        return new Promise<void>((resolve) => {
          deferreds.push({ resolve, onEvent, message, settled: false })
        })
      },
    )

    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('A')
    await flush()
    void chat.sendMessage('B')
    await flush()

    // A threw, B should be sent next
    expect(deferreds).toHaveLength(1)
    expect(deferreds[0].message).toBe('B')

    complete(0)
    await flush()
    expect(chat.isLoading()).toBe(false)
  })

  // ── Abort ─────────────────────────────────────────────────────────────

  it('abort clears the queue, stops loading, and cleans sessionStorage', async () => {
    const { provider } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('A')
    await flush()
    void chat.sendMessage('B')
    await flush()
    void chat.sendMessage('C')
    await flush()

    chat.abort()
    await flush()

    expect(chat.isLoading()).toBe(false)
    expect(provider.abort).toHaveBeenCalled()
    expect(sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)).toBeNull()
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBeNull()

    // Streaming messages should be marked as aborted
    const streamingMsgs = chat.messages().filter((m) => m.role === 'assistant')
    for (const m of streamingMsgs) {
      expect(m.isStreaming).toBe(false)
      expect(m.aborted).toBe(true)
    }
  })

  // ── Auto-sent / suppressed message flags (C2 + C3) ─────────────────────

  it('forwards the automatic flag to the server config and flags the optimistic message (C2)', async () => {
    const { provider, complete } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('Fix these issues', undefined, { automatic: true })
    await flush()

    // The optimistic user bubble is flagged so it renders in the auto-sent style.
    const userMsg = chat.messages().find((m) => m.role === 'user')
    expect(userMsg?.automatic).toBe(true)

    // The flag reaches the provider via the per-send config.
    const cfg = provider.sendMessage.mock.calls[0][1]
    expect(cfg.automatic).toBe(true)

    complete(0)
    await flush()
  })

  it('forwards suppressUserMessage to the server config and appends no optimistic bubble (C3)', async () => {
    const { provider, complete } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('internal driver', undefined, { suppressUserMessage: true })
    await flush()

    // No optimistic user bubble for a suppressed send.
    expect(chat.messages().filter((m) => m.role === 'user')).toHaveLength(0)

    // The flag must reach the server.
    const cfg = provider.sendMessage.mock.calls[0][1]
    expect(cfg.suppressUserMessage).toBe(true)

    complete(0)
    await flush()
  })

  // ── Server mode is authoritative on every history load (G33) ───────────

  it('applies the server mode on reconcile, including execute, so a tab that missed the plan→build flip heals', async () => {
    const { provider } = createMockProvider()
    provider.lastMeta = { mode: 'plan' }
    const onModeChange = vi.fn()
    const { chat } = mountChat(provider, { ...baseOptions, loadOnMount: true, onModeChange })
    await flush()

    expect(chat.mode()).toBe('plan')
    expect(onModeChange).toHaveBeenLastCalledWith('plan')

    // The live flip to execute never reached this tab; the next history load
    // carries the server's persisted mode.
    provider.lastMeta = { mode: 'execute' }
    await chat.reconcileHistory()
    expect(chat.mode()).toBe('execute')
    expect(onModeChange).toHaveBeenLastCalledWith('execute')

    // Idempotent: a matching mode fires nothing.
    onModeChange.mockClear()
    await chat.reconcileHistory()
    expect(onModeChange).not.toHaveBeenCalled()
  })

  // ── Stop keeps streamed content (C4) ───────────────────────────────────

  it('keeps streamed content on user abort and does NOT overwrite it with reloaded history (C4)', async () => {
    const { provider, emitText, startMessage } = createMockProvider()
    // A reload here would return STALE history lacking this in-flight turn.
    provider.loadHistory.mockResolvedValue([
      { id: 'old', role: 'user', content: 'previous turn', timestamp: 1 },
    ])

    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('go')
    await flush()
    startMessage(0)
    emitText(0, 'partial streamed answer')
    await flushStream()

    // User clicks Stop. The mock's abort() resolves the in-flight send promise,
    // so the send loop reaches the reconcile branch — which must be skipped.
    chat.abort()
    await flush()
    expect(chat.isLoading()).toBe(false)

    // The streamed content is preserved (including the last un-flushed delta),
    // flagged aborted.
    const assistant = chat.messages().find((m) => m.role === 'assistant')
    expect(assistant?.content).toContain('partial streamed answer')
    expect(assistant?.aborted).toBe(true)

    // The stale reloaded history did NOT replace the live, finalized messages.
    expect(chat.messages().some((m) => m.content === 'previous turn')).toBe(false)
  })

  // ── Clear history ─────────────────────────────────────────────────────

  it('clearHistory clears the queue, messages, and sessionStorage', async () => {
    const { provider } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('A')
    await flush()
    void chat.sendMessage('B')
    await flush()

    await chat.clearHistory()
    await flush()

    expect(chat.messages()).toHaveLength(0)
    expect(chat.error()).toBeNull()
    expect(provider.clearHistory).toHaveBeenCalled()
    expect(sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)).toBeNull()
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBeNull()
  })

  // ── sessionStorage persistence ────────────────────────────────────────

  it('persists queue to sessionStorage when messages are queued', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('A')
    await flush()

    void chat.sendMessage('B')
    await flush()
    void chat.sendMessage('C')
    await flush()

    const raw = sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)
    expect(raw).not.toBeNull()
    const queue = JSON.parse(raw ?? '[]') as { message: string }[]
    expect(queue).toHaveLength(2)
    expect(queue[0].message).toBe('B')
    expect(queue[1].message).toBe('C')

    // After draining, queue is cleared
    complete(0)
    await flush()
    expect(deferreds).toHaveLength(2)
    complete(1)
    await flush()
    expect(deferreds).toHaveLength(3)
    complete(2)
    await flush()
    expect(chat.isLoading()).toBe(false)

    expect(sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)).toBeNull()
  })

  it('sets streaming flag during send and clears on completion', async () => {
    const { provider, complete } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBeNull()

    void chat.sendMessage('A')
    await flush()
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBe('1')

    complete(0)
    await flush()
    expect(chat.isLoading()).toBe(false)
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBeNull()
  })

  it('preserves streaming flag when beforeunload fires (page refresh)', async () => {
    const { provider } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('A')
    await flush()
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBe('1')

    // Simulate page refresh: beforeunload fires, then the provider's fetch
    // abort causes the send loop to exit and run cleanup.
    window.dispatchEvent(new Event('beforeunload'))

    // Complete the stream (simulates the AbortError path resolving the promise).
    provider.abort()
    await flush()

    // The streaming flag should still be set — not cleared during unload.
    expect(sessionStorage.getItem(`mol-chat-streaming-${PROJECT_ID}`)).toBe('1')
  })

  // ── Resume on mount ───────────────────────────────────────────────────

  it('restores persisted queue on mount and sends messages (no interrupted stream)', async () => {
    // Queue exists but no streaming flag — just send queued messages directly.
    sessionStorage.setItem(
      `mol-chat-queue-${PROJECT_ID}`,
      JSON.stringify([{ message: 'queued-1' }, { message: 'queued-2' }]),
    )

    const { provider, deferreds, complete } = createMockProvider()
    provider.loadHistory.mockResolvedValue([
      { id: 'h1', role: 'user', content: 'old msg', timestamp: 1000 },
    ])

    mountChat(provider, { ...baseOptions, loadOnMount: true })

    // loadHistory fires, then the first queued message is sent via setTimeout.
    await flush()
    expect(deferreds).toHaveLength(1)
    expect(deferreds[0].message).toBe('queued-1')

    // Complete first → second queued message is sent.
    complete(0)
    await flush()
    expect(deferreds).toHaveLength(2)
    expect(deferreds[1].message).toBe('queued-2')

    complete(1)
    await flush()
  })

  it('waits for server to finish, then sends resume request for real streaming', async () => {
    sessionStorage.setItem(`mol-chat-streaming-${PROJECT_ID}`, '1')

    const { provider, deferreds, emitText, complete, startMessage } = createMockProvider()

    // Phase 1: server is still streaming (polling).
    provider.isServerStreaming = true
    let pollCount = 0
    provider.loadHistory.mockImplementation(async () => {
      pollCount++
      if (pollCount <= 2) {
        provider.isServerStreaming = true
      } else {
        provider.isServerStreaming = false
      }
      return [
        { id: 'h1', role: 'user', content: 'old msg', timestamp: 1000 },
        { id: 'h2', role: 'assistant', content: 'partial...', timestamp: 1001 },
      ]
    })

    const { chat } = mountChat(provider, { ...baseOptions, loadOnMount: true })
    await flush()

    // Spinner should show during polling.
    const h2 = chat.messages().find((m) => m.id === 'h2')
    expect(h2?.isStreaming).toBe(true)

    // Phase 2: after polling, a resume request is sent.
    for (let i = 0; i < 5 && deferreds.length === 0; i++) await vi.advanceTimersByTimeAsync(1100)
    expect(deferreds).toHaveLength(1)
    // Empty message = resume mode.
    expect(deferreds[0].message).toBe('')

    // The resumed (partial) message is left as-is; the server streams its
    // continuation as a NEW message, appended after the partial one.
    startMessage(0, 'h3')
    emitText(0, ' continued response')
    await flushStream()
    const h3 = chat.messages().find((m) => m.id === 'h3')
    expect(h3?.content).toBe(' continued response')
    // The partial message is unchanged, not appended to.
    expect(chat.messages().find((m) => m.id === 'h2')?.content).toBe('partial...')

    // No new user message was created.
    expect(chat.messages().filter((m) => m.role === 'user')).toHaveLength(1)

    complete(0)
    await flush()
    expect(chat.isLoading()).toBe(false)
  })

  it('does not auto-continue when streaming flag is set but history is empty', async () => {
    sessionStorage.setItem(`mol-chat-streaming-${PROJECT_ID}`, '1')

    const { provider, deferreds } = createMockProvider()
    provider.loadHistory.mockResolvedValue([])

    mountChat(provider, { ...baseOptions, loadOnMount: true })

    // Wait for history load + potential setTimeout — no sendMessage should fire.
    await vi.advanceTimersByTimeAsync(50)
    expect(deferreds).toHaveLength(0)
  })

  it('does not restore queue when loadOnMount is false', async () => {
    sessionStorage.setItem(`mol-chat-queue-${PROJECT_ID}`, JSON.stringify([{ message: 'queued' }]))
    sessionStorage.setItem(`mol-chat-streaming-${PROJECT_ID}`, '1')

    const { provider, deferreds } = createMockProvider()

    mountChat(provider, { ...baseOptions, loadOnMount: false })

    await vi.advanceTimersByTimeAsync(50)
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
    provider.isServerStreaming = false // Server already done
    provider.loadHistory.mockImplementation(async () => {
      provider.isServerStreaming = false
      return [
        { id: 'h1', role: 'user', content: 'old', timestamp: 1000 },
        { id: 'h2', role: 'assistant', content: 'final', timestamp: 1001 },
      ]
    })

    mountChat(provider, { ...baseOptions, loadOnMount: true })

    // First call is the resume request (empty message).
    for (let i = 0; i < 5 && deferreds.length === 0; i++) await vi.advanceTimersByTimeAsync(1100)
    expect(deferreds).toHaveLength(1)
    expect(deferreds[0].message).toBe('')

    // Complete resume → queued message sent next.
    complete(0)
    await flush()
    expect(deferreds).toHaveLength(2)
    expect(deferreds[1].message).toBe('my queued msg')

    complete(1)
    await flush()
  })

  // ── projectId fallback ────────────────────────────────────────────────

  it('uses "default" storage key when projectId is undefined', async () => {
    const { provider } = createMockProvider()
    const { chat } = mountChat(provider, { endpoint: ENDPOINT, loadOnMount: false })

    void chat.sendMessage('A')
    await flush()
    void chat.sendMessage('B')
    await flush()

    expect(sessionStorage.getItem('mol-chat-queue-default')).not.toBeNull()
    expect(sessionStorage.getItem('mol-chat-streaming-default')).toBe('1')
  })

  // ── Conversation switching ────────────────────────────────────────────

  it('a switched-away conversation’s still-running stream stops writing into the store', async () => {
    // Regression: the store is project-keyed and outlives remounts — but
    // clicking "new chat" while a stream was running let the OLD conversation
    // keep streaming into the NEW one. A genuine switch bumps the store
    // generation; the old stream's late events must all be dropped.
    const { provider, emitText, startMessage, complete } = createMockProvider()

    // Conversation A: mount, send, stream begins.
    const probe = makeSignalProbe(`${ENDPOINT}?conversationId=conv-a`, PROJECT_ID)
    const fixture = mount(probe, provider)
    const chat = fixture.componentInstance.chat
    void chat.sendMessage('build it')
    await flush()
    startMessage(0)
    emitText(0, 'old turn text')
    await flushStream()
    expect(chat.messages()).toHaveLength(2)

    // User clicks "new chat" → the endpoint moves to conversation B.
    fixture.componentInstance.endpoint.set(`${ENDPOINT}?conversationId=conv-b`)
    fixture.detectChanges()
    await flush()

    // The switch cleared the old transcript + streaming state…
    expect(chat.messages()).toHaveLength(0)
    expect(chat.isLoading()).toBe(false)

    // …and the OLD stream's late events no longer bleed into the new view.
    emitText(0, ' more old text')
    startMessage(0, 'asst-late')
    emitText(0, 'a whole late message')
    complete(0)
    await flush()
    expect(chat.messages()).toHaveLength(0)
    expect(chat.isLoading()).toBe(false)
  })

  it('a brand-new conversation adopting its server id mid-stream is NOT a switch', async () => {
    // The endpoint gaining a conversationId for the FIRST time (undefined →
    // defined) must keep the live stream + messages.
    const { provider, emitText, startMessage } = createMockProvider()

    const probe = makeSignalProbe(ENDPOINT, PROJECT_ID)
    const fixture = mount(probe, provider)
    const chat = fixture.componentInstance.chat
    void chat.sendMessage('start')
    await flush()
    startMessage(0)
    emitText(0, 'streaming…')
    await flushStream()
    expect(chat.messages()).toHaveLength(2)

    // Server assigns the conversation id → the endpoint adopts it.
    fixture.componentInstance.endpoint.set(`${ENDPOINT}?conversationId=conv-new`)
    fixture.detectChanges()
    await flush()

    // Live messages kept, and the original stream keeps filling the store.
    expect(chat.messages()).toHaveLength(2)
    emitText(0, ' still going')
    await flushStream()
    expect(chat.messages()[1].content).toBe('streaming… still going')
  })

  // ── Stream events ─────────────────────────────────────────────────────

  it('handles tool_use and tool_result events', async () => {
    const { provider, emit, complete, startMessage } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('Do something')
    await flush()

    startMessage(0)
    emit(0, { type: 'tool_use', id: 'tc1', name: 'write_file', input: { path: '/a.ts' } })
    await flushStream()
    const assistant = chat.messages().find((m) => m.role === 'assistant')
    expect(assistant?.toolCalls).toHaveLength(1)
    expect(assistant?.toolCalls?.[0].status).toBe('running')

    emit(0, { type: 'tool_result', id: 'tc1', output: { success: true } })
    await flushStream()
    const done = chat.messages().find((m) => m.role === 'assistant')
    expect(done?.toolCalls?.[0].status).toBe('done')
    expect(done?.toolCalls?.[0].output).toEqual({ success: true })

    complete(0)
    await flush()
  })

  it('handles mode and conversation events', async () => {
    const onModeChange = vi.fn()
    const onConversationId = vi.fn()
    const { provider, emit, complete } = createMockProvider()
    const { chat } = mountChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
      onModeChange,
      onConversationId,
    })

    void chat.sendMessage('Hi')
    await flush()

    emit(0, { type: 'mode', mode: 'plan' })
    emit(0, { type: 'conversation', id: 'conv-123' })
    await flush()

    expect(chat.mode()).toBe('plan')
    expect(onModeChange).toHaveBeenCalledWith('plan')
    expect(onConversationId).toHaveBeenCalledWith('conv-123')

    complete(0)
    await flush()
  })

  it('handles thinking events', async () => {
    const { provider, emit, complete, startMessage } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('Think hard')
    await flush()

    startMessage(0)
    emit(0, { type: 'thinking', content: 'Let me ' })
    emit(0, { type: 'thinking', content: 'think...' })
    await flushStream()

    const assistant = chat.messages().find((m) => m.role === 'assistant')
    const thinkingBlock = assistant?.blocks?.find((b) => b.type === 'thinking')
    expect(thinkingBlock).toBeDefined()
    expect(thinkingBlock?.type === 'thinking' && thinkingBlock.content).toBe('Let me think...')

    complete(0)
    await flush()
  })

  it('handles file_diff events with onFileChange callback', async () => {
    const onFileChange = vi.fn()
    const { provider, emit, complete, startMessage } = createMockProvider()
    const { chat } = mountChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
      onFileChange,
    })

    void chat.sendMessage('Edit file')
    await flush()

    startMessage(0)
    emit(0, { type: 'tool_use', id: 'tc1', name: 'write_file', input: { path: 'app.ts' } })
    emit(0, { type: 'file_diff', path: 'app.ts', oldContent: 'old', newContent: 'new' })
    // file_diff uses scheduleFlush (50ms debounce) — wait for the update.
    await flushStream()
    const assistant = chat.messages().find((m) => m.role === 'assistant')
    expect(assistant?.toolCalls?.[0].fileDiff).toEqual({ original: 'old', modified: 'new' })
    expect(onFileChange).toHaveBeenCalledWith('app.ts', 'new')

    complete(0)
    await flush()
  })

  it('handles commit_suggestion events', async () => {
    const { provider, emit, complete, startMessage, emitText } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('Commit')
    await flush()

    startMessage(0)
    emitText(0, 'done')
    emit(0, { type: 'commit_suggestion', files: ['a.ts', 'b.ts'] })
    await flushStream()
    const assistant = chat.messages().find((m) => m.role === 'assistant')
    expect(assistant?.commitSuggestion).toEqual({ files: ['a.ts', 'b.ts'], status: 'pending' })

    complete(0)
    await flush()
  })

  it('handles loop_limit_reached events', async () => {
    const { provider, emit, complete, startMessage } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('Go')
    await flush()

    startMessage(0)
    emit(0, { type: 'loop_limit_reached', maxLoops: 25 })
    await flushStream()
    const assistant = chat.messages().find((m) => m.role === 'assistant')
    expect(assistant?.loopLimitReached).toBe(25)

    complete(0)
    await flush()
  })

  // ── Per-message structure (message_start) ─────────────────────────────

  it('creates a separate assistant message per message_start within one send', async () => {
    const { provider, emitText, complete, startMessage } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('build it')
    await flush()

    // Two server iterations → two message_start → two assistant messages, in order.
    startMessage(0, 'm1', 100)
    emitText(0, 'planning')
    await flushStream()
    expect(chat.messages().filter((m) => m.role === 'assistant')).toHaveLength(1)
    startMessage(0, 'm2', 200)
    emitText(0, 'building')
    await flushStream()

    const assistants = chat.messages().filter((m) => m.role === 'assistant')
    expect(assistants).toHaveLength(2)
    // The first message's last text is NOT lost at the boundary.
    expect(assistants[0].content).toBe('planning')
    expect(assistants[1].content).toBe('building')
    // The first is finalized; only the current (second) one streams.
    expect(assistants[0].isStreaming).toBe(false)
    expect(assistants[1].isStreaming).toBe(true)

    complete(0)
    await flush()
    const after = chat.messages().filter((m) => m.role === 'assistant')
    expect(after[1].isStreaming).toBe(false)
  })

  it('stamps each assistant message with the server timestamp from message_start', async () => {
    const { provider, emitText, complete, startMessage } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('go')
    await flush()
    startMessage(0, 'm1', 4242)
    emitText(0, 'hi')
    await flushStream()

    const a = chat.messages().find((m) => m.id === 'm1')
    expect(a?.timestamp).toBe(4242)

    complete(0)
    await flush()
  })

  it('drops a truly-empty assistant turn (message_start with no content)', async () => {
    const { provider, emitText, complete, startMessage } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('go')
    await flush()
    // An empty iteration opens a message but streams nothing.
    startMessage(0, 'empty', 100)
    await flush()
    // The next iteration opens a real message — finalizing the empty one drops it.
    startMessage(0, 'real', 200)
    emitText(0, 'hello')
    await flushStream()

    const assistants = chat.messages().filter((m) => m.role === 'assistant')
    expect(assistants).toHaveLength(1)
    expect(assistants[0].id).toBe('real')
    expect(assistants[0].content).toBe('hello')

    complete(0)
    await flush()
  })

  // ── History loading ───────────────────────────────────────────────────

  it('loads history on mount when loadOnMount is true', async () => {
    const { provider } = createMockProvider()
    provider.loadHistory.mockResolvedValue([
      { id: 'h1', role: 'user', content: 'old message', timestamp: 1000 },
      { id: 'h2', role: 'assistant', content: 'old reply', timestamp: 1001 },
    ])

    const { chat } = mountChat(provider, { ...baseOptions, loadOnMount: true })
    await flush()

    expect(chat.messages()).toHaveLength(2)
    expect(chat.messages()[0].content).toBe('old message')
    expect(chat.messages()[1].content).toBe('old reply')
  })

  it('does not load history when loadOnMount is false', async () => {
    const { provider } = createMockProvider()
    mountChat(provider, { ...baseOptions, loadOnMount: false })

    await vi.advanceTimersByTimeAsync(50)
    expect(provider.loadHistory).not.toHaveBeenCalled()
  })

  // ── Provider context ──────────────────────────────────────────────────

  it('throws when used outside ChatProvider', () => {
    const probe = makeProbe({ endpoint: ENDPOINT, loadOnMount: false })
    TestBed.configureTestingModule({
      imports: [probe],
      providers: [provideZonelessChangeDetection()],
    })
    expect(() => TestBed.createComponent(probe)).toThrow(
      'useChatProvider must be used within a ChatProvider',
    )
  })

  // ── editQueuedMessage ────────────────────────────────────────────────

  it('editQueuedMessage updates content in messages and persists to queue', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    // Send A (starts streaming), then queue B and C
    void chat.sendMessage('A')
    await flush()
    void chat.sendMessage('B')
    await flush()
    void chat.sendMessage('C')
    await flush()

    expect(deferreds).toHaveLength(1)

    // Find the queued B message
    const bMsg = chat.messages().find((m) => m.content === 'B')
    expect(bMsg).toBeDefined()
    expect(bMsg?.queued).toBe(true)

    // Edit B's content
    await chat.editQueuedMessage(bMsg?.id ?? '', 'B-edited')
    await flush()

    // Message content should be updated
    const bMsgAfter = chat.messages().find((m) => m.id === bMsg?.id)
    expect(bMsgAfter?.content).toBe('B-edited')
    expect(bMsgAfter?.queued).toBe(true)

    // sessionStorage should reflect the edit
    const raw = sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)
    expect(raw).not.toBeNull()
    const queue = JSON.parse(raw ?? '[]') as { message: string }[]
    const editedEntry = queue.find((e) => e.message === 'B-edited')
    expect(editedEntry).toBeDefined()

    // Complete A → B-edited should be sent (with the edited content)
    complete(0)
    await flush()
    expect(deferreds).toHaveLength(2)
    expect(deferreds[1].message).toBe('B-edited')

    // Complete B and C
    complete(1)
    await flush()
    expect(deferreds).toHaveLength(3)
    complete(2)
    await flush()
    expect(chat.isLoading()).toBe(false)
  })

  it('editQueuedMessage does nothing for non-queued messages', async () => {
    const { provider, complete } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    // Send A (not queued — sent directly)
    void chat.sendMessage('A')
    await flush()

    const aMsg = chat.messages().find((m) => m.content === 'A')
    expect(aMsg).toBeDefined()
    expect(aMsg!.queued).toBeFalsy()

    // Attempt to edit a non-queued message
    await chat.editQueuedMessage(aMsg?.id ?? '', 'A-edited')
    await flush()

    // Content should be unchanged
    const aMsgAfter = chat.messages().find((m) => m.id === aMsg?.id)
    expect(aMsgAfter?.content).toBe('A')

    complete(0)
    await flush()
  })

  // ── deleteQueuedMessage ──────────────────────────────────────────────

  it('deleteQueuedMessage removes a queued message from messages and queue', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    // Send A (starts streaming), then queue B and C
    void chat.sendMessage('A')
    await flush()
    void chat.sendMessage('B')
    await flush()
    void chat.sendMessage('C')
    await flush()

    expect(deferreds).toHaveLength(1)

    // Find the queued B message
    const bMsg = chat.messages().find((m) => m.content === 'B')
    expect(bMsg).toBeDefined()
    expect(bMsg?.queued).toBe(true)

    // Delete B from the queue
    await chat.deleteQueuedMessage(bMsg?.id ?? '')
    await flush()

    // B should no longer be in messages
    const bMsgAfter = chat.messages().find((m) => m.id === bMsg?.id)
    expect(bMsgAfter).toBeUndefined()

    // sessionStorage should only contain C
    const raw = sessionStorage.getItem(`mol-chat-queue-${PROJECT_ID}`)
    expect(raw).not.toBeNull()
    const queue = JSON.parse(raw ?? '[]') as { message: string }[]
    expect(queue).toHaveLength(1)
    expect(queue[0].message).toBe('C')

    // Complete A → C should be sent (B was deleted)
    complete(0)
    await flush()
    expect(deferreds).toHaveLength(2)
    expect(deferreds[1].message).toBe('C')

    complete(1)
    await flush()
    expect(chat.isLoading()).toBe(false)
  })

  it('deleteQueuedMessage does nothing for non-queued messages', async () => {
    const { provider, complete } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    // Send A (not queued)
    void chat.sendMessage('A')
    await flush()

    const aMsg = chat.messages().find((m) => m.content === 'A')
    expect(aMsg).toBeDefined()
    const msgCountBefore = chat.messages().length

    // Attempt to delete a non-queued message
    await chat.deleteQueuedMessage(aMsg?.id ?? '')
    await flush()

    // Messages should be unchanged
    expect(chat.messages()).toHaveLength(msgCountBefore)
    const aMsgAfter = chat.messages().find((m) => m.id === aMsg?.id)
    expect(aMsgAfter).toBeDefined()

    complete(0)
    await flush()
  })

  // ── onStreamEvent callback ───────────────────────────────────────────

  it('calls onStreamEvent for each streaming event', async () => {
    const onStreamEvent = vi.fn()
    const { provider, emitText, complete } = createMockProvider()
    const { chat } = mountChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
      onStreamEvent,
    })

    void chat.sendMessage('Hi')
    await flush()

    emitText(0, 'Hello ')
    emitText(0, 'world')
    await flushStream()

    expect(onStreamEvent).toHaveBeenCalledTimes(2)
    expect(onStreamEvent).toHaveBeenNthCalledWith(1, { type: 'text', content: 'Hello ' })
    expect(onStreamEvent).toHaveBeenNthCalledWith(2, { type: 'text', content: 'world' })

    complete(0)
    await flush()

    // The done event should also be forwarded
    expect(onStreamEvent).toHaveBeenCalledWith({ type: 'done' })
  })

  it('forwards different event types to onStreamEvent', async () => {
    const onStreamEvent = vi.fn()
    const { provider, emit, emitText, complete } = createMockProvider()
    const { chat } = mountChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
      onStreamEvent,
    })

    void chat.sendMessage('Do stuff')
    await flush()

    emit(0, { type: 'thinking', content: 'Hmm...' })
    emitText(0, 'Result: ')
    emit(0, { type: 'tool_use', id: 'tc1', name: 'write_file', input: { path: '/a.ts' } })
    emit(0, { type: 'tool_result', id: 'tc1', output: { success: true } })
    emit(0, { type: 'mode', mode: 'plan' })
    await flush()

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

    complete(0)
    await flush()
  })
})

// ── 5XX backoff auto-retry (P4-13) ───────────────────────────────────────

describe('5XX backoff auto-retry', () => {
  it('starts a cancelable countdown on a 5XX error instead of surfacing it', async () => {
    const { provider, completeWithError } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('go')
    await flush()
    completeWithError(0, 'Service Unavailable', 503)
    await flush()

    // No terminal error — a countdown begins at 5s (attempt 1), not loading.
    expect(chat.error()).toBeNull()
    expect(chat.retryCountdown()).toEqual({ secondsRemaining: 5, attempt: 1 })
    expect(chat.isLoading()).toBe(false)
  })

  it('surfaces a 4XX error and does NOT start a countdown', async () => {
    const { provider, completeWithError } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('go')
    await flush()
    completeWithError(0, 'Bad request', 400)
    await flush()

    expect(chat.error()).toBe('Bad request')
    expect(chat.retryCountdown()).toBeNull()
  })

  it('surfaces an error with no status (transport error) without retrying', async () => {
    const { provider, completeWithError } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('go')
    await flush()
    completeWithError(0, 'Stream error')
    await flush()

    expect(chat.error()).toBe('Stream error')
    expect(chat.retryCountdown()).toBeNull()
  })

  it('does NOT retry a 5XX that is a limit/quota error', async () => {
    const { provider, deferreds, emit } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('go')
    await flush()
    emit(0, { type: 'error', message: 'Out of quota', status: 503, limitType: 'messages' })
    deferreds[0].settled = true
    deferreds[0].resolve()
    await flush()

    // A limit/quota gate is surfaced even with a 5XX status — never retried.
    expect(chat.retryCountdown()).toBeNull()
    expect(chat.error()).toBe('Out of quota')
    expect(chat.errorMeta()).toEqual({ limitType: 'messages', requiresSignup: undefined })
  })

  it('does NOT retry a 5XX that requires signup', async () => {
    const { provider, deferreds, emit } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('go')
    await flush()
    emit(0, { type: 'error', message: 'Sign up', status: 503, requiresSignup: true })
    deferreds[0].settled = true
    deferreds[0].resolve()
    await flush()

    expect(chat.retryCountdown()).toBeNull()
    expect(chat.error()).toBe('Sign up')
  })

  it('ticks the countdown down once per second', async () => {
    const { provider, completeWithError } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('go')
    await flush()
    completeWithError(0, 'boom', 503)
    await flush()
    expect(chat.retryCountdown()?.secondsRemaining).toBe(5)

    await vi.advanceTimersByTimeAsync(1000)
    expect(chat.retryCountdown()?.secondsRemaining).toBe(4)

    await vi.advanceTimersByTimeAsync(2000)
    expect(chat.retryCountdown()?.secondsRemaining).toBe(2)
  })

  it('cancelRetry clears the countdown and surfaces the original error', async () => {
    const { provider, completeWithError } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('go')
    await flush()
    completeWithError(0, 'Service Unavailable', 503)
    await flush()
    expect(chat.retryCountdown()).not.toBeNull()
    expect(chat.error()).toBeNull()

    chat.cancelRetry()
    await flush()

    expect(chat.retryCountdown()).toBeNull()
    expect(chat.error()).toBe('Service Unavailable')
  })

  it('a new message clears a pending retry (no surfaced error)', async () => {
    const { provider, completeWithError } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('go')
    await flush()
    completeWithError(0, 'boom', 503)
    await flush()
    expect(chat.retryCountdown()).not.toBeNull()

    void chat.sendMessage('a new message')
    await flush()

    expect(chat.retryCountdown()).toBeNull()
    expect(chat.error()).toBeNull()
  })

  it('abort clears a pending retry without surfacing the error', async () => {
    const { provider, completeWithError } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('go')
    await flush()
    completeWithError(0, 'boom', 503)
    await flush()
    expect(chat.retryCountdown()).not.toBeNull()

    chat.abort()
    await flush()

    expect(chat.retryCountdown()).toBeNull()
    expect(chat.error()).toBeNull()
  })

  it('clearHistory clears a pending retry', async () => {
    const { provider, completeWithError } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('go')
    await flush()
    completeWithError(0, 'boom', 503)
    await flush()
    expect(chat.retryCountdown()).not.toBeNull()

    await chat.clearHistory()
    await flush()

    expect(chat.retryCountdown()).toBeNull()
  })

  it('auto-resumes the turn via resume:true after the countdown elapses', async () => {
    const { provider, deferreds, emit, completeWithError } = createMockProvider()
    provider.isServerStreaming = false
    provider.loadHistory.mockResolvedValue([
      { id: 'h1', role: 'user', content: 'go', timestamp: 1000 },
      { id: 'h2', role: 'assistant', content: 'partial', timestamp: 1001 },
    ])

    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('go')
    await flush()
    // The turn STARTED server-side (the server's first event arrived, so the
    // user message is persisted) before failing — the retry must RESUME.
    emit(0, { type: 'conversation', id: 'conv-1' })
    completeWithError(0, 'Service Unavailable', 503)
    await flush()
    expect(chat.retryCountdown()).toEqual({ secondsRemaining: 5, attempt: 1 })

    // Elapse the 5s countdown → fireRetry → resumeStream starts (Phase 1 poll).
    await vi.advanceTimersByTimeAsync(5000)
    expect(chat.retryCountdown()).toBeNull()

    // Phase 1 poll (1s) resolves → isServerStreaming false → Phase 2 resume send.
    await vi.advanceTimersByTimeAsync(1000)
    await flush()

    expect(deferreds).toHaveLength(2)
    const resumeCall = provider.sendMessage.mock.calls[1]
    expect(resumeCall[0]).toBe('') // empty message = resume, not a new user turn
    expect(resumeCall[1].resume).toBe(true)
  })

  it('bounds auto-retry to 8 attempts (5/10/20 then 30s holds), then surfaces the original error', async () => {
    const { provider, deferreds, emit, completeWithError } = createMockProvider()
    provider.isServerStreaming = false
    provider.loadHistory.mockResolvedValue([
      { id: 'h1', role: 'user', content: 'go', timestamp: 1000 },
      { id: 'h2', role: 'assistant', content: 'partial', timestamp: 1001 },
    ])

    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('go')
    await flush()

    // Original failure MID-STREAM (turn started server-side → resume path) →
    // attempt 1, 5s backoff.
    emit(0, { type: 'conversation', id: 'conv-1' })
    completeWithError(0, 'err-1', 503)
    await flush()
    expect(chat.retryCountdown()).toEqual({ secondsRemaining: 5, attempt: 1 })

    // The ladder must outlast a server restart (~90s observed): 5, 10, 20, then
    // 30s holds, for 8 attempts.
    const ladder = [5, 10, 20, 30, 30, 30, 30, 30]
    for (let attempt = 1; attempt < ladder.length; attempt++) {
      await vi.advanceTimersByTimeAsync((ladder[attempt - 1] + 1) * 1000)
      expect(deferreds).toHaveLength(attempt + 1)
      completeWithError(attempt, `err-${attempt + 1}`, 503)
      await flush()
      expect(chat.retryCountdown()).toEqual({
        secondsRemaining: ladder[attempt],
        attempt: attempt + 1,
      })
    }

    // Retry 8 fires (30s + 1s poll) → resume; fails a 9th time → budget
    // exhausted, surface the original error, no more countdown.
    await vi.advanceTimersByTimeAsync(31000)
    expect(deferreds).toHaveLength(9)
    completeWithError(8, 'err-final', 503)
    await flush()

    expect(chat.retryCountdown()).toBeNull()
    expect(chat.error()).toBe('err-final')
  })
})

// ── User Stop is a standing order (stop suppresses autonomous continuations) ──

describe('useChat — user stop suppression + remote streaming', () => {
  it('drops an AUTONOMOUS automatic send after a user Stop', async () => {
    const { provider, deferreds } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('build the app')
    await flush()
    expect(deferreds).toHaveLength(1)

    // User clicks Stop mid-stream.
    chat.abort()
    await flush()
    expect(chat.isLoading()).toBe(false)

    // The platform dispatches an auto-fix — it must be swallowed.
    void chat.sendMessage('[Preview health check] preview broken', undefined, {
      automatic: true,
    })
    await flush()
    expect(deferreds).toHaveLength(1) // no new request
    expect(chat.isLoading()).toBe(false)
    // And no queued/visible message was appended for the dropped send.
    expect(chat.messages().some((m) => m.content.includes('Preview health check'))).toBe(false)
  })

  it('lets a USER-INITIATED automatic send ("Fix with AI" click) through after a Stop — and it clears the stop', async () => {
    const { provider, deferreds, complete, startMessage, emitText } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('build the app')
    await flush()
    chat.abort()
    await flush()

    // The user clicks "Fix with AI" — automatic styling, but a direct request.
    void chat.sendMessage('Fix the broken preview', undefined, {
      automatic: true,
      userInitiated: true,
    })
    await flush()
    expect(deferreds).toHaveLength(2)
    startMessage(1)
    emitText(1, 'on it')
    complete(1)
    await flushStream()

    // The stop is cleared — a later autonomous automatic send works again.
    void chat.sendMessage('Fix these issues: …', undefined, { automatic: true })
    await flush()
    expect(deferreds).toHaveLength(3)
  })

  it('a plain user send after a Stop clears the suppression', async () => {
    const { provider, deferreds, complete, startMessage, emitText } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('build the app')
    await flush()
    chat.abort()
    await flush()

    // The user types a new message — that IS the re-engagement.
    void chat.sendMessage('actually, keep going')
    await flush()
    expect(deferreds).toHaveLength(2)
    startMessage(1)
    emitText(1, 'continuing')
    complete(1)
    await flushStream()

    // Autonomous automatic sends work again after the user re-engaged.
    void chat.sendMessage('Fix these issues: …', undefined, { automatic: true })
    await flush()
    expect(deferreds).toHaveLength(3)
  })

  it('marks the server abort as user-initiated (the durable server-side stop marker)', async () => {
    const { provider } = createMockProvider()
    const abortOnServer =
      vi.fn<(config: ChatConfig, cid?: string, opts?: { userInitiated?: boolean }) => void>()
    provider.abortOnServer = abortOnServer
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('build the app')
    await flush()
    chat.abort()
    await flush()

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
    provider.loadHistory = vi.fn<ChatProvider['loadHistory']>(async () => {
      provider.isServerStreaming = serverStreaming
      return []
    })
    const { chat } = mountChat(provider, baseOptions)

    // A pushed (broadcast) chat event arrived for this conversation.
    chat.noteRemoteStreamEvent()
    // The immediate confirm poll runs → server says streaming → flag on.
    await vi.advanceTimersByTimeAsync(5)
    expect(chat.isRemoteStreaming()).toBe(true)

    // The remote turn finishes server-side → the next reconcile clears it.
    serverStreaming = false
    await vi.advanceTimersByTimeAsync(3100)
    expect(chat.isRemoteStreaming()).toBe(false)
  })

  it('a Stop clears remote-turn tracking immediately (the abort endpoint kills the remote turn)', async () => {
    const { provider } = createMockProvider()
    provider.loadHistory = vi.fn<ChatProvider['loadHistory']>(async () => {
      provider.isServerStreaming = true
      return []
    })
    const { chat } = mountChat(provider, baseOptions)

    chat.noteRemoteStreamEvent()
    await vi.advanceTimersByTimeAsync(5)
    expect(chat.isRemoteStreaming()).toBe(true)

    // Stop: abortOnServer kills the backend turn — the control retires at once.
    chat.abort()
    expect(chat.isRemoteStreaming()).toBe(false)
  })
})

describe('useChat — remote stream ingestion (applyRemoteEvent)', () => {
  it('materializes a remote turn — message_start, deltas, tools, done — into the store', async () => {
    const { provider } = createMockProvider()
    const { chat } = mountChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    chat.applyRemoteEvent({ type: 'message_start', id: 'remote-1', timestamp: 1_000 })
    expect(chat.isRemoteStreaming()).toBe(true)
    expect(chat.messages()).toHaveLength(1)
    expect(chat.messages()[0]).toMatchObject({
      id: 'remote-1',
      role: 'assistant',
      isStreaming: true,
    })

    chat.applyRemoteEvent({ type: 'text', content: 'Hello ' })
    chat.applyRemoteEvent({ type: 'text', content: 'world' })
    chat.applyRemoteEvent({
      type: 'tool_use',
      id: 't1',
      name: 'write_file',
      input: { path: 'a.ts' },
    })
    chat.applyRemoteEvent({ type: 'tool_result', id: 't1', output: 'ok' })

    // The turn's terminal frame finalizes the accumulator — the full message
    // (text + tools) lands atomically.
    chat.applyRemoteEvent({ type: 'done' })
    expect(chat.isRemoteStreaming()).toBe(false)
    await flushStream()
    expect(chat.messages()[0].content).toBe('Hello world')
    expect(chat.messages()[0].toolCalls).toEqual([
      expect.objectContaining({ id: 't1', name: 'write_file', status: 'done', output: 'ok' }),
    ])
    expect(chat.messages()[0].isStreaming).toBeFalsy()
  })

  it('adopts the trailing assistant message when attaching mid-turn (no message_start seen)', async () => {
    const { provider } = createMockProvider()
    const { chat } = mountChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })
    // The history snapshot already produced the partial assistant message.
    chat.appendCompleteMessage({
      id: 'snap-1',
      role: 'assistant',
      content: 'partial',
      timestamp: 500,
    })
    chat.applyRemoteEvent({ type: 'text', content: ' + live' })
    await flushStream()
    expect(chat.messages()[0].content).toBe('partial + live')
    expect(chat.messages()[0].isStreaming).toBe(true)
  })

  it('drops its own WS echo while a local send owns the stream, but still applies cards', async () => {
    const { provider, startMessage, emitText, complete } = createMockProvider()
    const { chat } = mountChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })
    void chat.sendMessage('build it')
    await flush()
    expect(chat.isLoading()).toBe(true)
    startMessage(0, 'own-1')
    emitText(0, 'own text')
    // Echo of the same turn arriving over the push channel — must not double-apply.
    chat.applyRemoteEvent({ type: 'message_start', id: 'own-1', timestamp: 1_000 })
    chat.applyRemoteEvent({ type: 'text', content: 'own text' })
    // A shared card still lands (id-deduped), even mid-own-turn.
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
    await flushStream()
    const own = chat.messages().find((m) => m.id === 'own-1')
    expect(own?.content).toBe('own text')
    expect(chat.messages().filter((m) => m.id === 'card-1')).toHaveLength(1)
    complete(0)
    await flush()
  })

  it('applies a broadcast user message when idle and drops it while locally streaming', async () => {
    const { provider, complete } = createMockProvider()
    const { chat } = mountChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })
    // Idle: a teammate's prompt lands live.
    chat.applyRemoteEvent({
      type: 'message',
      message: { id: 'u-remote', role: 'user', content: 'teammate prompt', timestamp: 1 },
    })
    expect(chat.messages().some((m) => m.id === 'u-remote')).toBe(true)

    // While this client streams its own send, a user-message echo is dropped.
    void chat.sendMessage('mine')
    await flush()
    expect(chat.isLoading()).toBe(true)
    chat.applyRemoteEvent({
      type: 'message',
      message: { id: 'u-echo', role: 'user', content: 'mine', timestamp: 2 },
    })
    expect(chat.messages().some((m) => m.id === 'u-echo')).toBe(false)
    complete(0)
    await flush()
  })

  // ── Side-channel sends (team notes) ────────────────────────────────────

  it('sends a side-channel message immediately during an active turn — no queue, stream untouched', async () => {
    const { provider, deferreds, complete, startMessage } = createMockProvider()
    const sideSend = vi.fn<NonNullable<ChatProvider['sendSideMessage']>>(
      async (_msg: string, _config, onEvent: ChatEventHandler): Promise<void> => {
        onEvent({
          type: 'message',
          message: { id: 'note-1', role: 'user', content: 'hi team', timestamp: 5 },
        })
        onEvent({ type: 'done' })
      },
    )
    provider.sendSideMessage = sideSend

    const { chat } = mountChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    // A turn is streaming.
    void chat.sendMessage('build it')
    await flush()
    expect(chat.isLoading()).toBe(true)
    startMessage(0)

    // The team note goes out mid-turn.
    await chat.sendMessage('/teamsay hi team', undefined, {
      suppressUserMessage: true,
      sideChannel: true,
    })

    expect(sideSend).toHaveBeenCalledTimes(1)
    // Rendered immediately from its own response — never queued.
    expect(chat.messages().some((m) => m.id === 'note-1')).toBe(true)
    expect(chat.messages().some((m) => m.queued)).toBe(false)
    // The running turn is untouched: still streaming, and no second turn POST.
    expect(chat.isLoading()).toBe(true)
    expect(deferreds).toHaveLength(1)
    complete(0)
    await flush()
  })

  it('falls back to the normal send path when the provider has no side channel', async () => {
    const { provider, deferreds, complete } = createMockProvider()
    const { chat } = mountChat(provider, {
      endpoint: ENDPOINT,
      projectId: PROJECT_ID,
      loadOnMount: false,
    })

    void chat.sendMessage('/teamsay hi', undefined, {
      suppressUserMessage: true,
      sideChannel: true,
    })
    await flush()

    // No sendSideMessage on the provider — the message went through sendMessage.
    expect(deferreds).toHaveLength(1)
    expect(deferreds[0].message).toBe('/teamsay hi')
    complete(0)
    await flush()
  })
})

// ── localOnlyMessages / reconcile tests ──────────────────────────────────

/**
 * Builds a chat message with defaults for the merge unit tests.
 *
 * @param id - The message id.
 * @param role - The message role.
 * @param content - The message content.
 * @param extra - Extra fields to attach.
 * @returns The message.
 */
function chatMsg(
  id: string,
  role: ChatMessage['role'],
  content: string,
  extra: Partial<ChatMessage> = {},
): ChatMessage {
  return { id, role, content, timestamp: 1, ...extra }
}

/**
 * Builds an assistant message carrying tool calls (the merge unit tests).
 *
 * @param id - The message id.
 * @param content - The message content.
 * @param toolCalls - The tool calls to attach.
 * @returns The message.
 */
function assistantMsg(
  id: string,
  content: string,
  toolCalls?: ChatMessage['toolCalls'],
): ChatMessage {
  return { id, role: 'assistant', content, timestamp: 1, ...(toolCalls ? { toolCalls } : {}) }
}

describe('localOnlyMessages (remote-history merge)', () => {
  it('drops the optimistic echo of a user message the server already persisted', () => {
    const prev = [
      chatMsg('user-1', 'user', 'Build this.'),
      chatMsg('assistant-1', 'assistant', 'On it.'),
    ]
    const history = [
      chatMsg('srv-u1', 'user', 'Build this.'),
      chatMsg('srv-a1', 'assistant', 'On it.'),
    ]
    expect(localOnlyMessages(prev, history)).toEqual([
      chatMsg('assistant-1', 'assistant', 'On it.'),
    ])
  })

  it('keeps a queued (not yet sent) user message and any session-local card', () => {
    const prev = [
      chatMsg('user-2', 'user', 'and this', { queued: true }),
      chatMsg('card-1', 'assistant', 'local card'),
    ]
    const history = [chatMsg('srv-u1', 'user', 'Build this.')]
    expect(localOnlyMessages(prev, history)).toEqual(prev)
  })
})

describe('reconcileHistory keeps what the server does not have yet', () => {
  it('keeps a just-sent answer that the reloaded history does not carry yet', async () => {
    const { provider, startMessage, emitText, complete } = createMockProvider()
    // History as the server has it a moment BEFORE the answer is persisted.
    provider.loadHistory.mockResolvedValue([
      { id: 'srv-1', role: 'user', content: 'earlier question', timestamp: 1 },
      { id: 'srv-2', role: 'assistant', content: 'earlier answer', timestamp: 2 },
    ])

    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('App not found or not live')
    await flush()
    startMessage(0)
    emitText(0, 'Thanks — checking.')
    complete(0)
    await flush()
    expect(chat.isLoading()).toBe(false)

    await chat.reconcileHistory()
    await flush()

    const contents = chat.messages().map((m) => m.content)
    expect(contents).toContain('App not found or not live')
    expect(contents).toContain('Thanks — checking.')
    // The server's own rows are there too, and its copies lead.
    expect(contents).toContain('earlier question')
    expect(chat.messages()[0]?.id).toBe('srv-1')
  })

  it('still drops the optimistic echo once the server has persisted it', async () => {
    const { provider, startMessage, complete } = createMockProvider()
    provider.loadHistory.mockResolvedValue([
      { id: 'srv-u', role: 'user', content: 'App not found or not live', timestamp: 1 },
      { id: 'srv-a', role: 'assistant', content: 'Thanks — checking.', timestamp: 2 },
    ])

    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('App not found or not live')
    await flush()
    startMessage(0)
    complete(0)
    await flush()
    expect(chat.isLoading()).toBe(false)

    await chat.reconcileHistory()
    await flush()

    const userCopies = chat
      .messages()
      .filter((m) => m.role === 'user' && m.content === 'App not found or not live')
    expect(userCopies).toHaveLength(1)
    expect(userCopies[0]?.id).toBe('srv-u')
  })
})

describe('applying a server history never rewinds what is already on screen', () => {
  it('keeps a card the user just answered when the server still has it awaiting', async () => {
    const { provider, startMessage, emit, complete } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    // A turn that ends on an ask_user card.
    void chat.sendMessage('deploy it')
    await flush()
    startMessage(0, 'asst-ask', 1_000)
    emit(0, {
      type: 'tool_use',
      id: 'tc-ask',
      name: 'ask_user',
      input: { question: 'Could you open the site and tell me what you see?' },
    })
    emit(0, { type: 'tool_result', id: 'tc-ask', output: { status: 'awaiting_response' } })
    complete(0)
    await flush()
    expect(chat.isLoading()).toBe(false)

    // The user answers it. `askUserAnswer` resolves the card in the store right
    // away — this is the copy the server has not caught up with yet.
    void chat.sendMessage('App not found or not live', undefined, {
      suppressUserMessage: true,
      askUserAnswer: true,
    })
    await flush()
    complete(1)
    await flush()
    expect(chat.isLoading()).toBe(false)

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
            status: 'running',
          },
        ],
      },
    ])

    await chat.reconcileHistory()
    await flush()

    const card = chat
      .messages()
      .find((m) => m.id === 'asst-ask')
      ?.toolCalls?.find((tc) => tc.id === 'tc-ask')
    expect(card?.output).toBe('App not found or not live')
  })

  it('keeps the text a message has streamed when the server copy is shorter', async () => {
    const { provider, startMessage, emitText, complete } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('go')
    await flush()
    startMessage(0, 'asst-live', 1_000)
    emitText(0, 'The full answer the user can already read.')
    complete(0)
    await flush()
    expect(chat.isLoading()).toBe(false)

    // A snapshot taken mid-turn: same id, less content.
    provider.loadHistory.mockResolvedValue([
      { id: 'asst-live', role: 'assistant', content: 'The full', timestamp: 1_000 },
    ])

    await chat.reconcileHistory()
    await flush()

    expect(chat.messages().find((m) => m.id === 'asst-live')?.content).toBe(
      'The full answer the user can already read.',
    )
  })

  it('takes the server copy once it is the one that is further along', async () => {
    const { provider, startMessage, emitText, complete } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('go')
    await flush()
    startMessage(0, 'asst-live', 1_000)
    emitText(0, 'partial')
    complete(0)
    await flush()
    expect(chat.isLoading()).toBe(false)
    provider.loadHistory.mockResolvedValue([
      {
        id: 'asst-live',
        role: 'assistant',
        content: 'partial, and then everything the turn went on to say',
        timestamp: 1_000,
      },
    ])

    await chat.reconcileHistory()
    await flush()

    expect(chat.messages().find((m) => m.id === 'asst-live')?.content).toBe(
      'partial, and then everything the turn went on to say',
    )
  })

  it('does not wipe the turn when the stream drops before the server has persisted it', async () => {
    const { provider, startMessage, emitText, drop } = createMockProvider()
    // The server persists a turn's transcript only when the turn ENDS, so a
    // history read taken while it is still running returns the PRE-turn
    // transcript.
    provider.loadHistory.mockResolvedValue([
      { id: 'srv-old', role: 'user', content: 'deploy it', timestamp: 1 },
    ])

    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('deploy it')
    await flush()
    startMessage(0, 'asst-inflight', 2_000)
    emitText(0, 'Deploying now…')
    // The socket dies with no done/error event.
    drop(0)
    await flush()
    expect(chat.isLoading()).toBe(false)

    const contents = chat.messages().map((m) => m.content)
    expect(contents).toContain('Deploying now…')
  })
})

describe('convergeHistory', () => {
  it('returns the same object references when nothing moved, so a poll cannot churn', () => {
    const prev = [assistantMsg('a', 'hello'), assistantMsg('b', 'world')]
    const history = [assistantMsg('a', 'hello'), assistantMsg('b', 'world')]
    const next = convergeHistory(prev, history)
    expect(next[0]).toBe(prev[0])
    expect(next[1]).toBe(prev[1])
  })

  it('does not count a call still awaiting the user as a finished one', () => {
    const answered = assistantMsg('a', '', [
      { id: 't', name: 'ask_user', input: {}, status: 'done', output: 'my answer' },
    ])
    const awaiting = assistantMsg('a', '', [
      {
        id: 't',
        name: 'ask_user',
        input: {},
        status: 'running',
        output: { status: 'awaiting_response' },
      },
    ])
    expect(convergeHistory([answered], [awaiting])[0]).toBe(answered)
  })

  it('does not count a call still blocked by a hook as a finished one', () => {
    const approved = assistantMsg('a', '', [
      { id: 't', name: 'exec_command', input: {}, status: 'done', output: 'ok' },
    ])
    const blocked = assistantMsg('a', '', [
      {
        id: 't',
        name: 'exec_command',
        input: {},
        status: 'running',
        output: { status: 'blocked_by_hook' },
      },
    ])
    expect(convergeHistory([approved], [blocked])[0]).toBe(approved)
  })

  it('takes the server copy once it carries more', () => {
    const local = assistantMsg('a', 'partial')
    const server = assistantMsg('a', 'partial and the rest of it')
    expect(convergeHistory([local], [server])[0]).toBe(server)
  })

  it('keeps a turn the server has not persisted yet, after the rows it has', () => {
    const prev = [assistantMsg('srv-1', 'earlier'), assistantMsg('live-1', 'streaming now')]
    const history = [assistantMsg('srv-1', 'earlier')]
    expect(convergeHistory(prev, history).map((m) => m.id)).toEqual(['srv-1', 'live-1'])
  })

  it('adds rows only the server has, in the server order', () => {
    const prev = [assistantMsg('srv-1', 'earlier')]
    const history = [assistantMsg('srv-1', 'earlier'), assistantMsg('srv-2', "a teammate's note")]
    expect(convergeHistory(prev, history).map((m) => m.id)).toEqual(['srv-1', 'srv-2'])
  })
})

// ── Attaching to a live turn (the `attached` frame) ──────────────────────

describe('useChat — attaching to a live turn (the `attached` frame)', () => {
  it('adopts the message the server is inside and appends the deltas that follow to it', async () => {
    const { provider, deferreds, emit, emitText, complete } = createMockProvider()
    provider.loadHistory.mockResolvedValue([
      { id: 'u1', role: 'user', content: 'go', timestamp: 1000 },
      { id: 'a1', role: 'assistant', content: 'persisted prefix', timestamp: 1001 },
    ])
    const { chat } = mountChat(provider, { ...baseOptions, loadOnMount: true })
    await flush()
    expect(chat.messages().find((m) => m.id === 'a1')).toBeDefined()

    void chat.sendMessage('continue')
    await flush()
    expect(deferreds).toHaveLength(1)
    provider.loadHistory.mockClear()

    emit(0, { type: 'attached', messageId: 'a1', timestamp: 1001 })
    emitText(0, ' and the live rest')
    await flushStream()
    const a1 = chat.messages().find((m) => m.id === 'a1')
    expect(a1?.content).toBe('persisted prefix and the live rest')
    expect(a1?.isStreaming).toBe(true)
    // The attach converged on the server transcript (one read), no new message
    // was opened for the deltas.
    expect(provider.loadHistory).toHaveBeenCalledTimes(1)
    expect(chat.messages().filter((m) => m.role === 'assistant')).toHaveLength(1)

    complete(0)
    await flush()
    expect(chat.isLoading()).toBe(false)
    expect(chat.messages().find((m) => m.id === 'a1')?.isStreaming).toBe(false)
  })

  it('opens the named message fresh when the store has no copy, then folds in the persisted prefix', async () => {
    const { provider, deferreds, emit, emitText, complete } = createMockProvider()
    // The server's transcript already holds the prefix of the message it is
    // streaming (a2) — this client has never seen a2.
    provider.loadHistory.mockResolvedValue([
      { id: 'u1', role: 'user', content: 'go', timestamp: 1000 },
      {
        id: 'a2',
        role: 'assistant',
        content: 'the prefix streamed before the attach',
        timestamp: 1002,
      },
    ])
    const { chat } = mountChat(provider, baseOptions)
    void chat.sendMessage('go')
    await flush()
    expect(deferreds).toHaveLength(1)

    emit(0, { type: 'attached', messageId: 'a2', timestamp: 1002 })
    // The converge brought the persisted prefix under the fresh accumulator…
    await flush()
    expect(chat.messages().find((m) => m.id === 'a2')?.content).toBe(
      'the prefix streamed before the attach',
    )
    // …and a later delta appends to it rather than rewinding it.
    emitText(0, ' + live tail')
    await flushStream()
    expect(chat.messages().find((m) => m.id === 'a2')?.content).toBe(
      'the prefix streamed before the attach + live tail',
    )
    complete(0)
    await flush()
    expect(chat.isLoading()).toBe(false)
  })

  it('converges on the server transcript again at the terminal, so nothing streamed before the attach is lost', async () => {
    const { provider, deferreds, emit, complete } = createMockProvider()
    provider.loadHistory.mockResolvedValue([
      { id: 'u1', role: 'user', content: 'go', timestamp: 1000 },
    ])
    const { chat } = mountChat(provider, baseOptions)
    void chat.sendMessage('go')
    await flush()
    expect(deferreds).toHaveLength(1)

    emit(0, { type: 'attached' }) // between messages — nothing to adopt
    await flush()
    expect(provider.loadHistory).toHaveBeenCalledTimes(1)
    // By the time the turn ends the server has persisted a whole message this
    // stream never received a frame of.
    provider.loadHistory.mockResolvedValue([
      { id: 'u1', role: 'user', content: 'go', timestamp: 1000 },
      { id: 'a9', role: 'assistant', content: 'streamed while we were away', timestamp: 1009 },
    ])
    complete(0)
    await flush()
    expect(chat.messages().find((m) => m.id === 'a9')?.content).toBe('streamed while we were away')
    expect(provider.loadHistory).toHaveBeenCalledTimes(2)
  })

  it('a resume sends as soon as the server answers, even while it reports the turn still live', async () => {
    sessionStorage.setItem(`mol-chat-streaming-${PROJECT_ID}`, '1')
    const { provider, deferreds } = createMockProvider()
    let polls = 0
    // The server reports the turn live on EVERY read (it resumed the turn
    // itself after the restart and is streaming it).
    provider.loadHistory.mockImplementation(async () => {
      polls++
      provider.isServerStreaming = true
      return [
        { id: 'h1', role: 'user', content: 'old msg', timestamp: 1000 },
        { id: 'h2', role: 'assistant', content: 'partial...', timestamp: 1001 },
      ]
    })

    mountChat(provider, { ...baseOptions, loadOnMount: true })
    // The resume goes out after the FIRST successful poll, not after the turn ends.
    for (let i = 0; i < 3 && deferreds.length === 0; i++) await vi.advanceTimersByTimeAsync(1100)
    expect(deferreds).toHaveLength(1)
    expect(deferreds[0].message).toBe('')
    expect(polls).toBeLessThanOrEqual(3)
  })
})

// ── A turn the server resumes ─────────────────────────────────────────────

describe('useChat — resumed turns', () => {
  it('applies a tool_result that arrives before any message_start to the message holding the call', async () => {
    const { provider, emit, complete, startMessage, emitText } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('build it')
    await flush()
    startMessage(0, 'a1')
    emit(0, { type: 'tool_use', id: 'tc-1', name: 'write_file', input: { path: 'a.ts' } })
    complete(0)
    await flush()
    const running = chat.messages().find((m) => m.id === 'a1')
    expect(running?.toolCalls?.[0]?.status).toBe('running')

    void chat.sendMessage('go on')
    await flush()
    const interrupted = { status: 'interrupted_by_restart', message: 'unknown effect' }
    // The restarted turn settles the previous message's call first.
    emit(1, { type: 'tool_result', id: 'tc-1', output: interrupted })
    startMessage(1, 'a2')
    emitText(1, 'checking the file')
    complete(1)
    await flushStream()

    const holder = chat.messages().find((m) => m.id === 'a1')
    expect(holder?.toolCalls?.[0]?.status).toBe('done')
    expect(holder?.toolCalls?.[0]?.output).toEqual(interrupted)
  })

  it('attaches a repeated call id to the newest pending call, leaving an older finished call untouched', async () => {
    const { provider, emit, complete, startMessage } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('one')
    await flush()
    startMessage(0, 'a1')
    emit(0, { type: 'tool_use', id: 'call_1', name: 'read_file', input: {} })
    emit(0, { type: 'tool_result', id: 'call_1', output: { success: true, old: true } })
    complete(0)
    await flush()
    void chat.sendMessage('two')
    await flush()
    startMessage(1, 'a2')
    emit(1, { type: 'tool_use', id: 'call_1', name: 'write_file', input: {} })
    complete(1)
    await flush()
    void chat.sendMessage('three')
    await flush()
    const fresh = { success: true, fresh: true }
    emit(2, { type: 'tool_result', id: 'call_1', output: fresh })
    startMessage(2, 'a3')
    complete(2)
    await flushStream()

    const newer = chat.messages().find((m) => m.id === 'a2')
    expect(newer?.toolCalls?.[0]?.output).toEqual(fresh)
    const older = chat.messages().find((m) => m.id === 'a1')
    expect(older?.toolCalls?.[0]?.output).toEqual({ success: true, old: true })
  })

  it('a status line does not end the turn, and clears once the resumed reply starts', async () => {
    const { provider, emit, complete, startMessage, emitText } = createMockProvider()
    const { chat } = mountChat(provider, baseOptions)

    void chat.sendMessage('build it')
    await flush()
    startMessage(0, 'a1')
    emitText(0, 'partial')
    emit(0, {
      type: 'status',
      label: 'The AI provider dropped the reply, so Synthase is resuming it…',
    })
    await flush()
    expect(chat.streamingStatus()).toBe(
      'The AI provider dropped the reply, so Synthase is resuming it…',
    )
    expect(chat.isLoading()).toBe(true)
    expect(chat.error()).toBeNull()

    startMessage(0, 'a2')
    emitText(0, 'continuing')
    // The clear waits out the current label's dwell.
    await vi.advanceTimersByTimeAsync(700)
    expect(chat.streamingStatus()).toBeNull()
    expect(chat.isLoading()).toBe(true)

    complete(0)
    await flush()
    expect(chat.isLoading()).toBe(false)
  })
})

// ── A silent own stream recovers instead of freezing the chat ────────────

describe('useChat — a silent own stream recovers instead of freezing the chat', () => {
  const LOCAL_PROJECT = 'p1'
  const history: ChatMessage[] = [
    { id: 'h1', role: 'user', content: 'go', timestamp: 1000 },
    { id: 'h2', role: 'assistant', content: 'partial', timestamp: 1001 },
  ]

  /**
   * Calls to sendMessage that asked to resume.
   *
   * @param provider - The mock provider.
   * @returns The matching call tuples.
   */
  function resumeCalls(provider: MockProvider): Parameters<ChatProvider['sendMessage']>[] {
    return provider.sendMessage.mock.calls.filter((call) => call[1].resume === true)
  }

  it('aborts a silent RESUME stream after the stall window and resumes again', async () => {
    const { provider, deferreds, emit, completeWithError } = createMockProvider()
    provider.isServerStreaming = true
    provider.loadHistory.mockResolvedValue(history)
    const { chat } = mountChat(provider, {
      endpoint: `${ENDPOINT}?conversationId=c1`,
      projectId: LOCAL_PROJECT,
      loadOnMount: false,
    })

    void chat.sendMessage('go')
    await flush()
    emit(0, { type: 'conversation', id: 'conv-1' })
    completeWithError(0, 'Service Unavailable', 503)
    await flush()
    // Countdown (5 s) → resume → one history read (1 s) → the resume request.
    await vi.advanceTimersByTimeAsync(6_000)
    expect(resumeCalls(provider)).toHaveLength(1)
    const resumeIndex = deferreds.length - 1
    // It attached to the live turn, then nothing was ever written to it again.
    emit(resumeIndex, { type: 'attached' })
    await flush()
    await vi.advanceTimersByTimeAsync(179_000)
    expect(provider.abort).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2_000)
    expect(provider.abort).toHaveBeenCalledTimes(1)
    // The no-terminal path reloaded history, saw the turn still running, and resumed.
    await vi.advanceTimersByTimeAsync(1_500)
    expect(resumeCalls(provider)).toHaveLength(2)
  })

  it('aborts its own stream when it is silent while pushed frames of the turn keep arriving', async () => {
    const { provider, emit, startMessage, emitText } = createMockProvider()
    provider.isServerStreaming = true
    provider.loadHistory.mockResolvedValue(history)
    const { chat } = mountChat(provider, {
      endpoint: `${ENDPOINT}?conversationId=c1`,
      projectId: LOCAL_PROJECT,
      loadOnMount: false,
    })

    void chat.sendMessage('go')
    await flush()
    emit(0, { type: 'conversation', id: 'conv-1' })
    startMessage(0, 'own-1')
    emitText(0, 'working')
    await flush()
    await vi.advanceTimersByTimeAsync(21_000)
    // Well inside the 180 s watchdog: only the pushed frame can reveal the deaf stream.
    expect(provider.abort).not.toHaveBeenCalled()
    chat.applyRemoteEvent({ type: 'text', content: ' still working' })
    expect(provider.abort).toHaveBeenCalledTimes(1)
    // A second pushed frame before the recovery lands does not abort again.
    chat.applyRemoteEvent({ type: 'text', content: ' and more' })
    expect(provider.abort).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1_500)
    expect(resumeCalls(provider)).toHaveLength(1)
  })

  it('leaves a healthy stream alone: its own frames keep arriving with the echo', async () => {
    const { provider, emit, startMessage, emitText } = createMockProvider()
    const { chat } = mountChat(provider, {
      endpoint: `${ENDPOINT}?conversationId=c1`,
      projectId: LOCAL_PROJECT,
      loadOnMount: false,
    })
    void chat.sendMessage('go')
    await flush()
    emit(0, { type: 'conversation', id: 'conv-1' })
    startMessage(0, 'own-1')
    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(10_000)
      emitText(0, `chunk ${i} `)
      chat.applyRemoteEvent({ type: 'text', content: `chunk ${i} ` })
    }
    expect(provider.abort).not.toHaveBeenCalled()
  })

  it('never aborts a send whose stream has delivered nothing yet (it may be waiting behind another turn)', async () => {
    const { provider } = createMockProvider()
    const { chat } = mountChat(provider, {
      endpoint: `${ENDPOINT}?conversationId=c1`,
      projectId: LOCAL_PROJECT,
      loadOnMount: false,
    })
    void chat.sendMessage('go')
    await flush()
    await vi.advanceTimersByTimeAsync(30_000)
    // A teammate's turn on the same conversation streams over the push channel.
    chat.applyRemoteEvent({ type: 'text', content: 'their turn' })
    expect(provider.abort).not.toHaveBeenCalled()
  })

  it('does not judge a stream on a hidden page (its timers are throttled)', async () => {
    const { provider, emit } = createMockProvider()
    const { chat } = mountChat(provider, {
      endpoint: `${ENDPOINT}?conversationId=c1`,
      projectId: LOCAL_PROJECT,
      loadOnMount: false,
    })
    void chat.sendMessage('go')
    await flush()
    emit(0, { type: 'conversation', id: 'conv-1' })
    await flush()
    await vi.advanceTimersByTimeAsync(30_000)
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    chat.applyRemoteEvent({ type: 'text', content: 'pushed' })
    expect(provider.abort).not.toHaveBeenCalled()
  })
})

afterEach(() => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'visible',
  })
})
