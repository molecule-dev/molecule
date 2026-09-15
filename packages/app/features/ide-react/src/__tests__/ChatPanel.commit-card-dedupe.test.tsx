// @vitest-environment jsdom

/**
 * One commit, one card.
 *
 * The commit endpoint both RETURNS the commit (the panel adds a local card from the
 * response) and PERSISTS it as a `commitRecord` message on the conversation. Any history
 * reload that happens afterwards — a tab refocus, the network coming back, an
 * end-of-turn reconcile — pulls that record into the transcript, and the panel used to
 * render it next to the still-present local card: the same commit twice, until a page
 * refresh dropped the local state.
 *
 * A real jsdom render of {@link ChatPanel} running `/commit` and then a real reconcile.
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

const SUBJECT = 'feat: add login page'
const FULL_MESSAGE = `${SUBJECT}\n\nCo-authored-by: Synthase <synthase@molecule.dev>`
const HASH = 'abc1234'

/** Whether the server has persisted the commit record yet. */
let committed = false

/** A provider whose history gains the persisted commit record once the commit lands. */
function buildChatProvider(loadHistory: () => void): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => {
      loadHistory()
      const intro: ChatMessage = { id: 'u1', role: 'user', content: 'hi', timestamp: 1000 }
      if (!committed) return [intro]
      return [
        intro,
        {
          id: 'commit-record-1',
          role: 'system',
          content: FULL_MESSAGE,
          timestamp: Date.now(),
          commitRecord: { message: FULL_MESSAGE, files: ['src/Login.tsx'], hash: HASH },
        },
      ]
    },
  }
}

/** An HTTP client that serves git-status + commit and rejects everything else. */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  const get = ((url: string) =>
    url.endsWith('/git-status')
      ? Promise.resolve({ data: { files: [{ path: 'src/Login.tsx' }] } })
      : reject()) as HttpClient['get']
  const post = ((url: string) => {
    if (!url.endsWith('/commit')) return reject()
    committed = true
    return Promise.resolve({
      data: {
        ok: true,
        committed: true,
        message: FULL_MESSAGE,
        files: ['src/Login.tsx'],
        hash: HASH,
      },
    })
  }) as HttpClient['post']
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get,
    post,
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

/** Every rendered commit card showing {@link SUBJECT}. */
function commitCards(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll('code')).filter((el) => el.textContent === SUBJECT)
}

beforeEach(() => {
  committed = false
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

describe('ChatPanel commit-card dedupe', () => {
  it('renders a commit once after a history reload brings in its persisted record', async () => {
    const onLoadHistory = vi.fn()
    const wrap = (children: ReactNode): ReactElement => (
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ThemeProvider provider={buildThemeProvider()}>
          <HttpProvider client={buildHttpClient()}>
            <ChatContextProvider provider={buildChatProvider(onLoadHistory)}>
              {children}
            </ChatContextProvider>
          </HttpProvider>
        </ThemeProvider>
      </I18nProvider>
    )
    const { container } = render(wrap(<ChatPanel projectId="proj-commit" agentName="Synthase" />))
    await waitFor(() => expect(container.textContent).toContain('hi'))

    const input = container.querySelector('[data-mol-chat-input]') as HTMLTextAreaElement
    expect(input).not.toBeNull()
    fireEvent.change(input, { target: { value: '/commit' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // The local card from the commit response.
    await waitFor(() => expect(commitCards(container)).toHaveLength(1))

    // The network comes back → the chat reconciles against the server transcript, which
    // now carries the persisted record for the same commit.
    const loadsBefore = onLoadHistory.mock.calls.length
    window.dispatchEvent(new Event('online'))
    await waitFor(() => expect(onLoadHistory.mock.calls.length).toBeGreaterThan(loadsBefore))
    await waitFor(() => expect(container.textContent).not.toContain('Committing'))

    // This is the bug: the local card and the persisted record both rendered.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(commitCards(container)).toHaveLength(1)
  })
})
