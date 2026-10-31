/**
 * Durable ownership records for Fly create attempts.
 *
 * The bond owns provisioning and reconciliation; the application owns durable
 * storage. Every write is recorded before Fly is called, so a lost response is
 * still represented by an attempt that a later reconciler can settle.
 *
 * @module
 */

/** Durable lifecycle state; only failed/abandoned attempts are automatically reclaimed. */
export type FlyCreateAttemptState = 'creating' | 'serving' | 'failed' | 'abandoned'

/** A volume name generated for one attempt, or an existing durable workspace. */
export interface FlyCreateVolumeIntent {
  name: string
  /** Once bound, only explicit sandbox destruction may delete this volume. */
  workspace: boolean
}

/** An address on another Fly app which must be released before forgetting intent. */
export interface FlyCreateAddressIntent {
  targetApp: string
  network: string
  ip?: string
  /** True only after Fly returned this allocation to this attempt. */
  owned: boolean
  /** False while a lost response leaves allocation ownership unknown. */
  resolved: boolean
}

/** The complete durable responsibility for one create attempt. */
export interface FlyCreateAttempt {
  attemptId: string
  projectId: string
  appName: string
  state: FlyCreateAttemptState
  sandboxId?: string
  volumes: FlyCreateVolumeIntent[]
  addresses: FlyCreateAddressIntent[]
}

/** Application-supplied durable journal used by create and its reconciler. */
export interface FlyCreateAttemptJournal {
  begin(
    attempt: Pick<FlyCreateAttempt, 'attemptId' | 'projectId' | 'appName'> & {
      ownerProjectId?: string
    },
  ): Promise<void>
  recordVolume(attemptId: string, volume: FlyCreateVolumeIntent): Promise<void>
  markVolumeWorkspace(attemptId: string, name: string, workspace?: boolean): Promise<void>
  recordAddress(attemptId: string, address: FlyCreateAddressIntent): Promise<void>
  markState(attemptId: string, state: FlyCreateAttemptState, sandboxId?: string): Promise<void>
  /** Failed/abandoned attempts, plus creating attempts whose updatedAt is at/before cutoff. */
  reclaimable(cutoff: Date): Promise<FlyCreateAttempt[]>
  /** Acquire the same lifecycle lock the application uses for create/destroy. */
  withLock?<T>(attempt: FlyCreateAttempt, body: (signal: AbortSignal) => Promise<T>): Promise<T>
  forget(attemptId: string): Promise<void>
}

/** Attempts forgotten after completed cleanup, and attempts retained after errors. */
export interface FlyCreateReconcileSummary {
  deleted: number
  failed: number
}

/** Fly-specific lifecycle capabilities exposed by the provider. */
export interface FlyCreateAttemptProvider {
  reconcileCreateAttempts(options?: {
    now?: number
    createTimeoutMs?: number
    /** False only when the caller already holds every matching lifecycle lock. */
    lock?: boolean
  }): Promise<FlyCreateReconcileSummary>
}
