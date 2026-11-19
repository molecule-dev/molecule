// @vitest-environment jsdom

/**
 * A chat whose history fails to load still works, and the failure is logged
 * so an empty chat after a reload has a cause someone can find — React's
 * `useChat.history-failure.test.tsx` in Svelte's idiom.
 *
 * The chat behaviour lives in `@molecule/app-ai-chat`'s shared session, and
 * this hook wraps it, so the mounting surface is the package's usual one:
 * `svelte`'s context and lifecycle functions are stubbed and `renderChat` runs
 * the hook the way a component's init does (React's mount effect).
 *
 * @module
 */

import { get } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ChatProvider } from '@molecule/app-ai-chat'
import type { Logger, LoggerProvider } from '@molecule/app-logger'
import { setProvider as setLoggerProvider } from '@molecule/app-logger'

import { setMoleculeContext } from '../context.js'
import { resetChatStoresForTests, useChat, type UseChatOptions } from '../stores/chat.js'

const svelteLifecycle = vi.hoisted(() => ({
  contextStore: new Map<symbol, unknown>(),
  mountCallbacks: [] as Array<() => void>,
  destroyCallbacks: [] as Array<() => void>,
}))

vi.mock('svelte', () => ({
  getContext: (key: symbol): unknown => svelteLifecycle.contextStore.get(key),
  setContext: (key: symbol, value: unknown): void => {
    svelteLifecycle.contextStore.set(key, value)
  },
  onMount: (callback: () => void): void => {
    svelteLifecycle.mountCallbacks.push(callback)
  },
  onDestroy: (callback: () => void): void => {
    svelteLifecycle.destroyCallbacks.push(callback)
  },
  untrack: <T>(callback: () => T): T => callback(),
}))

const stops: Array<() => void> = []

/**
 * Runs `useChat` once, the way a component's init does, under `provider`'s chat
 * context, then runs the component's mount callbacks (React's committed effect).
 *
 * @param provider - The chat provider to set in context.
 * @param options - The chat options the component passes.
 * @returns The hook's result.
 */
function renderChat(provider: ChatProvider, options: UseChatOptions) {
  svelteLifecycle.contextStore.clear()
  svelteLifecycle.mountCallbacks.length = 0
  svelteLifecycle.destroyCallbacks.length = 0
  setMoleculeContext({ chat: provider })
  const chat = useChat(options)
  for (const callback of svelteLifecycle.mountCallbacks.splice(0)) callback()
  stops.push(() => {
    for (const callback of svelteLifecycle.destroyCallbacks.splice(0)) callback()
  })
  return chat
}

/**
 * A `Logger` whose `warn` records what it is called with.
 *
 * @param warn - The recording `warn` implementation.
 * @returns The logger.
 */
function createLogger(warn: Logger['warn']): Logger {
  const logger: Logger = {
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn,
    error: () => {},
    setLevel: () => {},
    getLevel: () => 'info',
    child: () => logger,
    withContext: () => logger,
    addTransport: () => () => {},
    removeTransport: () => {},
  }
  return logger
}

afterEach(() => {
  for (const stop of stops.splice(0)) stop()
  resetChatStoresForTests()
  sessionStorage.clear()
  document.body.innerHTML = ''
})

describe('useChat history load failure', () => {
  it('logs the failure and leaves an empty, usable chat', async () => {
    const warn = vi.fn()
    const logger = createLogger(warn)
    const loggerProvider: LoggerProvider = {
      getLogger: () => logger,
      createLogger: () => logger,
      setLevel: () => {},
      getLevel: () => 'info',
      addTransport: () => () => {},
      enable: () => {},
      disable: () => {},
      isEnabled: () => true,
    }
    setLoggerProvider(loggerProvider)

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

    const chat = renderChat(provider, { endpoint: '/chat', projectId: 'proj-1', loadOnMount: true })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(loadHistory).toHaveBeenCalled()
    expect(get(chat.messages)).toEqual([])
    expect(warn).toHaveBeenCalledWith('Loading chat history failed', {
      error: expect.objectContaining({ message: 'history endpoint returned 500' }),
    })
  })
})
