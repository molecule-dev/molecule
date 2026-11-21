/**
 * A Vitest reporter that names every test which used at least half of its time limit.
 *
 * Why: a test whose work grows with the repository creeps toward its limit run by run, and on
 * a CI runner that runs other tests beside it the time also varies about threefold from run to
 * run. On 2026-11-21 the locale placeholder sweep (`scripts/__tests__/check-locale-placeholders.test.ts`),
 * which reads every locale file of every bond, timed out in CI at 6.1 s against the 5 s default
 * (molecule run 44930204843). Green runs the two days before had already taken 2.5 s and 3.2 s of
 * it, and nothing read those times. Printed in CI, these lines are what a release reads before
 * it pushes, so a test near its limit is given room or made faster before it fails a run.
 *
 * One line per test, after the run: `[vitest-budget] 3175 of 5000 ms (64%): <file> > <test name>`,
 * with the file relative to the working directory. The limit is the one the test ran under: its
 * own `timeout`, or its project's `testTimeout`. A test that did not run, or ran without a limit,
 * is not named.
 *
 * @module scripts/vitest-budget-reporter
 */

import process from 'node:process'

/** The share of its time limit at which a test is named. */
export const BUDGET_SHARE = 0.5

/** What every line this reporter prints starts with. */
export const BUDGET_TAG = '[vitest-budget]'

const LINE = /\[vitest-budget\] (\d+) of (\d+) ms \(\d+%\): (.+?) > (.+)$/

/**
 * The line for one test.
 *
 * @param test - Its time and limit in milliseconds, its file and its full name.
 * @returns The line.
 */
export function budgetLine({ duration, timeout, file, name }) {
  const ms = Math.round(duration)
  return `${BUDGET_TAG} ${ms} of ${timeout} ms (${Math.round((100 * ms) / timeout)}%): ${file} > ${name}`
}

/**
 * Reads one line this reporter printed, wherever it sits in a longer log line (CI prefixes
 * each line with the job, the step and a timestamp).
 *
 * @param line - A log line.
 * @returns The test's time, limit, share, file and name, or null when the line is not one of
 *   this reporter's.
 */
export function parseBudgetLine(line) {
  const match = LINE.exec(line)
  if (!match) return null
  const duration = Number(match[1])
  const timeout = Number(match[2])
  return { duration, timeout, share: duration / timeout, file: match[3], name: match[4].trim() }
}

/**
 * The tests of a finished run that used at least `share` of their time limit, as lines.
 *
 * @param testModules - Vitest's finished test modules.
 * @param [options]
 * @param [options.share] - The share at which a test is named.
 * @param [options.cwd] - What the file names are relative to.
 * @returns One line per test, the largest share first.
 */
export function budgetLines(testModules, { share = BUDGET_SHARE, cwd = process.cwd() } = {}) {
  const found = []
  for (const testModule of testModules) {
    const file = testModule.moduleId.startsWith(`${cwd}/`)
      ? testModule.moduleId.slice(cwd.length + 1)
      : testModule.moduleId
    for (const test of testModule.children.allTests()) {
      const timeout = test.task?.timeout
      const duration = test.diagnostic()?.duration
      if (!(timeout > 0) || !(duration >= 0)) continue
      if (duration / timeout >= share)
        found.push({ duration, timeout, file, name: test.fullName, share: duration / timeout })
    }
  }
  return found.sort((a, b) => b.share - a.share).map(budgetLine)
}

/** Prints {@link budgetLines} once the run ends. */
export default class VitestBudgetReporter {
  /**
   * Prints the lines once the run ends.
   *
   * @param testModules - The finished test modules.
   */
  onTestRunEnd(testModules) {
    const lines = budgetLines(testModules)
    if (lines.length) process.stdout.write(`${lines.join('\n')}\n`)
  }
}
