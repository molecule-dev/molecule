/**
 * Project archive core types.
 *
 * Interface-only: the shape of a cold-storage archive artifact for a DORMANT
 * project, plus the provider contract a storage bond implements. No storage,
 * compression, or serialization logic lives here.
 *
 * The package does exactly one job: **store some bytes durably, prove they came
 * back, give them back.** The content channel is deliberately GENERIC — an
 * archive carries a list of {@link ArchivePart}s and nothing more, so a source
 * file, a database dump, a git bundle and a search index are the same kind of
 * thing to this contract. A consumer adds a new content type by adding a part,
 * never by adding a field to {@link ArchiveInput}.
 *
 * **Deciding WHICH files to archive is the CALLER's job, and this package
 * deliberately does not do it.** Use git: a workspace is a repo, `.gitignore`
 * already declares what is disposable, and `git clean -Xdf` already removes it.
 * This package used to ship its own exclude/refusal engine — presets, anchoring
 * rules, a per-ecosystem policy object — and it was a mistake twice over: a
 * directory exclude applied to filenames deleted `src/build/compiler.ts`,
 * `src/tmp.ts`, `src/build.rs` and `src/dist.config.js` (real source, no
 * signal), and `'\'` being a separator to one rule and an ordinary character to
 * another let `config\.env` reach plaintext storage. Git solved "which files
 * matter" twenty years ago; that layer is gone.
 *
 * Nothing survived it. There is no exclude list, no policy and no refusal — not
 * even for `.env`. Git does not refuse to commit a dotenv file, so neither does
 * this: a scaffolded `.gitignore` already excludes `.env*`, so one is never
 * handed over, and a user who force-added theirs has already pushed it to their
 * own remote. An unwritten rule here would be one more thing to learn and one
 * more surprise. Predictable beats clever.
 *
 * @module
 */

/**
 * Artifact layout version recorded in every {@link ArchiveManifest}.
 *
 * Bump it when the artifact layout changes incompatibly — a provider must
 * REFUSE to read an artifact whose `formatVersion` is higher than the one it
 * understands, rather than silently misreading it.
 *
 * @remarks
 * Version `3` removed the manifest's `excluded` header field along with the
 * exclude/filter layer that produced it. That field was inside
 * `manifest.parts.sha256`'s digest input, so a v2 manifest neither parses (the
 * field set is CLOSED) nor digests as a v3 one: v2 artifacts are not readable
 * here, and a provider's minimum-readable floor belongs at `3`. Version `2` had
 * itself replaced the v1 `source` + `database` pair with the single generic
 * `parts` channel.
 */
export const ARCHIVE_FORMAT_VERSION = 3

/**
 * A named byte-stream inside an archive.
 *
 * Nothing is privileged: source files, a database dump, a git bundle and a
 * search index are all parts, distinguished only by the caller's own
 * {@link ArchivePart.path} / {@link ArchivePart.kind} / {@link ArchivePart.meta}
 * labels. The archive stores and returns the bytes verbatim and NEVER
 * interprets them — pairing a `pg_custom` dump with a non-Postgres target fails
 * when the CALLER restores it, not when the archive stores it.
 *
 * Adding a second database, a Redis snapshot, or a per-repo git bundle is
 * therefore just more parts. It is never a new field on {@link ArchiveInput}.
 */
export interface ArchivePart {
  /**
   * POSIX-relative path inside the artifact, e.g. `'source/src/a.ts'`,
   * `'database/main.dump'`, `'repos/api.bundle'`. No leading slash, no `'..'`.
   *
   * Grouping is a CONVENTION expressed in this path (`source/…`, `database/…`),
   * not a schema — the provider does not parse it. Validated on BOTH sides
   * (archive and restore), on the RAW caller-facing path before any
   * artifact-internal prefixing and again on the stripped path at restore:
   * absolute POSIX (`/x`), a leading backslash, drive-qualified (`C:\x`), any
   * `..` segment, NUL bytes, and empty or `.`-only paths are rejected. Two
   * parts that collide after normalisation (NFC + case-fold) are rejected as
   * duplicates, since they would overwrite each other on restore.
   *
   * @remarks
   * **ONE canonical path model decides what this string's SEGMENTS are, and
   * every rule that reads a path uses it** — path safety, collision detection,
   * and collision detection. A conforming provider normalises a path by folding
   * `'\'` onto `'/'`, collapsing repeated separators, and trimming
   * leading/trailing whitespace from EACH segment, compares segments under
   * Unicode NFC, and applies every rule to those segments. (The MODULE that
   * implements this lives in the bond; this contract only states the rules,
   * because the core is types and data.)
   *
   * **A path whose normalisation would CHANGE it is REJECTED at archive time,
   * never silently rewritten.** The path the caller sent and the path the
   * manifest records must be identical, or the manifest describes something the
   * caller did not send — and the caller is about to delete the original. So
   * `'config\.env'`, `'a//b'`, `'a/b/'`, `'.env '` and `' .env'` all throw
   * rather than being canonicalised into `'config/.env'`, `'a/b'` and `'.env'`.
   *
   * That single model is not pedantry; it is the fix for a measured leak. When
   * path safety folded `'\'` onto `'/'` but the secrets rule split on `'/'`
   * alone, `'config\.env'` was archived and `verified: true` — a live dotenv
   * credential written into plaintext object storage — because `'\'` was a
   * separator to the checks that could not be harmed by it and an ordinary
   * character to the one rule that exists to prevent exactly that.
   */
  path: string

  /** The part's bytes, stored and returned verbatim. */
  content: Uint8Array

  /**
   * Unix mode bits; defaults to `0o644`. Masked to `0o777` on write and on
   * read, so setuid/setgid/sticky (`0o7000`) never survive a round trip.
   */
  mode?: number

  /**
   * Opaque caller label recorded in the manifest, e.g. `'source'` |
   * `'database'` | `'repo'`.
   *
   * Provenance for the caller's own restore logic — the archive never branches
   * on it, and no value is special.
   */
  kind?: string

  /**
   * Free-form metadata recorded verbatim, e.g. `{ format: 'pg_custom' }` or
   * `{ remote: '…', headSha: '…' }`.
   *
   * The archive NEVER interprets these. Record whatever a restore will need to
   * make sense of the bytes (dump format, engine version, remote URL) — but not
   * secrets: the artifact is not encrypted at rest, and the manifest is the
   * most readable thing in it.
   */
  meta?: Record<string, string>
}

/** Everything a provider needs to build and upload one archive artifact. */
export interface ArchiveInput {
  /** The project these bytes belong to; recorded in the manifest. */
  projectId: string

  /**
   * The archive's entire content, as generic parts.
   *
   * Source files, database dumps, git bundles and search indexes all go here —
   * there is no privileged sibling channel for any of them, and no filter: the
   * caller decided which files these are (normally with git/`.gitignore`), and
   * every part handed over is archived.
   */
  parts: ArchivePart[]

  /** Free-form metadata recorded verbatim in the manifest. */
  metadata?: Record<string, string>

  /**
   * Minimum parts required; defaults to `1`.
   *
   * An EMPTY part set THROWS rather than producing a verified empty archive: an
   * empty artifact round-trips and verifies perfectly while proving nothing, so
   * a workspace walk that silently returned `[]` would otherwise hand back
   * `verified: true` and the caller would release a real project. Raise it when
   * the caller knows a floor. Only a provider explicitly configured to allow
   * empty archives may accept `0`.
   */
  minParts?: number

  /**
   * Paths that MUST be present, else throw.
   *
   * The strongest available guard against a partial walk: a source tree missing
   * its lockfile or `package.json` is not restorable, and
   * {@link ArchiveInput.minParts} alone cannot detect that. Compared against
   * {@link ArchivePart.path} exactly.
   */
  requiredPaths?: readonly string[]
}

/**
 * Self-describing record of what an archive artifact contains.
 *
 * Stored inside the artifact so a restore can validate the payload without
 * consulting any external database row. `parts.sha256` is a digest of the PARTS
 * (path + mode + length + content, sorted by path) AND of everything this
 * manifest SAYS about them — the per-part index and the header fields below —
 * not of the container, so it survives a change to the artifact layout and is
 * what both verification and `restore()` recompute from the DOWNLOADED
 * artifact. See {@link ArchiveManifest.parts}.
 *
 * @remarks
 * A manifest carries EXACTLY the fields declared here, and a conforming
 * provider REFUSES one that carries any other key — at the top level or on an
 * index row. An undeclared key is unauthenticated instruction: it cannot be
 * inside a digest whose input is a fixed field list, yet it is handed to the
 * caller on `RestoreResult.manifest`, where a `restoreHint` nobody digested is
 * indistinguishable from one the archiver wrote.
 */
export interface ArchiveManifest {
  /** The {@link ARCHIVE_FORMAT_VERSION} the artifact was written with. */
  formatVersion: number

  /** The project the artifact belongs to — the artifact's own owner. */
  projectId: string

  /** ISO-8601 timestamp of when the artifact was built. */
  createdAt: string

  /** Aggregate over every part: how many, how many content bytes, and their digest. */
  parts: {
    /** Number of parts in the artifact. */
    count: number
    /** Total content bytes across every part. */
    bytes: number
    /**
     * Digest over the parts (path + mode + length + content, sorted by path),
     * the per-part {@link ArchiveManifest.entries} index, and the manifest
     * HEADER (`formatVersion`, `projectId`, `createdAt`, `parts.count`,
     * `parts.bytes`, `metadata`) — each section length-framed behind its own
     * marker so no arrangement of one can impersonate another.
     *
     * @remarks
     * Everything the manifest asserts is inside it, because everything the
     * manifest asserts is acted upon: the caller ROUTES on `entries[].kind`,
     * and `status()` reports `projectId`/`createdAt` as FACT. A header outside
     * the digest meant an attacker with bucket write access could rewrite whose
     * project an artifact was, and `restore()` and the read-back verification
     * both still passed.
     *
     * It is UNKEYED and stored beside the bytes it covers, so it detects TAMPER
     * but NOT a wholesale re-forge — see {@link ArchiveVerification.digestMatched}.
     */
    sha256: string
  }

  /**
   * Per-part index: path, bytes, and the caller's kind/meta, verbatim.
   *
   * Recorded exactly as supplied and never interpreted — this is how a restore
   * knows which part is a `pg_custom` dump and which is a git bundle.
   *
   * A row carries these four keys and NOTHING else; a provider refuses a row
   * with an undeclared key rather than passing it on, because a row is an
   * instruction to the restore path and an undigested key would be an
   * unauthenticated one.
   */
  entries: readonly {
    /** The part's POSIX-relative path inside the artifact. */
    path: string
    /** The part's content length in bytes. */
    bytes: number
    /** The caller's opaque {@link ArchivePart.kind} label, if any. */
    kind?: string
    /** The caller's {@link ArchivePart.meta}, recorded verbatim. */
    meta?: Record<string, string>
  }[]

  /** The caller's {@link ArchiveInput.metadata}, recorded verbatim. */
  metadata?: Record<string, string>
}

/**
 * Per-step outcome of the post-upload read-back check.
 *
 * Every field must be true for {@link ArchiveResult.verified} to be true; a
 * false field (with `error` populated) means the artifact is NOT safe to rely
 * on and the live project must be kept.
 */
export interface ArchiveVerification {
  /** The artifact was re-read back OUT of storage at the minted storage id. */
  downloaded: boolean

  /** sha256 of the DOWNLOADED artifact bytes equals the pre-upload digest. */
  checksumMatched: boolean

  /** The manifest was parsed out of the DOWNLOADED artifact. */
  manifestParsed: boolean

  /** The downloaded artifact's part count equals `manifest.parts.count`. */
  entriesMatched: boolean

  /**
   * The artifact was UNPACKED and the parts digest recomputed from the
   * downloaded parts matches `manifest.parts.sha256` (and the total part bytes
   * match `manifest.parts.bytes`).
   *
   * This is the only flag that proves the PACKER worked. Without it the other
   * checks compare the artifact to itself — a packer that dropped or corrupted
   * a part's contents still passed every one of them.
   *
   * @remarks
   * **What this flag does NOT prove.** The digest is UNKEYED and is stored
   * inside the very artifact it covers, so it detects TAMPER — any edit that
   * leaves `manifest.parts.sha256` behind, including a relabelled `kind` or a
   * rewritten `projectId` — but it CANNOT detect a WHOLESALE RE-FORGE: an
   * attacker with bucket write access can replace the artifact outright and
   * recompute a perfectly consistent digest over their own content. No unkeyed
   * digest stored beside its data can close that, and this flag must not be
   * read as if it did.
   *
   * The mitigation is a value the attacker cannot rewrite, and it costs one
   * column: **persist `result.manifest.parts.sha256` next to
   * `result.storageId`** when you persist the id, then compare it with
   * `restore().manifest.parts.sha256` (and with `status().manifest.parts.sha256`)
   * before trusting the parts. A re-forge changes the digest; your row still
   * holds the original.
   */
  digestMatched: boolean

  /** Why verification did not complete, when any flag above is false. */
  error?: string
}

/** Result of an `archive()` call, including its verification verdict. */
export interface ArchiveResult {
  /** The project that was archived. */
  projectId: string

  /**
   * The storage id the uploads bond MINTED for this artifact. Never derived
   * from `projectId` — the shipped uploads bonds assign a UUID and ignore the
   * supplied filename. PERSIST IT: without it the archive cannot be located,
   * restored, or deleted.
   */
  storageId: string

  /** The manifest that was written into the artifact. */
  manifest: ArchiveManifest

  /** Size of the stored artifact in bytes. */
  bytes: number

  /** TRUE only when the artifact was re-read from storage and fully validated. */
  verified: boolean

  /** Per-step report behind {@link ArchiveResult.verified}. */
  verification: ArchiveVerification
}

/**
 * Selector for a restore: the storage id `archive()` returned, plus the project
 * the bytes are being restored INTO.
 *
 * `storageId` is REQUIRED — there is no derivable key. `projectId` is the
 * destination label echoed onto {@link RestoreResult}; the archive's own
 * project id is in `manifest.projectId`, so restoring one project's archive
 * into a different project is an explicit, visible act.
 */
export interface RestoreInput {
  /** The project the bytes are being restored INTO. */
  projectId: string

  /** The storage id `archive()` minted and the caller persisted. */
  storageId: string
}

/**
 * The archived bytes, handed back to the caller.
 *
 * Restoring does NOT recreate a sandbox, a database, or a git remote — the
 * caller re-provisions those and applies these parts, routing each one by the
 * `kind`/`meta` it recorded at archive time.
 */
export interface RestoreResult {
  /** The project the parts were restored into (echoed from {@link RestoreInput}). */
  projectId: string

  /** The artifact's manifest, validated against the payload before returning. */
  manifest: ArchiveManifest

  /** Every part in the artifact, paths and modes preserved. */
  parts: ArchivePart[]
}

/**
 * Summary of one archive artifact, located by its storage id.
 *
 * Keyed by `storageId`, never by project: a project can have any number of
 * artifacts (every `archive()` mints a new one). `projectId` is read back out
 * of the stored manifest, so it reports which project the artifact actually
 * belongs to rather than which one the caller assumed.
 *
 * @remarks
 * That promise obliges a provider to VALIDATE the artifact before reporting it,
 * exactly as `restore()` does — recomputing `manifest.parts.sha256` over the
 * downloaded parts, index and header — and to THROW rather than report a
 * mismatch. A `status()` that merely parsed the manifest made this the channel
 * for the forgery it claims to resolve: rewriting `projectId` in the stored
 * artifact had it reported as fact, while `restore()` refused the same bytes.
 */
export interface ArchiveStatus {
  /**
   * Read from `manifest.projectId` inside the artifact — not from the lookup
   * key — and only after that manifest was authenticated against the payload.
   */
  projectId: string

  /** The storage id the artifact lives at. */
  storageId: string

  /** When the artifact was built (`manifest.createdAt`). */
  archivedAt: string

  /** Size of the stored artifact in bytes. */
  bytes: number

  /** The artifact's manifest, parsed out of the stored bytes. */
  manifest: ArchiveManifest
}

/**
 * The contract every project-archive storage bond implements.
 *
 * @remarks
 * `archive()` must not report `verified: true` unless, AFTER upload, it has
 * (1) re-read the artifact back out of storage at the MINTED id, (2) recomputed
 * sha256 over the downloaded bytes and matched the pre-upload digest, (3) parsed
 * the manifest out of the downloaded artifact, (4) confirmed the part count
 * equals `manifest.parts.count`, and (5) UNPACKED the downloaded artifact and
 * matched the recomputed parts digest and byte total against
 * `manifest.parts.sha256`/`bytes`. Any failure yields `verified: false` with
 * `verification.error` populated — a verification failure must NOT throw, since
 * the caller decides what to do. `archive()` DOES throw when the part set is
 * empty (or violates `minParts`/`requiredPaths`), when a path is unsafe or
 * duplicated, when a size cap is exceeded, and when the upload itself fails:
 * those are never archives, so there is nothing for the caller to weigh.
 *
 * **The provider does NOT decide which files to archive.** Every part it is
 * handed is archived. There is no exclude list, no policy object, no
 * per-ecosystem preset and no refusal of any kind — not even for `.env`. The
 * caller selects the parts, normally by walking a git worktree whose
 * `.gitignore` already declares what is disposable (`git clean -Xdf` removes
 * exactly that).
 *
 * A dotenv refusal briefly lived here and was removed on purpose. Git does not
 * refuse to commit a `.env`; a scaffolded `.gitignore` excludes `.env*`, so one
 * is never handed over, and a user who force-added theirs has already pushed it
 * to their own remote — archiving it is no worse and entirely predictable. A
 * rule of ours would have been the surprise: something to learn, sprung at the
 * worst moment, on a package whose whole job is to behave the way git already
 * taught everyone to expect. Secrets belong in the platform's encrypted vault
 * and are re-injected on restore.
 *
 * `archive()` returns the storage id the uploads bond minted, ALWAYS a new one,
 * so it can never overwrite the previous artifact. `status()` and `remove()`
 * take that storage id, NOT a project id — the caller persists it. `restore()`
 * AND `status()` both validate the downloaded payload against the manifest —
 * count, bytes, per-part index, and the digest over the parts, that index and
 * the manifest header — and THROW on mismatch; a method that reports manifest
 * data it did not authenticate is a channel for whatever was written into the
 * bucket. The provider NEVER deletes or releases the live project; releasing is
 * the caller's job, and only when `verified === true`.
 *
 * Every part is treated identically. A provider must not branch on a part's
 * `kind`, `meta`, or path prefix, and must not decode its bytes.
 *
 * Two further invariants a conforming provider owes the caller: it enforces a
 * cap on the stored artifact BEFORE decompressing anything it downloads (and a
 * separate cap on the decompressed payload, through the codec, as the
 * decompression-bomb guard), and NO error message it raises embeds archive
 * bytes — a parser that quotes the offending input must have its message
 * scrubbed while the original is kept as `cause`.
 */
export interface ProjectArchiveProvider {
  archive(input: ArchiveInput): Promise<ArchiveResult>
  restore(input: RestoreInput): Promise<RestoreResult>
  status(storageId: string): Promise<ArchiveStatus | null>
  remove(storageId: string): Promise<void>
}
