// @vitest-environment jsdom
/**
 * `/test` must OPEN THE TESTS BROWSER, not spend an agent turn — the Svelte
 * port of `@molecule/app-ide-react/src/__tests__/ChatPanel.test-command.test.tsx`
 * with the same test names and the same assertions, mounted through Svelte 5's
 * own `mount`/`flushSync` so the panel is the real component.
 *
 * It used to send a natural-language message ("Run the project test suite (npm
 * test) and report the results") and let Synthase read the output back — a
 * whole turn, and a model's paraphrase of a result the platform can produce
 * directly. This mounts the real {@link ChatPanel}, types `/test`, and asserts
 * the browser opened, the host's `listTests` was called, and NOTHING was sent
 * to the chat.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, type Snippet } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatEventHandler, ChatProvider } from '@molecule/app-ai-chat'
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
import { resetChatStoresForTests } from '@molecule/app-svelte'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { ChatPanelProps } from '../types.js'
import {
  buildRejectingHttpClient,
  flush,
  makeStorage,
  mountPanel,
  type PanelMount,
  submit,
} from './chat-panel-harness.js'

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
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (): Promise<never[]> => [],
  }
}

/** A working in-memory Storage (Node's experimental web-storage shadows jsdom's). */
function makeMemoryStorage(): Storage {
  return makeStorage()
}

/** What the mounted panel was given to talk to. */
interface RenderOptions {
  listTests?: () => Promise<TestList>
  runTests?: ChatPanelProps['runTests']
  canRunTests?: boolean
  watchTestRuns?: ChatPanelProps['watchTestRuns']
  nativeTests?: ChatPanelProps['nativeTests']
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/**
 * Mounts the panel with the tests host callbacks wired.
 *
 * @param options - The recorded callbacks and gates.
 * @returns The mount, its live props and teardown.
 */
function renderPanel(options: RenderOptions): PanelMount {
  mounted?.unmount()
  mounted = mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider(),
    projectId: PROJECT_ID,
    props: {
      listTests: options.listTests,
      runTests: options.runTests ?? (() => ({ cancel: () => {} })),
      canRunTests: options.canRunTests ?? true,
      watchTestRuns: options.watchTestRuns,
      nativeTests: options.nativeTests,
      testsAvailable: true,
    },
  })
  return mounted
}

/**
 * The element carrying a `data-mol-id`.
 *
 * @param container - The mounted container.
 * @param id - The element's id.
 * @returns The element, or null.
 */
const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

/**
 * Types a command into the composer, submits it, and flushes the render.
 *
 * @param container - The mounted container.
 * @param text - The command text.
 */
function command(container: HTMLElement, text: string): void {
  submit(container, text)
  flushSync()
}

/**
 * Runs something that changes panel state (a run event) and flushes the render.
 *
 * @param fn - The state change to apply.
 */
function act(fn: () => void): void {
  fn()
  flushSync()
}

/**
 * Clicks a control and flushes the render.
 *
 * @param el - The control, or null when it must not exist.
 */
async function click(el: HTMLElement | null): Promise<void> {
  el?.click()
  await flush()
}

/** A snippet rendering the host's durable native run history. */
function nativeHistory(): Snippet {
  return createRawSnippet(() => ({
    render: () =>
      '<section data-testid="durable-native-history">Native invocation · exit 0 · test results not recorded</section>',
  }))
}

/** A snippet rendering the host's own status strip; its argument opens the browser. */
function nativeStatus(): Snippet<[() => void]> {
  return createRawSnippet<[() => void]>((open) => ({
    render: () => '<button type="button">Native test history</button>',
    setup: (element) => {
      // `element` is the snippet's single root node — the button itself.
      element.addEventListener('click', () => {
        open()()
      })
    },
  }))
}

beforeEach(() => {
  sent.length = 0
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  resetChatStoresForTests()
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeMemoryStorage(),
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: makeMemoryStorage(),
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
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider())
})

describe('the /test command', () => {
  it('opens durable host test history from its status strip for a viewer and retains it after remount', async () => {
    const listTests = vi.fn(async () => LIST)
    const host = (): NonNullable<ChatPanelProps['nativeTests']> => ({
      visible: true,
      history: nativeHistory(),
      renderStatus: nativeStatus(),
    })
    const clickHistory = async (container: HTMLElement): Promise<void> => {
      const button = Array.from(container.querySelectorAll('button')).find(
        (element) => element.textContent === 'Native test history',
      )
      if (!button) throw new Error('native test history button not found')
      await click(button)
    }
    const first = renderPanel({ listTests, canRunTests: false, nativeTests: host() })
    await flush()
    await clickHistory(first.container)
    await vi.waitFor(() =>
      expect(
        first.container.querySelector('[data-testid="durable-native-history"]')?.textContent,
      ).toContain('test results not recorded'),
    )
    expect(sent).toEqual([])
    first.unmount()
    mounted = null
    const second = renderPanel({ listTests, canRunTests: false, nativeTests: host() })
    await flush()
    await clickHistory(second.container)
    await vi.waitFor(() =>
      expect(
        second.container.querySelector('[data-testid="durable-native-history"]')?.textContent,
      ).toContain('exit 0'),
    )
    second.unmount()
    mounted = null
  })

  it('lists tests and accepts run events after effects reconnect', async () => {
    let emit: (event: TestRunEvent) => void = () => {}
    const cancel = vi.fn()
    const listTests = vi.fn(async () => LIST)
    const runTests = vi.fn((_selection: TestSelection, onEvent: typeof emit) => {
      emit = onEvent
      return { cancel }
    })
    const { container, unmount } = renderPanel({ listTests, runTests })
    command(container, '/test')
    await vi.waitFor(() => expect(listTests).toHaveBeenCalled())
    expect(molId(container, 'tests-card')).not.toBeNull()
    const run = await vi.waitFor(() => {
      const button = molId(container, 'tests-card-run-my-app/app:e2e/home.spec.ts')
      expect(button).not.toBeNull()
      return button as HTMLElement
    })
    await click(run)
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
    await vi.waitFor(() => expect(molId(container, 'tests-card-running')).toBeNull())
    expect(molId(container, 'tests-card-summary')?.textContent).toContain('1 passed')
    await click(molId(container, 'tests-card-run-my-app/app:e2e/home.spec.ts'))
    unmount()
    mounted = null
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it('opens the tests browser with one click on the not-run summary', async () => {
    const listTests = vi.fn(async () => LIST)
    const runTests = vi.fn(() => ({ cancel: () => {} }))
    const { container } = renderPanel({ listTests, runTests })
    const summary = await vi.waitFor(() => {
      const button = molId(container, 'tests-bar-toggle')
      expect(button?.textContent).toContain('not run yet')
      return button as HTMLElement
    })
    expect(molId(container, 'tests-card')).toBeNull()
    await click(summary)
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
    const { container } = renderPanel({ listTests })
    command(container, '/test')

    await vi.waitFor(() => {
      expect(molId(container, 'tests-card')).not.toBeNull()
    })
    expect(listTests).toHaveBeenCalled()
    // The old behaviour: a natural-language "run npm test" message to Synthase.
    expect(sent).toEqual([])
    expect(container.textContent).not.toContain('npm test')
  })

  it('says so, rather than spinning, for a host that wires no discovery', async () => {
    const { container } = renderPanel({})
    command(container, '/test')
    await vi.waitFor(() => {
      expect(molId(container, 'tests-card-error')).not.toBeNull()
    })
    expect(sent).toEqual([])
  })

  it('seeds the search from /test <query>', async () => {
    const { container } = renderPanel({ listTests: async () => LIST })
    command(container, '/test routes')
    await vi.waitFor(() => {
      expect(molId(container, 'tests-card')).not.toBeNull()
    })
    expect((molId(container, 'tests-card-search') as HTMLInputElement).value).toBe('routes')
  })

  it('/tests is the same command, via the alias', async () => {
    const listTests = vi.fn(async () => LIST)
    const { container } = renderPanel({ listTests })
    command(container, '/tests')
    await vi.waitFor(() => {
      expect(molId(container, 'tests-card')).not.toBeNull()
    })
    expect(sent).toEqual([])
  })

  it('/test all runs everything straight away', async () => {
    const selections: TestSelection[] = []
    const { container } = renderPanel({
      listTests: async () => LIST,
      runTests: (selection) => {
        selections.push(selection)
        return { cancel: () => {} }
      },
    })
    command(container, '/test all')
    await vi.waitFor(() => {
      expect(selections).toEqual([{ kind: 'all' }])
    })
    expect(molId(container, 'tests-card')).not.toBeNull()
    expect(sent).toEqual([])
  })

  it('re-running /test re-lists, and the run in flight survives it', async () => {
    const listTests = vi.fn(async () => LIST)
    let emit: (event: TestRunEvent) => void = () => {}
    const { container } = renderPanel({
      listTests,
      runTests: (_selection, onEvent) => {
        emit = onEvent
        return { cancel: () => {} }
      },
    })
    command(container, '/test all')
    await vi.waitFor(() => {
      expect(molId(container, 'tests-card')).not.toBeNull()
    })
    act(() => emit({ type: 'start', runId: 'r1', ids: ['my-app/app:e2e/home.spec.ts'] }))
    await vi.waitFor(() => {
      expect(molId(container, 'tests-card-running')).not.toBeNull()
    })

    const listCallsBefore = listTests.mock.calls.length
    command(container, '/test')
    await vi.waitFor(() => {
      expect(listTests.mock.calls.length).toBeGreaterThan(listCallsBefore)
    })
    // The run is still live — re-listing must not throw it away.
    expect(molId(container, 'tests-card-running')).not.toBeNull()

    act(() => {
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
      emit: (event) => {
        listener?.(event)
      },
      unsubscribed: () => unsubscribes,
    }
  }

  /** Open the browser and wait for its discovered rows. */
  async function openTests(container: HTMLElement): Promise<void> {
    command(container, '/test')
    await vi.waitFor(() => expect(molId(container, `tests-card-run-${HOME}`)).not.toBeNull())
  }

  it('a cancelled own run’s delayed done cannot cancel a finished watched run', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const cancel = vi.fn()
    const { container } = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        emit = onEvent
        return { cancel }
      },
    })
    await openTests(container)
    await click(molId(container, `tests-card-run-${HOME}`))
    act(() => emit({ type: 'start', runId: 'own-1', ids: [HOME] }))
    feed.emit({ type: 'start', runId: 'agent-1', ids: [ROUTES], source: 'agent' })
    await flush()
    await click(molId(container, 'tests-card-cancel'))
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
    expect(molId(container, 'tests-card-cancel')).toBeNull()
    feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed' })
    feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed' })
    await flush()
    const completed = molId(container, 'tests-card-summary')?.textContent
    act(() => emit({ type: 'done', outcome: 'cancelled' }))
    expect(molId(container, 'tests-card-summary')?.textContent).toBe(completed)
    expect(molId(container, 'tests-card-cancelled')).toBeNull()
    expect(molId(container, `tests-card-status-${ROUTES}`)?.textContent).toBe('Passed')
    expect((molId(container, `tests-card-run-${HOME}`) as HTMLButtonElement).disabled).toBe(false)
    await click(molId(container, 'panel-overlay-close'))
    expect(molId(container, 'tests-bar')?.getAttribute('data-tests-tone')).toBe('passing')
  })

  it('late events from a stopped invocation cannot finish or take controls from the next own run', async () => {
    const emitters: Array<(event: TestRunEvent) => void> = []
    const cancels = [vi.fn(), vi.fn()]
    const skips = [vi.fn(), vi.fn()]
    const { container } = renderPanel({
      listTests: async () => LIST,
      runTests: (_selection, onEvent) => {
        const index = emitters.push(onEvent) - 1
        return { cancel: cancels[index], skipCurrent: skips[index] }
      },
    })
    await openTests(container)
    await click(molId(container, `tests-card-run-${HOME}`))
    act(() => emitters[0]?.({ type: 'start', runId: 'own-1', ids: [HOME] }))
    await click(molId(container, 'tests-card-cancel'))
    await click(molId(container, `tests-card-run-${ROUTES}`))
    act(() => {
      emitters[1]?.({ type: 'start', runId: 'own-2', ids: [ROUTES] })
      emitters[0]?.({ type: 'output', id: HOME, chunk: 'late old output' })
      emitters[0]?.({ type: 'result', id: HOME, status: 'skipped', skipped: 1 })
      emitters[0]?.({ type: 'done', outcome: 'cancelled' })
    })
    expect(molId(container, 'tests-card-running')).not.toBeNull()
    expect(molId(container, `tests-card-case-${HOME}`)).toBeNull()
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Skipped')
    await click(molId(container, `tests-card-skip-${ROUTES}`))
    expect(skips[1]).toHaveBeenCalledTimes(1)
    expect(skips[0]).not.toHaveBeenCalled()
    await click(molId(container, 'tests-card-cancel'))
    expect(cancels[0]).toHaveBeenCalledTimes(1)
    expect(cancels[1]).toHaveBeenCalledTimes(1)
  })

  it('keeps a newer outside verdict for a file the own run already finished', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const { container } = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        emit = onEvent
        return { cancel: () => {} }
      },
    })
    await openTests(container)
    await click(molId(container, 'tests-card-run-all'))
    act(() => {
      emit({ type: 'start', runId: 'own-1', ids: [HOME, ROUTES] })
      emit({ type: 'result', id: HOME, status: 'failed', output: 'old failure' })
      emit({ type: 'output', id: ROUTES, chunk: 'still running' })
    })
    feed.emit({ type: 'start', runId: 'platform-1', ids: [HOME], source: 'platform' })
    feed.emit({ type: 'result', runId: 'platform-1', id: HOME, status: 'passed' })
    await flush()
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
    expect(molId(container, 'tests-card-cancel')).not.toBeNull()
    feed.emit({ type: 'result', runId: 'platform-1', id: ROUTES, status: 'failed' })
    await flush()
    expect(molId(container, `tests-card-status-${ROUTES}`)?.textContent).toBe('Failed')
    feed.emit({ type: 'done', runId: 'platform-1', outcome: 'completed' })
    act(() => {
      emit({ type: 'result', id: ROUTES, status: 'passed' })
      emit({ type: 'done', outcome: 'completed' })
    })
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
    expect(molId(container, 'tests-card-summary')?.textContent).toContain('2 passed')
    expect(molId(container, `tests-card-fix-${HOME}`)).toBeNull()
    await click(molId(container, 'panel-overlay-close'))
    expect(molId(container, 'tests-bar')?.getAttribute('data-tests-tone')).toBe('passing')
  })

  it('keeps a completed watched run’s verdict when the displayed run ends without one', async () => {
    const feed = fakeFeed()
    const { container } = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
    })
    await openTests(container)
    feed.emit({ type: 'start', runId: 'agent-a', ids: [HOME], source: 'agent' })
    feed.emit({ type: 'start', runId: 'platform-b', ids: [HOME], source: 'platform' })
    feed.emit({ type: 'result', runId: 'platform-b', id: HOME, status: 'passed', passed: 1 })
    feed.emit({ type: 'done', runId: 'platform-b', outcome: 'completed' })
    await flush()
    // B reported after A started, so its verdict is already the latest one.
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
    feed.emit({ type: 'done', runId: 'agent-a', outcome: 'cancelled' })
    await flush()
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
    const { container } = renderPanel({
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
    await flush()
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Running…')
    expect(molId(container, `tests-card-case-title-${HOME}`)?.textContent).toBe('opens home')
    expect(molId(container, `tests-card-status-${ROUTES}`)?.textContent).toBe('Running…')
    feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed' })
    await flush()
    expect(molId(container, `tests-card-status-${ROUTES}`)?.textContent).toBe('Passed')
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Running…')
    feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed' })
    await flush()
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
    const { container } = renderPanel({
      listTests: async () => LIST,
      runTests,
      watchTestRuns: feed.watchTestRuns,
    })
    await openTests(container)
    await click(molId(container, `tests-card-run-${HOME}`))
    expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
    expect(molId(container, 'tests-card-cancel')).toBeNull()
    expect((molId(container, `tests-card-run-${HOME}`) as HTMLButtonElement).disabled).toBe(true)
    command(container, '/test all')
    await flush()
    expect(runTests).toHaveBeenCalledTimes(1)
    feed.emit({ type: 'result', runId: 'agent-1', id: HOME, status: 'passed' })
    feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed' })
    await flush()
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
    // A pruned run can receive a trailing done, but must not replay its old failure.
    feed.emit({ type: 'done', runId: 'ended', outcome: 'completed' })
    await flush()
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
  })

  it('does not install a completed own run’s returned handle onto a watched run', async () => {
    const feed = fakeFeed()
    const cancel = vi.fn()
    const skipCurrent = vi.fn()
    const { container, unmount } = renderPanel({
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
    await click(molId(container, `tests-card-run-${HOME}`))
    expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
    expect(molId(container, `tests-card-skip-${ROUTES}`)).toBeNull()
    expect(molId(container, 'tests-card-cancel')).toBeNull()
    feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed' })
    feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed' })
    await flush()
    expect((molId(container, `tests-card-run-${HOME}`) as HTMLButtonElement).disabled).toBe(false)
    unmount()
    mounted = null
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
    const { container } = renderPanel({ listTests: async () => LIST, runTests })
    await openTests(container)
    await click(molId(container, 'tests-card-run-all'))
    expect(molId(container, 'tests-card-run-error')?.textContent).toBe('own start failed')
    expect(molId(container, 'tests-card-running')).toBeNull()
    await click(molId(container, 'tests-card-run-all'))
    act(() => {
      emit({ type: 'start', runId: 'retry', ids: [HOME, ROUTES] })
      emit({ type: 'case', id: HOME, title: 'opens home', status: 'running' })
    })
    await click(molId(container, `tests-card-skip-${HOME}`))
    expect(skipCurrent).toHaveBeenCalledTimes(1)
    expect(molId(container, `tests-card-skip-${HOME}`)?.textContent).toBe('Skipping…')
    act(() => {
      emit({ type: 'result', id: HOME, status: 'skipped', skipped: 1 })
      emit({ type: 'case', id: ROUTES, title: 'serves routes', status: 'running' })
    })
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Skipped')
    expect(molId(container, `tests-card-skip-${ROUTES}`)?.textContent).toBe('Skip')
    await click(molId(container, 'tests-card-cancel'))
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(molId(container, 'tests-card-cancelled')?.textContent).toBe('Run stopped.')
  })

  it('a synchronous cancel callback cannot overwrite the watched run handed the card', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const cancel = vi.fn(() => emit({ type: 'done', outcome: 'cancelled' }))
    const { container } = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        emit = onEvent
        return { cancel }
      },
    })
    await openTests(container)
    await click(molId(container, `tests-card-run-${HOME}`))
    act(() => emit({ type: 'start', runId: 'own-1', ids: [HOME] }))
    feed.emit({ type: 'start', runId: 'agent-1', ids: [ROUTES], source: 'agent' })
    await flush()
    await click(molId(container, 'tests-card-cancel'))
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
    expect(molId(container, 'tests-card-cancel')).toBeNull()
    feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed' })
    await flush()
    expect(molId(container, 'tests-card-cancelled')).toBeNull()
  })

  it('a previous invocation’s delayed Skip refusal cannot disable Skip on the next own run', async () => {
    const emitters: Array<(event: TestRunEvent) => void> = []
    let refuseSkip: (accepted: boolean) => void = () => {}
    const skipped = new Promise<boolean>((resolve) => {
      refuseSkip = resolve
    })
    const skipCurrent = vi.fn(() => skipped)
    const { container } = renderPanel({
      listTests: async () => LIST,
      runTests: (_selection, onEvent) => {
        emitters.push(onEvent)
        return { cancel: () => {}, skipCurrent }
      },
    })
    await openTests(container)
    await click(molId(container, `tests-card-run-${HOME}`))
    act(() => emitters[0]?.({ type: 'start', runId: 'own-1', ids: [HOME] }))
    await click(molId(container, `tests-card-skip-${HOME}`))
    await click(molId(container, 'tests-card-cancel'))
    await click(molId(container, `tests-card-run-${ROUTES}`))
    act(() => emitters[1]?.({ type: 'start', runId: 'own-2', ids: [ROUTES] }))
    refuseSkip(false)
    await skipped
    await flush()
    expect(molId(container, `tests-card-skip-${ROUTES}`)?.textContent).toBe('Skip')
  })

  it('shows a run the agent started, says who started it, and offers no Stop', async () => {
    const feed = fakeFeed()
    const listTests = vi.fn(async () => LIST)
    const { container } = renderPanel({ listTests, watchTestRuns: feed.watchTestRuns })
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
    await click(molId(container, 'tests-bar-toggle'))
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
    const { container } = renderPanel({
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
    const runTests = vi.fn((_selection: TestSelection, onEvent: typeof emit) => {
      emit = onEvent
      return { cancel }
    })
    const { container } = renderPanel({
      listTests: vi.fn(async () => LIST),
      runTests,
      watchTestRuns: feed.watchTestRuns,
    })
    command(container, '/test')
    const run = await vi.waitFor(() => {
      const button = molId(container, `tests-card-run-${HOME}`)
      expect(button).not.toBeNull()
      return button as HTMLElement
    })
    await click(run)
    // The echo of this very run reaches the panel before its own stream does.
    feed.emit({ type: 'start', runId: 'own-1', ids: [HOME], source: 'person' })
    emit({ type: 'start', runId: 'own-1', ids: [HOME] })
    feed.emit({ type: 'result', runId: 'own-1', id: HOME, status: 'failed', failed: 1 })
    act(() => {
      emit({ type: 'result', id: HOME, status: 'passed', passed: 1 })
      emit({ type: 'done', outcome: 'completed', passed: 1 })
    })
    feed.emit({ type: 'done', runId: 'own-1', outcome: 'completed', failed: 1 })
    await vi.waitFor(() => expect(molId(container, 'tests-card-running')).toBeNull())
    expect(molId(container, 'tests-card-summary')?.textContent).toContain('1 passed')
    expect(molId(container, 'tests-card-summary')?.textContent).not.toContain('failed')
  })

  it('keeps own-run suppression through a synthetic feed done and replayed start', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const { container } = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        emit = onEvent
        return { cancel: () => {} }
      },
    })
    await openTests(container)
    await click(molId(container, `tests-card-run-${HOME}`))
    act(() => emit({ type: 'start', runId: 'own-1', ids: [HOME] }))
    feed.emit({ type: 'start', runId: 'own-1', ids: [HOME], source: 'person' })
    // A disconnect ends the feed copy synthetically; reconnect replays its start.
    feed.emit({ type: 'done', runId: 'own-1', outcome: 'error', error: 'feed disconnected' })
    feed.emit({ type: 'start', runId: 'own-1', ids: [HOME], source: 'person' })
    await flush()
    await click(molId(container, 'tests-card-cancel'))
    act(() => emit({ type: 'done', outcome: 'cancelled' }))
    expect(molId(container, 'tests-card-running')).toBeNull()
    expect(molId(container, 'tests-card-cancelled')?.textContent).toBe('Run stopped.')
    expect(molId(container, 'tests-card-cancel')).toBeNull()
    expect((molId(container, `tests-card-run-${HOME}`) as HTMLButtonElement).disabled).toBe(false)
  })

  it('bounds own-run ids when no feed echo arrives but still suppresses recent echoes', async () => {
    const feed = fakeFeed()
    const emitters: Array<(event: TestRunEvent) => void> = []
    const { container } = renderPanel({
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
      await click(molId(container, `tests-card-run-${HOME}`))
      act(() => {
        emitters[index]?.({ type: 'start', runId: `own-${index}`, ids: [HOME] })
        emitters[index]?.({ type: 'result', id: HOME, status: 'passed', passed: 1 })
        emitters[index]?.({ type: 'done', outcome: 'completed', passed: 1 })
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
    await flush()
    expect(molId(container, 'tests-card-command')?.textContent).toBe('replayed oldest run')
    // The newest own run remains guarded against its delayed feed copy.
    feed.emit({ type: 'result', runId: 'own-32', id: HOME, status: 'failed', failed: 1 })
    await flush()
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Running…')
    // 33 runs through the whole panel: 6.6 s measured under a loaded machine (load 75), past vitest's 5 s default.
  }, 30_000)

  it('an agent run that starts during the person’s run waits for it, then takes the card', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const runTests = vi.fn((_selection: TestSelection, onEvent: typeof emit) => {
      emit = onEvent
      return { cancel: () => {} }
    })
    const { container } = renderPanel({
      listTests: vi.fn(async () => LIST),
      runTests,
      watchTestRuns: feed.watchTestRuns,
    })
    command(container, '/test')
    await click(
      await vi.waitFor(() => {
        const button = molId(container, `tests-card-run-${HOME}`)
        expect(button).not.toBeNull()
        return button as HTMLElement
      }),
    )
    act(() => emit({ type: 'start', runId: 'own-1', ids: [HOME] }))
    feed.emit({ type: 'start', runId: 'agent-1', ids: [], source: 'agent' })
    feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed', passed: 2 })
    await flush()
    // The person's own run keeps the card, and its Stop.
    expect(molId(container, 'tests-card-running')?.textContent).not.toContain('is running tests')
    expect(molId(container, 'tests-card-cancel')).not.toBeNull()
    act(() => {
      emit({ type: 'result', id: HOME, status: 'passed', passed: 1 })
      emit({ type: 'done', outcome: 'completed', passed: 1 })
    })
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
    const panel = renderPanel({ listTests, runTests, watchTestRuns: first.watchTestRuns })
    await openTests(panel.container)
    await click(molId(panel.container, `tests-card-run-${HOME}`))
    act(() => emit({ type: 'start', runId: 'A', eventId: '1-0', ids: [HOME] }))
    first.emit({ type: 'start', runId: 'B', eventId: '2-0', ids: [HOME], source: 'platform' })
    first.emit({ type: 'done', runId: 'B', eventId: '3-0', outcome: 'cancelled' })
    act(() => {
      emit({ type: 'result', eventId: '4-0', id: HOME, status: 'passed', passed: 1 })
      emit({ type: 'done', eventId: '5-0', outcome: 'completed' })
    })
    expect(molId(panel.container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')

    const replay = fakeFeed()
    panel.setProps({ watchTestRuns: replay.watchTestRuns })
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
    await flush()
    expect(molId(panel.container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
  })

  it('a reconnect with no new events leaves the visible card unchanged', async () => {
    const events: TestRunFeedEvent[] = [
      { type: 'start', runId: 'A', ids: [HOME], source: 'agent' },
      { type: 'result', runId: 'A', id: HOME, status: 'passed', passed: 1 },
      { type: 'done', runId: 'A', outcome: 'completed' },
    ]
    const first = fakeFeed(events)
    const listTests = async (): Promise<TestList> => LIST
    const panel = renderPanel({ listTests, watchTestRuns: first.watchTestRuns })
    await openTests(panel.container)
    const before = molId(panel.container, 'tests-card')?.textContent
    const replay = fakeFeed(events)
    panel.setProps({ watchTestRuns: replay.watchTestRuns })
    await vi.waitFor(() => expect(first.unsubscribed()).toBe(1))
    expect(molId(panel.container, 'tests-card')?.textContent).toBe(before)
  })

  it('40 completed own runs never evict the active own-run id', async () => {
    const feed = fakeFeed()
    const emitters: Array<(event: TestRunEvent) => void> = []
    const { container } = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        emitters.push(onEvent)
        return { cancel: () => {} }
      },
    })
    await openTests(container)
    for (let index = 0; index < 40; index += 1) {
      await click(molId(container, `tests-card-run-${HOME}`))
      act(() => {
        emitters[index]?.({ type: 'start', runId: `own-${index}`, ids: [HOME] })
        emitters[index]?.({ type: 'result', id: HOME, status: 'passed', passed: 1 })
        emitters[index]?.({ type: 'done', outcome: 'completed' })
      })
    }
    await click(molId(container, `tests-card-run-${HOME}`))
    act(() => emitters[40]?.({ type: 'start', runId: 'active', ids: [HOME] }))
    feed.emit({ type: 'start', runId: 'active', ids: [HOME], source: 'person' })
    await flush()
    await click(molId(container, 'tests-card-cancel'))
    expect(molId(container, 'tests-card-running')).toBeNull()
    expect(molId(container, 'tests-card-cancelled')?.textContent).toBe('Run stopped.')
  })

  it('a start delayed past cancellation remains a completed own run', async () => {
    const feed = fakeFeed()
    let emit: (event: TestRunEvent) => void = () => {}
    const { container } = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        emit = onEvent
        return { cancel: () => {} }
      },
    })
    await openTests(container)
    await click(molId(container, `tests-card-run-${HOME}`))
    await click(molId(container, 'tests-card-cancel'))
    act(() => emit({ type: 'start', runId: 'cancelled', ids: [HOME] }))
    feed.emit({ type: 'start', runId: 'cancelled', ids: [HOME], source: 'person' })
    await flush()
    expect(molId(container, 'tests-card-running')).toBeNull()
    expect(molId(container, 'tests-card-cancel')).toBeNull()
  })

  it('a host failure after the own start retires the active id and ends the row', async () => {
    const feed = fakeFeed()
    const { container } = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        onEvent({ type: 'start', runId: 'broken', ids: [HOME] })
        throw new Error('stream failed after start')
      },
    })
    await openTests(container)
    await click(molId(container, `tests-card-run-${HOME}`))
    expect(molId(container, 'tests-card-running')).toBeNull()
    expect(molId(container, 'tests-card-run-error')?.textContent).toBe('stream failed after start')
    feed.emit({ type: 'start', runId: 'broken', ids: [HOME], source: 'person' })
    await flush()
    expect(molId(container, 'tests-card-running')).toBeNull()
  })

  it('Sol 3: delayed starts of cancelled runs cannot evict the active own-run id', async () => {
    const feed = fakeFeed()
    const emitters: Array<(event: TestRunEvent) => void> = []
    const { container } = renderPanel({
      listTests: async () => LIST,
      watchTestRuns: feed.watchTestRuns,
      runTests: (_selection, onEvent) => {
        emitters.push(onEvent)
        return { cancel: () => {} }
      },
    })
    await openTests(container)
    for (let index = 0; index < 32; index += 1) {
      await click(molId(container, `tests-card-run-${HOME}`))
      await click(molId(container, 'tests-card-cancel'))
    }
    await click(molId(container, `tests-card-run-${HOME}`))
    act(() => emitters[32]?.({ type: 'start', runId: 'active', ids: [HOME] }))
    act(() => {
      for (let index = 0; index < 32; index += 1) {
        emitters[index]?.({ type: 'start', runId: `cancelled-${index}`, ids: [HOME] })
      }
    })
    feed.emit({ type: 'start', runId: 'active', ids: [HOME], source: 'person' })
    await flush()
    await click(molId(container, 'tests-card-cancel'))
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
    const { container } = renderPanel({ listTests: async () => LIST, runTests })
    await openTests(container)
    await click(molId(container, `tests-card-run-${HOME}`))
    await vi.waitFor(() => expect(molId(container, 'tests-card-run-error')).not.toBeNull())
    await click(molId(container, `tests-card-run-${HOME}`))
    expect(runTests).toHaveBeenCalledTimes(2)
  })

  it('unsubscribes when the panel unmounts', async () => {
    const feed = fakeFeed()
    const { unmount } = renderPanel({
      listTests: vi.fn(async () => LIST),
      watchTestRuns: feed.watchTestRuns,
    })
    await flush()
    unmount()
    mounted = null
    expect(feed.unsubscribed()).toBe(1)
  })
})
