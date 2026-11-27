// @vitest-environment jsdom

/**
 * A message sent in a conversation opened while another conversation's reply
 * is still streaming starts its own turn: the orphaned stream's send loop does
 * not keep the send slot, and does not take it back when it finally ends.
 *
 * @module
 */

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
import { defineComponent, h, nextTick, shallowRef } from 'vue'

import type { ChatEventHandler, ChatProvider } from '@molecule/app-ai-chat'

import { createChatPlugin } from '../chat-plugin.js'
import { resetChatStoresForTests, useChat, type UseChatOptions } from '../composables/useChat.js'

interface HeldRepliesProvider extends ChatProvider {
  sendMessage: Mock<ChatProvider['sendMessage']>
  abort: Mock<ChatProvider['abort']>
  clearHistory: Mock<ChatProvider['clearHistory']>
  loadHistory: Mock<ChatProvider['loadHistory']>
}

/**
 * A chat provider whose replies stream until the test finishes them.
 *
 * @returns The provider and a function that ends the reply to the nth send.
 */
function heldReplies(): { provider: HeldRepliesProvider; finish: (index: number) => void } {
  const finishers: Array<() => void> = []
  const provider: HeldRepliesProvider = {
    name: 'held-replies',
    sendMessage: vi.fn<ChatProvider['sendMessage']>(
      (_message, _config, onEvent: ChatEventHandler) =>
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
  return { provider, finish: (index) => finishers[index]?.() }
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

const wrappers: VueWrapper[] = []

/**
 * Mounts `useChat` against `provider`, with an options ref the test can move
 * (a changed endpoint is React's re-render with new props).
 *
 * @param provider - The chat provider to inject.
 * @param initial - The options the composable starts with.
 * @returns The composable result and an options setter.
 */
const renderChat = (
  provider: ChatProvider,
  initial: UseChatOptions,
): {
  chat: ReturnType<typeof useChat>
  setOptions: (next: UseChatOptions) => Promise<void>
} => {
  const options = shallowRef<UseChatOptions>(initial)
  let chat!: ReturnType<typeof useChat>
  const Harness = defineComponent({
    setup() {
      chat = useChat(options)
      return () => h('div')
    },
  })
  wrappers.push(mount(Harness, { global: { plugins: [createChatPlugin(provider)] } }))
  return {
    chat,
    setOptions: async (next: UseChatOptions): Promise<void> => {
      options.value = next
      await nextTick()
    },
  }
}

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  resetChatStoresForTests()
  sessionStorage.clear()
})

describe('useChat conversation switch during a stream', () => {
  it.each([
    ['without a history load', false],
    ['with a history load', true],
  ])(
    'sends in the new conversation, and the old stream ending does not reclaim the slot (%s)',
    async (_label, loadOnMount) => {
      const { provider, finish } = heldReplies()
      const { chat, setOptions } = renderChat(provider, {
        endpoint: '/chat?conversationId=a',
        projectId: 'proj-1',
        loadOnMount,
      })

      void chat.sendMessage('in conversation a')
      await flush()
      expect(provider.sendMessage).toHaveBeenCalledTimes(1)

      await setOptions({
        endpoint: '/chat?conversationId=b',
        projectId: 'proj-1',
        loadOnMount,
      })
      void chat.sendMessage('in conversation b')
      await flush()
      expect(provider.sendMessage).toHaveBeenCalledTimes(2)
      expect(chat.messages.value.find((m) => m.content === 'in conversation b')?.queued).toBe(false)

      // The orphaned reply ends while b's reply streams: b keeps the slot, so a
      // third message queues behind b and is sent when b's reply ends.
      finish(0)
      await flush()
      void chat.sendMessage('after the old reply ended')
      await flush()
      expect(provider.sendMessage).toHaveBeenCalledTimes(2)
      expect(
        chat.messages.value.find((m) => m.content === 'after the old reply ended')?.queued,
      ).toBe(true)

      finish(1)
      await flush()
      expect(provider.sendMessage).toHaveBeenCalledTimes(3)
      expect(provider.sendMessage.mock.calls[2]?.[0]).toBe('after the old reply ended')
    },
  )
})

describe('useChat conversation switch when the old stream drops', () => {
  it("does not merge the old conversation's history into the new one", async () => {
    let dropOld = (): void => {}
    const provider: HeldRepliesProvider = {
      name: 'dropping',
      sendMessage: vi.fn<ChatProvider['sendMessage']>(
        (_message, _config, onEvent: ChatEventHandler) =>
          new Promise<void>((resolve) => {
            onEvent({ type: 'message_start', id: 'a-reply', timestamp: 1 })
            // The connection closes with no done/error event.
            dropOld = resolve
          }),
      ),
      abort: vi.fn<ChatProvider['abort']>(),
      clearHistory: vi.fn<ChatProvider['clearHistory']>(async () => undefined),
      loadHistory: vi.fn<ChatProvider['loadHistory']>(async (config) =>
        config.endpoint.includes('conversationId=a')
          ? [
              { id: 'a-user', role: 'user', content: 'in conversation a', timestamp: 1 },
              { id: 'a-reply', role: 'assistant', content: 'reply in a', timestamp: 2 },
            ]
          : [],
      ),
    }
    const { chat, setOptions } = renderChat(provider, {
      endpoint: '/chat?conversationId=a',
      projectId: 'proj-1',
      loadOnMount: false,
    })
    void chat.sendMessage('in conversation a')
    await flush()

    await setOptions({
      endpoint: '/chat?conversationId=b',
      projectId: 'proj-1',
      loadOnMount: false,
    })
    dropOld()
    await flush()

    expect(chat.messages.value.map((m) => m.content)).toEqual([])
    expect(provider.loadHistory).not.toHaveBeenCalled()
  })
})
