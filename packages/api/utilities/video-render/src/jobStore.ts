/**
 * Pluggable job-status store.
 *
 * Render jobs are queued via the bonded queue provider, but the queue itself
 * does not naturally surface fine-grained progress / completion / failure
 * to callers polling for status. We keep a thin status-store interface that
 * the renderer + worker use to record and read state.
 *
 * The default implementation is in-memory — sufficient for tests, single-node
 * dev work, and simple deployments. Production wiring can swap in a Redis-
 * or database-backed store via {@link setJobStore}.
 *
 * @module
 */

import type { RenderJobStatus } from './types.js'

/**
 * The minimal contract job-status backends must satisfy. All operations are
 * async to allow remote stores (Redis, database, etc.).
 */
export interface JobStore {
  /** Read the latest status snapshot for a job. */
  get(jobId: string): Promise<RenderJobStatus | undefined>
  /** Write/replace the status snapshot for a job. */
  set(jobId: string, status: RenderJobStatus): Promise<void>
  /** Merge partial fields into the existing status (creating it if absent). */
  patch(jobId: string, patch: Partial<RenderJobStatus>): Promise<RenderJobStatus>
  /** Remove a job's status entry. Used by `cancelRender` cleanup. */
  delete(jobId: string): Promise<void>
}

/**
 * In-memory job store backed by a `Map`. Process-local — restart loses state.
 */
export function createMemoryJobStore(): JobStore {
  const data = new Map<string, RenderJobStatus>()
  return {
    async get(jobId) {
      return data.get(jobId)
    },
    async set(jobId, status) {
      data.set(jobId, status)
    },
    async patch(jobId, patch) {
      const next: RenderJobStatus = {
        ...(data.get(jobId) ?? { status: 'queued' }),
        ...patch,
      }
      data.set(jobId, next)
      return next
    },
    async delete(jobId) {
      data.delete(jobId)
    },
  }
}

let activeStore: JobStore = createMemoryJobStore()

/**
 * Returns the currently active job store. Defaults to the in-memory store.
 *
 * @returns The active {@link JobStore}.
 */
export function getJobStore(): JobStore {
  return activeStore
}

/**
 * Replace the active job store. Bond packages (e.g. a Redis-backed store)
 * call this during application startup. Pass `undefined` to reset to the
 * default in-memory store — primarily useful in tests.
 *
 * @param store - The store implementation to use, or `undefined` to reset.
 */
export function setJobStore(store: JobStore | undefined): void {
  activeStore = store ?? createMemoryJobStore()
}
