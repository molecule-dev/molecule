/** The budget reporter's lines: what it names, and how a reader gets each line back. */
import { describe, expect, it } from 'vitest'

import {
  BUDGET_SHARE,
  budgetLine,
  budgetLines,
  parseBudgetLine,
} from '../vitest-budget-reporter.mjs'

/** A finished test module as Vitest's reporter API hands it over. */
const testModule = (moduleId, tests) => ({
  moduleId,
  children: {
    *allTests() {
      for (const { name, duration, timeout } of tests)
        yield {
          fullName: name,
          task: { timeout },
          diagnostic: () => (duration === undefined ? undefined : { duration }),
        }
    },
  },
})

describe('budgetLines', () => {
  it('names each test at or over half of its limit, the largest share first', () => {
    const lines = budgetLines(
      [
        testModule('/repo/scripts/__tests__/sweep.test.ts', [
          { name: 'locale gate > sweeps the fleet', duration: 3175.4, timeout: 5000 },
          { name: 'locale gate > classifies a token', duration: 3, timeout: 5000 },
        ]),
        testModule('/repo/packages/a/src/__tests__/a.test.ts', [
          { name: 'a > exactly half', duration: 15000, timeout: 30000 },
          { name: 'a > skipped', duration: undefined, timeout: 30000 },
          { name: 'a > no limit', duration: 9000, timeout: 0 },
        ]),
      ],
      { cwd: '/repo' },
    )
    expect(lines).toEqual([
      '[vitest-budget] 3175 of 5000 ms (64%): scripts/__tests__/sweep.test.ts > locale gate > sweeps the fleet',
      '[vitest-budget] 15000 of 30000 ms (50%): packages/a/src/__tests__/a.test.ts > a > exactly half',
    ])
    expect(BUDGET_SHARE).toBe(0.5)
  })

  it('names nothing in a run where every test is well inside its limit', () => {
    const module = testModule('/repo/x.test.ts', [{ name: 'quick', duration: 40, timeout: 5000 }])
    expect(budgetLines([module], { cwd: '/repo' })).toEqual([])
  })
})

describe('parseBudgetLine', () => {
  it('reads a line back, also behind the job, step and timestamp CI puts in front', () => {
    const line = budgetLine({
      duration: 2515,
      timeout: 5000,
      file: 'scripts/__tests__/check-locale-placeholders.test.ts',
      name: 'locale placeholder gate > reports no placeholder drift anywhere in the fleet',
    })
    const expected = {
      duration: 2515,
      timeout: 5000,
      share: 0.503,
      file: 'scripts/__tests__/check-locale-placeholders.test.ts',
      name: 'locale placeholder gate > reports no placeholder drift anywhere in the fleet',
    }
    expect(parseBudgetLine(line)).toEqual(expected)
    expect(
      parseBudgetLine(`tests (6)\tTest affected packages\t2026-11-21T18:11:58.5808408Z ${line}`),
    ).toEqual(expected)
  })

  it('reads nothing from any other line', () => {
    expect(parseBudgetLine('✓ reports no placeholder drift anywhere in the fleet 2515ms')).toBe(
      null,
    )
  })
})
