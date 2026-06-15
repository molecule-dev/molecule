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
 *     `autoCommitSeconds`, the panel restores it as the persistent (paused)
 *     "Auto-commit on" pill, so a reload genuinely keeps auto-commit on.
 *  2. **Persist on change** — changing the cadence (here: clicking the pill to
 *     cancel) debounce-PATCHes `settings.autoCommitSeconds` back to the server.
 *
 * On the pre-fix code the panel never read or wrote `autoCommitSeconds`, so the
 * pill never appears (1 fails) and no PATCH is sent (2 fails) — exactly the
 * hollow close this re-verify is closing.
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

describe('ChatPanel auto-commit cadence persistence (SYN3)', () => {
  it('hydrates the saved cadence into the persistent "Auto-commit on" pill on load', async () => {
    const patchSpy = vi.fn(async () => ({}))
    const { container } = render(
      renderChatPanel(buildHttpClient({ autoCommitSeconds: 30 }, patchSpy)),
    )

    // The GET returned autoCommitSeconds: 30 → the panel hydrates it as the
    // paused "on" pill. Pre-fix the panel ignored the field and this never shows.
    const badge = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-autocommit-badge"]')
      expect(el, 'the restored auto-commit pill must render after load').not.toBeNull()
      return el as HTMLElement
    })
    expect(badge.textContent).toContain('Auto-commit on')
    // Hydrated as paused (not actively counting down) — re-arms on the next change.
    expect(badge.getAttribute('data-mol-pulse')).toBe('false')
  })

  it('does NOT show the pill when no cadence is saved (off by default)', async () => {
    const patchSpy = vi.fn(async () => ({}))
    const { container } = render(renderChatPanel(buildHttpClient({}, patchSpy)))
    // Let the settings GET resolve, then confirm the pill stays absent.
    await waitFor(() => {
      expect(container.querySelector('[data-mol-id="chat-report-button"]')).not.toBeNull()
    })
    expect(container.querySelector('[data-mol-id="chat-autocommit-badge"]')).toBeNull()
  })

  it('debounce-PATCHes settings.autoCommitSeconds when the cadence changes (cancel via the pill)', async () => {
    const patchSpy = vi.fn(async () => ({}))
    const { container } = render(
      renderChatPanel(buildHttpClient({ autoCommitSeconds: 30 }, patchSpy)),
    )

    const badge = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-autocommit-badge"]')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })

    // Click the pill → cancel (set 0). The debounced effect must PATCH the new
    // cadence back to the server. The just-hydrated value (30) is NOT re-PATCHed.
    fireEvent.click(badge)

    await waitFor(
      () => {
        expect(patchSpy).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`, {
          settings: { autoCommitSeconds: 0 },
        })
      },
      { timeout: 2000 },
    )
    // The hydrated cadence was never echoed back — the only PATCH is the change.
    expect(patchSpy).toHaveBeenCalledTimes(1)
    // …and the pill disappears now that auto-commit is off.
    await waitFor(() => {
      expect(container.querySelector('[data-mol-id="chat-autocommit-badge"]')).toBeNull()
    })
  })
})
