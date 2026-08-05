/**
 * Bulk file transfer in and out of a Docker sandbox, as POSIX tar streams.
 *
 * The Engine API has a first-class endpoint pair for this
 * (`GET`/`PUT /containers/{id}/archive`), so the bond does not need to
 * orchestrate `tar` through an exec. That matters beyond tidiness: an exec-based
 * pipe has to survive two hijacked sockets and gives no status code you can
 * trust, which is how a workspace capture ends up "succeeding" with half a tree.
 *
 * Nothing is buffered. A project tree is gigabytes across hundreds of thousands
 * of files; reading one into this process to hand it to the next call would trade
 * a slow transfer for a dead API.
 *
 * **Extraction does not restore ownership or setuid bits.** `copyUIDGID` is left
 * off, and callers capturing a tenant-authored tree into something another tenant
 * boots must additionally strip setuid/setgid — `commitTemplate` does. An archive
 * is data, and honoring the mode bits in data is how it becomes an escalation.
 *
 * @module
 */

import type { DockerDownload, DockerUpload } from './request.js'

/** What the archive capability needs from the provider. */
export interface ArchiveContext {
  download: DockerDownload
  upload: DockerUpload
}

/** Generous by design: this moves whole project trees, not files. */
const TRANSFER_TIMEOUT_MS = 600_000

/**
 * Reject a path that is not a plain absolute path.
 *
 * @param path - Candidate path.
 * @throws {Error} When the path is relative or contains a traversal segment.
 */
function assertAbsolutePath(path: string): void {
  if (!path.startsWith('/') || path.includes('..') || path.includes('\0')) {
    throw new Error(
      `Invalid sandbox path ${JSON.stringify(path.slice(0, 64))}: must be absolute and free of ".." segments`,
    )
  }
}

/**
 * Stream a directory tree out of a sandbox as a POSIX tar archive.
 *
 * The archive is rooted at the LAST segment of `path` — an export of
 * `/workspace` yields entries under `workspace/` — which is what makes it
 * extractable into the parent directory on the way back in.
 *
 * @param ctx - Archive context.
 * @param containerId - The sandbox to read from.
 * @param path - Absolute path inside the sandbox.
 * @returns A tar byte stream.
 */
export async function exportContainerFiles(
  ctx: ArchiveContext,
  containerId: string,
  path: string,
): Promise<AsyncIterable<Uint8Array>> {
  assertAbsolutePath(path)
  return ctx.download(
    `/containers/${containerId}/archive?path=${encodeURIComponent(path)}`,
    TRANSFER_TIMEOUT_MS,
  )
}

/**
 * Stream a POSIX tar archive into a sandbox, extracting it at `path`.
 *
 * @param ctx - Archive context.
 * @param containerId - The sandbox to write to.
 * @param path - Absolute destination directory inside the sandbox.
 * @param archive - The tar byte stream to extract.
 */
export async function importContainerFiles(
  ctx: ArchiveContext,
  containerId: string,
  path: string,
  archive: AsyncIterable<Uint8Array>,
): Promise<void> {
  assertAbsolutePath(path)
  await ctx.upload(
    `/containers/${containerId}/archive?path=${encodeURIComponent(path)}`,
    archive,
    TRANSFER_TIMEOUT_MS,
  )
}
