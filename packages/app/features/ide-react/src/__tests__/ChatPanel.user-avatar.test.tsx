// @vitest-environment jsdom

/**
 * SOC1 — user-avatar-in-chat wiring guard.
 *
 * The MVP audit found avatar-in-chat had been added only to a pair of
 * never-imported molecule-dev demo components; the real Synthase chat — this
 * package's {@link ChatPanel} — rendered no avatar at all, so the feature was
 * dead end-to-end despite green pure-function tests. The fix adds a `userAvatar`
 * prop that threads `ChatPanel → ChatInner → MessageItem → UserAvatar` and
 * renders the signed-in user's real avatar (gated by `resolveUserAvatar`) on
 * their own messages, with a generic-icon fallback.
 *
 * This is a real jsdom render of the actual {@link ChatPanel}, not a grep or an
 * isolated helper test (the API-only/pure-function anti-pattern is exactly why
 * the gap shipped). A stub `ChatProvider.loadHistory` seeds one user + one
 * assistant message so the real timeline mounts, and the test asserts the avatar
 * the audit said was missing actually reaches the DOM for a user message —
 * exercising the full prop-threading chain. A second case proves the icon
 * fallback, and a third proves the safety gate (an unsafe `javascript:` value is
 * NOT placed into an `<img src>`).
 *
 * @module
 */

import { fireEvent, render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
 * A {@link ChatProvider} whose `loadHistory` returns a fixed message list, so the
 * chat timeline mounts deterministically with no network or streaming.
 *
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
 * An {@link HttpClient} stub whose every request rejects — both callers in the
 * mounted tree (`useAIModels` and the conversation-list fetch) catch their own
 * failures, so the avatar render is unaffected and there are no unhandled
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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_MESSAGE_TEXT = 'Add a dark mode toggle'

/** A 1×1 transparent PNG data-URI — a safe, renderable avatar source. */
const AVATAR_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

/**
 * Builds the seeded conversation the stub provider returns.
 *
 * @returns A two-message history (one user, one assistant) for `loadHistory`.
 */
function seededHistory(): ChatMessage[] {
  return [
    { id: 'u1', role: 'user', content: USER_MESSAGE_TEXT, timestamp: 1000 },
    { id: 'a1', role: 'assistant', content: 'On it.', timestamp: 2000 },
  ]
}

/**
 * Renders {@link ChatPanel} inside all the contexts it needs, with a seeded
 * history.
 *
 * @param props - Render props.
 * @param props.userAvatar - The avatar value to thread into the panel.
 * @param props.onProfileClick - Optional profile-click handler (C5). When set,
 *   the user avatar is rendered as a clickable button.
 * @returns The wrapped element.
 */
function renderChatPanel({
  userAvatar,
  onProfileClick,
}: {
  userAvatar?: string | null
  onProfileClick?: (user: { avatar?: string | null }) => void
}): ReactElement {
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
  return wrap(
    <ChatPanel projectId="proj-soc1" userAvatar={userAvatar} onProfileClick={onProfileClick} />,
  )
}

beforeEach(() => {
  setClassMap(classMap)
  // Any glyph resolves to an empty path set — Icon only needs a defined entry.
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
  // jsdom does not implement scrollIntoView; the chat scrolls to the latest
  // message after history loads. Make it a no-op so the render doesn't throw.
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ChatPanel user avatar (SOC1)', () => {
  it('renders the real avatar image beside a user message when userAvatar is supplied', async () => {
    const { container } = render(renderChatPanel({ userAvatar: AVATAR_DATA_URI }))

    // The seeded user message must mount (proves the timeline rendered).
    await waitFor(() => {
      expect(container.textContent).toContain(USER_MESSAGE_TEXT)
    })

    const avatar = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-user-avatar"]')
      expect(el, 'a user-avatar element should render for the user message').not.toBeNull()
      return el as HTMLElement
    })

    // The wiring the audit found missing: a real <img> with the safe src.
    expect(avatar.tagName).toBe('IMG')
    expect(avatar.getAttribute('src')).toBe(AVATAR_DATA_URI)
    expect(avatar.getAttribute('alt')).toBe('You')
  })

  it('falls back to the generic user icon when no avatar is supplied', async () => {
    const { container } = render(renderChatPanel({ userAvatar: null }))

    await waitFor(() => {
      expect(container.textContent).toContain(USER_MESSAGE_TEXT)
    })

    const avatar = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-user-avatar"]')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })

    // No image — the accessible icon fallback instead.
    expect(avatar.tagName).not.toBe('IMG')
    expect(avatar.getAttribute('role')).toBe('img')
    expect(avatar.getAttribute('aria-label')).toBe('You')
    expect(avatar.querySelector('svg'), 'the fallback renders the user glyph').not.toBeNull()
    expect(container.querySelector('img[data-mol-id="chat-user-avatar"]')).toBeNull()
  })

  it('never places an unsafe avatar value into an <img src> (safety gate is applied in render)', async () => {
    const { container } = render(renderChatPanel({ userAvatar: 'javascript:alert(1)' }))

    await waitFor(() => {
      expect(container.textContent).toContain(USER_MESSAGE_TEXT)
    })

    await waitFor(() => {
      expect(container.querySelector('[data-mol-id="chat-user-avatar"]')).not.toBeNull()
    })

    // The unsafe scheme must be rejected → icon fallback, never an <img>.
    expect(container.querySelector('img[data-mol-id="chat-user-avatar"]')).toBeNull()
    const avatar = container.querySelector('[data-mol-id="chat-user-avatar"]') as HTMLElement
    expect(avatar.tagName).not.toBe('IMG')
    expect(avatar.querySelector('svg')).not.toBeNull()
  })
})

describe('ChatPanel user avatar clickability (C5)', () => {
  it('is NOT interactive when no onProfileClick is supplied (backward-compatible)', async () => {
    const { container } = render(renderChatPanel({ userAvatar: AVATAR_DATA_URI }))

    await waitFor(() => {
      expect(container.querySelector('[data-mol-id="chat-user-avatar"]')).not.toBeNull()
    })

    // No button wrapper — the avatar renders as the bare image, exactly as before.
    expect(container.querySelector('[data-mol-id="chat-user-avatar-button"]')).toBeNull()
  })

  it('opens the profile (fires onProfileClick with the clicked identity) when the avatar is clicked', async () => {
    const onProfileClick = vi.fn()
    const { container } = render(renderChatPanel({ userAvatar: AVATAR_DATA_URI, onProfileClick }))

    const button = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-user-avatar-button"]')
      expect(el, 'a clickable avatar button should render for the user message').not.toBeNull()
      return el as HTMLButtonElement
    })

    // Real button — keyboard-focusable and screen-reader-labelled.
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('aria-label')).toBe('View profile')
    // It still renders the real avatar image inside.
    expect(button.querySelector('img[data-mol-id="chat-user-avatar"]')).not.toBeNull()

    fireEvent.click(button)
    expect(onProfileClick).toHaveBeenCalledTimes(1)
    expect(onProfileClick).toHaveBeenCalledWith({ avatar: AVATAR_DATA_URI })
  })

  it('makes the icon-fallback avatar clickable too (no real avatar set)', async () => {
    const onProfileClick = vi.fn()
    const { container } = render(renderChatPanel({ userAvatar: null, onProfileClick }))

    const button = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-user-avatar-button"]')
      expect(el).not.toBeNull()
      return el as HTMLButtonElement
    })

    // The fallback glyph is wrapped in the same accessible button.
    expect(button.querySelector('svg')).not.toBeNull()
    fireEvent.click(button)
    expect(onProfileClick).toHaveBeenCalledWith({ avatar: null })
  })
})
