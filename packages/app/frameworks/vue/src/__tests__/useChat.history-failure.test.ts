// @vitest-environment jsdom

/**
 * A chat whose history fails to load still works, and the failure is logged
 * so an empty chat after a reload has a cause someone can find.
 *
 * @module
 */

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'

import type { ChatProvider } from '@molecule/app-ai-chat'
import type { Logger, LoggerProvider } from '@molecule/app-logger'
import { setProvider as setLoggerProvider } from '@molecule/app-logger'

import { resetChatStoresForTests, useChat } from '../composables/useChat.js'
import { createChatPlugin } from '../plugin.js'

const wrappers: VueWrapper[] = []

/**
 * Bonds a logger provider whose named logger forwards to one `warn` spy.
 *
 * @returns The `warn` spy the chat session must call.
 */
const installWarnLogger = (): Mock<Logger['warn']> => {
  const warn = vi.fn<Logger['warn']>()
  const logger: Logger = {
    trace: vi.fn<Logger['trace']>(),
    debug: vi.fn<Logger['debug']>(),
    info: vi.fn<Logger['info']>(),
    warn,
    error: vi.fn<Logger['error']>(),
    setLevel: vi.fn<Logger['setLevel']>(),
    getLevel: vi.fn<Logger['getLevel']>(() => 'silent'),
    child: vi.fn<Logger['child']>(() => logger),
    withContext: vi.fn<Logger['withContext']>(() => logger),
    addTransport: vi.fn<Logger['addTransport']>(() => () => {}),
    removeTransport: vi.fn<Logger['removeTransport']>(),
  }
  const provider: LoggerProvider = {
    getLogger: vi.fn<LoggerProvider['getLogger']>(() => logger),
    createLogger: vi.fn<LoggerProvider['createLogger']>(() => logger),
    setLevel: vi.fn<LoggerProvider['setLevel']>(),
    getLevel: vi.fn<LoggerProvider['getLevel']>(() => 'silent'),
    addTransport: vi.fn<LoggerProvider['addTransport']>(() => () => {}),
    enable: vi.fn<LoggerProvider['enable']>(),
    disable: vi.fn<LoggerProvider['disable']>(),
    isEnabled: vi.fn<LoggerProvider['isEnabled']>(() => true),
  }
  setLoggerProvider(provider)
  return warn
}

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  resetChatStoresForTests()
  sessionStorage.clear()
})

describe('useChat history load failure', () => {
  it('logs the failure and leaves an empty, usable chat', async () => {
    const warn = installWarnLogger()
    const loadHistory = vi
      .fn<ChatProvider['loadHistory']>()
      .mockRejectedValue(new Error('history endpoint returned 500'))
    const provider: ChatProvider = {
      name: 'failing-history',
      sendMessage: vi.fn<ChatProvider['sendMessage']>().mockResolvedValue(undefined),
      abort: vi.fn<ChatProvider['abort']>(),
      clearHistory: vi.fn<ChatProvider['clearHistory']>().mockResolvedValue(undefined),
      loadHistory,
    }

    let result!: ReturnType<typeof useChat>
    const Harness = defineComponent({
      setup() {
        result = useChat({ endpoint: '/chat', projectId: 'proj-1', loadOnMount: true })
        return () => h('div')
      },
    })
    wrappers.push(mount(Harness, { global: { plugins: [createChatPlugin(provider)] } }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    await nextTick()

    expect(loadHistory).toHaveBeenCalled()
    expect(result.messages.value).toEqual([])
    expect(warn).toHaveBeenCalledWith('Loading chat history failed', {
      error: expect.objectContaining({ message: 'history endpoint returned 500' }),
    })
  })
})
