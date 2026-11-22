/**
 * `ChatPanel` cases: the `/test` browser's list and test runs. Every case name starts with
 * `tests: `.
 *
 * The `/test` command opens the tests browser over the composer: the host's `listTests`
 * discovery feeds the list (a trailing query seeds the search), each listing outcome renders
 * its own state (a rejected discovery, a host with none wired, a stopped environment, an
 * empty project, a search with no match), and a viewer reads the list with every run control
 * disabled. The Run controls (row, kind, group, all, `/test all`) hand the host's `runTests`
 * a selection and stream `TestRunEvent`s back: the run shows at once on the click, spins the
 * rows it owes, names the test on screen with a live tally, marks each file from its
 * verdict, keeps a failure's output behind its toggle, and reports a run-level error. Stop
 * (in the card and on the strip) cancels the run — a start that arrives afterwards stays
 * stopped — and Skip drops the file the run is on, which the finished run counts as skipped
 * (and drops the control when the host cannot serve one). The list and the run live in the
 * panel, so a run survives closing and re-opening the browser, re-running `/test` re-lists
 * without disturbing it, `/test all` starts nothing new while it runs, and discovery holds
 * back until it completes and re-lists after. A run the agent or the platform started
 * arrives through `watchTestRuns` — watched, named, never stoppable from here, with the
 * feed's copy of the panel's own run ignored. Fixing hands the failures to the agent as one
 * message (waiting for a live turn first), the host's native test history renders above the
 * browser, and `/test off` and `/test on` hide and show the strip.
 *
 * @module
 */

import type { CallbackResult, Interaction } from '../../../../ui/spec.js'
import type { FeatureCase } from '../../../spec.js'
import {
  adv,
  base,
  CALLBACKS,
  click,
  DONE,
  emit,
  finish,
  key,
  SEND,
  START,
  TEXT,
  type,
} from './fixtures.js'

/** The overlay header's ✕. */
const CLOSE = '[data-mol-id="panel-overlay-close"]'

/** The tests browser's search box. */
const SEARCH = '[data-mol-id="tests-card-search"]'

/** The tests strip's whole-row disclosure (its click opens the tests browser). */
const STRIP_TOGGLE = '[data-mol-id="tests-bar-toggle"]'

/** The tests strip's Stop. */
const STRIP_STOP = '[data-mol-id="tests-bar-stop"]'

/** Three discovered tests: two e2e specs in one directory and one unit file. */
const TESTS = [
  { id: 't1', file: 'e2e/home.spec.ts', kind: 'e2e', workspace: 'app', title: 'Home page loads' },
  { id: 't2', file: 'e2e/about.spec.ts', kind: 'e2e', workspace: 'app', title: 'About page loads' },
  { id: 't3', file: 'src/routes.test.ts', kind: 'unit', workspace: 'api', title: 'Routes serve' },
]

/**
 * A test row's Run button.
 *
 * @param id - The test's id.
 * @returns Its selector.
 */
const RUN_ROW = (id: string): string => `[data-mol-id="tests-card-run-${id}"]`

/**
 * A test row's Skip button.
 *
 * @param id - The test's id.
 * @returns Its selector.
 */
const SKIP_ROW = (id: string): string => `[data-mol-id="tests-card-skip-${id}"]`

/**
 * A failed row's output toggle.
 *
 * @param id - The test's id.
 * @returns Its selector.
 */
const FAILURE_TOGGLE = (id: string): string => `[data-mol-id="tests-card-failure-toggle-${id}"]`

/**
 * The handle the host's `runTests` returns: a working `cancel`, and — when the host serves
 * skipping — a `skipCurrent` that accepts, answers there was nothing left to skip, or
 * rejects. The kit passes a callback's return through as it is, so the handle carries real
 * functions.
 *
 * @param spec - Whether skipping is served, and how it answers.
 * @returns The handle.
 */
const runHandle = (
  spec: { skip?: boolean; skipRefuses?: boolean; skipRejects?: boolean } = {},
): Record<string, unknown> => ({
  cancel: (): void => {},
  ...(spec.skip
    ? {
        skipCurrent: (): Promise<boolean> =>
          spec.skipRejects
            ? Promise.reject(new Error('the skip channel is down'))
            : Promise.resolve(!spec.skipRefuses),
      }
    : {}),
})

/** Which test callbacks a case wires, and what they answer. */
interface TestsHost {
  /** `runTests` stays unwired (the browser's run controls do nothing). Default: wired. */
  noRun?: boolean
  /** What `listTests` resolves with (default: {@link TESTS}). */
  listing?: unknown
  /** `listTests` rejects with this message instead of resolving. */
  listError?: string
  /** Discovery stays pending until a `settleList` step answers it. */
  listDeferred?: boolean
  /** The host wires no discovery at all. */
  noDiscovery?: boolean
  /** The host serves skipping (accepting, refusing, or rejecting the ask). */
  skip?: boolean
  /** `skipCurrent` answers there was nothing left to skip. */
  skipRefuses?: boolean
  /** `skipCurrent` rejects (the ask could not be delivered). */
  skipRejects?: boolean
  /** The panel also subscribes to the project's run feed (`watchTestRuns`). */
  watch?: boolean
}

/**
 * Hands the panel the host's test callbacks — `listTests`, `runTests` and `watchTestRuns` —
 * with their answers declared.
 *
 * @param testCase - The case.
 * @param host - Which callbacks to wire and what they answer.
 * @returns The case with the callbacks wired.
 */
const withTestsHost = (testCase: FeatureCase, host: TestsHost = {}): FeatureCase => {
  const {
    noRun,
    listing = { tests: TESTS },
    listError,
    listDeferred,
    noDiscovery,
    skip,
    skipRefuses,
    skipRejects,
    watch,
  } = host
  const callbacks = [...CALLBACKS]
  const results: Record<string, CallbackResult> = {}
  if (!noDiscovery) {
    callbacks.push('listTests')
    results.listTests =
      listError !== undefined
        ? { reject: listError }
        : listDeferred
          ? { defer: true }
          : { resolve: listing }
  }
  if (!noRun && !noDiscovery) {
    callbacks.push('runTests')
    results.runTests = { returns: runHandle({ skip, skipRefuses, skipRejects }) }
  }
  if (watch) callbacks.push('watchTestRuns')
  return { ...testCase, callbacks, callbackResults: results }
}

/**
 * Types a composer command and submits it with Enter.
 *
 * @param text - The command text.
 * @returns The steps.
 */
const command = (text: string): Interaction[] => [type(text), key('Enter')]

/** Opens the tests browser the way a user does: the `/test` command. */
const OPEN: Interaction[] = [...command('/test')]

/**
 * Starts an ordinary chat turn, for the fix gate's busy state.
 *
 * @param message - The message to send.
 * @returns The steps.
 */
const sendIt = (message: string): Interaction[] => [type(message), click(SEND)]

/**
 * Delivers one run event to the `onEvent` the panel handed `runTests`, as the host's run
 * stream does.
 *
 * @param event - The event.
 * @returns The step.
 */
const runEvent = (event: Record<string, unknown>): Interaction => ({
  type: 'invoke',
  callback: 'runTests',
  path: [1],
  args: [event],
})

/**
 * Delivers one feed event to the listener the panel handed `watchTestRuns`, as the
 * project's run feed does.
 *
 * @param event - The event.
 * @returns The step.
 */
const feedEvent = (event: Record<string, unknown>): Interaction => ({
  type: 'invoke',
  callback: 'watchTestRuns',
  path: [0],
  args: [event],
})

/**
 * Answers the oldest pending discovery probe.
 *
 * @param tests - The discovered tests.
 * @returns The step.
 */
const settleList = (tests: unknown[]): Interaction => ({
  type: 'settle',
  callback: 'listTests',
  value: { tests },
})

/** The `/test` browser's list and test runs. */
export const testsCases: FeatureCase[] = [
  // ── The list ────────────────────────────────────────────────────────────────
  withTestsHost(base("tests: /test lists the project's tests with their run controls", [...OPEN]), {
    noRun: true,
  }),
  withTestsHost(
    base('tests: /test with a query opens the browser pre-filtered', [...command('/test routes')]),
  ),
  withTestsHost(base('tests: an empty answer says the project has no tests yet', [...OPEN]), {
    noRun: true,
    listing: { tests: [] },
  }),
  withTestsHost(
    base('tests: a search with no match says so', [
      ...OPEN,
      { type: 'input', selector: SEARCH, value: 'zzzz' },
    ]),
  ),
  withTestsHost(
    base('tests: a rejected discovery says the browser could not list the tests', [...OPEN]),
    { noRun: true, listError: 'discovery is down' },
  ),
  withTestsHost(
    base('tests: a host with no test discovery opens a browser that cannot list', [...OPEN]),
    { noDiscovery: true },
  ),
  withTestsHost(
    base("tests: a stopped project's browser says to start it and disables running", [...OPEN], {
      props: { testsAvailable: false },
    }),
    { noRun: true },
  ),
  withTestsHost(
    base(
      'tests: a viewer reads the list with every run control disabled',
      [...OPEN, click('[data-mol-id="tests-card-run-all"]')],
      {
        props: { canEdit: false },
      },
    ),
    { noRun: true },
  ),

  // ── Starting a run ──────────────────────────────────────────────────────────
  withTestsHost(
    base('tests: a Run click starts the run at once, before the host reports anything', [
      ...OPEN,
      click(RUN_ROW('t1')),
    ]),
  ),
  withTestsHost(
    base('tests: /test all runs everything at once', [
      ...command('/test all'),
      runEvent({ type: 'start', runId: 'r1', ids: ['t1', 't2', 't3'] }),
    ]),
  ),
  withTestsHost(
    base('tests: the kind Run asks the host for that kind only', [
      ...OPEN,
      click('[data-mol-id="tests-card-run-e2e"]'),
    ]),
  ),
  withTestsHost(
    base("tests: the group Run asks the host for the group's files", [
      ...OPEN,
      click('[data-mol-id="tests-card-run-group-e2e-app"]'),
    ]),
  ),

  // ── A run's stream ──────────────────────────────────────────────────────────
  withTestsHost(
    base('tests: a run stream spins the rows, names the test on screen and marks each verdict', [
      ...OPEN,
      click('[data-mol-id="tests-card-run-all"]'),
      runEvent({ type: 'start', runId: 'r1', ids: ['t1', 't2', 't3'] }),
      runEvent({ type: 'output', id: 't1', chunk: 'Running 3 tests using 1 worker' }),
      runEvent({
        type: 'case',
        id: 't1',
        title: 'shows the hero',
        describe: 'home page',
        status: 'running',
      }),
      runEvent({
        type: 'case',
        id: 't1',
        title: 'shows the hero',
        describe: 'home page',
        status: 'passed',
      }),
      runEvent({ type: 'result', id: 't1', status: 'passed', passed: 2 }),
      runEvent({
        type: 'case',
        id: 't2',
        title: 'fills the form',
        describe: 'about page',
        status: 'running',
      }),
      runEvent({
        type: 'case',
        id: 't2',
        title: 'submits the form',
        describe: 'about page',
        status: 'failed',
      }),
      runEvent({
        type: 'result',
        id: 't2',
        status: 'failed',
        failed: 1,
        output: 'Error: expect(received).toBe(expected)',
      }),
      runEvent({ type: 'result', id: 't3', status: 'skipped', skipped: 2 }),
      runEvent({
        type: 'done',
        runId: 'r1',
        outcome: 'completed',
        passed: 2,
        failed: 1,
        skipped: 2,
      }),
    ]),
  ),
  withTestsHost(
    base("tests: a failed file keeps its output behind its row's toggle", [
      ...OPEN,
      click(RUN_ROW('t2')),
      runEvent({ type: 'start', runId: 'r1', ids: ['t2'] }),
      runEvent({
        type: 'result',
        id: 't2',
        status: 'failed',
        failed: 1,
        output: 'Error: No tests found.\n  Expected: 2',
      }),
      runEvent({ type: 'done', runId: 'r1', outcome: 'completed', failed: 1 }),
      click(FAILURE_TOGGLE('t2')),
    ]),
  ),
  withTestsHost(
    base("tests: the run's captured output opens behind its toggle", [
      ...OPEN,
      click('[data-mol-id="tests-card-run-all"]'),
      runEvent({ type: 'start', runId: 'r1', ids: ['t1', 't2', 't3'] }),
      runEvent({ type: 'output', chunk: 'Running 3 tests using 1 worker' }),
      runEvent({ type: 'done', runId: 'r1', outcome: 'completed' }),
      click('[data-mol-id="tests-card-output-toggle"]'),
      click('[data-mol-id="tests-card-output-toggle"]'),
    ]),
  ),
  withTestsHost(
    base('tests: a run that fails to finish says so in the card and on the strip', [
      ...OPEN,
      click(RUN_ROW('t1')),
      runEvent({ type: 'start', runId: 'r1', ids: ['t1'] }),
      runEvent({
        type: 'done',
        runId: 'r1',
        outcome: 'timeout',
        error: 'The run passed its 10-minute budget and was stopped.',
      }),
      click(CLOSE),
    ]),
  ),

  // ── Stop and Skip ───────────────────────────────────────────────────────────
  withTestsHost(
    base('tests: Stop in the card cancels the run and says it stopped', [
      ...OPEN,
      click('[data-mol-id="tests-card-run-all"]'),
      runEvent({ type: 'start', runId: 'r1', ids: ['t1', 't2', 't3'] }),
      click('[data-mol-id="tests-card-cancel"]'),
      click(CLOSE),
    ]),
  ),
  withTestsHost(
    base("tests: the strip's Stop stops the run from outside the browser", [
      ...OPEN,
      click('[data-mol-id="tests-card-run-all"]'),
      runEvent({ type: 'start', runId: 'r1', ids: ['t1', 't2', 't3'] }),
      click(CLOSE),
      click(STRIP_STOP),
    ]),
  ),
  withTestsHost(
    base('tests: a start that arrives after the stop leaves the run stopped', [
      ...OPEN,
      click(RUN_ROW('t1')),
      click('[data-mol-id="tests-card-cancel"]'),
      runEvent({ type: 'start', runId: 'r1', ids: ['t1'] }),
    ]),
  ),
  withTestsHost(
    base('tests: Skip drops the file the run is on and the finished run counts it skipped', [
      ...OPEN,
      click('[data-mol-id="tests-card-run-e2e"]'),
      runEvent({ type: 'start', runId: 'r1', ids: ['t1', 't2'] }),
      runEvent({ type: 'output', id: 't1', chunk: 'Running 2 tests' }),
      click(SKIP_ROW('t1')),
      runEvent({ type: 'result', id: 't1', status: 'skipped', skipped: 1, durationMs: 8 }),
      runEvent({
        type: 'case',
        id: 't2',
        title: 'fills the form',
        describe: 'about page',
        status: 'running',
      }),
      runEvent({ type: 'result', id: 't2', status: 'passed', passed: 2 }),
      runEvent({ type: 'done', runId: 'r1', outcome: 'skipped-by-user' }),
    ]),
    { skip: true },
  ),
  withTestsHost(
    base('tests: a skip the host cannot serve takes the control away', [
      ...OPEN,
      click('[data-mol-id="tests-card-run-e2e"]'),
      runEvent({ type: 'start', runId: 'r1', ids: ['t1', 't2'] }),
      runEvent({ type: 'output', id: 't1', chunk: 'Running 2 tests' }),
      click(SKIP_ROW('t1')),
    ]),
    { skip: true, skipRefuses: true },
  ),
  withTestsHost(
    base('tests: a skip the host rejects takes the control away too', [
      ...OPEN,
      click('[data-mol-id="tests-card-run-e2e"]'),
      runEvent({ type: 'start', runId: 'r1', ids: ['t1', 't2'] }),
      runEvent({ type: 'output', id: 't1', chunk: 'Running 2 tests' }),
      click(SKIP_ROW('t1')),
    ]),
    { skip: true, skipRejects: true },
  ),
  withTestsHost(
    base('tests: a host that serves no skip offers no Skip control', [
      ...OPEN,
      click('[data-mol-id="tests-card-run-e2e"]'),
      runEvent({ type: 'start', runId: 'r1', ids: ['t1', 't2'] }),
      runEvent({ type: 'output', id: 't1', chunk: 'Running 2 tests' }),
    ]),
  ),

  // ── The run outlives the browser ────────────────────────────────────────────
  withTestsHost(
    base('tests: a run in flight survives closing and re-opening the browser', [
      ...OPEN,
      click('[data-mol-id="tests-card-run-all"]'),
      runEvent({ type: 'start', runId: 'r1', ids: ['t1', 't2', 't3'] }),
      runEvent({ type: 'output', id: 't1', chunk: 'Running 3 tests' }),
      click(CLOSE),
      click(STRIP_TOGGLE),
    ]),
  ),
  withTestsHost(
    base('tests: re-running /test re-lists without disturbing the run in flight', [
      ...OPEN,
      click(RUN_ROW('t1')),
      runEvent({ type: 'start', runId: 'r1', ids: ['t1'] }),
      ...command('/test'),
      runEvent({ type: 'result', id: 't1', status: 'passed', passed: 1 }),
      runEvent({ type: 'done', runId: 'r1', outcome: 'completed', passed: 1 }),
    ]),
  ),
  withTestsHost(
    base('tests: /test all while a run is in flight starts nothing new', [
      ...OPEN,
      click(RUN_ROW('t1')),
      runEvent({ type: 'start', runId: 'r1', ids: ['t1'] }),
      ...command('/test all'),
    ]),
  ),
  withTestsHost(
    base(
      'tests: discovery holds back while a run is in flight and re-lists when it completes',
      [
        settleList([]),
        ...sendIt('Add the first spec'),
        emit(START('a1')),
        emit(TEXT('Writing the first spec now.')),
        adv(50),
        emit(DONE),
        finish,
        adv(50),
        settleList([]),
        ...command('/test all'),
        settleList([]),
        runEvent({ type: 'start', runId: 'r1', ids: [] }),
        click(CLOSE),
        ...sendIt('Write another spec'),
        emit(START('a2')),
        emit(TEXT('One more spec coming up.')),
        adv(50),
        emit(DONE),
        finish,
        adv(50),
        runEvent({ type: 'done', runId: 'r1', outcome: 'completed' }),
        settleList(TESTS),
      ],
      { props: { testsAvailable: true } },
    ),
    { listDeferred: true },
  ),

  // ── Runs other surfaces started (the feed) ──────────────────────────────────
  withTestsHost(
    base('tests: a run the agent started is watched, named, and offers no Stop', [
      feedEvent({
        type: 'start',
        runId: 'r1',
        ids: [],
        source: 'agent',
        command: 'npx vitest run src/routes.test.ts',
      }),
      feedEvent({ type: 'result', runId: 'r1', id: 't3', status: 'passed', passed: 4 }),
      click(STRIP_TOGGLE),
      feedEvent({ type: 'done', runId: 'r1', outcome: 'completed', passed: 4 }),
      adv(600),
      click(CLOSE),
    ]),
    { watch: true },
  ),
  withTestsHost(
    base("tests: a completed run watched from the host paints the strip's verdict", [
      feedEvent({ type: 'start', runId: 'r9', ids: ['t3'], source: 'platform' }),
      feedEvent({ type: 'result', runId: 'r9', id: 't3', status: 'failed', failed: 1 }),
      feedEvent({ type: 'done', runId: 'r9', outcome: 'completed', failed: 1 }),
    ]),
    { watch: true },
  ),
  withTestsHost(
    base("tests: the feed's copy of the panel's own run changes nothing", [
      ...OPEN,
      click(RUN_ROW('t1')),
      feedEvent({ type: 'start', runId: 'r1', ids: ['t1'], source: 'person' }),
      runEvent({ type: 'start', runId: 'r1', ids: ['t1'] }),
      feedEvent({ type: 'result', runId: 'r1', id: 't1', status: 'failed', failed: 1 }),
      runEvent({ type: 'result', id: 't1', status: 'passed', passed: 1 }),
      runEvent({ type: 'done', outcome: 'completed', passed: 1 }),
      feedEvent({ type: 'done', runId: 'r1', outcome: 'completed', failed: 1 }),
    ]),
    { watch: true },
  ),

  // ── Fixing a failure ────────────────────────────────────────────────────────
  withTestsHost(
    base('tests: fixing a failure hands it to the agent as one message and closes the browser', [
      ...OPEN,
      click(RUN_ROW('t1')),
      runEvent({ type: 'start', runId: 'r1', ids: ['t1'] }),
      runEvent({
        type: 'result',
        id: 't1',
        status: 'failed',
        failed: 1,
        output: 'Error: expected 200 to be 404',
      }),
      runEvent({ type: 'done', runId: 'r1', outcome: 'completed', failed: 1 }),
      click('[data-mol-id="tests-card-fix-t1"]'),
      emit(START('a1')),
      emit(TEXT('Fixing the assertion now.')),
      adv(50),
      emit(DONE),
      finish,
    ]),
  ),
  withTestsHost(
    base('tests: fixing waits for the current turn to finish', [
      ...OPEN,
      click(RUN_ROW('t1')),
      runEvent({ type: 'start', runId: 'r1', ids: ['t1'] }),
      runEvent({
        type: 'result',
        id: 't1',
        status: 'failed',
        failed: 1,
        output: 'Error: expected 200 to be 404',
      }),
      runEvent({ type: 'done', runId: 'r1', outcome: 'completed', failed: 1 }),
      ...sendIt('Please fix the routes test'),
      emit(START('a1')),
      emit(TEXT('On it — reading the route now.')),
      adv(50),
      click('[data-mol-id="tests-card-fix-t1"]'),
    ]),
  ),

  // ── The host's own tests surface ────────────────────────────────────────────
  withTestsHost(
    base("tests: the host's native test history renders above the browser", [...OPEN], {
      props: {
        nativeTests: {
          visible: true,
          history: {
            $nodes: [
              {
                tag: 'section',
                attrs: { 'data-mol-id': 'host-native-history' },
                children: ['Native runs · exit 0 · results not recorded'],
              },
            ],
          },
          renderStatus: {
            $fn: 'renderStatus',
            nodes: [
              {
                tag: 'div',
                attrs: { 'data-mol-id': 'host-native-strip' },
                children: ['The host renders its own tests strip'],
              },
            ],
          },
        },
      },
    }),
    { noRun: true },
  ),

  // ── The strip's display preference ──────────────────────────────────────────
  withTestsHost(
    base(
      'tests: /test off hides the strip and /test on brings it back',
      [...command('/test off'), ...command('/test on')],
      {
        props: { testsAvailable: true },
        context: { window: { localStorage: { mol_chat_show_tests_bar: 'true' } } },
      },
    ),
    { noRun: true },
  ),
]
