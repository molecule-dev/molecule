// @vitest-environment jsdom

/**
 * C2 + C3 — auto-sent message styling + hidden-message guard.
 *
 * C2: a message sent automatically on the user's behalf (e.g. an auto-fix
 * prompt, flagged `automatic`) must NOT look like the user typed it — it gets
 * the molecule logo avatar (not the user's avatar) and a green accent border
 * (not the blue user border), plus a "Sent automatically" label, so it's
 * obvious the agent sent it.
 *
 * C3: a `hidden` driver message (e.g. the post-boot kickoff) must NEVER reach
 * the DOM, even if it somehow appears in the message list.
 *
 * This is a real jsdom render of the actual {@link ChatPanel} (the API-only /
 * pure-function anti-pattern is exactly why such gaps ship). A stub
 * `ChatProvider.loadHistory` seeds the timeline; the test asserts the rendered
 * DOM, exercising the full `ChatPanel → ChatInner → MessageItem` chain.
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
 * A {@link ChatProvider} whose `loadHistory` returns a fixed message list, so
 * the chat timeline mounts deterministically with no network or streaming.
 * @param history - Messages `loadHistory` should resolve with.
 * @returns A stub chat provider.
 */
function buildChatProvider(history: ChatMessage[]): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => history,
  }
}

/**
 * An {@link HttpClient} stub whose every request rejects — callers in the
 * mounted tree catch their own failures, so the render is unaffected.
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
 * A working in-memory {@link Storage} (the chat panel reads local/sessionStorage
 * on mount; Node's experimental web-storage shadows jsdom's non-functionally).
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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_TEXT = 'Build me a todo app'
const AUTO_TEXT = 'Fix these issues:\n\nsrc/app.ts(1,1): error'
const HIDDEN_TEXT = 'The development environment is now fully ready ... ACTIVE again'

/**
 * Builds the seeded conversation the stub provider returns: a user message, a
 * hidden driver message, an auto-sent message, and an assistant message.
 * @returns The seeded history for `loadHistory`.
 */
function seededHistory(): ChatMessage[] {
  return [
    { id: 'u1', role: 'user', content: USER_TEXT, timestamp: 1000 },
    // A driver message the user must never see (C3).
    { id: 'h1', role: 'user', content: HIDDEN_TEXT, hidden: true, timestamp: 1500 },
    // Auto-sent on the user's behalf — visible but distinctly styled (C2).
    { id: 'auto1', role: 'user', content: AUTO_TEXT, automatic: true, timestamp: 2000 },
    { id: 'a1', role: 'assistant', content: 'On it.', timestamp: 3000 },
  ]
}

/**
 * Renders {@link ChatPanel} inside all the contexts it needs, with the seeded
 * history.
 * @returns The wrapped element.
 */
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
  return wrap(<ChatPanel projectId="proj-c2c3" userAvatar={null} />)
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

describe('ChatPanel auto-sent + hidden messages (C2 + C3)', () => {
  it('renders an automatic message with the molecule avatar, green accent, and "Sent automatically" label (C2)', async () => {
    const { container } = render(renderChatPanel())

    // The auto-sent message text mounts (timeline rendered).
    await waitFor(() => {
      expect(container.textContent).toContain('Fix these issues:')
    })

    // It is the auto-sent card, NOT a plain user card.
    const autoCard = container.querySelector(
      '[data-mol-id="chat-automatic-message"]',
    ) as HTMLElement | null
    expect(autoCard, 'an auto-sent card should render for the automatic message').not.toBeNull()

    // Green (success) accent border, not the blue user border.
    expect(autoCard!.style.borderLeft).toContain('--mol-color-success')
    expect(autoCard!.style.borderLeft).not.toContain('--mol-color-primary')

    // The molecule logo avatar (not the user's avatar).
    const molAvatar = autoCard!.querySelector('[data-mol-id="chat-automatic-avatar"]')
    expect(molAvatar, 'the molecule logo avatar should render').not.toBeNull()
    expect(molAvatar!.querySelector('svg'), 'avatar shows the logo glyph').not.toBeNull()
    expect(autoCard!.querySelector('[data-mol-id="chat-user-avatar"]')).toBeNull()

    // The explicit "sent automatically" label.
    expect(autoCard!.textContent).toContain('Sent automatically')
  })

  it('renders a real user message with the user avatar + animated gradient accent (not auto-sent)', async () => {
    const { container } = render(renderChatPanel())

    await waitFor(() => {
      expect(container.textContent).toContain(USER_TEXT)
    })

    const userCard = container.querySelector(
      '[data-mol-id="chat-user-message"]',
    ) as HTMLElement | null
    expect(userCard).not.toBeNull()
    // A real user message no longer carries a flat inline accent — its left edge is
    // the molecule brand's ANIMATED gradient, drawn by a `::before` whose rule is
    // injected once and gated on this row's data-mol-id. So it must NOT have the
    // auto-sent green border, and the gradient rule must be present + wired.
    expect(userCard!.style.borderLeft).not.toContain('--mol-color-success')
    const accentStyle = document.getElementById('mol-chat-user-accent-style')
    expect(accentStyle, 'the user-accent gradient style should be injected').not.toBeNull()
    expect(accentStyle!.textContent).toContain('[data-mol-id="chat-user-message"]::before')
    expect(accentStyle!.textContent).toContain('--mol-accent-gradient')
    expect(userCard!.querySelector('[data-mol-id="chat-user-avatar"]')).not.toBeNull()
    expect(userCard!.textContent).not.toContain('Sent automatically')
  })

  it('never renders a hidden driver message (C3)', async () => {
    const { container } = render(renderChatPanel())

    // Wait for the timeline to mount via a message that DOES render.
    await waitFor(() => {
      expect(container.textContent).toContain('On it.')
    })

    // The hidden message content must not be anywhere in the DOM.
    expect(container.textContent).not.toContain('ACTIVE again')
  })
})
