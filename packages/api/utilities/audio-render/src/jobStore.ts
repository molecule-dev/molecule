/**
 * In-process job registry for {@link RenderJob} state.
 *
 * The queue bond owns the *messages*; this map owns the *render-side*
 * status & timestamps so consumers can poll without dragging additional
 * persistence into the package. Apps that need durable status should
 * sink job updates into their own storage from the worker — this map is
 * intentionally process-local.
 *
 * @module
 */

import type { RenderJob } from './types.js'

const jobs = new Map<string, RenderJob>()

/**
 * Register a freshly-enqueued job.
 *
 * @param job - The job descriptor returned by `renderAudio`.
 */
export const registerJob = (job: RenderJob): void => {
  jobs.set(job.id, job)
}

/**
 * Look up a job by id.
 *
 * @param jobId - The job id to retrieve.
 * @returns The job, or `undefined` if no such id has been registered.
 */
export const getJob = (jobId: string): RenderJob | undefined => {
  return jobs.get(jobId)
}

/**
 * Apply an in-place patch to a registered job. No-op if the id is unknown.
 *
 * @param jobId - The job id to update.
 * @param patch - Partial fields to merge into the job descriptor.
 * @returns The updated job, or `undefined` if no such id was registered.
 */
export const updateJob = (jobId: string, patch: Partial<RenderJob>): RenderJob | undefined => {
  const job = jobs.get(jobId)
  if (!job) return undefined
  Object.assign(job, patch)
  return job
}

/**
 * Drop all registered jobs — for tests.
 */
export const resetJobStore = (): void => {
  jobs.clear()
}

/**
 * Snapshot of all currently-registered job ids — for diagnostics and tests.
 */
export const listJobIds = (): string[] => {
  return Array.from(jobs.keys())
}
