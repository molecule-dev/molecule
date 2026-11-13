// @vitest-environment jsdom

/**
 * A chat whose history fails to load still works, and the failure is logged
 * so an empty chat after a reload has a cause someone can find.
 *
 * @module
 */

import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ChatProvider } from '@molecule/app-ai-chat'
import { type LoggerProvider, setProvider as setLoggerProvider } from '@molecule/app-logger'

import { ChatContext } from '../contexts.js'
import { resetChatStoresForTests, useChat } from '../hooks/useChat.js'

afterEach(() => {
  resetChatStoresForTests()
  sessionStorage.clear()
})

describe('useChat history load failure', () => {
  it('logs the failure and leaves an empty, usable chat', async () => {
    const warn = vi.fn()
    setLoggerProvider({ getLogger: () => ({ warn }) } as unknown as LoggerProvider)
    const provider = {
      name: 'failing-history',
      sendMessage: vi.fn(async () => undefined),
      abort: vi.fn(),
      clearHistory: vi.fn(async () => undefined),
      loadHistory: vi.fn(async () => {
        throw new Error('history endpoint returned 500')
      }),
    } as unknown as ChatProvider

    const { result } = renderHook(
      () => useChat({ endpoint: '/chat', projectId: 'proj-1', loadOnMount: true }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <ChatContext.Provider value={provider}>{children}</ChatContext.Provider>
        ),
      },
    )
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(provider.loadHistory).toHaveBeenCalled()
    expect(result.current.messages).toEqual([])
    expect(warn).toHaveBeenCalledWith('Loading chat history failed', {
      error: expect.objectContaining({ message: 'history endpoint returned 500' }),
    })
  })
})
