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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider, ChatStreamEvent } from '@molecule/app-ai-chat'
import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { DEFAULT_AUTO_COMMIT_SECONDS } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { resetChatStoresForTests } from '@molecule/app-vue'

import {
  buildChatProvider,
  makeStorage,
  mountPanel,
  type PanelMount,
  responseOf,
  submit,
} from './chat-panel-harness.js'

const PROJECT_ID = 'proj-syn3'

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

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

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
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the panel over the given HTTP stub.
 *
 * @param http - The HTTP client stub.
 * @param provider - The chat provider (defaults to an empty stub).
 * @param props - Extra panel props.
 * @returns The mount container.
 */
function mountChatPanel(
  http: HttpClient,
  provider: ChatProvider = buildChatProvider([]),
  props: { gitStatusTick?: number } = {},
): HTMLElement {
  mounted?.unmount()
  mounted = mountPanel({
    http,
    chat: provider,
    projectId: PROJECT_ID,
    props: { ...props },
  })
  return mounted.container
}

/**
 * Opens the `/settings` overlay from the panel's header button.
 *
 * @param container - The mount container.
 * @returns The auto-commit row once it renders.
 */
async function openSettingsAutoCommitRow(container: HTMLElement): Promise<HTMLElement> {
  const settingsButton = await vi.waitFor(() => {
    const element = container.querySelector<HTMLElement>('[data-mol-id="chat-settings-button"]')
    expect(element, 'the settings button must render').not.toBeNull()
    return element as HTMLElement
  })
  settingsButton.click()

  return vi.waitFor(() => {
    const row = container.querySelector<HTMLElement>('[data-mol-id="setting-row-autoCommit"]')
    expect(row, 'the /settings auto-commit row must render').not.toBeNull()
    return row as HTMLElement
  })
}

describe('ChatPanel auto-commit cadence persistence (SYN3)', () => {
  it('hydrates the saved cadence on load — shown in /settings; nothing on a clean tree', async () => {
    const container = mountChatPanel(buildHttpClient({ autoCommitSeconds: 30 }))

    const row = await openSettingsAutoCommitRow(container)
    expect(row.textContent).toContain('Every 30s')
    // No pending files (the git-status GET rejects) → no commit bar, no button.
    expect(container.querySelector('[data-mol-id="chat-autocommit-badge"]')).toBeNull()
    // The hydrated cadence is NOT echoed back as a spurious PATCH.
    expect(patchSpy).not.toHaveBeenCalled()
  })

  it('is ON by default when no cadence was ever saved — paused (no badge), no spurious PATCH', async () => {
    const container = mountChatPanel(buildHttpClient({}))

    const row = await openSettingsAutoCommitRow(container)
    expect(row.textContent).toContain(`Every ${DEFAULT_AUTO_COMMIT_SECONDS}s`)
    expect(container.querySelector('[data-mol-id="chat-autocommit-badge"]')).toBeNull()
    expect(patchSpy).not.toHaveBeenCalled()
  })

  it('respects an explicit off (autoCommitSeconds: 0) — never re-defaulted to on', async () => {
    const container = mountChatPanel(buildHttpClient({ autoCommitSeconds: 0 }))

    const row = await openSettingsAutoCommitRow(container)
    expect(row.textContent).toContain('Off')
    expect(container.querySelector('[data-mol-id="chat-autocommit-badge"]')).toBeNull()
    expect(patchSpy).not.toHaveBeenCalled()
  })

  it('debounce-PATCHes settings.autoCommitSeconds when the cadence changes (explicit off → /autocommit 30)', async () => {
    const container = mountChatPanel(buildHttpClient({ autoCommitSeconds: 0 }))

    await vi.waitFor(() => {
      expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull()
    })
    expect(container.querySelector('[data-mol-id="chat-autocommit-badge"]')).toBeNull()

    submit(container, '/autocommit 30')

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

      const container = mountChatPanel(http, provider, { gitStatusTick: 0 })

      await vi.waitFor(() => {
        expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull()
      })

      // Start a turn (the provider hangs → isLoading stays true)…
      submit(container, 'add a widget')
      await vi.waitFor(() => {
        expect(turnStarted, 'the stub turn must actually start streaming').toBe(true)
      })
      // …then signal a file mutation: the countdown arms at 1s but is HELD.
      if (mounted) mounted.props.gitStatusTick = 1

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
