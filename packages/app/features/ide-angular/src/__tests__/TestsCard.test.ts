// @vitest-environment jsdom
/**
 * TestsCard — the `/test` browser — rendered for real: a port of
 * `@molecule/app-ide-react/src/__tests__/TestsCard.test.tsx` with the same
 * test names and the same behavioral assertions, mounted through Angular's
 * own `createApplication` (the card is PRESENTATIONAL: inputs in, callbacks
 * out).
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { TestItem, TestRunEvent, TestSelection } from '@molecule/app-ide-panel-logic'
import {
  applyTestRunEvent,
  EMPTY_RUN_STATE,
  type TestFailure,
  type TestsRunState,
} from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { TestsCard } from '../components/tests-card.component.js'
import * as barrel from '../index.js'

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

/** One mounted card, with the recorded host calls and its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof TestsCardHost>>
  container: HTMLElement
  selections: TestSelection[]
  cancels: { count: number }
  skips: { count: number }
  fixes: TestFailure[][]
}

/**
 * The JIT host the way the conformance kit mounts the card: its template
 * binds every input, so the signal inputs are set through real bindings (a
 * bare `createComponent` + `setInput` writes nothing the card can read).
 */
const TestsCardHost = Component({
  selector: 'mol-tests-card-host',
  standalone: true,
  imports: [TestsCard],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-tests-card [tests]="p['tests']" [status]="p['status']" [run]="p['run']" [initialQuery]="p['initialQuery']" [canRun]="p['canRun']" [onRun]="p['onRun']" [onCancel]="p['onCancel']" [onSkipCurrent]="p['onSkipCurrent']" [onFix]="p['onFix']" [fixDisabledReason]="p['fixDisabledReason']" [isLight]="p['isLight']" [embedded]="p['embedded']" [agentName]="p['agentName']"></div>`,
})(
  class TestsCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

/** Lets Angular's zoneless change detection settle what an event queued. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  current.appRef.tick()
}

/**
 * Render the card the way ChatPanel does.
 *
 * @param overrides - Inputs to override.
 * @returns The container plus the recorded host calls.
 */
async function renderCard(overrides: Record<string, unknown> = {}): Promise<Mounted> {
  const selections: TestSelection[] = []
  const cancels = { count: 0 }
  const skips = { count: 0 }
  const fixes: TestFailure[][] = []
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<InstanceType<typeof TestsCardHost>> = createComponent(TestsCardHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = {
    tests: TESTS,
    status: 'ready',
    run: EMPTY_RUN_STATE,
    initialQuery: '',
    canRun: true,
    onRun: (selection: TestSelection) => selections.push(selection),
    onCancel: () => {
      cancels.count += 1
    },
    onSkipCurrent: () => {
      skips.count += 1
    },
    onFix: (failureList: TestFailure[]) => fixes.push(failureList),
    fixDisabledReason: null,
    isLight: false,
    embedded: undefined,
    agentName: undefined,
    ...overrides,
  }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container, selections, cancels, skips, fixes }
  await flush()
  return current
}

/** Destroys the live mount, the way the React suite's `cleanup()` does. */
async function stop(): Promise<void> {
  if (!current) return
  current.appRef.destroy()
  current.container.remove()
  current = null
  document.body.innerHTML = ''
}

/** Clicks like a user and lets Angular settle. */
async function click(el: HTMLElement | null): Promise<void> {
  el?.click()
  await flush()
}

/** Types like a user: the value, then a bubbling `input` event. */
async function type(el: HTMLInputElement | null, value: string): Promise<void> {
  if (!el) throw new Error('missing element to type into')
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  await flush()
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
  it('groups by kind and by the directory that owns each test', async () => {
    const { container } = await renderCard()
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

  it('does not require a live preview for browser tests', async () => {
    const { container } = await renderCard()
    expect(molId(container, 'tests-card-e2e-hint')).toBeNull()
  })

  it('filters on the search box, matching file, title, or directory', async () => {
    const { container } = await renderCard()
    const search = molId(container, 'tests-card-search') as HTMLInputElement
    await type(search, 'about')
    expect(molId(container, 'tests-card-row-my-app/app:e2e/about.spec.ts')).not.toBeNull()
    expect(molId(container, 'tests-card-row-my-app/app:e2e/home.spec.ts')).toBeNull()

    await type(search, 'my-app/api')
    expect(molId(container, 'tests-card-row-my-app/api:src/routes.test.ts')).not.toBeNull()
    expect(molId(container, 'tests-card-row-my-app/app:e2e/home.spec.ts')).toBeNull()
  })

  it('opens pre-filtered when /test <query> seeded it', async () => {
    const { container } = await renderCard({ initialQuery: 'routes' })
    expect((molId(container, 'tests-card-search') as HTMLInputElement).value).toBe('routes')
    expect(molId(container, 'tests-card-row-my-app/api:src/routes.test.ts')).not.toBeNull()
    expect(molId(container, 'tests-card-row-my-app/app:e2e/home.spec.ts')).toBeNull()
  })

  it('says so when nothing matches, and when the project has no tests', async () => {
    const { container } = await renderCard()
    await type(molId(container, 'tests-card-search') as HTMLInputElement, 'zzzz')
    expect(molId(container, 'tests-card-empty')?.textContent).toContain('No tests match')

    await stop()
    const empty = await renderCard({ tests: [] })
    expect(molId(empty.container, 'tests-card-empty')?.textContent).toContain('No tests')
  })

  it('renders the loading / error / unavailable states instead of an empty list', async () => {
    const loading = await renderCard({ status: 'loading' })
    expect(loading.container.textContent).toContain('Loading tests')
    await stop()

    const errored = await renderCard({ status: 'error' })
    expect(molId(errored.container, 'tests-card-error')?.textContent).toContain('Could not list')
    await stop()

    const down = await renderCard({ status: 'unavailable' })
    expect(molId(down.container, 'tests-card-unavailable')?.textContent).toContain(
      'Start the project',
    )
  })
})

describe('TestsCard — dispatching runs', () => {
  it('Run all asks the host for every LISTED test, honouring the filter', async () => {
    const { container, selections } = await renderCard()
    await click(molId(container, 'tests-card-run-all'))
    expect(selections).toEqual([{ ids: TESTS.map((t) => t.id) }])

    await type(molId(container, 'tests-card-search') as HTMLInputElement, 'e2e/')
    await click(molId(container, 'tests-card-run-all'))
    expect(selections[1]).toEqual({
      ids: ['my-app/app:e2e/home.spec.ts', 'my-app/app:e2e/about.spec.ts'],
    })
  })

  it('the per-kind buttons ask for that kind only', async () => {
    const { container, selections } = await renderCard()
    await click(molId(container, 'tests-card-run-e2e'))
    await click(molId(container, 'tests-card-run-unit'))
    expect(selections).toEqual([
      { ids: ['my-app/app:e2e/home.spec.ts', 'my-app/app:e2e/about.spec.ts'] },
      { ids: ['my-app/api:src/routes.test.ts', '.:tests/tooling.test.ts'] },
    ])
  })

  it('a group’s Run asks for every id in that group', async () => {
    const { container, selections } = await renderCard()
    await click(molId(container, 'tests-card-run-group-e2e-my-app/app'))
    expect(selections).toEqual([
      { ids: ['my-app/app:e2e/about.spec.ts', 'my-app/app:e2e/home.spec.ts'] },
    ])
  })

  it('a single row’s Run asks for exactly that one id', async () => {
    const { container, selections } = await renderCard()
    await click(molId(container, 'tests-card-run-my-app/api:src/routes.test.ts'))
    expect(selections).toEqual([{ ids: ['my-app/api:src/routes.test.ts'] }])
  })

  it('Stop asks the host to cancel', async () => {
    const { container, cancels } = await renderCard({
      run: runStateOf([{ type: 'start', runId: 'r1', ids: ['my-app/app:e2e/home.spec.ts'] }]),
    })
    await click(molId(container, 'tests-card-cancel'))
    expect(cancels.count).toBe(1)
  })
})

describe('TestsCard — a live run', () => {
  it('spins the running rows, shows the output, then marks each row from its result', async () => {
    const running = runStateOf([
      {
        type: 'start',
        runId: 'r1',
        ids: ['my-app/app:e2e/home.spec.ts', 'my-app/app:e2e/about.spec.ts'],
      },
      { type: 'output', id: 'my-app/app:e2e/home.spec.ts', chunk: 'Running 1 test using 1 worker' },
    ])
    const live = await renderCard({ run: running })
    expect(molId(live.container, 'tests-card-running')?.textContent).toContain('Running')
    expect(
      molId(live.container, 'tests-card-status-my-app/app:e2e/home.spec.ts')?.textContent,
    ).toContain('Running')
    await click(molId(live.container, 'tests-card-output-toggle'))
    expect(molId(live.container, 'tests-card-output')?.textContent).toContain('Running 1 test')
    await stop()

    const done = await renderCard({
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

  it('keeps a failure’s output under its row after the run ends, behind its toggle', async () => {
    const { container } = await renderCard({
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
    await click(molId(container, 'tests-card-failure-toggle-my-app/app:e2e/about.spec.ts'))
    expect(
      molId(container, 'tests-card-failure-my-app/app:e2e/about.spec.ts')?.textContent,
    ).toContain('No tests found')
    // A passing row never grows an output block.
    expect(molId(container, 'tests-card-failure-my-app/app:e2e/home.spec.ts')).toBeNull()
  })

  it('surfaces a run error in the card rather than a toast', async () => {
    const { container } = await renderCard({
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

  it('says a cancelled run was stopped', async () => {
    const { container } = await renderCard({
      run: runStateOf([
        { type: 'start', runId: 'r1', ids: ['my-app/app:e2e/home.spec.ts'] },
        { type: 'done', outcome: 'cancelled' },
      ]),
    })
    expect(molId(container, 'tests-card-cancelled')?.textContent).toContain('stopped')
  })
})

describe('TestsCard — who may run', () => {
  it('a VIEWER still sees the tests, with every run control disabled and the reason shown', async () => {
    const { container, selections } = await renderCard({ canRun: false })
    expect(molId(container, 'tests-card-disabled-reason')?.textContent).toContain(
      'Only editors can run',
    )
    const runAll = molId(container, 'tests-card-run-all') as HTMLButtonElement
    expect(runAll.disabled).toBe(true)
    await click(runAll)
    expect(selections).toHaveLength(0)
    expect(
      (molId(container, 'tests-card-run-my-app/app:e2e/home.spec.ts') as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    // The listing itself is still readable — that is the point of showing it.
    expect(molId(container, 'tests-card-row-my-app/app:e2e/home.spec.ts')).not.toBeNull()
  })

  it('a stopped project disables running and says to start it', async () => {
    const { container } = await renderCard({ status: 'unavailable' })
    expect(molId(container, 'tests-card-disabled-reason')?.textContent).toContain(
      'Start the project',
    )
  })

  it('does not offer a second run while one is live', async () => {
    const { container } = await renderCard({
      run: runStateOf([{ type: 'start', runId: 'r1', ids: ['my-app/app:e2e/home.spec.ts'] }]),
    })
    expect(molId(container, 'tests-card-run-all')).toBeNull()
    expect(molId(container, 'tests-card-cancel')).not.toBeNull()
    expect((molId(container, 'tests-card-run-e2e') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('TestsCard — chrome', () => {
  it('drops its own heading when embedded in the command overlay', async () => {
    const inline = await renderCard()
    expect(inline.container.textContent).toContain('Tests')
    await stop()
    const embedded = await renderCard({ embedded: true })
    // The overlay header already shows the title; the card must not repeat it.
    const heading = embedded.container.querySelector('[data-mol-id="tests-card"] > div')
    expect(heading).not.toBeNull()
    expect(heading!.textContent).not.toBe('Tests')
  })

  it('has a data-mol-id on every interactive element', async () => {
    const { container } = await renderCard()
    const interactive = container.querySelectorAll('button, input')
    expect(interactive.length).toBeGreaterThan(0)
    for (const el of interactive) {
      expect(el.getAttribute('data-mol-id'), el.outerHTML.slice(0, 80)).toBeTruthy()
    }
  })
})

describe('TestsCard — module surface', () => {
  it('is exported from the package barrel', async () => {
    expect((barrel as { TestsCard?: unknown }).TestsCard).toBeDefined()
    expect(vi.isMockFunction((barrel as { TestsCard?: unknown }).TestsCard as () => void)).toBe(
      false,
    )
  })
})

describe('TestsCard — output is collapsed by default', () => {
  it('shows the run output only after the toggle is clicked', async () => {
    const { container } = await renderCard({
      run: runStateOf([
        { type: 'start', runId: 'r1', ids: [] },
        { type: 'output', chunk: 'Running 1 test' },
      ]),
    })
    expect(molId(container, 'tests-card-output-area')).not.toBeNull()
    expect(molId(container, 'tests-card-output'), 'output starts collapsed').toBeNull()

    const toggle = molId(container, 'tests-card-output-toggle') as HTMLElement
    expect(toggle.textContent).toBe('Show output')
    await click(toggle)
    expect(molId(container, 'tests-card-output')?.textContent).toContain('Running 1 test')
    expect(molId(container, 'tests-card-output-toggle')?.textContent).toBe('Hide output')

    await click(molId(container, 'tests-card-output-toggle'))
    expect(molId(container, 'tests-card-output')).toBeNull()
  })

  it('stays collapsed WHILE a run streams — the pills carry the state', async () => {
    const { container } = await renderCard({
      run: runStateOf([
        { type: 'start', runId: 'r1', ids: ['my-app/app:e2e/home.spec.ts'] },
        { type: 'output', chunk: 'Running 1 test using 1 worker' },
      ]),
    })
    expect(molId(container, 'tests-card-running')).not.toBeNull()
    expect(molId(container, 'tests-card-output')).toBeNull()
  })

  it('a failure’s output starts collapsed behind the same toggle', async () => {
    const { container } = await renderCard({ run: runStateOf(FAILED_RUN) })
    const id = 'my-app/app:e2e/about.spec.ts'
    expect(molId(container, `tests-card-failure-${id}`), 'starts collapsed').toBeNull()
    const toggle = molId(container, `tests-card-failure-toggle-${id}`) as HTMLElement
    expect(toggle.textContent).toBe('Show output')
    await click(toggle)
    expect(molId(container, `tests-card-failure-${id}`)?.textContent).toContain('expect(received)')
  })
})

describe('TestsCard — fix with Synthase', () => {
  it('offers a fix on every failed row, and nowhere else', async () => {
    const { container } = await renderCard({ run: runStateOf(FAILED_RUN) })
    expect(molId(container, 'tests-card-fix-my-app/app:e2e/about.spec.ts')).not.toBeNull()
    expect(molId(container, 'tests-card-fix-my-app/api:src/routes.test.ts')).not.toBeNull()
    // The passing row and the never-run rows carry no fix action.
    expect(molId(container, 'tests-card-fix-my-app/app:e2e/home.spec.ts')).toBeNull()
    expect(molId(container, 'tests-card-fix-.:tests/tooling.test.ts')).toBeNull()
  })

  it('a row’s fix hands over exactly that test and its output', async () => {
    const { container, fixes } = await renderCard({ run: runStateOf(FAILED_RUN) })
    await click(molId(container, 'tests-card-fix-my-app/app:e2e/about.spec.ts'))
    expect(fixes).toHaveLength(1)
    expect(fixes[0]).toHaveLength(1)
    expect(fixes[0]?.[0]?.item.id).toBe('my-app/app:e2e/about.spec.ts')
    expect(fixes[0]?.[0]?.output).toContain('expect(received)')
  })

  it('the header batches EVERY failure into one hand-over', async () => {
    const { container, fixes } = await renderCard({ run: runStateOf(FAILED_RUN) })
    const all = molId(container, 'tests-card-fix-all') as HTMLElement
    expect(all.textContent).toBe('Fix 2 failures')
    await click(all)
    expect(fixes[0]?.map((f) => f.item.id)).toEqual([
      'my-app/app:e2e/about.spec.ts',
      'my-app/api:src/routes.test.ts',
    ])
  })

  it('reads “Fix with Synthase” when there is only one failure', async () => {
    const { container } = await renderCard({
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

  it('is disabled with the reason when the viewer cannot send', async () => {
    const { container, fixes } = await renderCard({
      run: runStateOf(FAILED_RUN),
      fixDisabledReason: 'Wait for the current turn to finish.',
    })
    const fix = molId(container, 'tests-card-fix-my-app/app:e2e/about.spec.ts') as HTMLButtonElement
    expect(fix.disabled).toBe(true)
    expect(fix.getAttribute('title')).toBe('Wait for the current turn to finish.')
    await click(fix)
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

  it('names the test on screen, with its group, and tallies that file as it goes', async () => {
    const { container } = await renderCard({ run: midFile() })
    expect(molId(container, `tests-card-case-title-${HOME}`)?.textContent).toBe(
      'home page › signs a user up',
    )
    const tally = molId(container, `tests-card-case-tally-${HOME}`)?.textContent ?? ''
    expect(tally).toContain('1 passed')
    expect(tally).toContain('1 failed')
    // The row still says it is running; the per-test line is detail beneath it.
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toContain('Running')
  })

  it('shows a running file with no case events yet without inventing a name', async () => {
    const { container } = await renderCard({
      run: runStateOf([{ type: 'start', runId: 'r1', ids: [HOME] }]),
    })
    expect(molId(container, `tests-card-case-${HOME}`)).toBeNull()
    expect(molId(container, `tests-card-status-${HOME}`)?.textContent).toContain('Running')
  })

  it('collapses the per-test detail the moment the file reports its verdict', async () => {
    const { container } = await renderCard({
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

  it('offers Skip on the row the run is on, and nowhere else', async () => {
    const { container, skips } = await renderCard({ run: live() })
    const skip = molId(container, `tests-card-skip-${HOME}`) as HTMLButtonElement
    expect(skip).not.toBeNull()
    expect(skip.textContent).toBe('Skip')
    expect(molId(container, `tests-card-skip-${ABOUT}`)).toBeNull()
    await click(skip)
    expect(skips.count).toBe(1)
  })

  it('Stop in the header is still the whole run — the two are different actions', async () => {
    const { container, cancels, skips } = await renderCard({ run: live() })
    await click(molId(container, 'tests-card-cancel'))
    expect(cancels.count).toBe(1)
    expect(skips.count).toBe(0)
  })

  it('says Skipping… and stops taking clicks while the request is out', async () => {
    const { container, skips } = await renderCard({ run: live({ skipPending: true }) })
    const skip = molId(container, `tests-card-skip-${HOME}`) as HTMLButtonElement
    expect(skip.textContent).toBe('Skipping…')
    expect(skip.disabled).toBe(true)
    await click(skip)
    expect(skips.count).toBe(0)
  })

  it('renders no Skip at all when the host does not serve one', async () => {
    const { container } = await renderCard({ run: live({ skipUnavailable: true }) })
    expect(molId(container, `tests-card-skip-${HOME}`)).toBeNull()
    // …and none when the host wired no callback, whatever the state says.
    await stop()
    const without = await renderCard({ run: live(), onSkipCurrent: undefined })
    expect(molId(without.container, `tests-card-skip-${HOME}`)).toBeNull()
  })

  it('a viewer sees the Skip disabled, with the reason, rather than nothing', async () => {
    const { container, skips } = await renderCard({ run: live(), canRun: false })
    const skip = molId(container, `tests-card-skip-${HOME}`) as HTMLButtonElement
    expect(skip.disabled).toBe(true)
    expect(skip.getAttribute('title')).toBe('Only editors can skip this project’s tests.')
    await click(skip)
    expect(skips.count).toBe(0)
  })

  it('a skipped file reads Skipped — never Passed — and the summary counts it', async () => {
    const { container } = await renderCard({
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

  it('every Skip carries a data-mol-id, like every other control', async () => {
    const { container } = await renderCard({ run: live() })
    for (const el of container.querySelectorAll('button, input')) {
      expect(el.getAttribute('data-mol-id'), el.outerHTML.slice(0, 80)).toBeTruthy()
    }
  })
})
