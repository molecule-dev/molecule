/**
 * The Tests card's pure state: grouping, the collapsed summary, and the reducer
 * that folds a run's streamed events into what the rows show.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import {
  applyTestRunEvent,
  canSkipRun,
  countByKind,
  currentRunRowId,
  EMPTY_RUN_STATE,
  failRun,
  filterTests,
  foldOtherRunEvent,
  groupTests,
  isRowRunning,
  keepLiveOtherRuns,
  liveOtherRuns,
  markSkipUnavailable,
  MAX_OUTPUT_LINES,
  type OtherTestRuns,
  parseTestCommand,
  presentOtherRun,
  requestSkip,
  settleOwnRun,
  summarizeResults,
  testCaseLabel,
  testRowLabel,
} from '../components/tests-card-utilities.js'
import type { TestItem, TestRunFeedEvent } from '../types.js'

const TESTS: TestItem[] = [
  {
    id: 'app:e2e/home.spec.ts',
    file: 'e2e/home.spec.ts',
    kind: 'e2e',
    workspace: 'app',
    title: 'home',
  },
  { id: 'app:e2e/about.spec.ts', file: 'e2e/about.spec.ts', kind: 'e2e', workspace: 'app' },
  { id: 'app:src/format.test.ts', file: 'src/format.test.ts', kind: 'unit', workspace: 'app' },
  { id: 'api:src/routes.test.ts', file: 'src/routes.test.ts', kind: 'unit', workspace: 'api' },
]

describe('groupTests', () => {
  it('puts the preview-driven specs first, then unit, and sorts inside a group', () => {
    const groups = groupTests(TESTS)
    // Directories sort by path within a kind — nothing guarantees `app` or `api`
    // exist, so there is no fixed order to prefer.
    expect(groups.map((g) => `${g.kind}:${g.workspace}`)).toEqual([
      'e2e:app',
      'unit:api',
      'unit:app',
    ])
    expect(groups[0]?.items.map((i) => i.file)).toEqual(['e2e/about.spec.ts', 'e2e/home.spec.ts'])
  })

  it('groups by whatever project directory owns the file, root last, labelled by the host', () => {
    // R82's real layout: the executor named its project `my-app`, so the app
    // lives at my-app/app — a fixed app/api/root trio dropped every row.
    const nested: TestItem[] = [
      {
        id: 'my-app/app:e2e/home.spec.ts',
        file: 'e2e/home.spec.ts',
        kind: 'e2e',
        workspace: 'my-app/app',
        workspaceLabel: 'my-app/app',
      },
      {
        id: '.:tests/root.test.ts',
        file: 'tests/root.test.ts',
        kind: 'unit',
        workspace: '.',
        workspaceLabel: null,
      },
      {
        id: 'my-app/app:src/__tests__/content.test.ts',
        file: 'src/__tests__/content.test.ts',
        kind: 'unit',
        workspace: 'my-app/app',
        workspaceLabel: 'my-app/app',
      },
      // A host that predates `workspaceLabel`: the path itself is the label.
      {
        id: 'packages/web:e2e/x.spec.ts',
        file: 'e2e/x.spec.ts',
        kind: 'e2e',
        workspace: 'packages/web',
      },
    ]
    const groups = groupTests(nested)
    expect(groups.map((g) => `${g.kind}:${g.workspace}:${g.label}`)).toEqual([
      'e2e:my-app/app:my-app/app',
      'e2e:packages/web:packages/web',
      'unit:my-app/app:my-app/app',
      'unit:.:null',
    ])
  })

  it('never produces an empty group', () => {
    expect(groupTests([])).toEqual([])
    expect(groupTests(TESTS).every((g) => g.items.length > 0)).toBe(true)
  })
})

describe('countByKind', () => {
  it('counts each kind', () => {
    expect(countByKind(TESTS)).toEqual({ e2e: 2, unit: 2 })
  })
})

describe('summarizeResults', () => {
  it('counts one verdict per FILE so the summary matches the rows', () => {
    const summary = summarizeResults(TESTS, {
      'app:e2e/home.spec.ts': { status: 'passed', passed: 4, failed: 0, skipped: 0 },
      'app:e2e/about.spec.ts': { status: 'failed', passed: 1, failed: 2, skipped: 0 },
      'app:src/format.test.ts': { status: 'skipped', passed: 0, failed: 0, skipped: 3 },
    })
    expect(summary).toEqual({ passed: 1, failed: 1, skipped: 1, reported: 3 })
  })

  it('ignores results for tests that are no longer listed', () => {
    expect(
      summarizeResults(TESTS, {
        'app:gone.spec.ts': { status: 'passed', passed: 1, failed: 0, skipped: 0 },
      }),
    ).toEqual({ passed: 0, failed: 0, skipped: 0, reported: 0 })
  })
})

describe('applyTestRunEvent', () => {
  it('start clears the previous verdicts for the ids it covers', () => {
    const seeded = {
      ...EMPTY_RUN_STATE,
      results: {
        'app:e2e/home.spec.ts': { status: 'failed' as const, passed: 0, failed: 1, skipped: 0 },
        'api:src/routes.test.ts': { status: 'passed' as const, passed: 1, failed: 0, skipped: 0 },
      },
    }
    const next = applyTestRunEvent(seeded, {
      type: 'start',
      runId: 'r1',
      ids: ['app:e2e/home.spec.ts'],
    })
    expect(next.running).toBe(true)
    expect(next.runId).toBe('r1')
    expect(next.results['app:e2e/home.spec.ts']).toBeUndefined()
    // An id this run does NOT cover keeps the verdict it already had.
    expect(next.results['api:src/routes.test.ts']?.status).toBe('passed')
  })

  it('output appends lines, tracks the current row, and stays bounded', () => {
    let state = applyTestRunEvent(EMPTY_RUN_STATE, {
      type: 'start',
      runId: 'r1',
      ids: ['app:e2e/home.spec.ts'],
    })
    state = applyTestRunEvent(state, {
      type: 'output',
      id: 'app:e2e/home.spec.ts',
      chunk: 'line one\nline two',
    })
    expect(state.output).toEqual(['line one', 'line two'])
    expect(state.currentId).toBe('app:e2e/home.spec.ts')

    for (let i = 0; i < MAX_OUTPUT_LINES + 50; i += 1) {
      state = applyTestRunEvent(state, { type: 'output', chunk: `x${i}` })
    }
    expect(state.output).toHaveLength(MAX_OUTPUT_LINES)
    expect(state.output.at(-1)).toBe(`x${MAX_OUTPUT_LINES + 49}`)
    // An output event with no id leaves the current row alone.
    expect(state.currentId).toBe('app:e2e/home.spec.ts')
  })

  it('result records the verdict, and keeps a failure’s output', () => {
    const state = applyTestRunEvent(EMPTY_RUN_STATE, {
      type: 'result',
      id: 'app:e2e/home.spec.ts',
      status: 'failed',
      durationMs: 1200,
      passed: 1,
      failed: 2,
      skipped: 0,
      output: 'Error: expected 1 to be 2',
    })
    expect(state.results['app:e2e/home.spec.ts']).toEqual({
      status: 'failed',
      durationMs: 1200,
      passed: 1,
      failed: 2,
      skipped: 0,
      output: 'Error: expected 1 to be 2',
    })
  })

  it('done ends the run and records how it ended', () => {
    let state = applyTestRunEvent(EMPTY_RUN_STATE, { type: 'start', runId: 'r1', ids: [] })
    state = applyTestRunEvent(state, {
      type: 'done',
      outcome: 'timeout',
      durationMs: 600_000,
      error: 'The run passed its 10-minute budget and was stopped.',
    })
    expect(state.running).toBe(false)
    expect(state.outcome).toBe('timeout')
    expect(state.error).toContain('10-minute budget')
    expect(state.durationMs).toBe(600_000)
  })

  it('case names the test on screen and keeps that file’s own tally', () => {
    const id = 'app:e2e/home.spec.ts'
    let state = applyTestRunEvent(EMPTY_RUN_STATE, { type: 'start', runId: 'r1', ids: [id] })
    state = applyTestRunEvent(state, {
      type: 'case',
      id,
      title: 'shows the sign-up form',
      describe: 'home page',
      status: 'running',
    })
    expect(state.currentId).toBe(id)
    expect(state.cases[id]?.current).toEqual({
      title: 'shows the sign-up form',
      describe: 'home page',
    })
    expect(state.cases[id]).toMatchObject({ passed: 0, failed: 0, skipped: 0 })

    state = applyTestRunEvent(state, {
      type: 'case',
      id,
      title: 'shows the sign-up form',
      describe: 'home page',
      status: 'passed',
      durationMs: 900,
    })
    // The test it named finished, so the "now running" line clears rather than
    // leaving a finished test on screen as though it were still going.
    expect(state.cases[id]?.current).toBeNull()
    expect(state.cases[id]).toMatchObject({ passed: 1, failed: 0, skipped: 0 })

    state = applyTestRunEvent(state, { type: 'case', id, title: 'logs in', status: 'running' })
    state = applyTestRunEvent(state, { type: 'case', id, title: 'logs in', status: 'failed' })
    expect(state.cases[id]).toMatchObject({ passed: 1, failed: 1, skipped: 0, current: null })
  })

  it('a case for an unknown id is recorded rather than thrown on', () => {
    const state = applyTestRunEvent(EMPTY_RUN_STATE, {
      type: 'case',
      id: 'app:e2e/never-listed.spec.ts',
      title: 'something',
      status: 'running',
    })
    expect(state.cases['app:e2e/never-listed.spec.ts']?.current?.title).toBe('something')
  })

  it('a terminal case that is not the one on screen leaves the running line alone', () => {
    const id = 'app:e2e/home.spec.ts'
    let state = applyTestRunEvent(EMPTY_RUN_STATE, {
      type: 'case',
      id,
      title: 'a',
      status: 'running',
    })
    // A parallel runner can finish a DIFFERENT test first; "a" is still running.
    state = applyTestRunEvent(state, { type: 'case', id, title: 'b', status: 'passed' })
    expect(state.cases[id]?.current?.title).toBe('a')
    expect(state.cases[id]?.passed).toBe(1)
  })

  it('a case that arrives after its file’s verdict is dropped, not applied', () => {
    const id = 'app:e2e/home.spec.ts'
    let state = applyTestRunEvent(EMPTY_RUN_STATE, { type: 'start', runId: 'r1', ids: [id] })
    state = applyTestRunEvent(state, { type: 'result', id, status: 'passed' })
    const after = applyTestRunEvent(state, { type: 'case', id, title: 'late', status: 'running' })
    expect(after).toBe(state)
    expect(after.cases[id]).toBeUndefined()
  })

  it('result collapses the per-test detail and fills counts the event omitted', () => {
    const id = 'app:e2e/home.spec.ts'
    let state = applyTestRunEvent(EMPTY_RUN_STATE, { type: 'start', runId: 'r1', ids: [id] })
    state = applyTestRunEvent(state, { type: 'case', id, title: 'a', status: 'passed' })
    state = applyTestRunEvent(state, { type: 'case', id, title: 'b', status: 'failed' })
    state = applyTestRunEvent(state, { type: 'result', id, status: 'failed' })
    expect(state.cases[id]).toBeUndefined()
    expect(state.results[id]).toMatchObject({ status: 'failed', passed: 1, failed: 1, skipped: 0 })
  })

  it('a skipped file is recorded as skipped and summarized as skipped, never as a pass', () => {
    const id = 'app:e2e/home.spec.ts'
    let state = applyTestRunEvent(EMPTY_RUN_STATE, { type: 'start', runId: 'r1', ids: [id] })
    state = requestSkip({ ...state, skipUnavailable: false })
    expect(state.skipPending).toBe(true)
    // The shape the server sends for a skipped command: no output, one skip.
    state = applyTestRunEvent(state, {
      type: 'result',
      id,
      status: 'skipped',
      durationMs: 12,
      passed: 0,
      failed: 0,
      skipped: 1,
    })
    expect(state.skipPending).toBe(false)
    expect(state.results[id]?.status).toBe('skipped')
    expect(summarizeResults(TESTS, state.results)).toEqual({
      passed: 0,
      failed: 0,
      skipped: 1,
      reported: 1,
    })
    state = applyTestRunEvent(state, { type: 'done', outcome: 'skipped-by-user' })
    expect(state.outcome).toBe('skipped-by-user')
    expect(state.running).toBe(false)
  })

  it('a trailing skipped result after a cancel still lands on the row', () => {
    // The cancel path reports every file that never ran as skipped, AFTER the
    // run has already been torn down — so no row keeps a stale verdict.
    const id = 'app:e2e/about.spec.ts'
    let state = applyTestRunEvent(EMPTY_RUN_STATE, { type: 'start', runId: 'r1', ids: [id] })
    state = applyTestRunEvent(state, { type: 'done', outcome: 'cancelled' })
    state = applyTestRunEvent(state, { type: 'result', id, status: 'skipped', skipped: 1 })
    expect(state.running).toBe(false)
    expect(state.outcome).toBe('cancelled')
    expect(state.results[id]?.status).toBe('skipped')
  })

  it('start and done clear the live per-test detail', () => {
    const id = 'app:e2e/home.spec.ts'
    let state = applyTestRunEvent(EMPTY_RUN_STATE, {
      type: 'case',
      id,
      title: 'a',
      status: 'running',
    })
    state = applyTestRunEvent(state, { type: 'start', runId: 'r2', ids: [id] })
    expect(state.cases).toEqual({})
    state = applyTestRunEvent(state, { type: 'case', id, title: 'a', status: 'running' })
    state = applyTestRunEvent(state, { type: 'done', outcome: 'completed' })
    expect(state.cases).toEqual({})
  })

  it('start does NOT re-enable skipping — the panel decides that from the handle', () => {
    const state = applyTestRunEvent(
      { ...EMPTY_RUN_STATE, skipUnavailable: false },
      { type: 'start', runId: 'r1', ids: [] },
    )
    expect(state.skipUnavailable).toBe(false)
    const unsupported = applyTestRunEvent(EMPTY_RUN_STATE, {
      type: 'start',
      runId: 'r1',
      ids: [],
    })
    expect(unsupported.skipUnavailable).toBe(true)
  })

  it('leaves the state untouched for an event shape it does not know', () => {
    const state = applyTestRunEvent(EMPTY_RUN_STATE, {
      type: 'nonsense',
    } as unknown as Parameters<typeof applyTestRunEvent>[1])
    expect(state).toBe(EMPTY_RUN_STATE)
  })
})

describe('failRun', () => {
  it('ends a run whose stream died, with the reason', () => {
    const state = failRun({ ...EMPTY_RUN_STATE, running: true }, 'The connection dropped.')
    expect(state.running).toBe(false)
    expect(state.outcome).toBe('error')
    expect(state.error).toBe('The connection dropped.')
  })
})

describe('isRowRunning', () => {
  const running = {
    ...EMPTY_RUN_STATE,
    running: true,
    queued: ['a', 'b'],
    currentId: 'a',
    results: { b: { status: 'passed' as const, passed: 1, failed: 0, skipped: 0 } },
  }

  it('is true for the current row and for a queued row with no verdict yet', () => {
    expect(isRowRunning(running, 'a')).toBe(true)
    expect(isRowRunning({ ...running, currentId: null }, 'a')).toBe(true)
  })

  it('is false once the row has a verdict, for rows outside the run, and after the run', () => {
    expect(isRowRunning(running, 'b')).toBe(false)
    expect(isRowRunning(running, 'c')).toBe(false)
    expect(isRowRunning({ ...running, running: false }, 'a')).toBe(false)
  })
})

describe('testRowLabel', () => {
  it('prefers the title and falls back to the file path', () => {
    expect(testRowLabel(TESTS[0] as TestItem)).toBe('home')
    expect(testRowLabel(TESTS[1] as TestItem)).toBe('e2e/about.spec.ts')
    expect(testRowLabel({ ...(TESTS[0] as TestItem), title: '   ' })).toBe('e2e/home.spec.ts')
  })
})

describe('filterTests', () => {
  it('matches the file path, the title, and the project directory', () => {
    expect(filterTests(TESTS, 'about').map((t) => t.file)).toEqual(['e2e/about.spec.ts'])
    expect(filterTests(TESTS, 'home').map((t) => t.file)).toEqual(['e2e/home.spec.ts'])
    expect(filterTests(TESTS, 'api').map((t) => t.workspace)).toEqual(['api'])
  })

  it('is case-insensitive and returns everything for a blank query', () => {
    expect(filterTests(TESTS, '  ABOUT ').map((t) => t.file)).toEqual(['e2e/about.spec.ts'])
    expect(filterTests(TESTS, '')).toHaveLength(TESTS.length)
    expect(filterTests(TESTS, '   ')).toHaveLength(TESTS.length)
  })

  it('returns nothing when nothing matches', () => {
    expect(filterTests(TESTS, 'zzz')).toEqual([])
  })
})

describe('parseTestCommand', () => {
  it('parses the bare command and its alias', () => {
    expect(parseTestCommand('/test')).toEqual({ query: '', runAll: false })
    expect(parseTestCommand('/tests')).toEqual({ query: '', runAll: false })
    expect(parseTestCommand('  /TEST  ')).toEqual({ query: '', runAll: false })
  })

  it('treats any argument but `all` as a filter, never as something to run', () => {
    expect(parseTestCommand('/test home')).toEqual({ query: 'home', runAll: false })
    expect(parseTestCommand('/tests my-app/app')).toEqual({
      query: 'my-app/app',
      runAll: false,
    })
  })

  it('runs everything for `all`, in any case', () => {
    expect(parseTestCommand('/test all')).toEqual({ query: '', runAll: true })
    expect(parseTestCommand('/tests ALL')).toEqual({ query: '', runAll: true })
  })

  it('is not a /test command at all for anything else', () => {
    for (const input of ['/testing', '/te', 'test', 'hello /test', '/scripts all']) {
      expect(parseTestCommand(input), input).toBeNull()
    }
  })
})

describe('requestSkip / markSkipUnavailable / canSkipRun', () => {
  const live = { ...EMPTY_RUN_STATE, running: true, skipUnavailable: false }

  it('records the request only while there is something to skip', () => {
    expect(requestSkip(live).skipPending).toBe(true)
    // Nothing running, already asked, or the host serves no skip: unchanged.
    expect(requestSkip(EMPTY_RUN_STATE)).toBe(EMPTY_RUN_STATE)
    const pending = { ...live, skipPending: true }
    expect(requestSkip(pending)).toBe(pending)
    const unsupported = { ...live, skipUnavailable: true }
    expect(requestSkip(unsupported)).toBe(unsupported)
  })

  it('an unavailable skip drops the control without inventing an error', () => {
    const next = markSkipUnavailable({ ...live, skipPending: true })
    expect(next.skipPending).toBe(false)
    expect(next.skipUnavailable).toBe(true)
    expect(next.error).toBeNull()
    expect(canSkipRun(next)).toBe(false)
  })

  it('canSkipRun is true only for a live run on a host that serves it', () => {
    expect(canSkipRun(live)).toBe(true)
    expect(canSkipRun({ ...live, running: false })).toBe(false)
    expect(canSkipRun(EMPTY_RUN_STATE)).toBe(false)
  })

  it('never offers or requests Skip for a watched run, even with a stale capability flag', () => {
    const watched = { ...live, external: true }
    expect(canSkipRun(watched)).toBe(false)
    expect(requestSkip(watched)).toBe(watched)
    expect(canSkipRun(live)).toBe(true)
    expect(requestSkip(live).skipPending).toBe(true)
  })
})

describe('currentRunRowId', () => {
  it('is the row the stream named', () => {
    expect(
      currentRunRowId({ ...EMPTY_RUN_STATE, running: true, queued: ['a', 'b'], currentId: 'b' }),
    ).toBe('b')
  })

  it('falls back to the single row still awaiting a verdict', () => {
    const state = {
      ...EMPTY_RUN_STATE,
      running: true,
      queued: ['a', 'b'],
      results: { a: { status: 'passed' as const, passed: 1, failed: 0, skipped: 0 } },
    }
    expect(currentRunRowId(state)).toBe('b')
  })

  it('is null when the run names no row and more than one is still open', () => {
    expect(currentRunRowId({ ...EMPTY_RUN_STATE, running: true, queued: ['a', 'b'] })).toBeNull()
    expect(currentRunRowId({ ...EMPTY_RUN_STATE, queued: ['a'], currentId: 'a' })).toBeNull()
  })
})

describe('testCaseLabel', () => {
  it('reads group then title, and copes with a runner that gives neither', () => {
    expect(testCaseLabel({ title: 'logs in', describe: 'auth' })).toBe('auth › logs in')
    expect(testCaseLabel({ title: 'logs in' })).toBe('logs in')
    expect(testCaseLabel({ title: '  ', describe: 'auth' })).toBe('auth')
    expect(testCaseLabel({ title: '' })).toBe('')
    expect(testCaseLabel(null)).toBe('')
    expect(testCaseLabel(undefined)).toBe('')
  })
})

describe('runs this panel did not start (the project run feed)', () => {
  const fold = (events: TestRunFeedEvent[], others: OtherTestRuns = {}): OtherTestRuns =>
    events.reduce((acc, event) => foldOtherRunEvent(acc, event), others)
  const agentStart: TestRunFeedEvent = {
    type: 'start',
    runId: 'agent-1',
    ids: [],
    startedAt: '2026-10-30T19:00:00.000Z',
    source: 'agent',
    command: 'npx vitest run src/routes.test.ts',
  }
  const routesPassed: TestRunFeedEvent = {
    type: 'result',
    runId: 'agent-1',
    id: 'api:src/routes.test.ts',
    status: 'passed',
    passed: 3,
    failed: 0,
    skipped: 0,
  }
  const agentDone: TestRunFeedEvent = { type: 'done', runId: 'agent-1', outcome: 'completed' }

  it('folds each run on its own, watched and never steerable, on its own clock', () => {
    const others = fold([agentStart, routesPassed])
    const run = others['agent-1']
    expect(run.running).toBe(true)
    expect(run.external).toBe(true)
    expect(run.skipUnavailable).toBe(true)
    expect(run.source).toBe('agent')
    expect(run.command).toBe('npx vitest run src/routes.test.ts')
    expect(run.startedAt).toBe(Date.parse('2026-10-30T19:00:00.000Z'))
    expect(run.results['api:src/routes.test.ts'].status).toBe('passed')
  })

  it('still lands the verdicts of a run joined part-way, with no start seen', () => {
    const run = fold([routesPassed])['agent-1']
    expect(run.running).toBe(true)
    expect(run.runId).toBe('agent-1')
    expect(run.results['api:src/routes.test.ts'].status).toBe('passed')
  })

  it('shows another run when nothing live is on show, keeping the verdicts already there', () => {
    const shown = {
      ...EMPTY_RUN_STATE,
      runId: 'own-0',
      results: {
        'app:e2e/home.spec.ts': { status: 'failed' as const, passed: 0, failed: 1, skipped: 0 },
      },
    }
    const others = fold([agentStart, routesPassed])
    const next = presentOtherRun(shown, others['agent-1'], { ownBusy: false, live: [] })
    expect(next.running).toBe(true)
    expect(next.external).toBe(true)
    expect(next.runId).toBe('agent-1')
    expect(next.results['app:e2e/home.spec.ts'].status).toBe('failed')
    expect(next.results['api:src/routes.test.ts'].status).toBe('passed')
  })

  it('never takes the card from the panel’s own run in flight', () => {
    const own = {
      ...EMPTY_RUN_STATE,
      runId: 'own-1',
      running: true,
      queued: ['app:e2e/home.spec.ts'],
    }
    const others = fold([agentStart, routesPassed])
    const next = presentOtherRun(own, others['agent-1'], { ownBusy: true, live: [] })
    expect(next).toMatchObject({ runId: 'own-1', running: true, queued: own.queued })
    expect(next.external).not.toBe(true)
    expect(next.results['api:src/routes.test.ts']?.status).toBe('passed')
  })

  it('a run ending behind the one on show leaves its verdicts, except files that run still owes', () => {
    const shownRun = fold([
      { type: 'start', runId: 'platform-1', ids: ['api:src/routes.test.ts'], source: 'platform' },
    ])['platform-1']
    const shown = presentOtherRun(EMPTY_RUN_STATE, shownRun, { ownBusy: false, live: [] })
    const behind = fold([
      { type: 'start', runId: 'agent-2', ids: [], source: 'agent' },
      { ...routesPassed, runId: 'agent-2' },
      { type: 'result', runId: 'agent-2', id: 'app:src/format.test.ts', status: 'failed' },
      { type: 'done', runId: 'agent-2', outcome: 'completed' },
    ])['agent-2']
    const next = presentOtherRun(shown, behind, { ownBusy: false, live: [shownRun] })
    expect(next.runId).toBe('platform-1')
    expect(next.running).toBe(true)
    expect(next.results['app:src/format.test.ts'].status).toBe('failed')
    // The platform run is still going to report this file: no stale verdict on it.
    expect(next.results['api:src/routes.test.ts']).toBeUndefined()
  })

  it('hands the card to another live run when the one on show ends', () => {
    const others = fold([
      agentStart,
      {
        type: 'start',
        runId: 'platform-1',
        ids: [],
        source: 'platform',
        startedAt: '2026-10-30T19:01:00.000Z',
      },
    ])
    const shown = presentOtherRun(EMPTY_RUN_STATE, others['agent-1'], { ownBusy: false, live: [] })
    const ended = fold([routesPassed, agentDone], others)
    const next = presentOtherRun(shown, ended['agent-1'], {
      ownBusy: false,
      live: liveOtherRuns(ended, 'agent-1'),
    })
    expect(next.runId).toBe('platform-1')
    expect(next.running).toBe(true)
    expect(next.results['api:src/routes.test.ts'].status).toBe('passed')
  })

  it('after the own run ends: other verdicts land, a newer own verdict wins, then a live run shows', () => {
    const others = fold([
      agentStart,
      routesPassed,
      { type: 'result', runId: 'agent-1', id: 'app:src/format.test.ts', status: 'passed' },
      agentDone,
    ])
    const own = applyTestRunEvent(
      applyTestRunEvent(
        { ...EMPTY_RUN_STATE, running: true },
        { type: 'start', runId: 'own-1', ids: ['api:src/routes.test.ts'] },
      ),
      { type: 'result', id: 'api:src/routes.test.ts', status: 'failed', failed: 1 },
      1,
    )
    const ownEnded = applyTestRunEvent(own, { type: 'done', outcome: 'completed' })
    const settled = settleOwnRun(ownEnded, others)
    expect(settled.runId).toBe('own-1')
    expect(settled.results['api:src/routes.test.ts'].status).toBe('failed')
    expect(settled.results['app:src/format.test.ts'].status).toBe('passed')
    const withLive = settleOwnRun(
      ownEnded,
      fold([{ type: 'start', runId: 'platform-1', ids: [], source: 'platform' }], others),
    )
    expect(withLive.runId).toBe('platform-1')
    expect(withLive.running).toBe(true)
    expect(withLive.results['api:src/routes.test.ts'].status).toBe('failed')
  })

  it('keeps only the live runs once ended ones are on the rows', () => {
    const others = fold([
      agentStart,
      agentDone,
      { type: 'start', runId: 'platform-1', ids: [], source: 'platform' },
    ])
    expect(Object.keys(keepLiveOtherRuns(others))).toEqual(['platform-1'])
  })

  it.each(['case', 'output'] as const)(
    'discovers files from %s events with no upfront ids and clears inherited verdicts',
    (type) => {
      const first = 'api:src/routes.test.ts'
      const second = 'app:e2e/home.spec.ts'
      let shown = applyTestRunEvent(EMPTY_RUN_STATE, {
        type: 'result',
        id: first,
        status: 'failed',
        output: 'old failure',
      })
      let others = fold([agentStart])
      shown = presentOtherRun(shown, others['agent-1'], { ownBusy: false, live: [] })
      for (const id of [first, second]) {
        const event: TestRunFeedEvent =
          type === 'case'
            ? { type, runId: 'agent-1', id, title: id, status: 'running' }
            : { type, runId: 'agent-1', id, chunk: `running ${id}` }
        others = fold([event], others)
        shown = presentOtherRun(shown, others['agent-1'], { ownBusy: false, live: [] })
      }
      expect(shown.results[first]).toBeUndefined()
      expect(shown.queued).toEqual([first, second])
      expect(isRowRunning(shown, first)).toBe(true)
      expect(isRowRunning(shown, second)).toBe(true)
      others = fold([routesPassed], others)
      shown = presentOtherRun(shown, others['agent-1'], { ownBusy: false, live: [] })
      expect(shown.results[first]?.status).toBe('passed')
      expect(isRowRunning(shown, first)).toBe(false)
      expect(isRowRunning(shown, second)).toBe(true)
      others = fold(
        [
          { type: 'output', runId: 'agent-1', id: first, chunk: 'trailing output' },
          { type: 'case', runId: 'agent-1', id: first, title: 'late case', status: 'running' },
        ],
        others,
      )
      shown = presentOtherRun(shown, others['agent-1'], { ownBusy: false, live: [] })
      expect(isRowRunning(shown, first)).toBe(false)
      expect(isRowRunning(shown, second)).toBe(true)
      others = fold([agentDone], others)
      shown = presentOtherRun(shown, others['agent-1'], { ownBusy: false, live: [] })
      expect(shown.running).toBe(false)
      expect(isRowRunning(shown, second)).toBe(false)
    },
  )

  it('keeps the latest verdict when a completed row is also in a still-running run', () => {
    const id = 'api:src/routes.test.ts'
    let others = foldOtherRunEvent({}, { ...agentStart, ids: [id, 'pending'] })
    others = foldOtherRunEvent(others, { ...routesPassed, status: 'failed' }, 1)
    let shown = presentOtherRun(EMPTY_RUN_STATE, others['agent-1'], { ownBusy: false, live: [] })
    others = foldOtherRunEvent(others, { ...agentStart, runId: 'platform-1', ids: [id] })
    others = foldOtherRunEvent(others, { ...routesPassed, runId: 'platform-1' }, 2)
    others = foldOtherRunEvent(others, { ...agentDone, runId: 'platform-1' })
    shown = presentOtherRun(shown, others['platform-1'], {
      ownBusy: false,
      live: liveOtherRuns(others, 'platform-1'),
    })
    expect(shown.runId).toBe('agent-1')
    expect(shown.running).toBe(true)
    expect(shown.results[id]?.status).toBe('passed')
    // Re-presenting A's folded snapshot must not restore its older failure.
    others = foldOtherRunEvent(others, {
      type: 'output',
      runId: 'agent-1',
      id: 'pending',
      chunk: 'still running',
    })
    shown = presentOtherRun(shown, others['agent-1'], { ownBusy: false, live: [] })
    expect(shown.results[id]?.status).toBe('passed')
    shown = presentOtherRun(shown, fold([agentDone], others)['agent-1'], {
      ownBusy: false,
      live: [],
    })
    expect(shown.results[id]?.status).toBe('passed')
  })

  it('settles buffered results by result arrival, not run insertion or completion order', () => {
    const id = 'api:src/routes.test.ts'
    let own = applyTestRunEvent(EMPTY_RUN_STATE, { type: 'start', runId: 'own', ids: [id] })
    own = applyTestRunEvent(own, { type: 'result', id, status: 'failed' }, 1)
    let others = fold([agentStart, { ...agentStart, runId: 'platform-1' }])
    // The second inserted run reports first; the first inserted run reports last.
    others = foldOtherRunEvent(
      others,
      { ...routesPassed, runId: 'platform-1', status: 'failed' },
      2,
    )
    others = foldOtherRunEvent(others, routesPassed, 3)
    others = fold([agentDone, { ...agentDone, runId: 'platform-1' }], others)
    const ended = applyTestRunEvent(own, { type: 'done', outcome: 'completed' })
    expect(settleOwnRun(ended, others).results[id]?.status).toBe('passed')
    // A genuinely newer result from the person's run still wins.
    const newer = applyTestRunEvent(ended, { type: 'result', id, status: 'skipped' }, 4)
    expect(settleOwnRun(newer, others).results[id]?.status).toBe('skipped')
  })
})
