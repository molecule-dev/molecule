// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ChatEventHandler,
  ChatMessage,
  ChatProvider,
  ChatStreamEvent,
} from '@molecule/app-ai-chat'

import { ChatContext } from '../contexts.js'
import { resetChatStoresForTests, useChat } from '../hooks/useChat.js'

/**
 * Mock provider for dropped-stream scenarios: sendMessage replays a script
 * entry's events and resolves WITHOUT a terminal event (simulating a socket
 * that died while the page was frozen — the AbortError is swallowed by the
 * real http bond, so the promise resolves cleanly). `isServerStreaming` stays
 * true until `loadHistory` has been called `streamingUntilLoad` times, mirroring
 * a server that keeps working through the drop and finishes later.
 */
function createDroppedStreamProvider(opts: {
  script: ChatStreamEvent[][]
  history: ChatMessage[]
  streamingUntilLoad: number
  hangUntilAbort?: boolean
}): ChatProvider & {
  calls: { message: string; resume?: boolean }[]
  abort: ReturnType<typeof vi.fn>
  isServerStreaming: boolean
} {
  const calls: { message: string; resume?: boolean }[] = []
  let loadCount = 0
  let resolveSend: (() => void) | null = null
  const provider = {
    name: 'dropped',
    calls,
    isServerStreaming: true,
    sendMessage(
      message: string,
      config: { resume?: boolean },
      onEvent: ChatEventHandler,
    ): Promise<void> {
      calls.push({ message, resume: config.resume })
      const events = opts.script.shift()
      if (!events) {
        // Calls beyond the script terminate cleanly (the successful resume).
        onEvent({ type: 'done' })
        return Promise.resolve()
      }
      for (const event of events) onEvent(event)
      if (opts.hangUntilAbort && calls.length === 1) {
        // First send hangs like a dead socket — resolves only when aborted.
        return new Promise<void>((resolve) => {
          resolveSend = resolve
        })
      }
      return Promise.resolve()
    },
    abort: vi.fn(() => {
      resolveSend?.()
      resolveSend = null
    }),
    async clearHistory() {},
    async loadHistory() {
      loadCount++
      provider.isServerStreaming = loadCount < opts.streamingUntilLoad
      return opts.history
    },
  }
  return provider as unknown as ChatProvider & {
    calls: { message: string; resume?: boolean }[]
    abort: ReturnType<typeof vi.fn>
    isServerStreaming: boolean
  }
}

const wrapperFor =
  (provider: ChatProvider) =>
  ({ children }: { children: ReactNode }) => (
    <ChatContext.Provider value={provider}>{children}</ChatContext.Provider>
  )

const renderChat = (
  provider: ChatProvider,
): ReturnType<typeof renderHook<ReturnType<typeof useChat>, unknown>> =>
  renderHook(() => useChat({ endpoint: '/chat', projectId: 'proj-1', loadOnMount: false }), {
    wrapper: wrapperFor(provider),
  })

/** Override document.visibilityState and fire the visibilitychange event. */
function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

const HISTORY: ChatMessage[] = [
  { id: 'u1', role: 'user', content: 'build me an app', timestamp: 1 },
  { id: 'a1', role: 'assistant', content: 'partial answer', timestamp: 2 },
]

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  resetChatStoresForTests()
  sessionStorage.clear()
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'visible',
  })
})

describe('useChat dropped-stream recovery', () => {
  it('resumes when the stream closes without a terminal event while the server still streams', async () => {
    const provider = createDroppedStreamProvider({
      script: [
        [
          { type: 'conversation', id: 'c1' },
          { type: 'message_start', id: 'a1', timestamp: 1 },
          { type: 'text', content: 'partial ' },
          // No done / error — the socket died mid-turn.
        ],
      ],
      history: HISTORY,
      // Reconcile load sees streaming=true; the resume's phase-1 poll then sees false.
      streamingUntilLoad: 2,
    })
    const { result } = renderChat(provider)

    await act(async () => {
      await result.current.sendMessage('build me an app')
    })
    // Post-loop tail (setTimeout 0) → resume phase 1 (1s poll) → phase 2 resume.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })

    expect(result.current.error).toBeNull()
    expect(provider.calls).toHaveLength(2)
    expect(provider.calls[1]).toEqual({ message: '', resume: true })
  })

  it('aborts a silent stream on return to the foreground and resumes it', async () => {
    const provider = createDroppedStreamProvider({
      script: [
        [
          { type: 'conversation', id: 'c1' },
          { type: 'message_start', id: 'a1', timestamp: 1 },
          { type: 'text', content: 'working…' },
        ],
      ],
      history: HISTORY,
      streamingUntilLoad: 2,
      hangUntilAbort: true,
    })
    const { result } = renderChat(provider)

    act(() => {
      void result.current.sendMessage('build me an app')
    })
    // The page freezes (screen lock) — no events for over a minute.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })

    act(() => {
      setVisibility('visible')
    })
    expect(provider.abort).toHaveBeenCalledTimes(1)

    // The unblocked send reconciles and re-enters the resume flow.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })
    expect(provider.calls.some((c) => c.resume === true)).toBe(true)
  })

  it('aborts a dead stream via the armed re-check when unlock lands inside the silence threshold', async () => {
    const provider = createDroppedStreamProvider({
      script: [
        [
          { type: 'conversation', id: 'c1' },
          { type: 'message_start', id: 'a1', timestamp: 1 },
          { type: 'text', content: 'working…' },
        ],
      ],
      history: HISTORY,
      streamingUntilLoad: 2,
      hangUntilAbort: true,
    })
    const { result } = renderChat(provider)

    act(() => {
      void result.current.sendMessage('build me an app')
    })
    // A SHORT lock: the socket dies, but at unlock the silence (30s) is still
    // inside the 45s threshold — no immediate abort.
    act(() => {
      setVisibility('hidden')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    act(() => {
      setVisibility('visible')
    })
    expect(provider.abort).not.toHaveBeenCalled()

    // No further events arrive — the armed re-check fires once silence crosses
    // the threshold (~16s later) and aborts, instead of the 3-minute watchdog.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(17_000)
    })
    expect(provider.abort).toHaveBeenCalledTimes(1)

    // The unblocked send reconciles and re-enters the resume flow.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })
    expect(provider.calls.some((c) => c.resume === true)).toBe(true)
  })

  it('does not abort a live stream after a quick app switch', async () => {
    const provider = createDroppedStreamProvider({
      script: [
        [
          { type: 'conversation', id: 'c1' },
          { type: 'message_start', id: 'a1', timestamp: 1 },
          { type: 'text', content: 'working…' },
        ],
      ],
      history: HISTORY,
      streamingUntilLoad: 1,
      hangUntilAbort: true,
    })
    const { result } = renderChat(provider)

    act(() => {
      void result.current.sendMessage('build me an app')
    })
    // Only a few seconds in the background — well inside the keep-alive window.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })

    act(() => {
      setVisibility('visible')
    })
    expect(provider.abort).not.toHaveBeenCalled()
  })

  it('reconciles an idle transcript after a real absence', async () => {
    const provider = createDroppedStreamProvider({
      script: [],
      history: HISTORY,
      streamingUntilLoad: 0, // server not streaming — nothing to resume
    })
    const { result } = renderChat(provider)
    expect(result.current.messages).toHaveLength(0)

    act(() => {
      setVisibility('hidden')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    act(() => {
      setVisibility('visible')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    // The server finished a turn while the page was away — history is applied.
    expect(result.current.messages).toHaveLength(2)
    expect(provider.calls).toHaveLength(0) // no send, no resume — just the reload
  })

  it('skips the idle reconcile on a quick tab switch', async () => {
    const provider = createDroppedStreamProvider({
      script: [],
      history: HISTORY,
      streamingUntilLoad: 0,
    })
    const { result } = renderChat(provider)

    act(() => {
      setVisibility('hidden')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    act(() => {
      setVisibility('visible')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(result.current.messages).toHaveLength(0)
  })
})
