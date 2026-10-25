/**
 * Publish pacing policy, shared by the paced publisher and the release's own
 * progress estimate.
 *
 * npm rate-limits fleet publishes, so `publish-paced.mjs` sleeps a configured
 * number of seconds after every package it publishes. The release spends that
 * wall clock inside its `publish` stage while it watches the Release workflow,
 * so its "how long should this take" hint has to know the same pacing —
 * otherwise 217 packages at 20 s pacing (72 minutes of deliberate waiting on
 * its own) reads as over-running a 12-minute estimate.
 *
 * One source for the default, consumed by both sides: the publisher takes its
 * `--delay`/`MOL_PUBLISH_DELAY` fallback from here, and the release estimator
 * reads the same environment value through the same function. Side-effect free
 * on purpose — importing this must never publish, claim or spawn anything.
 *
 * @module
 */

/**
 * Seconds between publishes when neither `--delay` nor `MOL_PUBLISH_DELAY` says
 * otherwise. npm's guidance after a rate-limit cooldown is small,
 * single-threaded batches with generous spacing; this is that spacing.
 */
export const DEFAULT_PUBLISH_DELAY_S = 20

/**
 * The pace an environment value configures, using the publisher's existing
 * fallback rule: `Number(value) || default`. A blank input (the Release
 * workflow's default), `"0"` and a non-number therefore all mean the default.
 *
 * @param value - Raw `MOL_PUBLISH_DELAY` text, or undefined.
 * @returns Seconds between publishes.
 */
export function envPublishDelaySeconds(value) {
  return Number(value) || DEFAULT_PUBLISH_DELAY_S
}

/**
 * Wall-clock minutes the publish stage needs for `pending` packages at
 * `delaySeconds` pacing, never below the stage's normal estimate.
 *
 * The publisher sleeps once per package it publishes, so the pacing term is
 * `pending × delay`; a wave too small to outlast the stage's normal estimate
 * keeps that estimate. The delay is a CONFIGURED fact, never an observed
 * average — nothing here measures how fast earlier publishes ran.
 *
 * @param options - Estimate inputs.
 * @param options.pending - Packages this run will publish.
 * @param options.delaySeconds - Configured pause between publishes.
 * @param options.baseMinutes - The stage's normal estimate in minutes.
 * @returns Estimated minutes for the stage.
 */
export function estimatePublishMinutes({ pending, delaySeconds, baseMinutes }) {
  const count = Number.isFinite(pending) && pending > 0 ? Math.floor(pending) : 0
  const pace = Number.isFinite(delaySeconds) && delaySeconds > 0 ? delaySeconds : 0
  return Math.max(baseMinutes, Math.ceil((count * pace) / 60))
}
