/**
 * The standard Playwright machine report, kept beside a run's log instead of inferred from it.
 *
 * The execution wrapper already puts a background suite on Playwright's `list` reporter and
 * preserves a file reporter the executor named ({@link ./utilities.js} `withPlaywrightRunReport`,
 * `streamingBackgroundCommand`). That log is text: which failure a trace, a route or a locator
 * belongs to has to be reconstructed from printed headings, and a mis-join reads one failing
 * test's evidence as another's. Playwright already writes the answer down
 * itself — its built-in `json` reporter records every test's own identity (project, file, line,
 * column, title path, status, retries) and every attachment the runner saved for THAT test, path
 * included.
 *
 * So the wrapper adds the `json` reporter to a run it already rewrites, sends its output to a
 * per-run file with the reporter's own `PLAYWRIGHT_JSON_OUTPUT_FILE` option, and this module turns
 * that file into a small, bounded record on the tool result ({@link PlaywrightRunReport}). The
 * whole file stays where it was written, so full evidence has a path; the record carries only what
 * a diagnosis needs.
 *
 * Honesty rules, which every reader below follows:
 *
 * - A missing, empty, truncated or wrongly shaped file is NOT "the run failed nothing": it is
 *   `missing` / `malformed`, and a record that parsed but is not a whole run (`errors` present, no
 *   `suites`) is `partial`. Only a record with the runner's own stats and suite tree is `complete`.
 * - The record never carries a pass/fail verdict and must never be read as one. Suite selection,
 *   retries, budgets and the platform's own proof decisions stay exactly where they were.
 * - Nothing here parses console output, and nothing reads a report the executor asked for itself
 *   (a `json` reporter already named on the command, or a `PLAYWRIGHT_JSON_OUTPUT_FILE` the command
 *   sets): the executor's own artifact is theirs.
 *
 * @module
 */

import { posix } from 'path'

/**
 * The environment variable Playwright's built-in `json` reporter takes its output path from
 * (`resolveOutputFile("JSON", …)`), resolved against the runner's own working directory. An
 * absolute path is used here, so the file lands in the run's scratch area whatever directory the
 * suite runs from.
 */
export const PLAYWRIGHT_REPORT_ENV = 'PLAYWRIGHT_JSON_OUTPUT_FILE'

/** The file name a background task's report is written to, beside its own log. */
export const PLAYWRIGHT_REPORT_SUFFIX = '.playwright.json'

/**
 * How big a report may be before this module refuses to summarize it. The file stays readable at
 * its path; the record only says so. A whole 139-test suite's report is well under a megabyte; a
 * report past this is not one a tool result should carry.
 */
export const MAX_REPORT_PARSE_CHARS = 8_000_000

/** How many failing tests a record lists before the rest are counted in `omittedFailures`. */
export const MAX_REPORTED_FAILURES = 12

/** How many attachments one failing test keeps in the record (`trace` first). */
export const MAX_REPORTED_ATTACHMENTS = 4

/** How much of one failure's own error text the record keeps. */
export const MAX_REPORTED_ERROR_CHARS = 400

/** How much of one printed path the record keeps. */
const MAX_REPORTED_PATH_CHARS = 300

/** How much of one title the record keeps. */
const MAX_REPORTED_TITLE_CHARS = 300

/**
 * The terminal formatting Playwright bakes into an error message — `expect` diffs are written for a
 * terminal, so the report's own `error.message` carries SGR sequences. Stripped here, before the
 * consumer's redactor, so a result never carries `[2m`/`[22m` fragments as if they were text.
 */
// eslint-disable-next-line no-control-regex -- an escape sequence IS a control character
const ANSI_SEQUENCE = /\u001B\[[0-9;?]*[A-Za-z]/g
/**
 * How much of a report this module could account for.
 *
 * - `complete` — the runner's stats and its suite tree both parsed: every test entry is present.
 * - `partial` — a report was written but is not a whole run (Playwright's own `errors` are present,
 *   the suite tree is missing, or the file is past {@link MAX_REPORT_PARSE_CHARS}). What is listed
 *   is real; what is missing must be read at {@link PlaywrightRunReport.path}.
 * - `malformed` — the file exists but is not a Playwright JSON report (truncated, wrong shape).
 *   Nothing in it may be treated as runner data.
 * - `missing` — the run left no report (killed before `onEnd`, not a run this wrapper rewrote, or
 *   the file was removed). Nothing may be inferred from its absence.
 */
export type PlaywrightReportStatus = 'complete' | 'partial' | 'malformed' | 'missing'

/** One artifact the runner saved for one test, as the report records it. */
export interface PlaywrightReportAttachment {
  /** The attachment's name (`trace`, `screenshot`, …). */
  name: string
  /** Its media type, when the runner recorded one. */
  contentType: string | null
  /** Where the runner saved it, as the report wrote the path. */
  path: string
}

/**
 * One failing (or flaky) test's identity and evidence, as the runner recorded them.
 *
 * The identity fields are Playwright's own — never reconstructed from printed headings — so a
 * reader can tell exactly which test an attachment belongs to.
 */
export interface PlaywrightReportTest {
  /** The spec's stable id, when the report carries one. */
  id: string | null
  /** The Playwright project the test ran in. */
  project: string | null
  /** The spec file, relative to the config's root directory as the report writes it. */
  file: string
  /** The test's declaration line. */
  line: number
  /** The test's declaration column. */
  column: number
  /** The full title path (`['describe', …, 'test title']`), empty when none is readable. */
  titlePath: string[]
  /** The test's own title (the last entry of {@link titlePath}). */
  title: string
  /** Playwright's outcome for the test: `unexpected`, `flaky`, `skipped` or `expected`. */
  status: string
  /** How many attempts the runner made (1 when it was not retried). */
  attempts: number
  /** The retry index of the attempt whose evidence is reported (0 when not retried). */
  retry: number
  /** That attempt's own duration, in milliseconds. */
  durationMs: number
  /** That attempt's error message, bounded and redacted, or null. */
  error: string | null
  /** The artifacts the runner saved for THAT attempt — `trace` first. */
  attachments: PlaywrightReportAttachment[]
}

/** The runner's own tally, read straight from the report. Never a verdict this module derives. */
export interface PlaywrightReportStats {
  /** Tests that ended as expected. */
  expected: number
  /** Tests the runner skipped. */
  skipped: number
  /** Tests that did not end as expected. */
  unexpected: number
  /** Tests that failed and then passed on a retry. */
  flaky: number
  /** The run's own duration, in milliseconds. */
  durationMs: number
}

/**
 * What one run's standard machine report says, bounded for a tool result.
 *
 * A reader that needs evidence this record does not carry reads {@link path} in the sandbox.
 */
export interface PlaywrightRunReport {
  /** How much of the report was read — see {@link PlaywrightReportStatus}. */
  status: PlaywrightReportStatus
  /** Where the report file is, for the full evidence. Always the runner's own file. */
  path: string
  /** One short phrase saying why a record is not `complete`, when it is not. */
  reason?: string
  /** The runner's tally, or null when the report did not carry one. */
  stats: PlaywrightReportStats | null
  /** The failing and flaky tests, in report order, bounded by {@link MAX_REPORTED_FAILURES}. */
  failures: PlaywrightReportTest[]
  /** How many failing tests did not fit the bound above. */
  omittedFailures: number
}

/** One plain record out of unknown JSON, or null when the value is not an object. */
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/** A finite number from unknown JSON, or null. */
function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** A non-empty string from unknown JSON, or null. */
function asString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

/** A string cut to {@link MAX_REPORTED_PATH_CHARS}. */
function boundedPath(value: string): string {
  return value.length > MAX_REPORTED_PATH_CHARS
    ? `${value.slice(0, MAX_REPORTED_PATH_CHARS)}…`
    : value
}

/** A string cut to {@link MAX_REPORTED_TITLE_CHARS}. */
function boundedTitle(value: string): string {
  return value.length > MAX_REPORTED_TITLE_CHARS
    ? `${value.slice(0, MAX_REPORTED_TITLE_CHARS)}…`
    : value
}

/**
 * The report statuses for which the report's own per-test identities and attachments may be used.
 *
 * `partial` is included because a partial report's suite tree, where it parsed, is still the
 * runner's own record of which test owns which attachment; `malformed` and `missing` are not,
 * because nothing about them is runner data.
 *
 * @param status - One record's {@link PlaywrightReportStatus}.
 * @returns True when the record's tests and attachments are the runner's own.
 */
export function reportCarriesIdentities(status: PlaywrightReportStatus): boolean {
  return status === 'complete' || status === 'partial'
}

/**
 * The attachments a stored record actually carries.
 *
 * A record read back from a transcript is not guaranteed to be the shape this module wrote — a
 * damaged, truncated or hand-edited one can carry a null entry, a non-array field or an attachment
 * without a path. Every reader goes through here so a damaged record answers "no artifact", never a
 * thrown error and never another test's trace.
 *
 * @param test - One entry of {@link PlaywrightRunReport.failures}, as stored.
 * @returns Its well-shaped attachments, in the record's own order.
 */
function storedAttachments(test: PlaywrightReportTest): PlaywrightReportAttachment[] {
  const raw: unknown = (test as { attachments?: unknown } | null)?.attachments
  if (!Array.isArray(raw)) return []
  const out: PlaywrightReportAttachment[] = []
  for (const entry of raw) {
    const attachment = asRecord(entry)
    if (attachment === null) continue
    const path = asString(attachment.path)
    if (path === null) continue
    out.push({
      name: asString(attachment.name) ?? '',
      contentType: asString(attachment.contentType),
      path,
    })
  }
  return out
}

/**
 * The attachment paths a stored test record carries, `trace` first.
 *
 * @param test - One entry of {@link PlaywrightRunReport.failures}, as stored.
 * @returns Every saved path the record can prove, in its own order.
 */
export function reportTestAttachmentPaths(test: PlaywrightReportTest): string[] {
  return storedAttachments(test).map((attachment) => attachment.path)
}

/**
 * The directory a test result's own artifacts were saved in, or null when the report names none.
 *
 * Playwright writes one directory per test attempt under the run's `outputDir`, and every artifact
 * of that attempt — `trace.zip` included — sits in it. The directory is therefore the exact
 * ownership mark for a trace: two tests' traces are never in one another's directory. A damaged
 * record whose attachment entries carry no path answers null, so nothing is claimed from it.
 *
 * @param test - One entry of {@link PlaywrightRunReport.failures}, as stored.
 * @returns The posix-normalized directory, or null.
 */
export function reportTestArtifactDir(test: PlaywrightReportTest): string | null {
  const attachment = storedAttachments(test).find((one) => one.path !== '')
  return attachment === undefined ? null : posix.dirname(attachment.path)
}

/** The attachments of one attempt, `trace` first and bounded. */
function attachmentsOf(result: Record<string, unknown>): PlaywrightReportAttachment[] {
  const raw = Array.isArray(result.attachments) ? result.attachments : []
  const out: PlaywrightReportAttachment[] = []
  for (const entry of raw) {
    const attachment = asRecord(entry)
    if (attachment === null) continue
    const path = asString(attachment.path)
    if (path === null) continue
    out.push({
      name: asString(attachment.name) ?? '',
      contentType: asString(attachment.contentType),
      path: boundedPath(path),
    })
  }
  // `trace` first: it is the artifact a failure diagnosis reads, and the `body` Playwright may
  // inline is deliberately dropped — it is base64 evidence the file path already carries.
  out.sort((left, right) => Number(right.name === 'trace') - Number(left.name === 'trace'))
  return out.slice(0, MAX_REPORTED_ATTACHMENTS)
}

/**
 * The attempt whose evidence describes the test's failure: the LAST attempt that did not pass.
 *
 * A retried test reports one result per attempt. A flaky test's final attempt passed, but the
 * failure it is reported for happened in the earlier one, and that is where the trace was kept
 * (`retain-on-failure`).
 *
 * @param results - One test's `results` array, in attempt order.
 * @returns The chosen attempt and its index, or null when there is none.
 */
function evidenceAttempt(
  results: readonly unknown[],
): { result: Record<string, unknown>; index: number } | null {
  let chosen: { result: Record<string, unknown>; index: number } | null = null
  for (let index = 0; index < results.length; index += 1) {
    const result = asRecord(results[index])
    const status = result === null ? null : asString(result.status)
    if (result === null || status === null) continue
    if (status !== 'passed' && status !== 'skipped') chosen = { result, index }
  }
  if (chosen !== null) return chosen
  const last = asRecord(results[results.length - 1])
  return last === null ? null : { result: last, index: results.length - 1 }
}

/** One test's own error text, bounded and sanitized, or null. */
function errorOf(
  result: Record<string, unknown>,
  sanitize: (text: string) => string,
): string | null {
  const errors = Array.isArray(result.errors) ? result.errors : []
  const first = asRecord(errors[0])
  const message = (first === null ? null : asString(first.message)) ?? null
  const direct = asRecord(result.error)
  const text = message ?? (direct === null ? null : asString(direct.message))
  if (text === null) return null
  const plain = text.replace(ANSI_SEQUENCE, '')
  const bounded =
    plain.length > MAX_REPORTED_ERROR_CHARS ? `${plain.slice(0, MAX_REPORTED_ERROR_CHARS)}…` : plain
  return sanitize(bounded)
}

/** Whether one test entry should be listed: a failure, a retried failure, or an interruption. */
function isFailingTest(status: string, results: readonly unknown[]): boolean {
  if (status === 'unexpected' || status === 'flaky') return true
  return results.some((entry) => {
    const result = asRecord(entry)
    const resultStatus = result === null ? null : asString(result.status)
    return (
      resultStatus === 'failed' || resultStatus === 'timedOut' || resultStatus === 'interrupted'
    )
  })
}

/**
 * Every test entry under one suite, with the suite titles that lead to it.
 *
 * @param suite - One suite of the report's tree.
 * @param prefix - The titles of the suites above it.
 * @param out - Where the entries collect.
 * @param fileSuite - True for a top-level entry, whose title is the file path rather than a
 *   `describe` block: it is not part of a test's title path.
 */
function specsIn(
  suite: Record<string, unknown>,
  prefix: readonly string[],
  out: Array<{ spec: Record<string, unknown>; titlePath: string[] }>,
  fileSuite = false,
): void {
  const title = fileSuite ? null : asString(suite.title)
  const titlePath = title === null ? [...prefix] : [...prefix, title]
  const specs = Array.isArray(suite.specs) ? suite.specs : []
  for (const entry of specs) {
    const spec = asRecord(entry)
    if (spec !== null) out.push({ spec, titlePath })
  }
  const children = Array.isArray(suite.suites) ? suite.suites : []
  for (const entry of children) {
    const child = asRecord(entry)
    if (child !== null) specsIn(child, titlePath, out)
  }
}

/** One record for a report this module could not parse, with the reason. */
function unusable(
  status: 'partial' | 'malformed' | 'missing',
  path: string,
  reason: string,
): PlaywrightRunReport {
  return { status, path, reason, stats: null, failures: [], omittedFailures: 0 }
}

/**
 * Summarize one Playwright `json` report into the bounded record a tool result carries.
 *
 * Pure text in, record out: the caller reads the file (and decides whether it may), so this is
 * testable against genuine reports and against malformed controls alike.
 *
 * @param text - The report file's text, exactly as written.
 * @param options - Where the file is, and the consumer's redactor for error text.
 * @param options.path - The report file's path, carried on the record for full evidence.
 * @param options.sanitize - Redactor applied to error text (defaults to the identity).
 * @returns The bounded record; never a verdict.
 */
export function summarizePlaywrightReport(
  text: string,
  options: { path: string; sanitize?: (text: string) => string },
): PlaywrightRunReport {
  const path = options.path
  const sanitize = options.sanitize ?? ((value: string) => value)
  if (text.trim() === '') return unusable('malformed', path, 'the report file is empty')
  if (text.length > MAX_REPORT_PARSE_CHARS)
    return unusable(
      'partial',
      path,
      `the report is larger than ${MAX_REPORT_PARSE_CHARS} characters and was not summarized`,
    )
  let root: unknown
  try {
    root = JSON.parse(text)
  } catch (_error) {
    // A truncated or non-JSON file is not runner data at all: say malformed, never zero failures.
    return unusable('malformed', path, 'the report file is not valid JSON (it may be truncated)')
  }
  const report = asRecord(root)
  if (report === null) return unusable('malformed', path, 'the report is not a JSON object')

  const rawStats = asRecord(report.stats)
  const expected = rawStats === null ? null : asNumber(rawStats.expected)
  const skipped = rawStats === null ? null : asNumber(rawStats.skipped)
  const unexpected = rawStats === null ? null : asNumber(rawStats.unexpected)
  const flaky = rawStats === null ? null : asNumber(rawStats.flaky)
  const durationMs = rawStats === null ? null : asNumber(rawStats.duration)
  const stats =
    expected === null ||
    skipped === null ||
    unexpected === null ||
    flaky === null ||
    durationMs === null
      ? null
      : { expected, skipped, unexpected, flaky, durationMs }

  const suites = Array.isArray(report.suites) ? report.suites : null
  const errors = Array.isArray(report.errors) ? report.errors.length : 0
  if (suites === null)
    return unusable('partial', path, 'the report carries no suite tree (the run was cut short)')

  // Every spec under every project, with the describe titles that lead to it. The report's
  // top-level entries are FILE suites — their title is the file path the spec's own `file` already
  // carries — so that level is not part of a test's title path.
  const specs: Array<{ spec: Record<string, unknown>; titlePath: string[] }> = []
  for (const entry of suites) {
    const suite = asRecord(entry)
    if (suite !== null) specsIn(suite, [], specs, true)
  }

  const failures: PlaywrightReportTest[] = []
  for (const { spec, titlePath } of specs) {
    const specTitle = asString(spec.title) ?? ''
    const file = asString(spec.file) ?? ''
    const line = asNumber(spec.line) ?? 0
    const column = asNumber(spec.column) ?? 0
    const specId = asString(spec.id)
    const tests = Array.isArray(spec.tests) ? spec.tests : []
    for (const entry of tests) {
      const test = asRecord(entry)
      if (test === null) continue
      const status = asString(test.status) ?? ''
      const results = Array.isArray(test.results) ? test.results : []
      if (!isFailingTest(status, results)) continue
      const evidence = evidenceAttempt(results)
      const titles = [...titlePath, specTitle].filter((part) => part !== '')
      failures.push({
        id: specId,
        project: asString(test.projectName),
        file: boundedPath(file),
        line,
        column,
        titlePath: titles.map(boundedTitle),
        title: boundedTitle(specTitle),
        status,
        attempts: results.length,
        retry: evidence === null ? 0 : (asNumber(evidence.result.retry) ?? evidence.index),
        durationMs: evidence === null ? 0 : (asNumber(evidence.result.duration) ?? 0),
        error: evidence === null ? null : errorOf(evidence.result, sanitize),
        attachments: evidence === null ? [] : attachmentsOf(evidence.result),
      })
    }
  }

  const omittedFailures = Math.max(0, failures.length - MAX_REPORTED_FAILURES)
  // The runner's tally and its own tree must agree. A record whose stats name more failures than
  // the tree lists is not a whole record — a truncated write, a merged or hand-edited file — and
  // must not be read as complete just because both fields parsed. The bound this module applies is
  // counted in `omittedFailures`, so it is compared against the list BEFORE the cap.
  const namedFailures = stats === null ? null : stats.unexpected + stats.flaky
  const treeShort = namedFailures !== null && failures.length < namedFailures
  // Playwright's own global errors mean the run did not walk everything it planned to (a config
  // error, a worker crash): the per-test entries that did parse are still the runner's own.
  const status: PlaywrightReportStatus =
    stats === null || errors > 0 || treeShort ? 'partial' : 'complete'
  const reason =
    stats === null
      ? 'the report carries no run stats'
      : errors > 0
        ? `the run reported ${errors} error(s) of its own`
        : treeShort
          ? `the run’s stats name ${namedFailures} failing test(s) but its tree lists ${failures.length}`
          : undefined
  return {
    status,
    path,
    ...(reason === undefined ? {} : { reason }),
    stats,
    failures: failures.slice(0, MAX_REPORTED_FAILURES),
    omittedFailures,
  }
}

/**
 * The report path a command was launched with, when it is the one this platform sets.
 *
 * Read back from the launched script (and from a completed task's own command) so a record written
 * before an API restart is still found: the path is the task's own id derived by
 * {@link playwrightReportPathFor}, never a path parsed out of the executor's command.
 *
 * @param command - The command as it was launched.
 * @param expectedPath - The one path this task's report may be at.
 * @returns True when the command sets {@link PLAYWRIGHT_REPORT_ENV} to that exact path.
 */
export function commandWritesReportTo(command: string, expectedPath: string): boolean {
  const quoted = new RegExp(
    `(?:^|[\\s;])${PLAYWRIGHT_REPORT_ENV}=(['"]?)${escapeRegExp(expectedPath)}\\1(?:[\\s;]|$)`,
  )
  return quoted.test(command)
}

/**
 * The report file a background task's own scratch files live beside.
 *
 * Derived from the task id, never from the command: the id is unique per launch, so two runs can
 * never read one another's report, and the path survives a process restart the same way the task's
 * log and exit file do.
 *
 * @param taskId - The `mol-bg-…` handle the launch returned.
 * @returns The report file's absolute path.
 */
export function playwrightReportPathFor(taskId: string): string {
  return `/tmp/${taskId}${PLAYWRIGHT_REPORT_SUFFIX}`
}

/** A string with every regular-expression metacharacter escaped. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
