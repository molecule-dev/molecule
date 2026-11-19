// @vitest-environment jsdom

/**
 * The Solid counterpart of React's `useChat.history-failure.test.tsx`: a chat
 * whose history fails to load still works, and the failure is logged so an
 * empty chat after a reload has a cause someone can find.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ChatProvider } from '@molecule/app-ai-chat'
import {
  type Logger,
  type LoggerProvider,
  setProvider as setLoggerProvider,
} from '@molecule/app-logger'

import { ChatContext } from '../context.js'
import { resetChatStoresForTests, useChat } from '../primitives/chat.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  resetChatStoresForTests()
  sessionStorage.clear()
})

/**
 * A logger provider whose warning is recorded.
 *
 * @param warn - The warning recorder.
 * @returns The typed provider.
 */
function loggerProvider(warn: (message: string, ...args: unknown[]) => void): LoggerProvider {
  const logger: Logger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn,
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: () => 'info',
    child: () => logger,
    withContext: () => logger,
    addTransport: vi.fn(() => () => {}),
    removeTransport: vi.fn(),
  }
  return {
    getLogger: () => logger,
    createLogger: () => logger,
    setLevel: vi.fn(),
    getLevel: () => 'info',
    addTransport: vi.fn(() => () => {}),
    enable: vi.fn(),
    disable: vi.fn(),
    isEnabled: () => true,
  }
}

describe('useChat history load failure', () => {
  it('logs the failure and leaves an empty, usable chat', async () => {
    const warn = vi.fn<(message: string, ...args: unknown[]) => void>()
    setLoggerProvider(loggerProvider(warn))
    const loadHistory = vi.fn(async () => {
      throw new Error('history endpoint returned 500')
    })
    const provider: ChatProvider = {
      name: 'failing-history',
      sendMessage: vi.fn(async () => undefined),
      abort: vi.fn(),
      clearHistory: vi.fn(async () => undefined),
      loadHistory,
    }

    let chat!: ReturnType<typeof useChat>
    function Probe(): JSX.Element {
      chat = useChat({ endpoint: '/chat', projectId: 'proj-1', loadOnMount: true })
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
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })

    expect(loadHistory).toHaveBeenCalled()
    expect(chat.messages()).toEqual([])
    expect(warn).toHaveBeenCalledWith('Loading chat history failed', {
      error: expect.objectContaining({ message: 'history endpoint returned 500' }),
    })
  })
})
