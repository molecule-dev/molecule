/**
 * Project archive core types.
 *
 * Interface-only: the shape of a cold-storage archive artifact for a DORMANT
 * project, plus the provider contract a storage bond implements. No storage,
 * compression, or serialization logic lives here.
 *
 * The content channel is deliberately GENERIC. An archive carries a list of
 * {@link ArchivePart}s and nothing more: a source file, a database dump, a git
 * bundle and a search index are the same kind of thing to this contract, so a
 * consumer adds a new content type by adding a part — never by adding a field
 * to {@link ArchiveInput}. Ecosystem opinions (which directories are
 * reproducible bulk, what a secrets file is called) live in the OPT-IN presets
 * at the bottom of this file and in the caller-supplied {@link ArchivePolicy},
 * never in the contract itself.
 *
 * Everything here is written under one governing rule, because this package
 * runs immediately before a caller DELETES a user's only copy: **never silently
 * return less than you were given.** It is why an advisory filter hands back
 * {@link PartFilterResult} (both halves) instead of a bare array, why exclude
 * matching is ANCHORED at the first path segment except for
 * {@link NODE_ANY_SEGMENT_EXCLUDES}, and why a refusal by {@link ArchivePolicy}
 * THROWS instead of quietly dropping a part.
 *
 * One more rule ties those together: there is ONE canonical path model, and
 * every rule that reads a path — safety, refusal, filtering, collision
 * detection — consumes ITS segments. See {@link ArchivePart.path}. Three
 * different notions of "what a segment is" are what let a `.env` reach
 * plaintext object storage.
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
 * Version `2` replaced the v1 `source` + `database` pair with the single
 * generic `parts` channel, so a v1 artifact's layout is not readable as v2.
 */
export const ARCHIVE_FORMAT_VERSION = 2

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
   * every rule that reads a path uses it** — path safety, the
   * {@link ArchivePolicy} refusal, the advisory excludes filter, and collision
   * detection. A conforming provider normalises a path by folding `'\'` onto
   * `'/'`, collapsing repeated separators, and trimming leading/trailing
   * whitespace from EACH segment, compares segments under Unicode NFC, and then
   * applies every rule to those segments. (The MODULE that implements this
   * lives in the bond; this contract only states the rules, because the core is
   * types and data.)
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
   * character to the two rules that exist to prevent exactly that.
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

/**
 * What a provider REFUSES outright, rather than trusting the caller filtered.
 *
 * The caller does the filtering (see {@link ArchiveInput.excluded}); this is the
 * small, loud backstop for the cases where a forgotten filter is catastrophic
 * rather than merely wasteful — shipping gigabytes of reproducible dependencies
 * into cold storage, or writing live credentials into a plaintext artifact. A
 * refusal THROWS; it never silently drops a part behind the caller's back,
 * because that would make the manifest describe a tree the caller never
 * intended to archive.
 *
 * It is deliberately CONFIGURABLE and ecosystem-neutral. A Node consumer passes
 * {@link NODE_PROJECT_POLICY}; a Python consumer passes
 * `{ refuseSegments: ['.venv', '__pycache__'] }`; a Rust consumer passes
 * `{ refuseSegments: ['target'] }`. No ecosystem's bulk directories are
 * hard-coded into the contract, so no ecosystem gets protection the others are
 * denied.
 *
 * @remarks
 * Keep a policy NARROW. `dist`, `build`, `tmp` and `coverage` are all plausible
 * real source directory names (`src/build/`, `src/tmp/`), so refusing them
 * would reject legitimate projects — they belong in an advisory excludes list
 * such as {@link NODE_PROJECT_EXCLUDES}, not here.
 */
export interface ArchivePolicy {
  /**
   * Path segments refused, matched per NORMALIZED segment, at ANY depth,
   * CASE-SENSITIVELY.
   *
   * Segment-based, never substring-based: `'node_modules'` refuses
   * `node_modules/x` and `api/node_modules/x`, but never a legitimate file
   * called `node_modules_notes.md`.
   *
   * "Normalized" means the segments of the ONE canonical path model described
   * on {@link ArchivePart.path} — `'\'` folded onto `'/'`, repeated separators
   * collapsed, each segment whitespace-trimmed, compared under NFC. A
   * separator-naive split is how `node_modules\pkg\index.js` slipped past this
   * rule while path safety and collision detection both treated `'\'` as a
   * separator.
   *
   * @remarks
   * Case-SENSITIVE is the correct default here, and it is a deliberate
   * asymmetry with {@link ArchivePolicy.refuseFilePrefixes}, which folds case.
   * Two reasons, both about what a miss costs:
   *
   * 1. **Linux paths are case-sensitive**, and that is where these archives are
   *    built. `Build/` and `build/` are two genuinely different directories, so
   *    folding case would refuse a real source directory a user deliberately
   *    named — and a refusal THROWS, which means an archive that never happens
   *    and a dormant project that is never reclaimed.
   * 2. **A miss here is bounded.** A case-variant bulk directory that slips
   *    through only makes the artifact bigger; nothing is lost and nothing is
   *    exposed. A miss in `refuseFilePrefixes` writes live credentials into
   *    plaintext object storage, which is not recoverable — hence that rule
   *    folds case and this one does not.
   *
   * A caller that wants a case variant refused lists it explicitly, e.g.
   * `['node_modules', 'Node_Modules']`.
   */
  refuseSegments?: readonly string[]

  /**
   * Secret-file prefixes refused when ANY NORMALIZED path segment equals, or is
   * prefixed by `'<prefix>.'`, an entry — compared CASE-INSENSITIVELY.
   *
   * `'.env'` therefore refuses `.env` and the whole `.env.*` family
   * (`.env.local`, `.env.production`), which is the point: the artifact is not
   * encrypted at rest.
   *
   * Post-normalisation, per the ONE model on {@link ArchivePart.path}: with
   * `'\'` folded onto `'/'` and each segment whitespace-trimmed, `config\.env`,
   * `.env\prod.key`, `.env ` and ` .env` are all refused too. (A conforming
   * provider rejects those paths outright for being non-canonical; this rule
   * matching them as well is deliberate belt-and-braces, because the cost of a
   * miss here is a live credential in plaintext storage.)
   *
   * @remarks
   * Two widenings over the obvious implementation, each of which closed a real
   * credential leak — a secrets file that reached plaintext object storage:
   *
   * 1. **CASE-INSENSITIVE**, unlike {@link ArchivePolicy.refuseSegments}.
   *    `.ENV`, `.Env` and `.eNv.production` were NOT refused under a
   *    case-sensitive compare, yet they are the same secrets file to every
   *    dotenv loader and to the case-insensitive filesystems (macOS, Windows)
   *    developers routinely author them on. The asymmetry with `refuseSegments`
   *    is deliberate and is explained there: missing reproducible bulk wastes
   *    bytes, while missing a secret is unrecoverable — the credential is
   *    exposed the moment the artifact is written, and rotating it is the only
   *    remedy left.
   * 2. **EVERY path segment, not just the basename.** A `.env` DIRECTORY holds
   *    exactly the same credentials as a `.env` file, so `.env/prod.key` and
   *    `config/.env/staging` are refused too. A basename-only compare archived
   *    all of them: the basename of `.env/prod.key` is `prod.key`, which
   *    matches nothing.
   */
  refuseFilePrefixes?: readonly string[]
}

/**
 * What an advisory excludes filter KEPT and what it DROPPED — both halves,
 * always.
 *
 * A filter helper over {@link ArchivePart}s returns this pair rather than a
 * bare array because of the governing rule of this package: it runs immediately
 * before a caller DELETES a user's only copy, so silently returning less than
 * it was given is the most expensive bug it can have — and it had it. Filtering
 * `['src/build/compiler.ts', 'src/tmp/scratch.ts', 'app/coverage/report.ts',
 * 'src/main.ts']` through {@link NODE_PROJECT_EXCLUDES} kept only `src/main.ts`
 * and dropped three legitimate source files, with nothing in the return value
 * to say so. Handing back {@link PartFilterResult.dropped} makes the loss
 * INSPECTABLE: log it, count it, assert on it in a test, or summarise it onto
 * {@link ArchiveInput.excluded} as provenance.
 *
 * @remarks
 * Declared here — in the contract — rather than left as one bond's private
 * convention, so every implementation of the helper has the same
 * never-drop-silently shape:
 * `filterArchivableParts<T extends { path: string }>(parts: readonly T[],
 * excludes?: readonly string[], options?: PartFilterOptions):
 * PartFilterResult<T>`.
 *
 * Filtering and refusal are different channels and must not be confused:
 * anything in `dropped` is reproducible bulk the CALLER chose to skip (silent
 * is fine — it is merely wasteful), whereas a part the effective
 * {@link ArchivePolicy} refuses is never filtered at all, it THROWS.
 */
export interface PartFilterResult<T> {
  /** The parts that survived the filter — the ones to archive. */
  kept: T[]

  /**
   * The parts the filter removed.
   *
   * Never discard this: it is the only record of what the walk gave up, and it
   * is checked before the live project is released.
   */
  dropped: T[]
}

/**
 * Knobs an advisory excludes filter accepts, so no ecosystem's directories get
 * a privilege another ecosystem cannot ask for.
 *
 * Everything here has a Node/JS default because Node/JS is what molecule.dev
 * scaffolds — and every one of those defaults is a NAMED, replaceable preset
 * (`NODE_*`), never an unlabelled truth baked into the matching rules.
 */
export interface PartFilterOptions {
  /**
   * Exclude entries matched at EVERY path segment rather than anchored at the
   * first one. Defaults to {@link NODE_ANY_SEGMENT_EXCLUDES}.
   *
   * The any-depth rule is a big hammer — it is what keeps a nested
   * `api/node_modules/…` out of an archive — and it was previously reachable
   * ONLY by the one Node directory hard-coded into the filter. A Python walk
   * passes `{ anySegment: ['__pycache__'] }`, a Rust one
   * `{ anySegment: ['target'] }`; pass `[]` to anchor every entry.
   *
   * Reach for it only where the entry can never be a real source directory a
   * user named on purpose: `dist`, `build`, `tmp` and `coverage` all can be
   * (`src/build/compiler.ts`), which is why anchoring is the default and
   * matching at depth is an explicit opt-in.
   */
  anySegment?: readonly string[]
}

/** Everything a provider needs to build and upload one archive artifact. */
export interface ArchiveInput {
  /** The project these bytes belong to; recorded in the manifest. */
  projectId: string

  /**
   * The archive's entire content, as generic parts.
   *
   * Source files, database dumps, git bundles and search indexes all go here —
   * there is no privileged sibling channel for any of them.
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

  /**
   * Recorded in the manifest as provenance only — the caller filters.
   *
   * Passing {@link NODE_PROJECT_EXCLUDES} here does NOT remove anything from
   * {@link ArchiveInput.parts}; apply the excludes while walking and record
   * here what was dropped, so a future reader knows what the artifact is
   * missing and why.
   *
   * A conforming filter helper returns {@link PartFilterResult} — both `kept`
   * and `dropped` — precisely so the second half can be inspected, logged, and
   * summarised here instead of vanishing.
   */
  excluded?: readonly string[]

  /**
   * Overrides the provider's configured policy for this call.
   *
   * Use it when one archive has different rules from the provider's default —
   * e.g. a Python project archived by a provider whose configured default is
   * {@link NODE_PROJECT_POLICY}.
   */
  policy?: ArchivePolicy
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
     * `parts.bytes`, `excluded`, `metadata`) — each section length-framed
     * behind its own marker so no arrangement of one can impersonate another.
     *
     * @remarks
     * Everything the manifest asserts is inside it, because everything the
     * manifest asserts is acted upon: the caller ROUTES on `entries[].kind`,
     * and `status()` reports `projectId`/`createdAt` as FACT. A header outside
     * the digest meant an attacker with bucket write access could rewrite whose
     * project an artifact was, and `restore()` and `verifyArtifactBytes()` both
     * still passed.
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

  /** What the caller reported dropping while walking — provenance only. */
  excluded?: readonly string[]

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
 * duplicated, when the effective {@link ArchivePolicy} refuses a part, when a
 * size cap is exceeded, and when the upload itself fails: those are never
 * archives, so there is nothing for the caller to weigh.
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

/**
 * Dotenv basename prefix — the JS spelling of "a secrets file".
 *
 * Used as an {@link ArchivePolicy.refuseFilePrefixes} entry, so it refuses
 * `.env` and every `.env.`-prefixed file (`.env.local`, `.env.production`).
 * Other ecosystems spell the same idea differently (`secrets.yaml`,
 * `credentials`, `*.pem`) — pass those instead; nothing about `.env` is
 * universal.
 */
export const DOTENV_FILE_PREFIX = '.env'

/**
 * Reproducible-bulk directories in a Node/JS project. NOT a universal default.
 *
 * Advisory: the caller filters its own walk and records the list on
 * {@link ArchiveInput.excluded} as provenance. Every entry here is regenerable,
 * which is the whole economic point — `node_modules` measured 1.5 GB of a 1.9 GB
 * workspace while real source is single-digit MB.
 *
 * @remarks
 * **"Regenerable" does NOT reliably mean "reinstallable from the lockfile" — the
 * CALLER owns the restore path and must know what actually produced the tree.**
 * A concrete counter-example from the environment this package was built for:
 * molecule.dev's sandbox image installs dependencies through a temporary
 * `_superset` workspace, then deletes it and strips it from `package.json`, so
 * the shipped lockfile does not describe the installed tree. `npm ci` there takes
 * ~78 s and produces a `node_modules` with no `.bin/vite` in it, and
 * `npm ci --offline` fails outright — the only correct restore source is the
 * image layer that built it. Excluding these directories is still right; assuming
 * a package manager can rebuild them is not. Verify the restore path before
 * relying on the exclusion, or a dormant project wakes up broken.
 *
 * `'.git'` is deliberately ABSENT: git history is user work and is NOT
 * reproducible from a source snapshot, so dropping it would destroy exactly
 * what the archive exists to preserve. It is also small, so it costs nothing to
 * keep. (Caveat that comes with keeping it: a `.git/config` remote URL can
 * carry an embedded `user:token@host` credential, and the artifact is plaintext
 * at rest — scrub or rewrite remotes before archiving if users can set raw
 * remote URLs.)
 *
 * Secret files are NOT in this list either. They are not "bulk the caller may
 * skip", they are bytes a provider must REFUSE — see
 * {@link NODE_PROJECT_POLICY}.
 *
 * A Python project would pass its own list (`.venv`, `__pycache__`,
 * `.pytest_cache`), a Rust one `target`. This constant is an opt-in convenience
 * for one ecosystem, not a statement about projects in general.
 *
 * Every entry here is ANCHORED at the FIRST path segment — `'build'` drops
 * `build/bundle.js` but NOT `src/build/compiler.ts` — except the entries also
 * listed in {@link NODE_ANY_SEGMENT_EXCLUDES}. Read that constant before
 * assuming anything about how deep a match reaches; the anchoring is the fix
 * for a filter that deleted real source.
 *
 * A NON-DOT entry here (`dist`, `build`, `tmp`, `coverage`) matches a DIRECTORY
 * and nothing else. It never matches a filename and never matches a filename
 * PREFIX, so `src/tmp.ts`, `src/build.rs`, `src/dist.config.js`, `tmp.md`,
 * `lib/build.gradle`, `buildings/x.ts` and `distance.ts` all survive — as do a
 * git branch or tag named `dist`/`build`/`tmp` (`.git/refs/heads/dist`), which
 * a filename-prefix rule quietly deleted out of the one directory this preset
 * deliberately keeps. The `'<entry>.'` family rule applies ONLY to the DOT
 * entries (`.DS_Store`, `.cache`, and a `.env` added by the caller), which is
 * where it was needed and where it is safe: `.env` must also catch
 * `.env.local`.
 */
export const NODE_PROJECT_EXCLUDES: readonly string[] = [
  'node_modules',
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
]

/**
 * The Node/JS preset for "matched at any path depth". Everything else is
 * anchored at the FIRST path segment.
 *
 * An advisory exclude entry is matched against the START of a part's path, so
 * `'build'` drops `build/bundle.js` while `src/build/compiler.ts` survives.
 * Entries listed HERE are the documented exception, matched at every
 * normalized segment: a nested `node_modules` (`api/node_modules/…`,
 * `packages/web/node_modules/…`) is real in every workspace, is always
 * reproducible from the lockfile, and is never a source directory anyone named
 * on purpose — anchoring it would miss most of the ~1.5 GB the exclusion exists
 * to drop.
 *
 * @remarks
 * ECOSYSTEM-SPECIFIC OPT-IN, like every other `NODE_*` constant here — which is
 * why it carries the ecosystem in its NAME. It was once called
 * `ANY_SEGMENT_EXCLUDES`: an unlabelled constant holding one ecosystem's
 * directory, applied unconditionally by the filter, with no way for another
 * ecosystem to ask for the same treatment. That made any-depth matching a
 * privilege Node had and Python did not — `api/node_modules/x.js` dropped at
 * depth while `src/__pycache__/a.pyc`, `app/.venv/lib/x.py` and
 * `crates/x/target/debug/y` were kept, no matter what the caller passed. A
 * conforming filter takes the set as {@link PartFilterOptions.anySegment} and
 * merely DEFAULTS it to this preset.
 *
 * This anchoring governs the DIRECTORY match — which containing path an entry
 * reaches. The separate DOT-ENTRY family rule (a part's own filename equal to,
 * or prefixed by, `'<entry>.'`, applied only when the entry itself starts with
 * `'.'`) is what still drops `.DS_Store` and the `.env.local` family wherever
 * they sit. A non-dot entry never matches a filename at all, so `'build'` does
 * NOT match a file called `build.gradle` — that widening cost real source and
 * real git refs.
 *
 * WHY the default is anchored. An any-segment default silently deleted real
 * source. Proven against the shipped filter: given
 * `['src/build/compiler.ts', 'src/tmp/scratch.ts', 'app/coverage/report.ts',
 * 'src/main.ts']` and {@link NODE_PROJECT_EXCLUDES}, it kept only `src/main.ts`
 * and dropped the other three — every one of them legitimate source, matched
 * because `build`, `tmp` and `coverage` happened to appear at a deeper segment.
 * That is exactly the false positive this anchoring prevents, in a helper whose
 * whole job is to be the easy correct thing to call, in a package that runs
 * immediately before a caller DELETES a user's only copy.
 *
 * Nothing else qualifies for this set. `dist`, `build`, `tmp` and `coverage`
 * are all plausible real source directory names (`src/build/`, `src/tmp/`), so
 * matching them at depth trades a bounded saving (some bytes) against an
 * unbounded loss (a user's source).
 *
 * A monorepo that genuinely wants every `packages/<name>/dist` dropped passes
 * those DEEPER PATHS EXPLICITLY (`'packages/api/dist'`, `'packages/app/dist'`),
 * which the anchored match honours as a leading path. The default is SAFE — it
 * keeps real source — and being more aggressive than that is an EXPLICIT caller
 * choice, never something a preset does behind the caller's back.
 *
 * An empty-string entry in an excludes list is REJECTED with a clear error
 * rather than applied — as is any entry that NORMALIZES to nothing (`'/'`,
 * `'  '`). `''` would make the dot-entry family rule (`'<entry>.'`) degenerate
 * to `'.'` and match every dotfile — silently dropping `.git`, the one thing
 * this package deliberately refuses to lose.
 */
export const NODE_ANY_SEGMENT_EXCLUDES: readonly string[] = ['node_modules']

/**
 * Deprecated spelling of {@link NODE_ANY_SEGMENT_EXCLUDES}, kept so existing
 * imports keep resolving to the same array.
 *
 * @deprecated Use {@link NODE_ANY_SEGMENT_EXCLUDES}. The unlabelled name read as
 *   a contract-level truth while holding one ecosystem's directory; every other
 *   ecosystem preset here is `NODE_*`, and a caller that wants the same
 *   any-depth treatment for `__pycache__` or `target` passes
 *   {@link PartFilterOptions.anySegment} instead of inheriting Node's.
 */
export const ANY_SEGMENT_EXCLUDES: readonly string[] = NODE_ANY_SEGMENT_EXCLUDES

/**
 * Policy for a Node/JS project: refuses `node_modules` and dotenv files.
 *
 * Deliberately much narrower than {@link NODE_PROJECT_EXCLUDES}. Only two
 * things are worth throwing over: `node_modules` (never legitimately part of a
 * source tree, always regenerable from the lockfile, and forgetting it ships
 * ~1.5 GB per project) and dotenv files (the artifact is NOT encrypted at rest,
 * so archiving one writes live credentials into object storage in plaintext).
 * Everything else — `dist`, `build`, `tmp`, `coverage` — stays advisory,
 * because those are plausible real source directory names.
 *
 * Note how each half is matched, since the two rules deliberately differ (see
 * {@link ArchivePolicy}). `node_modules` is refused at any depth,
 * CASE-SENSITIVELY, because POSIX paths are and a miss only costs bytes.
 * `.env` is refused CASE-INSENSITIVELY (`.ENV`, `.Env`, `.eNv.production`) and
 * on EVERY path segment rather than the basename alone (so a `.env/` DIRECTORY
 * such as `.env/prod.key` is refused too), because a miss there is a live
 * credential in plaintext storage and cannot be undone. BOTH rules read the
 * NORMALIZED segments of {@link ArchivePart.path} — the one model — so
 * `node_modules\pkg\index.js`, `config\.env`, `.env ` and ` .env` cannot walk
 * past a rule by spelling their separator or padding differently.
 *
 * @remarks
 * ECOSYSTEM-SPECIFIC OPT-IN, not a contract-level truth. A Python consumer
 * passes `{ refuseSegments: ['.venv', '__pycache__'] }`; a Rust consumer passes
 * `{ refuseSegments: ['target'] }`. The object-storage bond defaults its
 * configured policy to this preset ONLY because Node/JS is the ecosystem
 * molecule.dev scaffolds — that is a BOND default, and any caller can replace
 * it per provider (configuration) or per call
 * ({@link ArchiveInput.policy}).
 */
export const NODE_PROJECT_POLICY: ArchivePolicy = {
  refuseSegments: ['node_modules'],
  refuseFilePrefixes: [DOTENV_FILE_PREFIX],
}
