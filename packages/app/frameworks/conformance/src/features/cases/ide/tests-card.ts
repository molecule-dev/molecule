/**
 * `TestsCard` cases: the `/test` browser's every state — the listing and its
 * grouping, the search filter, who may run, a live run's rows and output, the
 * streamed per-test detail, skipped files, failures and their fix hand-over,
 * and the run's end states.
 *
 * The card is PRESENTATIONAL: the run arrives whole as the `run` prop, so the
 * states are folded with the real `applyTestRunEvent` (the reducer ChatPanel
 * drives it with) instead of hand-written shapes, and moved forward with
 * `props` steps exactly the way a stream event would.
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
 * Folds run events into the state the card is rendered with.
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

/** A live run the panel started itself, on its first file. */
const liveRun = (overrides: Partial<TestsRunState> = {}): TestsRunState =>
  runOf(
    [
      { type: 'start', runId: 'r1', ids: [HOME, ABOUT] },
      { type: 'output', id: HOME, chunk: 'Running 3 tests using 2 workers' },
    ],
    { skipUnavailable: false, ...overrides },
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

/** The props every case starts from; per-case fields follow. */
const listed = { tests: TESTS, status: 'ready', initialQuery: '', canRun: true } as const

/** `TestsCard`. */
export const testsCardCases: FeatureComponentCases = {
  component: 'TestsCard',
  keyedLists: [
    {
      prop: 'tests',
      selector: '[data-mol-id^="tests-card-row-"]',
      caseName: 'groups by kind, then directory, the root last',
    },
  ],
  cases: [
    // ── The listing ─────────────────────────────────────────────────────────
    {
      name: 'no tests',
      props: {
        tests: [],
        status: 'ready',
        run: EMPTY_RUN_STATE,
        initialQuery: '',
        canRun: true,
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'groups by kind, then directory, the root last',
      props: { ...listed, run: EMPTY_RUN_STATE, fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'a row without a title falls back to its file path',
      props: {
        tests: [
          {
            id: 'app:e2e/smoke.spec.ts',
            file: 'e2e/smoke.spec.ts',
            kind: 'e2e',
            workspace: 'app',
            workspaceLabel: 'app',
          },
          {
            id: 'app:src/util.test.ts',
            file: 'src/util.test.ts',
            kind: 'unit',
            workspace: 'app',
            title: 'utilities',
          },
        ],
        status: 'ready',
        run: EMPTY_RUN_STATE,
        initialQuery: '',
        canRun: true,
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'a directory without a label shows its path; the root shows the word Project',
      props: {
        tests: [
          {
            id: 'packages/web:e2e/a.spec.ts',
            file: 'e2e/a.spec.ts',
            kind: 'e2e',
            workspace: 'packages/web',
          },
          { id: '.:unit.test.ts', file: 'unit.test.ts', kind: 'unit', workspace: '.' },
        ],
        status: 'ready',
        run: EMPTY_RUN_STATE,
        initialQuery: '',
        canRun: true,
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'one kind only hides the per-kind buttons',
      props: {
        tests: [TESTS[2] as TestItem, TESTS[3] as TestItem],
        status: 'ready',
        run: EMPTY_RUN_STATE,
        initialQuery: '',
        canRun: true,
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },

    // ── The filter ──────────────────────────────────────────────────────────
    {
      name: 'the search box filters rows as you type',
      props: { ...listed, run: EMPTY_RUN_STATE, fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [
        { type: 'input', selector: '[data-mol-id="tests-card-search"]', value: 'about' },
        { type: 'input', selector: '[data-mol-id="tests-card-search"]', value: 'my-app/api' },
        { type: 'input', selector: '[data-mol-id="tests-card-search"]', value: 'tooling' },
      ],
    },
    {
      name: 'a pre-seeded query opens the card filtered',
      props: {
        ...listed,
        run: EMPTY_RUN_STATE,
        initialQuery: 'routes',
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'a query that matches nothing says so; a project without tests says that instead',
      props: { ...listed, run: EMPTY_RUN_STATE, fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [
        { type: 'input', selector: '[data-mol-id="tests-card-search"]', value: 'zzzz' },
        { type: 'input', selector: '[data-mol-id="tests-card-search"]', value: '   ' },
        { type: 'props', props: { tests: [] } },
      ],
    },
    {
      name: 'a later initialQuery prop never reseeds the box',
      props: { ...listed, run: EMPTY_RUN_STATE, fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [
        { type: 'input', selector: '[data-mol-id="tests-card-search"]', value: 'home' },
        { type: 'props', props: { initialQuery: 'routes' } },
      ],
    },

    // ── Listing states ──────────────────────────────────────────────────────
    {
      name: 'loading says so instead of a list',
      props: {
        ...listed,
        status: 'loading',
        run: EMPTY_RUN_STATE,
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'an error says the tests could not be listed',
      props: {
        ...listed,
        status: 'error',
        run: EMPTY_RUN_STATE,
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'a stopped project says to start it, and every run control says why it is dead',
      props: {
        ...listed,
        status: 'unavailable',
        run: EMPTY_RUN_STATE,
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [{ type: 'click', selector: '[data-mol-id="tests-card-run-all"]' }],
    },

    // ── Who may run ─────────────────────────────────────────────────────────
    {
      name: 'a viewer still reads the listing, with every run control disabled and the reason stated',
      props: {
        ...listed,
        run: EMPTY_RUN_STATE,
        canRun: false,
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [{ type: 'click', selector: '[data-mol-id="tests-card-run-all"]' }],
    },
    {
      name: 'a viewer’s reason waits until the list stops loading',
      props: {
        ...listed,
        status: 'loading',
        run: EMPTY_RUN_STATE,
        canRun: false,
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },

    // ── Dispatching runs ────────────────────────────────────────────────────
    {
      name: 'Run all runs every listed test, honouring the filter',
      props: { ...listed, run: EMPTY_RUN_STATE, fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="tests-card-run-all"]' },
        { type: 'input', selector: '[data-mol-id="tests-card-search"]', value: 'e2e/' },
        { type: 'click', selector: '[data-mol-id="tests-card-run-all"]' },
      ],
    },
    {
      name: 'the per-kind buttons run that kind only',
      props: { ...listed, run: EMPTY_RUN_STATE, fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="tests-card-run-e2e"]' },
        { type: 'click', selector: '[data-mol-id="tests-card-run-unit"]' },
      ],
    },
    {
      name: 'a group’s Run runs every id in that group',
      props: { ...listed, run: EMPTY_RUN_STATE, fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="tests-card-run-group-e2e-my-app/app"]' },
        { type: 'click', selector: '[data-mol-id="tests-card-run-group-unit-."]' },
      ],
    },
    {
      name: 'a row’s Run runs exactly that row',
      props: { ...listed, run: EMPTY_RUN_STATE, fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="tests-card-run-my-app/api:src/routes.test.ts"]' },
      ],
    },
    {
      name: 'Stop cancels the whole run',
      props: { ...listed, run: liveRun(), fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [{ type: 'click', selector: '[data-mol-id="tests-card-cancel"]' }],
    },

    // ── A live run ──────────────────────────────────────────────────────────
    {
      name: 'a live run spins its undecided rows and streams output behind a toggle',
      props: { ...listed, run: liveRun(), fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="tests-card-output-toggle"]' },
        { type: 'click', selector: '[data-mol-id="tests-card-output-toggle"]' },
      ],
    },
    {
      name: 'more output lines join under the block, and the open state survives',
      props: { ...listed, run: liveRun(), fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="tests-card-output-toggle"]' },
        {
          type: 'props',
          props: {
            run: runOf(
              [
                { type: 'start', runId: 'r1', ids: [HOME, ABOUT] },
                { type: 'output', id: HOME, chunk: 'Running 3 tests using 2 workers' },
                { type: 'output', id: HOME, chunk: '\n✓ home page › shows the hero (12ms)' },
              ],
              { skipUnavailable: false },
            ),
          },
        },
      ],
    },
    {
      name: 'the run moves on: rows report, the summary appears, the output area stays',
      props: { ...listed, run: liveRun(), fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
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
                {
                  type: 'done',
                  outcome: 'completed',
                  passed: 2,
                  failed: 1,
                  skipped: 0,
                  durationMs: 9_000,
                },
              ],
              { skipUnavailable: false },
            ),
          },
        },
      ],
    },
    {
      name: 'a filter that empties the list while a run is live keeps the header honest',
      props: { ...listed, run: liveRun(), fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [
        { type: 'input', selector: '[data-mol-id="tests-card-search"]', value: 'nothing-matches' },
      ],
    },

    // ── The test on screen, by name ─────────────────────────────────────────
    {
      name: 'a running file names the test on screen and tallies it as it goes',
      props: { ...listed, run: midFileRun, fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'a file with no case events yet spins without inventing a name',
      props: { ...listed, run: liveRun(), fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'the tally of decided tests stays up between a file’s tests',
      props: {
        ...listed,
        run: runOf(
          [
            { type: 'start', runId: 'r1', ids: [HOME, ABOUT] },
            {
              type: 'case',
              id: HOME,
              title: 'shows the hero',
              describe: 'home page',
              status: 'passed',
            },
            {
              type: 'case',
              id: HOME,
              title: 'links to pricing',
              describe: 'home page',
              status: 'passed',
            },
          ],
          { skipUnavailable: false },
        ),
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'the per-test detail collapses the moment the file reports',
      props: { ...listed, run: midFileRun, fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [
        {
          type: 'props',
          props: {
            run: runOf(
              [
                { type: 'start', runId: 'r1', ids: [HOME, ABOUT] },
                {
                  type: 'case',
                  id: HOME,
                  title: 'shows the hero',
                  describe: 'home page',
                  status: 'passed',
                },
                {
                  type: 'case',
                  id: HOME,
                  title: 'links to pricing',
                  describe: 'home page',
                  status: 'failed',
                },
                {
                  type: 'case',
                  id: HOME,
                  title: 'signs a user up',
                  describe: 'home page',
                  status: 'running',
                },
                { type: 'result', id: HOME, status: 'passed', passed: 2, failed: 1, skipped: 0 },
                {
                  type: 'done',
                  outcome: 'completed',
                  passed: 2,
                  failed: 1,
                  skipped: 0,
                  durationMs: 5_000,
                },
              ],
              { skipUnavailable: false },
            ),
          },
        },
      ],
    },

    // ── Runs this panel only watches ────────────────────────────────────────
    {
      name: 'an agent’s run names the agent and its command, and offers no Stop',
      props: {
        ...listed,
        run: runOf(
          [
            { type: 'start', runId: 'r9', ids: [], source: 'agent', command: 'npx vitest run src' },
            { type: 'output', id: HOME, chunk: 'RUN  v2.1.1 /home/workspace' },
          ],
          { external: true },
        ),
        agentName: 'Alfred',
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'an agent run without a name says the default, and no command stays hidden',
      props: {
        ...listed,
        run: runOf(
          [
            { type: 'start', runId: 'r9', ids: [], source: 'agent' },
            { type: 'output', id: HOME, chunk: 'RUN  v2.1.1' },
          ],
          { external: true },
        ),
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'the platform’s run says it is checking the deploy',
      props: {
        ...listed,
        run: runOf(
          [
            { type: 'start', runId: 'r9', ids: [], source: 'platform', command: 'mol verify' },
            { type: 'output', id: ABOUT, chunk: 'verifying…' },
          ],
          { external: true },
        ),
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'another tab’s run says so',
      props: {
        ...listed,
        run: runOf(
          [
            { type: 'start', runId: 'r9', ids: [], source: 'person', command: 'npm test' },
            { type: 'output', id: ABOUT, chunk: '>' },
          ],
          { external: true },
        ),
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'an agentName on this panel’s own run still says Running',
      props: {
        ...listed,
        run: runOf([
          { type: 'start', runId: 'r1', ids: [HOME] },
          { type: 'output', id: HOME, chunk: 'Running 2 tests' },
        ]),
        agentName: 'Alfred',
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },

    // ── Failures and fixes ──────────────────────────────────────────────────
    {
      name: 'a failed row keeps its output behind a toggle and offers a fix',
      props: { ...listed, run: failedRun, fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [
        {
          type: 'click',
          selector: '[data-mol-id="tests-card-failure-toggle-my-app/app:e2e/about.spec.ts"]',
        },
        {
          type: 'click',
          selector: '[data-mol-id="tests-card-failure-toggle-my-app/app:e2e/about.spec.ts"]',
        },
      ],
    },
    {
      name: 'a failure block open stays open while the run moves on',
      props: { ...listed, run: failedRun, fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [
        {
          type: 'click',
          selector: '[data-mol-id="tests-card-failure-toggle-my-app/app:e2e/about.spec.ts"]',
        },
        {
          type: 'props',
          props: {
            run: runOf(
              [
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
                {
                  type: 'done',
                  outcome: 'completed',
                  passed: 1,
                  failed: 2,
                  skipped: 0,
                  durationMs: 4_000,
                },
                { type: 'start', runId: 'r2', ids: [ABOUT] },
              ],
              { skipUnavailable: false },
            ),
          },
        },
      ],
    },
    {
      name: 'the header fix batches every failure into one hand-over',
      props: { ...listed, run: failedRun, fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [{ type: 'click', selector: '[data-mol-id="tests-card-fix-all"]' }],
    },
    {
      name: 'a single failure reads Fix with Synthase, and the row fix hands over just it',
      props: {
        ...listed,
        run: runOf([
          { type: 'start', runId: 'r1', ids: [ABOUT] },
          {
            type: 'result',
            id: ABOUT,
            status: 'failed',
            passed: 0,
            failed: 1,
            skipped: 0,
            output: 'boom',
          },
          {
            type: 'done',
            outcome: 'completed',
            passed: 0,
            failed: 1,
            skipped: 0,
            durationMs: 1_000,
          },
        ]),
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="tests-card-fix-my-app/app:e2e/about.spec.ts"]' },
      ],
    },
    {
      name: 'a fix the viewer cannot send is disabled with the reason',
      props: {
        ...listed,
        run: failedRun,
        fixDisabledReason: 'Wait for the current turn to finish.',
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="tests-card-fix-all"]' },
        { type: 'click', selector: '[data-mol-id="tests-card-fix-my-app/app:e2e/about.spec.ts"]' },
      ],
    },
    {
      name: 'a failure without output keeps its fix but not a toggle',
      props: {
        ...listed,
        run: runOf([
          { type: 'start', runId: 'r1', ids: [HOME, ABOUT, 'my-app/api:src/routes.test.ts'] },
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
          },
          {
            type: 'done',
            outcome: 'completed',
            passed: 0,
            failed: 2,
            skipped: 0,
            durationMs: 2_000,
          },
        ]),
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="tests-card-fix-my-app/api:src/routes.test.ts"]' },
      ],
    },

    // ── Skipping the file that is running ───────────────────────────────────
    {
      name: 'Skip lives on the row the run is on, and nowhere else',
      props: { ...listed, run: liveRun(), fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix', 'onSkipCurrent'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="tests-card-skip-my-app/app:e2e/home.spec.ts"]' },
      ],
    },
    {
      name: 'a pending skip says Skipping and stops taking clicks',
      props: {
        ...listed,
        run: liveRun({ skipPending: true }),
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix', 'onSkipCurrent'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="tests-card-skip-my-app/app:e2e/home.spec.ts"]' },
      ],
    },
    {
      name: 'no Skip at all when the host says there is none to skip',
      props: {
        ...listed,
        run: liveRun({ skipUnavailable: true }),
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'no Skip either when the host wired no callback, whatever the state says',
      props: { ...listed, run: liveRun(), fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'a viewer’s Skip is disabled with the reason, and a click does nothing',
      props: { ...listed, run: liveRun(), canRun: false, fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix', 'onSkipCurrent'],
      interactions: [
        { type: 'click', selector: '[data-mol-id="tests-card-skip-my-app/app:e2e/home.spec.ts"]' },
      ],
    },
    {
      name: 'a skipped file reads Skipped, the summary counts it, and the run says what happened',
      props: {
        ...listed,
        run: runOf([
          { type: 'start', runId: 'r1', ids: [HOME, ABOUT] },
          { type: 'result', id: HOME, status: 'skipped', durationMs: 8, skipped: 1 },
          { type: 'result', id: ABOUT, status: 'passed', passed: 2 },
          { type: 'done', outcome: 'skipped-by-user', durationMs: 3_000 },
        ]),
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },

    // ── End states ──────────────────────────────────────────────────────────
    {
      name: 'a run error is stated in the card',
      props: {
        ...listed,
        run: runOf([
          { type: 'start', runId: 'r1', ids: [HOME] },
          {
            type: 'done',
            outcome: 'timeout',
            error: 'The run passed its 10-minute budget and was stopped.',
          },
        ]),
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'a cancelled run says it was stopped',
      props: {
        ...listed,
        run: runOf([
          { type: 'start', runId: 'r1', ids: [HOME] },
          { type: 'done', outcome: 'cancelled', durationMs: 900 },
        ]),
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },

    // ── Chrome ──────────────────────────────────────────────────────────────
    {
      name: 'embedded drops the heading and the card chrome',
      props: {
        ...listed,
        run: EMPTY_RUN_STATE,
        embedded: true,
        fixDisabledReason: null,
        isLight: false,
      },
      callbacks: ['onRun', 'onCancel', 'onFix'],
    },
    {
      name: 'the light theme swaps the row borders and the field inset',
      props: { ...listed, run: failedRun, isLight: true, fixDisabledReason: null },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      interactions: [
        {
          type: 'click',
          selector: '[data-mol-id="tests-card-failure-toggle-my-app/app:e2e/about.spec.ts"]',
        },
      ],
    },
    {
      name: 'a locale switch re-renders every label through i18n',
      props: { ...listed, run: failedRun, fixDisabledReason: null, isLight: false },
      callbacks: ['onRun', 'onCancel', 'onFix'],
      context: {
        translations: {
          fr: {
            ide: {
              tests: {
                heading: 'Tests (fr)',
                runAll: 'Tout lancer',
                run: 'Lancer',
                statusPassed: 'Réussi',
                statusFailed: 'Échoué',
                statusSkipped: 'Ignoré',
              },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}
