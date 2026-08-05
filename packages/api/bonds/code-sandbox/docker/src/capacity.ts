/**
 * What this Docker host can still fit.
 *
 * A sandbox is admitted long before it is expensive: creating one populates a
 * fresh volume with a dependency tree, and by the time that fails the host is
 * already out of something and every OTHER sandbox on it is failing too. So the
 * caller wants to refuse the boot while it can still say so cleanly — and to do
 * that it needs a measurement only the provider can take.
 *
 * Three axes, because they run out separately and independently:
 *
 * - **Blocks.** The obvious one.
 * - **Inodes.** A populated `node_modules` is hundreds of thousands of tiny
 *   files. On a filesystem with a fixed inode table this exhausts first, and
 *   every file creation on the host then fails with `ENOSPC` while `df -h`
 *   reports gigabytes free — a failure that looks like nothing else.
 * - **Memory.** Each running sandbox holds a live container resident, and unlike
 *   disk this is NOT reclaimed by idle hibernation on any useful timescale. A
 *   burst of simultaneously-active users oversubscribes the host until the OOM
 *   killer starts choosing victims among sandboxes that were working fine.
 *
 * `MemAvailable` from `/proc/meminfo`, not `os.freemem()`. The kernel's estimate
 * counts reclaimable page cache; `MemFree` does not, and on any warm host it
 * understates free memory badly enough to reject boots the host could serve.
 *
 * **This measures the host THIS PROCESS runs on**, which is only the right host
 * when the daemon is local. Over a TCP endpoint the numbers would describe the
 * wrong machine, so the answer is `inconclusive`-shaped instead: no headroom
 * fields, and a `detail` that says why. Reporting a comfortable local number for
 * a remote daemon is the exact conflation this codebase refuses everywhere else.
 *
 * @module
 */

import type { SandboxCapacity } from '@molecule/api-code-sandbox'

import type { DockerRequest } from './request.js'

/** The subset of `fs.StatsFs` this module uses. */
export interface FilesystemStats {
  /** Block size in bytes. */
  bsize: number
  /** Blocks available to an unprivileged process. */
  bavail: number
  /** Free file nodes, or `-1`/`0` on filesystems without a fixed inode table. */
  ffree: number
}

/** What the capacity capability needs from the provider. */
export interface CapacityContext {
  request: DockerRequest
  /**
   * Whether the daemon is reached over a local unix socket. Only then does this
   * process's filesystem describe the storage the daemon writes to.
   */
  daemonIsLocal: boolean
  /** Filesystem statistics for a path. Injected so this is testable without a disk. */
  statfs: (path: string) => Promise<FilesystemStats>
  /** Available memory in bytes, or `null` when it cannot be read. */
  availableMemoryBytes: () => Promise<number | null>
  warn?: (message: string, meta?: Record<string, unknown>) => void
}

/**
 * Measure what the host backing this daemon can still fit.
 *
 * `admits` is always `null`: Docker has no admission opinion of its own — it has
 * no quota, no plan, and no notion of "too many". The caller compares the
 * headroom against its own floors. A provider that DID have such an opinion
 * (an account quota, a rate limit) would answer here instead.
 *
 * @param ctx - Capacity context.
 * @returns Measured headroom and an explanation of anything unmeasurable.
 */
export async function measureDockerCapacity(ctx: CapacityContext): Promise<SandboxCapacity> {
  if (!ctx.daemonIsLocal) {
    return {
      admits: null,
      detail:
        'The Docker daemon is reached over a TCP endpoint, so this process cannot measure the ' +
        'storage or memory the daemon actually writes to. No headroom is reported rather than ' +
        "reporting this machine's numbers for a different machine.",
      headroom: {},
    }
  }

  const notes: string[] = []
  const headroom: SandboxCapacity['headroom'] = {}

  let rootDir = '/var/lib/docker'
  try {
    const info = (await ctx.request('/info')) as { DockerRootDir?: string }
    if (info?.DockerRootDir) rootDir = info.DockerRootDir
  } catch (error) {
    // Not fatal: the default root is right on the overwhelming majority of
    // hosts, and a wrong path surfaces as a statfs failure below rather than as
    // a confident wrong number.
    ctx.warn?.('Could not read DockerRootDir from the daemon — assuming the default', { error })
    notes.push(`could not read the daemon's storage root, assumed ${rootDir}`)
  }

  try {
    const stats = await ctx.statfs(rootDir)
    headroom.diskBytes = stats.bavail * stats.bsize
    // A filesystem with dynamic inodes (btrfs, xfs) reports 0 or -1 free nodes.
    // That is "not applicable", not "exhausted", so it is omitted rather than
    // reported as zero — a caller comparing against a floor would refuse every
    // boot on such a host.
    if (stats.ffree > 0) headroom.inodes = stats.ffree
  } catch (error) {
    ctx.warn?.('Could not measure free space on the daemon storage root', { rootDir, error })
    notes.push(`free space on ${rootDir} is unmeasurable`)
  }

  const memoryBytes = await ctx.availableMemoryBytes()
  if (memoryBytes === null) {
    notes.push('available memory is unreadable on this platform')
  } else {
    headroom.memoryBytes = memoryBytes
  }

  return {
    admits: null,
    detail:
      notes.length > 0
        ? `Measured the host backing the local Docker daemon (${rootDir}); ${notes.join('; ')}.`
        : `Measured the host backing the local Docker daemon (${rootDir}).`,
    headroom,
  }
}
