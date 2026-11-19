// @vitest-environment jsdom

/**
 * The Solid counterpart of React's `useChat.switch-send.test.tsx`: a message
 * sent in a conversation opened while another conversation's reply is still
 * streaming starts its own turn, and the orphaned stream does not carry the
 * old conversation's history into the new one.
 *
 * The behavior lives in the shared `createChatSession`, so the provider scripts
 * and the assertions are the React ones; only `renderHook` becomes a mounted
 * probe whose accessors are read, and `rerender` becomes a write to the options
 * accessor the primitive follows.
 *
 * @module
 */

import { type Accessor, createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { ChatEventHandler, ChatProvider } from '@molecule/app-ai-chat'

import { ChatContext } from '../context.js'
import {
  resetChatStoresForTests,
  useChat,
  type UseChatOptions,
  type UseChatResult,
} from '../primitives/chat.js'

/** The fixture provider, with every method a mock the test can re-script. */
interface SwitchProvider extends ChatProvider {
  sendMessage: Mock<ChatProvider['sendMessage']>
  abort: Mock<ChatProvider['abort']>
  clearHistory: Mock<ChatProvider['clearHistory']>
  loadHistory: Mock<ChatProvider['loadHistory']>
}

const disposers: Array<() => void> = []

/**
 * Mounts `useChat` against a provider and returns the primitive.
 *
 * @param provider - The chat provider to provide.
 * @param options - The chat options, or an accessor the test can write through.
 * @returns The chat primitive.
 */
function mountChat(
  provider: ChatProvider,
  options: UseChatOptions | Accessor<UseChatOptions>,
): UseChatResult {
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
  disposers.push(() => {
    dispose()
    container.remove()
  })
  if (captured === undefined) throw new Error('the probe did not create useChat')
  return captured
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  resetChatStoresForTests()
  sessionStorage.clear()
})

/**
 * A chat provider whose replies stream until the test finishes them.
 *
 * @returns The provider and a function that ends the reply to the nth send.
 */
function heldReplies(): { provider: SwitchProvider; finish: (index: number) => void } {
  const finishers: Array<() => void> = []
  const provider: SwitchProvider = {
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

/** Lets queued microtasks and zero-delay timers run. */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('useChat conversation switch during a stream', () => {
  it.each([
    ['without a history load', false],
    ['with a history load', true],
  ])(
    'sends in the new conversation, and the old stream ending does not reclaim the slot (%s)',
    async (_label, loadOnMount) => {
      const { provider, finish } = heldReplies()
      const [endpoint, setEndpoint] = createSignal('/chat?conversationId=a')
      const chat = mountChat(provider, () => ({
        endpoint: endpoint(),
        projectId: 'proj-1',
        loadOnMount,
      }))

      void chat.sendMessage('in conversation a')
      await flush()
      expect(provider.sendMessage).toHaveBeenCalledTimes(1)

      setEndpoint('/chat?conversationId=b')
      void chat.sendMessage('in conversation b')
      await flush()
      expect(provider.sendMessage).toHaveBeenCalledTimes(2)
      expect(
        chat.messages().find((message) => message.content === 'in conversation b')?.queued,
      ).toBe(false)

      // The orphaned reply ends while b's reply streams: b keeps the slot, so a
      // third message queues behind b and is sent when b's reply ends.
      finish(0)
      await flush()
      void chat.sendMessage('after the old reply ended')
      await flush()
      expect(provider.sendMessage).toHaveBeenCalledTimes(2)
      expect(
        chat.messages().find((message) => message.content === 'after the old reply ended')?.queued,
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
    const provider: SwitchProvider = {
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
    const [endpoint, setEndpoint] = createSignal('/chat?conversationId=a')
    const chat = mountChat(provider, () => ({
      endpoint: endpoint(),
      projectId: 'proj-1',
      loadOnMount: false,
    }))

    void chat.sendMessage('in conversation a')
    await flush()

    setEndpoint('/chat?conversationId=b')
    dropOld()
    await flush()

    expect(chat.messages().map((message) => message.content)).toEqual([])
    expect(provider.loadHistory).not.toHaveBeenCalled()
  })
})
