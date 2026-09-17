/**
 * The tests bar's pure half: what the strip says, and when it is shown.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import {
  parseTestsBarArg,
  parseTestsBarVisible,
  summariseTestsBar,
} from '../components/tests-bar-utilities.js'
import type { TestsRunState } from '../components/tests-card-utilities.js'
import { EMPTY_RUN_STATE } from '../components/tests-card-utilities.js'
import type { TestItem } from '../types.js'

const TESTS: TestItem[] = [
  {
    id: 'app:e2e/home.spec.ts',
    file: 'e2e/home.spec.ts',
    kind: 'e2e',
    workspace: 'app',
    workspaceLabel: 'app',
    title: 'home',
  },
  {
    id: 'app:e2e/post.spec.ts',
    file: 'e2e/post.spec.ts',
    kind: 'e2e',
    workspace: 'app',
    workspaceLabel: 'app',
    title: 'post',
  },
]

/**
 * A run state with the given overrides.
 *
 * @param over - Fields to override.
 * @returns The state.
 */
function runState(over: Partial<TestsRunState>): TestsRunState {
  return { ...EMPTY_RUN_STATE, ...over }
}

describe('tests bar visibility', () => {
  it('is SHOWN by default — only an explicit "false" hides it', () => {
    // The default matters: the bar exists so a preview moving on its own is
    // explained, which only works if it is there without being asked for.
    expect(parseTestsBarVisible(null)).toBe(true)
    expect(parseTestsBarVisible('')).toBe(true)
    expect(parseTestsBarVisible('nonsense')).toBe(true)
    expect(parseTestsBarVisible('true')).toBe(true)
    expect(parseTestsBarVisible('false')).toBe(false)
  })

  it('reads on / off / toggle, and refuses anything else', () => {
    expect(parseTestsBarArg('on', false)).toBe(true)
    expect(parseTestsBarArg('  OFF ', true)).toBe(false)
    expect(parseTestsBarArg('toggle', true)).toBe(false)
    expect(parseTestsBarArg('toggle', false)).toBe(true)
    // Not a visibility request: bare `/test` opens the browser instead, so the
    // parser must not claim arguments it does not own.
    expect(parseTestsBarArg('', true)).toBeNull()
    expect(parseTestsBarArg('e2e/home.spec.ts', true)).toBeNull()
  })
})

describe('summariseTestsBar', () => {
  it('reports nothing run yet as idle', () => {
    const s = summariseTestsBar(runState({}), TESTS)
    expect(s.tone).toBe('idle')
    expect(s.passed).toBe(0)
  })

  it('a single failing file makes the whole suite failing', () => {
    // The tone is not "what the last file did" — one failure among many passes
    // is the thing the person has to act on.
    const s = summariseTestsBar(
      runState({
        results: {
          'app:e2e/home.spec.ts': {
            status: 'passed',
            passed: 9,
            failed: 0,
            skipped: 0,
            output: '',
          },
          'app:e2e/post.spec.ts': {
            status: 'failed',
            passed: 0,
            failed: 1,
            skipped: 0,
            output: '',
          },
        },
      }),
      TESTS,
    )
    expect(s.tone).toBe('failing')
    expect(s.passed).toBe(1)
    expect(s.failed).toBe(1)
  })

  it('running wins over any count, because a moving total is not a verdict', () => {
    const s = summariseTestsBar(
      runState({
        running: true,
        queued: ['app:e2e/home.spec.ts', 'app:e2e/post.spec.ts'],
        results: {
          'app:e2e/home.spec.ts': {
            status: 'failed',
            passed: 0,
            failed: 1,
            skipped: 0,
            output: '',
          },
        },
      }),
      TESTS,
    )
    expect(s.tone).toBe('running')
    expect(s.remaining).toBe(1)
  })

  it('names the file and the test running right now', () => {
    const s = summariseTestsBar(
      runState({
        running: true,
        queued: ['app:e2e/home.spec.ts'],
        currentId: 'app:e2e/home.spec.ts',
        cases: {
          'app:e2e/home.spec.ts': {
            current: { title: 'renders the index', describe: 'index' },
            passed: 2,
            failed: 0,
            skipped: 0,
          },
        },
      }),
      TESTS,
    )
    expect(s.currentFile).toBe('home')
    expect(s.currentTest).toBe('index › renders the index')
  })

  it('a stopped run is neither passing nor failing', () => {
    // Half a run is not a verdict on the suite, so it gets its own tone rather
    // than being reported as whatever the finished files happened to say.
    const s = summariseTestsBar(
      runState({
        outcome: 'cancelled',
        results: {
          'app:e2e/home.spec.ts': {
            status: 'passed',
            passed: 3,
            failed: 0,
            skipped: 0,
            output: '',
          },
        },
      }),
      TESTS,
    )
    expect(s.tone).toBe('stopped')
  })

  it('a run-level error outranks the counts', () => {
    const s = summariseTestsBar(
      runState({
        error: 'the runner died',
        results: {
          'app:e2e/home.spec.ts': {
            status: 'passed',
            passed: 3,
            failed: 0,
            skipped: 0,
            output: '',
          },
        },
      }),
      TESTS,
    )
    expect(s.tone).toBe('error')
  })
})
