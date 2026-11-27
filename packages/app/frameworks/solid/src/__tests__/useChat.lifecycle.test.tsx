// @vitest-environment jsdom

/**
 * The Solid counterpart of React's `useChat.lifecycle.test.tsx`: dropped-stream
 * recovery and page-lifecycle reconciliation, under the same titles.
 *
 * The behavior lives in the shared `createChatSession`, so the provider script
 * and the assertions are the React ones; only `renderHook` becomes a mounted
 * probe whose accessors are read.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ChatEventHandler,
  ChatMessage,
  ChatProvider,
  ChatStreamEvent,
} from '@molecule/app-ai-chat'

import { ChatContext } from '../chat-context.js'
import { resetChatStoresForTests, useChat, type UseChatResult } from '../primitives/chat.js'

/** A dropped-stream provider whose script, calls and flags the test inspects. */
interface DroppedStreamProvider extends ChatProvider {
  calls: { message: string; resume?: boolean }[]
  abort: ReturnType<typeof vi.fn<() => void>>
  isServerStreaming: boolean
}

/**
 * Mock provider for dropped-stream scenarios: sendMessage replays a script
 * entry's events and resolves WITHOUT a terminal event (simulating a socket
 * that died while the page was frozen — the AbortError is swallowed by the
 * real http bond, so the promise resolves cleanly). `isServerStreaming` stays
 * true until `loadHistory` has been called `streamingUntilLoad` times.
 *
 * @param opts - The script, history and streaming/hang behavior.
 * @returns The provider.
 */
function createDroppedStreamProvider(opts: {
  script: ChatStreamEvent[][]
  history: ChatMessage[]
  streamingUntilLoad: number
  hangUntilAbort?: boolean
}): DroppedStreamProvider {
  const calls: { message: string; resume?: boolean }[] = []
  let loadCount = 0
  let resolveSend: (() => void) | null = null
  const abort = vi.fn((): void => {
    resolveSend?.()
    resolveSend = null
  })
  const provider: DroppedStreamProvider = {
    name: 'dropped',
    calls,
    isServerStreaming: true,
    abort,
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
    async clearHistory() {},
    async loadHistory() {
      loadCount++
      provider.isServerStreaming = loadCount < opts.streamingUntilLoad
      return opts.history
    },
  }
  return provider
}

const disposers: Array<() => void> = []

/**
 * Mounts `useChat` against a provider and returns the primitive.
 *
 * @param provider - The chat provider to provide.
 * @returns The created chat primitive.
 */
function renderChat(provider: ChatProvider): UseChatResult {
  let captured: UseChatResult | undefined
  function Probe(): JSX.Element {
    captured = useChat({ endpoint: '/chat', projectId: 'proj-1', loadOnMount: false })
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

/**
 * Overrides document.visibilityState and fires the visibilitychange event.
 *
 * @param state - The visibility state to report.
 */
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
  for (const dispose of disposers.splice(0)) dispose()
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
    const chat = renderChat(provider)

    await chat.sendMessage('build me an app')
    // Post-loop tail (setTimeout 0) → resume phase 1 (1s poll) → phase 2 resume.
    await vi.advanceTimersByTimeAsync(2500)

    expect(chat.error()).toBeNull()
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
    const chat = renderChat(provider)

    void chat.sendMessage('build me an app')
    // The page freezes (screen lock) — no events for over a minute.
    await vi.advanceTimersByTimeAsync(60_000)

    setVisibility('visible')
    expect(provider.abort).toHaveBeenCalledTimes(1)

    // The unblocked send reconciles and re-enters the resume flow.
    await vi.advanceTimersByTimeAsync(2500)
    expect(provider.calls.some((call) => call.resume === true)).toBe(true)
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
    const chat = renderChat(provider)

    void chat.sendMessage('build me an app')
    // A SHORT lock: the socket dies, but at unlock the silence (30s) is still
    // inside the 45s threshold — no immediate abort.
    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(30_000)
    setVisibility('visible')
    expect(provider.abort).not.toHaveBeenCalled()

    // No further events arrive — the armed re-check fires once silence crosses
    // the threshold (~16s later) and aborts, instead of the 3-minute watchdog.
    await vi.advanceTimersByTimeAsync(17_000)
    expect(provider.abort).toHaveBeenCalledTimes(1)

    // The unblocked send reconciles and re-enters the resume flow.
    await vi.advanceTimersByTimeAsync(2500)
    expect(provider.calls.some((call) => call.resume === true)).toBe(true)
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
    const chat = renderChat(provider)

    void chat.sendMessage('build me an app')
    // Only a few seconds in the background — well inside the keep-alive window.
    await vi.advanceTimersByTimeAsync(10_000)

    setVisibility('visible')
    expect(provider.abort).not.toHaveBeenCalled()
  })

  it('reconciles an idle transcript after a real absence', async () => {
    const provider = createDroppedStreamProvider({
      script: [],
      history: HISTORY,
      streamingUntilLoad: 0, // server not streaming — nothing to resume
    })
    const chat = renderChat(provider)
    expect(chat.messages()).toHaveLength(0)

    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(10_000)
    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(100)

    // The server finished a turn while the page was away — history is applied.
    expect(chat.messages()).toHaveLength(2)
    expect(provider.calls).toHaveLength(0) // no send, no resume — just the reload
  })

  it('skips the idle reconcile on a quick tab switch', async () => {
    const provider = createDroppedStreamProvider({
      script: [],
      history: HISTORY,
      streamingUntilLoad: 0,
    })
    const chat = renderChat(provider)

    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(1_000)
    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(100)

    expect(chat.messages()).toHaveLength(0)
  })
})
