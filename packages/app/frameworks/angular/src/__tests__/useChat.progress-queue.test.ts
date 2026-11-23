// @vitest-environment jsdom

/**
 * Background progress and the durable message queue: work that outlives a tool
 * call, progress events that arrive before a reply starts, the queue of a turn
 * in flight, acceptance/edit/delete against the server, restore after a
 * refresh, and the legacy fallback for providers without a durable queue.
 *
 * This is React's `useChat.progress-queue.test.tsx` against the Angular
 * function; every title is React's. Only the framework-forced mechanics change:
 * a mounted probe component replaces a render, the conversation endpoint is a
 * signal, and the chat state is read through signals.
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
  BackgroundTaskState,
  ChatEventHandler,
  ChatMessage,
  ChatProvider,
} from '@molecule/app-ai-chat'

import { resetChatStoresForTests, useChat } from '../chat.js'
import { provideMolecule } from '../providers.js'

const task: BackgroundTaskState = {
  id: 'summary-1',
  kind: 'agent',
  command: 'Summarize context',
  status: 'running',
  startedAt: 1000,
  outputChars: 0,
}

/** The chat provider a fixture builds, plus the metadata bag the session reads. */
interface FixtureProvider extends ChatProvider {
  /** Fields the shared session reads off the provider after a history load. */
  lastMeta: Record<string, unknown>
  /** Whether the server reports a stream still running (the resume poll). */
  isServerStreaming: boolean
}

/**
 * The options the next probe component is created with. Each test mounts at most
 * a couple of probes, one after the other, so a module-level value set just
 * before `mountChat` is the framework equivalent of passing props.
 */
let initialOptions: { endpoint: string; projectId: string; loadOnMount: boolean } = {
  endpoint: '/chat',
  projectId: 'p',
  loadOnMount: false,
}

/** Reads a chat whose conversation is a signal. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-chat-progress-queue-probe',
  template: '',
})
class ChatProgressQueueProbeComponent {
  readonly endpoint: WritableSignal<string> = signal(initialOptions.endpoint)
  readonly chat = useChat(
    computed(() => ({
      endpoint: this.endpoint(),
      projectId: initialOptions.projectId,
      loadOnMount: initialOptions.loadOnMount,
    })),
  )
}

/**
 * Mounts `useChat` against `provider` with the given options.
 *
 * @param provider - The chat provider to inject.
 * @param options - The endpoint, project and history-loading options.
 * @returns The mounted fixture, its chat result and its endpoint signal.
 */
function mountChat(
  provider: ChatProvider,
  options: Partial<{ endpoint: string; projectId: string; loadOnMount: boolean }> = {},
): {
  fixture: ComponentFixture<ChatProgressQueueProbeComponent>
  chat: ReturnType<typeof useChat>
  endpoint: WritableSignal<string>
} {
  initialOptions = {
    endpoint: options.endpoint ?? '/chat',
    projectId: options.projectId ?? 'p',
    loadOnMount: options.loadOnMount ?? false,
  }
  TestBed.configureTestingModule({
    imports: [ChatProgressQueueProbeComponent],
    providers: [provideZonelessChangeDetection(), provideMolecule({ chat: provider })],
  })
  const fixture = TestBed.createComponent(ChatProgressQueueProbeComponent)
  fixture.detectChanges()
  return {
    fixture,
    chat: fixture.componentInstance.chat,
    endpoint: fixture.componentInstance.endpoint,
  }
}

/**
 * Reads a queue message id the session supplied, failing when it supplied none.
 *
 * @param id - The id from the provider call's config.
 * @returns The id, narrowed to a string.
 */
function requireMessageId(id: string | undefined): string {
  if (!id) throw new Error('expected the session to supply a messageId')
  return id
}

/**
 * Builds a scripted provider plus the mocks the queue tests drive.
 *
 * @param durable - Whether the provider implements the durable queue methods.
 * @returns The provider, its mocks, and the stream controls.
 */
function fixture(durable = true): {
  provider: FixtureProvider
  sendMessage: Mock<ChatProvider['sendMessage']>
  abort: Mock<ChatProvider['abort']>
  clearHistory: Mock<ChatProvider['clearHistory']>
  loadHistory: Mock<ChatProvider['loadHistory']>
  queueMessage: Mock<NonNullable<ChatProvider['queueMessage']>>
  editQueuedMessage: Mock<NonNullable<ChatProvider['editQueuedMessage']>>
  deleteQueuedMessage: Mock<NonNullable<ChatProvider['deleteQueuedMessage']>>
  emit: (event: Parameters<ChatEventHandler>[0]) => void
  finish: () => void
} {
  let emit: ChatEventHandler = () => {}
  let finish = (): void => {}
  const sendMessage = vi.fn<ChatProvider['sendMessage']>((_message, _config, onEvent) => {
    emit = onEvent
    return new Promise<void>((resolve) => {
      finish = () => {
        onEvent({ type: 'done' })
        resolve()
      }
    })
  })
  const abort = vi.fn<ChatProvider['abort']>(() => finish())
  const clearHistory = vi.fn<ChatProvider['clearHistory']>(async () => {})
  const loadHistory = vi.fn<ChatProvider['loadHistory']>(async () => [])
  const queueMessage = vi.fn<NonNullable<ChatProvider['queueMessage']>>(
    async (message, config, onEvent) => {
      const id = requireMessageId(config.messageId)
      onEvent({
        type: 'message',
        message: {
          id,
          role: 'user',
          content: message,
          timestamp: Date.now(),
          queued: true,
        },
      })
    },
  )
  const editQueuedMessage = vi.fn<NonNullable<ChatProvider['editQueuedMessage']>>(async () => {})
  const deleteQueuedMessage = vi.fn<NonNullable<ChatProvider['deleteQueuedMessage']>>(
    async () => {},
  )
  const provider: FixtureProvider = {
    name: 'test',
    lastMeta: {},
    isServerStreaming: false,
    sendMessage,
    abort,
    clearHistory,
    loadHistory,
    ...(durable ? { queueMessage, editQueuedMessage, deleteQueuedMessage } : {}),
  }
  return {
    provider,
    sendMessage,
    abort,
    clearHistory,
    loadHistory,
    queueMessage,
    editQueuedMessage,
    deleteQueuedMessage,
    emit: (event: Parameters<ChatEventHandler>[0]) => emit(event),
    finish: () => finish(),
  }
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

beforeEach(() => {
  vi.useFakeTimers()
  resetChatStoresForTests()
  sessionStorage.clear()
})

afterEach(() => {
  TestBed.resetTestingModule()
  resetChatStoresForTests()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('conversation background work', () => {
  it('does not clear a new conversation when an older clear request finishes', async () => {
    const f = fixture()
    let finishClear!: () => void
    f.clearHistory.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishClear = resolve
        }),
    )
    const {
      chat,
      endpoint,
      fixture: mounted,
    } = mountChat(f.provider, {
      endpoint: '/chat?conversationId=old',
    })
    const clearing = chat.clearHistory()
    endpoint.set('/chat?conversationId=new')
    // Change detection flushes the effect that hands the new endpoint to the session.
    mounted.detectChanges()
    chat.applyRemoteEvent({ type: 'background_task', task: { ...task, id: 'new' } })
    finishClear()
    await clearing
    expect(chat.backgroundTasks()[0].id).toBe('new')
  })

  it('handles progress before message_start on local and remote streams without inventing an assistant', async () => {
    const f = fixture()
    const { chat } = mountChat(f.provider)
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
  })

  it('preserves progress across remount and ignores stale running snapshots after cancellation', async () => {
    const f = fixture()
    const first = mountChat(f.provider)
    void first.chat.sendMessage('hello')
    f.emit({ type: 'background_task', task })
    first.fixture.destroy()
    TestBed.resetTestingModule()
    const second = mountChat(f.provider)
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
  })

  it('clears tasks on conversation switch and refuses late history from the old conversation', async () => {
    const f = fixture()
    let resolveOld!: (messages: ChatMessage[]) => void
    f.loadHistory
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
    const {
      chat,
      endpoint,
      fixture: mounted,
    } = mountChat(f.provider, {
      endpoint: '/chat?conversationId=old',
      loadOnMount: true,
    })
    chat.applyRemoteEvent({ type: 'background_task', task })
    endpoint.set('/chat?conversationId=new')
    // Change detection flushes the effect that hands the new endpoint to the
    // session, which loads the new conversation history.
    mounted.detectChanges()
    await vi.advanceTimersByTimeAsync(0)
    expect(chat.backgroundTasks().map((item) => item.id)).toEqual(['new'])
    f.provider.lastMeta = { backgroundTasks: [task] }
    resolveOld([])
    await vi.advanceTimersByTimeAsync(0)
    expect(chat.backgroundTasks().map((item) => item.id)).toEqual(['new'])
    await chat.clearHistory()
    expect(chat.backgroundTasks()).toEqual([])
  })
})

describe('durable queued messages', () => {
  it('tracks a teammate’s queued message and deletion while our stream is active', async () => {
    const f = fixture()
    const { chat } = mountChat(f.provider)
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
    expect(f.editQueuedMessage).toHaveBeenCalledWith(queued.id, 'edited', expect.any(Object))
    chat.applyRemoteEvent({ type: 'queue_removed', messageId: queued.id })
    chat.applyRemoteEvent({ type: 'message', message: queued })
    expect(chat.messages().some((message) => message.id === queued.id)).toBe(false)
    f.finish()
    f.loadHistory.mockResolvedValue([queued])
    await chat.reconcileHistory()
    expect(chat.messages().some((message) => message.id === queued.id)).toBe(false)
    expect(f.sendMessage).toHaveBeenCalledTimes(1)
  })

  it('acknowledges hidden driver messages without rendering them', async () => {
    const f = fixture()
    f.queueMessage.mockImplementation(async (message, config, onEvent) => {
      onEvent({
        type: 'message',
        message: {
          id: requireMessageId(config.messageId),
          role: 'user',
          content: message,
          timestamp: 1,
          queued: true,
          hidden: true,
        },
      })
    })
    const { chat } = mountChat(f.provider)
    void chat.sendMessage('first')
    await chat.sendMessage('internal driver', undefined, { suppressUserMessage: true })
    const config = f.queueMessage.mock.calls[0][1]
    expect(chat.messages().some((message) => message.content === 'internal driver')).toBe(false)
    f.emit({
      type: 'message',
      message: {
        id: requireMessageId(config.messageId),
        role: 'user',
        content: 'internal driver',
        timestamp: 2,
        queued: false,
        hidden: true,
      },
    })
    f.finish()
    expect(f.sendMessage).toHaveBeenCalledTimes(1)
    expect(chat.messages().some((message) => message.hidden)).toBe(false)
  })

  it('retains durable pending work on Stop and can delete it afterward', async () => {
    const f = fixture()
    const { chat } = mountChat(f.provider)
    void chat.sendMessage('first')
    await chat.sendMessage('next')
    const id = chat.messages().find((message) => message.queued)!.id
    await chat.abort()
    expect(f.sendMessage).toHaveBeenCalledTimes(1)
    expect(chat.messages().find((message) => message.id === id)?.queued).toBe(true)
    await chat.deleteQueuedMessage(id)
    expect(f.deleteQueuedMessage).toHaveBeenCalledWith(id, expect.any(Object))
  })

  it('queues against another client’s live turn without starting or aborting a stream', async () => {
    const f = fixture()
    const { chat } = mountChat(f.provider)
    chat.applyRemoteEvent({ type: 'message_start', id: 'remote', timestamp: 1 })
    await chat.sendMessage('next')
    expect(f.queueMessage).toHaveBeenCalledTimes(1)
    expect(f.sendMessage).not.toHaveBeenCalled()
    expect(f.abort).not.toHaveBeenCalled()
    expect(chat.isRemoteStreaming()).toBe(true)
  })

  it('sends during the active turn, retains acceptance, then clears only the matching delivery', async () => {
    const f = fixture()
    const { chat } = mountChat(f.provider)
    void chat.sendMessage('first')
    await chat.sendMessage('next')
    expect(f.queueMessage).toHaveBeenCalledTimes(1)
    const queued = chat.messages().find((message) => message.content === 'next')!
    expect(queued.id).toMatch(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/)
    expect(queued.queued).toBe(true)
    expect(f.sendMessage).toHaveBeenCalledTimes(1)
    expect(f.abort).not.toHaveBeenCalled()
    expect(chat.isLoading()).toBe(true)
    f.emit({ type: 'message', message: { ...queued, queued: false, timestamp: 3000 } })
    expect(chat.messages().find((message) => message.id === queued.id)?.queued).toBe(false)
    chat.applyRemoteEvent({ type: 'message', message: queued })
    expect(chat.messages().find((message) => message.id === queued.id)?.queued).toBe(false)
    f.finish()
    expect(f.sendMessage).toHaveBeenCalledTimes(1)
  })

  it('updates and deletes durable items only after the server accepts, preserving conflicts', async () => {
    const f = fixture()
    const { chat } = mountChat(f.provider)
    void chat.sendMessage('first')
    await chat.sendMessage('next')
    const id = chat.messages().find((message) => message.queued)!.id
    f.editQueuedMessage.mockRejectedValueOnce(new Error('Already delivered'))
    await chat.editQueuedMessage(id, 'wrong')
    expect(chat.messages().find((message) => message.id === id)?.content).toBe('next')
    expect(chat.error()).toBe('Already delivered')
    await chat.editQueuedMessage(id, 'edited')
    expect(chat.messages().find((message) => message.id === id)?.content).toBe('edited')
    f.deleteQueuedMessage.mockRejectedValueOnce(new Error('Already delivered'))
    await chat.deleteQueuedMessage(id)
    expect(chat.messages().some((message) => message.id === id)).toBe(true)
    await chat.deleteQueuedMessage(id)
    expect(chat.messages().some((message) => message.id === id)).toBe(false)
    f.finish()
  })

  it('retains FIFO and original UUID when the turn ends before queued delivery', async () => {
    const f = fixture()
    const { chat } = mountChat(f.provider)
    void chat.sendMessage('first')
    await chat.sendMessage('second')
    await chat.sendMessage('third')
    const pending = chat.messages().filter((message) => message.queued)
    f.sendMessage.mockImplementation(async (message, config, onEvent) => {
      onEvent({
        type: 'message',
        message: {
          id: requireMessageId(config.messageId),
          role: 'user',
          content: message,
          timestamp: Date.now(),
          queued: false,
        },
      })
      onEvent({ type: 'done' })
    })
    f.finish()
    await vi.advanceTimersByTimeAsync(0)
    const calls = f.sendMessage.mock.calls
    expect(calls.slice(1).map(([message]) => message)).toEqual(['second', 'third'])
    expect(calls.slice(1).map(([, config]) => config.messageId)).toEqual(
      pending.map((message) => message.id),
    )
    expect(chat.messages().filter((message) => message.queued)).toHaveLength(0)
  })

  it('restores queued handles from history and resends their UUID without losing attachments on the server', async () => {
    const f = fixture()
    const id = crypto.randomUUID()
    f.loadHistory.mockResolvedValue([
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
      loadOnMount: true,
    })
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(f.sendMessage).toHaveBeenCalledWith(
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
  })

  it('keeps the full-turn fallback for providers without a durable queue', async () => {
    const f = fixture(false)
    const { chat } = mountChat(f.provider)
    void chat.sendMessage('first')
    await chat.sendMessage('next')
    expect(f.sendMessage).toHaveBeenCalledTimes(1)
    f.sendMessage.mockImplementation(async (_message, _config, onEvent) =>
      onEvent({ type: 'done' }),
    )
    f.finish()
    await vi.advanceTimersByTimeAsync(0)
    expect(f.sendMessage).toHaveBeenCalledTimes(2)
    expect(chat.messages().filter((message) => message.queued)).toHaveLength(0)
  })

  it('starts the legacy queued turn when a remotely owned turn finishes', async () => {
    const f = fixture(false)
    f.sendMessage.mockImplementation(async (_message, _config, onEvent) =>
      onEvent({ type: 'done' }),
    )
    const { chat } = mountChat(f.provider)
    chat.applyRemoteEvent({ type: 'message_start', id: 'remote', timestamp: 1 })
    await chat.sendMessage('next')
    await chat.sendMessage('then')
    const queuedIds = chat
      .messages()
      .filter((message) => message.queued)
      .map((message) => message.id)
    expect(f.sendMessage).not.toHaveBeenCalled()
    chat.applyRemoteEvent({ type: 'done' })
    await vi.advanceTimersByTimeAsync(0)
    expect(
      f.sendMessage.mock.calls.map(([message, config]) => [message, config.messageId]),
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
      const { chat } = mountChat(f.provider)
      chat.applyRemoteEvent({ type: 'message_start', id: 'remote', timestamp: 1 })
      await chat.sendMessage('next')
      if (ending === 'stop') {
        await chat.abort()
        chat.applyRemoteEvent({ type: 'done' })
      } else {
        chat.applyRemoteEvent({ type: 'error', message: 'Remote failed' })
      }
      await vi.advanceTimersByTimeAsync(0)
      expect(f.sendMessage).not.toHaveBeenCalled()
      expect(chat.messages().filter((message) => message.queued)).toHaveLength(1)
    },
  )

  it('restores Stop after refresh without sending retained messages and keeps them editable', async () => {
    const f = fixture()
    const first = mountChat(f.provider)
    void first.chat.sendMessage('first')
    await first.chat.sendMessage('retained')
    const queued = first.chat.messages().find((message) => message.queued)!
    await first.chat.abort()
    first.fixture.destroy()
    TestBed.resetTestingModule()
    resetChatStoresForTests()
    f.sendMessage.mockClear()
    f.loadHistory.mockImplementation(async () => {
      f.provider.lastMeta = { userStoppedAt: '2026-10-20T12:00:00.000Z' }
      return [queued]
    })
    const second = mountChat(f.provider, { loadOnMount: true })
    await vi.advanceTimersByTimeAsync(0)
    expect(f.sendMessage).not.toHaveBeenCalled()
    expect(second.chat.messages()).toEqual([queued])
    await second.chat.editQueuedMessage(queued.id, 'edited')
    expect(f.editQueuedMessage).toHaveBeenCalled()
    expect(second.chat.messages()[0].content).toBe('edited')
    await second.chat.sendMessage('autofix', undefined, { automatic: true })
    expect(f.sendMessage).not.toHaveBeenCalled()
    await second.chat.deleteQueuedMessage(queued.id)
    expect(f.deleteQueuedMessage).toHaveBeenCalled()
    expect(second.chat.messages()).toEqual([])
    void second.chat.sendMessage('continue explicitly')
    expect(f.sendMessage).toHaveBeenCalledTimes(1)
    f.finish()
  })

  it('does not restore stale Stop metadata after a newer explicit send', async () => {
    const f = fixture()
    let resolveHistory!: (history: ChatMessage[]) => void
    f.loadHistory.mockImplementationOnce(
      () =>
        new Promise<ChatMessage[]>((resolve) => {
          resolveHistory = resolve
        }),
    )
    f.sendMessage.mockImplementation(async (_message, _config, onEvent) =>
      onEvent({ type: 'done' }),
    )
    const { chat } = mountChat(f.provider, { loadOnMount: true })
    await chat.sendMessage('continue explicitly')
    f.provider.lastMeta = { userStoppedAt: '2026-10-20T12:00:00.000Z' }
    resolveHistory([])
    await vi.advanceTimersByTimeAsync(0)
    await chat.sendMessage('autofix', undefined, { automatic: true })
    expect(f.sendMessage).toHaveBeenCalledTimes(2)
  })

  it('preserves an unacknowledged persisted queue when the history read fails', async () => {
    const f = fixture()
    const pending = [{ message: 'not acknowledged', userMsgId: crypto.randomUUID(), durable: true }]
    sessionStorage.setItem('mol-chat-queue-p', JSON.stringify(pending))
    f.loadHistory.mockRejectedValue(new Error('HTTP 503'))
    const first = mountChat(f.provider, { loadOnMount: true })
    await vi.advanceTimersByTimeAsync(0)
    expect(f.sendMessage).not.toHaveBeenCalled()
    expect(JSON.parse(sessionStorage.getItem('mol-chat-queue-p') ?? '[]')).toEqual(pending)
    first.fixture.destroy()
    TestBed.resetTestingModule()
    resetChatStoresForTests()
    f.loadHistory.mockResolvedValue([])
    mountChat(f.provider, { loadOnMount: true })
    await vi.advanceTimersByTimeAsync(0)
    expect(f.sendMessage).toHaveBeenCalledWith(
      'not acknowledged',
      expect.objectContaining({ messageId: pending[0].userMsgId }),
      expect.any(Function),
      undefined,
    )
    f.finish()
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
    mountChat(f.provider, { loadOnMount: true })
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(f.sendMessage).not.toHaveBeenCalled()
    expect(f.queueMessage).not.toHaveBeenCalled()
  })

  it('reconciles deleted accepted items while preserving acceptance newer than the history request', async () => {
    const f = fixture()
    const { chat } = mountChat(f.provider)
    void chat.sendMessage('first')
    await chat.sendMessage('deleted')
    let resolve!: (messages: ChatMessage[]) => void
    f.loadHistory.mockImplementationOnce(
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
    const id = chat.messages().find((message) => message.queued)!.id
    await chat.deleteQueuedMessage(id)
    f.finish()
  })

  it('reuses the original UUID on a never-acknowledged send retry', async () => {
    const f = fixture()
    f.sendMessage
      .mockImplementationOnce(async (_message, _config, onEvent) =>
        onEvent({ type: 'error', status: 503, message: 'Try again' }),
      )
      .mockImplementationOnce(async (_message, _config, onEvent) => onEvent({ type: 'done' }))
    const { chat } = mountChat(f.provider)
    await chat.sendMessage('once')
    await vi.advanceTimersByTimeAsync(5000)
    const calls = f.sendMessage.mock.calls
    expect(calls).toHaveLength(2)
    expect(calls[1][1].messageId).toBe(calls[0][1].messageId)
    expect(chat.messages().filter((message) => message.content === 'once')).toHaveLength(1)
  })
})
