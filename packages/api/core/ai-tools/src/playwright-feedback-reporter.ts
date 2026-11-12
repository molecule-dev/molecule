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
  onTestEnd(test, result) {
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
    if (process.env.MOL_TEST_FEEDBACK_EVENTS) fs.appendFileSync(process.env.MOL_TEST_FEEDBACK_EVENTS,
      JSON.stringify({spec: location.file, line: location.line, error: error.slice(0, 6000), rendered}) + '\n');
  }
};`
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
