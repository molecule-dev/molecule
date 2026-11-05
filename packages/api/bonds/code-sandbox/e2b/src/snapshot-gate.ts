/**
 * Hold a sandbox's new calls while this process is snapshotting it.
 *
 * An E2B snapshot (`createSnapshot`, behind `commitTemplate`) briefly pauses the
 * sandbox. A call that reaches E2B during that window is refused with
 * `SandboxNotRunningError: [unavailable] The sandbox was not found` — measured
 * live on 2026-11-05: a loop of `echo ok` commands against one sandbox while one
 * snapshot was taken (1.4 s) lost the two commands that started inside the
 * window, and the scaffold cache's capture made a release check's next command
 * fail the same way. The capture runs detached beside the boot, so without a
 * gate any command, file read or write issued in that second fails.
 *
 * The gate is per sandbox id and per process: every handle for the id waits for
 * the snapshots this process is taking of it before it issues a call. A call
 * already in flight when a snapshot starts is not retried here — a command may
 * already be running, and running it twice is worse than reporting the error.
 *
 * @module
 */

/** The snapshot this process is taking of each sandbox, settled (never rejected). */
const inFlight = new Map<string, Promise<void>>()

/**
 * Wait until no snapshot this process started for the sandbox is in flight.
 *
 * @param sandboxId - The sandbox about to be called.
 * @returns Resolves once every snapshot of it has settled (succeeded or failed).
 */
export async function snapshotsSettled(sandboxId: string): Promise<void> {
  for (let pending = inFlight.get(sandboxId); pending; pending = inFlight.get(sandboxId)) {
    await pending
  }
}

/**
 * Take one snapshot of a sandbox with the gate held: earlier snapshots of the
 * same sandbox finish first, and new calls on it wait until this one settles.
 *
 * @param sandboxId - The sandbox being snapshotted.
 * @param take - Starts the snapshot.
 * @returns The snapshot's own result (its rejection propagates unchanged).
 */
export async function withSnapshotGate<T>(sandboxId: string, take: () => Promise<T>): Promise<T> {
  // Re-checked after every wait: two captures released by the same snapshot must
  // not both start, and nothing between the last check and `set` yields.
  while (inFlight.has(sandboxId)) await snapshotsSettled(sandboxId)
  const work = Promise.resolve().then(take)
  const settled = work.then(
    () => undefined,
    (_error: unknown) => {
      // The caller receives the rejection through `work`; the gate only needs to know it ended.
    },
  )
  inFlight.set(sandboxId, settled)
  void settled.then(() => {
    if (inFlight.get(sandboxId) === settled) inFlight.delete(sandboxId)
  })
  return work
}
