// @vitest-environment jsdom

/**
 * SYN10 — report affordance glyph visual-quality guard.
 *
 * The MVP intent audit (`docs/mvp-intent-findings.md`, SYN10) found the chat
 * header's "report a bug" button wore a generic warning-triangle glyph
 * (`exclamation-triangle`) — a wrong/ambiguous icon that reads as an error
 * state, not a "file a bug report" affordance. The fix swaps it for a real
 * `bug` glyph from the bonded `@molecule/app-icons` SVG icon set, consistent
 * with its share/settings siblings (all real SVG glyphs, never emoji).
 *
 * This is a real jsdom render of the actual {@link ChatPanel}, not a grep or a
 * pure-function test (the API-only/pure-function anti-pattern is exactly how
 * visual gaps ship green). A NAME-KEYED icon set resolves each glyph to an
 * `<svg><path>` whose `d` uniquely encodes the looked-up name, so the test can
 * assert the report button renders the `bug` glyph specifically — and would
 * fail if anyone reverted it to `exclamation-triangle` or swapped the SVG for
 * an emoji string.
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

// ── Stubs ───────────────────────────────────────────────────────────────────

/**
 * A {@link ChatProvider} whose `loadHistory` resolves empty, so the panel mounts
 * deterministically with no network or streaming.
 *
 * @returns A stub chat provider.
 */
function buildChatProvider(): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => [],
  }
}

/**
 * An {@link HttpClient} stub whose every request rejects — both callers in the
 * mounted tree (`useAIModels` and the conversation-list fetch) catch their own
 * failures, so the header render is unaffected and there are no unhandled
 * rejections.
 *
 * @returns A stub HTTP client.
 */
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

/**
 * An in-memory {@link Storage}. The chat panel reads `localStorage`/
 * `sessionStorage` on mount; in this environment Node's experimental web-storage
 * shadows jsdom's with a non-functional global, so the test installs a working
 * one.
 *
 * @returns A fresh, empty storage.
 */
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

/**
 * A minimal light {@link ThemeProvider} so `useThemeMode` resolves.
 *
 * @returns A stub theme provider.
 */
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

/**
 * Renders {@link ChatPanel} inside all the contexts it needs.
 *
 * @returns The wrapped element.
 */
function renderChatPanel(): ReactElement {
  const wrap = (children: ReactNode): ReactElement => (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>
        <HttpProvider client={buildHttpClient()}>
          <ChatContextProvider provider={buildChatProvider()}>{children}</ChatContextProvider>
        </HttpProvider>
      </ThemeProvider>
    </I18nProvider>
  )
  return wrap(<ChatPanel projectId="proj-syn10" />)
}

beforeEach(() => {
  setClassMap(classMap)
  // A name-keyed icon set: every glyph resolves to a real <svg><path> whose `d`
  // uniquely encodes the looked-up name, so the test can assert the report
  // button renders the `bug` glyph (never `exclamation-triangle`, never emoji).
  setIconSet(
    new Proxy(
      {},
      {
        get: (_target, name) => ({
          paths: [{ d: `glyph:${String(name)}` }],
          viewBox: '0 0 16 16',
        }),
      },
    ),
  )
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
  // jsdom does not implement scrollIntoView; the chat scrolls after history
  // loads. Make it a no-op so the render doesn't throw.
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ChatPanel report-button glyph (SYN10)', () => {
  it('renders the real bug glyph on the report button, never the warning triangle and never an emoji', async () => {
    const { container } = render(renderChatPanel())

    const button = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-report-button"]')
      expect(el, 'the report-a-bug button must render in the chat header').not.toBeNull()
      return el as HTMLElement
    })

    // It is a real SVG glyph, not an emoji string or text node.
    const svg = button.querySelector('svg')
    expect(svg, 'the report button must render an <svg> icon, not an emoji').not.toBeNull()
    expect(button.textContent ?? '', 'no emoji/text glyph beside the SVG').toBe('')

    // The glyph wired is the `bug` icon — not the warning triangle the audit
    // rejected. This assertion bites if anyone reverts the name.
    const d = svg?.querySelector('path')?.getAttribute('d')
    expect(d, 'the report button renders the bonded `bug` glyph').toBe('glyph:bug')
    expect(d).not.toBe('glyph:exclamation-triangle')
  })
})
