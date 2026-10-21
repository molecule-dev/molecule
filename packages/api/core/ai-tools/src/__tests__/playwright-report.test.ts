/**
 * The bounded record built from Playwright's OWN machine report (../playwright-report.ts).
 *
 * Every shape below that claims to be runner data comes from a genuine run: the helper writes a
 * tiny spec with no `page`/`browser` fixture and runs the workspace's installed Playwright with
 * `--reporter=list,json` and `PLAYWRIGHT_JSON_OUTPUT_FILE`, exactly as the tool wires it. The
 * malformed controls are the honest other half — absent, truncated, empty and wrongly shaped files
 * must never be read as a clean run.
 *
 * Without the module these tests exist for, none of this is available: the tool would carry only
 * the runner's printed log, and a reader would go on reconstructing identities from it.
 */
import { existsSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  commandWritesReportTo,
  MAX_REPORTED_FAILURES,
  PLAYWRIGHT_REPORT_ENV,
  playwrightReportPathFor,
  type PlaywrightRunReport,
  reportCarriesIdentities,
  reportTestArtifactDir,
  summarizePlaywrightReport,
} from '../playwright-report.js'
import { installedPlaywright, runTinyPlaywright } from './fixtures/playwright-run.js'

/** The installed Playwright, or null on a machine without one (the genuine-run tests skip then). */
const playwright = installedPlaywright()

/** Both failures in one spec, at distinct declarations. */
const TWO_FAILURES = `
test('first failure', () => {
  expect(1 + 1).toBe(3)
})

test('second failure', () => {
  expect('a').toBe('b')
})
`

/** One test that fails on both attempts, so the record carries a real retry. */
const RETRIED_FAILURE = `
test('subtracts', () => {
  expect(2 - 1).toBe(3)
})
`

/** One passing test that needs no browser. */
const PASSES = `
test('adds', () => {
  expect(1 + 1).toBe(2)
})
`

/** Every identity → artifact directory pair a record names. */
function identityDirs(report: PlaywrightRunReport): Map<string, string | null> {
  const out = new Map<string, string | null>()
  for (const failure of report.failures)
    out.set(`${failure.file}:${failure.line}`, reportTestArtifactDir(failure))
  return out
}

describe('summarizePlaywrightReport, from a genuine runner report', () => {
  it.skipIf(playwright === null)(
    'reads a green run as complete, with no failures listed',
    () => {
      const run = runTinyPlaywright(PASSES)
      if (run === null) throw new Error('Playwright disappeared mid-test')
      try {
        expect(run.exitCode).toBe(0)
        const report = summarizePlaywrightReport(run.report, { path: run.reportPath })
        expect(report.status).toBe('complete')
        expect(report.stats).not.toBeNull()
        expect(report.stats?.expected).toBe(1)
        expect(report.stats?.unexpected).toBe(0)
        expect(report.failures).toEqual([])
        expect(report.omittedFailures).toBe(0)
      } finally {
        run.cleanup()
      }
    },
    60_000,
  )

  it.skipIf(playwright === null)(
    'binds a retried failure to the attempt that failed, with its own attachment path',
    () => {
      const run = runTinyPlaywright(RETRIED_FAILURE, { retries: 1 })
      if (run === null) throw new Error('Playwright disappeared mid-test')
      try {
        expect(run.exitCode).toBe(1)
        const report = summarizePlaywrightReport(run.report, { path: run.reportPath })
        expect(report.status).toBe('complete')
        expect(report.stats?.unexpected).toBe(1)
        expect(report.failures).toHaveLength(1)
        const failure = report.failures[0]
        expect(failure).toBeDefined()
        if (failure === undefined) return
        expect(failure.title).toBe('subtracts')
        expect(failure.file).toBe('tiny.spec.js')
        expect(failure.line).toBeGreaterThan(0)
        // The runner retried it once and it failed both times: the record keeps the LAST failing
        // attempt, which is the one the run ended on.
        expect(failure.attempts).toBe(2)
        expect(failure.retry).toBe(1)
        // A terminal-coloured `expect` diff: stripped, never handed on as `[2m` fragments.
        expect(failure.error).toContain('Expected')
        expect(failure.error).toContain('Received')
        expect(failure.error).not.toContain('\u001B')
        // The runner saved an artifact for THAT attempt, and the record points at it.
        const attachment = failure.attachments[0]
        expect(attachment?.name).toBe('error-context')
        expect(attachment?.path.endsWith('-retry1/error-context.md')).toBe(true)
        const artifactDir = reportTestArtifactDir(failure)
        expect(artifactDir).not.toBeNull()
        expect(artifactDir?.endsWith('tiny-subtracts-retry1')).toBe(true)
        expect(existsSync(artifactDir ?? '')).toBe(true)
      } finally {
        run.cleanup()
      }
    },
    60_000,
  )

  it.skipIf(playwright === null)(
    'keeps two failures in one spec apart, whatever order the report lists them in',
    () => {
      const run = runTinyPlaywright(TWO_FAILURES)
      if (run === null) throw new Error('Playwright disappeared mid-test')
      try {
        const report = summarizePlaywrightReport(run.report, { path: run.reportPath })
        expect(report.status).toBe('complete')
        expect(report.failures).toHaveLength(2)
        const dirs = identityDirs(report)
        expect(dirs.size).toBe(2)
        const [one, other] = [...dirs.entries()]
        expect(one?.[1]).not.toBe(other?.[1])
        // A report whose specs are listed in another order is the SAME record: the identity owns
        // the directory, not the position it happens to sit at.
        const parsed = JSON.parse(run.report) as {
          suites: Array<{ specs: unknown[] }>
        }
        for (const suite of parsed.suites) suite.specs.reverse()
        const reversed = summarizePlaywrightReport(JSON.stringify(parsed), {
          path: run.reportPath,
        })
        expect(identityDirs(reversed)).toEqual(dirs)
      } finally {
        run.cleanup()
      }
    },
    60_000,
  )
})

describe('summarizePlaywrightReport, against records that are not a whole run', () => {
  const path = '/tmp/mol-pw-malformed.playwright.json'

  it('reports a missing file as missing, never as a clean run', () => {
    // The tool's own reader turns a readFile rejection into this record; the module's contract is
    // that absence is a status, not an empty failure list to be read as success.
    const missing: PlaywrightRunReport = {
      status: 'missing',
      path,
      reason: 'the run left no report at this path',
      stats: null,
      failures: [],
      omittedFailures: 0,
    }
    expect(reportCarriesIdentities(missing.status)).toBe(false)
    expect(missing.stats).toBeNull()
  })

  it('reports an empty file and truncated JSON as malformed', () => {
    for (const text of ['', '   \n', '{"stats":', 'not json at all']) {
      const report = summarizePlaywrightReport(text, { path })
      expect(report.status, text).toBe('malformed')
      expect(report.stats).toBeNull()
      expect(report.failures).toEqual([])
      expect(reportCarriesIdentities(report.status)).toBe(false)
    }
  })

  it('reports a JSON document that is not a report as malformed', () => {
    for (const text of ['[]', '"text"', 'null', '42']) {
      expect(summarizePlaywrightReport(text, { path }).status, text).toBe('malformed')
    }
  })

  it('reports a stat-less or suite-less document as partial, never complete', () => {
    const noSuites = JSON.stringify({
      stats: { expected: 1, skipped: 0, unexpected: 0, flaky: 0, duration: 10 },
    })
    const noStats = JSON.stringify({ suites: [], errors: [] })
    const withErrors = JSON.stringify({
      stats: { expected: 1, skipped: 0, unexpected: 1, flaky: 0, duration: 10 },
      suites: [{ title: '', specs: [] }],
      errors: ['a worker crashed'],
    })
    for (const text of [noSuites, noStats, withErrors]) {
      const report = summarizePlaywrightReport(text, { path })
      expect(report.status, text).toBe('partial')
      expect(reportCarriesIdentities(report.status)).toBe(true)
    }
    expect(summarizePlaywrightReport(withErrors, { path }).reason).toContain('1 error')
  })

  it('never turns an unreadable count into zero failures', () => {
    const text = JSON.stringify({ stats: { skipped: 0 }, suites: [] })
    const report = summarizePlaywrightReport(text, { path })
    expect(report.stats).toBeNull()
    expect(report.status).toBe('partial')
  })

  it('refuses to summarize a report past the size bound and keeps its path', () => {
    const report = summarizePlaywrightReport('x'.repeat(8_000_001), { path })
    expect(report.status).toBe('partial')
    expect(report.path).toBe(path)
    expect(report.reason).toContain('not summarized')
  })
})

describe('the record is bounded and redacted', () => {
  /** A report in the runner's own shape, with `count` distinct failing tests. */
  function reportWith(count: number, message = 'boom'): string {
    return JSON.stringify({
      stats: { expected: 0, skipped: 0, unexpected: count, flaky: 0, duration: 1 },
      suites: [
        {
          title: '',
          suites: [
            {
              title: 'group',
              specs: Array.from({ length: count }, (_, index) => ({
                title: `test ${index}`,
                ok: false,
                file: 'e2e/a.spec.ts',
                line: 10 + index,
                column: 1,
                id: `id-${index}`,
                tests: [
                  {
                    projectName: 'chromium',
                    status: 'unexpected',
                    results: [
                      {
                        status: 'failed',
                        retry: 0,
                        duration: 1,
                        error: { message },
                        errors: [{ message }],
                        attachments: [
                          {
                            name: 'trace',
                            contentType: 'application/zip',
                            path: `/workspace/app/test-results/a-${index}/trace.zip`,
                          },
                          {
                            name: 'screenshot',
                            contentType: 'image/png',
                            path: `/workspace/app/test-results/a-${index}/test-failed-1.png`,
                          },
                        ],
                      },
                    ],
                  },
                ],
              })),
            },
          ],
        },
      ],
      errors: [],
    })
  }

  it('lists a bounded number of failures and counts the rest', () => {
    const report = summarizePlaywrightReport(reportWith(MAX_REPORTED_FAILURES + 3), {
      path: '/tmp/x.json',
    })
    expect(report.failures).toHaveLength(MAX_REPORTED_FAILURES)
    expect(report.omittedFailures).toBe(3)
    expect(report.failures[0]?.titlePath).toEqual(['group', 'test 0'])
  })

  it('keeps `trace` first on a test that saved several artifacts', () => {
    const report = summarizePlaywrightReport(reportWith(1), { path: '/tmp/x.json' })
    const failure = report.failures[0]
    expect(failure?.attachments.map((one) => one.name)).toEqual(['trace', 'screenshot'])
    expect(failure === undefined ? null : reportTestArtifactDir(failure)).toBe(
      '/workspace/app/test-results/a-0',
    )
  })

  it('runs error text through the consumer redactor', () => {
    const report = summarizePlaywrightReport(
      reportWith(1, 'request failed with Bearer sk-live-abcdef0123456789'),
      { path: '/tmp/x.json', sanitize: (text) => text.replace(/sk-live-[a-z0-9]+/g, '[redacted]') },
    )
    expect(report.failures[0]?.error).toBe('request failed with Bearer [redacted]')
  })
})

describe('the report path the tool wires', () => {
  it('is the task id derived, beside its log', () => {
    expect(playwrightReportPathFor('mol-bg-mabc-123')).toBe('/tmp/mol-bg-mabc-123.playwright.json')
  })

  it('is recognized only when the command sets exactly that path', () => {
    const path = playwrightReportPathFor('mol-bg-mabc-123')
    expect(
      commandWritesReportTo(`export ${PLAYWRIGHT_REPORT_ENV}=${path}; npx playwright test`, path),
    ).toBe(true)
    expect(
      commandWritesReportTo(`export ${PLAYWRIGHT_REPORT_ENV}='${path}'; npx playwright test`, path),
    ).toBe(true)
    expect(commandWritesReportTo(`export ${PLAYWRIGHT_REPORT_ENV}=/tmp/other; x`, path)).toBe(false)
    expect(commandWritesReportTo('npx playwright test', path)).toBe(false)
    // A prefix of the path is not the path.
    expect(commandWritesReportTo(`export ${PLAYWRIGHT_REPORT_ENV}=${path}.bak; x`, path)).toBe(
      false,
    )
  })
})
