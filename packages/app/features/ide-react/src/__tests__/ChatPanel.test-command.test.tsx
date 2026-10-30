// @vitest-environment jsdom

/**
 * `/test` must OPEN THE TESTS BROWSER, not spend an agent turn.
 *
 * It used to send a natural-language message ("Run the project test suite (npm
 * test) and report the results") and let Synthase read the output back — a whole
 * turn, and a model's paraphrase of a result the platform can produce directly.
 * This mounts the real {@link ChatPanel}, types `/test`, and asserts the browser
 * opened, the host's `listTests` was called, and NOTHING was sent to the chat.
 *
 * @module
 */

import { act, fireEvent, render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatEventHandler, ChatProvider } from '@molecule/app-ai-chat'
import type { AuthClient, AuthState, UserProfile } from '@molecule/app-auth'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import {
  AuthProvider,
  ChatProvider as ChatContextProvider,
  HttpProvider,
  I18nProvider,
  resetChatStoresForTests,
  ThemeProvider,
} from '@molecule/app-react'
import { lightTheme, type ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { COMMANDS } from '../command-metadata.js'
import { ChatPanel } from '../components/ChatPanel.js'
import type {
  ChatPanelProps,
  TestList,
  TestRunEvent,
  TestRunFeedEvent,
  TestSelection,
} from '../types.js'

const PROJECT_ID = 'proj-test-command'

const LIST: TestList = {
  tests: [
    {
      id: 'my-app/app:e2e/home.spec.ts',
      file: 'e2e/home.spec.ts',
      kind: 'e2e',
      workspace: 'my-app/app',
      workspaceLabel: 'my-app/app',
      title: 'home',
    },
    {
      id: 'my-app/api:src/routes.test.ts',
      file: 'src/routes.test.ts',
      kind: 'unit',
      workspace: 'my-app/api',
      workspaceLabel: 'my-app/api',
      title: 'routes',
    },
  ],
  runners: {
    'my-app/app': { e2e: 'playwright', unit: null },
    'my-app/api': { e2e: null, unit: 'vitest' },
  },
}

const sent: string[] = []

/** A chat provider that records anything the panel tries to send. */
function buildChatProvider(): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (
      message: string,
      _config: ChatConfig,
      onEvent: ChatEventHandler,
    ): Promise<void> => {
      sent.push(message)
      onEvent({ type: 'done' })
    },
    loadHistory: async () => [],
  } as unknown as ChatProvider
}

/** Everything the mounted tree fetches rejects — each caller catches its own. */
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
  } as unknown as HttpClient
}

/** A signed-in user. */
function buildAuthClient(): AuthClient<UserProfile> {
  const user = { id: 'me', email: 'me@example.com' } as UserProfile
  const state: AuthState<UserProfile> = {
    status: 'authenticated',
    initialized: true,
    authenticated: true,
    user,
    loading: false,
    error: null,
  }
  const unsubscribe = (): void => {}
  const notImplemented = async (): Promise<never> => {
    throw new Error('not implemented in test')
  }
  return {
    getState: () => state,
    isAuthenticated: () => true,
    getUser: () => user,
    setUser: () => {},
    setAccessToken: () => {},
    getAccessToken: () => null,
    getRefreshToken: () => null,
    login: notImplemented,
    logout: async () => {},
    register: notImplemented,
    refresh: notImplemented,
    requestPasswordReset: async () => {},
    confirmPasswordReset: async () => {},
    updateProfile: notImplemented,
    changePassword: async () => {},
    initialize: async () => {},
    subscribe: () => unsubscribe,
    onAuthChange: () => unsubscribe,
    addEventListener: () => unsubscribe,
    destroy: () => {},
  } as unknown as AuthClient<UserProfile>
}

/** An in-memory Storage — ChatPanel reads both on mount. */
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

/** A minimal light theme provider so `useThemeMode` resolves. */
function buildThemeProvider(): ThemeProviderType {
  return {
    getTheme: () => lightTheme,
    getThemes: () => [lightTheme],
    setTheme: () => {},
    toggleMode: () => {},
    subscribe: () => () => {},
  }
}

/**
 * Mount the panel with the tests host callbacks wired.
 *
 * @param options - The recorded callbacks and gates.
 * @returns The element to render.
 */
function renderPanel(options: {
  listTests: () => Promise<TestList>
  runTests?: ChatPanelProps['runTests']
  canRunTests?: boolean
  watchTestRuns?: ChatPanelProps['watchTestRuns']
}): ReactElement {
  const wrap = (children: ReactNode): ReactElement => (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>
        <HttpProvider client={buildHttpClient()}>
          <AuthProvider client={buildAuthClient()}>
            <ChatContextProvider provider={buildChatProvider()}>{children}</ChatContextProvider>
          </AuthProvider>
        </HttpProvider>
      </ThemeProvider>
    </I18nProvider>
  )
  return wrap(
    <ChatPanel
      projectId={PROJECT_ID}
      listTests={options.listTests}
      runTests={options.runTests ?? (() => ({ cancel: () => {} }))}
      canRunTests={options.canRunTests ?? true}
      watchTestRuns={options.watchTestRuns}
      testsAvailable
    />,
  )
}

const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

/**
 * Type a command into the composer and submit it.
 *
 * @param container - The rendered container.
 * @param text - The command text.
 */
function submit(container: HTMLElement, text: string): void {
  const input = container.querySelector('textarea') as HTMLTextAreaElement
  fireEvent.change(input, { target: { value: text } })
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
}

beforeEach(() => {
  sent.length = 0
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
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

describe('the /test command', () => {
  it('lists tests and accepts run events after effects reconnect', async () => {
    let emit: (event: TestRunEvent) => void = () => {}
    const cancel = vi.fn()
    const listTests = vi.fn(async () => LIST)
    const runTests = vi.fn((_selection: TestSelection, onEvent: typeof emit) => {
      emit = onEvent
      return { cancel }
    })
    const { container, unmount } = render(
      <StrictMode>{renderPanel({ listTests, runTests })}</StrictMode>,
    )
    submit(container, '/test')
    await waitFor(() => expect(listTests).toHaveBeenCalled())
    expect(molId(container, 'tests-card')).not.toBeNull()
    const run = await waitFor(() => {
      const button = molId(container, 'tests-card-run-my-app/app:e2e/home.spec.ts')
      expect(button).not.toBeNull()
      return button!
    })
    fireEvent.click(run)
    expect(runTests).toHaveBeenCalledWith(
      { ids: ['my-app/app:e2e/home.spec.ts'] },
      expect.any(Function),
    )
    act(() => {
      emit({ type: 'start', runId: 'manual-run', ids: ['my-app/app:e2e/home.spec.ts'] })
      emit({
        type: 'result',
        id: 'my-app/app:e2e/home.spec.ts',
        status: 'passed',
        passed: 1,
        failed: 0,
        skipped: 0,
      })
      emit({ type: 'done', outcome: 'completed', passed: 1, failed: 0, skipped: 0 })
    })
    await waitFor(() => expect(molId(container, 'tests-card-running')).toBeNull())
    expect(molId(container, 'tests-card-summary')?.textContent).toContain('1 passed')
    fireEvent.click(molId(container, 'tests-card-run-my-app/app:e2e/home.spec.ts')!)
    unmount()
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it('opens the tests browser with one click on the not-run summary', async () => {
    const listTests = vi.fn(async () => LIST)
    const runTests = vi.fn(() => ({ cancel: () => {} }))
    const { container } = render(renderPanel({ listTests, runTests }))
    const summary = await waitFor(() => {
      const button = molId(container, 'tests-bar-toggle')
      expect(button?.textContent).toContain('not run yet')
      return button!
    })
    expect(molId(container, 'tests-card')).toBeNull()
    fireEvent.click(summary)
    await waitFor(() => expect(molId(container, 'tests-card')).not.toBeNull())
    expect(molId(container, 'tests-bar-open')).toBeNull()
    expect(molId(container, 'tests-bar-detail')).toBeNull()
    expect(runTests).not.toHaveBeenCalled()
    expect(sent).toEqual([])
  })

  it('is registered once, with its alias and the browser usage', () => {
    const defs = COMMANDS.filter((c) => c.id === 'test')
    expect(defs, 'exactly one /test command').toHaveLength(1)
    expect(defs[0]?.label).toBe('/test')
    expect(defs[0]?.aliases).toContain('tests')
    expect(defs[0]?.usage).toBe('/test [query | all]')
    // A viewer may read the listing; the card disables running for them.
    expect(defs[0]?.viewerSafe).toBe(true)
    // No second command was minted for the same job.
    expect(COMMANDS.filter((c) => c.id === 'tests')).toHaveLength(0)
  })

  it('opens the tests browser and sends NOTHING to the agent', async () => {
    const listTests = vi.fn(async () => LIST)
    const { container } = render(renderPanel({ listTests }))
    submit(container, '/test')

    await waitFor(() => {
      expect(molId(container, 'tests-card')).not.toBeNull()
    })
    expect(listTests).toHaveBeenCalled()
    // The old behaviour: a natural-language "run npm test" message to Synthase.
    expect(sent).toEqual([])
    expect(container.textContent).not.toContain('npm test')
  })

  it('says so, rather than spinning, for a host that wires no discovery', async () => {
    const wrap = (children: ReactNode): ReactElement => (
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ThemeProvider provider={buildThemeProvider()}>
          <HttpProvider client={buildHttpClient()}>
            <AuthProvider client={buildAuthClient()}>
              <ChatContextProvider provider={buildChatProvider()}>{children}</ChatContextProvider>
            </AuthProvider>
          </HttpProvider>
        </ThemeProvider>
      </I18nProvider>
    )
    const { container } = render(wrap(<ChatPanel projectId={PROJECT_ID} />))
    submit(container, '/test')
    await waitFor(() => {
      expect(molId(container, 'tests-card-error')).not.toBeNull()
    })
    expect(sent).toEqual([])
  })

  it('seeds the search from /test <query>', async () => {
    const { container } = render(renderPanel({ listTests: async () => LIST }))
    submit(container, '/test routes')
    await waitFor(() => {
      expect(molId(container, 'tests-card')).not.toBeNull()
    })
    expect((molId(container, 'tests-card-search') as HTMLInputElement).value).toBe('routes')
  })

  it('/tests is the same command, via the alias', async () => {
    const listTests = vi.fn(async () => LIST)
    const { container } = render(renderPanel({ listTests }))
    submit(container, '/tests')
    await waitFor(() => {
      expect(molId(container, 'tests-card')).not.toBeNull()
    })
    expect(sent).toEqual([])
  })

  it('/test all runs everything straight away', async () => {
    const selections: TestSelection[] = []
    const { container } = render(
      renderPanel({
        listTests: async () => LIST,
        runTests: (selection) => {
          selections.push(selection)
          return { cancel: () => {} }
        },
      }),
    )
    submit(container, '/test all')
    await waitFor(() => {
      expect(selections).toEqual([{ kind: 'all' }])
    })
    expect(molId(container, 'tests-card')).not.toBeNull()
    expect(sent).toEqual([])
  })

  it('re-running /test re-lists, and the run in flight survives it', async () => {
    const listTests = vi.fn(async () => LIST)
    let emit: (event: TestRunEvent) => void = () => {}
    const { container } = render(
      renderPanel({
        listTests,
        runTests: (_selection, onEvent) => {
          emit = onEvent
          return { cancel: () => {} }
        },
      }),
    )
    submit(container, '/test all')
    await waitFor(() => {
      expect(molId(container, 'tests-card')).not.toBeNull()
    })
    emit({ type: 'start', runId: 'r1', ids: ['my-app/app:e2e/home.spec.ts'] })
    await waitFor(() => {
      expect(molId(container, 'tests-card-running')).not.toBeNull()
    })

    const listCallsBefore = listTests.mock.calls.length
    submit(container, '/test')
    await waitFor(() => {
      expect(listTests.mock.calls.length).toBeGreaterThan(listCallsBefore)
    })
    // The run is still live — re-listing must not throw it away.
    expect(molId(container, 'tests-card-running')).not.toBeNull()

    emit({
      type: 'result',
      id: 'my-app/app:e2e/home.spec.ts',
      status: 'passed',
      passed: 1,
      failed: 0,
      skipped: 0,
    })
    emit({ type: 'done', outcome: 'completed', passed: 1, failed: 0, skipped: 0 })
    await waitFor(() => {
      expect(molId(container, 'tests-card-status-my-app/app:e2e/home.spec.ts')?.textContent).toBe(
        'Passed',
      )
    })
  })
})

describe('every test run in the project reaches the test view', () => {
  const ROUTES = 'my-app/api:src/routes.test.ts'
  const HOME = 'my-app/app:e2e/home.spec.ts'

  /** A host feed the test drives by hand; it records unsubscribes. */
  function fakeFeed(replay: TestRunFeedEvent[] = []): {
    watchTestRuns: NonNullable<ChatPanelProps['watchTestRuns']>
    emit: (event: TestRunFeedEvent) => void
    unsubscribed: () => number
  } {
    let listener: ((event: TestRunFeedEvent) => void) | null = null
    let unsubscribes = 0
    return {
      watchTestRuns: (onEvent) => {
        listener = onEvent
        for (const event of replay) onEvent(event)
        return () => {
          unsubscribes++
          listener = null
        }
      },
      emit: (event) => act(() => listener?.(event)),
      unsubscribed: () => unsubscribes,
    }
  }

  /** Open the browser and wait for its discovered rows. */
  async function openTests(container: HTMLElement): Promise<void> {
    submit(container, '/test')
    await waitFor(() => expect(molId(container, `tests-card-run-${HOME}`)).not.toBeNull())
  }

  it('a cancelled own run’s delayed done cannot cancel a finished watched run', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const cancel = vi.fn()
    const { container } = render(
      renderPanel({
        listTests: async () => LIST,
        watchTestRuns: feed.watchTestRuns,
        runTests: (_selection, onEvent) => {
          emit = onEvent
          return { cancel }
        },
      }),
    )
    await openTests(container)
    fireEvent.click(molId(container, `tests-card-run-${HOME}`)!)
    act(() => emit({ type: 'start', runId: 'own-1', ids: [HOME] }))
    feed.emit({ type: 'start', runId: 'agent-1', ids: [ROUTES], source: 'agent' })
    fireEvent.click(molId(container, 'tests-card-cancel')!)
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
    expect(molId(container, 'tests-card-cancel')).toBeNull()
    feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed' })
    feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed' })
    const completed = molId(container, 'tests-card-summary')?.textContent
    act(() => emit({ type: 'done', outcome: 'cancelled' }))
    expect(molId(container, 'tests-card-summary')?.textContent).toBe(completed)
    expect(molId(container, 'tests-card-cancelled')).toBeNull()
    expect(molId(container, `tests-card-status-${ROUTES}`)?.textContent).toBe('Passed')
    expect((molId(container, `tests-card-run-${HOME}`) as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(molId(container, 'panel-overlay-close')!)
    expect(molId(container, 'tests-bar')?.getAttribute('data-tests-tone')).toBe('passing')
  })

  it('late events from a stopped invocation cannot finish or take controls from the next own run', async () => {
    const emitters: Array<(event: TestRunEvent) => void> = []
    const cancels = [vi.fn(), vi.fn()]
    const skips = [vi.fn(), vi.fn()]
    const { container } = render(
      renderPanel({
        listTests: async () => LIST,
        runTests: (_selection, onEvent) => {
          const index = emitters.push(onEvent) - 1
          return { cancel: cancels[index], skipCurrent: skips[index] }
        },
      }),
    )
    await openTests(container)
    fireEvent.click(molId(container, `tests-card-run-${HOME}`)!)
    act(() => emitters[0]({ type: 'start', runId: 'own-1', ids: [HOME] }))
    fireEvent.click(molId(container, 'tests-card-cancel')!)
    fireEvent.click(molId(container, `tests-card-run-${ROUTES}`)!)
    act(() => {
      emitters[1]({ type: 'start', runId: 'own-2', ids: [ROUTES] })
      emitters[0]({ type: 'output', id: HOME, chunk: 'late old output' })
      emitters[0]({ type: 'result', id: HOME, status: 'skipped', skipped: 1 })
      emitters[0]({ type: 'done', outcome: 'cancelled' })
    })
    expect(molId(container, 'tests-card-running')).not.toBeNull()
    expect(molId(container, `tests-card-case-${HOME}`)).toBeNull()
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Skipped')
    fireEvent.click(molId(container, `tests-card-skip-${ROUTES}`)!)
    expect(skips[1]).toHaveBeenCalledTimes(1)
    expect(skips[0]).not.toHaveBeenCalled()
    fireEvent.click(molId(container, 'tests-card-cancel')!)
    expect(cancels[0]).toHaveBeenCalledTimes(1)
    expect(cancels[1]).toHaveBeenCalledTimes(1)
  })

  it('keeps a newer outside verdict for a file the own run already finished', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const { container } = render(
      renderPanel({
        listTests: async () => LIST,
        watchTestRuns: feed.watchTestRuns,
        runTests: (_selection, onEvent) => {
          emit = onEvent
          return { cancel: () => {} }
        },
      }),
    )
    await openTests(container)
    fireEvent.click(molId(container, 'tests-card-run-all')!)
    act(() => {
      emit({ type: 'start', runId: 'own-1', ids: [HOME, ROUTES] })
      emit({ type: 'result', id: HOME, status: 'failed', output: 'old failure' })
      emit({ type: 'output', id: ROUTES, chunk: 'still running' })
    })
    feed.emit({ type: 'start', runId: 'platform-1', ids: [HOME], source: 'platform' })
    feed.emit({ type: 'result', runId: 'platform-1', id: HOME, status: 'passed' })
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
    expect(molId(container, 'tests-card-cancel')).not.toBeNull()
    feed.emit({ type: 'result', runId: 'platform-1', id: ROUTES, status: 'failed' })
    expect(molId(container, `tests-card-status-${ROUTES}`)?.textContent).toBe('Running…')
    feed.emit({ type: 'done', runId: 'platform-1', outcome: 'completed' })
    act(() => {
      emit({ type: 'result', id: ROUTES, status: 'passed' })
      emit({ type: 'done', outcome: 'completed' })
    })
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
    expect(molId(container, 'tests-card-summary')?.textContent).toContain('2 passed')
    expect(molId(container, `tests-card-fix-${HOME}`)).toBeNull()
    fireEvent.click(molId(container, 'panel-overlay-close')!)
    expect(molId(container, 'tests-bar')?.getAttribute('data-tests-tone')).toBe('passing')
  })

  it('keeps a completed watched run’s verdict when the displayed run ends without one', async () => {
    const feed = fakeFeed()
    const { container } = render(
      renderPanel({ listTests: async () => LIST, watchTestRuns: feed.watchTestRuns }),
    )
    await openTests(container)
    feed.emit({ type: 'start', runId: 'agent-a', ids: [HOME], source: 'agent' })
    feed.emit({ type: 'start', runId: 'platform-b', ids: [HOME], source: 'platform' })
    feed.emit({ type: 'result', runId: 'platform-b', id: HOME, status: 'passed', passed: 1 })
    feed.emit({ type: 'done', runId: 'platform-b', outcome: 'completed' })
    // B's verdict must not paint a file that A still owes, but must survive A.
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Running…')
    feed.emit({ type: 'done', runId: 'agent-a', outcome: 'cancelled' })
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
    expect((molId(container, `tests-card-run-${HOME}`) as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows both live discovered files instead of inherited verdicts when a watched run names no ids', async () => {
    const feed = fakeFeed([
      { type: 'start', runId: 'previous', ids: [HOME, ROUTES], source: 'platform' },
      { type: 'result', runId: 'previous', id: HOME, status: 'passed' },
      { type: 'result', runId: 'previous', id: ROUTES, status: 'failed' },
      { type: 'done', runId: 'previous', outcome: 'completed' },
    ])
    const { container } = render(
      renderPanel({ listTests: async () => LIST, watchTestRuns: feed.watchTestRuns }),
    )
    await openTests(container)
    feed.emit({ type: 'start', runId: 'agent-1', ids: [], source: 'agent' })
    feed.emit({ type: 'case', runId: 'agent-1', id: HOME, title: 'opens home', status: 'running' })
    feed.emit({
      type: 'case',
      runId: 'agent-1',
      id: ROUTES,
      title: 'serves routes',
      status: 'running',
    })
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Running…')
    expect(molId(container, `tests-card-case-title-${HOME}`)?.textContent).toBe('opens home')
    expect(molId(container, `tests-card-status-${ROUTES}`)?.textContent).toBe('Running…')
    feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed' })
    expect(molId(container, `tests-card-status-${ROUTES}`)?.textContent).toBe('Passed')
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Running…')
    feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed' })
    expect((molId(container, `tests-card-run-${HOME}`) as HTMLButtonElement).disabled).toBe(false)
  })

  it('hands a failed own start to a synchronously buffered live outside run and prunes ended runs', async () => {
    const feed = fakeFeed()
    const runTests = vi.fn(() => {
      feed.emit({ type: 'start', runId: 'ended', ids: [HOME], source: 'platform' })
      feed.emit({ type: 'result', runId: 'ended', id: HOME, status: 'failed' })
      feed.emit({ type: 'done', runId: 'ended', outcome: 'completed' })
      feed.emit({ type: 'start', runId: 'agent-1', ids: [ROUTES], source: 'agent' })
      throw new Error('own start failed')
    })
    const { container } = render(
      renderPanel({ listTests: async () => LIST, runTests, watchTestRuns: feed.watchTestRuns }),
    )
    await openTests(container)
    fireEvent.click(molId(container, `tests-card-run-${HOME}`)!)
    expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
    expect(molId(container, 'tests-card-cancel')).toBeNull()
    expect((molId(container, `tests-card-run-${HOME}`) as HTMLButtonElement).disabled).toBe(true)
    submit(container, '/test all')
    await act(async () => {})
    expect(runTests).toHaveBeenCalledTimes(1)
    feed.emit({ type: 'result', runId: 'agent-1', id: HOME, status: 'passed' })
    feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed' })
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
    // A pruned run can receive a trailing done, but must not replay its old failure.
    feed.emit({ type: 'done', runId: 'ended', outcome: 'completed' })
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
  })

  it('does not install a completed own run’s returned handle onto a watched run', async () => {
    const feed = fakeFeed()
    const cancel = vi.fn()
    const skipCurrent = vi.fn()
    const { container, unmount } = render(
      renderPanel({
        listTests: async () => LIST,
        watchTestRuns: feed.watchTestRuns,
        runTests: (_selection, onEvent) => {
          onEvent({ type: 'start', runId: 'own-1', ids: [HOME] })
          feed.emit({ type: 'start', runId: 'agent-1', ids: [ROUTES], source: 'agent' })
          onEvent({ type: 'result', id: HOME, status: 'passed' })
          onEvent({ type: 'done', outcome: 'completed' })
          return { cancel, skipCurrent }
        },
      }),
    )
    await openTests(container)
    fireEvent.click(molId(container, `tests-card-run-${HOME}`)!)
    expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
    expect(molId(container, `tests-card-skip-${ROUTES}`)).toBeNull()
    expect(molId(container, 'tests-card-cancel')).toBeNull()
    feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed' })
    feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed' })
    expect((molId(container, `tests-card-run-${HOME}`) as HTMLButtonElement).disabled).toBe(false)
    unmount()
    expect(cancel).not.toHaveBeenCalled()
    expect(skipCurrent).not.toHaveBeenCalled()
  })

  it('keeps an isolated start failure visible and lets the person retry, Skip, and Stop', async () => {
    let emit: (event: TestRunEvent) => void = () => {}
    const cancel = vi.fn()
    const skipCurrent = vi.fn()
    const runTests = vi
      .fn((_selection: TestSelection, onEvent: typeof emit) => {
        emit = onEvent
        return { cancel, skipCurrent }
      })
      .mockImplementationOnce(() => {
        throw new Error('own start failed')
      })
    const { container } = render(renderPanel({ listTests: async () => LIST, runTests }))
    await openTests(container)
    fireEvent.click(molId(container, 'tests-card-run-all')!)
    expect(molId(container, 'tests-card-run-error')?.textContent).toBe('own start failed')
    expect(molId(container, 'tests-card-running')).toBeNull()
    fireEvent.click(molId(container, 'tests-card-run-all')!)
    act(() => emit({ type: 'start', runId: 'retry', ids: [HOME, ROUTES] }))
    act(() => emit({ type: 'case', id: HOME, title: 'opens home', status: 'running' }))
    fireEvent.click(molId(container, `tests-card-skip-${HOME}`)!)
    expect(skipCurrent).toHaveBeenCalledTimes(1)
    expect(molId(container, `tests-card-skip-${HOME}`)?.textContent).toBe('Skipping…')
    act(() => {
      emit({ type: 'result', id: HOME, status: 'skipped', skipped: 1 })
      emit({ type: 'case', id: ROUTES, title: 'serves routes', status: 'running' })
    })
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Skipped')
    expect(molId(container, `tests-card-skip-${ROUTES}`)?.textContent).toBe('Skip')
    fireEvent.click(molId(container, 'tests-card-cancel')!)
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(molId(container, 'tests-card-cancelled')?.textContent).toBe('Run stopped.')
  })

  it('a synchronous cancel callback cannot overwrite the watched run handed the card', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const cancel = vi.fn(() => emit({ type: 'done', outcome: 'cancelled' }))
    const { container } = render(
      renderPanel({
        listTests: async () => LIST,
        watchTestRuns: feed.watchTestRuns,
        runTests: (_selection, onEvent) => {
          emit = onEvent
          return { cancel }
        },
      }),
    )
    await openTests(container)
    fireEvent.click(molId(container, `tests-card-run-${HOME}`)!)
    act(() => emit({ type: 'start', runId: 'own-1', ids: [HOME] }))
    feed.emit({ type: 'start', runId: 'agent-1', ids: [ROUTES], source: 'agent' })
    fireEvent.click(molId(container, 'tests-card-cancel')!)
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
    expect(molId(container, 'tests-card-cancel')).toBeNull()
    feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed' })
    expect(molId(container, 'tests-card-cancelled')).toBeNull()
  })

  it('a previous invocation’s delayed Skip refusal cannot disable Skip on the next own run', async () => {
    const emitters: Array<(event: TestRunEvent) => void> = []
    let refuseSkip: (accepted: boolean) => void = () => {}
    const skipped = new Promise<boolean>((resolve) => {
      refuseSkip = resolve
    })
    const skipCurrent = vi.fn(() => skipped)
    const { container } = render(
      renderPanel({
        listTests: async () => LIST,
        runTests: (_selection, onEvent) => {
          emitters.push(onEvent)
          return { cancel: () => {}, skipCurrent }
        },
      }),
    )
    await openTests(container)
    fireEvent.click(molId(container, `tests-card-run-${HOME}`)!)
    act(() => emitters[0]({ type: 'start', runId: 'own-1', ids: [HOME] }))
    fireEvent.click(molId(container, `tests-card-skip-${HOME}`)!)
    fireEvent.click(molId(container, 'tests-card-cancel')!)
    fireEvent.click(molId(container, `tests-card-run-${ROUTES}`)!)
    act(() => emitters[1]({ type: 'start', runId: 'own-2', ids: [ROUTES] }))
    await act(async () => {
      refuseSkip(false)
      await skipped
    })
    expect(molId(container, `tests-card-skip-${ROUTES}`)?.textContent).toBe('Skip')
  })

  it('shows a run the agent started, says who started it, and offers no Stop', async () => {
    const feed = fakeFeed()
    const listTests = vi.fn(async () => LIST)
    const { container } = render(renderPanel({ listTests, watchTestRuns: feed.watchTestRuns }))
    await waitFor(() => expect(molId(container, 'tests-bar-toggle')).not.toBeNull())
    feed.emit({
      type: 'start',
      runId: 'agent-1',
      ids: [],
      source: 'agent',
      command: 'cd api && npx vitest run src/routes.test.ts',
    })
    feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed', passed: 4 })
    await waitFor(() =>
      expect(molId(container, 'tests-bar-toggle')?.textContent).toContain('is running tests'),
    )
    expect(molId(container, 'tests-bar-stop')).toBeNull()
    fireEvent.click(molId(container, 'tests-bar-toggle')!)
    await waitFor(() => expect(molId(container, 'tests-card')).not.toBeNull())
    expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
    expect(molId(container, 'tests-card-command')?.textContent).toBe(
      'cd api && npx vitest run src/routes.test.ts',
    )
    expect(molId(container, 'tests-card-cancel')).toBeNull()
    // Nothing to start while it runs.
    expect((molId(container, `tests-card-run-${HOME}`) as HTMLButtonElement).disabled).toBe(true)
    const listedBefore = listTests.mock.calls.length
    feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed', passed: 4 })
    await waitFor(() => expect(molId(container, 'tests-card-running')).toBeNull())
    expect(molId(container, 'tests-card-summary')?.textContent).toContain('1 passed')
    expect((molId(container, `tests-card-run-${HOME}`) as HTMLButtonElement).disabled).toBe(false)
    // An ended run may have followed a newly written spec: the list is refreshed.
    await waitFor(() => expect(listTests.mock.calls.length).toBeGreaterThan(listedBefore))
    expect(sent).toEqual([])
  })

  it('shows the runs the host replays on subscribe', async () => {
    const feed = fakeFeed([
      { type: 'start', runId: 'platform-1', ids: [ROUTES], source: 'platform' },
      { type: 'result', runId: 'platform-1', id: ROUTES, status: 'failed', failed: 1 },
      { type: 'done', runId: 'platform-1', outcome: 'completed', failed: 1 },
    ])
    const { container } = render(
      renderPanel({ listTests: vi.fn(async () => LIST), watchTestRuns: feed.watchTestRuns }),
    )
    await waitFor(() =>
      expect(molId(container, 'tests-bar-toggle')?.textContent).toContain('1 failing'),
    )
  })

  it('ignores the feed’s copy of its own run, even when the copy arrives first', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const cancel = vi.fn()
    const runTests = vi.fn((_selection: TestSelection, onEvent: typeof emit) => {
      emit = onEvent
      return { cancel }
    })
    const { container } = render(
      renderPanel({
        listTests: vi.fn(async () => LIST),
        runTests,
        watchTestRuns: feed.watchTestRuns,
      }),
    )
    submit(container, '/test')
    const run = await waitFor(() => {
      const button = molId(container, `tests-card-run-${HOME}`)
      expect(button).not.toBeNull()
      return button!
    })
    fireEvent.click(run)
    // The echo of this very run reaches the panel before its own stream does.
    feed.emit({ type: 'start', runId: 'own-1', ids: [HOME], source: 'person' })
    act(() => emit({ type: 'start', runId: 'own-1', ids: [HOME] }))
    feed.emit({ type: 'result', runId: 'own-1', id: HOME, status: 'failed', failed: 1 })
    act(() => {
      emit({ type: 'result', id: HOME, status: 'passed', passed: 1 })
      emit({ type: 'done', outcome: 'completed', passed: 1 })
    })
    feed.emit({ type: 'done', runId: 'own-1', outcome: 'completed', failed: 1 })
    await waitFor(() => expect(molId(container, 'tests-card-running')).toBeNull())
    expect(molId(container, 'tests-card-summary')?.textContent).toContain('1 passed')
    expect(molId(container, 'tests-card-summary')?.textContent).not.toContain('failed')
  })

  it('bounds own-run ids when no feed echo arrives but still suppresses recent echoes', async () => {
    const feed = fakeFeed()
    const emitters: Array<(event: TestRunEvent) => void> = []
    const { container } = render(
      renderPanel({
        listTests: async () => LIST,
        watchTestRuns: feed.watchTestRuns,
        runTests: (_selection, onEvent) => {
          emitters.push(onEvent)
          return { cancel: () => {} }
        },
      }),
    )
    await openTests(container)
    // The panel retains 32 recent ids as a delayed-echo guard, not every run
    // for its whole lifetime. None of these runs receives a feed echo.
    for (let index = 0; index < 33; index += 1) {
      fireEvent.click(molId(container, `tests-card-run-${HOME}`)!)
      act(() => {
        emitters[index]!({ type: 'start', runId: `own-${index}`, ids: [HOME] })
        emitters[index]!({ type: 'result', id: HOME, status: 'passed', passed: 1 })
        emitters[index]!({ type: 'done', outcome: 'completed', passed: 1 })
      })
    }
    // The oldest id has been evicted, so a replay under that id is watchable.
    feed.emit({
      type: 'start',
      runId: 'own-0',
      ids: [HOME],
      source: 'platform',
      command: 'replayed oldest run',
    })
    expect(molId(container, 'tests-card-command')?.textContent).toBe('replayed oldest run')
    // The newest own run remains guarded against its delayed feed copy.
    feed.emit({ type: 'result', runId: 'own-32', id: HOME, status: 'failed', failed: 1 })
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Running…')
  })

  it('an agent run that starts during the person’s run waits for it, then takes the card', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const runTests = vi.fn((_selection: TestSelection, onEvent: typeof emit) => {
      emit = onEvent
      return { cancel: () => {} }
    })
    const { container } = render(
      renderPanel({
        listTests: vi.fn(async () => LIST),
        runTests,
        watchTestRuns: feed.watchTestRuns,
      }),
    )
    submit(container, '/test')
    fireEvent.click(
      await waitFor(() => {
        const button = molId(container, `tests-card-run-${HOME}`)
        expect(button).not.toBeNull()
        return button!
      }),
    )
    act(() => emit({ type: 'start', runId: 'own-1', ids: [HOME] }))
    feed.emit({ type: 'start', runId: 'agent-1', ids: [], source: 'agent' })
    feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed', passed: 2 })
    // The person's own run keeps the card, and its Stop.
    expect(molId(container, 'tests-card-running')?.textContent).not.toContain('is running tests')
    expect(molId(container, 'tests-card-cancel')).not.toBeNull()
    act(() => {
      emit({ type: 'result', id: HOME, status: 'passed', passed: 1 })
      emit({ type: 'done', outcome: 'completed', passed: 1 })
    })
    await waitFor(() =>
      expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests'),
    )
    expect(molId(container, 'tests-card-cancel')).toBeNull()
    feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed', passed: 2 })
    await waitFor(() => expect(molId(container, 'tests-card-running')).toBeNull())
    expect(molId(container, 'tests-card-summary')?.textContent).toContain('2 passed')
  })

  it('unsubscribes when the panel unmounts', async () => {
    const feed = fakeFeed()
    const { unmount } = render(
      renderPanel({ listTests: vi.fn(async () => LIST), watchTestRuns: feed.watchTestRuns }),
    )
    unmount()
    expect(feed.unsubscribed()).toBe(1)
  })
})
