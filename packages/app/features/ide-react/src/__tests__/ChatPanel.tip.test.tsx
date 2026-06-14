// @vitest-environment jsdom

/**
 * SYN12 — auto-tip entry-tip integration guard.
 *
 * The MVP intent audit (`docs/mvp-intent-findings.md`, SYN12) found the auto-tip
 * gating so conservative (≥4 messages + 60s idle + a 40% roll, never on a fresh
 * conversation) that new users — the target — realistically saw ZERO tips. The
 * fix surfaces one high-value onboarding tip the moment a fresh conversation
 * opens, so a brand-new user always learns how to drive the agent.
 *
 * This is a real jsdom render of the actual {@link ChatPanel} (not a grep or a
 * pure-function test — the API-only/pure-function anti-pattern is exactly how UI
 * gaps ship green). With an empty history and no conversation id, the panel is a
 * fresh conversation, so the entry tip card must appear without any idle wait. It
 * would fail if anyone reverted the entry-tip wiring or went back to idle-only
 * tips that leave a new conversation empty.
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

/** A chat provider whose history resolves empty → a fresh, deterministic mount. */
function buildChatProvider(): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => [],
  }
}

/** An HTTP client whose every request rejects; the mounted callers catch their own. */
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

/** Renders {@link ChatPanel} inside the contexts it needs, on a fresh conversation. */
function renderFreshChatPanel(): ReactElement {
  const wrap = (children: ReactNode): ReactElement => (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>
        <HttpProvider client={buildHttpClient()}>
          <ChatContextProvider provider={buildChatProvider()}>{children}</ChatContextProvider>
        </HttpProvider>
      </ThemeProvider>
    </I18nProvider>
  )
  return wrap(<ChatPanel projectId="proj-syn12" agentName="Synthase" />)
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

describe('ChatPanel auto-tips (SYN12 — entry tip on a fresh conversation)', () => {
  it('surfaces the onboarding entry tip immediately, with no idle wait', async () => {
    const { container } = render(renderFreshChatPanel())

    const tip = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-tip-card"]')
      expect(el, 'a fresh conversation must show the onboarding entry tip').not.toBeNull()
      return el as HTMLElement
    })

    // It is the high-value getStarted hint, personalised with the agent name and
    // pointing at the two interactions that unlock everything else (/ and @).
    const text = tip.textContent ?? ''
    expect(text).toContain('type /')
    expect(text).toContain('Synthase')
    expect(text).toContain('to work from')
    // The interpolation token is resolved, never shown raw.
    expect(text).not.toContain('{{agentName}}')

    // A dismiss affordance is present so the tip is non-interrupting.
    expect(container.querySelector('[data-mol-id="chat-tip-dismiss"]')).not.toBeNull()
  })
})
