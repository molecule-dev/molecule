/** Native action clocks plus the hook title used to locate teardown; titles never enter the output. */
export interface PlaywrightTimingStep {
  /** Native hook title, used only to locate the teardown boundary; never serialized. */
  title?: string
  category: string
  startTime: Date
  duration: number
  location?: { file: string; line: number; column: number }
  error?: unknown
  steps: PlaywrightTimingStep[]
}

/** A bounded timeline of the actions Playwright already recorded for one attempt. */
export interface PlaywrightAttemptTimings {
  version: 1
  startTime: string | null
  durationMs: number
  steps: {
    parent: number | null
    category: string
    startTime: string | null
    /** Native duration, or elapsed time to the attempt cutoff for an unfinished step. */
    durationMs: number | null
    /** The native step never ended. Null duration means its clock cannot establish elapsed time. */
    unfinished?: true
    location?: { file: string; line: number; column: number }
    failed: boolean
  }[]
  omittedSteps: number
}

/**
 * Preserve native action clocks without turning on browser tracing.
 *
 * Call only for a failed attempt, from a reporter's `onTestEnd`. Playwright already holds these
 * steps even with tracing off; this function starts no recorder, reads no browser and changes no
 * runner setting. The result identifies slow actions by source location. It cannot distinguish
 * server, network and browser scheduling inside an action. Titles, arguments and error messages
 * are excluded because they can contain credentials or form values.
 * Unfinished steps use the native After Hooks start as their cutoff when present,
 * otherwise the attempt's end. Inconsistent clocks remain null, never a fabricated zero.
 *
 * Self-contained so execution tools can emit its source into a sandbox reporter.
 * @param result - The native attempt's existing clocks and step tree.
 * @returns At most 2,000 steps in native tree order, with an explicit omitted count.
 */
export function playwrightAttemptTimings(result: {
  startTime: Date
  duration: number
  steps: PlaywrightTimingStep[]
}): PlaywrightAttemptTimings {
  const iso = (date: Date): string | null =>
    Number.isFinite(date.getTime()) ? date.toISOString() : null
  const cutoff =
    result.steps
      .find((step) => step.category === 'hook' && step.title === 'After Hooks')
      ?.startTime.getTime() ?? result.startTime.getTime() + result.duration
  const timeline: PlaywrightAttemptTimings = {
    version: 1,
    startTime: iso(result.startTime),
    durationMs: result.duration,
    steps: [],
    omittedSteps: 0,
  }
  const pending = result.steps.map((step) => ({ step, parent: null as number | null })).reverse()
  while (pending.length) {
    const { step, parent } = pending.pop()!
    const index = timeline.steps.length
    if (index < 2_000) {
      const unfinished = step.duration < 0
      const elapsed = cutoff - step.startTime.getTime()
      timeline.steps.push({
        parent,
        category: step.category,
        startTime: iso(step.startTime),
        durationMs: unfinished
          ? Number.isFinite(elapsed) && elapsed >= 0
            ? elapsed
            : null
          : step.duration,
        ...(unfinished ? { unfinished: true as const } : {}),
        ...(step.location ? { location: { ...step.location } } : {}),
        failed: Boolean(step.error),
      })
    } else timeline.omittedSteps++
    for (let n = step.steps.length - 1; n >= 0; n--)
      pending.push({ step: step.steps[n]!, parent: index < 2_000 ? index : null })
  }
  return timeline
}
