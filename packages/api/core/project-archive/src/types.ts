/**
 * Project archive core types.
 *
 * Interface-only: the shape of a cold-storage archive artifact for a DORMANT
 * project, plus the provider contract a storage bond implements. No storage,
 * compression, or serialization logic lives here.
 *
 * @module
 */

/** Bump when the on-disk artifact layout changes incompatibly. */
export const ARCHIVE_FORMAT_VERSION = 1

/**
 * Paths never archived.
 *
 * Two separate reasons live in this list, and BOTH are load-bearing:
 *
 * 1. **Reproducible bulk** (`node_modules`, `dist`, `.vite`, …) — regenerable
 *    from the lockfile or a build. This is the whole economic point:
 *    `node_modules` measured 1.5 GB of a 1.9 GB workspace, while real source is
 *    single-digit MB.
 * 2. **Secrets** (`.env` and the `.env.*` family) — an archive artifact is NOT
 *    encrypted at rest by this package and lands in object storage in
 *    plaintext. Secrets belong in the platform's encrypted vault, and are
 *    re-injected when the project is restored.
 *
 * The `.env.*` entry is a GLOB-ish marker, not a literal filename: the caller's
 * workspace walk must treat it as "every dotfile whose name starts with
 * `.env.`" (`.env.production`, `.env.local.bak`, …), because the provider does
 * not filter — the caller does.
 */
export const DEFAULT_ARCHIVE_EXCLUDES: readonly string[] = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.vite',
  '.turbo',
  '.cache',
  'coverage',
  '.pnpm-store',
  'tmp',
  '.DS_Store',
  // Secrets — never archived. See the note above: the artifact is plaintext.
  '.env',
  '.env.local',
  '.env.*',
]

/** A single source file captured into (or restored out of) an archive. */
export interface ArchiveSourceFile {
  /**
   * POSIX-relative path inside the workspace.
   *
   * Rejected on BOTH sides (archive and restore), validated on the UNPREFIXED
   * path: absolute POSIX (`/x`), a leading backslash, drive-qualified
   * (`C:\x`), any `..` segment, NUL bytes, and empty or `.`-only paths. Two
   * entries that collide after normalisation (NFC + case-fold) are rejected as
   * duplicates, since they would overwrite each other on restore.
   */
  path: string
  content: Uint8Array
  /**
   * Unix mode bits; defaults to 0o644 when absent. Masked to 0o777 on write
   * and on read — setuid/setgid/sticky (0o7000) are always stripped, so a
   * restored file can never carry setuid.
   */
  mode?: number
}

/**
 * Self-describing record of what an archive artifact contains.
 *
 * Stored inside the artifact so a restore can validate the payload without
 * consulting any external database row. `source.sha256` is a digest of the
 * FILES (path + mode + length + content, sorted by path), not of the tar, so it
 * survives a change to the artifact layout and is what both verification and
 * `restore()` recompute from the DOWNLOADED entries.
 */
export interface ArchiveManifest {
  formatVersion: number
  projectId: string
  createdAt: string
  appDir?: string
  source: { entries: number; bytes: number; sha256: string; excluded: readonly string[] }
  database?: { bytes: number; sha256: string; format: 'pg_custom' | 'sql' }
  metadata?: Record<string, string>
}

/** Everything a provider needs to build and upload one archive artifact. */
export interface ArchiveInput {
  projectId: string
  /** The caller supplies already-filtered source files. */
  files: ArchiveSourceFile[]
  /** Optional database dump bytes (e.g. pg_dump -Fc output). */
  databaseDump?: Uint8Array | null
  databaseFormat?: 'pg_custom' | 'sql'
  appDir?: string
  metadata?: Record<string, string>
  /** Recorded in the manifest for provenance; does NOT filter (caller filters). */
  excluded?: readonly string[]
  /**
   * Minimum number of source files required. Defaults to `1`, so an EMPTY file
   * set THROWS instead of producing a verified empty archive — a workspace walk
   * that silently returned `[]` would otherwise hand back `verified: true` and
   * the caller would delete the only copy of a real project.
   *
   * Raise it when the caller knows a floor (e.g. a scaffolded project always
   * has more than a handful of files). Only a provider configured with
   * `allowEmpty` may accept `0`.
   */
  minEntries?: number
  /**
   * Paths that MUST be present in `files`, or `archive()` throws. The strongest
   * available guard against a partial walk: a source tree missing its lockfile
   * or `package.json` is not restorable, and `minEntries` alone cannot detect
   * that. Compared against `ArchiveSourceFile.path` exactly (POSIX-relative).
   */
  requiredPaths?: readonly string[]
}

/**
 * Per-step outcome of the post-upload read-back check.
 *
 * Every field must be true for `ArchiveResult.verified` to be true; a false
 * field (with `error` populated) means the artifact is NOT safe to rely on and
 * the live project must be kept.
 */
export interface ArchiveVerification {
  /** The artifact was re-read back OUT of storage at the minted storage id. */
  downloaded: boolean
  /** sha256 of the DOWNLOADED artifact bytes equals the pre-upload digest. */
  checksumMatched: boolean
  /** `manifest.json` was parsed out of the DOWNLOADED artifact. */
  manifestParsed: boolean
  /** The downloaded artifact's `source/` member count equals `manifest.source.entries`. */
  entriesMatched: boolean
  /**
   * The artifact was UNPACKED and the source digest recomputed from the
   * downloaded entries matches `manifest.source.sha256` (and the total source
   * bytes match `manifest.source.bytes`).
   *
   * This is the only flag that proves the PACKER worked. Without it the other
   * checks compare the artifact to itself — a packer that dropped or corrupted
   * file contents still passed every one of them.
   */
  digestMatched: boolean
  error?: string
}

/** Result of an `archive()` call, including its verification verdict. */
export interface ArchiveResult {
  projectId: string
  /**
   * The storage id the uploads bond MINTED for this artifact. Never derived
   * from `projectId` — the shipped uploads bonds assign a UUID and ignore the
   * supplied filename. PERSIST IT: without it the archive cannot be located,
   * restored, or deleted.
   */
  storageId: string
  manifest: ArchiveManifest
  bytes: number
  /** TRUE only when the artifact was re-read from storage and fully validated. */
  verified: boolean
  verification: ArchiveVerification
}

/**
 * Selector for a restore: the storage id `archive()` returned, plus the project
 * the bytes are being restored INTO.
 *
 * `storageId` is REQUIRED — there is no derivable key. `projectId` is the
 * destination label echoed onto `RestoreResult`; the archive's own project id
 * is in `manifest.projectId`, so restoring one project's archive into a
 * different project is an explicit, visible act.
 */
export interface RestoreInput {
  projectId: string
  storageId: string
}

/**
 * The archived bytes, handed back to the caller.
 *
 * Restoring does NOT recreate a sandbox or a database — the caller
 * re-provisions those and applies these bytes.
 */
export interface RestoreResult {
  projectId: string
  manifest: ArchiveManifest
  files: ArchiveSourceFile[]
  databaseDump: Uint8Array | null
}

/**
 * Summary of one archive artifact, located by its storage id.
 *
 * Keyed by `storageId`, never by project: a project can have any number of
 * artifacts (every `archive()` mints a new one). `projectId` is read back out
 * of the stored manifest, so it reports which project the artifact actually
 * belongs to rather than which one the caller assumed.
 */
export interface ArchiveStatus {
  /** Read from `manifest.projectId` inside the artifact — not from the lookup key. */
  projectId: string
  storageId: string
  archivedAt: string
  bytes: number
  manifest: ArchiveManifest
}

/**
 * The contract every project-archive storage bond implements.
 *
 * @remarks
 * `archive()` must not report `verified: true` unless, AFTER upload, it has
 * (1) re-read the artifact back out of storage at the MINTED id, (2) recomputed
 * sha256 over the downloaded bytes and matched the pre-upload digest, (3) parsed
 * the manifest out of the downloaded artifact, (4) confirmed the source entry
 * count equals `manifest.source.entries`, and (5) UNPACKED the downloaded
 * artifact and matched the recomputed source digest and byte total against
 * `manifest.source.sha256`/`bytes`. Any failure yields `verified: false` with
 * `verification.error` populated — a verification failure must NOT throw, since
 * the caller decides what to do. `archive()` DOES throw when the file set is
 * empty (or violates `minEntries`/`requiredPaths`), when a path is unsafe or
 * duplicated, and when the upload itself fails: those are never archives, so
 * there is nothing for the caller to weigh.
 *
 * `archive()` returns the storage id the uploads bond minted, ALWAYS a new one,
 * so it can never overwrite the previous artifact. `status()` and `remove()`
 * take that storage id, NOT a project id — the caller persists it. `restore()`
 * validates the downloaded payload against the manifest and THROWS on mismatch.
 * The provider NEVER deletes or releases the live project; releasing is the
 * caller's job, and only when `verified === true`.
 */
export interface ProjectArchiveProvider {
  archive(input: ArchiveInput): Promise<ArchiveResult>
  restore(input: RestoreInput): Promise<RestoreResult>
  status(storageId: string): Promise<ArchiveStatus | null>
  remove(storageId: string): Promise<void>
}
