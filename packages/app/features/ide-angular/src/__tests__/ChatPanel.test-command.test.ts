// @vitest-environment jsdom
/**
 * `/test` must OPEN THE TESTS BROWSER, not spend an agent turn.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.test-command.test.tsx`
 * with the same test names and the same assertions, mounted through Angular's
 * own `createApplication` (see `chat-panel-harness.ts`).
 *
 * It mounts the real {@link ChatPanel}, types `/test`, and asserts the browser
 * opened, the host's `listTests` was called, and NOTHING was sent to the chat.
 * The run-state tests drive the host's run stream by hand and assert the same
 * verdicts, controls and exit states React's suite pins.
 *
 * The panel's state changes reach the DOM through Angular's zoneless change
 * detection, which runs after an event rather than inside it, so each ported
 * React `act(...)` or synchronous post-event assertion is followed by
 * {@link settle} — the one framework-forced difference.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { ChangeDetectionStrategy, Component } from '@angular/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatProvider } from '@molecule/app-ai-chat'
import { resetChatStoresForTests } from '@molecule/app-angular'
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
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { ChatNativeTests } from '../components/chat-panel/chat-inner-state.js'
import {
  buildChatProvider as buildHarnessChatProvider,
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  PANEL_TEST_TIMEOUT_MS,
  type PanelMount,
  settle,
  submit,
} from './chat-panel-harness.js'

const PROJECT_ID = 'proj-test-command'

const HOME = 'my-app/app:e2e/home.spec.ts'
const ROUTES = 'my-app/api:src/routes.test.ts'

const LIST: TestList = {
  tests: [
    {
      id: HOME,
      file: 'e2e/home.spec.ts',
      kind: 'e2e',
      workspace: 'my-app/app',
      workspaceLabel: 'my-app/app',
      title: 'home',
    },
    {
      id: ROUTES,
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

/** Everything the panel tries to send to the chat. */
const sent: string[] = []

/** A chat provider that records anything the panel tries to send. */
function buildChatProvider(): ChatProvider {
  return {
    ...buildHarnessChatProvider([]),
    sendMessage: async (message, _config, onEvent): Promise<void> => {
      sent.push(message)
      onEvent({ type: 'done' })
    },
  }
}

/** The host's durable test history (React passes an element; Angular a component). */
const DurableNativeHistory = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-durable-native-history',
  standalone: true,
  template: `<section data-testid="durable-native-history">Native invocation · exit 0 · test results not recorded</section>`,
})(class DurableNativeHistoryComponent {})

/** The host's own status strip: its button opens the panel's tests browser. */
const NativeTestStatus = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-native-test-status',
  standalone: true,
  inputs: ['open'],
  template: `<button type="button" (click)="open?.()">Native test history</button>`,
})(
  class NativeTestStatusComponent {
    /** The panel's browser opener (supplied by `NgComponentOutlet`'s inputs). */
    open?: () => void
  },
)

/** The options the render helper takes (React's `renderPanel` arguments). */
interface RenderOptions {
  /** Lists the project's tests. */
  listTests: () => Promise<TestList>
  /** Runs a selection. */
  runTests?: (selection: TestSelection, onEvent: (event: TestRunEvent) => void) => TestRunHandle
  /** Whether this viewer may run tests. */
  canRunTests?: boolean
  /** The project-wide run feed. */
  watchTestRuns?: (onEvent: (event: TestRunFeedEvent) => void) => () => void
  /** The host's own durable history surface. */
  nativeTests?: ChatNativeTests
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/**
 * Mounts the panel with the tests host callbacks wired (React's `renderPanel`).
 *
 * @param options - The recorded callbacks and gates.
 * @returns The mount.
 */
async function renderPanel(options: RenderOptions): Promise<PanelMount> {
  if (mounted) {
    mounted.unmount()
    mounted = null
  }
  mounted = await mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider(),
    props: {
      projectId: PROJECT_ID,
      listTests: options.listTests,
      runTests: options.runTests ?? ((): TestRunHandle => ({ cancel: () => {} })),
      canRunTests: options.canRunTests ?? true,
      watchTestRuns: options.watchTestRuns,
      nativeTests: options.nativeTests,
      testsAvailable: true,
    },
  })
  await settle(mounted)
  return { ...mounted, container: mounted.container.ownerDocument.body }
}

/**
 * One element by its `data-mol-id`.
 *
 * @param container - The mount container.
 * @param id - The id.
 * @returns The element, or null.
 */
const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

/**
 * One button by its `data-mol-id`.
 *
 * @param container - The mount container.
 * @param id - The id.
 * @returns The button, or null.
 */
const buttonId = (container: HTMLElement, id: string): HTMLButtonElement | null =>
  container.querySelector<HTMLButtonElement>(`[data-mol-id="${id}"]`)

/**
 * The tests strip's summary text. Angular's strip is an overlay button whose
 * accessible name is its `aria-labelledby` label (React puts the same text
 * inside the toggle element), so this reads the accessible text React's
 * toggle carries.
 *
 * @param container - The mount container.
 * @returns The strip's one-line summary.
 */
function barLabelText(container: HTMLElement): string {
  const toggle = molId(container, 'tests-bar-toggle')
  const labelledBy = toggle?.getAttribute('aria-labelledby')
  const label = labelledBy ? container.querySelector(`#${CSS.escape(labelledBy)}`) : null
  return label?.textContent ?? toggle?.textContent ?? ''
}

/**
 * Clicks an element by its `data-mol-id`, then lets the panel settle.
 *
 * @param container - The mount container.
 * @param id - The id.
 */
async function click(container: HTMLElement, id: string): Promise<void> {
  const element = molId(container, id)
  expect(element, `[data-mol-id="${id}"] must be mounted`).not.toBeNull()
  element?.click()
  await settle(mounted)
}

/**
 * Types a command into the composer, submits it, and settles.
 *
 * @param container - The mount container.
 * @param text - The command text.
 */
async function submitCommand(container: HTMLElement, text: string): Promise<void> {
  submit(container, text)
  await settle(mounted)
}

/**
 * Vitest's `waitFor` with a load-tolerant timeout: this machine runs many packages'
 * suites at once, and the default 1 s window is too tight for a mount under load.
 *
 * @param callback - The assertion to retry until it passes.
 * @returns Resolves once the assertion passes.
 */
const waitFor = (callback: () => void): Promise<void> => vi.waitFor(callback, { timeout: 5_000 })

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

afterEach(() => {
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
  resetChatStoresForTests()
})

describe('the /test command', () => {
  it(
    'opens durable host test history from its status strip for a viewer and retains it after remount',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const listTests = vi.fn(async () => LIST)
      const nativeTests = {
        visible: true,
        history: DurableNativeHistory,
        renderStatus: NativeTestStatus,
      } as never
      const openHistory = async (mount: PanelMount): Promise<void> => {
        const status = Array.from(mount.container.querySelectorAll('button')).find(
          (button) => button.textContent === 'Native test history',
        )
        expect(status, 'the host status strip must render').not.toBeUndefined()
        status?.click()
        await settle(mount)
      }
      const first = await renderPanel({ listTests, canRunTests: false, nativeTests })
      await openHistory(first)
      await waitFor(() =>
        expect(
          first.container.querySelector('[data-testid="durable-native-history"]')?.textContent,
        ).toContain('test results not recorded'),
      )
      expect(sent).toEqual([])
      first.unmount()
      mounted = null
      const second = await renderPanel({ listTests, canRunTests: false, nativeTests })
      await openHistory(second)
      await waitFor(() =>
        expect(
          second.container.querySelector('[data-testid="durable-native-history"]')?.textContent,
        ).toContain('exit 0'),
      )
      second.unmount()
      mounted = null
    },
  )

  it(
    'lists tests and accepts run events after effects reconnect',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      let emit: (event: TestRunEvent) => void = () => {}
      const cancel = vi.fn()
      const listTests = vi.fn(async () => LIST)
      const runTests = vi.fn((_selection: TestSelection, onEvent: typeof emit) => {
        emit = onEvent
        return { cancel }
      })
      const mount = await renderPanel({ listTests, runTests })
      const { container } = mount
      await submitCommand(container, '/test')
      await waitFor(() => expect(listTests).toHaveBeenCalled())
      expect(molId(container, 'tests-card')).not.toBeNull()
      await waitFor(() => expect(molId(container, `tests-card-run-${HOME}`)).not.toBeNull())
      await click(container, `tests-card-run-${HOME}`)
      expect(runTests).toHaveBeenCalledWith({ ids: [HOME] }, expect.any(Function))
      emit({ type: 'start', runId: 'manual-run', ids: [HOME] })
      emit({
        type: 'result',
        id: HOME,
        status: 'passed',
        passed: 1,
        failed: 0,
        skipped: 0,
      })
      emit({ type: 'done', outcome: 'completed', passed: 1, failed: 0, skipped: 0 })
      await settle(mount)
      await waitFor(() => expect(molId(container, 'tests-card-running')).toBeNull())
      expect(molId(container, 'tests-card-summary')?.textContent).toContain('1 passed')
      await click(container, `tests-card-run-${HOME}`)
      mount.unmount()
      mounted = null
      expect(cancel).toHaveBeenCalledTimes(1)
    },
  )

  it(
    'opens the tests browser with one click on the not-run summary',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const listTests = vi.fn(async () => LIST)
      const runTests = vi.fn((): TestRunHandle => ({ cancel: () => {} }))
      const { container } = await renderPanel({ listTests, runTests })
      await waitFor(() => {
        expect(barLabelText(container)).toContain('not run yet')
      })
      expect(molId(container, 'tests-card')).toBeNull()
      await click(container, 'tests-bar-toggle')
      await waitFor(() => expect(molId(container, 'tests-card')).not.toBeNull())
      expect(molId(container, 'tests-bar-open')).toBeNull()
      expect(molId(container, 'tests-bar-detail')).toBeNull()
      expect(runTests).not.toHaveBeenCalled()
      expect(sent).toEqual([])
    },
  )

  it('is registered once, with its alias and the browser usage', () => {
    const defs = COMMANDS.filter((command) => command.id === 'test')
    expect(defs, 'exactly one /test command').toHaveLength(1)
    expect(defs[0]?.label).toBe('/test')
    expect(defs[0]?.aliases).toContain('tests')
    expect(defs[0]?.usage).toBe('/test [query | all]')
    // A viewer may read the listing; the card disables running for them.
    expect(defs[0]?.viewerSafe).toBe(true)
    // No second command was minted for the same job.
    expect(COMMANDS.map((command) => command.id)).not.toContain('tests')
  })

  it(
    'opens the tests browser and sends NOTHING to the agent',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const listTests = vi.fn(async () => LIST)
      const { container } = await renderPanel({ listTests })
      await submitCommand(container, '/test')

      await waitFor(() => {
        expect(molId(container, 'tests-card')).not.toBeNull()
      })
      expect(listTests).toHaveBeenCalled()
      // The old behaviour: a natural-language "run npm test" message to Synthase.
      expect(sent).toEqual([])
      expect(container.textContent).not.toContain('npm test')
    },
  )

  it(
    'says so, rather than spinning, for a host that wires no discovery',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const mount = await mountPanel({
        http: buildRejectingHttpClient(),
        chat: buildChatProvider(),
        props: { projectId: PROJECT_ID },
      })
      mounted?.unmount()
      mounted = mount
      await settle(mount)
      await submitCommand(mount.container, '/test')
      await waitFor(() => {
        expect(molId(mount.container.ownerDocument.body, 'tests-card-error')).not.toBeNull()
      })
      expect(sent).toEqual([])
    },
  )

  it('seeds the search from /test <query>', { timeout: PANEL_TEST_TIMEOUT_MS }, async () => {
    const { container } = await renderPanel({ listTests: async () => LIST })
    await submitCommand(container, '/test routes')
    await waitFor(() => {
      expect(molId(container, 'tests-card')).not.toBeNull()
    })
    expect(
      container.querySelector<HTMLInputElement>('[data-mol-id="tests-card-search"]')?.value,
    ).toBe('routes')
  })

  it('/tests is the same command, via the alias', { timeout: PANEL_TEST_TIMEOUT_MS }, async () => {
    const listTests = vi.fn(async () => LIST)
    const { container } = await renderPanel({ listTests })
    await submitCommand(container, '/tests')
    await waitFor(() => {
      expect(molId(container, 'tests-card')).not.toBeNull()
    })
    expect(sent).toEqual([])
  })

  it('/test all runs everything straight away', { timeout: PANEL_TEST_TIMEOUT_MS }, async () => {
    const selections: TestSelection[] = []
    const { container } = await renderPanel({
      listTests: async () => LIST,
      runTests: (selection) => {
        selections.push(selection)
        return { cancel: () => {} }
      },
    })
    await submitCommand(container, '/test all')
    await waitFor(() => {
      expect(selections).toEqual([{ kind: 'all' }])
    })
    expect(molId(container, 'tests-card')).not.toBeNull()
    expect(sent).toEqual([])
  })

  it(
    're-running /test re-lists, and the run in flight survives it',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const listTests = vi.fn(async () => LIST)
      let emit: (event: TestRunEvent) => void = () => {}
      const { container } = await renderPanel({
        listTests,
        runTests: (_selection, onEvent) => {
          emit = onEvent
          return { cancel: () => {} }
        },
      })
      await submitCommand(container, '/test all')
      await waitFor(() => {
        expect(molId(container, 'tests-card')).not.toBeNull()
      })
      emit({ type: 'start', runId: 'r1', ids: [HOME] })
      await settle(mounted)
      await waitFor(() => {
        expect(molId(container, 'tests-card-running')).not.toBeNull()
      })

      const listCallsBefore = listTests.mock.calls.length
      await submitCommand(container, '/test')
      await waitFor(() => {
        expect(listTests.mock.calls.length).toBeGreaterThan(listCallsBefore)
      })
      // The run is still live — re-listing must not throw it away.
      expect(molId(container, 'tests-card-running')).not.toBeNull()

      emit({
        type: 'result',
        id: HOME,
        status: 'passed',
        passed: 1,
        failed: 0,
        skipped: 0,
      })
      emit({ type: 'done', outcome: 'completed', passed: 1, failed: 0, skipped: 0 })
      await settle(mounted)
      await waitFor(() => {
        expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
      })
    },
  )
})

describe('every test run in the project reaches the test view', () => {
  /** A host feed the test drives by hand; it records unsubscribes. */
  function fakeFeed(replay: TestRunFeedEvent[] = []): {
    watchTestRuns: NonNullable<RenderOptions['watchTestRuns']>
    emitSync: (event: TestRunFeedEvent) => void
    emit: (event: TestRunFeedEvent) => Promise<void>
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
      emitSync: (event) => listener?.(event),
      emit: async (event) => {
        listener?.(event)
        await settle(mounted)
      },
      unsubscribed: () => unsubscribes,
    }
  }

  /** Open the browser and wait for its discovered rows. */
  async function openTests(container: HTMLElement): Promise<void> {
    await submitCommand(container, '/test')
    await waitFor(() => expect(molId(container, `tests-card-run-${HOME}`)).not.toBeNull())
  }

  it(
    'a cancelled own run’s delayed done cannot cancel a finished watched run',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const feed = fakeFeed()
      let emit: (event: TestRunEvent) => void = () => {}
      const cancel = vi.fn()
      const { container } = await renderPanel({
        listTests: async () => LIST,
        watchTestRuns: feed.watchTestRuns,
        runTests: (_selection, onEvent) => {
          emit = onEvent
          return { cancel }
        },
      })
      await openTests(container)
      await click(container, `tests-card-run-${HOME}`)
      emit({ type: 'start', runId: 'own-1', ids: [HOME] })
      await settle(mounted)
      await feed.emit({ type: 'start', runId: 'agent-1', ids: [ROUTES], source: 'agent' })
      await click(container, 'tests-card-cancel')
      expect(cancel).toHaveBeenCalledTimes(1)
      expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
      expect(molId(container, 'tests-card-cancel')).toBeNull()
      await feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed' })
      await feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed' })
      const completed = molId(container, 'tests-card-summary')?.textContent
      emit({ type: 'done', outcome: 'cancelled' })
      await settle(mounted)
      expect(molId(container, 'tests-card-summary')?.textContent).toBe(completed)
      expect(molId(container, 'tests-card-cancelled')).toBeNull()
      expect(molId(container, `tests-card-status-${ROUTES}`)?.textContent).toBe('Passed')
      expect(buttonId(container, `tests-card-run-${HOME}`)?.disabled).toBe(false)
      await click(container, 'panel-overlay-close')
      expect(molId(container, 'tests-bar')?.getAttribute('data-tests-tone')).toBe('passing')
    },
  )

  it(
    'late events from a stopped invocation cannot finish or take controls from the next own run',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const emitters: Array<(event: TestRunEvent) => void> = []
      const cancels = [vi.fn(), vi.fn()]
      const skips = [vi.fn(), vi.fn()]
      const { container } = await renderPanel({
        listTests: async () => LIST,
        runTests: (_selection, onEvent) => {
          const index = emitters.push(onEvent) - 1
          return { cancel: cancels[index]!, skipCurrent: skips[index]! }
        },
      })
      await openTests(container)
      await click(container, `tests-card-run-${HOME}`)
      emitters[0]!({ type: 'start', runId: 'own-1', ids: [HOME] })
      await settle(mounted)
      await click(container, 'tests-card-cancel')
      await click(container, `tests-card-run-${ROUTES}`)
      emitters[1]!({ type: 'start', runId: 'own-2', ids: [ROUTES] })
      emitters[0]!({ type: 'output', id: HOME, chunk: 'late old output' })
      emitters[0]!({ type: 'result', id: HOME, status: 'skipped', skipped: 1 })
      emitters[0]!({ type: 'done', outcome: 'cancelled' })
      await settle(mounted)
      expect(molId(container, 'tests-card-running')).not.toBeNull()
      expect(molId(container, `tests-card-case-${HOME}`)).toBeNull()
      expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Skipped')
      await click(container, `tests-card-skip-${ROUTES}`)
      expect(skips[1]).toHaveBeenCalledTimes(1)
      expect(skips[0]).not.toHaveBeenCalled()
      await click(container, 'tests-card-cancel')
      expect(cancels[0]).toHaveBeenCalledTimes(1)
      expect(cancels[1]).toHaveBeenCalledTimes(1)
    },
  )

  it(
    'keeps a newer outside verdict for a file the own run already finished',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const feed = fakeFeed()
      let emit: (event: TestRunEvent) => void = () => {}
      const { container } = await renderPanel({
        listTests: async () => LIST,
        watchTestRuns: feed.watchTestRuns,
        runTests: (_selection, onEvent) => {
          emit = onEvent
          return { cancel: () => {} }
        },
      })
      await openTests(container)
      await click(container, 'tests-card-run-all')
      emit({ type: 'start', runId: 'own-1', ids: [HOME, ROUTES] })
      emit({ type: 'result', id: HOME, status: 'failed', output: 'old failure' })
      emit({ type: 'output', id: ROUTES, chunk: 'still running' })
      await settle(mounted)
      await feed.emit({ type: 'start', runId: 'platform-1', ids: [HOME], source: 'platform' })
      await feed.emit({ type: 'result', runId: 'platform-1', id: HOME, status: 'passed' })
      expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
      expect(molId(container, 'tests-card-cancel')).not.toBeNull()
      await feed.emit({ type: 'result', runId: 'platform-1', id: ROUTES, status: 'failed' })
      expect(molId(container, `tests-card-status-${ROUTES}`)?.textContent).toBe('Failed')
      await feed.emit({ type: 'done', runId: 'platform-1', outcome: 'completed' })
      emit({ type: 'result', id: ROUTES, status: 'passed' })
      emit({ type: 'done', outcome: 'completed' })
      await settle(mounted)
      expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
      expect(molId(container, 'tests-card-summary')?.textContent).toContain('2 passed')
      expect(molId(container, `tests-card-fix-${HOME}`)).toBeNull()
      await click(container, 'panel-overlay-close')
      expect(molId(container, 'tests-bar')?.getAttribute('data-tests-tone')).toBe('passing')
    },
  )

  it(
    'keeps a completed watched run’s verdict when the displayed run ends without one',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const feed = fakeFeed()
      const { container } = await renderPanel({
        listTests: async () => LIST,
        watchTestRuns: feed.watchTestRuns,
      })
      await openTests(container)
      await feed.emit({ type: 'start', runId: 'agent-a', ids: [HOME], source: 'agent' })
      await feed.emit({ type: 'start', runId: 'platform-b', ids: [HOME], source: 'platform' })
      await feed.emit({
        type: 'result',
        runId: 'platform-b',
        id: HOME,
        status: 'passed',
        passed: 1,
      })
      await feed.emit({ type: 'done', runId: 'platform-b', outcome: 'completed' })
      // B reported after A started, so its verdict is already the latest one.
      expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
      await feed.emit({ type: 'done', runId: 'agent-a', outcome: 'cancelled' })
      expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
      expect(buttonId(container, `tests-card-run-${HOME}`)?.disabled).toBe(false)
    },
  )

  it(
    'shows both live discovered files instead of inherited verdicts when a watched run names no ids',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const feed = fakeFeed([
        { type: 'start', runId: 'previous', ids: [HOME, ROUTES], source: 'platform' },
        { type: 'result', runId: 'previous', id: HOME, status: 'passed' },
        { type: 'result', runId: 'previous', id: ROUTES, status: 'failed' },
        { type: 'done', runId: 'previous', outcome: 'completed' },
      ])
      const { container } = await renderPanel({
        listTests: async () => LIST,
        watchTestRuns: feed.watchTestRuns,
      })
      await openTests(container)
      await feed.emit({ type: 'start', runId: 'agent-1', ids: [], source: 'agent' })
      await feed.emit({
        type: 'case',
        runId: 'agent-1',
        id: HOME,
        title: 'opens home',
        status: 'running',
      })
      await feed.emit({
        type: 'case',
        runId: 'agent-1',
        id: ROUTES,
        title: 'serves routes',
        status: 'running',
      })
      expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Running…')
      expect(molId(container, `tests-card-case-title-${HOME}`)?.textContent).toBe('opens home')
      expect(molId(container, `tests-card-status-${ROUTES}`)?.textContent).toBe('Running…')
      await feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed' })
      expect(molId(container, `tests-card-status-${ROUTES}`)?.textContent).toBe('Passed')
      expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Running…')
      await feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed' })
      expect(buttonId(container, `tests-card-run-${HOME}`)?.disabled).toBe(false)
    },
  )

  it(
    'hands a failed own start to a synchronously buffered live outside run and prunes ended runs',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const feed = fakeFeed()
      const runTests = vi.fn((): TestRunHandle => {
        feed.emitSync({ type: 'start', runId: 'ended', ids: [HOME], source: 'platform' })
        feed.emitSync({ type: 'result', runId: 'ended', id: HOME, status: 'failed' })
        feed.emitSync({ type: 'done', runId: 'ended', outcome: 'completed' })
        feed.emitSync({ type: 'start', runId: 'agent-1', ids: [ROUTES], source: 'agent' })
        throw new Error('own start failed')
      })
      const { container } = await renderPanel({
        listTests: async () => LIST,
        runTests,
        watchTestRuns: feed.watchTestRuns,
      })
      await openTests(container)
      await click(container, `tests-card-run-${HOME}`)
      expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
      expect(molId(container, 'tests-card-cancel')).toBeNull()
      expect(buttonId(container, `tests-card-run-${HOME}`)?.disabled).toBe(true)
      await submitCommand(container, '/test all')
      expect(runTests).toHaveBeenCalledTimes(1)
      await feed.emit({ type: 'result', runId: 'agent-1', id: HOME, status: 'passed' })
      await feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed' })
      expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
      // A pruned run can receive a trailing done, but must not replay its old failure.
      await feed.emit({ type: 'done', runId: 'ended', outcome: 'completed' })
      expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
    },
  )

  it(
    'does not install a completed own run’s returned handle onto a watched run',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const feed = fakeFeed()
      const cancel = vi.fn()
      const skipCurrent = vi.fn()
      const mount = await renderPanel({
        listTests: async () => LIST,
        watchTestRuns: feed.watchTestRuns,
        runTests: (_selection, onEvent) => {
          onEvent({ type: 'start', runId: 'own-1', ids: [HOME] })
          feed.emitSync({ type: 'start', runId: 'agent-1', ids: [ROUTES], source: 'agent' })
          onEvent({ type: 'result', id: HOME, status: 'passed' })
          onEvent({ type: 'done', outcome: 'completed' })
          return { cancel, skipCurrent }
        },
      })
      const { container } = mount
      await openTests(container)
      await click(container, `tests-card-run-${HOME}`)
      expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
      expect(molId(container, `tests-card-skip-${ROUTES}`)).toBeNull()
      expect(molId(container, 'tests-card-cancel')).toBeNull()
      await feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed' })
      await feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed' })
      expect(buttonId(container, `tests-card-run-${HOME}`)?.disabled).toBe(false)
      mount.unmount()
      mounted = null
      expect(cancel).not.toHaveBeenCalled()
      expect(skipCurrent).not.toHaveBeenCalled()
    },
  )

  it(
    'keeps an isolated start failure visible and lets the person retry, Skip, and Stop',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
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
      const { container } = await renderPanel({ listTests: async () => LIST, runTests })
      await openTests(container)
      await click(container, 'tests-card-run-all')
      expect(molId(container, 'tests-card-run-error')?.textContent).toBe('own start failed')
      expect(molId(container, 'tests-card-running')).toBeNull()
      await click(container, 'tests-card-run-all')
      emit({ type: 'start', runId: 'retry', ids: [HOME, ROUTES] })
      emit({ type: 'case', id: HOME, title: 'opens home', status: 'running' })
      await settle(mounted)
      await click(container, `tests-card-skip-${HOME}`)
      expect(skipCurrent).toHaveBeenCalledTimes(1)
      expect(molId(container, `tests-card-skip-${HOME}`)?.textContent).toBe('Skipping…')
      emit({ type: 'result', id: HOME, status: 'skipped', skipped: 1 })
      emit({ type: 'case', id: ROUTES, title: 'serves routes', status: 'running' })
      await settle(mounted)
      expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Skipped')
      expect(molId(container, `tests-card-skip-${ROUTES}`)?.textContent).toBe('Skip')
      await click(container, 'tests-card-cancel')
      expect(cancel).toHaveBeenCalledTimes(1)
      expect(molId(container, 'tests-card-cancelled')?.textContent).toBe('Run stopped.')
    },
  )

  it(
    'a synchronous cancel callback cannot overwrite the watched run handed the card',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const feed = fakeFeed()
      let emit: (event: TestRunEvent) => void = () => {}
      const cancel = vi.fn(() => emit({ type: 'done', outcome: 'cancelled' }))
      const { container } = await renderPanel({
        listTests: async () => LIST,
        watchTestRuns: feed.watchTestRuns,
        runTests: (_selection, onEvent) => {
          emit = onEvent
          return { cancel }
        },
      })
      await openTests(container)
      await click(container, `tests-card-run-${HOME}`)
      emit({ type: 'start', runId: 'own-1', ids: [HOME] })
      await settle(mounted)
      await feed.emit({ type: 'start', runId: 'agent-1', ids: [ROUTES], source: 'agent' })
      await click(container, 'tests-card-cancel')
      expect(cancel).toHaveBeenCalledTimes(1)
      expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
      expect(molId(container, 'tests-card-cancel')).toBeNull()
      await feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed' })
      expect(molId(container, 'tests-card-cancelled')).toBeNull()
    },
  )

  it(
    'a previous invocation’s delayed Skip refusal cannot disable Skip on the next own run',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const emitters: Array<(event: TestRunEvent) => void> = []
      let refuseSkip: (accepted: boolean) => void = () => {}
      const skipped = new Promise<boolean>((resolve) => {
        refuseSkip = resolve
      })
      const skipCurrent = vi.fn(() => skipped)
      const { container } = await renderPanel({
        listTests: async () => LIST,
        runTests: (_selection, onEvent) => {
          emitters.push(onEvent)
          return { cancel: () => {}, skipCurrent }
        },
      })
      await openTests(container)
      await click(container, `tests-card-run-${HOME}`)
      emitters[0]!({ type: 'start', runId: 'own-1', ids: [HOME] })
      await settle(mounted)
      await click(container, `tests-card-skip-${HOME}`)
      await click(container, 'tests-card-cancel')
      await click(container, `tests-card-run-${ROUTES}`)
      emitters[1]!({ type: 'start', runId: 'own-2', ids: [ROUTES] })
      refuseSkip(false)
      await skipped
      await settle(mounted)
      expect(molId(container, `tests-card-skip-${ROUTES}`)?.textContent).toBe('Skip')
    },
  )

  it(
    'shows a run the agent started, says who started it, and offers no Stop',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const feed = fakeFeed()
      const listTests = vi.fn(async () => LIST)
      const { container } = await renderPanel({ listTests, watchTestRuns: feed.watchTestRuns })
      await waitFor(() => expect(molId(container, 'tests-bar-toggle')).not.toBeNull())
      await feed.emit({
        type: 'start',
        runId: 'agent-1',
        ids: [],
        source: 'agent',
        command: 'cd api && npx vitest run src/routes.test.ts',
      })
      await feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed', passed: 4 })
      await waitFor(() => expect(barLabelText(container)).toContain('is running tests'))
      expect(molId(container, 'tests-bar-stop')).toBeNull()
      await click(container, 'tests-bar-toggle')
      await waitFor(() => expect(molId(container, 'tests-card')).not.toBeNull())
      expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests')
      expect(molId(container, 'tests-card-command')?.textContent).toBe(
        'cd api && npx vitest run src/routes.test.ts',
      )
      expect(molId(container, 'tests-card-cancel')).toBeNull()
      // Nothing to start while it runs.
      expect(buttonId(container, `tests-card-run-${HOME}`)?.disabled).toBe(true)
      const listedBefore = listTests.mock.calls.length
      await feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed', passed: 4 })
      await waitFor(() => expect(molId(container, 'tests-card-running')).toBeNull())
      expect(molId(container, 'tests-card-summary')?.textContent).toContain('1 passed')
      expect(buttonId(container, `tests-card-run-${HOME}`)?.disabled).toBe(false)
      // An ended run may have followed a newly written spec: the list is refreshed.
      await waitFor(() => expect(listTests.mock.calls.length).toBeGreaterThan(listedBefore))
      expect(sent).toEqual([])
    },
  )

  it(
    'shows the runs the host replays on subscribe',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const feed = fakeFeed([
        { type: 'start', runId: 'platform-1', ids: [ROUTES], source: 'platform' },
        { type: 'result', runId: 'platform-1', id: ROUTES, status: 'failed', failed: 1 },
        { type: 'done', runId: 'platform-1', outcome: 'completed', failed: 1 },
      ])
      const { container } = await renderPanel({
        listTests: vi.fn(async () => LIST),
        watchTestRuns: feed.watchTestRuns,
      })
      await waitFor(() => expect(barLabelText(container)).toContain('1 failing'))
    },
  )

  it(
    'ignores the feed’s copy of its own run, even when the copy arrives first',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const feed = fakeFeed()
      let emit: (event: TestRunEvent) => void = () => {}
      const cancel = vi.fn()
      const runTests = vi.fn((_selection: TestSelection, onEvent: typeof emit) => {
        emit = onEvent
        return { cancel }
      })
      const { container } = await renderPanel({
        listTests: vi.fn(async () => LIST),
        runTests,
        watchTestRuns: feed.watchTestRuns,
      })
      await submitCommand(container, '/test')
      await waitFor(() => expect(molId(container, `tests-card-run-${HOME}`)).not.toBeNull())
      await click(container, `tests-card-run-${HOME}`)
      // The echo of this very run reaches the panel before its own stream does.
      await feed.emit({ type: 'start', runId: 'own-1', ids: [HOME], source: 'person' })
      emit({ type: 'start', runId: 'own-1', ids: [HOME] })
      await settle(mounted)
      await feed.emit({ type: 'result', runId: 'own-1', id: HOME, status: 'failed', failed: 1 })
      emit({ type: 'result', id: HOME, status: 'passed', passed: 1 })
      emit({ type: 'done', outcome: 'completed', passed: 1 })
      await settle(mounted)
      await feed.emit({ type: 'done', runId: 'own-1', outcome: 'completed', failed: 1 })
      await waitFor(() => expect(molId(container, 'tests-card-running')).toBeNull())
      expect(molId(container, 'tests-card-summary')?.textContent).toContain('1 passed')
      expect(molId(container, 'tests-card-summary')?.textContent).not.toContain('failed')
    },
  )

  it(
    'keeps own-run suppression through a synthetic feed done and replayed start',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const feed = fakeFeed()
      let emit: (event: TestRunEvent) => void = () => {}
      const { container } = await renderPanel({
        listTests: async () => LIST,
        watchTestRuns: feed.watchTestRuns,
        runTests: (_selection, onEvent) => {
          emit = onEvent
          return { cancel: () => {} }
        },
      })
      await openTests(container)
      await click(container, `tests-card-run-${HOME}`)
      emit({ type: 'start', runId: 'own-1', ids: [HOME] })
      await settle(mounted)
      await feed.emit({ type: 'start', runId: 'own-1', ids: [HOME], source: 'person' })
      // A disconnect ends the feed copy synthetically; reconnect replays its start.
      await feed.emit({
        type: 'done',
        runId: 'own-1',
        outcome: 'error',
        error: 'feed disconnected',
      })
      await feed.emit({ type: 'start', runId: 'own-1', ids: [HOME], source: 'person' })
      await click(container, 'tests-card-cancel')
      emit({ type: 'done', outcome: 'cancelled' })
      await settle(mounted)
      expect(molId(container, 'tests-card-running')).toBeNull()
      expect(molId(container, 'tests-card-cancelled')?.textContent).toBe('Run stopped.')
      expect(molId(container, 'tests-card-cancel')).toBeNull()
      expect(buttonId(container, `tests-card-run-${HOME}`)?.disabled).toBe(false)
    },
  )

  it(
    'bounds own-run ids when no feed echo arrives but still suppresses recent echoes',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const feed = fakeFeed()
      const emitters: Array<(event: TestRunEvent) => void> = []
      const { container } = await renderPanel({
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
        await click(container, `tests-card-run-${HOME}`)
        emitters[index]!({ type: 'start', runId: `own-${index}`, ids: [HOME] })
        emitters[index]!({ type: 'result', id: HOME, status: 'passed', passed: 1 })
        emitters[index]!({ type: 'done', outcome: 'completed', passed: 1 })
        await settle(mounted)
      }
      // The oldest id has been evicted, so a replay under that id is watchable.
      await feed.emit({
        type: 'start',
        runId: 'own-0',
        ids: [HOME],
        source: 'platform',
        command: 'replayed oldest run',
      })
      expect(molId(container, 'tests-card-command')?.textContent).toBe('replayed oldest run')
      // The newest own run remains guarded against its delayed feed copy.
      await feed.emit({ type: 'result', runId: 'own-32', id: HOME, status: 'failed', failed: 1 })
      expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Running…')
    },
  )

  it(
    'an agent run that starts during the person’s run waits for it, then takes the card',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const feed = fakeFeed()
      let emit: (event: TestRunEvent) => void = () => {}
      const runTests = vi.fn((_selection: TestSelection, onEvent: typeof emit) => {
        emit = onEvent
        return { cancel: () => {} }
      })
      const { container } = await renderPanel({
        listTests: vi.fn(async () => LIST),
        runTests,
        watchTestRuns: feed.watchTestRuns,
      })
      await submitCommand(container, '/test')
      await waitFor(() => expect(molId(container, `tests-card-run-${HOME}`)).not.toBeNull())
      await click(container, `tests-card-run-${HOME}`)
      emit({ type: 'start', runId: 'own-1', ids: [HOME] })
      await settle(mounted)
      await feed.emit({ type: 'start', runId: 'agent-1', ids: [], source: 'agent' })
      await feed.emit({ type: 'result', runId: 'agent-1', id: ROUTES, status: 'passed', passed: 2 })
      // The person's own run keeps the card, and its Stop.
      expect(molId(container, 'tests-card-running')?.textContent).not.toContain('is running tests')
      expect(molId(container, 'tests-card-cancel')).not.toBeNull()
      emit({ type: 'result', id: HOME, status: 'passed', passed: 1 })
      emit({ type: 'done', outcome: 'completed', passed: 1 })
      await settle(mounted)
      await waitFor(() =>
        expect(molId(container, 'tests-card-running')?.textContent).toContain('is running tests'),
      )
      expect(molId(container, 'tests-card-cancel')).toBeNull()
      await feed.emit({ type: 'done', runId: 'agent-1', outcome: 'completed', passed: 2 })
      await waitFor(() => expect(molId(container, 'tests-card-running')).toBeNull())
      expect(molId(container, 'tests-card-summary')?.textContent).toContain('2 passed')
    },
  )

  it(
    'reconnect replay cannot erase a verdict the own stream reported after a cancelled run',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const first = fakeFeed()
      const listTests = async (): Promise<TestList> => LIST
      let emit: (event: TestRunEvent) => void = () => {}
      const runTests = (_selection: TestSelection, onEvent: typeof emit): TestRunHandle => {
        emit = onEvent
        return { cancel: () => {} }
      }
      const mount = await renderPanel({
        listTests,
        runTests,
        watchTestRuns: first.watchTestRuns,
      })
      const { container } = mount
      await openTests(container)
      await click(container, `tests-card-run-${HOME}`)
      emit({ type: 'start', runId: 'A', eventId: '1-0', ids: [HOME] })
      await settle(mount)
      await first.emit({
        type: 'start',
        runId: 'B',
        eventId: '2-0',
        ids: [HOME],
        source: 'platform',
      })
      await first.emit({ type: 'done', runId: 'B', eventId: '3-0', outcome: 'cancelled' })
      emit({ type: 'result', eventId: '4-0', id: HOME, status: 'passed', passed: 1 })
      emit({ type: 'done', eventId: '5-0', outcome: 'completed' })
      await settle(mount)
      expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')

      const replay = fakeFeed()
      mount.props['watchTestRuns'] = replay.watchTestRuns
      mount.tick()
      await settle(mount)
      await waitFor(() => expect(first.unsubscribed()).toBe(1))
      // Real replay is asynchronous: the old client appended own events first,
      // then accepted B's older replay while suppressing A's. Ids must make both
      // runs' replayed copies no-ops.
      await replay.emit({
        type: 'start',
        runId: 'B',
        eventId: '2-0',
        ids: [HOME],
        source: 'platform',
      })
      await replay.emit({ type: 'done', runId: 'B', eventId: '3-0', outcome: 'cancelled' })
      await replay.emit({
        type: 'start',
        runId: 'A',
        eventId: '1-0',
        ids: [HOME],
        source: 'person',
      })
      await replay.emit({
        type: 'result',
        runId: 'A',
        eventId: '4-0',
        id: HOME,
        status: 'passed',
        passed: 1,
      })
      await replay.emit({ type: 'done', runId: 'A', eventId: '5-0', outcome: 'completed' })
      expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
    },
  )

  it(
    'a reconnect with no new events leaves the visible card unchanged',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const events: TestRunFeedEvent[] = [
        { type: 'start', runId: 'A', ids: [HOME], source: 'agent' },
        { type: 'result', runId: 'A', id: HOME, status: 'passed', passed: 1 },
        { type: 'done', runId: 'A', outcome: 'completed' },
      ]
      const first = fakeFeed(events)
      const listTests = async (): Promise<TestList> => LIST
      const mount = await renderPanel({ listTests, watchTestRuns: first.watchTestRuns })
      const { container } = mount
      await openTests(container)
      const before = molId(container, 'tests-card')?.textContent
      const replay = fakeFeed(events)
      mount.props['watchTestRuns'] = replay.watchTestRuns
      mount.tick()
      await settle(mount)
      await waitFor(() => expect(first.unsubscribed()).toBe(1))
      expect(molId(container, 'tests-card')?.textContent).toBe(before)
    },
  )

  it(
    '40 completed own runs never evict the active own-run id',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const feed = fakeFeed()
      const emitters: Array<(event: TestRunEvent) => void> = []
      const { container } = await renderPanel({
        listTests: async () => LIST,
        watchTestRuns: feed.watchTestRuns,
        runTests: (_selection, onEvent) => {
          emitters.push(onEvent)
          return { cancel: () => {} }
        },
      })
      await openTests(container)
      for (let index = 0; index < 40; index += 1) {
        await click(container, `tests-card-run-${HOME}`)
        emitters[index]!({ type: 'start', runId: `own-${index}`, ids: [HOME] })
        emitters[index]!({ type: 'result', id: HOME, status: 'passed', passed: 1 })
        emitters[index]!({ type: 'done', outcome: 'completed' })
        await settle(mounted)
      }
      await click(container, `tests-card-run-${HOME}`)
      emitters[40]!({ type: 'start', runId: 'active', ids: [HOME] })
      await settle(mounted)
      await feed.emit({ type: 'start', runId: 'active', ids: [HOME], source: 'person' })
      await click(container, 'tests-card-cancel')
      expect(molId(container, 'tests-card-running')).toBeNull()
      expect(molId(container, 'tests-card-cancelled')?.textContent).toBe('Run stopped.')
    },
  )

  it(
    'a start delayed past cancellation remains a completed own run',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const feed = fakeFeed()
      let emit: (event: TestRunEvent) => void = () => {}
      const { container } = await renderPanel({
        listTests: async () => LIST,
        watchTestRuns: feed.watchTestRuns,
        runTests: (_selection, onEvent) => {
          emit = onEvent
          return { cancel: () => {} }
        },
      })
      await openTests(container)
      await click(container, `tests-card-run-${HOME}`)
      await click(container, 'tests-card-cancel')
      emit({ type: 'start', runId: 'cancelled', ids: [HOME] })
      await settle(mounted)
      await feed.emit({ type: 'start', runId: 'cancelled', ids: [HOME], source: 'person' })
      expect(molId(container, 'tests-card-running')).toBeNull()
      expect(molId(container, 'tests-card-cancel')).toBeNull()
    },
  )

  it(
    'a host failure after the own start retires the active id and ends the row',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const feed = fakeFeed()
      const { container } = await renderPanel({
        listTests: async () => LIST,
        watchTestRuns: feed.watchTestRuns,
        runTests: (_selection, onEvent) => {
          onEvent({ type: 'start', runId: 'broken', ids: [HOME] })
          throw new Error('stream failed after start')
        },
      })
      await openTests(container)
      await click(container, `tests-card-run-${HOME}`)
      expect(molId(container, 'tests-card-running')).toBeNull()
      expect(molId(container, 'tests-card-run-error')?.textContent).toBe(
        'stream failed after start',
      )
      await feed.emit({ type: 'start', runId: 'broken', ids: [HOME], source: 'person' })
      expect(molId(container, 'tests-card-running')).toBeNull()
    },
  )

  it(
    'Sol 3: delayed starts of cancelled runs cannot evict the active own-run id',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const feed = fakeFeed()
      const emitters: Array<(event: TestRunEvent) => void> = []
      const { container } = await renderPanel({
        listTests: async () => LIST,
        watchTestRuns: feed.watchTestRuns,
        runTests: (_selection, onEvent) => {
          emitters.push(onEvent)
          return { cancel: () => {} }
        },
      })
      await openTests(container)
      for (let index = 0; index < 32; index += 1) {
        await click(container, `tests-card-run-${HOME}`)
        await click(container, 'tests-card-cancel')
      }
      await click(container, `tests-card-run-${HOME}`)
      emitters[32]!({ type: 'start', runId: 'active', ids: [HOME] })
      for (let index = 0; index < 32; index += 1) {
        emitters[index]!({ type: 'start', runId: `cancelled-${index}`, ids: [HOME] })
      }
      await settle(mounted)
      await feed.emit({ type: 'start', runId: 'active', ids: [HOME], source: 'person' })
      await click(container, 'tests-card-cancel')
      expect(molId(container, 'tests-card-running')).toBeNull()
      expect(molId(container, 'tests-card-cancelled')?.textContent).toBe('Run stopped.')
    },
  )

  it(
    'Sol ownership: a failure before start lets the next Run click invoke the host',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const runTests = vi.fn(
        (_selection: TestSelection, onEvent: (event: TestRunEvent) => void): TestRunHandle => {
          if (runTests.mock.calls.length === 1) {
            onEvent({ type: 'done', outcome: 'error', error: 'could not start' })
          }
          return { cancel: () => {} }
        },
      )
      const { container } = await renderPanel({ listTests: async () => LIST, runTests })
      await openTests(container)
      await click(container, `tests-card-run-${HOME}`)
      await waitFor(() => expect(molId(container, 'tests-card-run-error')).not.toBeNull())
      await click(container, `tests-card-run-${HOME}`)
      expect(runTests).toHaveBeenCalledTimes(2)
    },
  )

  it('unsubscribes when the panel unmounts', { timeout: PANEL_TEST_TIMEOUT_MS }, async () => {
    const feed = fakeFeed()
    const mount = await renderPanel({
      listTests: vi.fn(async () => LIST),
      watchTestRuns: feed.watchTestRuns,
    })
    mount.unmount()
    mounted = null
    expect(feed.unsubscribed()).toBe(1)
  })
})
