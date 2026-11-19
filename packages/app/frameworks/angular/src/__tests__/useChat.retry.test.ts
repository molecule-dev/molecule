// @vitest-environment jsdom

/**
 * Auto-retry after a transport drop or a server error: a countdown, then a
 * resume (or a re-send when the server never received the turn), backoff
 * doubling, no retry for terminal or limit-gated errors, and the budget.
 *
 * This is React's `useChat.retry.test.tsx` against the Angular function; every
 * title is React's. Only the framework-forced mechanics change: a mounted probe
 * component replaces a render, and the chat state is read through signals.
 *
 * @module
 */

import '@angular/compiler'
import {
  Component,
  type EnvironmentProviders,
  type Provider,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatEventHandler, ChatProvider, ChatStreamEvent } from '@molecule/app-ai-chat'

import { resetChatStoresForTests, useChat } from '../chat.js'
import { provideMolecule } from '../providers.js'

/**
 * Scriptable mock chat provider: each sendMessage call shifts the next script
 * entry and replays its events into the stream handler. Calls beyond the script
 * emit a clean `done` so a retried turn terminates.
 *
 * @param script - One entry per send: the events to replay.
 * @returns The provider, recording each send.
 */
/** A scripted provider plus the send log the assertions read. */
type ScriptedProvider = ChatProvider & {
  calls: { message: string; resume?: boolean }[]
  isServerStreaming: boolean
}

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
    abort: vi.fn<ChatProvider['abort']>(),
    async clearHistory(): Promise<void> {},
    async loadHistory() {
      return []
    },
  }
}

/**
 * Mounts one probe component under the given providers and renders it once.
 *
 * @param component - The probe component class.
 * @param providers - The providers the probe injects (usually `provideMolecule`).
 * @returns The mounted fixture.
 */
function mount<P>(
  component: Type<P>,
  ...providers: (Provider | EnvironmentProviders)[]
): ComponentFixture<P> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection(), ...providers],
  })
  const fixture = TestBed.createComponent(component)
  fixture.detectChanges()
  return fixture
}

/**
 * Mounts `useChat` against `provider` with history loading off.
 *
 * @param provider - The chat provider to inject.
 * @returns The function result.
 */
function renderChat(provider: ChatProvider): ReturnType<typeof useChat> {
  /** Reads the chat whose turn is scripted. */
  @Component({ selector: 'app-test-chat-retry-probe', template: '' })
  class ChatRetryProbeComponent {
    readonly chat = useChat({ endpoint: '/chat', projectId: 'proj-1', loadOnMount: false })
  }

  const fixture = mount(ChatRetryProbeComponent, provideMolecule({ chat: provider }))
  return fixture.componentInstance.chat
}

/** Drive the retry countdown to zero and let the queued retry begin. */
async function elapseCountdown(seconds: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(seconds * 1000)
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  TestBed.resetTestingModule()
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
    const chat = renderChat(provider)

    await chat.sendMessage('build me an app')

    // Not surfaced as terminal — a countdown is scheduled instead.
    expect(chat.error()).toBeNull()
    expect(chat.retryCountdown()).toEqual({ secondsRemaining: 5, attempt: 1 })

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
    const chat = renderChat(provider)

    await chat.sendMessage('keep going')

    expect(chat.error()).toBeNull()
    expect(chat.retryCountdown()).toEqual({ secondsRemaining: 5, attempt: 1 })

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
    const chat = renderChat(provider)

    await chat.sendMessage('hello there')

    expect(chat.error()).toBeNull()
    expect(chat.retryCountdown()).toEqual({ secondsRemaining: 5, attempt: 1 })

    await elapseCountdown(5)
    await vi.advanceTimersByTimeAsync(100)

    expect(provider.calls).toHaveLength(2)
    // The retry re-sent the ORIGINAL message — a resume would have dropped it
    // (the server never persisted it).
    expect(provider.calls[1].message).toBe('hello there')
    expect(provider.calls[1].resume).toBeUndefined()

    // No duplicate optimistic bubble: exactly one user message with the text.
    const userBubbles = chat
      .messages()
      .filter((message) => message.role === 'user' && message.content === 'hello there')
    expect(userBubbles).toHaveLength(1)
  })

  it('surfaces a server-emitted status-less error as terminal (no retry)', async () => {
    const provider = createScriptedProvider([
      [
        { type: 'conversation', id: 'c1' },
        { type: 'error', message: 'AI provider not configured' },
      ],
    ])
    const chat = renderChat(provider)

    await chat.sendMessage('hi')

    expect(chat.error()).toBe('AI provider not configured')
    expect(chat.retryCountdown()).toBeNull()
    expect(provider.calls).toHaveLength(1)
  })

  it('never retries a limit/quota-gated 5XX', async () => {
    const provider = createScriptedProvider([
      [{ type: 'error', status: 503, limitType: 'api_rate', message: 'Too busy' }],
    ])
    const chat = renderChat(provider)

    await chat.sendMessage('hi')

    expect(chat.error()).toBe('Too busy')
    expect(chat.errorMeta()).toEqual({ limitType: 'api_rate', requiresSignup: undefined })
    expect(chat.retryCountdown()).toBeNull()
    expect(provider.calls).toHaveLength(1)
  })

  it('re-arms the backoff at double the wait when the re-sent turn fails again', async () => {
    const provider = createScriptedProvider([
      // Both attempts die before ANY server event, so both retry as a re-send.
      [{ type: 'error', transport: true, message: 'Failed to fetch' }],
      [{ type: 'error', transport: true, message: 'Failed to fetch' }],
    ])
    const chat = renderChat(provider)

    await chat.sendMessage('hello there')
    expect(chat.retryCountdown()).toEqual({ secondsRemaining: 5, attempt: 1 })

    // The re-send is the RETRY, not a fresh user send: its failure must re-arm
    // the ladder at the doubled wait (attempt 2), not restart it at attempt 1.
    await elapseCountdown(5)
    await vi.advanceTimersByTimeAsync(100)

    expect(provider.calls).toHaveLength(2)
    expect(provider.calls[1]?.message).toBe('hello there')
    expect(chat.error()).toBeNull()
    expect(chat.retryCountdown()).toEqual({ secondsRemaining: 10, attempt: 2 })
  })

  it('surfaces the error once the retry budget is exhausted', async () => {
    // Eight attempts (waits 5, 10, 20, then 30 s each) all fail — the ninth
    // failure finds the budget spent and surfaces the held error instead.
    const drop: ChatStreamEvent[] = [{ type: 'error', transport: true, message: 'Failed to fetch' }]
    const provider = createScriptedProvider([drop, drop, drop, drop, drop, drop, drop, drop, drop])
    const chat = renderChat(provider)

    await chat.sendMessage('hello there')

    const waits = [5, 10, 20, 30, 30, 30, 30, 30]
    for (const wait of waits) {
      expect(chat.retryCountdown()).not.toBeNull()
      await elapseCountdown(wait)
      await vi.advanceTimersByTimeAsync(100)
    }

    // Eight retries fired (the original send + eight re-sends); the ninth
    // failure surfaced the error instead of scheduling a ninth attempt.
    expect(provider.calls).toHaveLength(9)
    expect(chat.retryCountdown()).toBeNull()
    expect(chat.error()).toBe('Failed to fetch')
  })
})
