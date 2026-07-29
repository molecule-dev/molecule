// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatEventHandler, ChatProvider, ChatStreamEvent } from '@molecule/app-ai-chat'

import { ChatContext } from '../contexts.js'
import { resetChatStoresForTests, useChat } from '../hooks/useChat.js'

/**
 * Scriptable mock chat provider: each sendMessage call shifts the next script
 * entry and replays its events into the stream handler. Calls beyond the script
 * emit a clean `done` so a retried turn terminates.
 */
function createScriptedProvider(script: ChatStreamEvent[][]): ChatProvider & {
  calls: { message: string; resume?: boolean }[]
} {
  const calls: { message: string; resume?: boolean }[] = []
  return {
    name: 'scripted',
    calls,
    // The resume path's phase-1 poll loops until the provider reports the
    // server-side stream finished — report "not streaming" immediately.
    isServerStreaming: false,
    async sendMessage(
      message: string,
      config: { resume?: boolean },
      onEvent: ChatEventHandler,
    ): Promise<void> {
      calls.push({ message, resume: config.resume })
      const events = script.shift() ?? [{ type: 'done' }]
      for (const event of events) onEvent(event)
    },
    abort: () => {},
    async clearHistory() {},
    async loadHistory() {
      return []
    },
  } as unknown as ChatProvider & { calls: { message: string; resume?: boolean }[] }
}

const wrapperFor =
  (provider: ChatProvider) =>
  ({ children }: { children: ReactNode }) => (
    <ChatContext.Provider value={provider}>{children}</ChatContext.Provider>
  )

const renderChat = (provider: ChatProvider) =>
  renderHook(() => useChat({ endpoint: '/chat', projectId: 'proj-1', loadOnMount: false }), {
    wrapper: wrapperFor(provider),
  })

/** Drive the retry countdown to zero and let the queued retry begin. */
async function elapseCountdown(seconds: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(seconds * 1000)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  resetChatStoresForTests()
  sessionStorage.clear()
})

describe('useChat auto-retry', () => {
  it('auto-resumes after a mid-stream transport drop', async () => {
    const provider = createScriptedProvider([
      [
        { type: 'conversation', id: 'c1' },
        { type: 'message_start', id: 'a1', timestamp: 1 },
        { type: 'text', content: 'partial ' },
        { type: 'error', transport: true, message: 'network error' },
      ],
    ])
    const { result } = renderChat(provider)

    await act(async () => {
      await result.current.sendMessage('build me an app')
    })

    // Not surfaced as terminal — a countdown is scheduled instead.
    expect(result.current.error).toBeNull()
    expect(result.current.retryCountdown).toEqual({ secondsRemaining: 5, attempt: 1 })

    // Countdown elapses → resume phase 1 (1s history poll) → phase 2 resume send.
    await elapseCountdown(5)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })

    expect(provider.calls).toHaveLength(2)
    expect(provider.calls[1]).toEqual({ message: '', resume: true })
  })

  it('auto-resumes after a 5XX shutdown-handoff error mid-stream', async () => {
    const provider = createScriptedProvider([
      [
        { type: 'conversation', id: 'c1' },
        { type: 'message_start', id: 'a1', timestamp: 1 },
        { type: 'error', status: 503, message: 'Server restarting — resuming shortly' },
      ],
    ])
    const { result } = renderChat(provider)

    await act(async () => {
      await result.current.sendMessage('keep going')
    })

    expect(result.current.error).toBeNull()
    expect(result.current.retryCountdown).toEqual({ secondsRemaining: 5, attempt: 1 })

    await elapseCountdown(5)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })

    expect(provider.calls).toHaveLength(2)
    expect(provider.calls[1]).toEqual({ message: '', resume: true })
  })

  it('re-sends (not resumes) when the turn never started server-side', async () => {
    const provider = createScriptedProvider([
      // Connection refused before ANY server event arrived.
      [{ type: 'error', transport: true, message: 'Failed to fetch' }],
    ])
    const { result } = renderChat(provider)

    await act(async () => {
      await result.current.sendMessage('hello there')
    })

    expect(result.current.error).toBeNull()
    expect(result.current.retryCountdown).toEqual({ secondsRemaining: 5, attempt: 1 })

    await elapseCountdown(5)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(provider.calls).toHaveLength(2)
    // The retry re-sent the ORIGINAL message — a resume would have dropped it
    // (the server never persisted it).
    expect(provider.calls[1].message).toBe('hello there')
    expect(provider.calls[1].resume).toBeUndefined()

    // No duplicate optimistic bubble: exactly one user message with the text.
    const userBubbles = result.current.messages.filter(
      (m) => m.role === 'user' && m.content === 'hello there',
    )
    expect(userBubbles).toHaveLength(1)
  })

  it('surfaces a server-emitted status-less error as terminal (no retry)', async () => {
    const provider = createScriptedProvider([
      [
        { type: 'conversation', id: 'c1' },
        { type: 'error', message: 'AI provider not configured' },
      ],
    ])
    const { result } = renderChat(provider)

    await act(async () => {
      await result.current.sendMessage('hi')
    })

    expect(result.current.error).toBe('AI provider not configured')
    expect(result.current.retryCountdown).toBeNull()
    expect(provider.calls).toHaveLength(1)
  })

  it('never retries a limit/quota-gated 5XX', async () => {
    const provider = createScriptedProvider([
      [{ type: 'error', status: 503, limitType: 'api_rate', message: 'Too busy' }],
    ])
    const { result } = renderChat(provider)

    await act(async () => {
      await result.current.sendMessage('hi')
    })

    expect(result.current.error).toBe('Too busy')
    expect(result.current.errorMeta).toEqual({ limitType: 'api_rate', requiresSignup: undefined })
    expect(result.current.retryCountdown).toBeNull()
    expect(provider.calls).toHaveLength(1)
  })
})
