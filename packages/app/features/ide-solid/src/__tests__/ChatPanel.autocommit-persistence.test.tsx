// @vitest-environment jsdom
/**
 * SYN3 — auto-commit cadence persistence, end to end.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.autocommit-persistence.test.tsx`
 * with the same test names and the same assertions: the saved
 * `settings.autoCommitSeconds` hydrates (shown in `/settings`), the default
 * cadence applies when nothing was saved, an explicit `0` stays off, a cadence
 * change debounce-PATCHes `settings.autoCommitSeconds` back, and a due countdown
 * is HELD while a turn streams — firing `/commit` only once it completes.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider, ChatStreamEvent } from '@molecule/app-ai-chat'
import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { DEFAULT_AUTO_COMMIT_SECONDS } from '@molecule/app-ide-panel-logic'
import {
  ChatContext,
  HttpContext,
  resetChatStoresForTests,
  ThemeContext,
} from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

const PROJECT_ID = 'proj-syn3'

/** A chat provider whose history resolves empty. */
function buildChatProvider(): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => [],
  }
}

/** A full {@link HttpResponse} for a stub to resolve with. */
function responseOf(data: unknown): HttpResponse<never> {
  return {
    data: data as never,
    status: 200,
    statusText: '200',
    headers: {},
    config: { method: 'GET', url: '' },
  }
}

const patchSpy = vi.fn<
  (url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<never>>
>(async () => responseOf({}))

/**
 * An HTTP client stub: the project-settings GET resolves the supplied settings;
 * the git-status GET rejects (no pending files); the PATCH is recorded.
 *
 * @param settings - The project's saved settings.
 * @returns A stub client.
 */
function buildHttpClient(settings: Record<string, unknown>): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: async (url: string): Promise<HttpResponse<never>> => {
      if (url === `/projects/${PROJECT_ID}`) return responseOf({ settings })
      return reject()
    },
    post: reject,
    put: reject,
    patch: patchSpy,
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
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
  }
}

/** The mount alive right now, if any. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  patchSpy.mockClear()
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
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
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the panel over the given HTTP stub.
 *
 * @param http - The HTTP client stub.
 * @param provider - The chat provider (defaults to the empty stub).
 * @returns The mount container.
 */
function mountPanel(http: HttpClient, provider: ChatProvider = buildChatProvider()): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={http}>
          <ChatContext.Provider value={provider}>
            <ChatPanel projectId={PROJECT_ID} />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  return container
}

/**
 * Submits a slash command through the real composer.
 *
 * @param container - The mount container.
 * @param text - The exact command text.
 */
function submitCommand(container: HTMLElement, text: string): void {
  const input = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')
  if (!input) throw new Error('composer input not found')
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
}

describe('ChatPanel auto-commit cadence persistence (SYN3)', () => {
  it('hydrates the saved cadence on load — shown in /settings; nothing on a clean tree', async () => {
    const container = mountPanel(buildHttpClient({ autoCommitSeconds: 30 }))

    const settingsButton = await vi.waitFor(() => {
      const element = container.querySelector<HTMLElement>('[data-mol-id="chat-settings-button"]')
      expect(element, 'the settings button must render').not.toBeNull()
      return element as HTMLElement
    })
    settingsButton.click()

    await vi.waitFor(() => {
      const row = container.querySelector('[data-mol-id="setting-row-autoCommit"]')
      expect(row, 'the /settings auto-commit row must render').not.toBeNull()
      expect(row?.textContent).toContain('Every 30s')
    })
    // No pending files (the git-status GET rejects) → no commit bar, no button.
    expect(container.querySelector('[data-mol-id="chat-autocommit-badge"]')).toBeNull()
    // The hydrated cadence is NOT echoed back as a spurious PATCH.
    expect(patchSpy).not.toHaveBeenCalled()
  })

  it('is ON by default when no cadence was ever saved — paused (no badge), no spurious PATCH', async () => {
    const container = mountPanel(buildHttpClient({}))

    const settingsButton = await vi.waitFor(() => {
      const element = container.querySelector<HTMLElement>('[data-mol-id="chat-settings-button"]')
      expect(element, 'the settings button must render').not.toBeNull()
      return element as HTMLElement
    })
    settingsButton.click()

    await vi.waitFor(() => {
      const row = container.querySelector('[data-mol-id="setting-row-autoCommit"]')
      expect(row, 'the /settings auto-commit row must render').not.toBeNull()
      expect(row?.textContent).toContain(`Every ${DEFAULT_AUTO_COMMIT_SECONDS}s`)
    })
    expect(container.querySelector('[data-mol-id="chat-autocommit-badge"]')).toBeNull()
    expect(patchSpy).not.toHaveBeenCalled()
  })

  it('respects an explicit off (autoCommitSeconds: 0) — never re-defaulted to on', async () => {
    const container = mountPanel(buildHttpClient({ autoCommitSeconds: 0 }))

    const settingsButton = await vi.waitFor(() => {
      const element = container.querySelector<HTMLElement>('[data-mol-id="chat-settings-button"]')
      expect(element, 'the settings button must render').not.toBeNull()
      return element as HTMLElement
    })
    settingsButton.click()

    await vi.waitFor(() => {
      const row = container.querySelector('[data-mol-id="setting-row-autoCommit"]')
      expect(row, 'the /settings auto-commit row must render').not.toBeNull()
      expect(row?.textContent).toContain('Off')
    })
    expect(container.querySelector('[data-mol-id="chat-autocommit-badge"]')).toBeNull()
    expect(patchSpy).not.toHaveBeenCalled()
  })

  it('debounce-PATCHes settings.autoCommitSeconds when the cadence changes (explicit off → /autocommit 30)', async () => {
    const container = mountPanel(buildHttpClient({ autoCommitSeconds: 0 }))

    await vi.waitFor(() => {
      expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull()
    })
    expect(container.querySelector('[data-mol-id="chat-autocommit-badge"]')).toBeNull()

    submitCommand(container, '/autocommit 30')

    await vi.waitFor(
      () => {
        expect(patchSpy).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`, {
          settings: { autoCommitSeconds: 30 },
        })
      },
      { timeout: 2000 },
    )
    // The only PATCH is the change — the explicit off (0) was never echoed.
    expect(patchSpy).toHaveBeenCalledTimes(1)
  })
})

describe('ChatPanel auto-commit hold — commits only once the turn is finished', () => {
  it(
    'holds a due 1s countdown while a turn is streaming, then fires /commit when it completes',
    { timeout: 15_000 },
    async () => {
      // A provider whose sendMessage hangs until the test releases it — while
      // pending, the session keeps isLoading true (the agent is mid-turn).
      let releaseTurn: () => void = () => {}
      const turnDone = new Promise<void>((resolve) => {
        releaseTurn = resolve
      })
      let turnStarted = false
      const provider: ChatProvider = {
        name: 'stub',
        sendMessage: async (
          _message: string,
          _config: ChatConfig,
          onEvent: (event: ChatStreamEvent) => void,
        ): Promise<void> => {
          turnStarted = true
          await turnDone
          onEvent({ type: 'done' })
        },
        abort: (): void => {},
        clearHistory: async (): Promise<void> => {},
        loadHistory: async (): Promise<ChatMessage[]> => [],
      }

      const commitSpy = vi.fn<
        (url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<never>>
      >(async () => responseOf({ ok: true, committed: true, message: 'auto', files: ['src/x.ts'] }))

      const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
      const http: HttpClient = {
        baseURL: '',
        defaultHeaders: {},
        request: reject,
        get: async (url: string): Promise<HttpResponse<never>> => {
          if (url === `/projects/${PROJECT_ID}`)
            return responseOf({ settings: { autoCommitSeconds: 1 } })
          if (url === `/projects/${PROJECT_ID}/git-status`)
            return responseOf({ files: [{ path: 'src/x.ts', status: 'M' }] })
          return reject()
        },
        post: async (url: string, data?: unknown) => commitSpy(url, data),
        put: reject,
        patch: async () => responseOf({}),
        delete: reject,
        addRequestInterceptor: () => () => {},
        addResponseInterceptor: () => () => {},
        addErrorInterceptor: () => () => {},
        setAuthToken: () => {},
        getAuthToken: () => null,
        onAuthError: () => () => {},
      }

      const [tick, setTick] = createSignal(0)
      mounted.dispose?.()
      document.body.innerHTML = ''
      const container = document.createElement('div')
      document.body.appendChild(container)
      mounted.dispose = render(
        () => (
          <ThemeContext.Provider value={buildThemeProvider()}>
            <HttpContext.Provider value={http}>
              <ChatContext.Provider value={provider}>
                <ChatPanel projectId={PROJECT_ID} gitStatusTick={tick()} />
              </ChatContext.Provider>
            </HttpContext.Provider>
          </ThemeContext.Provider>
        ),
        container,
      )

      await vi.waitFor(() => {
        expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull()
      })

      // Start a turn (the provider hangs → isLoading stays true)…
      submitCommand(container, 'add a widget')
      await vi.waitFor(() => {
        expect(turnStarted, 'the stub turn must actually start streaming').toBe(true)
      })
      // …then signal a file mutation: the countdown arms at 1s but is HELD.
      setTick(1)

      // The bar and its green button render LIVE mid-turn…
      const midTurnBadge = await vi.waitFor(() => {
        const element = container.querySelector<HTMLButtonElement>(
          '[data-mol-id="chat-autocommit-badge"]',
        )
        expect(element, 'the commit bar + auto-commit button must render mid-turn').not.toBeNull()
        return element as HTMLButtonElement
      })
      // …but the button is DISABLED while the turn streams, and clicking it must
      // NOT fire a commit.
      expect(midTurnBadge.disabled, 'the commit button must be disabled mid-turn').toBe(true)
      midTurnBadge.click()
      await new Promise((resolve) => setTimeout(resolve, 2500))
      expect(commitSpy).not.toHaveBeenCalled()

      // Finish the turn: the hold clears, the countdown resumes, /commit fires.
      releaseTurn()
      await vi.waitFor(
        () => {
          expect(commitSpy).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/commit`, undefined)
        },
        { timeout: 6000 },
      )
      expect(commitSpy).toHaveBeenCalledTimes(1)
    },
  )
})
