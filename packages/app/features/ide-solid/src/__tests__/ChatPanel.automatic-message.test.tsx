// @vitest-environment jsdom
/**
 * C2 + C3 — auto-sent message styling + hidden-message guard.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.automatic-message.test.tsx`
 * with the same test names and the same assertions: a message sent
 * automatically on the user's behalf renders as a green (success) card with a
 * `sync` glyph and no header, while a real user message keeps its avatar, the
 * animated blue accent stripe and no success border; a `hidden` driver message
 * never reaches the DOM. A real Solid render of {@link ChatPanel}: a stub
 * `ChatProvider.loadHistory` seeds the transcript.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { batch, createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
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

/** A chat provider whose `loadHistory` returns a fixed message list. */
function buildChatProvider(history: ChatMessage[]): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => history,
  }
}

/** An HTTP client whose every request rejects; callers catch their own. */
function buildHttpClient(): HttpClient {
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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_TEXT = 'Build me a todo app'
const AUTO_TEXT = 'Fix these issues:\n\nsrc/app.ts(1,1): error'
const HIDDEN_TEXT = 'The development environment is now fully ready ... ACTIVE again'

/** The seeded conversation: user, hidden driver, auto-sent, assistant. */
function seededHistory(): ChatMessage[] {
  return [
    { id: 'u1', role: 'user', content: USER_TEXT, timestamp: 1000 },
    { id: 'h1', role: 'user', content: HIDDEN_TEXT, hidden: true, timestamp: 1500 },
    { id: 'auto1', role: 'user', content: AUTO_TEXT, automatic: true, timestamp: 2000 },
    { id: 'a1', role: 'assistant', content: 'On it.', timestamp: 3000 },
  ]
}

/** The mount alive right now, if any. */
const mounted: { dispose?: () => void; container?: HTMLElement } = {}

beforeEach(() => {
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
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the panel with the seeded history.
 *
 * @returns The mount container.
 */
function mountPanel(): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.container = container
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildHttpClient()}>
          <ChatContext.Provider value={buildChatProvider(seededHistory())}>
            <ChatPanel projectId="proj-c2c3" userAvatar={null} />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  return container
}

/**
 * Mounts the panel and dispatches a pending message (key 0 → 1), the way the
 * Workspace dispatches an auto-fix / preview-failure message.
 *
 * @param props - The pending message and its suppression flag.
 * @returns The mount container.
 */
function dispatchPending(props: {
  pendingMessage: string
  pendingMessageSuppressUser?: boolean
}): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  // Signals stand in for the Workspace's state: bumping `pendingMessageKey`
  // after seeding the message is React's `rerender(tree(1, true))`.
  const [key, setKey] = createSignal(0)
  const [message, setMessage] = createSignal<string | undefined>(undefined)
  const [suppress, setSuppress] = createSignal(false)
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildHttpClient()}>
          <ChatContext.Provider value={buildChatProvider([])}>
            <ChatPanel
              projectId="proj-pending"
              userAvatar={null}
              pendingMessageKey={key()}
              pendingMessage={message()}
              pendingMessageSuppressUser={suppress()}
            />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  batch(() => {
    setMessage(props.pendingMessage)
    setSuppress(props.pendingMessageSuppressUser ?? false)
    setKey(1)
  })
  return container
}

describe('ChatPanel auto-sent + hidden messages (C2 + C3)', () => {
  it('renders an automatic message as a green card with a sync icon, no user avatar, no heading (C2)', async () => {
    const container = mountPanel()
    await vi.waitFor(() => expect(container.textContent).toContain('Fix these issues:'))

    const autoCard = container.querySelector<HTMLElement>('[data-mol-id="chat-automatic-message"]')
    expect(autoCard, 'an auto-sent card should render for the automatic message').not.toBeNull()
    // Green (success) tinted chrome — the whole 1px frame, not the brand tint.
    expect(autoCard?.style.border).toContain('--mol-color-success')
    expect(autoCard?.style.border).not.toContain('--mol-color-primary')
    // A `sync` glyph renders, and NOT the user's avatar.
    expect(autoCard!.querySelector('svg'), 'the auto (sync) icon should render').not.toBeNull()
    expect(autoCard?.querySelector('[data-mol-id="chat-user-avatar"]')).toBeNull()
    expect(autoCard?.querySelector('[data-mol-id="chat-automatic-avatar"]')).toBeNull()
    // The old "Sent automatically" heading is gone — just the message text.
    expect(autoCard?.textContent).not.toContain('Sent automatically')
  })

  it('renders a real user message with the user avatar + animated gradient accent (not auto-sent)', async () => {
    const container = mountPanel()
    await vi.waitFor(() => expect(container.textContent).toContain(USER_TEXT))

    const userCard = container.querySelector<HTMLElement>('[data-mol-id="chat-user-message"]')
    expect(userCard).not.toBeNull()
    expect(userCard?.style.borderLeft).not.toContain('--mol-color-success')
    const accentStyle = document.getElementById('mol-chat-user-accent-style')
    expect(accentStyle, 'the user-accent gradient style should be injected').not.toBeNull()
    expect(accentStyle?.textContent).toContain('[data-mol-id="chat-user-message"]::before')
    expect(accentStyle?.textContent).toContain('--mol-color-primary')
    expect(accentStyle?.textContent).toContain('mol-chat-accent-flow')
    expect(userCard!.querySelector('[data-mol-id="chat-user-avatar"]')).not.toBeNull()
    expect(userCard?.textContent).not.toContain('Sent automatically')
  })

  it('never renders a hidden driver message (C3)', async () => {
    const container = mountPanel()
    await vi.waitFor(() => expect(container.textContent).toContain('On it.'))
    expect(container.textContent).not.toContain('ACTIVE again')
  })
})

describe('ChatPanel pending auto-sent messages render as Synthase, not the user', () => {
  it('renders a non-suppressed pending message as a "Sent automatically" bubble, never a user bubble', async () => {
    const container = dispatchPending({ pendingMessage: 'Investigate the broken preview' })
    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="chat-automatic-message"]')).not.toBeNull(),
    )
    const auto = container.querySelector('[data-mol-id="chat-automatic-message"]')
    expect(auto?.textContent).toContain('Investigate the broken preview')
    expect(container.querySelector('[data-mol-id="chat-user-message"]')).toBeNull()
  })

  it('still hides a SUPPRESSED pending message entirely (build kickoff)', async () => {
    const container = dispatchPending({
      pendingMessage: 'hidden build kickoff prompt',
      pendingMessageSuppressUser: true,
    })
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(container.textContent).not.toContain('hidden build kickoff prompt')
    expect(container.querySelector('[data-mol-id="chat-automatic-message"]')).toBeNull()
  })
})
