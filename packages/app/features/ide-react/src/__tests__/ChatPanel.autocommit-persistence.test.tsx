// @vitest-environment jsdom

/**
 * SYN3 — auto-commit cadence persistence is REAL, end-to-end.
 *
 * The adversarial re-verify found SYN3 had shipped only a system-prompt line
 * claiming the `/autocommit` cadence "survives a reload/reconnect" — with no
 * persistence code behind it. This test renders the actual {@link ChatPanel}
 * and proves the two halves the prompt now relies on:
 *
 *  1. **Hydrate on load** — when the project-settings GET returns a saved
 *     `autoCommitSeconds`, the panel restores the cadence so a reload genuinely
 *     keeps auto-commit on. Since P4-11 removed the static "Auto-commit on" pill
 *     (the paused state now shows nothing), hydration is asserted via the
 *     `/settings` view, which reports the live cadence ("Every 30s").
 *  2. **Persist on change** — changing the cadence (here: the real `/autocommit`
 *     command) debounce-PATCHes `settings.autoCommitSeconds` back to the server,
 *     and arming shows the green countdown badge (P4-10).
 *
 * On the pre-fix code the panel never read or wrote `autoCommitSeconds`, so the
 * cadence never appears in /settings (1 fails) and no PATCH is sent (2 fails) —
 * exactly the hollow close this re-verify is closing.
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

const PROJECT_ID = 'proj-syn3'

/** A chat provider whose history resolves empty, so the panel mounts with no network. */
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
 * An {@link HttpClient} stub: the project-settings GET resolves the supplied
 * settings; every other request rejects (callers catch their own failures). The
 * PATCH is the provided spy so the test can assert the persisted body.
 */
function buildHttpClient(
  settings: Record<string, unknown>,
  patchSpy: (url: string, data?: unknown) => Promise<unknown>,
): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  const get = (url: string): Promise<unknown> => {
    if (url === `/projects/${PROJECT_ID}`) {
      return Promise.resolve({
        data: { settings },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { url, method: 'GET' },
      })
    }
    return reject()
  }
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: get as HttpClient['get'],
    post: reject,
    put: reject,
    patch: patchSpy as unknown as HttpClient['patch'],
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/** An in-memory {@link Storage} (Node's experimental web-storage shadows jsdom's). */
function makeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length(): number {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => store.delete(key) as unknown as void,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
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

/**
 * Renders {@link ChatPanel} inside every context it needs, wired to the given
 * HTTP client.
 *
 * @param http - The HTTP client stub (settings GET + PATCH spy).
 * @returns The wrapped element.
 */
function renderChatPanel(http: HttpClient): ReactElement {
  const wrap = (children: ReactNode): ReactElement => (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>
        <HttpProvider client={http}>
          <ChatContextProvider provider={buildChatProvider()}>{children}</ChatContextProvider>
        </HttpProvider>
      </ThemeProvider>
    </I18nProvider>
  )
  return wrap(<ChatPanel projectId={PROJECT_ID} />)
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [{ d: 'x' }], viewBox: '0 0 16 16' }) }))
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

/**
 * Submits a slash command through the real composer (the space closes the
 * command menu, so Enter submits the raw text rather than picking a menu item).
 *
 * @param container - The rendered ChatPanel container.
 * @param text - The exact command text to type and submit.
 */
function submitCommand(container: HTMLElement, text: string): void {
  const input = container.querySelector('[data-mol-chat-input]') as HTMLTextAreaElement | null
  if (!input) throw new Error('composer input not found')
  fireEvent.change(input, { target: { value: text } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

describe('ChatPanel auto-commit cadence persistence (SYN3)', () => {
  it('hydrates the saved cadence on load — shown in /settings; no static pill (P4-11)', async () => {
    const patchSpy = vi.fn(async () => ({}))
    const { container } = render(
      renderChatPanel(buildHttpClient({ autoCommitSeconds: 30 }, patchSpy)),
    )

    // P4-11 removed the paused "Auto-commit on" pill, so the paused state shows
    // nothing. Open /settings (re-renders with live state) and confirm the cadence
    // WAS hydrated — pre-fix the panel ignored the field and this stays "Off".
    const settingsBtn = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-settings-button"]')
      expect(el, 'the settings button must render').not.toBeNull()
      return el as HTMLElement
    })
    fireEvent.click(settingsBtn)

    await waitFor(() => {
      const row = container.querySelector('[data-mol-id="setting-row-autoCommit"]')
      expect(row, 'the /settings auto-commit row must render').not.toBeNull()
      expect(row?.textContent).toContain('Every 30s')
    })
    // No static auto-commit pill in the paused state (P4-11).
    expect(container.querySelector('[data-mol-id="chat-autocommit-badge"]')).toBeNull()
    // The hydrated cadence is NOT echoed back as a spurious PATCH (persistedRef set).
    expect(patchSpy).not.toHaveBeenCalled()
  })

  it('does NOT show the badge when no cadence is saved (off by default)', async () => {
    const patchSpy = vi.fn(async () => ({}))
    const { container } = render(renderChatPanel(buildHttpClient({}, patchSpy)))
    // Let the settings GET resolve, then confirm the badge stays absent.
    await waitFor(() => {
      expect(container.querySelector('[data-mol-id="chat-report-button"]')).not.toBeNull()
    })
    expect(container.querySelector('[data-mol-id="chat-autocommit-badge"]')).toBeNull()
  })

  it('debounce-PATCHes settings.autoCommitSeconds when the cadence changes (off → /autocommit 30)', async () => {
    const patchSpy = vi.fn(async () => ({}))
    const { container } = render(renderChatPanel(buildHttpClient({}, patchSpy)))

    // Wait for the composer, then confirm there is no badge while off.
    await waitFor(() => {
      expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull()
    })
    expect(container.querySelector('[data-mol-id="chat-autocommit-badge"]')).toBeNull()

    // Set a cadence via the REAL /autocommit command — this debounce-PATCHes the
    // new cadence back to the server. (The armed green countdown badge itself —
    // which lives in the commit bar's slot, visible only with pending files — is
    // covered directly in AutoCommitBadge.test.tsx; here we prove persistence.)
    submitCommand(container, '/autocommit 30')

    await waitFor(
      () => {
        expect(patchSpy).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`, {
          settings: { autoCommitSeconds: 30 },
        })
      },
      { timeout: 2000 },
    )
    // The only PATCH is the change — the off default (0) was never echoed.
    expect(patchSpy).toHaveBeenCalledTimes(1)
  })
})
