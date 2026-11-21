/**
 * The deadline a case's steps run under, so a case that hangs still tears its component down.
 *
 * At its timeout Vitest abandons a test and moves on; the code after the `await` the test hung
 * on never runs, and that includes the runner's `finally`, which unmounts the component and
 * disposes its app. A case whose step never settles (a component awaiting work that no step
 * answers) therefore left its component mounted. It kept answering the page's events and
 * logging through the shared logger bond, and every later case recorded those calls as its own
 * (2026-11-21: seven hung Angular `queue:` cases each put a `logger.debug` into every later case
 * that dispatched a window `focus`). Racing the steps against a deadline a little before the
 * test's own timeout fails the case first, naming the step that hung, and the runner's
 * `finally` then tears down as after any other failure.
 *
 * @module
 */

import { getCurrentTest } from 'vitest/suite'

/** The real clock and timers, read before any case installs fake ones (`vi.useFakeTimers`). */
const realNow = Date.now
const realSetTimeout = globalThis.setTimeout
const realClearTimeout = globalThis.clearTimeout

/** The longest time kept back from a test's timeout for the teardown after a hung case. */
const TEARDOWN_MARGIN_MS = 5_000

/** Where a case's steps have got to, shared between the steps and their deadline. */
export interface CaseProgress {
  /** The part of the case running now (`the mount flush`, `step 3 (click)`), for the failure. */
  at: string
  /**
   * Set once the deadline passed. The steps stop at the next step boundary: their component is
   * torn down, so a step that settles late has nothing left to act on.
   */
  abandoned: boolean
}

/**
 * How long a case's steps may still run in the current test: until its timeout less the
 * teardown margin (at most a fifth of the timeout), counted from when the test started.
 *
 * @returns The milliseconds left (at least 0), or `null` outside a test or for a test with no
 *   timeout.
 */
export function caseStepsDeadlineMs(): number | null {
  const test = getCurrentTest()
  const timeout = test?.timeout
  if (!timeout || timeout <= 0) return null
  const started = test.result?.startTime ?? realNow()
  const end = started + timeout - Math.min(TEARDOWN_MARGIN_MS, timeout / 5)
  return Math.max(0, end - realNow())
}

/**
 * Runs a case's steps, and fails the case when they have not settled by the deadline, so the
 * caller's `finally` still unmounts and disposes the component.
 *
 * @param name - The case name, for the failure.
 * @param steps - The case's steps. They set `progress.at` as they go and stop once
 *   `progress.abandoned` is set.
 * @param deadlineMs - Milliseconds the steps may run, or `null` for no deadline;
 *   {@link caseStepsDeadlineMs} by default.
 * @returns Once the steps settle.
 */
export async function withinCaseDeadline(
  name: string,
  steps: (progress: CaseProgress) => Promise<void>,
  deadlineMs: number | null = caseStepsDeadlineMs(),
): Promise<void> {
  const progress: CaseProgress = { at: 'the mount flush', abandoned: false }
  if (deadlineMs === null) return steps(progress)
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = realSetTimeout(() => {
      progress.abandoned = true
      reject(
        new Error(
          `conformance: "${name}" hung at ${progress.at}: it had not settled ${deadlineMs} ms in, ` +
            "before the test's timeout, so the case was torn down. A step awaits work that " +
            'nothing in the case answers.',
        ),
      )
    }, deadlineMs)
  })
  try {
    // `race` subscribes to the steps too, so a rejection they reach after the deadline is handled.
    await Promise.race([steps(progress), deadline])
  } finally {
    realClearTimeout(timer)
  }
}
