// @vitest-environment jsdom
/**
 * The submit unit (U8): `handleSubmit` through `routeComposerSubmit`, the
 * automatic sends and the queued message's inline editor, driven through a
 * real Solid render of {@link ChatPanel}.
 *
 * The conformance kit compares the whole panel's DOM once its remaining units
 * land; these cases pin this unit's own contract meanwhile: the composer's send
 * reaches the chat session with the typed text (or the one route it names), a
 * read-only viewer is refused, the initial and pending automatic sends fire
 * once and carry their flags, and opening a queued row's editor moves focus
 * into it.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { batch, createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ChatAttachment,
  ChatConfig,
  ChatEventHandler,
  ChatMessage,
  ChatProvider,
} from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import {
  ChatContext,
  HttpContext,
  resetChatStoresForTests,
  ThemeContext,
} from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** One message a provider was asked to send. */
interface SentMessage {
  /** The text handed to the provider. */
  message: string
  /** The attachments handed to the provider. */
  attachments?: ChatAttachment[]
  /** The stream handler the provider answers through. */
  onEvent: ChatEventHandler
}

/** The sends the panel made through the main stream. */
let sent: SentMessage[]
/** The sends the panel made through the side channel. */
let sideSent: SentMessage[]
/** Resolves a held turn (the deferral case keeps one streaming). */
let heldTurns: (() => void)[]

/** A working in-memory Storage (Node's experimental web-storage shadows jsdom's). */
function makeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length(): number {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
  }
}

/**
 * The provider every case mounts with: it records each send and answers through
 * the handler it was given (so a case can end the turn).
 * @param hold - Keep each turn streaming until the case ends it.
 * @returns The recording provider.
 */
function buildChatProvider(hold = false): ChatProvider {
  return {
    name: 'recording',
    sendMessage: async (
      message: string,
      _config: ChatConfig,
      onEvent: ChatEventHandler,
      attachments?: ChatAttachment[],
    ): Promise<void> => {
      sent.push({ message, attachments, onEvent })
      if (hold) await new Promise<void>((resolve) => heldTurns.push(resolve))
    },
    sendSideMessage: async (
      message: string,
      _config: ChatConfig,
      onEvent: ChatEventHandler,
    ): Promise<void> => {
      sideSent.push({ message, onEvent })
    },
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => [],
  }
}

/** An HTTP client whose every request rejects; the panel catches its own. */
function buildRejectingHttp(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: reject,
    post: reject,
    put: reject,
    patch: reject,
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/** A team side-channel command, as a host registers one. */
const TEAM_COMMAND = {
  id: 'teamsay',
  label: '/teamsay',
  description: 'Send a team note',
  category: 'collaborate',
  aliases: ['t'],
  sideChannel: true,
  viewerSafe: true,
}

/** The mount alive right now, if any. */
let dispose: (() => void) | null = null

beforeEach(() => {
  sent = []
  sideSent = []
  heldTurns = []
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  resetChatStoresForTests()
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  dispose?.()
  dispose = null
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider())
  vi.restoreAllMocks()
})

/**
 * Mounts the panel with the given props.
 * @param props - The props over `{ projectId: 'p1' }`.
 * @returns The mount container.
 */
function mountPanel(props: Record<string, unknown> = {}, hold = false): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildRejectingHttp()}>
          <ChatContext.Provider value={buildChatProvider(hold)}>
            <ChatPanel projectId="p1" {...props} />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  return container
}

/**
 * The composer's textarea.
 * @returns The textarea element.
 */
function textarea(): HTMLTextAreaElement {
  const el = document.querySelector<HTMLTextAreaElement>('textarea[data-mol-chat-input]')
  if (!el) throw new Error('the composer textarea did not render')
  return el
}

/**
 * Types into the composer the way a user does: set its value, then dispatch the
 * native input event the composer listens for.
 * @param value - The composer's new value.
 */
function type(value: string): void {
  const ta = textarea()
  ta.value = value
  ta.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Clicks the composer's send button. */
function clickSend(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-mol-id="chat-send-button"]')
  if (!button) throw new Error('the send button did not render')
  button.click()
}

/**
 * Ends the first turn the provider is holding, as the server would.
 * @param index - Which send to end.
 */
async function endTurn(index = 0): Promise<void> {
  heldTurns[index]?.()
  sent[index]?.onEvent({ type: 'done' })
  await Promise.resolve()
}

describe('the submit unit', () => {
  it('sends the typed text through the chat session and clears the composer', async () => {
    mountPanel()
    type('Build me a todo app')
    clickSend()

    expect(sent.map((call) => call.message)).toEqual(['Build me a todo app'])
    expect(textarea().value).toBe('')
  })

  it('a read-only viewer’s typed message earns the view-only note instead of a send', async () => {
    const container = mountPanel({ canEdit: false })
    type('Looks good to me')
    clickSend()

    expect(sent).toHaveLength(0)
    expect(container.textContent).toContain(
      "You have view-only access, so you can't run the assistant",
    )
  })

  it('a viewer’s team note goes out on the side channel and the composer refills /teamsay', async () => {
    mountPanel({ canEdit: false, extraCommands: [TEAM_COMMAND] })
    type('/teamsay checking in')
    clickSend()

    expect(sent).toHaveLength(0)
    expect(sideSent.map((call) => call.message)).toEqual(['/teamsay checking in'])
    expect(textarea().value).toBe('/teamsay ')
  })

  it('/timestamps off persists the preference and clears the composer', async () => {
    localStorage.setItem('mol_chat_show_timestamps', 'true')
    mountPanel()
    type('/timestamps off')
    clickSend()

    expect(sent).toHaveLength(0)
    expect(localStorage.getItem('mol_chat_show_timestamps')).toBe('false')
    expect(textarea().value).toBe('')
  })

  it('auto-sends the initial message once, then reports it sent', async () => {
    const onInitialMessageSent = vi.fn()
    mountPanel({ initialMessage: 'Build a todo app', onInitialMessageSent })

    await vi.waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]?.message).toBe('Build a todo app')
    expect(onInitialMessageSent).toHaveBeenCalledTimes(1)
  })

  it('sends a pending message dispatched by a key change as an agent message', async () => {
    const [key, setKey] = createSignal(0)
    const [message, setMessage] = createSignal<string | undefined>(undefined)
    const container = document.createElement('div')
    document.body.appendChild(container)
    dispose = render(
      () => (
        <ThemeContext.Provider value={buildThemeProvider()}>
          <HttpContext.Provider value={buildRejectingHttp()}>
            <ChatContext.Provider value={buildChatProvider()}>
              <ChatPanel projectId="p1" pendingMessageKey={key()} pendingMessage={message()} />
            </ChatContext.Provider>
          </HttpContext.Provider>
        </ThemeContext.Provider>
      ),
      container,
    )

    batch(() => {
      setMessage('Investigate the broken preview')
      setKey(1)
    })

    await vi.waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]?.message).toBe('Investigate the broken preview')
    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="chat-automatic-message"]')).not.toBeNull(),
    )
  })

  it('defers a pending message until the live turn ends', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const [key, setKey] = createSignal(0)
    const [message, setMessage] = createSignal<string | undefined>(undefined)
    dispose = render(
      () => (
        <ThemeContext.Provider value={buildThemeProvider()}>
          <HttpContext.Provider value={buildRejectingHttp()}>
            <ChatContext.Provider value={buildChatProvider(true)}>
              <ChatPanel projectId="p1" pendingMessageKey={key()} pendingMessage={message()} />
            </ChatContext.Provider>
          </HttpContext.Provider>
        </ThemeContext.Provider>
      ),
      container,
    )

    type('Start the build')
    clickSend()
    await vi.waitFor(() => expect(sent).toHaveLength(1))

    batch(() => {
      setMessage('Fix the failing test')
      setKey(1)
    })
    // The turn is still streaming, so nothing else may go out yet.
    await Promise.resolve()
    expect(sent).toHaveLength(1)

    await endTurn()
    await vi.waitFor(() => expect(sent).toHaveLength(2))
    expect(sent[1]?.message).toBe('Fix the failing test')
  })
})
