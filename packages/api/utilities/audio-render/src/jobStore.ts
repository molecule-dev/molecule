/**
 * Job-status registry for {@link RenderJob} state, with a pluggable backend.
 *
 * The queue bond owns the *messages*; this store owns the *render-side*
 * status & timestamps so consumers can poll without dragging additional
 * persistence into the package.
 *
 * **Process-local by default.** The default backend is an in-memory `Map`
 * ({@link createInMemoryAudioJobStore}). It only bridges `renderAudio` and the
 * worker when BOTH run in the same process (true with the memory queue bond).
 * With a distributed queue bond and a separate worker process, the enqueuing
 * process's `getRenderStatus` never observes the worker's transitions — see
 * {@link setAudioJobStore} to inject a store shared across both processes, or
 * persist durable status from the worker's `onJobComplete` callback.
 *
 * @module
 */

import type { RenderJob } from './types.js'

/**
 * Backend contract for render-job status. All operations are synchronous to
 * keep `getRenderStatus` / `cancelRender` synchronous (their public shape).
 * A backend shared across processes (to fix the split-process topology) must
 * therefore be a synchronous façade over the shared storage.
 */
export interface AudioJobStore {
  /** Register a freshly-enqueued job. */
  register(job: RenderJob): void
  /** Look up a job by id, or `undefined` if unknown to this store. */
  get(jobId: string): RenderJob | undefined
  /** Merge a partial patch into an existing job. No-op (returns `undefined`) if unknown. */
  update(jobId: string, patch: Partial<RenderJob>): RenderJob | undefined
  /** Drop all jobs — primarily for tests. */
  reset(): void
  /** Snapshot of all registered job ids — for diagnostics and tests. */
  ids(): string[]
}

/**
 * The default in-memory {@link AudioJobStore}, backed by a `Map`.
 * Process-local — a restart loses state.
 *
 * @returns A fresh in-memory store.
 */
export const createInMemoryAudioJobStore = (): AudioJobStore => {
  const jobs = new Map<string, RenderJob>()
  return {
    register(job) {
      jobs.set(job.id, job)
    },
    get(jobId) {
      return jobs.get(jobId)
    },
    update(jobId, patch) {
      const job = jobs.get(jobId)
      if (!job) return undefined
      Object.assign(job, patch)
      return job
    },
    reset() {
      jobs.clear()
    },
    ids() {
      return Array.from(jobs.keys())
    },
  }
}

let activeStore: AudioJobStore = createInMemoryAudioJobStore()

/**
 * Return the active job store. Defaults to the in-memory store.
 *
 * @returns The active {@link AudioJobStore}.
 */
export const getAudioJobStore = (): AudioJobStore => activeStore

/**
 * Replace the active job store. Wire a shared, cross-process backend here (in
 * BOTH the enqueuing process and the worker process) so `getRenderStatus`
 * observes the worker's transitions in a split-process queue topology. Pass
 * `undefined` to reset to a fresh in-memory store — primarily for tests.
 *
 * @param store - The store to use, or `undefined` to reset to in-memory.
 */
export const setAudioJobStore = (store: AudioJobStore | undefined): void => {
  activeStore = store ?? createInMemoryAudioJobStore()
}

/**
 * Register a freshly-enqueued job in the active store.
 *
 * @param job - The job descriptor returned by `renderAudio`.
 */
export const registerJob = (job: RenderJob): void => {
  getAudioJobStore().register(job)
}

/**
 * Look up a job by id in the active store.
 *
 * @param jobId - The job id to retrieve.
 * @returns The job, or `undefined` if no such id has been registered.
 */
export const getJob = (jobId: string): RenderJob | undefined => {
  return getAudioJobStore().get(jobId)
}

/**
 * Apply an in-place patch to a registered job. No-op if the id is unknown.
 *
 * @param jobId - The job id to update.
 * @param patch - Partial fields to merge into the job descriptor.
 * @returns The updated job, or `undefined` if no such id was registered.
 */
export const updateJob = (jobId: string, patch: Partial<RenderJob>): RenderJob | undefined => {
  return getAudioJobStore().update(jobId, patch)
}

/**
 * Drop all registered jobs — for tests.
 */
export const resetJobStore = (): void => {
  getAudioJobStore().reset()
}

/**
 * Snapshot of all currently-registered job ids — for diagnostics and tests.
 */
export const listJobIds = (): string[] => {
  return getAudioJobStore().ids()
}
