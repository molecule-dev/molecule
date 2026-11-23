// @vitest-environment jsdom

/**
 * A message sent in a conversation opened while another conversation's reply
 * is still streaming starts its own turn: the orphaned stream's send loop does
 * not merge its history into the new conversation.
 *
 * This is React's `useChat.switch-send.test.tsx` against the Angular function;
 * the title is React's. The endpoint is a signal, so switching conversations is
 * setting it and rendering, the way React re-renders the hook with a new prop.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type EnvironmentProviders,
  type Provider,
  provideZonelessChangeDetection,
  signal,
  type Type,
  type WritableSignal,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import type { ChatEventHandler, ChatProvider } from '@molecule/app-ai-chat'

import { resetChatStoresForTests, useChat } from '../chat.js'
import { provideMolecule } from '../providers.js'

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

/** Lets the microtask queue and a zero-length timer run. */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Whether the next probe loads its conversation's history on mount. Each test
 * mounts one probe, so a module-level value set just before mounting is the
 * framework equivalent of passing `loadOnMount` as a prop.
 */
let activeSwitchLoadOnMount = false

/** Reads a chat whose conversation is a signal. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-chat-switch-probe',
  template: '',
})
class ChatSwitchProbeComponent {
  readonly endpoint: WritableSignal<string> = signal('/chat?conversationId=a')
  readonly chat = useChat(
    computed(() => ({
      endpoint: this.endpoint(),
      projectId: 'proj-1',
      loadOnMount: activeSwitchLoadOnMount,
    })),
  )
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
  activeSwitchLoadOnMount = false
  resetChatStoresForTests()
  sessionStorage.clear()
})

describe('useChat conversation switch during a stream', () => {
  it.each([
    ['without a history load', false],
    ['with a history load', true],
  ] as const)(
    'sends in the new conversation, and the old stream ending does not reclaim the slot (%s)',
    async (_label, loadOnMount) => {
      /** A chat provider whose replies stream until the test finishes them. */
      const finishers: Array<() => void> = []
      const provider: ChatProvider = {
        name: 'held-replies',
        sendMessage: vi.fn<ChatProvider['sendMessage']>(
          (_message: string, _config, onEvent: ChatEventHandler) =>
            new Promise<void>((resolve) => {
              finishers.push(() => {
                onEvent({ type: 'done' })
                resolve()
              })
            }),
        ),
        abort: vi.fn<ChatProvider['abort']>(),
        clearHistory: vi.fn<ChatProvider['clearHistory']>(async () => undefined),
        loadHistory: vi.fn<ChatProvider['loadHistory']>(async () => []),
      }
      activeSwitchLoadOnMount = loadOnMount
      const fixture = mount(ChatSwitchProbeComponent, provideMolecule({ chat: provider }))
      const chat = fixture.componentInstance.chat

      void chat.sendMessage('in conversation a')
      await flush()
      expect(provider.sendMessage).toHaveBeenCalledTimes(1)

      fixture.componentInstance.endpoint.set('/chat?conversationId=b')
      fixture.detectChanges()
      void chat.sendMessage('in conversation b')
      await flush()
      expect(provider.sendMessage).toHaveBeenCalledTimes(2)
      expect(chat.messages().find((m) => m.content === 'in conversation b')?.queued).toBe(false)

      // The orphaned reply ends while b's reply streams: b keeps the slot, so a
      // third message queues behind b and is sent when b's reply ends.
      finishers[0]?.()
      await flush()
      void chat.sendMessage('after the old reply ended')
      await flush()
      expect(provider.sendMessage).toHaveBeenCalledTimes(2)
      expect(chat.messages().find((m) => m.content === 'after the old reply ended')?.queued).toBe(
        true,
      )

      finishers[1]?.()
      await flush()
      expect(provider.sendMessage).toHaveBeenCalledTimes(3)
      expect(vi.mocked(provider.sendMessage).mock.calls[2]?.[0]).toBe('after the old reply ended')
    },
  )
})

describe('useChat conversation switch when the old stream drops', () => {
  it("does not merge the old conversation's history into the new one", async () => {
    let dropOld = (): void => {}
    const provider: ChatProvider = {
      name: 'dropping',
      sendMessage: vi.fn<ChatProvider['sendMessage']>(
        (_message: string, _config, onEvent: ChatEventHandler) =>
          new Promise<void>((resolve) => {
            onEvent({ type: 'message_start', id: 'a-reply', timestamp: 1 })
            // The connection closes with no done/error event.
            dropOld = resolve
          }),
      ),
      abort: vi.fn<ChatProvider['abort']>(),
      clearHistory: vi.fn<ChatProvider['clearHistory']>(async () => undefined),
      loadHistory: vi.fn<ChatProvider['loadHistory']>(async (config) =>
        config.endpoint.includes('conversationId=a')
          ? [
              { id: 'a-user', role: 'user', content: 'in conversation a', timestamp: 1 },
              { id: 'a-reply', role: 'assistant', content: 'reply in a', timestamp: 2 },
            ]
          : [],
      ),
    }
    const fixture = mount(ChatSwitchProbeComponent, provideMolecule({ chat: provider }))
    const chat = fixture.componentInstance.chat
    void chat.sendMessage('in conversation a')
    await flush()

    fixture.componentInstance.endpoint.set('/chat?conversationId=b')
    fixture.detectChanges()
    dropOld()
    await flush()

    expect(chat.messages().map((message) => message.content)).toEqual([])
    expect(provider.loadHistory).not.toHaveBeenCalled()
  })
})
