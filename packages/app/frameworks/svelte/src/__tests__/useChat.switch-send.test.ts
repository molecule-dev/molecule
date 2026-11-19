// @vitest-environment jsdom

/**
 * A message sent in a conversation opened while another conversation's reply
 * is still streaming starts its own turn, and a dropped old stream never merges
 * its history into the new conversation — React's
 * `useChat.switch-send.test.tsx` in Svelte's idiom.
 *
 * A Svelte hook sees a new argument through a store, so the conversation switch
 * is a store set rather than a re-render. The `svelte` context and lifecycle
 * functions are stubbed and the hook runs the way a component's init does.
 *
 * @module
 */

import { get, type Readable, writable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatEventHandler, ChatProvider } from '@molecule/app-ai-chat'

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

/** The chat hooks this file mounted, torn down after each case. */
const stops: Array<() => void> = []

/**
 * Runs `useChat` once, the way a component's init does, under `provider`'s chat
 * context, then runs the component's mount callbacks (React's committed effect).
 *
 * @param provider - The chat provider to set in context.
 * @param options - The chat options, as a store the case can set.
 * @returns The hook's result.
 */
function renderChat(
  provider: ChatProvider,
  options: UseChatOptions | Readable<UseChatOptions>,
): ReturnType<typeof useChat> {
  svelteLifecycle.contextStore.clear()
  svelteLifecycle.mountCallbacks.length = 0
  svelteLifecycle.destroyCallbacks.length = 0
  setMoleculeContext({ chat: provider })
  const chat = useChat(options)
  const cleanups: Array<() => void> = []
  for (const callback of svelteLifecycle.mountCallbacks.splice(0)) {
    const cleanup = callback()
    if (typeof cleanup === 'function') cleanups.push(cleanup)
  }
  stops.push(() => {
    for (const cleanup of cleanups.splice(0)) cleanup()
    for (const callback of svelteLifecycle.destroyCallbacks.splice(0)) callback()
  })
  return chat
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
  for (const stop of stops.splice(0)) stop()
  resetChatStoresForTests()
  sessionStorage.clear()
})

describe('useChat conversation switch during a stream', () => {
  it.each([
    ['without a history load', false],
    ['with a history load', true],
  ] as const)(
    'sends in the new conversation, and the old stream ending does not reclaim the slot (%s)',
    async (_label, loadOnMount) => {
      const finishers: Array<() => void> = []
      const provider: ChatProvider = {
        name: 'held-replies',
        sendMessage: vi.fn<ChatProvider['sendMessage']>(
          (_message: string, _config: ChatConfig, onEvent: ChatEventHandler) =>
            new Promise<void>((resolve) => {
              finishers.push(() => {
                onEvent({ type: 'done' })
                resolve()
              })
            }),
        ),
        abort: vi.fn<ChatProvider['abort']>(),
        clearHistory: vi.fn<ChatProvider['clearHistory']>(async () => undefined),
        loadHistory: vi.fn<ChatProvider['loadHistory']>(async () => []),
      }
      const options = writable<UseChatOptions>({
        endpoint: '/chat?conversationId=a',
        projectId: 'proj-1',
        loadOnMount,
      })
      const chat = renderChat(provider, options)

      void chat.sendMessage('in conversation a')
      await flush()
      expect(provider.sendMessage).toHaveBeenCalledTimes(1)

      options.set({ endpoint: '/chat?conversationId=b', projectId: 'proj-1', loadOnMount })
      void chat.sendMessage('in conversation b')
      await flush()
      expect(provider.sendMessage).toHaveBeenCalledTimes(2)
      expect(
        get(chat.messages).find((message) => message.content === 'in conversation b')?.queued,
      ).toBe(false)

      // The orphaned reply ends while b's reply streams: b keeps the slot, so a
      // third message queues behind b and is sent when b's reply ends.
      finishers[0]?.()
      await flush()
      void chat.sendMessage('after the old reply ended')
      await flush()
      expect(provider.sendMessage).toHaveBeenCalledTimes(2)
      expect(
        get(chat.messages).find((message) => message.content === 'after the old reply ended')
          ?.queued,
      ).toBe(true)

      finishers[1]?.()
      await flush()
      expect(provider.sendMessage).toHaveBeenCalledTimes(3)
      expect(vi.mocked(provider.sendMessage).mock.calls[2]?.[0]).toBe('after the old reply ended')
    },
  )
})

describe('useChat conversation switch when the old stream drops', () => {
  it("does not merge the old conversation's history into the new one", async () => {
    let dropOld = (): void => {}
    const provider: ChatProvider = {
      name: 'dropping',
      sendMessage: vi.fn<ChatProvider['sendMessage']>(
        (_message: string, _config: ChatConfig, onEvent: ChatEventHandler) =>
          new Promise<void>((resolve) => {
            onEvent({ type: 'message_start', id: 'a-reply', timestamp: 1 })
            // The connection closes with no done/error event.
            dropOld = resolve
          }),
      ),
      abort: vi.fn<ChatProvider['abort']>(),
      clearHistory: vi.fn<ChatProvider['clearHistory']>(async () => undefined),
      loadHistory: vi.fn<ChatProvider['loadHistory']>(async (config: ChatConfig) =>
        config.endpoint.includes('conversationId=a')
          ? [
              { id: 'a-user', role: 'user', content: 'in conversation a', timestamp: 1 },
              { id: 'a-reply', role: 'assistant', content: 'reply in a', timestamp: 2 },
            ]
          : [],
      ),
    }
    const options = writable<UseChatOptions>({
      endpoint: '/chat?conversationId=a',
      projectId: 'proj-1',
      loadOnMount: false,
    })
    const chat = renderChat(provider, options)
    void chat.sendMessage('in conversation a')
    await flush()

    options.set({
      endpoint: '/chat?conversationId=b',
      projectId: 'proj-1',
      loadOnMount: false,
    })
    dropOld()
    await flush()

    expect(get(chat.messages).map((message) => message.content)).toEqual([])
    expect(provider.loadHistory).not.toHaveBeenCalled()
  })
})
