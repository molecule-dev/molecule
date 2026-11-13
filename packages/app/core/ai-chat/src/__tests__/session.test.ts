/**
 * The framework-free chat session: state snapshots, lifecycle, option updates
 * and injected persistence. The full behavior (streaming, queueing, retries,
 * recovery) is pinned by the binding conformance goldens every framework's
 * `useChat` must match; these tests cover what a binding relies on directly.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createChatSession, resetChatStoresForTests } from '../session.js'
import type { ChatSessionPersistence, CreateChatSessionOptions } from '../session-types.js'
import type { ChatConfig, ChatEventHandler, ChatMessage, ChatProvider } from '../types.js'

/** A provider whose streams the test drives by hand. */
const fakeProvider = (
  history: ChatMessage[][] = [],
): ChatProvider & {
  emit: (event: Parameters<ChatEventHandler>[0]) => void
  finish: () => void
  loads: ChatConfig[]
} => {
  let onEvent: ChatEventHandler | null = null
  let resolveSend: (() => void) | null = null
  const loads: ChatConfig[] = []
  return {
    name: 'fake',
    loads,
    sendMessage: vi.fn((_message: string, _config: ChatConfig, handler: ChatEventHandler) => {
      onEvent = handler
      return new Promise<void>((resolve) => {
        resolveSend = resolve
      })
    }),
    abort: vi.fn(),
    clearHistory: vi.fn(async () => undefined),
    loadHistory: vi.fn(async (config: ChatConfig) => {
      loads.push(config)
      return history.shift() ?? []
    }),
    emit: (event) => onEvent?.(event),
    finish: () => resolveSend?.(),
  }
}

const options = (
  provider: ChatProvider,
  extra: Partial<CreateChatSessionOptions> = {},
): CreateChatSessionOptions => ({
  provider,
  endpoint: '/projects/p1/chat',
  projectId: 'p1',
  ...extra,
})

const message = (id: string, role: ChatMessage['role'], content: string): ChatMessage => ({
  id,
  role,
  content,
  timestamp: 0,
})

/** A persistence that records every write. */
const recordingPersistence = (): ChatSessionPersistence & { items: Map<string, string> } => {
  const items = new Map<string, string>()
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  }
}

beforeEach(() => {
  resetChatStoresForTests()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createChatSession', () => {
  it('starts idle, and returns the same state object until something changes', () => {
    const session = createChatSession(options(fakeProvider(), { loadOnMount: false }))
    const first = session.getState()
    expect(first).toMatchObject({
      messages: [],
      isLoading: false,
      isRemoteStreaming: false,
      error: null,
      mode: 'execute',
      fastMode: false,
      streamingStatus: null,
      retryCountdown: null,
    })
    expect(session.getState()).toBe(first)
    session.controls.setFastMode(true)
    expect(session.getState()).not.toBe(first)
    expect(session.getState().fastMode).toBe(true)
  })

  it('has a constant server state', () => {
    const session = createChatSession(options(fakeProvider()))
    expect(session.getServerState()).toBe(session.getServerState())
    expect(session.getServerState().messages).toEqual([])
  })

  it('loads history on connect and notifies subscribers', async () => {
    const provider = fakeProvider([[message('s1', 'user', 'hello')]])
    const session = createChatSession(options(provider))
    const listener = vi.fn()
    session.subscribe(listener)
    const disconnect = session.connect()
    await vi.waitFor(() => expect(session.getState().messages).toHaveLength(1))
    expect(listener).toHaveBeenCalled()
    expect(provider.loads).toEqual([{ endpoint: '/projects/p1/chat', projectId: 'p1' }])
    disconnect()
  })

  it('does not load history before connect, or when loadOnMount is false', async () => {
    const provider = fakeProvider([[message('s1', 'user', 'hello')]])
    createChatSession(options(provider))
    const quiet = createChatSession(options(provider, { loadOnMount: false }))
    quiet.connect()
    await Promise.resolve()
    expect(provider.loadHistory).not.toHaveBeenCalled()
  })

  it('streams a send into the transcript and keeps control identities', async () => {
    vi.useFakeTimers()
    const provider = fakeProvider()
    const session = createChatSession(options(provider, { loadOnMount: false }))
    const { controls } = session
    session.connect()
    const sending = controls.sendMessage('hi')
    expect(session.getState().isLoading).toBe(true)
    provider.emit({ type: 'message_start', id: 'a1', timestamp: 1 })
    provider.emit({ type: 'text', content: 'Hello' })
    vi.advanceTimersByTime(50)
    provider.emit({ type: 'done' })
    provider.finish()
    await sending
    const { messages, isLoading } = session.getState()
    expect(isLoading).toBe(false)
    expect(messages.map((m) => [m.role, m.content])).toEqual([
      ['user', 'hi'],
      ['assistant', 'Hello'],
    ])
    expect(session.controls).toBe(controls)
  })

  it('shares one transcript between sessions of the same project', async () => {
    const provider = fakeProvider([[message('s1', 'user', 'hello')]])
    const a = createChatSession(options(provider))
    const b = createChatSession(options(provider, { loadOnMount: false }))
    a.connect()
    await vi.waitFor(() => expect(a.getState().messages).toHaveLength(1))
    expect(b.getState().messages).toBe(a.getState().messages)
  })

  it('moves to another project store on a projectId change, without a load', async () => {
    const provider = fakeProvider([[message('s1', 'user', 'hello')]])
    const session = createChatSession(options(provider, { endpoint: '/chat' }))
    const listener = vi.fn()
    session.subscribe(listener)
    session.connect()
    await vi.waitFor(() => expect(session.getState().messages).toHaveLength(1))
    listener.mockClear()
    session.update(options(provider, { endpoint: '/chat', projectId: 'p2' }))
    expect(session.getState().messages).toEqual([])
    expect(listener).toHaveBeenCalled()
    expect(provider.loadHistory).toHaveBeenCalledTimes(1)
  })

  it('treats an endpoint naming another conversation as a switch and loads it', async () => {
    const provider = fakeProvider([
      [message('s1', 'user', 'first')],
      [message('s2', 'user', 'second')],
    ])
    const session = createChatSession(
      options(provider, { endpoint: '/projects/p1/chat?conversationId=c1' }),
    )
    session.connect()
    await vi.waitFor(() => expect(session.getState().messages[0]?.content).toBe('first'))
    session.update(options(provider, { endpoint: '/projects/p1/chat?conversationId=c2' }))
    // The old transcript is cleared at once, before the new history arrives.
    expect(session.getState().messages).toEqual([])
    await vi.waitFor(() => expect(session.getState().messages[0]?.content).toBe('second'))
  })

  it('does not load on an endpoint change while disconnected', async () => {
    const provider = fakeProvider()
    const session = createChatSession(options(provider, { endpoint: '/chat?conversationId=c1' }))
    session.update(options(provider, { endpoint: '/chat?conversationId=c2' }))
    await Promise.resolve()
    expect(provider.loadHistory).not.toHaveBeenCalled()
  })

  it('stops notifying after unsubscribe', () => {
    const session = createChatSession(options(fakeProvider(), { loadOnMount: false }))
    const listener = vi.fn()
    const unsubscribe = session.subscribe(listener)
    unsubscribe()
    session.controls.setMode('plan')
    expect(listener).not.toHaveBeenCalled()
    expect(session.getState().mode).toBe('plan')
  })

  it('calls the latest callbacks after update', () => {
    const first = vi.fn()
    const latest = vi.fn()
    const provider = fakeProvider()
    const session = createChatSession(options(provider, { onModeChange: first }))
    session.update(options(provider, { onModeChange: latest }))
    session.controls.setMode('plan')
    expect(first).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledWith('plan')
  })

  it('keeps a queued message in the injected persistence', async () => {
    const provider = fakeProvider()
    const persistence = recordingPersistence()
    const session = createChatSession(options(provider, { loadOnMount: false, persistence }))
    session.connect()
    void session.controls.sendMessage('first')
    await session.controls.sendMessage('second')
    expect(persistence.items.get('mol-chat-streaming-p1')).toBe('1')
    const queue = JSON.parse(persistence.items.get('mol-chat-queue-p1') ?? '[]') as {
      message: string
    }[]
    expect(queue.map((entry) => entry.message)).toEqual(['second'])
    expect(session.getState().messages.map((m) => m.queued ?? false)).toEqual([false, true])
  })

  it('works without any storage (the default persistence is absent in this environment)', async () => {
    const provider = fakeProvider()
    const session = createChatSession(options(provider, { loadOnMount: false }))
    session.connect()
    void session.controls.sendMessage('first')
    await expect(session.controls.sendMessage('second')).resolves.toBeUndefined()
    expect(session.getState().messages).toHaveLength(2)
  })

  it('a send before connect still goes out, and a send after disconnect is dropped', async () => {
    const provider = fakeProvider()
    const session = createChatSession(options(provider, { loadOnMount: false }))
    void session.controls.sendMessage('early')
    expect(provider.sendMessage).toHaveBeenCalledTimes(1)
    provider.finish()
    const disconnect = session.connect()
    disconnect()
    await session.controls.sendMessage('late')
    expect(provider.sendMessage).toHaveBeenCalledTimes(1)
  })
})
