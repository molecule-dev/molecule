// @vitest-environment jsdom
/**
 * One commit, one card — plus the commit bar's reconcile, no-op and hold rules.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.commit-card-dedupe.test.tsx`
 * with the same test names and the same assertions: a stale restored count is
 * reconciled when Git has no changes, a busy commit keeps the real count and
 * explains itself (also in German), returning to the workspace refreshes Git,
 * an older status response cannot restore an obsolete count, `/commit` shares
 * the no-op feedback and reconciliation, the live auto-commit countdown rides
 * the counted action, and a commit renders once after a history reload brings
 * in its persisted record.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { de, en } from '@molecule/app-locales-ide'
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

const SUBJECT = 'feat: add login page'
const FULL_MESSAGE = `${SUBJECT}\n\nCo-authored-by: Synthase <synthase@molecule.dev>`
const HASH = 'abc1234'
const PROJECT_ID = 'proj-commit'

/** Whether the server has persisted the commit record yet. */
let committed = false
let pendingPaths = ['src/Login.tsx']
let autoCommitSeconds = 0
let locale = 'en'
const commitRequest =
  vi.fn<(url: string, data?: unknown, config?: RequestConfig) => Promise<HttpResponse<never>>>()
let delayCommit = false
let releaseCommit: (() => void) | undefined
let delayNextStatus = false
let releaseStatus: (() => void) | undefined
let commitOutcome: 'success' | 'clean' | 'busy' = 'success'
const gitStatusRequest = vi.fn<(url: string) => void>()

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

/** A provider whose history gains the persisted commit record once it lands. */
function buildChatProvider(onLoadHistory: () => void): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => {
      onLoadHistory()
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
  const get = (url: string): Promise<HttpResponse<never>> => {
    if (url.endsWith('/git-status')) {
      gitStatusRequest(url)
      const response = responseOf({
        files: committed ? [] : pendingPaths.map((path) => ({ path, status: 'M' })),
      })
      if (delayNextStatus) {
        delayNextStatus = false
        return new Promise((resolve) => {
          releaseStatus = () => resolve(response)
        })
      }
      return Promise.resolve(response)
    }
    if (url === `/projects/${PROJECT_ID}`)
      return Promise.resolve(responseOf({ settings: { autoCommitSeconds } }))
    return reject()
  }
  commitRequest.mockImplementation(async () => {
    if (delayCommit) {
      // The response is held until the test releases it — long enough for the
      // panel to have switched projects, so the reply is a late one.
      return new Promise((resolve) => {
        releaseCommit = () =>
          resolve(
            responseOf({
              ok: true,
              committed: commitOutcome === 'success',
              message: commitOutcome === 'success' ? FULL_MESSAGE : 'No changes to commit',
              files: ['src/Login.tsx'],
              hash: HASH,
            }),
          )
      })
    }
    if (commitOutcome !== 'success') {
      if (commitOutcome === 'clean') pendingPaths = []
      return responseOf({
        ok: true,
        committed: false,
        message: commitOutcome === 'clean' ? 'No changes to commit' : 'A build is in progress',
      })
    }
    committed = true
    return responseOf({
      ok: true,
      committed: true,
      message: FULL_MESSAGE,
      files: ['src/Login.tsx'],
      hash: HASH,
    })
  })
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get,
    post: commitRequest,
    put: reject,
    patch: async () => responseOf({}),
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  } as HttpClient
}

/** The mount alive right now, if any. */
const mounted: {
  dispose?: () => void
  setProps?: (next: Partial<PanelProps>) => void
} = {}

/** Every rendered commit card showing {@link SUBJECT}. */
function commitCards(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll('code')).filter(
    (element) => element.textContent === SUBJECT,
  )
}

/** Props the panel mounts with. */
interface PanelProps {
  projectId?: string
  onCommit?: () => void
  onLoadHistory?: () => void
  onFileDiff?: (path: string) => void
  canEdit?: boolean
  gitStatusTick?: () => number
}

beforeEach(() => {
  committed = false
  pendingPaths = ['src/Login.tsx']
  autoCommitSeconds = 0
  locale = 'en'
  commitRequest.mockReset()
  gitStatusRequest.mockClear()
  commitOutcome = 'success'
  delayNextStatus = false
  delayCommit = false
  releaseCommit = undefined
  releaseStatus = undefined
  setProvider(createSimpleI18nProvider('en', [{ code: 'en', name: 'English', translations: en }]))
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
  resetChatStoresForTests()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    },
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    },
    configurable: true,
    writable: true,
  })
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  releaseCommit?.()
  mounted.dispose?.()
  mounted.dispose = undefined
  mounted.setProps = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider('en', [{ code: 'en', name: 'English', translations: en }]))
})

/**
 * Mounts the real panel over the shared stubs.
 *
 * The props ride signals so {@link mounted.setProps} can change them on the
 * SAME component, as React's `rerender` does (a project switch keeps the
 * panel, and its in-flight requests, alive).
 *
 * @param props - Per-test props (project, callbacks, tick accessor).
 * @returns The mount container.
 */
function panel(props: PanelProps = {}): HTMLElement {
  const i18n = createSimpleI18nProvider(locale, [
    { code: 'en', name: 'English', translations: en },
    { code: 'de', name: 'Deutsch', translations: de },
  ])
  setProvider(i18n)
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const projectId = createSignal(props.projectId ?? PROJECT_ID)
  const canEdit = createSignal(props.canEdit)
  const onCommit = createSignal(props.onCommit)
  const onFileDiff = createSignal(props.onFileDiff)
  const onLoadHistory = createSignal(props.onLoadHistory)
  const gitStatusTick = createSignal(props.gitStatusTick)
  mounted.setProps = (next): void => {
    if ('projectId' in next && next.projectId !== undefined) projectId[1](next.projectId)
    if ('canEdit' in next) canEdit[1](next.canEdit)
    // A function value must ride an updater: Solid's setter CALLS a bare
    // function argument as an updater (`fn(previous)`) instead of storing it.
    if ('onCommit' in next) onCommit[1](() => next.onCommit)
    if ('onFileDiff' in next) onFileDiff[1](() => next.onFileDiff)
    if ('onLoadHistory' in next) onLoadHistory[1](() => next.onLoadHistory)
    if ('gitStatusTick' in next) gitStatusTick[1](() => next.gitStatusTick)
  }
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildHttpClient()}>
          <ChatContext.Provider value={buildChatProvider(() => onLoadHistory[0]()?.())}>
            <ChatPanel
              projectId={projectId[0]()}
              canEdit={canEdit[0]()}
              gitStatusTick={gitStatusTick[0]()?.()}
              onCommit={() => onCommit[0]()?.()}
              onFileDiff={(path) => onFileDiff[0]()?.(path)}
            />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  return container
}

/**
 * Types a message into the composer and submits it.
 *
 * @param container - The mount container.
 * @param text - The message text.
 */
function submit(container: HTMLElement, text: string): void {
  const input = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')
  if (!input) throw new Error('composer input not found')
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
}

describe('ChatPanel combined commit action', () => {
  it('reconciles a stale restored-workspace count when Git has no changes', async () => {
    pendingPaths = ['AGENTS.md', 'CLAUDE.md', '.agents/skills/config.md']
    commitOutcome = 'clean'
    const onCommit = vi.fn()
    const container = panel({ onCommit })
    const action = await vi.waitFor(() => {
      const button = container.querySelector<HTMLButtonElement>(
        '[data-mol-id="chat-commit-button"]',
      )
      expect(button?.textContent).toBe('Commit 3 files')
      return button as HTMLButtonElement
    })
    action.click()
    await vi.waitFor(() => expect(container.textContent).toContain('No changes to commit.'))
    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="chat-commit-bar"]')).toBeNull(),
    )
    expect(gitStatusRequest.mock.calls.length).toBeGreaterThan(1)
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(committed).toBe(false)
    expect(commitCards(container)).toHaveLength(0)
  })

  it('keeps actual pending files and explains a build-in-progress refusal', async () => {
    commitOutcome = 'busy'
    const container = panel()
    const action = await vi.waitFor(() => {
      const button = container.querySelector<HTMLButtonElement>(
        '[data-mol-id="chat-commit-button"]',
      )
      expect(button?.textContent).toBe('Commit 1 file')
      return button as HTMLButtonElement
    })
    action.click()
    await vi.waitFor(() =>
      expect(container.textContent).toContain(
        'Wait for the build to finish before creating a Git commit.',
      ),
    )
    expect(container.querySelector('[data-mol-id="chat-commit-button"]')?.textContent).toBe(
      'Commit 1 file',
    )
    expect(committed).toBe(false)
    expect(commitCards(container)).toHaveLength(0)
  })

  it('explains a busy commit using the actual German locale', async () => {
    locale = 'de'
    commitOutcome = 'busy'
    const container = panel()
    const action = await vi.waitFor(() => {
      const button = container.querySelector<HTMLButtonElement>(
        '[data-mol-id="chat-commit-button"]',
      )
      expect(button).not.toBeNull()
      return button as HTMLButtonElement
    })
    action.click()
    const explanation = de['ide.chat.commitBuildInProgress']
    expect(explanation).toBeTypeOf('string')
    await vi.waitFor(() => expect(container.textContent).toContain(explanation ?? ''))
    expect(container.textContent).not.toContain('Commit skipped:')
    expect(committed).toBe(false)
  })

  it('refreshes external Git changes when returning to the workspace', async () => {
    const container = panel()
    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="chat-commit-button"]')?.textContent).toBe(
        'Commit 1 file',
      ),
    )
    pendingPaths = []
    window.dispatchEvent(new Event('focus'))
    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="chat-commit-bar"]')).toBeNull(),
    )
  })

  it('settles startup Git changes without another click or file edit', async () => {
    vi.useFakeTimers()
    const container = panel()
    await vi.advanceTimersByTimeAsync(0)
    await Promise.resolve()
    expect(container.querySelector('[data-mol-id="chat-commit-button"]')?.textContent).toBe(
      'Commit 1 file',
    )
    pendingPaths = []
    await vi.advanceTimersByTimeAsync(45_000)
    expect(container.querySelector('[data-mol-id="chat-commit-bar"]')).toBeNull()
  })

  it('does not let an older Git response restore an obsolete count', async () => {
    const container = panel()
    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="chat-commit-button"]')?.textContent).toBe(
        'Commit 1 file',
      ),
    )
    delayNextStatus = true
    window.dispatchEvent(new Event('focus'))
    expect(releaseStatus).toBeTypeOf('function')
    pendingPaths = []
    window.dispatchEvent(new Event('focus'))
    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="chat-commit-bar"]')).toBeNull(),
    )
    releaseStatus?.()
    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="chat-commit-bar"]')).toBeNull(),
    )
  })

  it('uses the same no-op feedback and reconciliation for /commit', async () => {
    commitOutcome = 'clean'
    const container = panel()
    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="chat-commit-button"]')?.textContent).toBe(
        'Commit 1 file',
      ),
    )
    submit(container, '/commit')
    await vi.waitFor(() => expect(container.textContent).toContain('No changes to commit.'))
    await vi.waitFor(() =>
      expect(container.querySelector('[data-mol-id="chat-commit-bar"]')).toBeNull(),
    )
    expect(commitRequest).toHaveBeenCalledTimes(1)
  })

  it('puts the live auto-commit countdown in the counted action', async () => {
    autoCommitSeconds = 3
    pendingPaths = ['src/Login.tsx', 'src/Profile.tsx']
    const [tick, setTick] = createSignal(0)
    const container = panel({ gitStatusTick: tick })
    await vi.waitFor(() => {
      expect(container.querySelector('[data-mol-id="chat-autocommit-badge"]')?.textContent).toBe(
        'Commit 2 files',
      )
    })
    setTick(1)
    await vi.waitFor(() => {
      const bar = container.querySelector('[data-mol-id="chat-commit-bar"]')
      expect(bar?.textContent).toMatch(/^Commit 2 files in [123]s$/)
    })
    container.querySelector<HTMLElement>('[data-mol-id="chat-autocommit-badge"]')?.click()
    await vi.waitFor(() => expect(commitRequest).toHaveBeenCalledTimes(1))
  })

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
      const onFileDiff = vi.fn<(path: string) => void>()
      const container = panel({ onFileDiff })
      const action = await vi.waitFor(() => {
        const button = container.querySelector<HTMLButtonElement>(
          `[data-mol-id="${cadence ? 'chat-autocommit-badge' : 'chat-commit-button'}"]`,
        )
        expect(button?.textContent).toBe(label)
        return button as HTMLButtonElement
      })
      const bar = container.querySelector('[data-mol-id="chat-commit-bar"]') as HTMLElement
      expect(bar.textContent).toBe(label)
      expect(bar.textContent).not.toContain('uncommitted')
      const disclosure = bar.querySelector('[data-mol-id="chat-commit-toggle"]') as HTMLElement
      expect(disclosure.getAttribute('aria-label')).toBe('Show changed files')
      expect(disclosure.getAttribute('title')).toBe('Show changed files')
      disclosure.click()
      container.querySelector<HTMLElement>('[data-mol-id="chat-commit-bar-detail"] button')!.click()
      expect(onFileDiff).toHaveBeenCalledWith(paths[0])
      expect(commitRequest).not.toHaveBeenCalled()
      action.click()
      await vi.waitFor(() => expect(commitRequest).toHaveBeenCalledTimes(1))
      expect(commitRequest).toHaveBeenCalledWith('/projects/proj-commit/commit')
    },
  )

  it.each(['success', 'clean'] as const)(
    'ignores a late %s commit response after switching projects',
    async (outcome) => {
      delayCommit = true
      commitOutcome = outcome
      const onCommit = vi.fn()
      const container = panel({ onCommit })
      const action = await vi.waitFor(() => {
        const button = container.querySelector<HTMLButtonElement>(
          '[data-mol-id="chat-commit-button"]',
        )
        expect(button?.textContent).toBe('Commit 1 file')
        return button as HTMLButtonElement
      })
      action.click()
      expect(releaseCommit).toBeTypeOf('function')
      pendingPaths = ['other/one.ts', 'other/two.ts']
      mounted.setProps?.({ projectId: 'project-b', onCommit })
      await vi.waitFor(() =>
        expect(container.querySelector('[data-mol-id="chat-commit-button"]')?.textContent).toBe(
          'Commit 2 files',
        ),
      )
      expect(container.textContent).not.toContain('Committing')
      const statusReads = gitStatusRequest.mock.calls.length
      releaseCommit?.()
      // Flush the resolved commit's microtasks before asserting it changed nothing.
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(container.querySelector('[data-mol-id="chat-commit-button"]')?.textContent).toBe(
        'Commit 2 files',
      )
      expect(gitStatusRequest).toHaveBeenCalledTimes(statusReads)
      expect(onCommit).not.toHaveBeenCalled()
      expect(container.textContent).not.toContain('No changes to commit.')
      expect(commitCards(container)).toHaveLength(0)
    },
  )

  it.each(['clean', 'viewer'] as const)(
    'hides the combined action for a %s tree or role',
    async (state) => {
      if (state === 'clean') pendingPaths = []
      const container = panel({ canEdit: state !== 'viewer' })
      await vi.waitFor(() => expect(container.textContent).toContain('hi'))
      expect(container.querySelector('[data-mol-id="chat-commit-bar"]')).toBeNull()
    },
  )
})

describe('ChatPanel commit-card dedupe', () => {
  it('renders a commit once after a history reload brings in its persisted record', async () => {
    const onLoadHistory = vi.fn()
    const container = panel({ onLoadHistory })
    await vi.waitFor(() => expect(container.textContent).toContain('hi'))

    const input = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')
    expect(input).not.toBeNull()
    input!.value = '/commit'
    input!.dispatchEvent(new Event('input', { bubbles: true }))
    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    // The local card from the commit response.
    await vi.waitFor(() => expect(commitCards(container)).toHaveLength(1))

    // The network comes back → the chat reconciles against the server
    // transcript, which now carries the persisted record for the same commit.
    const loadsBefore = onLoadHistory.mock.calls.length
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(onLoadHistory.mock.calls.length).toBeGreaterThan(loadsBefore))
    await vi.waitFor(() => expect(container.textContent).not.toContain('Committing'))

    // The bug: the local card and the persisted record both rendered.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(commitCards(container)).toHaveLength(1)
  })
})
