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

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
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
import { lightTheme, type ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.js'

const SUBJECT = 'feat: add login page'
const FULL_MESSAGE = `${SUBJECT}\n\nCo-authored-by: Synthase <synthase@molecule.dev>`
const HASH = 'abc1234'

/** Whether the server has persisted the commit record yet. */
let committed = false
let pendingPaths = ['src/Login.tsx']
let autoCommitSeconds = 0
const commitRequest = vi.fn()

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
  const get = ((url: string) => {
    if (url.endsWith('/git-status'))
      return Promise.resolve({
        data: { files: committed ? [] : pendingPaths.map((path) => ({ path, status: 'M' })) },
      })
    if (url === '/projects/proj-commit')
      return Promise.resolve({ data: { settings: { autoCommitSeconds } } })
    return reject()
  }) as HttpClient['get']
  const post = ((url: string) => {
    if (!url.endsWith('/commit')) return reject()
    commitRequest(url)
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
  return {
    getTheme: () => lightTheme,
    getThemes: () => [lightTheme],
    setTheme: () => {},
    toggleMode: () => {},
    subscribe: () => () => {},
  }
}

/** Every rendered commit card showing {@link SUBJECT}. */
function commitCards(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll('code')).filter((el) => el.textContent === SUBJECT)
}

beforeEach(() => {
  committed = false
  pendingPaths = ['src/Login.tsx']
  autoCommitSeconds = 0
  commitRequest.mockClear()
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
  cleanup()
  document.body.innerHTML = ''
})

/** The real panel, including its portalled work tray and existing commit handler. */
function panel(props: Partial<Parameters<typeof ChatPanel>[0]> = {}): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>
        <HttpProvider client={buildHttpClient()}>
          <ChatContextProvider provider={buildChatProvider(() => {})}>
            <ChatPanel projectId="proj-commit" {...props} />
          </ChatContextProvider>
        </HttpProvider>
      </ThemeProvider>
    </I18nProvider>
  )
}

describe('ChatPanel combined commit action', () => {
  it.each([
    [0, ['src/Login.tsx'], 'Commit 1 file'],
    [0, ['src/Login.tsx', 'src/Profile.tsx'], 'Commit 2 files'],
    [30, ['src/Login.tsx'], 'Commit 1 file'],
    [30, ['src/Login.tsx', 'src/Profile.tsx'], 'Commit 2 files'],
  ] as const)(
    'combines count and action with cadence %s and files %s',
    async (cadence, paths, label) => {
      autoCommitSeconds = cadence
      pendingPaths = [...paths]
      const onFileDiff = vi.fn()
      const { container } = render(panel({ onFileDiff }))
      const action = await waitFor(() => {
        const button = container.querySelector<HTMLButtonElement>(
          `[data-mol-id="${cadence ? 'chat-autocommit-badge' : 'chat-commit-button'}"]`,
        )
        expect(button?.textContent).toBe(label)
        return button!
      })
      const bar = container.querySelector('[data-mol-id="chat-commit-bar"]')!
      expect(bar.textContent).toBe(label)
      expect(bar.textContent).not.toContain('uncommitted')
      const disclosure = bar.querySelector('[data-mol-id="chat-commit-toggle"]')!
      expect(disclosure.getAttribute('aria-label')).toBe('Show changed files')
      expect(disclosure.getAttribute('title')).toBe('Show changed files')
      fireEvent.click(disclosure)
      fireEvent.click(container.querySelector('[data-mol-id="chat-commit-bar-detail"] button')!)
      expect(onFileDiff).toHaveBeenCalledWith(paths[0])
      expect(commitRequest).not.toHaveBeenCalled()
      fireEvent.click(action)
      await waitFor(() => expect(commitRequest).toHaveBeenCalledTimes(1))
      expect(commitRequest).toHaveBeenCalledWith('/projects/proj-commit/commit')
    },
  )

  it.each(['clean', 'viewer'] as const)(
    'hides the combined action for a %s tree or role',
    async (state) => {
      if (state === 'clean') pendingPaths = []
      const { container } = render(panel({ canEdit: state !== 'viewer' }))
      await waitFor(() => expect(container.textContent).toContain('hi'))
      expect(container.querySelector('[data-mol-id="chat-commit-bar"]')).toBeNull()
    },
  )

  it('puts the live auto-commit countdown in the counted action', async () => {
    autoCommitSeconds = 3
    pendingPaths = ['src/Login.tsx', 'src/Profile.tsx']
    const { container, rerender } = render(panel({ gitStatusTick: 0 }))
    await waitFor(() => {
      expect(container.querySelector('[data-mol-id="chat-autocommit-badge"]')?.textContent).toBe(
        'Commit 2 files',
      )
    })
    rerender(panel({ gitStatusTick: 1 }))
    await waitFor(() => {
      const bar = container.querySelector('[data-mol-id="chat-commit-bar"]')!
      expect(bar.textContent).toMatch(/^Commit 2 files in [123]s$/)
    })
    fireEvent.click(container.querySelector('[data-mol-id="chat-autocommit-badge"]')!)
    await waitFor(() => expect(commitRequest).toHaveBeenCalledTimes(1))
  })
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
