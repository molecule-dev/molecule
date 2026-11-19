// @vitest-environment jsdom

/**
 * `useChat`'s auto-retry recovers an interrupted turn instead of surfacing a
 * terminal error: a dropped connection resumes, a never-started turn re-sends,
 * and a server error is retried on a doubling backoff — React's
 * `useChat.retry.test.tsx` in Svelte's idiom.
 *
 * The retry ladder lives in `@molecule/app-ai-chat`'s shared session, which this
 * hook wraps. The mounting surface is the package's usual one: `svelte`'s
 * context and lifecycle functions are stubbed and `renderChat` runs the hook the
 * way a component's init does, then its mount callbacks (React's committed
 * effect).
 *
 * @module
 */

import { get } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ChatConfig,
  ChatEventHandler,
  ChatProvider,
  ChatStreamEvent,
} from '@molecule/app-ai-chat'

import { setMoleculeContext } from '../context.js'
import { resetChatStoresForTests, useChat, type UseChatOptions } from '../stores/chat.js'

const svelteLifecycle = vi.hoisted(() => ({
  contextStore: new Map<symbol, unknown>(),
  mountCallbacks: [] as Array<() => void | (() => void)>,
  destroyCallbacks: [] as Array<() => void>,
}))

vi.mock('svelte', () => ({
  getContext: (key: symbol): unknown => svelteLifecycle.contextStore.get(key),
  setContext: (key: symbol, value: unknown): void => {
    svelteLifecycle.contextStore.set(key, value)
  },
  onMount: (callback: () => void | (() => void)): void => {
    svelteLifecycle.mountCallbacks.push(callback)
  },
  onDestroy: (callback: () => void): void => {
    svelteLifecycle.destroyCallbacks.push(callback)
  },
  untrack: <T>(callback: () => T): T => callback(),
}))

/** The scripted provider, with the calls the cases assert on. */
interface ScriptedProvider extends ChatProvider {
  calls: { message: string; resume?: boolean }[]
  isServerStreaming: boolean
}

/**
 * Scriptable mock chat provider: each sendMessage call shifts the next script
 * entry and replays its events into the stream handler. Calls beyond the script
 * emit a clean `done` so a retried turn terminates.
 *
 * @param script - The events each successive send replays.
 * @returns The provider.
 */
function createScriptedProvider(script: ChatStreamEvent[][]): ScriptedProvider {
  const calls: { message: string; resume?: boolean }[] = []
  return {
    name: 'scripted',
    calls,
    // The resume path's phase-1 poll loops until the provider reports the
    // server-side stream finished — report "not streaming" immediately.
    isServerStreaming: false,
    async sendMessage(
      message: string,
      config: ChatConfig,
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
  }
}

/** The chat hooks this file mounted, torn down after each case. */
const stops: Array<() => void> = []

/**
 * Runs `useChat` once, the way a component's init does, under `provider`'s chat
 * context, then runs the component's mount callbacks (React's committed effect).
 *
 * @param provider - The chat provider to set in context.
 * @returns The hook's result and its unmount.
 */
function renderChat(provider: ChatProvider): {
  chat: ReturnType<typeof useChat>
  stop: () => void
} {
  svelteLifecycle.contextStore.clear()
  svelteLifecycle.mountCallbacks.length = 0
  svelteLifecycle.destroyCallbacks.length = 0
  setMoleculeContext({ chat: provider })
  const options: UseChatOptions = { endpoint: '/chat', projectId: 'proj-1', loadOnMount: false }
  const chat = useChat(options)
  const cleanups: Array<() => void> = []
  for (const callback of svelteLifecycle.mountCallbacks.splice(0)) {
    const cleanup = callback()
    if (typeof cleanup === 'function') cleanups.push(cleanup)
  }
  const stop = (): void => {
    for (const cleanup of cleanups.splice(0)) cleanup()
    for (const callback of svelteLifecycle.destroyCallbacks.splice(0)) callback()
  }
  stops.push(stop)
  return { chat, stop }
}

/** Drive the retry countdown to zero and let the queued retry begin. */
async function elapseCountdown(seconds: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(seconds * 1000)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  for (const stop of stops.splice(0)) stop()
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
    const { chat } = renderChat(provider)

    await chat.sendMessage('build me an app')

    // Not surfaced as terminal — a countdown is scheduled instead.
    expect(get(chat.error)).toBeNull()
    expect(get(chat.retryCountdown)).toEqual({ secondsRemaining: 5, attempt: 1 })

    // Countdown elapses → resume phase 1 (1s history poll) → phase 2 resume send.
    await elapseCountdown(5)
    await vi.advanceTimersByTimeAsync(2500)

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
    const { chat } = renderChat(provider)

    await chat.sendMessage('keep going')

    expect(get(chat.error)).toBeNull()
    expect(get(chat.retryCountdown)).toEqual({ secondsRemaining: 5, attempt: 1 })

    await elapseCountdown(5)
    await vi.advanceTimersByTimeAsync(2500)

    expect(provider.calls).toHaveLength(2)
    expect(provider.calls[1]).toEqual({ message: '', resume: true })
  })

  it('re-sends (not resumes) when the turn never started server-side', async () => {
    const provider = createScriptedProvider([
      // Connection refused before ANY server event arrived.
      [{ type: 'error', transport: true, message: 'Failed to fetch' }],
    ])
    const { chat } = renderChat(provider)

    await chat.sendMessage('hello there')

    expect(get(chat.error)).toBeNull()
    expect(get(chat.retryCountdown)).toEqual({ secondsRemaining: 5, attempt: 1 })

    await elapseCountdown(5)
    await vi.advanceTimersByTimeAsync(100)

    expect(provider.calls).toHaveLength(2)
    // The retry re-sent the ORIGINAL message — a resume would have dropped it
    // (the server never persisted it).
    expect(provider.calls[1].message).toBe('hello there')
    expect(provider.calls[1].resume).toBeUndefined()

    // No duplicate optimistic bubble: exactly one user message with the text.
    const userBubbles = get(chat.messages).filter(
      (message) => message.role === 'user' && message.content === 'hello there',
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
    const { chat } = renderChat(provider)

    await chat.sendMessage('hi')

    expect(get(chat.error)).toBe('AI provider not configured')
    expect(get(chat.retryCountdown)).toBeNull()
    expect(provider.calls).toHaveLength(1)
  })

  it('never retries a limit/quota-gated 5XX', async () => {
    const provider = createScriptedProvider([
      [{ type: 'error', status: 503, limitType: 'api_rate', message: 'Too busy' }],
    ])
    const { chat } = renderChat(provider)

    await chat.sendMessage('hi')

    expect(get(chat.error)).toBe('Too busy')
    expect(get(chat.errorMeta)).toEqual({ limitType: 'api_rate', requiresSignup: undefined })
    expect(get(chat.retryCountdown)).toBeNull()
    expect(provider.calls).toHaveLength(1)
  })

  it('re-arms the backoff at double the wait when the re-sent turn fails again', async () => {
    const provider = createScriptedProvider([
      // Both attempts die before ANY server event, so both retry as a re-send.
      [{ type: 'error', transport: true, message: 'Failed to fetch' }],
      [{ type: 'error', transport: true, message: 'Failed to fetch' }],
    ])
    const { chat } = renderChat(provider)

    await chat.sendMessage('hello there')
    expect(get(chat.retryCountdown)).toEqual({ secondsRemaining: 5, attempt: 1 })

    // The re-send is the RETRY, not a fresh user send: its failure must re-arm
    // the ladder at the doubled wait (attempt 2), not restart it at attempt 1.
    await elapseCountdown(5)
    await vi.advanceTimersByTimeAsync(100)

    expect(provider.calls).toHaveLength(2)
    expect(provider.calls[1]?.message).toBe('hello there')
    expect(get(chat.error)).toBeNull()
    expect(get(chat.retryCountdown)).toEqual({ secondsRemaining: 10, attempt: 2 })
  })

  it('surfaces the error once the retry budget is exhausted', async () => {
    // Eight attempts (waits 5, 10, 20, then 30 s each) all fail — the ninth
    // failure finds the budget spent and surfaces the held error instead.
    const drop: ChatStreamEvent[] = [{ type: 'error', transport: true, message: 'Failed to fetch' }]
    const provider = createScriptedProvider([drop, drop, drop, drop, drop, drop, drop, drop, drop])
    const { chat } = renderChat(provider)

    await chat.sendMessage('hello there')

    const waits = [5, 10, 20, 30, 30, 30, 30, 30]
    for (const wait of waits) {
      expect(get(chat.retryCountdown)).not.toBeNull()
      await elapseCountdown(wait)
      await vi.advanceTimersByTimeAsync(100)
    }

    // Eight retries fired (the original send + eight re-sends); the ninth
    // failure surfaced the error instead of scheduling a ninth attempt.
    expect(provider.calls).toHaveLength(9)
    expect(get(chat.retryCountdown)).toBeNull()
    expect(get(chat.error)).toBe('Failed to fetch')
  })
})
