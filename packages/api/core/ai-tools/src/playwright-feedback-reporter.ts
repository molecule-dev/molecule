/**
 * Native Playwright events for incremental background feedback.
 *
 * @module
 */
import { stripVTControlCharacters } from 'node:util'

import type { PlaywrightFeedbackFailure } from './playwright-feedback-types.js'
import { redactSecrets } from './utilities.js'

/**
 * A standard Playwright reporter, placed beside each run's private outputs. It
 * records onTestEnd, so the first exact failure need not wait for the rest of
 * the spec file. No page injection, test rewrite, screenshots or trace overhead.
 * @returns A CommonJS reporter loadable by the project's installed Playwright.
 */
export function feedbackReporterSource(): string {
  return String.raw`
const fs = require('node:fs');
module.exports = class FeedbackReporter {
  onBegin(config, suite) {
    if (!process.env.MOL_TEST_FEEDBACK_EVENTS) return;
    // The selected tests, and the tests of each outermost serial group (describe.serial or
    // describe.configure({mode:'serial'})): those depend on each other and only run together.
    const serial = [];
    const walk = (s) => { if (s._parallelMode === 'serial') { serial.push(s.allTests().map((t) => t.id)); return; } s.suites.forEach(walk); };
    walk(suite);
    fs.appendFileSync(process.env.MOL_TEST_FEEDBACK_EVENTS, JSON.stringify({selected: suite.allTests().map((t) => t.id), serial}) + '\n');
  }
  onTestEnd(test, result) {
    if (!process.env.MOL_TEST_FEEDBACK_EVENTS) return;
    if (result.status === 'passed' && test.expectedStatus === 'passed') {
      fs.appendFileSync(process.env.MOL_TEST_FEEDBACK_EVENTS, JSON.stringify({id: test.id, passed: true}) + '\n');
      return;
    }
    if (result.status === 'skipped') {
      fs.appendFileSync(process.env.MOL_TEST_FEEDBACK_EVENTS, JSON.stringify({id: test.id, skipped: true}) + '\n');
      return;
    }
    if (result.status === test.expectedStatus || !['failed','timedOut'].includes(result.status)) return;
    const errors = result.errors || [];
    const error = errors.map(e => e.message || '').join('\n');
    const location = [...errors].reverse().find(e => e.location)?.location || test.location;
    const attachment = result.attachments.find(a => a.name === 'error-context' && a.path);
    let rendered;
    if (attachment) try {
      const text = fs.readFileSync(attachment.path, 'utf8');
      const fence = String.fromCharCode(96).repeat(3);
      const yaml = text.split(fence + 'yaml\n')[1];
      if (yaml) rendered = yaml.split(fence)[0].trim().slice(0, 2000);
      else {
        const section = text.split('# Page snapshot')[1];
        if (section) rendered = section.split(fence)[1]?.split('\n').slice(1).join('\n').trim().slice(0, 2000);
      }
    } catch {}
    fs.appendFileSync(process.env.MOL_TEST_FEEDBACK_EVENTS,
      JSON.stringify({id: test.id, spec: location.file, line: location.line, error: error.slice(0, 6000), rendered}) + '\n');
  }
};`
}

/** What the reporter saw of one run, by test id (`TestCase.id`, the form `--last-failed` reads). */
export interface NativeTestOutcomes {
  /** Tests that ended failed, in the order they ended. */
  failed: string[]
  /** Tests that ended passed, in the order they ended. */
  passed: string[]
  /** Tests that ended skipped: self-skipped, or not run after a serial group's failure. */
  skipped: string[]
  /** Every test the run selected, once it started; undefined before that. */
  selected?: string[]
  /** Each outermost serial group the run selected: its tests run only together. */
  serial: string[][]
}

const testId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 200

/**
 * The ids of the tests the reporter saw end, by outcome, in the form Playwright's own last-run
 * record (`.last-run.json` `failedTests`) uses, so a run stopped before it finished still says
 * which tests failed and which passed, and which of its selected tests never ended.
 * @param text - Reporter JSONL; an incomplete final line waits for the next read.
 * @returns Distinct test ids per outcome, in the order the tests ended, and the run's selection.
 */
export function nativeTestOutcomes(text: string): NativeTestOutcomes {
  const failed = new Set<string>()
  const passed = new Set<string>()
  const skipped = new Set<string>()
  let selected: string[] | undefined
  let serial: string[][] = []
  if (text.length > 1_000_000) return { failed: [], passed: [], skipped: [], serial: [] }
  for (const line of text.split('\n').slice(0, -1)) {
    try {
      const event = JSON.parse(line) as {
        id?: unknown
        passed?: unknown
        skipped?: unknown
        error?: unknown
        selected?: unknown
        serial?: unknown
      }
      if (Array.isArray(event.selected)) {
        selected = event.selected.filter(testId).slice(0, 1000)
        serial = Array.isArray(event.serial)
          ? event.serial
              .filter((group): group is unknown[] => Array.isArray(group))
              .map((group) => group.filter(testId).slice(0, 1000))
              .filter((group) => group.length > 1)
          : []
        continue
      }
      if (!testId(event.id)) continue
      if (event.passed === true) passed.add(event.id)
      else if (event.skipped === true) skipped.add(event.id)
      else if (typeof event.error === 'string') failed.add(event.id)
    } catch (_error) {
      /* not a completed native event */
    }
  }
  return {
    failed: [...failed],
    passed: [...passed],
    skipped: [...skipped],
    ...(selected ? { selected } : {}),
    serial,
  }
}

/**
 * Read native failure events; incomplete final lines wait for the next read.
 * @param text - Reporter JSONL, not runner-log inference.
 * @param sourceFiles - Triggering source files from the scheduler.
 * @returns Every completed native test failure, redacted and bounded.
 */
export function nativeFeedbackFailures(
  text: string,
  sourceFiles: string[],
): PlaywrightFeedbackFailure[] {
  const out: PlaywrightFeedbackFailure[] = []
  if (text.length > 1_000_000) return out
  for (const line of text.split('\n').slice(0, -1)) {
    try {
      const event = JSON.parse(line) as {
        spec?: unknown
        line?: unknown
        error?: unknown
        rendered?: unknown
      }
      if (
        typeof event.spec !== 'string' ||
        typeof event.line !== 'number' ||
        typeof event.error !== 'string'
      )
        continue
      const error = redactSecrets(stripVTControlCharacters(event.error).slice(0, 6_000))
      const locator =
        /(?:Locator:\s*|waiting for )(locator\([^\n]+|getBy[^\n]+)/.exec(error)?.[1] ??
        /strict mode violation: ([^\n]+)/.exec(error)?.[1] ??
        /(?:^|\n)((?:Error: )?expect\([^\n]+|AssertionError:[^\n]+)/.exec(error)?.[1] ??
        // Navigation waits can expire before the overall test budget. They have no
        // locator, but still carry the native operation, test line and page snapshot.
        /(?:^|\n)TimeoutError: ((?:page|locator)\.[\w.]+): Timeout \d+ms exceeded\./.exec(
          error,
        )?.[1] ??
        // A UI loop can exhaust the test budget between actions. Playwright then names
        // page.waitForTimeout/locator.count rather than a locator. That is still the
        // supplied test's real failure, with its native location and page snapshot.
        (/Test timeout of \d+ms exceeded\./.test(error)
          ? /(?:^|\n)Error: ((?:page|locator)\.[\w.]+):/.exec(error)?.[1]
          : undefined)
      // A native failed-test event is evidence even when an exception has no locator.
      // Keep its own first error line rather than hiding it as runner unavailability.
      const operation = locator ?? error.split('\n').find((line) => line.trim())
      if (!operation) continue
      out.push({
        spec: event.spec,
        line: event.line,
        error,
        locator: operation,
        ...(typeof event.rendered === 'string' && event.rendered
          ? { rendered: redactSecrets(event.rendered.slice(0, 2000)) }
          : {}),
        sourceFiles,
      })
    } catch (_error) {
      /* not a completed native event */
    }
  }
  return out
}
