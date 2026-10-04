// @vitest-environment jsdom

/**
 * The voice-dictation badge — a message the user composed through the mic
 * button (`viaDictation`) renders with a red mic badge in its Slack-style
 * header, so the transcript shows HOW it was written, live and after a reload
 * (the flag is persisted server-side and round-trips through history).
 *
 * A real jsdom render of the actual {@link ChatPanel} (same harness as
 * ChatPanel.automatic-message.test.tsx): a stub `ChatProvider.loadHistory`
 * seeds the timeline; the test asserts the rendered DOM through the full
 * `ChatPanel → ChatInner → MessageItem` chain.
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

// ── Stubs (shared shape with ChatPanel.automatic-message.test.tsx) ──────────

function buildChatProvider(history: ChatMessage[]): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => history,
  }
}

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

function makeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length(): number {
      return store.size
    },
    clear(): void {
      store.clear()
    },
    getItem(key: string): string | null {
      const value = store.get(key)
      return value === undefined ? null : value
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string): void {
      store.delete(key)
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value))
    },
  }
}

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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DICTATED_TEXT = 'add a login page to the app'
const TYPED_TEXT = 'now make it dark mode'

function seededHistory(): ChatMessage[] {
  return [
    // Composed through the mic button — the badge must render on this one.
    { id: 'u1', role: 'user', content: DICTATED_TEXT, viaDictation: true, timestamp: 1000 },
    { id: 'a1', role: 'assistant', content: 'On it.', timestamp: 2000 },
    // Typed by hand — no badge.
    { id: 'u2', role: 'user', content: TYPED_TEXT, timestamp: 3000 },
  ]
}

function renderChatPanel(): ReactElement {
  const wrap = (children: ReactNode): ReactElement => (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>
        <HttpProvider client={buildHttpClient()}>
          <ChatContextProvider provider={buildChatProvider(seededHistory())}>
            {children}
          </ChatContextProvider>
        </HttpProvider>
      </ThemeProvider>
    </I18nProvider>
  )
  return wrap(<ChatPanel projectId="proj-dictated" userAvatar={null} />)
}

beforeEach(() => {
  setClassMap(classMap)
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
  document.body.innerHTML = ''
})

describe('ChatPanel dictated messages (voice-dictation badge)', () => {
  it('renders the mic badge on a viaDictation user message, with an accessible name', async () => {
    const { container } = render(renderChatPanel())

    await waitFor(() => {
      expect(container.textContent).toContain(DICTATED_TEXT)
    })

    const userCard = container.querySelector(
      '[data-mol-id="chat-user-message"]',
    ) as HTMLElement | null
    expect(userCard).not.toBeNull()
    expect(userCard!.textContent).toContain(DICTATED_TEXT)

    const badge = userCard!.querySelector(
      '[data-mol-id="chat-dictated-badge"]',
    ) as HTMLElement | null
    expect(badge, 'the dictated badge should render on the dictated message').not.toBeNull()
    // Hard to miss: a filled mic glyph, red per theme, at the shared 16px icon size.
    const svg = badge!.querySelector('svg')
    expect(svg, 'the mic glyph should render').not.toBeNull()
    expect(svg!.getAttribute('width')).toBe('16')
    expect(badge!.getAttribute('title')).toBe('Dictated by voice')
    expect(badge!.getAttribute('aria-label')).toBe('Dictated by voice')
    // Filled capsule (the "listening" mic shape — bolder than the idle outline).
    const capsule = svg!.querySelector('rect')
    expect(capsule, 'the mic capsule should render').not.toBeNull()
    expect(capsule!.getAttribute('fill')).toBe('currentColor')
  })

  it('renders NO badge on a hand-typed user message', async () => {
    const { container } = render(renderChatPanel())

    await waitFor(() => {
      expect(container.textContent).toContain(TYPED_TEXT)
    })

    const cards = Array.from(
      container.querySelectorAll('[data-mol-id="chat-user-message"]'),
    ) as HTMLElement[]
    expect(cards.length).toBe(2)
    const typedCard = cards.find((c) => c.textContent!.includes(TYPED_TEXT))!
    expect(typedCard, 'the typed message should render').toBeTruthy()
    expect(typedCard.querySelector('[data-mol-id="chat-dictated-badge"]')).toBeNull()
  })
})
