/** The native fields needed from a Playwright step; titles and parameters are deliberately absent. */
export interface PlaywrightTimingStep {
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
  startTime: string
  durationMs: number
  steps: {
    parent: number | null
    category: string
    startTime: string
    durationMs: number
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
  const timeline: PlaywrightAttemptTimings = {
    version: 1,
    startTime: result.startTime.toISOString(),
    durationMs: result.duration,
    steps: [],
    omittedSteps: 0,
  }
  const pending = result.steps.map((step) => ({ step, parent: null as number | null })).reverse()
  while (pending.length) {
    const { step, parent } = pending.pop()!
    const index = timeline.steps.length
    if (index < 2_000) {
      timeline.steps.push({
        parent,
        category: step.category,
        startTime: step.startTime.toISOString(),
        durationMs: step.duration,
        ...(step.location ? { location: { ...step.location } } : {}),
        failed: Boolean(step.error),
      })
    } else timeline.omittedSteps++
    for (let n = step.steps.length - 1; n >= 0; n--)
      pending.push({ step: step.steps[n]!, parent: index < 2_000 ? index : null })
  }
  return timeline
}
