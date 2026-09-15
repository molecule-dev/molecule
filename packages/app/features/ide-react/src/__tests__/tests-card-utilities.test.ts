/**
 * The Tests card's pure state: grouping, the collapsed summary, and the reducer
 * that folds a run's streamed events into what the rows show.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import {
  applyTestRunEvent,
  countByKind,
  EMPTY_RUN_STATE,
  failRun,
  filterTests,
  groupTests,
  isRowRunning,
  MAX_OUTPUT_LINES,
  parseTestCommand,
  summarizeResults,
  testRowLabel,
} from '../components/tests-card-utilities.js'
import type { TestItem } from '../types.js'

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
