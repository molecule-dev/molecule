// @vitest-environment jsdom

/**
 * TestsCard — the `/test` browser — rendered for real: what it lists, how it
 * groups, what a Run asks the host for, what streamed events do to the rows,
 * and what a viewer (or a stopped project) is shown instead of a dead button.
 *
 * The card is PRESENTATIONAL (ChatPanel owns the list and the run so a run
 * survives the overlay closing), so these drive it exactly the way ChatPanel
 * does: props in, `onRun`/`onCancel` out.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  applyTestRunEvent,
  EMPTY_RUN_STATE,
  type TestFailure,
  type TestsRunState,
} from '../components/tests-card-utilities.js'
import { TestsCard } from '../components/TestsCard.js'
import type { TestItem, TestRunEvent, TestSelection } from '../types.js'

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

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

/**
 * Render the card the way ChatPanel does.
 *
 * @param overrides - Props to override.
 * @returns The container plus the recorded host calls.
 */
function renderCard(overrides: Partial<ComponentProps<typeof TestsCard>> = {}): {
  container: HTMLElement
  selections: TestSelection[]
  cancels: { count: number }
  skips: { count: number }
  fixes: TestFailure[][]
} {
  const selections: TestSelection[] = []
  const cancels = { count: 0 }
  const skips = { count: 0 }
  const fixes: TestFailure[][] = []
  const { container } = render(
    <TestsCard
      tests={TESTS}
      status="ready"
      run={EMPTY_RUN_STATE}
      initialQuery=""
      canRun
      onRun={(selection) => selections.push(selection)}
      onCancel={() => {
        cancels.count += 1
      }}
      onSkipCurrent={() => {
        skips.count += 1
      }}
      onFix={(failures) => fixes.push(failures)}
      fixDisabledReason={null}
      isLight={false}
      {...overrides}
    />,
  )
  return { container, selections, cancels, skips, fixes }
}

/**
 * Fold a run's events into a state the card can be rendered with.
 *
 * @param events - The events, in order.
 * @returns The resulting state.
 */
function runStateOf(events: TestRunEvent[]): TestsRunState {
  return events.reduce(applyTestRunEvent, EMPTY_RUN_STATE)
}

/** A finished run: one pass, two failures with output. */
const FAILED_RUN: TestRunEvent[] = [
  {
    type: 'start',
    runId: 'r1',
    ids: ['my-app/app:e2e/home.spec.ts', 'my-app/app:e2e/about.spec.ts'],
  },
  {
    type: 'result',
    id: 'my-app/app:e2e/home.spec.ts',
    status: 'passed',
    passed: 1,
    failed: 0,
    skipped: 0,
  },
  {
    type: 'result',
    id: 'my-app/app:e2e/about.spec.ts',
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
  { type: 'done', outcome: 'completed', passed: 1, failed: 2, skipped: 0 },
]
describe('TestsCard — listing', () => {
  it('groups by kind and by the directory that owns each test', () => {
    const { container } = renderCard()
    expect(molId(container, 'tests-card')).not.toBeNull()
    const e2e = molId(container, 'tests-card-group-e2e-my-app/app')
    expect(e2e?.textContent).toContain('End-to-end · my-app/app')
    expect(molId(container, 'tests-card-group-unit-my-app/api')?.textContent).toContain(
      'Unit · my-app/api',
    )
    // The workspace ROOT has no name of its own, so the card supplies the word.
    expect(molId(container, 'tests-card-group-unit-.')?.textContent).toContain('Unit · Project')
    expect(molId(container, 'tests-card-row-my-app/app:e2e/home.spec.ts')).not.toBeNull()
  })

  it('tells e2e readers the specs drive the live preview', () => {
    const { container } = renderCard()
    expect(molId(container, 'tests-card-e2e-hint')?.textContent).toContain('live preview')
  })

  it('filters on the search box, matching file, title, or directory', () => {
    const { container } = renderCard()
    const search = molId(container, 'tests-card-search') as HTMLInputElement
    fireEvent.change(search, { target: { value: 'about' } })
    expect(molId(container, 'tests-card-row-my-app/app:e2e/about.spec.ts')).not.toBeNull()
    expect(molId(container, 'tests-card-row-my-app/app:e2e/home.spec.ts')).toBeNull()

    fireEvent.change(search, { target: { value: 'my-app/api' } })
    expect(molId(container, 'tests-card-row-my-app/api:src/routes.test.ts')).not.toBeNull()
    expect(molId(container, 'tests-card-row-my-app/app:e2e/home.spec.ts')).toBeNull()
  })

  it('opens pre-filtered when /test <query> seeded it', () => {
    const { container } = renderCard({ initialQuery: 'routes' })
    expect((molId(container, 'tests-card-search') as HTMLInputElement).value).toBe('routes')
    expect(molId(container, 'tests-card-row-my-app/api:src/routes.test.ts')).not.toBeNull()
    expect(molId(container, 'tests-card-row-my-app/app:e2e/home.spec.ts')).toBeNull()
  })

  it('says so when nothing matches, and when the project has no tests', () => {
    const { container } = renderCard()
    fireEvent.change(molId(container, 'tests-card-search') as HTMLInputElement, {
      target: { value: 'zzzz' },
    })
    expect(molId(container, 'tests-card-empty')?.textContent).toContain('No tests match')

    cleanup()
    const empty = renderCard({ tests: [] })
    expect(molId(empty.container, 'tests-card-empty')?.textContent).toContain('No tests')
  })

  it('renders the loading / error / unavailable states instead of an empty list', () => {
    const loading = renderCard({ status: 'loading' })
    expect(loading.container.textContent).toContain('Loading tests')
    cleanup()

    const errored = renderCard({ status: 'error' })
    expect(molId(errored.container, 'tests-card-error')?.textContent).toContain('Could not list')
    cleanup()

    const down = renderCard({ status: 'unavailable' })
    expect(molId(down.container, 'tests-card-unavailable')?.textContent).toContain(
      'Start the project',
    )
  })
})

describe('TestsCard — dispatching runs', () => {
  it('Run all asks the host for every LISTED test, honouring the filter', () => {
    const { container, selections } = renderCard()
    fireEvent.click(molId(container, 'tests-card-run-all') as HTMLElement)
    expect(selections).toEqual([{ ids: TESTS.map((t) => t.id) }])

    fireEvent.change(molId(container, 'tests-card-search') as HTMLInputElement, {
      target: { value: 'e2e/' },
    })
    fireEvent.click(molId(container, 'tests-card-run-all') as HTMLElement)
    expect(selections[1]).toEqual({
      ids: ['my-app/app:e2e/home.spec.ts', 'my-app/app:e2e/about.spec.ts'],
    })
  })

  it('the per-kind buttons ask for that kind only', () => {
    const { container, selections } = renderCard()
    fireEvent.click(molId(container, 'tests-card-run-e2e') as HTMLElement)
    fireEvent.click(molId(container, 'tests-card-run-unit') as HTMLElement)
    expect(selections).toEqual([
      { ids: ['my-app/app:e2e/home.spec.ts', 'my-app/app:e2e/about.spec.ts'] },
      { ids: ['my-app/api:src/routes.test.ts', '.:tests/tooling.test.ts'] },
    ])
  })

  it('a group’s Run asks for every id in that group', () => {
    const { container, selections } = renderCard()
    fireEvent.click(molId(container, 'tests-card-run-group-e2e-my-app/app') as HTMLElement)
    expect(selections).toEqual([
      { ids: ['my-app/app:e2e/about.spec.ts', 'my-app/app:e2e/home.spec.ts'] },
    ])
  })

  it('a single row’s Run asks for exactly that one id', () => {
    const { container, selections } = renderCard()
    fireEvent.click(molId(container, 'tests-card-run-my-app/api:src/routes.test.ts') as HTMLElement)
    expect(selections).toEqual([{ ids: ['my-app/api:src/routes.test.ts'] }])
  })

  it('Stop asks the host to cancel', () => {
    const { container, cancels } = renderCard({
      run: runStateOf([{ type: 'start', runId: 'r1', ids: ['my-app/app:e2e/home.spec.ts'] }]),
    })
    fireEvent.click(molId(container, 'tests-card-cancel') as HTMLElement)
    expect(cancels.count).toBe(1)
  })
})

describe('TestsCard — a live run', () => {
  it('spins the running rows, shows the output, then marks each row from its result', () => {
    const running = runStateOf([
      {
        type: 'start',
        runId: 'r1',
        ids: ['my-app/app:e2e/home.spec.ts', 'my-app/app:e2e/about.spec.ts'],
      },
      { type: 'output', id: 'my-app/app:e2e/home.spec.ts', chunk: 'Running 1 test using 1 worker' },
    ])
    const live = renderCard({ run: running })
    expect(molId(live.container, 'tests-card-running')?.textContent).toContain('Running')
    expect(
      molId(live.container, 'tests-card-status-my-app/app:e2e/home.spec.ts')?.textContent,
    ).toContain('Running')
    fireEvent.click(molId(live.container, 'tests-card-output-toggle') as HTMLElement)
    expect(molId(live.container, 'tests-card-output')?.textContent).toContain('Running 1 test')
    cleanup()

    const done = renderCard({
      run: runStateOf([
        {
          type: 'start',
          runId: 'r1',
          ids: ['my-app/app:e2e/home.spec.ts', 'my-app/app:e2e/about.spec.ts'],
        },
        {
          type: 'result',
          id: 'my-app/app:e2e/home.spec.ts',
          status: 'passed',
          passed: 1,
          failed: 0,
          skipped: 0,
        },
        {
          type: 'result',
          id: 'my-app/app:e2e/about.spec.ts',
          status: 'failed',
          passed: 0,
          failed: 1,
          skipped: 0,
          output: 'Error: expect(received).toBe(expected)',
        },
        { type: 'done', outcome: 'completed', passed: 1, failed: 1, skipped: 0 },
      ]),
    })
    expect(
      molId(done.container, 'tests-card-status-my-app/app:e2e/home.spec.ts')?.textContent,
    ).toBe('Passed')
    expect(
      molId(done.container, 'tests-card-status-my-app/app:e2e/about.spec.ts')?.textContent,
    ).toBe('Failed')
    expect(molId(done.container, 'tests-card-summary')?.textContent).toContain('1 passed')
    expect(molId(done.container, 'tests-card-summary')?.textContent).toContain('1 failed')
  })

  it('keeps a failure’s output under its row after the run ends, behind its toggle', () => {
    const { container } = renderCard({
      run: runStateOf([
        { type: 'start', runId: 'r1', ids: ['my-app/app:e2e/about.spec.ts'] },
        {
          type: 'result',
          id: 'my-app/app:e2e/about.spec.ts',
          status: 'failed',
          passed: 0,
          failed: 1,
          skipped: 0,
          output: 'Error: No tests found.\n  Expected: 2',
        },
        { type: 'done', outcome: 'completed', passed: 0, failed: 1, skipped: 0 },
      ]),
    })
    fireEvent.click(
      molId(container, 'tests-card-failure-toggle-my-app/app:e2e/about.spec.ts') as HTMLElement,
    )
    expect(
      molId(container, 'tests-card-failure-my-app/app:e2e/about.spec.ts')?.textContent,
    ).toContain('No tests found')
    // A passing row never grows an output block.
    expect(molId(container, 'tests-card-failure-my-app/app:e2e/home.spec.ts')).toBeNull()
  })

  it('surfaces a run error in the card rather than a toast', () => {
    const { container } = renderCard({
      run: runStateOf([
        { type: 'start', runId: 'r1', ids: ['my-app/app:e2e/home.spec.ts'] },
        {
          type: 'done',
          outcome: 'timeout',
          error: 'The run passed its 10-minute budget and was stopped.',
        },
      ]),
    })
    expect(molId(container, 'tests-card-run-error')?.textContent).toContain('10-minute budget')
  })

  it('says a cancelled run was stopped', () => {
    const { container } = renderCard({
      run: runStateOf([
        { type: 'start', runId: 'r1', ids: ['my-app/app:e2e/home.spec.ts'] },
        { type: 'done', outcome: 'cancelled' },
      ]),
    })
    expect(molId(container, 'tests-card-cancelled')?.textContent).toContain('stopped')
  })
})

describe('TestsCard — who may run', () => {
  it('a VIEWER still sees the tests, with every run control disabled and the reason shown', () => {
    const { container, selections } = renderCard({ canRun: false })
    expect(molId(container, 'tests-card-disabled-reason')?.textContent).toContain(
      'Only editors can run',
    )
    const runAll = molId(container, 'tests-card-run-all') as HTMLButtonElement
    expect(runAll.disabled).toBe(true)
    fireEvent.click(runAll)
    expect(selections).toHaveLength(0)
    expect(
      (molId(container, 'tests-card-run-my-app/app:e2e/home.spec.ts') as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    // The listing itself is still readable — that is the point of showing it.
    expect(molId(container, 'tests-card-row-my-app/app:e2e/home.spec.ts')).not.toBeNull()
  })

  it('a stopped project disables running and says to start it', () => {
    const { container } = renderCard({ status: 'unavailable' })
    expect(molId(container, 'tests-card-disabled-reason')?.textContent).toContain(
      'Start the project',
    )
  })

  it('does not offer a second run while one is live', () => {
    const { container } = renderCard({
      run: runStateOf([{ type: 'start', runId: 'r1', ids: ['my-app/app:e2e/home.spec.ts'] }]),
    })
    expect(molId(container, 'tests-card-run-all')).toBeNull()
    expect(molId(container, 'tests-card-cancel')).not.toBeNull()
    expect((molId(container, 'tests-card-run-e2e') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('TestsCard — chrome', () => {
  it('drops its own heading when embedded in the command overlay', () => {
    const inline = renderCard()
    expect(inline.container.textContent).toContain('Tests')
    cleanup()
    const embedded = renderCard({ embedded: true })
    // The overlay header already shows the title; the card must not repeat it.
    const heading = embedded.container.querySelector('[data-mol-id="tests-card"] > div')
    expect(heading?.textContent).not.toBe('Tests')
  })

  it('has a data-mol-id on every interactive element', () => {
    const { container } = renderCard()
    const interactive = container.querySelectorAll('button, input')
    expect(interactive.length).toBeGreaterThan(0)
    for (const el of interactive) {
      expect(el.getAttribute('data-mol-id'), el.outerHTML.slice(0, 80)).toBeTruthy()
    }
  })
})

describe('TestsCard — module surface', () => {
  it('is exported from the package barrel', async () => {
    const barrel = await import('../index.js')
    expect(typeof (barrel as { TestsCard?: unknown }).TestsCard).toBe('function')
    expect(vi.isMockFunction((barrel as { TestsCard?: unknown }).TestsCard)).toBe(false)
  })
})

describe('TestsCard — output is collapsed by default', () => {
  it('shows the run output only after the toggle is clicked', () => {
    const { container } = renderCard({
      run: runStateOf([
        { type: 'start', runId: 'r1', ids: [] },
        { type: 'output', chunk: 'Running 1 test' },
      ]),
    })
    expect(molId(container, 'tests-card-output-area')).not.toBeNull()
    expect(molId(container, 'tests-card-output'), 'output starts collapsed').toBeNull()

    const toggle = molId(container, 'tests-card-output-toggle') as HTMLElement
    expect(toggle.textContent).toBe('Show output')
    fireEvent.click(toggle)
    expect(molId(container, 'tests-card-output')?.textContent).toContain('Running 1 test')
    expect(molId(container, 'tests-card-output-toggle')?.textContent).toBe('Hide output')

    fireEvent.click(molId(container, 'tests-card-output-toggle') as HTMLElement)
    expect(molId(container, 'tests-card-output')).toBeNull()
  })

  it('stays collapsed WHILE a run streams — the pills carry the state', () => {
    const { container } = renderCard({
      run: runStateOf([
        { type: 'start', runId: 'r1', ids: ['my-app/app:e2e/home.spec.ts'] },
        { type: 'output', chunk: 'Running 1 test using 1 worker' },
      ]),
    })
    expect(molId(container, 'tests-card-running')).not.toBeNull()
    expect(molId(container, 'tests-card-output')).toBeNull()
  })

  it('a failure’s output starts collapsed behind the same toggle', () => {
    const { container } = renderCard({ run: runStateOf(FAILED_RUN) })
    const id = 'my-app/app:e2e/about.spec.ts'
    expect(molId(container, `tests-card-failure-${id}`), 'starts collapsed').toBeNull()
    const toggle = molId(container, `tests-card-failure-toggle-${id}`) as HTMLElement
    expect(toggle.textContent).toBe('Show output')
    fireEvent.click(toggle)
    expect(molId(container, `tests-card-failure-${id}`)?.textContent).toContain('expect(received)')
  })
})

describe('TestsCard — fix with Synthase', () => {
  it('offers a fix on every failed row, and nowhere else', () => {
    const { container } = renderCard({ run: runStateOf(FAILED_RUN) })
    expect(molId(container, 'tests-card-fix-my-app/app:e2e/about.spec.ts')).not.toBeNull()
    expect(molId(container, 'tests-card-fix-my-app/api:src/routes.test.ts')).not.toBeNull()
    // The passing row and the never-run rows carry no fix action.
    expect(molId(container, 'tests-card-fix-my-app/app:e2e/home.spec.ts')).toBeNull()
    expect(molId(container, 'tests-card-fix-.:tests/tooling.test.ts')).toBeNull()
  })

  it('a row’s fix hands over exactly that test and its output', () => {
    const { container, fixes } = renderCard({ run: runStateOf(FAILED_RUN) })
    fireEvent.click(molId(container, 'tests-card-fix-my-app/app:e2e/about.spec.ts') as HTMLElement)
    expect(fixes).toHaveLength(1)
    expect(fixes[0]).toHaveLength(1)
    expect(fixes[0]?.[0]?.item.id).toBe('my-app/app:e2e/about.spec.ts')
    expect(fixes[0]?.[0]?.output).toContain('expect(received)')
  })

  it('the header batches EVERY failure into one hand-over', () => {
    const { container, fixes } = renderCard({ run: runStateOf(FAILED_RUN) })
    const all = molId(container, 'tests-card-fix-all') as HTMLElement
    expect(all.textContent).toBe('Fix 2 failures')
    fireEvent.click(all)
    expect(fixes[0]?.map((f) => f.item.id)).toEqual([
      'my-app/app:e2e/about.spec.ts',
      'my-app/api:src/routes.test.ts',
    ])
  })

  it('reads “Fix with Synthase” when there is only one failure', () => {
    const { container } = renderCard({
      run: runStateOf([
        { type: 'start', runId: 'r1', ids: ['my-app/app:e2e/about.spec.ts'] },
        {
          type: 'result',
          id: 'my-app/app:e2e/about.spec.ts',
          status: 'failed',
          passed: 0,
          failed: 1,
          skipped: 0,
          output: 'boom',
        },
        { type: 'done', outcome: 'completed', passed: 0, failed: 1, skipped: 0 },
      ]),
    })
    expect(molId(container, 'tests-card-fix-all')?.textContent).toBe('Fix with Synthase')
  })

  it('is disabled with the reason when the viewer cannot send', () => {
    const { container, fixes } = renderCard({
      run: runStateOf(FAILED_RUN),
      fixDisabledReason: 'Wait for the current turn to finish.',
    })
    const fix = molId(container, 'tests-card-fix-my-app/app:e2e/about.spec.ts') as HTMLButtonElement
    expect(fix.disabled).toBe(true)
    expect(fix.getAttribute('title')).toBe('Wait for the current turn to finish.')
    fireEvent.click(fix)
    expect(fixes).toHaveLength(0)
    expect((molId(container, 'tests-card-fix-all') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('TestsCard — the test being run, by name', () => {
  const HOME = 'my-app/app:e2e/home.spec.ts'
  const ABOUT = 'my-app/app:e2e/about.spec.ts'

  /**
   * A run that is mid-file: two of this file's tests are decided and a third is
   * on screen.
   *
   * @returns The run state.
   */
  const midFile = (): TestsRunState => ({
    ...runStateOf([
      { type: 'start', runId: 'r1', ids: [HOME, ABOUT] },
      { type: 'case', id: HOME, title: 'shows the hero', describe: 'home page', status: 'passed' },
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
    ]),
    skipUnavailable: false,
  })

  it('names the test on screen, with its group, and tallies that file as it goes', () => {
    const { container } = renderCard({ run: midFile() })
    expect(molId(container, `tests-card-case-title-${HOME}`)?.textContent).toBe(
      'home page › signs a user up',
    )
    const tally = molId(container, `tests-card-case-tally-${HOME}`)?.textContent ?? ''
    expect(tally).toContain('1 passed')
    expect(tally).toContain('1 failed')
    // The row still says it is running; the per-test line is detail beneath it.
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toContain('Running')
  })

  it('shows a running file with no case events yet without inventing a name', () => {
    const { container } = renderCard({
      run: runStateOf([{ type: 'start', runId: 'r1', ids: [HOME] }]),
    })
    expect(molId(container, `tests-card-case-${HOME}`)).toBeNull()
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toContain('Running')
  })

  it('collapses the per-test detail the moment the file reports its verdict', () => {
    const { container } = renderCard({
      run: runStateOf([
        { type: 'start', runId: 'r1', ids: [HOME] },
        { type: 'case', id: HOME, title: 'signs a user up', status: 'running' },
        { type: 'result', id: HOME, status: 'passed', passed: 3, failed: 0, skipped: 0 },
        { type: 'done', outcome: 'completed' },
      ]),
    })
    expect(molId(container, `tests-card-case-${HOME}`)).toBeNull()
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Passed')
  })
})

describe('TestsCard — skipping the file that is running', () => {
  const HOME = 'my-app/app:e2e/home.spec.ts'
  const ABOUT = 'my-app/app:e2e/about.spec.ts'

  /**
   * A live run whose host serves skipping, sitting on one named row.
   *
   * @param overrides - Run-state overrides.
   * @returns The run state.
   */
  const live = (overrides: Partial<TestsRunState> = {}): TestsRunState => ({
    ...runStateOf([
      { type: 'start', runId: 'r1', ids: [HOME, ABOUT] },
      { type: 'output', id: HOME, chunk: 'Running 3 tests' },
    ]),
    skipUnavailable: false,
    ...overrides,
  })

  it('offers Skip on the row the run is on, and nowhere else', () => {
    const { container, skips } = renderCard({ run: live() })
    const skip = molId(container, `tests-card-skip-${HOME}`) as HTMLButtonElement
    expect(skip).not.toBeNull()
    expect(skip.textContent).toBe('Skip')
    expect(molId(container, `tests-card-skip-${ABOUT}`)).toBeNull()
    fireEvent.click(skip)
    expect(skips.count).toBe(1)
  })

  it('Stop in the header is still the whole run — the two are different actions', () => {
    const { container, cancels, skips } = renderCard({ run: live() })
    fireEvent.click(molId(container, 'tests-card-cancel') as HTMLElement)
    expect(cancels.count).toBe(1)
    expect(skips.count).toBe(0)
  })

  it('says Skipping… and stops taking clicks while the request is out', () => {
    const { container, skips } = renderCard({ run: live({ skipPending: true }) })
    const skip = molId(container, `tests-card-skip-${HOME}`) as HTMLButtonElement
    expect(skip.textContent).toBe('Skipping…')
    expect(skip.disabled).toBe(true)
    fireEvent.click(skip)
    expect(skips.count).toBe(0)
  })

  it('renders no Skip at all when the host does not serve one', () => {
    const { container } = renderCard({ run: live({ skipUnavailable: true }) })
    expect(molId(container, `tests-card-skip-${HOME}`)).toBeNull()
    // …and none when the host wired no callback, whatever the state says.
    cleanup()
    const without = renderCard({ run: live(), onSkipCurrent: undefined })
    expect(molId(without.container, `tests-card-skip-${HOME}`)).toBeNull()
  })

  it('a viewer sees the Skip disabled, with the reason, rather than nothing', () => {
    const { container, skips } = renderCard({ run: live(), canRun: false })
    const skip = molId(container, `tests-card-skip-${HOME}`) as HTMLButtonElement
    expect(skip.disabled).toBe(true)
    expect(skip.getAttribute('title')).toBe('Only editors can skip this project’s tests.')
    fireEvent.click(skip)
    expect(skips.count).toBe(0)
  })

  it('a skipped file reads Skipped — never Passed — and the summary counts it', () => {
    const { container } = renderCard({
      run: runStateOf([
        { type: 'start', runId: 'r1', ids: [HOME, ABOUT] },
        { type: 'result', id: HOME, status: 'skipped', durationMs: 8, skipped: 1 },
        { type: 'result', id: ABOUT, status: 'passed', passed: 2 },
        { type: 'done', outcome: 'skipped-by-user' },
      ]),
    })
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toBe('Skipped')
    expect(molId(container, 'tests-card-summary-skipped')?.textContent).toBe('1 skipped')
    expect(molId(container, 'tests-card-summary')?.textContent).toContain('1 passed')
    expect(molId(container, 'tests-card-skipped')?.textContent).toBe(
      'Run finished. The tests you skipped did not run.',
    )
    // A skipped file offers no "Fix with Synthase" — there is nothing to fix.
    expect(molId(container, `tests-card-fix-${HOME}`)).toBeNull()
  })

  it('every Skip carries a data-mol-id, like every other control', () => {
    const { container } = renderCard({ run: live() })
    for (const el of container.querySelectorAll('button, input')) {
      expect(el.getAttribute('data-mol-id'), el.outerHTML.slice(0, 80)).toBeTruthy()
    }
  })
})
