// @vitest-environment jsdom

/**
 * SOC1 — user-avatar-in-chat wiring guard.
 *
 * The real Synthase chat — this package's {@link ChatPanel} — renders the
 * signed-in user's real avatar (gated by `resolveUserAvatar`) on their own
 * messages, with a generic-icon fallback. A stub `ChatProvider.loadHistory`
 * seeds the conversation so the real timeline mounts, and each case asserts the
 * avatar actually reaches the DOM — exercising the full
 * `ChatPanel → MessageItem → UserAvatar` threading chain.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/ChatPanel.user-avatar.test.tsx`
 * with the same test names and the same behavioral assertions.
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
import {
  ChatContext,
  HttpContext,
  resetAIModelsCache,
  resetChatStoresForTests,
  ThemeContext,
} from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.jsx'
import type { ChatUserIdentity } from '../parts/MessageItem.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

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
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
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

/** The mount alive right now, if any. */
const mounted: { dispose?: () => void } = {}

/** The panel props the suite varies. */
interface PanelProps {
  /** The avatar value to thread into the panel. */
  userAvatar?: string | null
  /** Optional profile-click handler (C5). */
  onProfileClick?: (user: ChatUserIdentity) => void
  /** The signed-in user's id. */
  currentUserId?: string
}

/**
 * Renders {@link ChatPanel} inside all the contexts it needs, with a seeded
 * history.
 *
 * @param props - The panel props to thread through.
 * @param history - The conversation the stub provider returns.
 * @returns The element the panel mounted into.
 */
function renderChatPanel(
  props: PanelProps = {},
  history: ChatMessage[] = seededHistory(),
): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildHttpClient()}>
          <ChatContext.Provider value={buildChatProvider(history)}>
            <ChatPanel projectId="proj-soc1" {...props} />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  return container
}

/**
 * Waits until the seeded user message has mounted (proves the timeline rendered).
 *
 * @param container - The mounted container.
 * @param text - The text to wait for.
 */
async function waitForText(container: HTMLElement, text: string): Promise<void> {
  await vi.waitFor(() => {
    expect(container.textContent).toContain(text)
  })
}

/**
 * Waits for the user-avatar element.
 *
 * @param container - The mounted container.
 * @returns The avatar element.
 */
async function waitForAvatar(container: HTMLElement): Promise<HTMLElement> {
  return vi.waitFor(() => {
    const el = container.querySelector<HTMLElement>('[data-mol-id="chat-user-avatar"]')
    expect(el, 'a user-avatar element should render for the user message').not.toBeNull()
    return el as HTMLElement
  })
}

beforeEach(() => {
  setClassMap(classMap)
  // Any glyph resolves to an empty path set — Icon only needs a defined entry.
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
  resetChatStoresForTests()
  resetAIModelsCache()
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
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  resetChatStoresForTests()
  resetAIModelsCache()
  setProvider(createSimpleI18nProvider())
})

describe('ChatPanel user avatar (SOC1)', () => {
  it('renders the real avatar image beside a user message when userAvatar is supplied', async () => {
    const container = renderChatPanel({ userAvatar: AVATAR_DATA_URI })

    // The seeded user message must mount (proves the timeline rendered).
    await waitForText(container, USER_MESSAGE_TEXT)

    const avatar = await waitForAvatar(container)

    // The wiring the audit found missing: a real <img> with the safe src.
    expect(avatar.tagName).toBe('IMG')
    expect(avatar.getAttribute('src')).toBe(AVATAR_DATA_URI)
    expect(avatar.getAttribute('alt')).toBe('You')
  })

  it('keeps the glyph decorative for a whitespace-only author name', async () => {
    // A whitespace-only name initials to nothing, so the generic glyph shows —
    // and with no name to announce, the glyph is decorative chrome (axe
    // `role-img-alt`): no image role, no label, hidden from assistive tech.
    const history: ChatMessage[] = [
      {
        id: 'u1',
        role: 'user',
        content: 'hello from a blank author',
        timestamp: 1000,
        author: { id: 'u-blank', name: '   ', avatar: null },
      },
    ]
    const container = renderChatPanel({}, history)

    await waitForText(container, 'hello from a blank author')
    const avatar = await waitForAvatar(container)

    expect(avatar.tagName).not.toBe('IMG')
    // The glyph renders (not an initial)…
    expect(avatar.querySelector('svg')).not.toBeNull()
    expect(avatar.textContent).toBe('')
    // …as decoration: no name to announce, so no image role and no label.
    expect(avatar.getAttribute('role')).toBeNull()
    expect(avatar.getAttribute('aria-label')).toBeNull()
    expect(avatar.getAttribute('aria-hidden')).toBe('true')
  })

  it('never places an unsafe avatar value into an <img src> (safety gate is applied in render)', async () => {
    const container = renderChatPanel({ userAvatar: 'javascript:alert(1)' })

    await waitForText(container, USER_MESSAGE_TEXT)

    await vi.waitFor(() => {
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
    const container = renderChatPanel({ userAvatar: AVATAR_DATA_URI })

    await vi.waitFor(() => {
      expect(container.querySelector('[data-mol-id="chat-user-avatar"]')).not.toBeNull()
    })

    // No button wrappers — the avatar renders as the bare image and the author
    // name as the plain bold span, exactly as before.
    expect(container.querySelector('[data-mol-id="chat-user-avatar-button"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="chat-user-name-button"]')).toBeNull()
  })

  it('opens the profile (fires onProfileClick with the clicked identity) when the avatar is clicked', async () => {
    const onProfileClick = vi.fn()
    const container = renderChatPanel({ userAvatar: AVATAR_DATA_URI, onProfileClick })

    const button = await vi.waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-user-avatar-button"]')
      expect(el, 'a clickable avatar button should render for the user message').not.toBeNull()
      return el as HTMLButtonElement
    })

    // Real button — keyboard-focusable and screen-reader-labelled.
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('aria-label')).toBe('View profile')
    // It still renders the real avatar image inside.
    expect(button.querySelector('img[data-mol-id="chat-user-avatar"]')).not.toBeNull()

    button.click()
    expect(onProfileClick).toHaveBeenCalledTimes(1)
    expect(onProfileClick).toHaveBeenCalledWith({ avatar: AVATAR_DATA_URI })
  })

  it("fires with the clicked AUTHOR's identity — a teammate's avatar opens THEIR profile, never the viewer's", async () => {
    const onProfileClick = vi.fn()
    // Two authored messages: the signed-in user's own (Luke) and a teammate's
    // (Test). BOTH avatars are clickable now; each click carries that message's
    // own author identity so the host can show teammate=view-only, own=editable.
    const history: ChatMessage[] = [
      {
        id: 'u1',
        role: 'user',
        content: 'mine',
        timestamp: 1000,
        author: { id: 'u-luke', name: 'Luke', avatar: AVATAR_DATA_URI },
      },
      {
        id: 'u2',
        role: 'user',
        content: 'theirs',
        timestamp: 2000,
        author: { id: 'u-test', name: 'Test', avatar: null },
      },
    ]
    const container = renderChatPanel(
      { userAvatar: AVATAR_DATA_URI, currentUserId: 'u-luke', onProfileClick },
      history,
    )

    await waitForText(container, 'theirs')
    // BOTH avatars are clickable — the viewer's own AND the teammate's.
    const buttons = await vi.waitFor(() => {
      const found = container.querySelectorAll<HTMLButtonElement>(
        '[data-mol-id="chat-user-avatar-button"]',
      )
      expect(found.length).toBe(2)
      return found
    })
    // Luke's (first message) wraps the real avatar image; Test's is the initial tile.
    expect(buttons[0]).toBeDefined()
    expect(buttons[0]!.querySelector('img')).not.toBeNull()
    expect(buttons[1]?.querySelector('img')).toBeNull()

    // Clicking the teammate's avatar carries the TEAMMATE's identity.
    buttons[1]?.click()
    expect(onProfileClick).toHaveBeenLastCalledWith({ id: 'u-test', name: 'Test', avatar: null })
    // Clicking the viewer's own avatar carries their own.
    buttons[0]?.click()
    expect(onProfileClick).toHaveBeenLastCalledWith({
      id: 'u-luke',
      name: 'Luke',
      avatar: AVATAR_DATA_URI,
    })
  })

  it("opens the author's profile from their NAME too (clickable header username)", async () => {
    const onProfileClick = vi.fn()
    const history: ChatMessage[] = [
      {
        id: 'u2',
        role: 'user',
        content: 'from a teammate',
        timestamp: 1000,
        author: { id: 'u-test', name: 'Test', avatar: null },
      },
    ]
    const container = renderChatPanel(
      { userAvatar: AVATAR_DATA_URI, currentUserId: 'u-luke', onProfileClick },
      history,
    )

    const nameButton = await vi.waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-user-name-button"]')
      expect(el, 'the author name should render as a clickable button').not.toBeNull()
      return el as HTMLButtonElement
    })

    // A real button whose visible text IS the author's name (its accessible name).
    expect(nameButton.tagName).toBe('BUTTON')
    expect(nameButton.textContent).toBe('Test')

    nameButton.click()
    expect(onProfileClick).toHaveBeenCalledTimes(1)
    expect(onProfileClick).toHaveBeenCalledWith({ id: 'u-test', name: 'Test', avatar: null })
  })
})
