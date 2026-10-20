// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  BackgroundTaskState,
  ChatConfig,
  ChatEventHandler,
  ChatMessage,
  ChatProvider,
} from '@molecule/app-ai-chat'

import { ChatContext } from '../contexts.js'
import { resetChatStoresForTests, useChat } from '../hooks/useChat.js'

const task: BackgroundTaskState = {
  id: 'summary-1',
  kind: 'agent',
  command: 'Summarize context',
  status: 'running',
  startedAt: 1000,
  outputChars: 0,
}

/** Keep the primary stream open while independent queue and progress events arrive. */
function fixture(durable = true) {
  let emit: ChatEventHandler = () => {}
  let finish = (): void => {}
  const provider: ChatProvider & { lastMeta: Record<string, unknown>; isServerStreaming: boolean } =
    {
      name: 'test',
      lastMeta: {},
      isServerStreaming: false,
      sendMessage: vi.fn((_message, _config, onEvent) => {
        emit = onEvent
        return new Promise<void>((resolve) => {
          finish = () => {
            onEvent({ type: 'done' })
            resolve()
          }
        })
      }),
      abort: vi.fn(() => finish()),
      clearHistory: vi.fn(async () => {}),
      loadHistory: vi.fn(async () => []),
      ...(durable
        ? {
            queueMessage: vi.fn(
              async (message: string, config: ChatConfig, onEvent: ChatEventHandler) => {
                onEvent({
                  type: 'message',
                  message: {
                    id: config.messageId!,
                    role: 'user',
                    content: message,
                    timestamp: Date.now(),
                    queued: true,
                  },
                })
              },
            ),
            editQueuedMessage: vi.fn(async () => {}),
            deleteQueuedMessage: vi.fn(async () => {}),
          }
        : {}),
    }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ChatContext.Provider value={provider}>{children}</ChatContext.Provider>
  )
  return {
    provider,
    wrapper,
    emit: (event: Parameters<ChatEventHandler>[0]) => emit(event),
    finish: () => finish(),
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  resetChatStoresForTests()
  sessionStorage.clear()
})
afterEach(() => {
  cleanup()
  resetChatStoresForTests()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('conversation background work', () => {
  it('does not clear a new conversation when an older clear request finishes', async () => {
    const f = fixture()
    let finishClear!: () => void
    vi.mocked(f.provider.clearHistory).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishClear = resolve
        }),
    )
    const { result, rerender } = renderHook(
      ({ endpoint }) => useChat({ endpoint, projectId: 'p', loadOnMount: false }),
      {
        wrapper: f.wrapper,
        initialProps: { endpoint: '/chat?conversationId=old' },
      },
    )
    let clearing!: Promise<void>
    act(() => {
      clearing = result.current.clearHistory()
    })
    act(() => rerender({ endpoint: '/chat?conversationId=new' }))
    act(() =>
      result.current.applyRemoteEvent({ type: 'background_task', task: { ...task, id: 'new' } }),
    )
    await act(async () => {
      finishClear()
      await clearing
    })
    expect(result.current.backgroundTasks[0].id).toBe('new')
  })

  it('handles progress before message_start on local and remote streams without inventing an assistant', async () => {
    const f = fixture()
    const { result } = renderHook(
      () => useChat({ endpoint: '/chat', projectId: 'p', loadOnMount: false }),
      { wrapper: f.wrapper },
    )
    act(() => {
      void result.current.sendMessage('hello')
    })
    act(() => {
      f.emit({ type: 'background_task', task })
    })
    expect(result.current.backgroundTasks).toEqual([task])
    expect(result.current.messages.filter((message) => message.role === 'assistant')).toHaveLength(
      0,
    )
    act(() => {
      result.current.applyRemoteEvent({
        type: 'background_task',
        task: { ...task, outputChars: 512 },
      })
    })
    expect(result.current.backgroundTasks[0].outputChars).toBe(512)
    await act(async () => f.finish())
  })

  it('preserves progress across remount and ignores stale running snapshots after cancellation', async () => {
    const f = fixture()
    const options = { endpoint: '/chat', projectId: 'p', loadOnMount: false }
    const first = renderHook(() => useChat(options), { wrapper: f.wrapper })
    act(() => {
      void first.result.current.sendMessage('hello')
      f.emit({ type: 'background_task', task })
    })
    first.unmount()
    const second = renderHook(() => useChat(options), { wrapper: f.wrapper })
    act(() => {
      f.emit({
        type: 'background_task',
        task: { ...task, status: 'cancelled', finishedAt: 2000, outputChars: 200 },
      })
    })
    act(() => second.result.current.applyRemoteEvent({ type: 'background_task', task }))
    expect(second.result.current.backgroundTasks[0]).toMatchObject({
      status: 'cancelled',
      outputChars: 200,
    })
    await act(async () => f.finish())
  })

  it('clears tasks on conversation switch and refuses late history from the old conversation', async () => {
    const f = fixture()
    let resolveOld!: (messages: ChatMessage[]) => void
    vi.mocked(f.provider.loadHistory)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve
          }),
      )
      .mockImplementationOnce(async () => {
        f.provider.lastMeta = { backgroundTasks: [{ ...task, id: 'new', status: 'succeeded' }] }
        return []
      })
    const { result, rerender } = renderHook(
      ({ endpoint }) => useChat({ endpoint, projectId: 'p' }),
      {
        wrapper: f.wrapper,
        initialProps: { endpoint: '/chat?conversationId=old' },
      },
    )
    act(() => result.current.applyRemoteEvent({ type: 'background_task', task }))
    await act(async () => rerender({ endpoint: '/chat?conversationId=new' }))
    expect(result.current.backgroundTasks.map((item) => item.id)).toEqual(['new'])
    await act(async () => {
      f.provider.lastMeta = { backgroundTasks: [task] }
      resolveOld([])
    })
    expect(result.current.backgroundTasks.map((item) => item.id)).toEqual(['new'])
    await act(async () => result.current.clearHistory())
    expect(result.current.backgroundTasks).toEqual([])
  })
})

describe('durable queued messages', () => {
  it('tracks a teammate’s queued message and deletion while our stream is active', async () => {
    const f = fixture()
    const { result } = renderHook(
      () => useChat({ endpoint: '/chat', projectId: 'p', loadOnMount: false }),
      { wrapper: f.wrapper },
    )
    act(() => {
      void result.current.sendMessage('first')
    })
    const queued: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: 'teammate',
      timestamp: 1,
      queued: true,
    }
    act(() => result.current.applyRemoteEvent({ type: 'message', message: queued }))
    await act(async () => result.current.editQueuedMessage(queued.id, 'edited'))
    expect(f.provider.editQueuedMessage).toHaveBeenCalledWith(
      queued.id,
      'edited',
      expect.any(Object),
    )
    act(() => result.current.applyRemoteEvent({ type: 'queue_removed', messageId: queued.id }))
    act(() => result.current.applyRemoteEvent({ type: 'message', message: queued }))
    expect(result.current.messages.some((message) => message.id === queued.id)).toBe(false)
    await act(async () => f.finish())
    vi.mocked(f.provider.loadHistory).mockResolvedValue([queued])
    await act(async () => result.current.reconcileHistory())
    expect(result.current.messages.some((message) => message.id === queued.id)).toBe(false)
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
  })

  it('acknowledges hidden driver messages without rendering them', async () => {
    const f = fixture()
    vi.mocked(f.provider.queueMessage!).mockImplementation(async (message, config, onEvent) => {
      onEvent({
        type: 'message',
        message: {
          id: config.messageId!,
          role: 'user',
          content: message,
          timestamp: 1,
          queued: true,
          hidden: true,
        },
      })
    })
    const { result } = renderHook(
      () => useChat({ endpoint: '/chat', projectId: 'p', loadOnMount: false }),
      { wrapper: f.wrapper },
    )
    act(() => {
      void result.current.sendMessage('first')
    })
    await act(async () =>
      result.current.sendMessage('internal driver', undefined, { suppressUserMessage: true }),
    )
    const config = vi.mocked(f.provider.queueMessage!).mock.calls[0][1]
    expect(result.current.messages.some((message) => message.content === 'internal driver')).toBe(
      false,
    )
    act(() =>
      f.emit({
        type: 'message',
        message: {
          id: config.messageId!,
          role: 'user',
          content: 'internal driver',
          timestamp: 2,
          queued: false,
          hidden: true,
        },
      }),
    )
    await act(async () => f.finish())
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
    expect(result.current.messages.some((message) => message.hidden)).toBe(false)
  })

  it('retains durable pending work on Stop and can delete it afterward', async () => {
    const f = fixture()
    const { result } = renderHook(
      () => useChat({ endpoint: '/chat', projectId: 'p', loadOnMount: false }),
      { wrapper: f.wrapper },
    )
    act(() => {
      void result.current.sendMessage('first')
    })
    await act(async () => result.current.sendMessage('next'))
    const id = result.current.messages.find((message) => message.queued)!.id
    await act(async () => result.current.abort())
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
    expect(result.current.messages.find((message) => message.id === id)?.queued).toBe(true)
    await act(async () => result.current.deleteQueuedMessage(id))
    expect(f.provider.deleteQueuedMessage).toHaveBeenCalledWith(id, expect.any(Object))
  })

  it('queues against another client’s live turn without starting or aborting a stream', async () => {
    const f = fixture()
    const { result } = renderHook(
      () => useChat({ endpoint: '/chat', projectId: 'p', loadOnMount: false }),
      { wrapper: f.wrapper },
    )
    act(() =>
      result.current.applyRemoteEvent({ type: 'message_start', id: 'remote', timestamp: 1 }),
    )
    await act(async () => result.current.sendMessage('next'))
    expect(f.provider.queueMessage).toHaveBeenCalledTimes(1)
    expect(f.provider.sendMessage).not.toHaveBeenCalled()
    expect(f.provider.abort).not.toHaveBeenCalled()
    expect(result.current.isRemoteStreaming).toBe(true)
  })

  it('sends during the active turn, retains acceptance, then clears only the matching delivery', async () => {
    const f = fixture()
    const { result } = renderHook(
      () => useChat({ endpoint: '/chat', projectId: 'p', loadOnMount: false }),
      { wrapper: f.wrapper },
    )
    act(() => {
      void result.current.sendMessage('first')
    })
    await act(async () => result.current.sendMessage('next'))
    expect(f.provider.queueMessage).toHaveBeenCalledTimes(1)
    const queued = result.current.messages.find((message) => message.content === 'next')!
    expect(queued.id).toMatch(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/)
    expect(queued.queued).toBe(true)
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
    expect(f.provider.abort).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(true)
    act(() => f.emit({ type: 'message', message: { ...queued, queued: false, timestamp: 3000 } }))
    expect(result.current.messages.find((message) => message.id === queued.id)?.queued).toBe(false)
    act(() => result.current.applyRemoteEvent({ type: 'message', message: queued }))
    expect(result.current.messages.find((message) => message.id === queued.id)?.queued).toBe(false)
    await act(async () => f.finish())
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
  })

  it('updates and deletes durable items only after the server accepts, preserving conflicts', async () => {
    const f = fixture()
    const { result } = renderHook(
      () => useChat({ endpoint: '/chat', projectId: 'p', loadOnMount: false }),
      { wrapper: f.wrapper },
    )
    act(() => {
      void result.current.sendMessage('first')
    })
    await act(async () => result.current.sendMessage('next'))
    const id = result.current.messages.find((message) => message.queued)!.id
    vi.mocked(f.provider.editQueuedMessage!).mockRejectedValueOnce(new Error('Already delivered'))
    await act(async () => result.current.editQueuedMessage(id, 'wrong'))
    expect(result.current.messages.find((message) => message.id === id)?.content).toBe('next')
    expect(result.current.error).toBe('Already delivered')
    await act(async () => result.current.editQueuedMessage(id, 'edited'))
    expect(result.current.messages.find((message) => message.id === id)?.content).toBe('edited')
    vi.mocked(f.provider.deleteQueuedMessage!).mockRejectedValueOnce(new Error('Already delivered'))
    await act(async () => result.current.deleteQueuedMessage(id))
    expect(result.current.messages.some((message) => message.id === id)).toBe(true)
    await act(async () => result.current.deleteQueuedMessage(id))
    expect(result.current.messages.some((message) => message.id === id)).toBe(false)
    await act(async () => f.finish())
  })

  it('retains FIFO and original UUID when the turn ends before queued delivery', async () => {
    const f = fixture()
    const { result } = renderHook(
      () => useChat({ endpoint: '/chat', projectId: 'p', loadOnMount: false }),
      { wrapper: f.wrapper },
    )
    act(() => {
      void result.current.sendMessage('first')
    })
    await act(async () => {
      await result.current.sendMessage('second')
      await result.current.sendMessage('third')
    })
    const pending = result.current.messages.filter((message) => message.queued)
    vi.mocked(f.provider.sendMessage).mockImplementation(async (message, config, onEvent) => {
      onEvent({
        type: 'message',
        message: {
          id: config.messageId!,
          role: 'user',
          content: message,
          timestamp: Date.now(),
          queued: false,
        },
      })
      onEvent({ type: 'done' })
    })
    await act(async () => f.finish())
    const calls = vi.mocked(f.provider.sendMessage).mock.calls
    expect(calls.slice(1).map(([message]) => message)).toEqual(['second', 'third'])
    expect(calls.slice(1).map(([, config]) => config.messageId)).toEqual(
      pending.map((message) => message.id),
    )
    expect(result.current.messages.filter((message) => message.queued)).toHaveLength(0)
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
    const { result } = renderHook(
      () => useChat({ endpoint: '/chat?conversationId=one', projectId: 'p' }),
      { wrapper: f.wrapper },
    )
    await act(async () => {
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(f.provider.sendMessage).toHaveBeenCalledWith(
      'restored',
      expect.objectContaining({ messageId: id }),
      expect.any(Function),
      undefined,
    )
    expect(result.current.messages.find((message) => message.id === id)?.queued).toBe(true)
    act(() =>
      f.emit({
        type: 'message',
        message: { id, role: 'user', content: 'restored', timestamp: 2, queued: false },
      }),
    )
    await act(async () => f.finish())
  })

  it('keeps the full-turn fallback for providers without a durable queue', async () => {
    const f = fixture(false)
    const { result } = renderHook(
      () => useChat({ endpoint: '/chat', projectId: 'p', loadOnMount: false }),
      { wrapper: f.wrapper },
    )
    act(() => {
      void result.current.sendMessage('first')
    })
    await act(async () => result.current.sendMessage('next'))
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(1)
    vi.mocked(f.provider.sendMessage).mockImplementation(async (_message, _config, onEvent) =>
      onEvent({ type: 'done' }),
    )
    await act(async () => f.finish())
    expect(f.provider.sendMessage).toHaveBeenCalledTimes(2)
    expect(result.current.messages.filter((message) => message.queued)).toHaveLength(0)
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
    renderHook(() => useChat({ endpoint: '/chat', projectId: 'p' }), { wrapper: f.wrapper })
    await act(async () => {
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(f.provider.sendMessage).not.toHaveBeenCalled()
    expect(f.provider.queueMessage).not.toHaveBeenCalled()
  })

  it('reconciles deleted accepted items while preserving acceptance newer than the history request', async () => {
    const f = fixture()
    const { result } = renderHook(
      () => useChat({ endpoint: '/chat', projectId: 'p', loadOnMount: false }),
      { wrapper: f.wrapper },
    )
    act(() => {
      void result.current.sendMessage('first')
    })
    await act(async () => result.current.sendMessage('deleted'))
    let resolve!: (messages: ChatMessage[]) => void
    vi.mocked(f.provider.loadHistory).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    let reconciliation!: Promise<void>
    act(() => {
      reconciliation = result.current.reconcileHistory()
    })
    await act(async () => result.current.sendMessage('newer'))
    await act(async () => {
      resolve([])
      await reconciliation
    })
    expect(
      result.current.messages.filter((message) => message.queued).map((message) => message.content),
    ).toEqual(['newer'])
    const id = result.current.messages.find((message) => message.queued)!.id
    await act(async () => result.current.deleteQueuedMessage(id))
    await act(async () => f.finish())
  })

  it('reuses the original UUID on a never-acknowledged send retry', async () => {
    const f = fixture()
    vi.mocked(f.provider.sendMessage)
      .mockImplementationOnce(async (_message, _config, onEvent) =>
        onEvent({ type: 'error', status: 503, message: 'Try again' }),
      )
      .mockImplementationOnce(async (_message, _config, onEvent) => onEvent({ type: 'done' }))
    const { result } = renderHook(
      () => useChat({ endpoint: '/chat', projectId: 'p', loadOnMount: false }),
      { wrapper: f.wrapper },
    )
    await act(async () => result.current.sendMessage('once'))
    await act(async () => vi.advanceTimersByTimeAsync(5000))
    const calls = vi.mocked(f.provider.sendMessage).mock.calls
    expect(calls).toHaveLength(2)
    expect(calls[1][1].messageId).toBe(calls[0][1].messageId)
    expect(result.current.messages.filter((message) => message.content === 'once')).toHaveLength(1)
  })
})
