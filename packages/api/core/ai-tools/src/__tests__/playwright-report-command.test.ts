/**
 * Placing Playwright's standard `json` report on a run WITHOUT changing what the run does
 * (../utilities.ts `withPlaywrightRunReport`, `streamingBackgroundCommand`).
 *
 * Three things must hold for every command below, and each test is one of them: the run's own
 * reporters keep their place (the log still streams, the executor's file artifacts are still
 * written), the report goes to the caller's file through Playwright's own
 * `PLAYWRIGHT_JSON_OUTPUT_FILE` option, and a command that already has a report of its own — a
 * `json` reporter named by the executor, or the variable set by hand — is left exactly as written.
 */
import { describe, expect, it } from 'vitest'

import { PLAYWRIGHT_REPORT_ENV } from '../playwright-report.js'
import { streamingBackgroundCommand, withPlaywrightRunReport } from '../utilities.js'

/** The report file a foreground call would use. */
const REPORT = '/tmp/mol-pw-abc123.playwright.json'

/** The head a background command carries: the report's file option, shell-quoted. */
const REPORT_HEAD = `export ${PLAYWRIGHT_REPORT_ENV}='${REPORT}'; `

/** The head every background command also gets (the inline-failure switch). */
const INLINE_HEAD = 'export PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE=1; '

describe('withPlaywrightRunReport (foreground)', () => {
  it('appends json to the reporter set the executor wrote, keeping every existing reporter', () => {
    expect(withPlaywrightRunReport('npx playwright test --reporter=list', REPORT)).toEqual({
      command: `${REPORT_HEAD}npx playwright test --reporter=list,json`,
      reportPath: REPORT,
    })
    // A printing reporter the executor chose keeps printing: the log is unchanged.
    expect(withPlaywrightRunReport('npx playwright test --reporter=line', REPORT).command).toBe(
      `${REPORT_HEAD}npx playwright test --reporter=line,json`,
    )
    // …and so does a file reporter: the executor's own artifact is still written.
    expect(withPlaywrightRunReport('npx playwright test --reporter=html', REPORT).command).toBe(
      `${REPORT_HEAD}npx playwright test --reporter=html,json`,
    )
    // The space spelling of the flag is Playwright's same option.
    expect(withPlaywrightRunReport('npx playwright test --reporter list', REPORT).command).toBe(
      `${REPORT_HEAD}npx playwright test --reporter list,json`,
    )
  })

  it('keeps the flag inside the run statement, before a pipe or a trailing status step', () => {
    expect(
      withPlaywrightRunReport(
        'cd e2e && npx playwright test --reporter=list 2>&1 | tail -5',
        REPORT,
      ).command,
    ).toBe(`${REPORT_HEAD}cd e2e && npx playwright test --reporter=list,json 2>&1 | tail -5`)
    expect(
      withPlaywrightRunReport('npx playwright test --reporter=list; echo EXIT $?', REPORT).command,
    ).toBe(`${REPORT_HEAD}npx playwright test --reporter=list,json; echo EXIT $?`)
  })

  it('leaves a run that names no reporter to the suite config it loads', () => {
    // The config's reporters are not this tool's to replace: doing so would stop writing whatever
    // artifact the suite configured, and the report is not worth that.
    expect(withPlaywrightRunReport('npx playwright test', REPORT)).toEqual({
      command: 'npx playwright test',
      reportPath: null,
    })
  })

  it('never takes over a report the executor already has', () => {
    for (const command of [
      'npx playwright test --reporter=json',
      'npx playwright test --reporter=list,json',
      `export ${PLAYWRIGHT_REPORT_ENV}=/tmp/theirs.json; npx playwright test --reporter=list`,
    ]) {
      expect(withPlaywrightRunReport(command, REPORT), command).toEqual({
        command,
        reportPath: null,
      })
    }
  })

  it('leaves anything that is not a Playwright run alone', () => {
    for (const command of [
      'npm test',
      'npx playwright test --list',
      'npx playwright test --list --reporter=list',
      'grep -n "playwright test" e2e/README.md',
      'npx vitest run --reporter=verbose',
    ]) {
      expect(withPlaywrightRunReport(command, REPORT), command).toEqual({
        command,
        reportPath: null,
      })
    }
  })

  it('changes nothing when the caller keeps no report', () => {
    // Omitted reportPath is the pre-existing path for every call site that does not want one.
    expect(withPlaywrightRunReport('npx playwright test --reporter=list', '').reportPath).toBeNull()
  })
})

describe('streamingBackgroundCommand with a report path', () => {
  it('adds the machine report beside the list reporter it already installs', () => {
    expect(streamingBackgroundCommand('npx playwright test', undefined, REPORT)).toEqual({
      command:
        `${INLINE_HEAD}${REPORT_HEAD}` + 'npx playwright test --reporter=list,json --retries=0',
      changes: [
        'Added `--reporter=list` so each test result is written to the log as it finishes ' +
          '(the config reporter may print nothing until the end).',
        'Each failure’s own error is now written into the log as that test fails, not only in the ' +
          'summary at the end — so a run that is still walking already says what its failures are, ' +
          'and you need not wait for it to end to start on them.',
        'Added `--retries=0`: a local run walks each failure once; the suite’s retries apply on the deployed proof run.',
      ],
      reportPath: REPORT,
    })
  })

  it('appends json to a reporter set that was already exactly list', () => {
    const run = 'npx playwright test --reporter=list --workers=1'
    const result = streamingBackgroundCommand(run, undefined, REPORT)
    expect(result.command).toBe(
      `${INLINE_HEAD}${REPORT_HEAD}npx playwright test --reporter=list,json --workers=1 --retries=0`,
    )
    expect(result.reportPath).toBe(REPORT)
    // No reporter note: the executor's set was already the shape the platform reads.
    expect(result.changes).not.toContain(expect.stringContaining('Switched the test reporters'))
  })

  it('keeps a file reporter the executor asked for, and the note about the printers it merged', () => {
    const result = streamingBackgroundCommand(
      'npx playwright test --reporter=html,line',
      undefined,
      REPORT,
    )
    expect(result.command).toBe(
      `${INLINE_HEAD}${REPORT_HEAD}npx playwright test --reporter=html,list,json --retries=0`,
    )
    expect(result.reportPath).toBe(REPORT)
    expect(result.changes[0]).toContain('Switched the test reporters')
  })

  it('leaves the executor’s own json reporter — and its destination — alone', () => {
    const result = streamingBackgroundCommand(
      'npx playwright test --reporter=json',
      undefined,
      REPORT,
    )
    expect(result.command).not.toContain('json,')
    expect(result.command).not.toContain(PLAYWRIGHT_REPORT_ENV)
    expect(result.reportPath).toBeUndefined()
  })

  it('is unchanged when the caller keeps no report', () => {
    // The pre-existing shapes, byte for byte: adding a sideband must not move anything else.
    expect(streamingBackgroundCommand('npx playwright test')).toEqual({
      command: `${INLINE_HEAD}npx playwright test --reporter=list --retries=0`,
      changes: [
        'Added `--reporter=list` so each test result is written to the log as it finishes ' +
          '(the config reporter may print nothing until the end).',
        'Each failure’s own error is now written into the log as that test fails, not only in the ' +
          'summary at the end — so a run that is still walking already says what its failures are, ' +
          'and you need not wait for it to end to start on them.',
        'Added `--retries=0`: a local run walks each failure once; the suite’s retries apply on the deployed proof run.',
      ],
    })
    expect(streamingBackgroundCommand('npx playwright test --reporter=list').command).toBe(
      `${INLINE_HEAD}npx playwright test --reporter=list --retries=0`,
    )
    expect(streamingBackgroundCommand('npm run build').changes).toEqual([])
  })

  it('keeps a suite refusal and a non-Playwright command untouched', () => {
    const twice = 'npx playwright test; npx playwright test'
    expect(streamingBackgroundCommand(twice, undefined, REPORT).error).toBeDefined()
    expect(
      streamingBackgroundCommand('npx playwright test --list', undefined, REPORT).changes,
    ).toEqual([])
  })
})
