// @vitest-environment jsdom

/**
 * A guest limit is stale the moment the guest signs in.
 *
 * The in-IDE auth modal never navigates, so the panel keeps running across the
 * login with the refused send's error still in state — and `useChat` only clears
 * it on the NEXT send. So a user who hit the guest budget and immediately signed
 * up kept reading "You've used today's free AI budget for guests … or create a
 * free account for more", under two dead-end Sign up / Log in buttons, on the
 * account they had just created.
 *
 * `isAnonymous={false}` + `requiresSignup` is the whole signal: the backend raised
 * that limit for an anonymous caller, and the viewer is no longer one. The banner
 * goes, and the `coversLimitType` card it was suppressing comes back (that card's
 * own factory decides whether IT is still relevant — see the host's
 * `upgrade_prompt` renderer).
 *
 * A real jsdom render of {@link ChatPanel} driving a real send, not a grep.
 *
 * @module
 */

import { fireEvent, render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider, ChatStreamEvent } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import {
  ChatProvider as ChatContextProvider,
  HttpProvider,
  I18nProvider,
  resetChatStoresForTests,
  ThemeProvider,
} from '@molecule/app-react'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.js'
import { registerCustomEventCard } from '../customEventCards.js'

/** The live banner the refused send gets — the backend's guest-tier copy. */
const BANNER_TEXT =
  "You've used today's free AI budget for guests. It refreshes in about 17 hours — or create a free account for more."
/** The card the interrupted turn recorded, declaring it covers the same limit. */
const CARD_TEXT = "You've used today's free AI budget for guests. It refreshes tomorrow."

/** History with the budget card; every send is refused with the guest `ai_cost` limit. */
function buildChatProvider(): ChatProvider {
  const history: ChatMessage[] = [
    {
      id: 'card-budget',
      role: 'system',
      content: '',
      timestamp: 1000,
      cardEvent: { kind: 'custom', name: 'guest_budget' },
    },
  ]
  return {
    name: 'stub',
    sendMessage: async (
      _message: string,
      _config: ChatConfig,
      onEvent: (event: ChatStreamEvent) => void,
    ): Promise<void> => {
      onEvent({
        type: 'error',
        message: BANNER_TEXT,
        status: 429,
        limitType: 'ai_cost',
        requiresSignup: true,
      } as ChatStreamEvent)
    },
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => history,
  }
}

/** An HTTP client whose every request rejects; mounted callers catch their own. */
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
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => void store.delete(k),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
  }
}

/** A minimal light theme so `useThemeMode` resolves. */
function buildThemeProvider(): ThemeProviderType {
  const theme: Theme = {
    name: 'light',
    mode: 'light',
    colors: {
      background: { primary: '#ffffff' },
      text: { primary: '#000000' },
      brand: { primary: '#0066cc' },
      semantic: { success: '#00cc00' },
      borders: { default: '#cccccc' },
      overlay: { default: 'rgba(0,0,0,0.5)' },
      shadow: { default: 'rgba(0,0,0,0.1)' },
    },
    breakpoints: {
      mobileS: '320px',
      mobileM: '375px',
      mobileL: '425px',
      tablet: '768px',
      laptop: '1024px',
      laptopL: '1440px',
      desktop: '2560px',
    },
    spacing: {},
    typography: { fontFamily: {}, fontSize: {}, fontWeight: {}, lineHeight: {} },
    borderRadius: {},
    shadows: {},
    transitions: {},
    zIndex: {},
  }
  return {
    getTheme: () => theme,
    getThemeName: () => 'light',
    getThemes: () => ['light', 'dark'],
    setTheme: () => {},
    toggleMode: () => {},
    onThemeChange: () => () => {},
  }
}

/** One provider instance for the whole render, so a rerender never re-seeds the chat. */
let chatProvider: ChatProvider

const wrap = (children: ReactNode): ReactElement => (
  <I18nProvider provider={createSimpleI18nProvider('en')}>
    <ThemeProvider provider={buildThemeProvider()}>
      <HttpProvider client={buildHttpClient()}>
        <ChatContextProvider provider={chatProvider}>{children}</ChatContextProvider>
      </HttpProvider>
    </ThemeProvider>
  </I18nProvider>
)

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
  resetChatStoresForTests()
  chatProvider = buildChatProvider()
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
  registerCustomEventCard('guest_budget', () => ({
    text: CARD_TEXT,
    tone: 'upgrade',
    action: [{ label: 'Sign up', href: '/signup' }],
    coversLimitType: 'ai_cost',
  }))
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ChatPanel stale guest limit', () => {
  it('drops a requiresSignup limit banner once the viewer is no longer anonymous', async () => {
    const { container, rerender } = render(
      wrap(<ChatPanel projectId="proj-guest" agentName="Synthase" isAnonymous />),
    )

    // The recorded budget card is in the restored history.
    await waitFor(() => {
      expect(container.textContent).toContain(CARD_TEXT)
    })

    // Guest hits the budget: the refused send raises the guest-tier limit banner,
    // and the card covering that same limit steps aside for it.
    const input = container.querySelector('[data-mol-chat-input]') as HTMLTextAreaElement
    expect(input).not.toBeNull()
    fireEvent.change(input, { target: { value: 'keep going' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(container.textContent).toContain(BANNER_TEXT)
    })
    expect(container.textContent).not.toContain(CARD_TEXT)

    // They sign up in the in-IDE modal — nothing navigates, the panel keeps
    // running, and the error is still in useChat state. The host flips isAnonymous.
    rerender(wrap(<ChatPanel projectId="proj-guest" agentName="Synthase" isAnonymous={false} />))

    await waitFor(() => {
      expect(container.textContent).not.toContain(BANNER_TEXT)
    })
    // The banner is gone, so it no longer suppresses the card it was covering —
    // whether THAT card still shows is its own factory's call (the host's drops it
    // for a signed-in viewer), not the banner's.
    expect(container.textContent).toContain(CARD_TEXT)
  })

  it('keeps the banner up while the viewer is still a guest', async () => {
    const { container } = render(
      wrap(<ChatPanel projectId="proj-guest-2" agentName="Synthase" isAnonymous />),
    )

    await waitFor(() => {
      expect(container.textContent).toContain(CARD_TEXT)
    })
    const input = container.querySelector('[data-mol-chat-input]') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'keep going' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(container.textContent).toContain(BANNER_TEXT)
    })
    expect(container.textContent).not.toContain(CARD_TEXT)
  })
})
