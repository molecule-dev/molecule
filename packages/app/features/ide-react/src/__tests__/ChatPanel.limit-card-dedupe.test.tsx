// @vitest-environment jsdom

/**
 * One limit, one surface.
 *
 * A daily budget is hit ONCE but surfaces TWICE: the host records a card when the turn
 * is interrupted ("You've used today's free AI budget for guests. It refreshes
 * tomorrow.") and the next send is then refused with the same limit, whose live banner
 * says the same thing again ("…It refreshes in about 23 hours — or create a free account
 * for more."). Two cards, one fact.
 *
 * A card that declares `coversLimitType` steps aside while a live error carries that
 * same `limitType`, and comes back when the error clears. The BANNER is never the one
 * suppressed — it is the refused send's only feedback, and its message can be the more
 * specific one (a platform-capacity refusal shares `limitType` with a personal-budget
 * one). A card covering a DIFFERENT limit is untouched.
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

/** The card the interrupted turn recorded (the host's copy). */
const CARD_TEXT = "You've used today's free AI budget for guests. It refreshes tomorrow."
/** The live banner the refused NEXT send gets (the backend's copy for the same limit). */
const BANNER_TEXT =
  "You've used today's free AI budget for guests. It refreshes in about 23 hours — or create a free account for more."
/** A card for an unrelated limit — must survive the dedupe. */
const OTHER_CARD_TEXT = 'Your usage balance is empty. Add funds in Billing to keep building.'

/** History with both limit cards; every send is refused with the `ai_cost` limit. */
function buildChatProvider(): ChatProvider {
  const history: ChatMessage[] = [
    {
      id: 'card-budget',
      role: 'system',
      content: '',
      timestamp: 1000,
      cardEvent: { kind: 'custom', name: 'lim_budget' },
    },
    {
      id: 'card-balance',
      role: 'system',
      content: '',
      timestamp: 1001,
      cardEvent: { kind: 'custom', name: 'lim_balance' },
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

/** Render {@link ChatPanel} against the seeded provider. */
function renderPanel(): HTMLElement {
  const wrap = (children: ReactNode): ReactElement => (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>
        <HttpProvider client={buildHttpClient()}>
          <ChatContextProvider provider={buildChatProvider()}>{children}</ChatContextProvider>
        </HttpProvider>
      </ThemeProvider>
    </I18nProvider>
  )
  return render(wrap(<ChatPanel projectId="proj-limit" agentName="Synthase" />)).container
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
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
  registerCustomEventCard('lim_budget', () => ({
    text: CARD_TEXT,
    tone: 'upgrade',
    action: [{ label: 'Sign up', href: '/signup' }],
    coversLimitType: 'ai_cost',
  }))
  registerCustomEventCard('lim_balance', () => ({
    text: OTHER_CARD_TEXT,
    tone: 'info',
    action: [{ label: 'Add funds', href: '/billing' }],
    coversLimitType: 'usage_balance',
  }))
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ChatPanel limit-card dedupe', () => {
  it('drops a card whose limit the live banner is already stating, keeping the banner', async () => {
    const container = renderPanel()

    // Before any send there is no error, so BOTH recorded cards render.
    await waitFor(() => {
      expect(container.textContent).toContain(CARD_TEXT)
      expect(container.textContent).toContain(OTHER_CARD_TEXT)
    })

    // Send — the backend refuses it with the SAME limit the budget card covers.
    const input = container.querySelector('[data-mol-chat-input]') as HTMLTextAreaElement
    expect(input).not.toBeNull()
    fireEvent.change(input, { target: { value: 'keep going' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      // The live banner states the limit…
      expect(container.textContent).toContain(BANNER_TEXT)
    })
    // …and the card that covers that same limit stepped aside, so the limit is stated
    // ONCE. This is the bug: both used to render, one above the other.
    expect(container.textContent).not.toContain(CARD_TEXT)
    // A card covering a DIFFERENT limit is untouched.
    expect(container.textContent).toContain(OTHER_CARD_TEXT)
  })
})
