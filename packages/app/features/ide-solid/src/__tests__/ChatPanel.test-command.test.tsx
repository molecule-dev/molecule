// @vitest-environment jsdom
/**
 * `/test` opens the TESTS BROWSER, not an agent turn — the Solid port of
 * `@molecule/app-ide-react/src/__tests__/ChatPanel.test-command.test.tsx`, with
 * the same test names and the same assertions.
 *
 * Real Solid mounts of {@link ChatPanel} driven through its own composer and a
 * hand-driven host feed: the browser opens and the host's `listTests` runs,
 * NOTHING is sent to the chat, and every run in the project — this panel's own,
 * the agent's, the platform's — reaches the same bar and browser with the same
 * ownership rules.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatEventHandler, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type {
  TestList,
  TestRunEvent,
  TestRunFeedEvent,
  TestRunHandle,
  TestSelection,
} from '@molecule/app-ide-panel-logic'
import { COMMANDS } from '@molecule/app-ide-panel-logic/command-metadata'
import { HttpContext, ThemeContext } from '@molecule/app-solid'
import { resetAIModelsCache } from '@molecule/app-solid/ai-models'
import { ChatContext, resetChatStoresForTests } from '@molecule/app-solid/chat'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel, type ChatPanelProps } from '../components/ChatPanel.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

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

/** Every message the panel tried to send to the agent. */
const sent: string[] = []

/**
 * A chat provider that records anything the panel tries to send.
 *
 * @returns The stub provider.
 */
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
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<never[]> => [],
  }
}

/** An HTTP client whose every request rejects; the mounted callers catch their own. */
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
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
  }
}

/** The mount alive right now, if any. */
const mounted: { dispose?: () => void } = {}

/** The element carrying one `data-mol-id`. */
const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

/**
 * Mounts {@link ChatPanel} inside the contexts it needs.
 *
 * @param options - The host callbacks and gates the test wires.
 * @param bare - Mount with only `projectId` (a host wiring no discovery).
 * @returns The mount container.
 */
function renderPanel(
  options: {
    listTests?: () => Promise<TestList>
    runTests?: ChatPanelProps['runTests']
    canRunTests?: boolean
    watchTestRuns?: ChatPanelProps['watchTestRuns']
    nativeTests?: ChatPanelProps['nativeTests']
  } = {},
  bare = false,
): HTMLElement {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const common = { projectId: PROJECT_ID }
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildHttpClient()}>
          <ChatContext.Provider value={buildChatProvider()}>
            {bare ? (
              <ChatPanel {...common} />
            ) : (
              <ChatPanel
                {...common}
                listTests={options.listTests}
                runTests={options.runTests ?? ((): TestRunHandle => ({ cancel: () => {} }))}
                canRunTests={options.canRunTests ?? true}
                watchTestRuns={options.watchTestRuns}
                nativeTests={options.nativeTests}
                testsAvailable
              />
            )}
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  return container.ownerDocument.body
}

/**
 * Type a command into the composer and submit it.
 *
 * @param container - The mounted container.
 * @param text - The command text.
 */
function submit(container: HTMLElement, text: string): void {
  const input = container.querySelector<HTMLTextAreaElement>('textarea')
  if (!input) throw new Error('composer input not mounted')
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
}

/**
 * Click an element, insisting it exists.
 *
 * @param element - The element to click.
 */
function click(element: HTMLElement | null): void {
  if (!element) throw new Error('element to click is not mounted')
  element.click()
}

beforeEach(() => {
  sent.length = 0
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(
    new Proxy(
      {},
      {
        get: (_target, name) => ({ paths: [{ d: `glyph:${String(name)}` }], viewBox: '0 0 16 16' }),
      },
    ),
  )
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

describe('the /test command', () => {
  it('opens durable host test history from its status strip for a viewer and retains it after remount', async () => {
    const listTests = vi.fn(async () => LIST)
    /**
     * The panel's host options, fresh per mount.
     * @returns The props the host wires.
     */
    const panel = (): {
      listTests: () => Promise<TestList>
      canRunTests: boolean
      nativeTests: NonNullable<ChatPanelProps['nativeTests']>
    } => ({
      listTests,
      canRunTests: false,
      nativeTests: {
        visible: true,
        history: (
          <section data-testid="durable-native-history">
            Native invocation · exit 0 · test results not recorded
          </section>
        ),
        renderStatus: (open) => (
          <button type="button" onClick={open}>
            Native test history
          </button>
        ),
      },
    })
    /**
     * The host's status button, once it renders.
     * @param container - The mounted container.
     * @returns The button.
     */
    const nativeButton = (container: HTMLElement): HTMLButtonElement => {
      const button = Array.from(container.querySelectorAll('button')).find(
        (candidate) => candidate.textContent === 'Native test history',
      )
      if (!button) throw new Error('native status button not mounted')
      return button
    }
    const first = renderPanel(panel())
    click(nativeButton(first))
    await vi.waitFor(() =>
      expect(
        first.querySelector('[data-testid="durable-native-history"]')?.textContent ?? '',
      ).toContain('test results not recorded'),
    )
    expect(sent).toEqual([])
    const second = renderPanel(panel())
    click(nativeButton(second))
    await vi.waitFor(() =>
      expect(
        second.querySelector('[data-testid="durable-native-history"]')?.textContent ?? '',
      ).toContain('exit 0'),
    )
  })

  it('lists tests and accepts run events after effects reconnect', async () => {
    let emit: (event: TestRunEvent) => void = () => {}
    const cancel = vi.fn()
    const listTests = vi.fn(async () => LIST)
    const runTests = vi.fn((_selection: TestSelection, onEvent: typeof emit): TestRunHandle => {
      emit = onEvent
      return { cancel }
    })
    const container = renderPanel({ listTests, runTests })
    submit(container, '/test')
    await vi.waitFor(() => expect(listTests).toHaveBeenCalled())
    expect(molId(container, 'tests-card')).not.toBeNull()
    const run = await vi.waitFor(() => {
      const button = molId(container, 'tests-card-run-my-app/app:e2e/home.spec.ts')
      expect(button).not.toBeNull()
      return button!
    })
    click(run)
    expect(runTests).toHaveBeenCalledWith(
      { ids: ['my-app/app:e2e/home.spec.ts'] },
      expect.any(Function),
    )
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
    await vi.waitFor(() => expect(molId(container, 'tests-card-running')).toBeNull())
    expect(molId(container, 'tests-card-summary')?.textContent).toContain('1 passed')
    click(molId(container, 'tests-card-run-my-app/app:e2e/home.spec.ts'))
    mounted.dispose?.()
    mounted.dispose = undefined
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it('opens the tests browser with one click on the not-run summary', async () => {
    const listTests = vi.fn(async () => LIST)
    const runTests = vi.fn((): TestRunHandle => ({ cancel: () => {} }))
    const container = renderPanel({ listTests, runTests })
    const summary = await vi.waitFor(() => {
      const button = molId(container, 'tests-bar-toggle')
      expect(button?.textContent).toContain('not run yet')
      return button!
    })
    expect(molId(container, 'tests-card')).toBeNull()
    click(summary)
    await vi.waitFor(() => expect(molId(container, 'tests-card')).not.toBeNull())
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
    expect(COMMANDS.map((c) => c.id)).not.toContain('tests')
  })

  it('opens the tests browser and sends NOTHING to the agent', async () => {
    const listTests = vi.fn(async () => LIST)
    const container = renderPanel({ listTests })
    submit(container, '/test')

    await vi.waitFor(() => {
      expect(molId(container, 'tests-card')).not.toBeNull()
    })
    expect(listTests).toHaveBeenCalled()
    // The old behaviour: a natural-language "run npm test" message to Synthase.
    expect(sent).toEqual([])
    expect(container.textContent).not.toContain('npm test')
  })

  it('says so, rather than spinning, for a host that wires no discovery', async () => {
    const container = renderPanel({}, true)
    submit(container, '/test')
    await vi.waitFor(() => {
      expect(molId(container, 'tests-card-error')).not.toBeNull()
    })
    expect(sent).toEqual([])
  })

  it('seeds the search from /test <query>', async () => {
    const container = renderPanel({ listTests: async () => LIST })
    submit(container, '/test routes')
    await vi.waitFor(() => {
      expect(molId(container, 'tests-card')).not.toBeNull()
    })
    expect((molId(container, 'tests-card-search') as HTMLInputElement).value).toBe('routes')
  })

  it('/tests is the same command, via the alias', async () => {
    const listTests = vi.fn(async () => LIST)
    const container = renderPanel({ listTests })
    submit(container, '/tests')
    await vi.waitFor(() => {
      expect(molId(container, 'tests-card')).not.toBeNull()
    })
    expect(sent).toEqual([])
  })

  it('/test all runs everything straight away', async () => {
    const selections: TestSelection[] = []
    const container = renderPanel({
      listTests: async () => LIST,
      runTests: (selection) => {
        selections.push(selection)
        return { cancel: () => {} }
      },
    })
    submit(container, '/test all')
    await vi.waitFor(() => {
      expect(selections).toEqual([{ kind: 'all' }])
    })
    expect(molId(container, 'tests-card')).not.toBeNull()
    expect(sent).toEqual([])
  })

  it('re-running /test re-lists, and the run in flight survives it', async () => {
    const listTests = vi.fn(async () => LIST)
    let emit: (event: TestRunEvent) => void = () => {}
    const container = renderPanel({
      listTests,
      runTests: (_selection, onEvent) => {
        emit = onEvent
        return { cancel: () => {} }
      },
    })
    submit(container, '/test all')
    await vi.waitFor(() => {
      expect(molId(container, 'tests-card')).not.toBeNull()
    })
    emit({ type: 'start', runId: 'r1', ids: ['my-app/app:e2e/home.spec.ts'] })
    await vi.waitFor(() => {
      expect(molId(container, 'tests-card-running')).not.toBeNull()
    })

    const listCallsBefore = listTests.mock.calls.length
    submit(container, '/test')
    await vi.waitFor(() => {
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
    await vi.waitFor(() => {
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
      emit: (event) => listener?.(event),
      unsubscribed: () => unsubscribes,
    }
  }

  /** Open the browser and wait for its discovered rows. */
  async function openTests(container: HTMLElement): Promise<void> {
    submit(container, '/test')
    await vi.waitFor(() => expect(molId(container, `tests-card-run-${HOME}`)).not.toBeNull())
  }

  it('a cancelled own run’s delayed done cannot cancel a finished watched run', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const cancel = vi.fn()
    const container = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        emit = onEvent
        return { cancel }
      },
    })
    await openTests(container)
    click(molId(container, `tests-card-run-${HOME}`))
    emit({ type: 'start', runId: 'own-1', ids: [HOME] })
    feed.emit({ type: 'start', runId: 'agent-1', ids: [ROUTES], source: 'agent' })
    click(molId(container, 'tests-card-cancel'))
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
    expect(molId(container, 'tests-card-cancel')).toBeNull()
    feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed' })
    feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed' })
    const completed = molId(container, 'tests-card-summary')?.textContent
    emit({ type: 'done', outcome: 'cancelled' })
    expect(molId(container, 'tests-card-summary')?.textContent).toBe(completed)
    expect(molId(container, 'tests-card-cancelled')).toBeNull()
    expect(molId(container, `tests-card-status-${ROUTES}`)?.textContent).toBe('Passed')
    expect((molId(container, `tests-card-run-${HOME}`) as HTMLButtonElement).disabled).toBe(false)
    click(molId(container, 'panel-overlay-close'))
    expect(molId(container, 'tests-bar')?.getAttribute('data-tests-tone')).toBe('passing')
  })

  it('late events from a stopped invocation cannot finish or take controls from the next own run', async () => {
    const emitters: Array<(event: TestRunEvent) => void> = []
    const cancels = [vi.fn(), vi.fn()]
    const skips = [vi.fn(), vi.fn()]
    const container = renderPanel({
      listTests: async () => LIST,
      runTests: (_selection, onEvent) => {
        const index = emitters.push(onEvent) - 1
        return { cancel: cancels[index]!, skipCurrent: skips[index]! }
      },
    })
    await openTests(container)
    click(molId(container, `tests-card-run-${HOME}`))
    emitters[0]!({ type: 'start', runId: 'own-1', ids: [HOME] })
    click(molId(container, 'tests-card-cancel'))
    click(molId(container, `tests-card-run-${ROUTES}`))
    emitters[1]!({ type: 'start', runId: 'own-2', ids: [ROUTES] })
    emitters[0]!({ type: 'output', id: HOME, chunk: 'late old output' })
    emitters[0]!({ type: 'result', id: HOME, status: 'skipped', skipped: 1 })
    emitters[0]!({ type: 'done', outcome: 'cancelled' })
    expect(molId(container, 'tests-card-running')).not.toBeNull()
    expect(molId(container, `tests-card-case-${HOME}`)).toBeNull()
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Skipped')
    click(molId(container, `tests-card-skip-${ROUTES}`))
    expect(skips[1]).toHaveBeenCalledTimes(1)
    expect(skips[0]).not.toHaveBeenCalled()
    click(molId(container, 'tests-card-cancel'))
    expect(cancels[0]).toHaveBeenCalledTimes(1)
    expect(cancels[1]).toHaveBeenCalledTimes(1)
  })

  it('keeps a newer outside verdict for a file the own run already finished', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const container = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        emit = onEvent
        return { cancel: () => {} }
      },
    })
    await openTests(container)
    click(molId(container, 'tests-card-run-all'))
    emit({ type: 'start', runId: 'own-1', ids: [HOME, ROUTES] })
    emit({ type: 'result', id: HOME, status: 'failed', output: 'old failure' })
    emit({ type: 'output', id: ROUTES, chunk: 'still running' })
    feed.emit({ type: 'start', runId: 'platform-1', ids: [HOME], source: 'platform' })
    feed.emit({ type: 'result', runId: 'platform-1', id: HOME, status: 'passed' })
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
    expect(molId(container, 'tests-card-cancel')).not.toBeNull()
    feed.emit({ type: 'result', runId: 'platform-1', id: ROUTES, status: 'failed' })
    expect(molId(container, `tests-card-status-${ROUTES}`)?.textContent).toBe('Failed')
    feed.emit({ type: 'done', runId: 'platform-1', outcome: 'completed' })
    emit({ type: 'result', id: ROUTES, status: 'passed' })
    emit({ type: 'done', outcome: 'completed' })
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
    expect(molId(container, 'tests-card-summary')?.textContent).toContain('2 passed')
    expect(molId(container, `tests-card-fix-${HOME}`)).toBeNull()
    click(molId(container, 'panel-overlay-close'))
    expect(molId(container, 'tests-bar')?.getAttribute('data-tests-tone')).toBe('passing')
  })

  it('keeps a completed watched run’s verdict when the displayed run ends without one', async () => {
    const feed = fakeFeed()
    const container = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
    })
    await openTests(container)
    feed.emit({ type: 'start', runId: 'agent-a', ids: [HOME], source: 'agent' })
    feed.emit({ type: 'start', runId: 'platform-b', ids: [HOME], source: 'platform' })
    feed.emit({ type: 'result', runId: 'platform-b', id: HOME, status: 'passed', passed: 1 })
    feed.emit({ type: 'done', runId: 'platform-b', outcome: 'completed' })
    // B reported after A started, so its verdict is already the latest one.
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
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
    const container = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
    })
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
    const runTests = vi.fn((): TestRunHandle => {
      feed.emit({ type: 'start', runId: 'ended', ids: [HOME], source: 'platform' })
      feed.emit({ type: 'result', runId: 'ended', id: HOME, status: 'failed' })
      feed.emit({ type: 'done', runId: 'ended', outcome: 'completed' })
      feed.emit({ type: 'start', runId: 'agent-1', ids: [ROUTES], source: 'agent' })
      throw new Error('own start failed')
    })
    const container = renderPanel({
      listTests: async () => LIST,
      runTests,
      watchTestRuns: feed.watchTestRuns,
    })
    await openTests(container)
    click(molId(container, `tests-card-run-${HOME}`))
    expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
    expect(molId(container, 'tests-card-cancel')).toBeNull()
    expect((molId(container, `tests-card-run-${HOME}`) as HTMLButtonElement).disabled).toBe(true)
    submit(container, '/test all')
    await new Promise((resolve) => setTimeout(resolve, 0))
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
    const container = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        onEvent({ type: 'start', runId: 'own-1', ids: [HOME] })
        feed.emit({ type: 'start', runId: 'agent-1', ids: [ROUTES], source: 'agent' })
        onEvent({ type: 'result', id: HOME, status: 'passed' })
        onEvent({ type: 'done', outcome: 'completed' })
        return { cancel, skipCurrent }
      },
    })
    await openTests(container)
    click(molId(container, `tests-card-run-${HOME}`))
    expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
    expect(molId(container, `tests-card-skip-${ROUTES}`)).toBeNull()
    expect(molId(container, 'tests-card-cancel')).toBeNull()
    feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed' })
    feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed' })
    expect((molId(container, `tests-card-run-${HOME}`) as HTMLButtonElement).disabled).toBe(false)
    mounted.dispose?.()
    mounted.dispose = undefined
    expect(cancel).not.toHaveBeenCalled()
    expect(skipCurrent).not.toHaveBeenCalled()
  })

  it('keeps an isolated start failure visible and lets the person retry, Skip, and Stop', async () => {
    let emit: (event: TestRunEvent) => void = () => {}
    const cancel = vi.fn()
    const skipCurrent = vi.fn()
    const runTests = vi
      .fn((_selection: TestSelection, onEvent: typeof emit): TestRunHandle => {
        emit = onEvent
        return { cancel, skipCurrent }
      })
      .mockImplementationOnce((): TestRunHandle => {
        throw new Error('own start failed')
      })
    const container = renderPanel({ listTests: async () => LIST, runTests })
    await openTests(container)
    click(molId(container, 'tests-card-run-all'))
    expect(molId(container, 'tests-card-run-error')?.textContent).toBe('own start failed')
    expect(molId(container, 'tests-card-running')).toBeNull()
    click(molId(container, 'tests-card-run-all'))
    emit({ type: 'start', runId: 'retry', ids: [HOME, ROUTES] })
    emit({ type: 'case', id: HOME, title: 'opens home', status: 'running' })
    click(molId(container, `tests-card-skip-${HOME}`))
    expect(skipCurrent).toHaveBeenCalledTimes(1)
    expect(molId(container, `tests-card-skip-${HOME}`)?.textContent).toBe('Skipping…')
    emit({ type: 'result', id: HOME, status: 'skipped', skipped: 1 })
    emit({ type: 'case', id: ROUTES, title: 'serves routes', status: 'running' })
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Skipped')
    expect(molId(container, `tests-card-skip-${ROUTES}`)?.textContent).toBe('Skip')
    click(molId(container, 'tests-card-cancel'))
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(molId(container, 'tests-card-cancelled')?.textContent).toBe('Run stopped.')
  })

  it('a synchronous cancel callback cannot overwrite the watched run handed the card', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const cancel = vi.fn(() => emit({ type: 'done', outcome: 'cancelled' }))
    const container = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        emit = onEvent
        return { cancel }
      },
    })
    await openTests(container)
    click(molId(container, `tests-card-run-${HOME}`))
    emit({ type: 'start', runId: 'own-1', ids: [HOME] })
    feed.emit({ type: 'start', runId: 'agent-1', ids: [ROUTES], source: 'agent' })
    click(molId(container, 'tests-card-cancel'))
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
    const container = renderPanel({
      listTests: async () => LIST,
      runTests: (_selection, onEvent) => {
        emitters.push(onEvent)
        return { cancel: () => {}, skipCurrent }
      },
    })
    await openTests(container)
    click(molId(container, `tests-card-run-${HOME}`))
    emitters[0]!({ type: 'start', runId: 'own-1', ids: [HOME] })
    click(molId(container, `tests-card-skip-${HOME}`))
    click(molId(container, 'tests-card-cancel'))
    click(molId(container, `tests-card-run-${ROUTES}`))
    emitters[1]!({ type: 'start', runId: 'own-2', ids: [ROUTES] })
    refuseSkip(false)
    await skipped
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(molId(container, `tests-card-skip-${ROUTES}`)?.textContent).toBe('Skip')
  })

  it('shows a run the agent started, says who started it, and offers no Stop', async () => {
    const feed = fakeFeed()
    const listTests = vi.fn(async () => LIST)
    const container = renderPanel({ listTests, watchTestRuns: feed.watchTestRuns })
    await vi.waitFor(() => expect(molId(container, 'tests-bar-toggle')).not.toBeNull())
    feed.emit({
      type: 'start',
      runId: 'agent-1',
      ids: [],
      source: 'agent',
      command: 'cd api && npx vitest run src/routes.test.ts',
    })
    feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed', passed: 4 })
    await vi.waitFor(() =>
      expect(molId(container, 'tests-bar-toggle')?.textContent).toContain('is running tests'),
    )
    expect(molId(container, 'tests-bar-stop')).toBeNull()
    click(molId(container, 'tests-bar-toggle'))
    await vi.waitFor(() => expect(molId(container, 'tests-card')).not.toBeNull())
    expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
    expect(molId(container, 'tests-card-command')?.textContent).toBe(
      'cd api && npx vitest run src/routes.test.ts',
    )
    expect(molId(container, 'tests-card-cancel')).toBeNull()
    // Nothing to start while it runs.
    expect((molId(container, `tests-card-run-${HOME}`) as HTMLButtonElement).disabled).toBe(true)
    const listedBefore = listTests.mock.calls.length
    feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed', passed: 4 })
    await vi.waitFor(() => expect(molId(container, 'tests-card-running')).toBeNull())
    expect(molId(container, 'tests-card-summary')?.textContent).toContain('1 passed')
    expect((molId(container, `tests-card-run-${HOME}`) as HTMLButtonElement).disabled).toBe(false)
    // An ended run may have followed a newly written spec: the list is refreshed.
    await vi.waitFor(() => expect(listTests.mock.calls.length).toBeGreaterThan(listedBefore), {
      timeout: 3000,
    })
    expect(sent).toEqual([])
  })

  it('shows the runs the host replays on subscribe', async () => {
    const feed = fakeFeed([
      { type: 'start', runId: 'platform-1', ids: [ROUTES], source: 'platform' },
      { type: 'result', runId: 'platform-1', id: ROUTES, status: 'failed', failed: 1 },
      { type: 'done', runId: 'platform-1', outcome: 'completed', failed: 1 },
    ])
    const container = renderPanel({
      listTests: vi.fn(async () => LIST),
      watchTestRuns: feed.watchTestRuns,
    })
    await vi.waitFor(() =>
      expect(molId(container, 'tests-bar-toggle')?.textContent).toContain('1 failing'),
    )
  })

  it('ignores the feed’s copy of its own run, even when the copy arrives first', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const cancel = vi.fn()
    const runTests = vi.fn((_selection: TestSelection, onEvent: typeof emit): TestRunHandle => {
      emit = onEvent
      return { cancel }
    })
    const container = renderPanel({
      listTests: vi.fn(async () => LIST),
      runTests,
      watchTestRuns: feed.watchTestRuns,
    })
    submit(container, '/test')
    const run = await vi.waitFor(() => {
      const button = molId(container, `tests-card-run-${HOME}`)
      expect(button).not.toBeNull()
      return button!
    })
    click(run)
    // The echo of this very run reaches the panel before its own stream does.
    feed.emit({ type: 'start', runId: 'own-1', ids: [HOME], source: 'person' })
    emit({ type: 'start', runId: 'own-1', ids: [HOME] })
    feed.emit({ type: 'result', runId: 'own-1', id: HOME, status: 'failed', failed: 1 })
    emit({ type: 'result', id: HOME, status: 'passed', passed: 1 })
    emit({ type: 'done', outcome: 'completed', passed: 1 })
    feed.emit({ type: 'done', runId: 'own-1', outcome: 'completed', failed: 1 })
    await vi.waitFor(() => expect(molId(container, 'tests-card-running')).toBeNull())
    expect(molId(container, 'tests-card-summary')?.textContent).toContain('1 passed')
    expect(molId(container, 'tests-card-summary')?.textContent).not.toContain('failed')
  })

  it('keeps own-run suppression through a synthetic feed done and replayed start', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const container = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        emit = onEvent
        return { cancel: () => {} }
      },
    })
    await openTests(container)
    click(molId(container, `tests-card-run-${HOME}`))
    emit({ type: 'start', runId: 'own-1', ids: [HOME] })
    feed.emit({ type: 'start', runId: 'own-1', ids: [HOME], source: 'person' })
    // A disconnect ends the feed copy synthetically; reconnect replays its start.
    feed.emit({ type: 'done', runId: 'own-1', outcome: 'error', error: 'feed disconnected' })
    feed.emit({ type: 'start', runId: 'own-1', ids: [HOME], source: 'person' })
    click(molId(container, 'tests-card-cancel'))
    emit({ type: 'done', outcome: 'cancelled' })
    expect(molId(container, 'tests-card-running')).toBeNull()
    expect(molId(container, 'tests-card-cancelled')?.textContent).toBe('Run stopped.')
    expect(molId(container, 'tests-card-cancel')).toBeNull()
    expect((molId(container, `tests-card-run-${HOME}`) as HTMLButtonElement).disabled).toBe(false)
  })

  it('bounds own-run ids when no feed echo arrives but still suppresses recent echoes', async () => {
    const feed = fakeFeed()
    const emitters: Array<(event: TestRunEvent) => void> = []
    const container = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        emitters.push(onEvent)
        return { cancel: () => {} }
      },
    })
    await openTests(container)
    // The panel retains 32 recent ids as a delayed-echo guard, not every run
    // for its whole lifetime. None of these runs receives a feed echo.
    for (let index = 0; index < 33; index += 1) {
      click(molId(container, `tests-card-run-${HOME}`))
      emitters[index]!({ type: 'start', runId: `own-${index}`, ids: [HOME] })
      emitters[index]!({ type: 'result', id: HOME, status: 'passed', passed: 1 })
      emitters[index]!({ type: 'done', outcome: 'completed', passed: 1 })
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
    // 33 runs through the whole panel: 6.6 s measured under a loaded machine (load 75), past vitest's 5 s default.
  }, 30_000)

  it('an agent run that starts during the person’s run waits for it, then takes the card', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const runTests = vi.fn((_selection: TestSelection, onEvent: typeof emit): TestRunHandle => {
      emit = onEvent
      return { cancel: () => {} }
    })
    const container = renderPanel({
      listTests: vi.fn(async () => LIST),
      runTests,
      watchTestRuns: feed.watchTestRuns,
    })
    submit(container, '/test')
    click(
      await vi.waitFor(() => {
        const button = molId(container, `tests-card-run-${HOME}`)
        expect(button).not.toBeNull()
        return button!
      }),
    )
    emit({ type: 'start', runId: 'own-1', ids: [HOME] })
    feed.emit({ type: 'start', runId: 'agent-1', ids: [], source: 'agent' })
    feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed', passed: 2 })
    // The person's own run keeps the card, and its Stop.
    expect(molId(container, 'tests-card-running')?.textContent).not.toContain('is running tests')
    expect(molId(container, 'tests-card-cancel')).not.toBeNull()
    emit({ type: 'result', id: HOME, status: 'passed', passed: 1 })
    emit({ type: 'done', outcome: 'completed', passed: 1 })
    await vi.waitFor(() =>
      expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests'),
    )
    expect(molId(container, 'tests-card-cancel')).toBeNull()
    feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed', passed: 2 })
    await vi.waitFor(() => expect(molId(container, 'tests-card-running')).toBeNull())
    expect(molId(container, 'tests-card-summary')?.textContent).toContain('2 passed')
  })

  it('reconnect replay cannot erase a verdict the own stream reported after a cancelled run', async () => {
    const first = fakeFeed()
    const listTests = async (): Promise<TestList> => LIST
    let emit: (event: TestRunEvent) => void = () => {}
    const runTests = (_selection: TestSelection, onEvent: typeof emit): TestRunHandle => {
      emit = onEvent
      return { cancel: () => {} }
    }
    const [watch, setWatch] = createSignal<ChatPanelProps['watchTestRuns']>(first.watchTestRuns)
    mounted.dispose?.()
    mounted.dispose = undefined
    document.body.innerHTML = ''
    const host = document.body.appendChild(document.createElement('div'))
    const container = host.ownerDocument.body
    mounted.dispose = render(
      () => (
        <ThemeContext.Provider value={buildThemeProvider()}>
          <HttpContext.Provider value={buildHttpClient()}>
            <ChatContext.Provider value={buildChatProvider()}>
              <ChatPanel
                projectId={PROJECT_ID}
                listTests={listTests}
                runTests={runTests}
                watchTestRuns={watch()}
                testsAvailable
              />
            </ChatContext.Provider>
          </HttpContext.Provider>
        </ThemeContext.Provider>
      ),
      host,
    )
    await openTests(container)
    click(molId(container, `tests-card-run-${HOME}`))
    emit({ type: 'start', runId: 'A', eventId: '1-0', ids: [HOME] })
    first.emit({ type: 'start', runId: 'B', eventId: '2-0', ids: [HOME], source: 'platform' })
    first.emit({ type: 'done', runId: 'B', eventId: '3-0', outcome: 'cancelled' })
    emit({ type: 'result', eventId: '4-0', id: HOME, status: 'passed', passed: 1 })
    emit({ type: 'done', eventId: '5-0', outcome: 'completed' })
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')

    const replay = fakeFeed()
    setWatch(() => replay.watchTestRuns)
    await vi.waitFor(() => expect(first.unsubscribed()).toBe(1))
    // Real replay is asynchronous: the old client appended own events first, then accepted B's
    // older replay while suppressing A's. Ids must make both runs' replayed copies no-ops.
    for (const event of [
      { type: 'start', runId: 'B', eventId: '2-0', ids: [HOME], source: 'platform' },
      { type: 'done', runId: 'B', eventId: '3-0', outcome: 'cancelled' },
      { type: 'start', runId: 'A', eventId: '1-0', ids: [HOME], source: 'person' },
      { type: 'result', runId: 'A', eventId: '4-0', id: HOME, status: 'passed', passed: 1 },
      { type: 'done', runId: 'A', eventId: '5-0', outcome: 'completed' },
    ] as TestRunFeedEvent[])
      replay.emit(event)
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
  })

  it('a reconnect with no new events leaves the visible card unchanged', async () => {
    const events: TestRunFeedEvent[] = [
      { type: 'start', runId: 'A', ids: [HOME], source: 'agent' },
      { type: 'result', runId: 'A', id: HOME, status: 'passed', passed: 1 },
      { type: 'done', runId: 'A', outcome: 'completed' },
    ]
    const first = fakeFeed(events)
    const listTests = async (): Promise<TestList> => LIST
    const [watch, setWatch] = createSignal<ChatPanelProps['watchTestRuns']>(first.watchTestRuns)
    mounted.dispose?.()
    mounted.dispose = undefined
    document.body.innerHTML = ''
    const host = document.body.appendChild(document.createElement('div'))
    const container = host.ownerDocument.body
    mounted.dispose = render(
      () => (
        <ThemeContext.Provider value={buildThemeProvider()}>
          <HttpContext.Provider value={buildHttpClient()}>
            <ChatContext.Provider value={buildChatProvider()}>
              <ChatPanel
                projectId={PROJECT_ID}
                listTests={listTests}
                watchTestRuns={watch()}
                testsAvailable
              />
            </ChatContext.Provider>
          </HttpContext.Provider>
        </ThemeContext.Provider>
      ),
      host,
    )
    await openTests(container)
    const before = molId(container, 'tests-card')?.textContent
    const replay = fakeFeed(events)
    setWatch(() => replay.watchTestRuns)
    await vi.waitFor(() => expect(first.unsubscribed()).toBe(1))
    expect(molId(container, 'tests-card')?.textContent).toBe(before)
  })

  it('40 completed own runs never evict the active own-run id', async () => {
    const feed = fakeFeed()
    const emitters: Array<(event: TestRunEvent) => void> = []
    const container = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        emitters.push(onEvent)
        return { cancel: () => {} }
      },
    })
    await openTests(container)
    for (let index = 0; index < 40; index += 1) {
      click(molId(container, `tests-card-run-${HOME}`))
      emitters[index]!({ type: 'start', runId: `own-${index}`, ids: [HOME] })
      emitters[index]!({ type: 'result', id: HOME, status: 'passed', passed: 1 })
      emitters[index]!({ type: 'done', outcome: 'completed' })
    }
    click(molId(container, `tests-card-run-${HOME}`))
    emitters[40]!({ type: 'start', runId: 'active', ids: [HOME] })
    feed.emit({ type: 'start', runId: 'active', ids: [HOME], source: 'person' })
    click(molId(container, 'tests-card-cancel'))
    expect(molId(container, 'tests-card-running')).toBeNull()
    expect(molId(container, 'tests-card-cancelled')?.textContent).toBe('Run stopped.')
  })

  it('a start delayed past cancellation remains a completed own run', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const container = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        emit = onEvent
        return { cancel: () => {} }
      },
    })
    await openTests(container)
    click(molId(container, `tests-card-run-${HOME}`))
    click(molId(container, 'tests-card-cancel'))
    emit({ type: 'start', runId: 'cancelled', ids: [HOME] })
    feed.emit({ type: 'start', runId: 'cancelled', ids: [HOME], source: 'person' })
    expect(molId(container, 'tests-card-running')).toBeNull()
    expect(molId(container, 'tests-card-cancel')).toBeNull()
  })

  it('a host failure after the own start retires the active id and ends the row', async () => {
    const feed = fakeFeed()
    const container = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        onEvent({ type: 'start', runId: 'broken', ids: [HOME] })
        throw new Error('stream failed after start')
      },
    })
    await openTests(container)
    click(molId(container, `tests-card-run-${HOME}`))
    expect(molId(container, 'tests-card-running')).toBeNull()
    expect(molId(container, 'tests-card-run-error')?.textContent).toBe('stream failed after start')
    feed.emit({ type: 'start', runId: 'broken', ids: [HOME], source: 'person' })
    expect(molId(container, 'tests-card-running')).toBeNull()
  })

  it('Sol 3: delayed starts of cancelled runs cannot evict the active own-run id', async () => {
    const feed = fakeFeed()
    const emitters: Array<(event: TestRunEvent) => void> = []
    const container = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        emitters.push(onEvent)
        return { cancel: () => {} }
      },
    })
    await openTests(container)
    for (let index = 0; index < 32; index += 1) {
      click(molId(container, `tests-card-run-${HOME}`))
      click(molId(container, 'tests-card-cancel'))
    }
    click(molId(container, `tests-card-run-${HOME}`))
    emitters[32]!({ type: 'start', runId: 'active', ids: [HOME] })
    for (let index = 0; index < 32; index += 1) {
      emitters[index]!({ type: 'start', runId: `cancelled-${index}`, ids: [HOME] })
    }
    feed.emit({ type: 'start', runId: 'active', ids: [HOME], source: 'person' })
    click(molId(container, 'tests-card-cancel'))
    expect(molId(container, 'tests-card-running')).toBeNull()
    expect(molId(container, 'tests-card-cancelled')?.textContent).toBe('Run stopped.')
  })

  it('Sol ownership: a failure before start lets the next Run click invoke the host', async () => {
    const runTests = vi.fn((_selection: TestSelection, onEvent: (event: TestRunEvent) => void) => {
      if (runTests.mock.calls.length === 1) {
        onEvent({ type: 'done', outcome: 'error', error: 'could not start' })
      }
      return { cancel: () => {} }
    })
    const container = renderPanel({ listTests: async () => LIST, runTests })
    await openTests(container)
    click(molId(container, `tests-card-run-${HOME}`))
    await vi.waitFor(() => expect(molId(container, 'tests-card-run-error')).not.toBeNull())
    click(molId(container, `tests-card-run-${HOME}`))
    expect(runTests).toHaveBeenCalledTimes(2)
  })

  it('unsubscribes when the panel unmounts', async () => {
    const feed = fakeFeed()
    renderPanel({ listTests: vi.fn(async () => LIST), watchTestRuns: feed.watchTestRuns })
    mounted.dispose?.()
    mounted.dispose = undefined
    expect(feed.unsubscribed()).toBe(1)
  })
})
