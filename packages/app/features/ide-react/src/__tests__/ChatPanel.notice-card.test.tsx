// @vitest-environment jsdom

/**
 * Unified notice/tip card render guard.
 *
 * Host notice cards (upgrade, sign-up, saved-script, model-intro, …) used to render in
 * TWO divergent styles — an `emphasized` box with centered filled buttons vs. a `tone`
 * tip-box with inline links — so they looked inconsistent ("dogshit"). They now ALL render
 * through ONE structure (`chat-notice-card`): an icon + accent bar + tinted body, with a
 * consistent left-aligned row of accent buttons for action cards. Only the accent COLOUR +
 * ICON vary, by `tone`. This is a real jsdom render of {@link ChatPanel} (not a grep): it
 * seeds custom-event cards of each tone and asserts the shared structure + per-tone variance.
 *
 * @module
 */

import { render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
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

/** History seeded with one system card message per registered custom-event name. */
function buildChatProvider(cardNames: string[]): ChatProvider {
  const history: ChatMessage[] = cardNames.map((name, i) => ({
    id: `card-${i}`,
    role: 'system',
    content: '',
    timestamp: 1000 + i,
    cardEvent: { kind: 'custom', name },
  }))
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
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

/** Render {@link ChatPanel} with the given custom-event cards seeded into history. */
function renderWithCards(cardNames: string[]): HTMLElement {
  const wrap = (children: ReactNode): ReactElement => (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>
        <HttpProvider client={buildHttpClient()}>
          <ChatContextProvider provider={buildChatProvider(cardNames)}>
            {children}
          </ChatContextProvider>
        </HttpProvider>
      </ThemeProvider>
    </I18nProvider>
  )
  return render(wrap(<ChatPanel projectId="proj-notice" agentName="Synthase" />)).container
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
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ChatPanel unified notice cards', () => {
  it('renders every tone through ONE consistent structure, varying only colour/icon', async () => {
    // One card per tone — an action card (upgrade) + an inline-content card (gold).
    registerCustomEventCard('t_upgrade', () => ({
      text: 'You hit a plan limit.',
      tone: 'upgrade',
      action: [
        { label: 'Upgrade', href: '/pricing' },
        { label: 'Source', href: 'https://example.com/repo' },
      ],
    }))
    registerCustomEventCard('t_signup', () => ({
      text: 'Sign up to keep your work.',
      tone: 'signup',
      action: [{ label: 'Sign up', href: '/signup' }],
    }))
    registerCustomEventCard('t_success', () => ({
      text: 'Saved script: deploy',
      tone: 'success',
      action: [{ label: 'Run', onClick: () => {} }],
    }))
    registerCustomEventCard('t_gold', () => ({
      text: 'For free users… see our upgrade options.',
      tone: 'gold',
      content: ['For free users… see our ', { label: 'upgrade options', href: '/pricing' }, '.'],
    }))

    const container = renderWithCards(['t_upgrade', 't_signup', 't_success', 't_gold'])

    const cards = await waitFor(() => {
      const els = container.querySelectorAll('[data-mol-id="chat-notice-card"]')
      expect(els.length).toBe(4) // ALL four notices share the one structure
      return els
    })

    // Consistency: every notice card has the SAME structure — an icon <svg> + a body —
    // and carries its tone as data-tone (the only thing that varies).
    const tones = Array.from(cards).map((c) => c.getAttribute('data-tone'))
    expect(tones.sort()).toEqual(['gold', 'signup', 'success', 'upgrade'])
    for (const card of cards) {
      expect(card.querySelector('svg'), 'every notice card shows an icon').not.toBeNull()
    }

    // The OLD divergent treatments are gone — no `chat-tone-card`, and the notice cards are
    // NOT centered (the old emphasized box used textAlign:center + filled buttons).
    expect(container.querySelector('[data-mol-id="chat-tone-card"]')).toBeNull()

    // Action cards render their actions as a row of buttons/links INSIDE the card.
    const upgrade = container.querySelector('[data-tone="upgrade"]') as HTMLElement
    expect(upgrade.textContent).toContain('Upgrade')
    expect(upgrade.textContent).toContain('Source')
    expect(upgrade.querySelector('a[href="/pricing"]')).not.toBeNull()

    // The inline-content (gold) card renders its mid-sentence link, not a button row.
    const gold = container.querySelector('[data-tone="gold"]') as HTMLElement
    expect(gold.querySelector('a[href="/pricing"]')).not.toBeNull()
    expect(gold.textContent).toContain('upgrade options')
  })
})
