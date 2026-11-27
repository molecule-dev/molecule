// @vitest-environment jsdom
/**
 * The voice-dictation badge.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.dictated-message.test.tsx`
 * with the same test names and the same assertions: a message the user composed
 * through the mic button (`viaDictation`) renders with the red mic badge in its
 * header — so the transcript shows HOW it was written, live and after a reload —
 * and a hand-typed message carries no badge. A real Solid render of
 * {@link ChatPanel}: a stub `ChatProvider.loadHistory` seeds the transcript.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { HttpContext, ThemeContext } from '@molecule/app-solid'
import { ChatContext, resetChatStoresForTests } from '@molecule/app-solid/chat'
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

const DICTATED_TEXT = 'add a login page to the app'
const TYPED_TEXT = 'now make it dark mode'

/** The seeded conversation: a dictated message, a reply, a typed message. */
function seededHistory(): ChatMessage[] {
  return [
    { id: 'u1', role: 'user', content: DICTATED_TEXT, viaDictation: true, timestamp: 1000 },
    { id: 'a1', role: 'assistant', content: 'On it.', timestamp: 2000 },
    { id: 'u2', role: 'user', content: TYPED_TEXT, timestamp: 3000 },
  ]
}

/** The mount alive right now, if any. */
const mounted: { dispose?: () => void } = {}

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
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildHttpClient()}>
          <ChatContext.Provider value={buildChatProvider(seededHistory())}>
            <ChatPanel projectId="proj-dictated" userAvatar={null} />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  return container
}

describe('ChatPanel dictated messages (voice-dictation badge)', () => {
  it('renders the mic badge on a viaDictation user message, with an accessible name', async () => {
    const container = mountPanel()
    await vi.waitFor(() => expect(container.textContent).toContain(DICTATED_TEXT))

    const userCard = container.querySelector<HTMLElement>('[data-mol-id="chat-user-message"]')
    expect(userCard).not.toBeNull()
    expect(userCard?.textContent).toContain(DICTATED_TEXT)

    const badge = userCard?.querySelector<HTMLElement>('[data-mol-id="chat-dictated-badge"]')
    expect(badge, 'the dictated badge should render on the dictated message').not.toBeNull()
    const svg = badge?.querySelector('svg')
    expect(svg, 'the mic glyph should render').not.toBeNull()
    expect(svg?.getAttribute('width')).toBe('16')
    expect(badge?.getAttribute('title')).toBe('Dictated by voice')
    expect(badge?.getAttribute('aria-label')).toBe('Dictated by voice')
    // An icon-only badge is an image with a name.
    expect(badge?.getAttribute('role')).toBe('img')
    // Filled capsule (the listening mic shape, bolder than the idle outline).
    const capsule = svg?.querySelector('rect')
    expect(capsule, 'the mic capsule should render').not.toBeNull()
    expect(capsule?.getAttribute('fill')).toBe('currentColor')
  })

  it('renders NO badge on a hand-typed user message', async () => {
    const container = mountPanel()
    await vi.waitFor(() => expect(container.textContent).toContain(TYPED_TEXT))

    const cards = Array.from(
      container.querySelectorAll<HTMLElement>('[data-mol-id="chat-user-message"]'),
    )
    expect(cards.length).toBe(2)
    const typedCard = cards.find((card) => card.textContent?.includes(TYPED_TEXT))
    expect(typedCard, 'the typed message should render').toBeTruthy()
    expect(typedCard?.querySelector('[data-mol-id="chat-dictated-badge"]')).toBeNull()
  })
})
