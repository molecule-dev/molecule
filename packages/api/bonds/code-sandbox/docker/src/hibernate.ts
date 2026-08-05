/**
 * Suspend and resume a Docker sandbox, and report which mechanism actually ran.
 *
 * Docker has two, and they are not interchangeable. A CRIU **checkpoint** freezes
 * the whole process tree to disk and restores it; a **stop** does not, and a
 * sandbox that comes back from one is running with nothing in it. Which one is
 * available is a property of the HOST — CRIU needs the daemon's experimental
 * flag and the `criu` package — so the same code path produces different
 * fidelity on different machines, and the caller cannot know which it got.
 *
 * That is why both functions return a {@link HibernationOutcome} instead of
 * `void`. molecule.dev's sandboxes run their dev servers as detached exec
 * processes; after a stop-style wake the container is "running", the preview
 * answers nothing, and `status` says everything is fine. The relaunch that fixes
 * it is only expressible if the resume reports what it did.
 *
 * ## The parameter that is a query parameter
 *
 * Restoring from a checkpoint is `POST /containers/{id}/start?checkpoint=<name>`.
 * The checkpoint name is a QUERY parameter. Passing it in a JSON body — which is
 * an easy and silent mistake, since the daemon accepts the request and starts the
 * container — performs an ordinary cold start while looking exactly like a
 * successful restore.
 *
 * @module
 */

import type { HibernationOutcome } from '@molecule/api-code-sandbox'

import type { DockerRequest } from './request.js'

/** What the hibernation capability needs from the provider. */
export interface HibernateContext {
  request: DockerRequest
  /**
   * Whether this host is believed to support CRIU checkpoints. Owned by the
   * provider and flipped to `false` the first time the daemon says otherwise, so
   * a host without CRIU pays one failed request per process rather than one per
   * hibernation. Mutable state on purpose: the alternative is module-level state
   * that tests cannot reset and two providers cannot hold separately.
   */
  checkpoints: { supported: boolean }
  warn?: (message: string, meta?: Record<string, unknown>) => void
  info?: (message: string, meta?: Record<string, unknown>) => void
}

/**
 * The checkpoint name for a container. Derived, not passed in: it is an
 * implementation detail of this bond's own suspend/resume pair, and a caller that
 * supplied it could only get it wrong.
 *
 * @param containerId - The container id.
 * @returns A stable checkpoint name.
 */
export function checkpointName(containerId: string): string {
  return `mol-hibernate-${containerId.slice(0, 12)}`
}

/**
 * Whether an error means "this host has no CRIU", as opposed to "this checkpoint
 * failed". The former is permanent for the process; the latter is not, and
 * treating it as permanent would silently downgrade every later hibernation.
 *
 * @param message - The error message.
 * @returns `true` when the host does not support checkpointing at all.
 */
function isCheckpointUnsupported(message: string): boolean {
  return /\b501\b|not implemented|not supported|checkpoint.*disabled|experimental/i.test(message)
}

/**
 * Suspend a sandbox, preferring a checkpoint and falling back to a stop.
 *
 * Never fails just because the high-fidelity path is unavailable: a sandbox that
 * cannot be checkpointed must still be suspendable. The outcome reports which
 * one ran.
 *
 * @param ctx - Hibernation context.
 * @param containerId - The sandbox to suspend.
 * @returns What the suspend actually did.
 */
export async function hibernateContainer(
  ctx: HibernateContext,
  containerId: string,
): Promise<HibernationOutcome> {
  let fallbackReason = 'this host does not support CRIU checkpoints'

  if (ctx.checkpoints.supported) {
    try {
      await ctx.request(`/containers/${containerId}/checkpoints`, 'POST', {
        CheckpointID: checkpointName(containerId),
        Exit: true,
      })
      return { processesPreserved: true, mechanism: 'checkpoint' }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (isCheckpointUnsupported(message)) {
        ctx.checkpoints.supported = false
        ctx.info?.(
          'CRIU checkpoints are not available on this host — hibernating by stopping from now on',
          { containerId, error: message },
        )
      } else {
        // A real checkpoint failure, on a host that CAN checkpoint. Do not
        // disable the mechanism for the whole process over one bad attempt, but
        // do not hide it either: every wake after this one costs a full relaunch.
        ctx.warn?.('Checkpoint failed — falling back to stopping the sandbox', {
          containerId,
          error: message,
        })
        fallbackReason = `checkpoint failed: ${message}`
      }
    }
  }

  await ctx.request(`/containers/${containerId}/stop`, 'POST')
  return { processesPreserved: false, mechanism: 'stop', detail: fallbackReason }
}

/**
 * Resume a suspended sandbox, preferring a checkpoint restore.
 *
 * A missing checkpoint is the ROUTINE case — it is what a stop-suspended sandbox
 * looks like — so it falls through quietly. Any other restore failure is logged,
 * because it means every wake on this host is silently taking the slow, empty
 * path.
 *
 * @param ctx - Hibernation context.
 * @param containerId - The sandbox to resume.
 * @returns What the resume actually did.
 */
export async function resumeContainer(
  ctx: HibernateContext,
  containerId: string,
): Promise<HibernationOutcome> {
  const name = checkpointName(containerId)

  if (ctx.checkpoints.supported) {
    try {
      // Query parameter, not a body field — see this module's header.
      await ctx.request(
        `/containers/${containerId}/start?checkpoint=${encodeURIComponent(name)}`,
        'POST',
        undefined,
        120_000,
      )
      // The checkpoint has been consumed; leaving it behind would make the next
      // resume restore a stale process tree.
      await ctx
        .request(`/containers/${containerId}/checkpoints/${name}`, 'DELETE')
        .catch((error: unknown) => {
          ctx.warn?.(
            'Could not delete a consumed checkpoint — the next resume may restore stale state',
            {
              containerId,
              error,
            },
          )
        })
      return { processesPreserved: true, mechanism: 'restore' }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (isCheckpointUnsupported(message)) {
        ctx.checkpoints.supported = false
      } else if (!/no such (checkpoint|file)|does not exist|not found|\b404\b/i.test(message)) {
        ctx.warn?.('Checkpoint restore failed — starting the sandbox cold instead', {
          containerId,
          error: message,
        })
      }
    }
  }

  // 120 s: a first-ever start populates a fresh named volume from the image,
  // which is a multi-gigabyte copy on this fleet's base image.
  await ctx.request(`/containers/${containerId}/start`, 'POST', undefined, 120_000)
  return {
    processesPreserved: false,
    mechanism: 'start',
    detail:
      'started from a stopped state — no process tree was restored, so anything launched inside the sandbox must be relaunched',
  }
}
