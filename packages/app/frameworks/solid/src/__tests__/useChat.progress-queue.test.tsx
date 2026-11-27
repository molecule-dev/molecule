// @vitest-environment jsdom

/**
 * The Solid counterpart of React's `useChat.progress-queue.test.tsx`:
 * background-task progress and the durable queued-message queue, under the same
 * titles.
 *
 * The behavior lives in the shared `createChatSession`, so the provider script
 * and the assertions are the React ones; only `renderHook` becomes a mounted
 * probe whose accessors are read, and `rerender` becomes a write to the options
 * accessor the primitive follows.
 *
 * @module
 */

import { type Accessor, createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import type {
  BackgroundTaskState,
  ChatConfig,
  ChatEventHandler,
  ChatMessage,
  ChatProvider,
} from '@molecule/app-ai-chat'

import { ChatContext } from '../chat-context.js'
import {
  resetChatStoresForTests,
  useChat,
  type UseChatOptions,
  type UseChatResult,
} from '../primitives/chat.js'

const task: BackgroundTaskState = {
  id: 'summary-1',
  kind: 'agent',
  command: 'Summarize context',
  status: 'running',
  startedAt: 1000,
  outputChars: 0,
}

/** The fixture provider, with every method a mock the test can re-script. */
interface ProgressQueueProvider extends ChatProvider {
  lastMeta: Record<string, unknown>
  isServerStreaming: boolean
  sendMessage: Mock<ChatProvider['sendMessage']>
  abort: Mock<ChatProvider['abort']>
  clearHistory: Mock<ChatProvider['clearHistory']>
  loadHistory: Mock<ChatProvider['loadHistory']>
  queueMessage?: Mock<NonNullable<ChatProvider['queueMessage']>>
  editQueuedMessage?: Mock<NonNullable<ChatProvider['editQueuedMessage']>>
  deleteQueuedMessage?: Mock<NonNullable<ChatProvider['deleteQueuedMessage']>>
}

/**
 * Keep the primary stream open while independent queue and progress events
 * arrive.
 *
 * @param durable - Whether the provider implements the durable queue.
 * @returns The provider and the stream controls.
 */
function fixture(durable = true): {
  provider: ProgressQueueProvider
  emit: (event: Parameters<ChatEventHandler>[0]) => void
  finish: () => void
} {
  let emit: ChatEventHandler = () => {}
  let finish = (): void => {}
  const provider: ProgressQueueProvider = {
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
    emit: (event: Parameters<ChatEventHandler>[0]) => emit(event),
    finish: () => finish(),
  }
}

const disposers: Array<() => void> = []

/**
 * Mounts `useChat` against a provider and returns the primitive.
 *
 * @param provider - The chat provider to provide.
 * @param options - The chat options, or an accessor the test can write through.
 * @returns The chat primitive and its unmount.
 */
function mountChat(
  provider: ChatProvider,
  options: UseChatOptions | Accessor<UseChatOptions>,
): { chat: UseChatResult; unmount: () => void } {
  let captured: UseChatResult | undefined
  function Probe(): JSX.Element {
    captured = useChat(options)
    return <></>
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => (
      <ChatContext.Provider value={provider}>
        <Probe />
      </ChatContext.Provider>
    ),
    container,
  )
  let mounted = true
  const unmount = (): void => {
    if (!mounted) return
    mounted = false
    dispose()
    container.remove()
  }
  disposers.push(unmount)
  if (captured === undefined) throw new Error('the probe did not create useChat')
  return { chat: captured, unmount }
}

/** Lets queued microtasks and zero-delay timers run. */
const flush = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0)
}

beforeEach(() => {
  vi.useFakeTimers()
  resetChatStoresForTests()
  sessionStorage.clear()
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  resetChatStoresForTests()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('conversation background work', () => {
  it('does not clear a new conversation when an older clear request finishes', async () => {
    const f = fixture()
    let finishClear!: () => void
    f.provider.clearHistory.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishClear = resolve
        }),
    )
    const [endpoint, setEndpoint] = createSignal('/chat?conversationId=old')
    const { chat } = mountChat(f.provider, () => ({
      endpoint: endpoint(),
      projectId: 'p',
      loadOnMount: false,
    }))
    const clearing = chat.clearHistory()
    setEndpoint('/chat?conversationId=new')
    chat.applyRemoteEvent({ type: 'background_task', task: { ...task, id: 'new' } })
    finishClear()
    await clearing
    expect(chat.backgroundTasks()[0].id).toBe('new')
  })

  it('handles progress before message_start on local and remote streams without inventing an assistant', async () => {
    const f = fixture()
    const { chat } = mountChat(f.provider, {
      endpoint: '/chat',
      projectId: 'p',
      loadOnMount: false,
    })
    void chat.sendMessage('hello')
    f.emit({ type: 'background_task', task })
    expect(chat.backgroundTasks()).toEqual([task])
    expect(chat.messages().filter((message) => message.role === 'assistant')).toHaveLength(0)
    chat.applyRemoteEvent({
      type: 'background_task',
      task: { ...task, outputChars: 512 },
    })
    expect(chat.backgroundTasks()[0].outputChars).toBe(512)
    f.finish()
    await flush()
  })

  it('preserves progress across remount and ignores stale running snapshots after cancellation', async () => {
    const f = fixture()
    const options = { endpoint: '/chat', projectId: 'p', loadOnMount: false }
    const first = mountChat(f.provider, options)
    void first.chat.sendMessage('hello')
    f.emit({ type: 'background_task', task })
    first.unmount()
    const second = mountChat(f.provider, options)
    f.emit({
      type: 'background_task',
      task: { ...task, status: 'cancelled', finishedAt: 2000, outputChars: 200 },
    })
    second.chat.applyRemoteEvent({ type: 'background_task', task })
    expect(second.chat.backgroundTasks()[0]).toMatchObject({
      status: 'cancelled',
      outputChars: 200,
    })
    f.finish()
    await flush()
  })

  it('clears tasks on conversation switch and refuses late history from the old conversation', async () => {
    const f = fixture()
    let resolveOld!: (messages: ChatMessage[]) => void
    f.provider.loadHistory
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
    const [endpoint, setEndpoint] = createSignal('/chat?conversationId=old')
    const { chat } = mountChat(f.provider, () => ({ endpoint: endpoint(), projectId: 'p' }))
    chat.applyRemoteEvent({ type: 'background_task', task })
    setEndpoint('/chat?conversationId=new')
    await flush()
    expect(chat.backgroundTasks().map((item) => item.id)).toEqual(['new'])
    f.provider.lastMeta = { backgroundTasks: [task] }
    resolveOld([])
    await flush()
    expect(chat.backgroundTasks().map((item) => item.id)).toEqual(['new'])
    await chat.clearHistory()
    expect(chat.backgroundTasks()).toEqual([])
  })
})

describe('durable queued messages', () => {
  it('tracks a teammate’s queued message and deletion while our stream is active', async () => {
    const f = fixture()
    const { chat } = mountChat(f.provider, {
      endpoint: '/chat',
      projectId: 'p',
      loadOnMount: false,
    })
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
    expect(chat.messages().some((message) => message.id === queued.id)).toBe(false)
    f.finish()
    await flush()
    f.provider.loadHistory.mockResolvedValue([queued])
    await chat.reconcileHistory()
    expect(chat.messages().some((message) => message.id === queued.id)).toBe(false)
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
  })

  it('acknowledges hidden driver messages without rendering them', async () => {
    const f = fixture()
    f.provider.queueMessage?.mockImplementation(async (message, config, onEvent) => {
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
    })
    const { chat } = mountChat(f.provider, {
      endpoint: '/chat',
      projectId: 'p',
      loadOnMount: false,
    })
    void chat.sendMessage('first')
    await chat.sendMessage('internal driver', undefined, { suppressUserMessage: true })
    const config = f.provider.queueMessage?.mock.calls[0][1]
    expect(chat.messages().some((message) => message.content === 'internal driver')).toBe(false)
    f.emit({
      type: 'message',
      message: {
        id: config?.messageId ?? '',
        role: 'user',
        content: 'internal driver',
        timestamp: 2,
        queued: false,
        hidden: true,
      },
    })
    f.finish()
    await flush()
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
    expect(chat.messages().some((message) => message.hidden)).toBe(false)
  })

  it('retains durable pending work on Stop and can delete it afterward', async () => {
    const f = fixture()
    const { chat } = mountChat(f.provider, {
      endpoint: '/chat',
      projectId: 'p',
      loadOnMount: false,
    })
    void chat.sendMessage('first')
    await chat.sendMessage('next')
    const id = chat.messages().find((message) => message.queued)?.id ?? ''
    chat.abort()
    await flush()
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
    expect(chat.messages().find((message) => message.id === id)?.queued).toBe(true)
    await chat.deleteQueuedMessage(id)
    expect(f.provider.deleteQueuedMessage).toHaveBeenCalledWith(id, expect.any(Object))
  })

  it('queues against another client’s live turn without starting or aborting a stream', async () => {
    const f = fixture()
    const { chat } = mountChat(f.provider, {
      endpoint: '/chat',
      projectId: 'p',
      loadOnMount: false,
    })
    chat.applyRemoteEvent({ type: 'message_start', id: 'remote', timestamp: 1 })
    await chat.sendMessage('next')
    expect(f.provider.queueMessage).toHaveBeenCalledTimes(1)
    expect(f.provider.sendMessage).not.toHaveBeenCalled()
    expect(f.provider.abort).not.toHaveBeenCalled()
    expect(chat.isRemoteStreaming()).toBe(true)
  })

  it('sends during the active turn, retains acceptance, then clears only the matching delivery', async () => {
    const f = fixture()
    const { chat } = mountChat(f.provider, {
      endpoint: '/chat',
      projectId: 'p',
      loadOnMount: false,
    })
    void chat.sendMessage('first')
    await chat.sendMessage('next')
    expect(f.provider.queueMessage).toHaveBeenCalledTimes(1)
    const queued = chat.messages().find((message) => message.content === 'next')
    expect(queued?.id).toMatch(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/)
    expect(queued?.queued).toBe(true)
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
    expect(f.provider.abort).not.toHaveBeenCalled()
    expect(chat.isLoading()).toBe(true)
    if (queued === undefined) throw new Error('the queued message was not rendered')
    f.emit({ type: 'message', message: { ...queued, queued: false, timestamp: 3000 } })
    expect(chat.messages().find((message) => message.id === queued.id)?.queued).toBe(false)
    chat.applyRemoteEvent({ type: 'message', message: queued })
    expect(chat.messages().find((message) => message.id === queued.id)?.queued).toBe(false)
    f.finish()
    await flush()
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
  })

  it('updates and deletes durable items only after the server accepts, preserving conflicts', async () => {
    const f = fixture()
    const { chat } = mountChat(f.provider, {
      endpoint: '/chat',
      projectId: 'p',
      loadOnMount: false,
    })
    void chat.sendMessage('first')
    await chat.sendMessage('next')
    const id = chat.messages().find((message) => message.queued)?.id ?? ''
    f.provider.editQueuedMessage?.mockRejectedValueOnce(new Error('Already delivered'))
    await chat.editQueuedMessage(id, 'wrong')
    expect(chat.messages().find((message) => message.id === id)?.content).toBe('next')
    expect(chat.error()).toBe('Already delivered')
    await chat.editQueuedMessage(id, 'edited')
    expect(chat.messages().find((message) => message.id === id)?.content).toBe('edited')
    f.provider.deleteQueuedMessage?.mockRejectedValueOnce(new Error('Already delivered'))
    await chat.deleteQueuedMessage(id)
    expect(chat.messages().some((message) => message.id === id)).toBe(true)
    await chat.deleteQueuedMessage(id)
    expect(chat.messages().some((message) => message.id === id)).toBe(false)
    f.finish()
    await flush()
  })

  it('retains FIFO and original UUID when the turn ends before queued delivery', async () => {
    const f = fixture()
    const { chat } = mountChat(f.provider, {
      endpoint: '/chat',
      projectId: 'p',
      loadOnMount: false,
    })
    void chat.sendMessage('first')
    await chat.sendMessage('second')
    await chat.sendMessage('third')
    const pending = chat.messages().filter((message) => message.queued)
    f.provider.sendMessage.mockImplementation(async (message, config, onEvent) => {
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
    })
    f.finish()
    await flush()
    const calls = f.provider.sendMessage.mock.calls
    expect(calls.slice(1).map(([message]) => message)).toEqual(['second', 'third'])
    expect(calls.slice(1).map(([, config]) => config.messageId)).toEqual(
      pending.map((message) => message.id),
    )
    expect(chat.messages().filter((message) => message.queued)).toHaveLength(0)
  })

  it('restores queued handles from history and resends their UUID without losing attachments on the server', async () => {
    const f = fixture()
    const id = crypto.randomUUID()
    f.provider.loadHistory.mockResolvedValue([
      {
        id,
        role: 'user',
        content: 'restored',
        timestamp: 1,
        queued: true,
        attachments: [{ filename: 'image.png', mediaType: 'image/png', size: 100 }],
      },
    ])
    const { chat } = mountChat(f.provider, {
      endpoint: '/chat?conversationId=one',
      projectId: 'p',
    })
    await Promise.resolve()
    await flush()
    expect(f.provider.sendMessage).toHaveBeenCalledWith(
      'restored',
      expect.objectContaining({ messageId: id }),
      expect.any(Function),
      undefined,
    )
    expect(chat.messages().find((message) => message.id === id)?.queued).toBe(true)
    f.emit({
      type: 'message',
      message: { id, role: 'user', content: 'restored', timestamp: 2, queued: false },
    })
    f.finish()
    await flush()
  })

  it('keeps the full-turn fallback for providers without a durable queue', async () => {
    const f = fixture(false)
    const { chat } = mountChat(f.provider, {
      endpoint: '/chat',
      projectId: 'p',
      loadOnMount: false,
    })
    void chat.sendMessage('first')
    await chat.sendMessage('next')
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
    f.provider.sendMessage.mockImplementation(async (_message, _config, onEvent) =>
      onEvent({ type: 'done' }),
    )
    f.finish()
    await flush()
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(2)
    expect(chat.messages().filter((message) => message.queued)).toHaveLength(0)
  })

  it('starts the legacy queued turn when a remotely owned turn finishes', async () => {
    const f = fixture(false)
    f.provider.sendMessage.mockImplementation(async (_message, _config, onEvent) =>
      onEvent({ type: 'done' }),
    )
    const { chat } = mountChat(f.provider, {
      endpoint: '/chat',
      projectId: 'p',
      loadOnMount: false,
    })
    chat.applyRemoteEvent({ type: 'message_start', id: 'remote', timestamp: 1 })
    await chat.sendMessage('next')
    await chat.sendMessage('then')
    const queuedIds = chat
      .messages()
      .filter((message) => message.queued)
      .map((message) => message.id)
    expect(f.provider.sendMessage).not.toHaveBeenCalled()
    chat.applyRemoteEvent({ type: 'done' })
    await flush()
    expect(
      f.provider.sendMessage.mock.calls.map(([message, config]) => [message, config.messageId]),
    ).toEqual([
      ['next', queuedIds[0]],
      ['then', queuedIds[1]],
    ])
    expect(chat.messages().filter((message) => message.queued)).toHaveLength(0)
  })

  it.each(['error', 'stop'] as const)(
    'does not start queued turns after remote %s',
    async (ending) => {
      const f = fixture()
      const { chat } = mountChat(f.provider, {
        endpoint: '/chat',
        projectId: 'p',
        loadOnMount: false,
      })
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
      expect(chat.messages().filter((message) => message.queued)).toHaveLength(1)
    },
  )

  it('restores Stop after refresh without sending retained messages and keeps them editable', async () => {
    const f = fixture()
    const first = mountChat(f.provider, {
      endpoint: '/chat',
      projectId: 'p',
      loadOnMount: false,
    })
    void first.chat.sendMessage('first')
    await first.chat.sendMessage('retained')
    const queued = first.chat.messages().find((message) => message.queued)
    if (queued === undefined) throw new Error('the retained message was not queued')
    first.chat.abort()
    await flush()
    first.unmount()
    resetChatStoresForTests()
    f.provider.sendMessage.mockClear()
    f.provider.loadHistory.mockImplementation(async () => {
      f.provider.lastMeta = { userStoppedAt: '2026-10-20T12:00:00.000Z' }
      return [queued]
    })
    const second = mountChat(f.provider, { endpoint: '/chat', projectId: 'p' })
    await flush()
    expect(f.provider.sendMessage).not.toHaveBeenCalled()
    expect(second.chat.messages()).toEqual([queued])
    await second.chat.editQueuedMessage(queued.id, 'edited')
    expect(f.provider.editQueuedMessage).toHaveBeenCalled()
    expect(second.chat.messages()[0].content).toBe('edited')
    await second.chat.sendMessage('autofix', undefined, { automatic: true })
    expect(f.provider.sendMessage).not.toHaveBeenCalled()
    await second.chat.deleteQueuedMessage(queued.id)
    expect(f.provider.deleteQueuedMessage).toHaveBeenCalled()
    expect(second.chat.messages()).toEqual([])
    void second.chat.sendMessage('continue explicitly')
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
    f.finish()
    await flush()
  })

  it('does not restore stale Stop metadata after a newer explicit send', async () => {
    const f = fixture()
    let resolveHistory!: (history: ChatMessage[]) => void
    f.provider.loadHistory.mockImplementationOnce(
      () =>
        new Promise<ChatMessage[]>((resolve) => {
          resolveHistory = resolve
        }),
    )
    f.provider.sendMessage.mockImplementation(async (_message, _config, onEvent) =>
      onEvent({ type: 'done' }),
    )
    const { chat } = mountChat(f.provider, { endpoint: '/chat', projectId: 'p' })
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
    f.provider.loadHistory.mockRejectedValue(new Error('HTTP 503'))
    const first = mountChat(f.provider, { endpoint: '/chat', projectId: 'p' })
    await flush()
    expect(f.provider.sendMessage).not.toHaveBeenCalled()
    expect(JSON.parse(sessionStorage.getItem('mol-chat-queue-p') ?? '[]')).toEqual(pending)
    first.unmount()
    resetChatStoresForTests()
    f.provider.loadHistory.mockResolvedValue([])
    mountChat(f.provider, { endpoint: '/chat', projectId: 'p' })
    await flush()
    expect(f.provider.sendMessage).toHaveBeenCalledWith(
      'not acknowledged',
      expect.objectContaining({ messageId: pending[0].userMsgId }),
      expect.any(Function),
      undefined,
    )
    f.finish()
    await flush()
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
    mountChat(f.provider, { endpoint: '/chat', projectId: 'p' })
    await Promise.resolve()
    await flush()
    expect(f.provider.sendMessage).not.toHaveBeenCalled()
    expect(f.provider.queueMessage).not.toHaveBeenCalled()
  })

  it('reconciles deleted accepted items while preserving acceptance newer than the history request', async () => {
    const f = fixture()
    const { chat } = mountChat(f.provider, {
      endpoint: '/chat',
      projectId: 'p',
      loadOnMount: false,
    })
    void chat.sendMessage('first')
    await chat.sendMessage('deleted')
    let resolve!: (messages: ChatMessage[]) => void
    f.provider.loadHistory.mockImplementationOnce(
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
      chat
        .messages()
        .filter((message) => message.queued)
        .map((message) => message.content),
    ).toEqual(['newer'])
    const id = chat.messages().find((message) => message.queued)?.id ?? ''
    await chat.deleteQueuedMessage(id)
    f.finish()
    await flush()
  })

  it('reuses the original UUID on a never-acknowledged send retry', async () => {
    const f = fixture()
    f.provider.sendMessage
      .mockImplementationOnce(async (_message, _config, onEvent) =>
        onEvent({ type: 'error', status: 503, message: 'Try again' }),
      )
      .mockImplementationOnce(async (_message, _config, onEvent) => onEvent({ type: 'done' }))
    const { chat } = mountChat(f.provider, {
      endpoint: '/chat',
      projectId: 'p',
      loadOnMount: false,
    })
    await chat.sendMessage('once')
    await vi.advanceTimersByTimeAsync(5000)
    const calls = f.provider.sendMessage.mock.calls
    expect(calls).toHaveLength(2)
    expect(calls[1][1].messageId).toBe(calls[0][1].messageId)
    expect(chat.messages().filter((message) => message.content === 'once')).toHaveLength(1)
  })
})
