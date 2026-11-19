// @vitest-environment jsdom

/**
 * Durable queued messages, background-task progress and conversation-scoped
 * state — React's `useChat.progress-queue.test.tsx` in Svelte's idiom.
 *
 * The behaviour lives in `@molecule/app-ai-chat`'s shared session, which this
 * hook wraps. The mounting surface is the package's usual one: `svelte`'s
 * context and lifecycle functions are stubbed and `renderChat` runs the hook the
 * way a component's init does, then its mount callbacks (React's committed
 * effect). A conversation switch is a store set, as a new prop is a re-render.
 *
 * @module
 */

import { get, type Readable, writable } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  BackgroundTaskState,
  ChatConfig,
  ChatEventHandler,
  ChatMessage,
  ChatProvider,
  ChatStreamEvent,
} from '@molecule/app-ai-chat'

import { setMoleculeContext } from '../context.js'
import { resetChatStoresForTests, useChat, type UseChatOptions } from '../stores/chat.js'

const svelteLifecycle = vi.hoisted(() => ({
  contextStore: new Map<symbol, unknown>(),
  mountCallbacks: [] as Array<() => void | (() => void)>,
  destroyCallbacks: [] as Array<() => void>,
}))

vi.mock('svelte', () => ({
  getContext: (key: symbol): unknown => svelteLifecycle.contextStore.get(key),
  setContext: (key: symbol, value: unknown): void => {
    svelteLifecycle.contextStore.set(key, value)
  },
  onMount: (callback: () => void | (() => void)): void => {
    svelteLifecycle.mountCallbacks.push(callback)
  },
  onDestroy: (callback: () => void): void => {
    svelteLifecycle.destroyCallbacks.push(callback)
  },
  untrack: <T>(callback: () => T): T => callback(),
}))

const task: BackgroundTaskState = {
  id: 'summary-1',
  kind: 'agent',
  command: 'Summarize context',
  status: 'running',
  startedAt: 1000,
  outputChars: 0,
}

/** The test provider, with the extra state the cases assert on. */
interface QueueProvider extends ChatProvider {
  lastMeta: Record<string, unknown>
  isServerStreaming: boolean
}

/** Keep the primary stream open while independent queue and progress events arrive. */
function fixture(durable = true): {
  provider: QueueProvider
  emit: (event: ChatStreamEvent) => void
  finish: () => void
} {
  let emit: ChatEventHandler = () => {}
  let finish = (): void => {}
  const provider: QueueProvider = {
    name: 'test',
    lastMeta: {},
    isServerStreaming: false,
    sendMessage: vi.fn<ChatProvider['sendMessage']>((_message, _config, onEvent) => {
      emit = onEvent
      return new Promise<void>((resolve) => {
        finish = () => {
          onEvent({ type: 'done' })
          resolve()
        }
      })
    }),
    abort: vi.fn<ChatProvider['abort']>(() => finish()),
    clearHistory: vi.fn<ChatProvider['clearHistory']>(async () => {}),
    loadHistory: vi.fn<ChatProvider['loadHistory']>(async () => []),
    ...(durable
      ? {
          queueMessage: vi.fn<NonNullable<ChatProvider['queueMessage']>>(
            async (message: string, config: ChatConfig, onEvent: ChatEventHandler) => {
              onEvent({
                type: 'message',
                message: {
                  id: config.messageId ?? '',
                  role: 'user',
                  content: message,
                  timestamp: Date.now(),
                  queued: true,
                },
              })
            },
          ),
          editQueuedMessage: vi.fn<NonNullable<ChatProvider['editQueuedMessage']>>(async () => {}),
          deleteQueuedMessage: vi.fn<NonNullable<ChatProvider['deleteQueuedMessage']>>(
            async () => {},
          ),
        }
      : {}),
  }
  return {
    provider,
    emit: (event: ChatStreamEvent) => emit(event),
    finish: () => finish(),
  }
}

/** The chat hooks this file mounted, torn down after each case. */
const stops: Array<() => void> = []

/**
 * Runs `useChat` once, the way a component's init does, under `provider`'s chat
 * context, then runs the component's mount callbacks (React's committed effect).
 *
 * @param provider - The chat provider to set in context.
 * @param options - The chat options, as a value or a store the case can set.
 * @returns The hook's result and its unmount.
 */
function renderChat(
  provider: ChatProvider,
  options: UseChatOptions | Readable<UseChatOptions>,
): { chat: ReturnType<typeof useChat>; stop: () => void } {
  svelteLifecycle.contextStore.clear()
  svelteLifecycle.mountCallbacks.length = 0
  svelteLifecycle.destroyCallbacks.length = 0
  setMoleculeContext({ chat: provider })
  const chat = useChat(options)
  const mountCallbacks = svelteLifecycle.mountCallbacks.splice(0)
  const destroyCallbacks = svelteLifecycle.destroyCallbacks.splice(0)
  const cleanups: Array<() => void> = []
  for (const callback of mountCallbacks) {
    const cleanup = callback()
    if (typeof cleanup === 'function') cleanups.push(cleanup)
  }
  const stop = (): void => {
    for (const cleanup of cleanups.splice(0)) cleanup()
    for (const callback of destroyCallbacks.splice(0)) callback()
  }
  stops.push(stop)
  return { chat, stop }
}

/** Let every pending microtask (a send loop's continuation) run. */
const flush = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0)
}

beforeEach(() => {
  vi.useFakeTimers()
  resetChatStoresForTests()
  sessionStorage.clear()
})

afterEach(() => {
  for (const stop of stops.splice(0)) stop()
  resetChatStoresForTests()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('conversation background work', () => {
  it('does not clear a new conversation when an older clear request finishes', async () => {
    const f = fixture()
    let finishClear = (): void => {}
    vi.mocked(f.provider.clearHistory).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishClear = resolve
        }),
    )
    const options = writable<UseChatOptions>({
      endpoint: '/chat?conversationId=old',
      projectId: 'p',
      loadOnMount: false,
    })
    const { chat } = renderChat(f.provider, options)
    const clearing = chat.clearHistory()
    options.set({ endpoint: '/chat?conversationId=new', projectId: 'p', loadOnMount: false })
    chat.applyRemoteEvent({ type: 'background_task', task: { ...task, id: 'new' } })
    finishClear()
    await clearing
    await flush()
    expect(get(chat.backgroundTasks)[0].id).toBe('new')
  })

  it('handles progress before message_start on local and remote streams without inventing an assistant', async () => {
    const f = fixture()
    const options: UseChatOptions = { endpoint: '/chat', projectId: 'p', loadOnMount: false }
    const { chat } = renderChat(f.provider, options)
    void chat.sendMessage('hello')
    f.emit({ type: 'background_task', task })
    expect(get(chat.backgroundTasks)).toEqual([task])
    expect(get(chat.messages).filter((message) => message.role === 'assistant')).toHaveLength(0)
    chat.applyRemoteEvent({ type: 'background_task', task: { ...task, outputChars: 512 } })
    expect(get(chat.backgroundTasks)[0].outputChars).toBe(512)
    await f.finish()
  })

  it('preserves progress across remount and ignores stale running snapshots after cancellation', async () => {
    const f = fixture()
    const options: UseChatOptions = { endpoint: '/chat', projectId: 'p', loadOnMount: false }
    const first = renderChat(f.provider, options)
    void first.chat.sendMessage('hello')
    f.emit({ type: 'background_task', task })
    first.stop()
    const second = renderChat(f.provider, options)
    f.emit({
      type: 'background_task',
      task: { ...task, status: 'cancelled', finishedAt: 2000, outputChars: 200 },
    })
    second.chat.applyRemoteEvent({ type: 'background_task', task })
    expect(get(second.chat.backgroundTasks)[0]).toMatchObject({
      status: 'cancelled',
      outputChars: 200,
    })
    await f.finish()
  })

  it('clears tasks on conversation switch and refuses late history from the old conversation', async () => {
    const f = fixture()
    let resolveOld = (_messages: ChatMessage[]): void => {}
    vi.mocked(f.provider.loadHistory)
      .mockImplementationOnce(
        () =>
          new Promise<ChatMessage[]>((resolve) => {
            resolveOld = resolve
          }),
      )
      .mockImplementationOnce(async () => {
        f.provider.lastMeta = { backgroundTasks: [{ ...task, id: 'new', status: 'succeeded' }] }
        return []
      })
    const options = writable<UseChatOptions>({
      endpoint: '/chat?conversationId=old',
      projectId: 'p',
    })
    const { chat } = renderChat(f.provider, options)
    chat.applyRemoteEvent({ type: 'background_task', task })
    options.set({ endpoint: '/chat?conversationId=new', projectId: 'p' })
    await flush()
    expect(get(chat.backgroundTasks).map((item) => item.id)).toEqual(['new'])
    f.provider.lastMeta = { backgroundTasks: [task] }
    resolveOld([])
    await flush()
    expect(get(chat.backgroundTasks).map((item) => item.id)).toEqual(['new'])
    await chat.clearHistory()
    expect(get(chat.backgroundTasks)).toEqual([])
  })
})

describe('durable queued messages', () => {
  it('tracks a teammate’s queued message and deletion while our stream is active', async () => {
    const f = fixture()
    const options: UseChatOptions = { endpoint: '/chat', projectId: 'p', loadOnMount: false }
    const { chat } = renderChat(f.provider, options)
    void chat.sendMessage('first')
    const queued: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: 'teammate',
      timestamp: 1,
      queued: true,
    }
    chat.applyRemoteEvent({ type: 'message', message: queued })
    await chat.editQueuedMessage(queued.id, 'edited')
    expect(f.provider.editQueuedMessage).toHaveBeenCalledWith(
      queued.id,
      'edited',
      expect.any(Object),
    )
    chat.applyRemoteEvent({ type: 'queue_removed', messageId: queued.id })
    chat.applyRemoteEvent({ type: 'message', message: queued })
    expect(get(chat.messages).some((message) => message.id === queued.id)).toBe(false)
    await f.finish()
    vi.mocked(f.provider.loadHistory).mockResolvedValue([queued])
    await chat.reconcileHistory()
    expect(get(chat.messages).some((message) => message.id === queued.id)).toBe(false)
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
  })

  it('acknowledges hidden driver messages without rendering them', async () => {
    const f = fixture()
    vi.mocked(f.provider.queueMessage!).mockImplementation(
      async (message: string, config: ChatConfig, onEvent: ChatEventHandler) => {
        onEvent({
          type: 'message',
          message: {
            id: config.messageId ?? '',
            role: 'user',
            content: message,
            timestamp: 1,
            queued: true,
            hidden: true,
          },
        })
      },
    )
    const options: UseChatOptions = { endpoint: '/chat', projectId: 'p', loadOnMount: false }
    const { chat } = renderChat(f.provider, options)
    void chat.sendMessage('first')
    await chat.sendMessage('internal driver', undefined, { suppressUserMessage: true })
    const config = vi.mocked(f.provider.queueMessage!).mock.calls[0][1]
    expect(get(chat.messages).some((message) => message.content === 'internal driver')).toBe(false)
    f.emit({
      type: 'message',
      message: {
        id: config.messageId ?? '',
        role: 'user',
        content: 'internal driver',
        timestamp: 2,
        queued: false,
        hidden: true,
      },
    })
    await f.finish()
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
    expect(get(chat.messages).some((message) => message.hidden)).toBe(false)
  })

  it('retains durable pending work on Stop and can delete it afterward', async () => {
    const f = fixture()
    const options: UseChatOptions = { endpoint: '/chat', projectId: 'p', loadOnMount: false }
    const { chat } = renderChat(f.provider, options)
    void chat.sendMessage('first')
    await chat.sendMessage('next')
    const id = get(chat.messages).find((message) => message.queued)?.id ?? ''
    chat.abort()
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
    expect(get(chat.messages).find((message) => message.id === id)?.queued).toBe(true)
    await chat.deleteQueuedMessage(id)
    expect(f.provider.deleteQueuedMessage).toHaveBeenCalledWith(id, expect.any(Object))
  })

  it('queues against another client’s live turn without starting or aborting a stream', async () => {
    const f = fixture()
    const options: UseChatOptions = { endpoint: '/chat', projectId: 'p', loadOnMount: false }
    const { chat } = renderChat(f.provider, options)
    chat.applyRemoteEvent({ type: 'message_start', id: 'remote', timestamp: 1 })
    await chat.sendMessage('next')
    expect(f.provider.queueMessage).toHaveBeenCalledTimes(1)
    expect(f.provider.sendMessage).not.toHaveBeenCalled()
    expect(f.provider.abort).not.toHaveBeenCalled()
    expect(get(chat.isRemoteStreaming)).toBe(true)
  })

  it('sends during the active turn, retains acceptance, then clears only the matching delivery', async () => {
    const f = fixture()
    const options: UseChatOptions = { endpoint: '/chat', projectId: 'p', loadOnMount: false }
    const { chat } = renderChat(f.provider, options)
    void chat.sendMessage('first')
    await chat.sendMessage('next')
    expect(f.provider.queueMessage).toHaveBeenCalledTimes(1)
    const queued = get(chat.messages).find((message) => message.content === 'next')
    expect(queued).toBeDefined()
    expect(queued?.id).toMatch(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/)
    expect(queued?.queued).toBe(true)
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
    expect(f.provider.abort).not.toHaveBeenCalled()
    expect(get(chat.isLoading)).toBe(true)
    if (queued) f.emit({ type: 'message', message: { ...queued, queued: false, timestamp: 3000 } })
    expect(get(chat.messages).find((message) => message.id === queued?.id)?.queued).toBe(false)
    if (queued) chat.applyRemoteEvent({ type: 'message', message: queued })
    expect(get(chat.messages).find((message) => message.id === queued?.id)?.queued).toBe(false)
    await f.finish()
    await flush()
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
  })

  it('updates and deletes durable items only after the server accepts, preserving conflicts', async () => {
    const f = fixture()
    const options: UseChatOptions = { endpoint: '/chat', projectId: 'p', loadOnMount: false }
    const { chat } = renderChat(f.provider, options)
    void chat.sendMessage('first')
    await chat.sendMessage('next')
    const id = get(chat.messages).find((message) => message.queued)?.id ?? ''
    vi.mocked(f.provider.editQueuedMessage!).mockRejectedValueOnce(new Error('Already delivered'))
    await chat.editQueuedMessage(id, 'wrong')
    expect(get(chat.messages).find((message) => message.id === id)?.content).toBe('next')
    expect(get(chat.error)).toBe('Already delivered')
    await chat.editQueuedMessage(id, 'edited')
    expect(get(chat.messages).find((message) => message.id === id)?.content).toBe('edited')
    vi.mocked(f.provider.deleteQueuedMessage!).mockRejectedValueOnce(new Error('Already delivered'))
    await chat.deleteQueuedMessage(id)
    expect(get(chat.messages).some((message) => message.id === id)).toBe(true)
    await chat.deleteQueuedMessage(id)
    expect(get(chat.messages).some((message) => message.id === id)).toBe(false)
    await f.finish()
  })

  it('retains FIFO and original UUID when the turn ends before queued delivery', async () => {
    const f = fixture()
    const options: UseChatOptions = { endpoint: '/chat', projectId: 'p', loadOnMount: false }
    const { chat } = renderChat(f.provider, options)
    void chat.sendMessage('first')
    await chat.sendMessage('second')
    await chat.sendMessage('third')
    const pending = get(chat.messages).filter((message) => message.queued)
    vi.mocked(f.provider.sendMessage).mockImplementation(
      async (message: string, config: ChatConfig, onEvent: ChatEventHandler) => {
        onEvent({
          type: 'message',
          message: {
            id: config.messageId ?? '',
            role: 'user',
            content: message,
            timestamp: Date.now(),
            queued: false,
          },
        })
        onEvent({ type: 'done' })
      },
    )
    f.finish()
    await flush()
    const calls = vi.mocked(f.provider.sendMessage).mock.calls
    expect(calls.slice(1).map(([message]) => message)).toEqual(['second', 'third'])
    expect(calls.slice(1).map(([, config]) => config.messageId)).toEqual(
      pending.map((message) => message.id),
    )
    expect(get(chat.messages).filter((message) => message.queued)).toHaveLength(0)
  })

  it('restores queued handles from history and resends their UUID without losing attachments on the server', async () => {
    const f = fixture()
    const id = crypto.randomUUID()
    vi.mocked(f.provider.loadHistory).mockResolvedValue([
      {
        id,
        role: 'user',
        content: 'restored',
        timestamp: 1,
        queued: true,
        attachments: [{ filename: 'image.png', mediaType: 'image/png', size: 100 }],
      },
    ])
    const options: UseChatOptions = { endpoint: '/chat?conversationId=one', projectId: 'p' }
    const { chat } = renderChat(f.provider, options)
    await Promise.resolve()
    await flush()
    expect(f.provider.sendMessage).toHaveBeenCalledWith(
      'restored',
      expect.objectContaining({ messageId: id }),
      expect.any(Function),
      undefined,
    )
    expect(get(chat.messages).find((message) => message.id === id)?.queued).toBe(true)
    f.emit({
      type: 'message',
      message: { id, role: 'user', content: 'restored', timestamp: 2, queued: false },
    })
    await f.finish()
  })

  it('keeps the full-turn fallback for providers without a durable queue', async () => {
    const f = fixture(false)
    const options: UseChatOptions = { endpoint: '/chat', projectId: 'p', loadOnMount: false }
    const { chat } = renderChat(f.provider, options)
    void chat.sendMessage('first')
    await chat.sendMessage('next')
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
    vi.mocked(f.provider.sendMessage).mockImplementation(
      async (_message: string, _config: ChatConfig, onEvent: ChatEventHandler) =>
        onEvent({ type: 'done' }),
    )
    f.finish()
    await flush()
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(2)
    expect(get(chat.messages).filter((message) => message.queued)).toHaveLength(0)
  })

  it('starts the legacy queued turn when a remotely owned turn finishes', async () => {
    const f = fixture(false)
    vi.mocked(f.provider.sendMessage).mockImplementation(
      async (_message: string, _config: ChatConfig, onEvent: ChatEventHandler) =>
        onEvent({ type: 'done' }),
    )
    const options: UseChatOptions = { endpoint: '/chat', projectId: 'p', loadOnMount: false }
    const { chat } = renderChat(f.provider, options)
    chat.applyRemoteEvent({ type: 'message_start', id: 'remote', timestamp: 1 })
    await chat.sendMessage('next')
    await chat.sendMessage('then')
    const queuedIds = get(chat.messages)
      .filter((message) => message.queued)
      .map((message) => message.id)
    expect(f.provider.sendMessage).not.toHaveBeenCalled()
    chat.applyRemoteEvent({ type: 'done' })
    await flush()
    expect(
      vi
        .mocked(f.provider.sendMessage)
        .mock.calls.map(([message, config]) => [message, config.messageId]),
    ).toEqual([
      ['next', queuedIds[0]],
      ['then', queuedIds[1]],
    ])
    expect(get(chat.messages).filter((message) => message.queued)).toHaveLength(0)
  })

  it.each(['error', 'stop'] as const)(
    'does not start queued turns after remote %s',
    async (ending) => {
      const f = fixture()
      const options: UseChatOptions = { endpoint: '/chat', projectId: 'p', loadOnMount: false }
      const { chat } = renderChat(f.provider, options)
      chat.applyRemoteEvent({ type: 'message_start', id: 'remote', timestamp: 1 })
      await chat.sendMessage('next')
      if (ending === 'stop') {
        chat.abort()
        chat.applyRemoteEvent({ type: 'done' })
      } else {
        chat.applyRemoteEvent({ type: 'error', message: 'Remote failed' })
      }
      await flush()
      expect(f.provider.sendMessage).not.toHaveBeenCalled()
      expect(get(chat.messages).filter((message) => message.queued)).toHaveLength(1)
    },
  )

  it('restores Stop after refresh without sending retained messages and keeps them editable', async () => {
    const f = fixture()
    const options: UseChatOptions = { endpoint: '/chat', projectId: 'p', loadOnMount: false }
    const first = renderChat(f.provider, options)
    void first.chat.sendMessage('first')
    await first.chat.sendMessage('retained')
    const queued = get(first.chat.messages).find((message) => message.queued)
    expect(queued).toBeDefined()
    first.chat.abort()
    first.stop()
    resetChatStoresForTests()
    vi.mocked(f.provider.sendMessage).mockClear()
    vi.mocked(f.provider.loadHistory).mockImplementation(async () => {
      f.provider.lastMeta = { userStoppedAt: '2026-10-20T12:00:00.000Z' }
      return queued ? [queued] : []
    })
    const second = renderChat(f.provider, { endpoint: '/chat', projectId: 'p' })
    await flush()
    expect(f.provider.sendMessage).not.toHaveBeenCalled()
    expect(get(second.chat.messages)).toEqual(queued ? [queued] : [])
    if (!queued) return
    await second.chat.editQueuedMessage(queued.id, 'edited')
    expect(f.provider.editQueuedMessage).toHaveBeenCalled()
    expect(get(second.chat.messages)[0].content).toBe('edited')
    await second.chat.sendMessage('autofix', undefined, { automatic: true })
    expect(f.provider.sendMessage).not.toHaveBeenCalled()
    await second.chat.deleteQueuedMessage(queued.id)
    expect(f.provider.deleteQueuedMessage).toHaveBeenCalled()
    expect(get(second.chat.messages)).toEqual([])
    void second.chat.sendMessage('continue explicitly')
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
    await f.finish()
  })

  it('does not restore stale Stop metadata after a newer explicit send', async () => {
    const f = fixture()
    let resolveHistory = (_history: ChatMessage[]): void => {}
    vi.mocked(f.provider.loadHistory).mockImplementationOnce(
      () =>
        new Promise<ChatMessage[]>((resolve) => {
          resolveHistory = resolve
        }),
    )
    vi.mocked(f.provider.sendMessage).mockImplementation(
      async (_message: string, _config: ChatConfig, onEvent: ChatEventHandler) =>
        onEvent({ type: 'done' }),
    )
    const { chat } = renderChat(f.provider, { endpoint: '/chat', projectId: 'p' })
    await chat.sendMessage('continue explicitly')
    f.provider.lastMeta = { userStoppedAt: '2026-10-20T12:00:00.000Z' }
    resolveHistory([])
    await flush()
    await chat.sendMessage('autofix', undefined, { automatic: true })
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(2)
  })

  it('preserves an unacknowledged persisted queue when the history read fails', async () => {
    const f = fixture()
    const pending = [{ message: 'not acknowledged', userMsgId: crypto.randomUUID(), durable: true }]
    sessionStorage.setItem('mol-chat-queue-p', JSON.stringify(pending))
    vi.mocked(f.provider.loadHistory).mockRejectedValue(new Error('HTTP 503'))
    const first = renderChat(f.provider, { endpoint: '/chat', projectId: 'p' })
    await flush()
    expect(f.provider.sendMessage).not.toHaveBeenCalled()
    expect(JSON.parse(sessionStorage.getItem('mol-chat-queue-p') ?? '[]')).toEqual(pending)
    first.stop()
    resetChatStoresForTests()
    vi.mocked(f.provider.loadHistory).mockResolvedValue([])
    renderChat(f.provider, { endpoint: '/chat', projectId: 'p' })
    await flush()
    expect(f.provider.sendMessage).toHaveBeenCalledWith(
      'not acknowledged',
      expect.objectContaining({ messageId: pending[0].userMsgId }),
      expect.any(Function),
      undefined,
    )
    await f.finish()
  })

  it('does not resurrect an accepted queued message absent from fresh server history', async () => {
    const f = fixture()
    sessionStorage.setItem(
      'mol-chat-queue-p',
      JSON.stringify([
        {
          message: 'deleted elsewhere',
          userMsgId: crypto.randomUUID(),
          durable: true,
          accepted: true,
        },
      ]),
    )
    renderChat(f.provider, { endpoint: '/chat', projectId: 'p' })
    await Promise.resolve()
    await flush()
    expect(f.provider.sendMessage).not.toHaveBeenCalled()
    expect(f.provider.queueMessage).not.toHaveBeenCalled()
  })

  it('reconciles deleted accepted items while preserving acceptance newer than the history request', async () => {
    const f = fixture()
    const options: UseChatOptions = { endpoint: '/chat', projectId: 'p', loadOnMount: false }
    const { chat } = renderChat(f.provider, options)
    void chat.sendMessage('first')
    await chat.sendMessage('deleted')
    let resolve = (_messages: ChatMessage[]): void => {}
    vi.mocked(f.provider.loadHistory).mockImplementationOnce(
      () =>
        new Promise<ChatMessage[]>((done) => {
          resolve = done
        }),
    )
    const reconciliation = chat.reconcileHistory()
    await chat.sendMessage('newer')
    resolve([])
    await reconciliation
    expect(
      get(chat.messages)
        .filter((message) => message.queued)
        .map((message) => message.content),
    ).toEqual(['newer'])
    const id = get(chat.messages).find((message) => message.queued)?.id ?? ''
    await chat.deleteQueuedMessage(id)
    await f.finish()
  })

  it('reuses the original UUID on a never-acknowledged send retry', async () => {
    const f = fixture()
    vi.mocked(f.provider.sendMessage)
      .mockImplementationOnce(
        async (_message: string, _config: ChatConfig, onEvent: ChatEventHandler) =>
          onEvent({ type: 'error', status: 503, message: 'Try again' }),
      )
      .mockImplementationOnce(
        async (_message: string, _config: ChatConfig, onEvent: ChatEventHandler) =>
          onEvent({ type: 'done' }),
      )
    const options: UseChatOptions = { endpoint: '/chat', projectId: 'p', loadOnMount: false }
    const { chat } = renderChat(f.provider, options)
    await chat.sendMessage('once')
    await vi.advanceTimersByTimeAsync(5000)
    const calls = vi.mocked(f.provider.sendMessage).mock.calls
    expect(calls).toHaveLength(2)
    expect(calls[1][1].messageId).toBe(calls[0][1].messageId)
    expect(get(chat.messages).filter((message) => message.content === 'once')).toHaveLength(1)
  })
})
