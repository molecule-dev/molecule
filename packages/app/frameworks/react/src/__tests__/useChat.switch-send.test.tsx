// @vitest-environment jsdom

/**
 * A message sent in a conversation opened while another conversation's reply
 * is still streaming starts its own turn: the orphaned stream's send loop does
 * not keep the send slot, and does not take it back when it finally ends.
 *
 * @module
 */

import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ChatEventHandler, ChatProvider } from '@molecule/app-ai-chat'

import { ChatContext } from '../contexts.js'
import { resetChatStoresForTests, useChat } from '../hooks/useChat.js'

afterEach(() => {
  resetChatStoresForTests()
  sessionStorage.clear()
})

/**
 * A chat provider whose replies stream until the test finishes them.
 *
 * @returns The provider and a function that ends the reply to the nth send.
 */
function heldReplies(): { provider: ChatProvider; finish: (index: number) => void } {
  const finishers: Array<() => void> = []
  const provider = {
    name: 'held-replies',
    sendMessage: vi.fn(
      (_message: string, _config: unknown, onEvent: ChatEventHandler) =>
        new Promise<void>((resolve) => {
          finishers.push(() => {
            onEvent({ type: 'done' })
            resolve()
          })
        }),
    ),
    abort: vi.fn(),
    clearHistory: vi.fn(async () => undefined),
    loadHistory: vi.fn(async () => []),
  } as unknown as ChatProvider
  return { provider, finish: (index) => finishers[index]?.() }
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe('useChat conversation switch during a stream', () => {
  it.each([
    ['without a history load', false],
    ['with a history load', true],
  ])(
    'sends in the new conversation, and the old stream ending does not reclaim the slot (%s)',
    async (_label, loadOnMount) => {
      const { provider, finish } = heldReplies()
      const { result, rerender } = renderHook(
        ({ endpoint }: { endpoint: string }) =>
          useChat({ endpoint, projectId: 'proj-1', loadOnMount }),
        {
          initialProps: { endpoint: '/chat?conversationId=a' },
          wrapper: ({ children }: { children: ReactNode }) => (
            <ChatContext.Provider value={provider}>{children}</ChatContext.Provider>
          ),
        },
      )

      await act(async () => {
        void result.current.sendMessage('in conversation a')
        await flush()
      })
      expect(provider.sendMessage).toHaveBeenCalledTimes(1)

      rerender({ endpoint: '/chat?conversationId=b' })
      await act(async () => {
        void result.current.sendMessage('in conversation b')
        await flush()
      })
      expect(provider.sendMessage).toHaveBeenCalledTimes(2)
      expect(result.current.messages.find((m) => m.content === 'in conversation b')?.queued).toBe(
        false,
      )

      // The orphaned reply ends while b's reply streams: b keeps the slot, so a
      // third message queues behind b and is sent when b's reply ends.
      await act(async () => {
        finish(0)
        await flush()
      })
      await act(async () => {
        void result.current.sendMessage('after the old reply ended')
        await flush()
      })
      expect(provider.sendMessage).toHaveBeenCalledTimes(2)
      expect(
        result.current.messages.find((m) => m.content === 'after the old reply ended')?.queued,
      ).toBe(true)

      await act(async () => {
        finish(1)
        await flush()
      })
      expect(provider.sendMessage).toHaveBeenCalledTimes(3)
      expect(vi.mocked(provider.sendMessage).mock.calls[2]?.[0]).toBe('after the old reply ended')
    },
  )
})

describe('useChat conversation switch when the old stream drops', () => {
  it("does not merge the old conversation's history into the new one", async () => {
    let dropOld = (): void => {}
    const provider = {
      name: 'dropping',
      sendMessage: vi.fn(
        (_message: string, _config: unknown, onEvent: ChatEventHandler) =>
          new Promise<void>((resolve) => {
            onEvent({ type: 'message_start', id: 'a-reply', timestamp: 1 })
            // The connection closes with no done/error event.
            dropOld = resolve
          }),
      ),
      abort: vi.fn(),
      clearHistory: vi.fn(async () => undefined),
      loadHistory: vi.fn(async (config: { endpoint: string }) =>
        config.endpoint.includes('conversationId=a')
          ? [
              { id: 'a-user', role: 'user', content: 'in conversation a', timestamp: 1 },
              { id: 'a-reply', role: 'assistant', content: 'reply in a', timestamp: 2 },
            ]
          : [],
      ),
    } as unknown as ChatProvider
    const { result, rerender } = renderHook(
      ({ endpoint }: { endpoint: string }) =>
        useChat({ endpoint, projectId: 'proj-1', loadOnMount: false }),
      {
        initialProps: { endpoint: '/chat?conversationId=a' },
        wrapper: ({ children }: { children: ReactNode }) => (
          <ChatContext.Provider value={provider}>{children}</ChatContext.Provider>
        ),
      },
    )
    await act(async () => {
      void result.current.sendMessage('in conversation a')
      await flush()
    })

    rerender({ endpoint: '/chat?conversationId=b' })
    await act(async () => {
      dropOld()
      await flush()
    })

    expect(result.current.messages.map((m) => m.content)).toEqual([])
    expect(provider.loadHistory).not.toHaveBeenCalled()
  })
})
