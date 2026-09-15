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

import { fireEvent, render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
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
import type { TestList, TestRunEvent, TestSelection } from '../types.js'

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
  runTests?: (
    selection: TestSelection,
    onEvent: (e: TestRunEvent) => void,
  ) => { cancel: () => void }
  canRunTests?: boolean
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
