/**
 * `TestStatusBar` cases: every tone the bar can wear, every label its summary
 * and its chip take, the thing-in-flight hint and its three fallbacks, the
 * Stop control and its hand-over, and the legacy expansion props that must
 * change nothing.
 *
 * Like `TestsCard`, the bar is PRESENTATIONAL — the run arrives whole as the
 * `run` prop — so the states are folded with the real `applyTestRunEvent` (the
 * reducer ChatPanel drives it with) instead of hand-written shapes, and moved
 * forward with `props` steps exactly the way a stream event would.
 *
 * @module
 */

import type { TestItem, TestRunEvent, TestsRunState } from '@molecule/app-ide-panel-logic'
import { applyTestRunEvent, EMPTY_RUN_STATE } from '@molecule/app-ide-panel-logic'

import type { FeatureComponentCases } from '../../spec.js'

/** The listing most cases share: two e2e files in one app, two unit files in two directories. */
const TESTS: TestItem[] = [
  {
    id: 'my-app/app:e2e/home.spec.ts',
    file: 'e2e/home.spec.ts',
    kind: 'e2e',
    workspace: 'my-app/app',
    workspaceLabel: 'my-app/app',
    title: 'home',
  },
  {
    id: 'my-app/app:e2e/about.spec.ts',
    file: 'e2e/about.spec.ts',
    kind: 'e2e',
    workspace: 'my-app/app',
    workspaceLabel: 'my-app/app',
    title: 'about',
  },
  {
    id: 'my-app/api:src/routes.test.ts',
    file: 'src/routes.test.ts',
    kind: 'unit',
    workspace: 'my-app/api',
    workspaceLabel: 'my-app/api',
    title: 'routes',
  },
  {
    id: '.:tests/tooling.test.ts',
    file: 'tests/tooling.test.ts',
    kind: 'unit',
    workspace: '.',
    workspaceLabel: null,
    title: 'tooling',
  },
]

/** The run's own two e2e files, used by the live-run states. */
const HOME = 'my-app/app:e2e/home.spec.ts'
const ABOUT = 'my-app/app:e2e/about.spec.ts'

/**
 * Folds run events into the state the bar is rendered with.
 *
 * @param events - The stream's events, in order.
 * @param overrides - State patches over the folded state (`external` is the
 * panel's projection, not an event's).
 * @returns The run state.
 */
const runOf = (events: TestRunEvent[], overrides: Partial<TestsRunState> = {}): TestsRunState => ({
  ...events.reduce(applyTestRunEvent, EMPTY_RUN_STATE),
  ...overrides,
})

/** A live run this panel started itself, on its first file. */
const liveRun = (overrides: Partial<TestsRunState> = {}): TestsRunState =>
  runOf(
    [
      { type: 'start', runId: 'r1', ids: [HOME, ABOUT] },
      { type: 'output', id: HOME, chunk: 'Running 3 tests using 2 workers' },
    ],
    { skipUnavailable: false, ...overrides },
  )

/** A run mid-file: two of the file's tests decided, a third on screen. */
const midFileRun: TestsRunState = runOf(
  [
    { type: 'start', runId: 'r1', ids: [HOME, ABOUT] },
    { type: 'case', id: HOME, title: 'shows the hero', describe: 'home page', status: 'passed' },
    { type: 'case', id: HOME, title: 'links to pricing', describe: 'home page', status: 'failed' },
    { type: 'case', id: HOME, title: 'signs a user up', describe: 'home page', status: 'running' },
  ],
  { skipUnavailable: false },
)

/** A finished run: one pass, two failures with output. */
const failedRun: TestsRunState = runOf([
  { type: 'start', runId: 'r1', ids: [HOME, ABOUT] },
  { type: 'result', id: HOME, status: 'passed', passed: 1, failed: 0, skipped: 0 },
  {
    type: 'result',
    id: ABOUT,
    status: 'failed',
    passed: 0,
    failed: 1,
    skipped: 0,
    output: 'Error: expect(received).toBe(expected)',
  },
  {
    type: 'result',
    id: 'my-app/api:src/routes.test.ts',
    status: 'failed',
    passed: 0,
    failed: 1,
    skipped: 0,
    output: 'AssertionError: expected 404 to be 200',
  },
  { type: 'done', outcome: 'completed', passed: 1, failed: 2, skipped: 0, durationMs: 4_000 },
])

/** The props every case starts from; per-case fields follow. */
const base = { tests: TESTS, onOpen: undefined, onStop: undefined } as const

/** `TestStatusBar`. */
export const testStatusBarCases: FeatureComponentCases = {
  component: 'TestStatusBar',
  cases: [
    // ── The idle line ───────────────────────────────────────────────────────
    {
      name: 'an untouched suite counts what has not run',
      props: { ...base, run: EMPTY_RUN_STATE },
      callbacks: ['onOpen', 'onStop'],
    },
    {
      name: 'one undiscovered test reads the singular',
      props: { tests: [TESTS[2] as TestItem], run: EMPTY_RUN_STATE },
      callbacks: ['onOpen', 'onStop'],
    },
    {
      name: 'a bare project renders a zero count',
      props: { tests: [], run: EMPTY_RUN_STATE },
      callbacks: ['onOpen', 'onStop'],
    },

    // ── A run this panel started ────────────────────────────────────────────
    {
      name: 'a run in flight counts the files to go and offers the stop',
      props: { ...base, run: liveRun() },
      callbacks: ['onOpen', 'onStop'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="tests-bar-toggle"]' },
        { type: 'click', selector: '[data-mol-id="tests-bar-stop"]' },
      ],
    },
    {
      name: 'the last file running drops the count, then the hint',
      props: { ...base, run: liveRun() },
      callbacks: ['onOpen', 'onStop'],
      interactions: [
        {
          type: 'props',
          props: {
            run: runOf(
              [
                { type: 'start', runId: 'r1', ids: [HOME, ABOUT] },
                { type: 'output', id: HOME, chunk: 'Running 3 tests using 2 workers' },
                { type: 'result', id: HOME, status: 'passed', passed: 2, failed: 0, skipped: 0 },
                { type: 'output', id: ABOUT, chunk: 'Running 1 test' },
              ],
              { skipUnavailable: false },
            ),
          },
        },
        {
          type: 'props',
          props: {
            run: runOf(
              [
                { type: 'start', runId: 'r1', ids: [HOME, ABOUT] },
                { type: 'output', id: HOME, chunk: 'Running 3 tests using 2 workers' },
                { type: 'result', id: HOME, status: 'passed', passed: 2, failed: 0, skipped: 0 },
                { type: 'output', id: ABOUT, chunk: 'Running 1 test' },
                {
                  type: 'result',
                  id: ABOUT,
                  status: 'failed',
                  passed: 0,
                  failed: 1,
                  skipped: 0,
                  output: 'Error: expect(received).toBe(expected)',
                },
              ],
              { skipUnavailable: false },
            ),
          },
        },
      ],
    },
    {
      name: 'the test on screen names itself in the hint',
      props: { ...base, run: midFileRun },
      callbacks: ['onOpen', 'onStop'],
    },
    {
      name: 'an agentName on this panel’s own run still says Running',
      props: { ...base, run: liveRun(), agentName: 'Alfred' },
      callbacks: ['onOpen', 'onStop'],
    },
    {
      name: 'a running file without a stop callback offers none',
      props: { ...base, run: liveRun() },
      callbacks: ['onOpen'],
      interactions: [{ type: 'click', selector: '[data-mol-id="tests-bar-toggle"]' }],
    },

    // ── Runs this panel only watches ────────────────────────────────────────
    {
      name: 'an agent’s run names the agent, hints its command, and offers the stop',
      props: {
        ...base,
        run: runOf(
          [
            { type: 'start', runId: 'r9', ids: [], source: 'agent', command: 'npx vitest run src' },
            { type: 'output', id: HOME, chunk: 'RUN  v2.1.1 /home/workspace' },
          ],
          { external: true },
        ),
        agentName: 'Alfred',
      },
      callbacks: ['onOpen', 'onStop'],
      interactions: [{ type: 'click', selector: '[data-mol-id="tests-bar-stop"]' }],
    },
    {
      name: 'an agent run without a name says the default',
      props: {
        ...base,
        run: runOf(
          [
            { type: 'start', runId: 'r9', ids: [], source: 'agent' },
            { type: 'output', id: HOME, chunk: 'RUN  v2.1.1' },
          ],
          { external: true },
        ),
      },
      callbacks: ['onOpen', 'onStop'],
    },
    {
      name: 'the platform’s run says it is checking the deploy',
      props: {
        ...base,
        run: runOf(
          [
            { type: 'start', runId: 'r9', ids: [], source: 'platform', command: 'mol verify' },
            { type: 'output', id: ABOUT, chunk: 'verifying…' },
          ],
          { external: true },
        ),
      },
      callbacks: ['onOpen', 'onStop'],
    },
    {
      name: 'another tab’s run says so',
      props: {
        ...base,
        run: runOf(
          [
            { type: 'start', runId: 'r9', ids: [], source: 'person', command: 'npm test' },
            { type: 'output', id: ABOUT, chunk: '>' },
          ],
          { external: true },
        ),
      },
      callbacks: ['onOpen', 'onStop'],
    },

    // ── Finished tones ──────────────────────────────────────────────────────
    {
      name: 'a failing run counts failing and passing, and the chip carries the tally',
      props: { ...base, run: failedRun },
      callbacks: ['onOpen', 'onStop'],
    },
    {
      name: 'an all-passing run says so',
      props: {
        ...base,
        run: runOf([
          { type: 'start', runId: 'r1', ids: [HOME, ABOUT] },
          { type: 'result', id: HOME, status: 'passed', passed: 2, failed: 0, skipped: 0 },
          { type: 'result', id: ABOUT, status: 'passed', passed: 1, failed: 0, skipped: 0 },
          {
            type: 'done',
            outcome: 'completed',
            passed: 3,
            failed: 0,
            skipped: 0,
            durationMs: 6_000,
          },
        ]),
      },
      callbacks: ['onOpen', 'onStop'],
    },
    {
      name: 'a passing run with a skip names both counts',
      props: {
        ...base,
        run: runOf([
          { type: 'start', runId: 'r1', ids: [HOME, ABOUT] },
          { type: 'result', id: HOME, status: 'skipped', durationMs: 8, skipped: 1 },
          { type: 'result', id: ABOUT, status: 'passed', passed: 1, failed: 0, skipped: 0 },
          {
            type: 'done',
            outcome: 'completed',
            passed: 1,
            failed: 0,
            skipped: 1,
            durationMs: 2_000,
          },
        ]),
      },
      callbacks: ['onOpen', 'onStop'],
    },
    {
      name: 'a stopped run says it was stopped',
      props: {
        ...base,
        run: runOf([
          { type: 'start', runId: 'r1', ids: [HOME] },
          { type: 'done', outcome: 'cancelled', durationMs: 900 },
        ]),
      },
      callbacks: ['onOpen', 'onStop'],
    },
    {
      name: 'a run that failed to finish says so',
      props: {
        ...base,
        run: runOf([
          { type: 'start', runId: 'r1', ids: [HOME] },
          {
            type: 'done',
            outcome: 'timeout',
            error: 'The run passed its 10-minute budget and was stopped.',
          },
        ]),
      },
      callbacks: ['onOpen', 'onStop'],
    },

    // ── The legacy expansion props ──────────────────────────────────────────
    {
      name: 'the legacy expanded and onToggle props change nothing',
      props: { ...base, run: EMPTY_RUN_STATE, expanded: true },
      callbacks: ['onOpen', 'onToggle', 'onStop'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="tests-bar-toggle"]' },
        { type: 'props', props: { expanded: false } },
      ],
    },

    // ── i18n ────────────────────────────────────────────────────────────────
    {
      name: 'a locale switch re-renders every label through i18n',
      props: { ...base, run: liveRun() },
      callbacks: ['onOpen', 'onStop'],
      context: {
        translations: {
          fr: {
            ide: {
              testsBar: {
                running: 'Tests en cours — {{remaining}} restants',
                stop: 'Arrêter',
                failedLabel: 'en échec',
              },
              tests: {
                runningElsewhere: 'En cours dans un autre onglet…',
              },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}
