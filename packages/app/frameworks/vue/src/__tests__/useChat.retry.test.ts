// @vitest-environment jsdom

/**
 * Auto-retry after a dropped connection or a backend 5XX: the shared chat
 * session holds the error, shows a cancelable countdown, and resumes (or
 * re-sends) when it elapses. The composable exposes that state unchanged.
 *
 * @module
 */

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, shallowRef } from 'vue'

import type { ChatEventHandler, ChatProvider, ChatStreamEvent } from '@molecule/app-ai-chat'

import { createChatPlugin } from '../chat-plugin.js'
import { resetChatStoresForTests, useChat, type UseChatOptions } from '../composables/useChat.js'

/**
 * Scriptable mock chat provider: each sendMessage call shifts the next script
 * entry and replays its events into the stream handler. Calls beyond the script
 * emit a clean `done` so a retried turn terminates.
 */
interface ScriptedProvider extends ChatProvider {
  calls: { message: string; resume?: boolean }[]
  isServerStreaming: boolean
}

/**
 * Creates the scripted provider.
 *
 * @param script - One event list per send, in order.
 * @returns The provider, recording each send.
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
  }
}

const wrappers: VueWrapper[] = []

/**
 * Mounts `useChat` against `provider`, with an options ref the test can move
 * (a changed endpoint is React's re-render with new props).
 *
 * @param provider - The chat provider to inject.
 * @param initial - The options the composable starts with.
 * @returns The composable result and an options setter.
 */
const renderChat = (
  provider: ChatProvider,
  initial: UseChatOptions = { endpoint: '/chat', projectId: 'proj-1', loadOnMount: false },
): {
  chat: ReturnType<typeof useChat>
  setOptions: (next: UseChatOptions) => Promise<void>
} => {
  const options = shallowRef<UseChatOptions>(initial)
  let chat!: ReturnType<typeof useChat>
  const Harness = defineComponent({
    setup() {
      chat = useChat(options)
      return () => h('div')
    },
  })
  wrappers.push(mount(Harness, { global: { plugins: [createChatPlugin(provider)] } }))
  return {
    chat,
    setOptions: async (next: UseChatOptions): Promise<void> => {
      options.value = next
      await nextTick()
    },
  }
}

/** Drive the retry countdown to zero and let the queued retry begin. */
async function elapseCountdown(seconds: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(seconds * 1000)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
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
    expect(chat.error.value).toBeNull()
    expect(chat.retryCountdown.value).toEqual({ secondsRemaining: 5, attempt: 1 })

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

    expect(chat.error.value).toBeNull()
    expect(chat.retryCountdown.value).toEqual({ secondsRemaining: 5, attempt: 1 })

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

    expect(chat.error.value).toBeNull()
    expect(chat.retryCountdown.value).toEqual({ secondsRemaining: 5, attempt: 1 })

    await elapseCountdown(5)
    await vi.advanceTimersByTimeAsync(100)

    expect(provider.calls).toHaveLength(2)
    // The retry re-sent the ORIGINAL message — a resume would have dropped it
    // (the server never persisted it).
    expect(provider.calls[1].message).toBe('hello there')
    expect(provider.calls[1].resume).toBeUndefined()

    // No duplicate optimistic bubble: exactly one user message with the text.
    const userBubbles = chat.messages.value.filter(
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
    const { chat } = renderChat(provider)

    await chat.sendMessage('hi')

    expect(chat.error.value).toBe('AI provider not configured')
    expect(chat.retryCountdown.value).toBeNull()
    expect(provider.calls).toHaveLength(1)
  })

  it('never retries a limit/quota-gated 5XX', async () => {
    const provider = createScriptedProvider([
      [{ type: 'error', status: 503, limitType: 'api_rate', message: 'Too busy' }],
    ])
    const { chat } = renderChat(provider)

    await chat.sendMessage('hi')

    expect(chat.error.value).toBe('Too busy')
    expect(chat.errorMeta.value).toEqual({ limitType: 'api_rate', requiresSignup: undefined })
    expect(chat.retryCountdown.value).toBeNull()
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
    expect(chat.retryCountdown.value).toEqual({ secondsRemaining: 5, attempt: 1 })

    // The re-send is the RETRY, not a fresh user send: its failure must re-arm
    // the ladder at the doubled wait (attempt 2), not restart it at attempt 1.
    await elapseCountdown(5)
    await vi.advanceTimersByTimeAsync(100)

    expect(provider.calls).toHaveLength(2)
    expect(provider.calls[1]?.message).toBe('hello there')
    expect(chat.error.value).toBeNull()
    expect(chat.retryCountdown.value).toEqual({ secondsRemaining: 10, attempt: 2 })
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
      expect(chat.retryCountdown.value).not.toBeNull()
      await elapseCountdown(wait)
      await vi.advanceTimersByTimeAsync(100)
    }

    // Eight retries fired (the original send + eight re-sends); the ninth
    // failure surfaced the error instead of scheduling a ninth attempt.
    expect(provider.calls).toHaveLength(9)
    expect(chat.retryCountdown.value).toBeNull()
    expect(chat.error.value).toBe('Failed to fetch')
  })
})
