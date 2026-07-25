/**
 * The only bundle check that proves an archive is actually recoverable.
 *
 * @module
 */

import { restoreRepo } from './restoreRepo.js'
import type { GitExec } from './types.js'

/**
 * Proves a bundle can be RESTORED, by restoring it.
 *
 * This is the check — the ONLY check — that may precede deleting the source repo
 * a bundle was made from. `verifyBundle` reads the bundle HEADER: it reports
 * "okay" for a bundle truncated to 90% of its bytes and for one with a byte
 * flipped inside the packfile (both measured against real git and pinned by this
 * package's tests). Deleting a source on the strength of that loses the work.
 *
 * A real restore runs index-pack over the packfile: every object is inflated and
 * the pack checksum is recomputed, so both of those corruptions fail here. On
 * success the restored repository is LEFT IN PLACE at `scratchDir` so the caller
 * can compare it against the source (ref set, HEAD sha, file contents) before
 * committing to a deletion — this package never deletes anything, which is
 * rather the point of it.
 *
 * @param exec - The injected git executor.
 * @param bundlePath - Absolute path of the bundle to prove.
 * @param scratchDir - Absolute path to restore into. Must not exist, or must be
 *   empty; the caller owns it and is responsible for removing it afterwards.
 *   Size it for a full checkout of the repo, not for the bundle.
 * @returns True when the bundle restored cleanly; false when anything went
 *   wrong — a corrupt, truncated, missing or non-self-contained bundle, or a
 *   scratch directory that could not be used.
 */
export async function verifyBundleRestorable(
  exec: GitExec,
  bundlePath: string,
  scratchDir: string,
): Promise<boolean> {
  try {
    await restoreRepo(exec, bundlePath, scratchDir)

    return true
  } catch (_error) {
    // Documented noop: the failure IS the answer this function reports, and it
    // must fail closed — anything short of a clean restore means "do not delete
    // the source". The `_` binding marks the discard as deliberate; a caller who
    // wants the reason calls `restoreRepo` directly, which throws with git's own
    // message (index-pack's checksum failure, a missing file, a full disk).
    return false
  }
}
