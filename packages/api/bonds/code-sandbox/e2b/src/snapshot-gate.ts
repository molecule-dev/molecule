/**
 * Hold new SDK calls while this process snapshots the same sandbox.
 *
 * E2B briefly pauses a sandbox during createSnapshot. Calls already in flight
 * are never replayed: their commands may already have run. This is a local
 * coordination gate, not a cross-process lock.
 *
 * @module
 */

/** The current snapshot for each sandbox, settled without rejecting. */
const inFlight = new Map<string, Promise<void>>()
/** Bound time spent waiting, without pretending an unfinished snapshot ended. */
const SNAPSHOT_WAIT_MS = 60_000

/**
 * Wait for this process's snapshots, with a bounded caller wait. A timeout
 * rejects only this caller: the gate stays closed until the actual work settles.
 *
 * @param sandboxId - The sandbox about to be called.
 * @returns Resolves once its snapshots have settled, or rejects after one minute.
 */
export function snapshotsSettled(sandboxId: string): Promise<void> {
  return afterSnapshots(sandboxId, async () => {})
}

/**
 * Bound a snapshot operation or queue wait without cancelling the actual work.
 *
 * @param sandboxId - The sandbox whose snapshot is awaited.
 * @param wait - Waits for the operation or gate.
 * @returns The result, or a timeout error after one minute.
 */
async function boundedWait<T>(
  sandboxId: string,
  wait: (timeout: Promise<never>) => Promise<T>,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for snapshot of sandbox ${sandboxId}`))
    }, SNAPSHOT_WAIT_MS)
  })
  try {
    return await wait(timeout)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Issue a call in the same turn as the final gate check. Returning an SDK handle
 * from an async check leaves a microtask gap in which a snapshot can start.
 *
 * @param sandboxId - The sandbox about to be called.
 * @param call - Issues the SDK request without an intervening await.
 * @returns The call's result, with errors propagated unchanged.
 */
export async function afterSnapshots<T>(sandboxId: string, call: () => Promise<T>): Promise<T> {
  if (!inFlight.has(sandboxId)) return call()
  // Bound only the queue wait: normal SDK requests retain
  // their own timeout and error behavior, rather than inherit a snapshot budget.
  let result!: Promise<T>
  await boundedWait(sandboxId, async (timeout) => {
    for (let pending = inFlight.get(sandboxId); pending; pending = inFlight.get(sandboxId)) {
      await Promise.race([pending, timeout])
    }
    // No await between the final check and SDK invocation.
    result = call()
    // Observe immediately even when the request rejects before this continuation resumes.
    void result.catch((_error: unknown) => {
      // The original result below propagates this rejection to the caller.
    })
  })
  return result
}

/**
 * Serialize snapshots of one sandbox and hold its new calls until work settles.
 * The callback must use the SDK directly, rather than wait on its own gate.
 *
 * @param sandboxId - The sandbox being snapshotted.
 * @param take - Starts validation and the snapshot.
 * @returns The snapshot's result, with its rejection propagated unchanged.
 */
export function withSnapshotGate<T>(sandboxId: string, take: () => Promise<T>): Promise<T> {
  return afterSnapshots(sandboxId, () => {
    const work = Promise.resolve().then(take)
    const settled = work.then(
      () => undefined,
      (_error: unknown) => {
        // The caller receives the rejection through work; waiters only need its completion.
      },
    )
    inFlight.set(sandboxId, settled)
    void settled.then(() => {
      if (inFlight.get(sandboxId) === settled) inFlight.delete(sandboxId)
    })
    return boundedWait(sandboxId, (timeout) => Promise.race([work, timeout]))
  })
}
