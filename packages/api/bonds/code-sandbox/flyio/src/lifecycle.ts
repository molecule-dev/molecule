/**
 * Durable ownership records for Fly create attempts.
 *
 * The bond owns provisioning and reconciliation; the application owns durable
 * storage. Every write is recorded before Fly is called, so a lost response is
 * still represented by an attempt that a later reconciler can settle.
 *
 * Rollout rule: a journal-aware writer that ignores provenance must never run
 * beside this code. Pre-journal providers that delete listed Machines are also
 * unsafe beside it; durable journals fence new creates until those writers drain.
 *
 * @module
 */

/** Durable lifecycle state; only failed/abandoned attempts are automatically reclaimed. */
export type FlyCreateAttemptState = 'creating' | 'serving' | 'failed' | 'abandoned'

/** A volume name generated for one attempt, or an existing durable workspace. */
export interface FlyCreateVolumeIntent {
  /** Fly's resource ID. Once known, this—not the name—is the ownership key. */
  id?: string
  /** The current Fly name, unique for a newly-created attempt volume. */
  name: string
  /** Caller-level workspace identity, stable across create attempts. */
  logicalName?: string
  /** Once bound, only explicit destruction or a reference-checked failed-create sweep may delete it. */
  workspace: boolean
  /** False until an ambiguous create is adopted or definitely rejected. */
  resolved?: boolean
  /** Recorded before this attempt's create POST; automatic deletion also requires a resolved Fly ID. */
  createdByAttemptId?: string
  /** Recorded when this attempt adopted an existing/listed volume; never automatic-delete authority. */
  adoptedByAttemptId?: string
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
  /** Monotonic fencing token, incremented whenever lifecycle ownership is reacquired. */
  generation?: number
  sandboxId?: string
  /** Fly definitively rejected the Machine POST; an unknown outcome is never marked. */
  machineCreateFailed?: boolean
  /** The exact Machine ID returned by this attempt's accepted POST response. */
  machineId?: string
  /** Accepted-POST provenance; name, metadata, sandboxId and adoption never supply it. */
  machineCreatedByAttemptId?: string
  /** This attempt's app-create intent, recorded before the POST. */
  appCreatedByAttemptId?: string
  /** True only when the app POST itself was accepted; a pending/unknown create cannot be deleted. */
  appCreateResolved?: boolean
  /** True when explicit destruction identity-validated and adopted a pre-journal Machine. */
  machineAdopted?: boolean
  volumes: FlyCreateVolumeIntent[]
  addresses: FlyCreateAddressIntent[]
}

/**
 * Application-supplied durable journal used by create and its reconciler.
 * A journal-aware writer that ignores provenance must never run beside this
 * contract; {@link assertCreateAllowed} is the durable rollout boundary.
 */
export interface FlyCreateAttemptJournal {
  begin(
    attempt: Pick<FlyCreateAttempt, 'attemptId' | 'projectId' | 'appName'> & {
      ownerProjectId?: string
      /** Legacy adoption persists its observed serving state and identity in the INSERT. */
      state?: FlyCreateAttemptState
      sandboxId?: string
      machineAdopted?: boolean
    },
  ): Promise<void>
  /** Refuse provisioning until pre-journal and provenance-ignoring writers have drained. */
  assertCreateAllowed(): Promise<void>
  /** Re-read one attempt, including after a lifecycle lock has been acquired. */
  get(attemptId: string): Promise<FlyCreateAttempt | null>
  /** Re-read every durable attempt for an app, including creating/serving attempts. */
  forApp(appName: string): Promise<FlyCreateAttempt[]>
  /** Find the durable workspace binding for a logical caller workspace. */
  findWorkspace(projectId: string, logicalName: string): Promise<FlyCreateVolumeIntent | null>
  /** Record app-create intent/acceptance, or clear it when the app was adopted. */
  recordAppProvenance(
    attemptId: string,
    generation: number,
    outcome: 'pending' | 'created' | 'adopted',
  ): Promise<void>
  /** Record an intent or transfer a Fly-ID binding to this attempt. */
  recordVolume(attemptId: string, volume: FlyCreateVolumeIntent): Promise<void>
  markVolumeWorkspace(attemptId: string, name: string, workspace?: boolean): Promise<void>
  recordAddress(attemptId: string, address: FlyCreateAddressIntent): Promise<void>
  markState(attemptId: string, state: FlyCreateAttemptState, sandboxId?: string): Promise<void>
  /** Record that explicit destruction adopted this pre-journal Machine. */
  markMachineAdopted(attemptId: string): Promise<void>
  /** Record only the exact ID from this generation's accepted Machine POST response. */
  recordMachineProvenance(attemptId: string, generation: number, machineId: string): Promise<void>
  /** Record a definitive rejection only while this create generation still owns the attempt. */
  markMachineCreateFailed(attemptId: string, generation: number): Promise<void>
  /** Throw unless this generation is still the attempt's durable fencing token. */
  assertGeneration(attemptId: string, generation: number): Promise<void>
  /** Atomically retire this exact generation while its lifecycle lock session is live. */
  retire(attemptId: string, generation: number): Promise<void>
  /** Re-authorize one destructive request against the retired row on the lock session. */
  authorizeDestruction(attemptId: string, generation: number): Promise<void>
  /** Failed/abandoned attempts, plus creating attempts whose updatedAt is at/before cutoff. */
  reclaimable(cutoff: Date): Promise<FlyCreateAttempt[]>
  /** Acquire the same lifecycle lock the application uses for create/destroy. */
  withLock?<T>(
    attempt: FlyCreateAttempt,
    body: (signal: AbortSignal, generation: number) => Promise<T>,
  ): Promise<T>
  forget(attemptId: string, generation?: number): Promise<void>
}

/** Attempts forgotten after completed cleanup, and attempts retained after errors. */
export interface FlyCreateReconcileSummary {
  deleted: number
  failed: number
}

/** Fly-specific lifecycle capabilities exposed by the provider. */
export interface FlyCreateAttemptProvider {
  /** Explicit retirement is fenced by the caller's live lifecycle lock. */
  destroy(id: string, signal: AbortSignal): Promise<void>
  /** Deliberately retire exact recorded resources for one shared-app attempt. */
  destroyAttempt(attemptId: string, signal: AbortSignal): Promise<void>
  /** Per-project app retirement is fenced by the caller's live lifecycle lock. */
  destroyApp(
    projectId: string,
    expectedAppName: string | undefined,
    signal: AbortSignal,
  ): Promise<void>
  reconcileCreateAttempts(options?: {
    now?: number
    createTimeoutMs?: number
    /** Restrict a pass to one durable attempt. Every attempt is still locked. */
    attemptId?: string
  }): Promise<FlyCreateReconcileSummary>
}
