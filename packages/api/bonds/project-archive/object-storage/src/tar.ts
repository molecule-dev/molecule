/**
 * The ONE canonical path model, the path-safety guards built on it, and a
 * minimal dependency-free POSIX ustar reader/writer plus gzip helpers.
 *
 * The archive artifact this bond writes is a plain `.tar.gz` — `tar -xzf` (GNU
 * tar, bsdtar, 7-Zip, macOS Archive Utility) extracts it with no molecule.dev
 * tooling involved. That "no lock-in" promise is why this module exists instead
 * of a bespoke container format, and why it is implemented here rather than
 * pulled from npm: the package must ship ZERO external runtime dependencies.
 *
 * Format details implemented: 512-byte headers, NUL-terminated octal numeric
 * fields, the classic 6-digit + NUL + space header checksum, the `ustar\0`/`00`
 * magic, the 155-byte `prefix` field (so paths longer than the 100-byte `name`
 * field are still standards-compliant), 512-byte data padding, and the
 * two-zero-block (1024-byte) end-of-archive marker.
 *
 * **The path model lives here because a path must mean ONE thing.** This
 * package once held three different answers to "where does a path segment end",
 * and the measured consequence — reproduced against the built package — was
 * that `archive({ parts: [{ path: 'config\\.env', … }] })` was accepted,
 * uploaded and reported `verified: true`: a live dotenv credential written into
 * object storage that is NOT encrypted at rest, because the segment the secrets
 * rule needed to see (`.env`) only exists once `'\'` is understood as a
 * separator. `.env\prod.key`, `.env ` and ` .env` did the same. Therefore:
 *
 * 1. **{@link segmentsOf} is the ONLY place in this package that splits a
 *    path.** A test greps every non-test source file to keep it that way
 *    (`__tests__/tar.test.ts` → "there is exactly ONE place that decides what a
 *    path's segments are"). If you need segments, import them; do not write
 *    `.split('/')`.
 * 2. **Every rule consumes {@link normalizePartPath}'s segments** — path
 *    safety, collision detection, and the provider's `.env` refusal.
 * 3. **Normalisation is a TEST, not a transformation.** A path whose
 *    normalisation would change it is REJECTED by {@link assertSafePartPath}
 *    rather than silently rewritten: the path the caller sent and the path the
 *    manifest records must be identical, or the manifest describes a tree the
 *    caller did not send — immediately before the caller deletes the original.
 *
 * Unicode is normalised to NFC for COMPARISON only ({@link pathCollisionKey}),
 * never in the stored path: a decomposed filename is a legitimate filename, and
 * rewriting one would break the round trip this package exists to guarantee.
 *
 * Further hardening, because the bytes this codec reads come back out of a
 * bucket and may not be the bytes it wrote: path safety is enforced on BOTH
 * sides and on the UNPREFIXED path ({@link assertSafePartPath} before any
 * `parts/` prefix, {@link assertSafeEntryPath} on write and read); entries that
 * collide after Unicode/case folding are rejected; header checksums are
 * recomputed rather than trusted; modes are masked to `0o777` both ways;
 * {@link gunzipBytes} and {@link parseTar} both enforce `maxUncompressedBytes`;
 * and no message thrown here embeds archive bytes — paths appear only via
 * {@link describePath}, which escapes control characters and truncates.
 *
 * INTERNAL: nothing here is re-exported from the package barrel. The public
 * surface is the provider — see `./provider.js`.
 *
 * @module
 */

import { constants as bufferConstants } from 'node:buffer'
import { gunzipSync, gzipSync } from 'node:zlib'

/**
 * Path separators this package recognises: POSIX `'/'` and Windows `'\'`.
 *
 * A caller that walked a workspace with `path.join()` on win32 hands over
 * backslash-separated paths, and an attacker-influenced path list can spell a
 * separator either way on purpose. Both are separators to EVERY rule here, or
 * they are a hole in whichever rule disagrees.
 */
const SEPARATORS = /[/\\]/

/** Size of every tar header and data block, in bytes. */
const BLOCK_SIZE = 512

/** Size of the ustar `name` field, in bytes. */
const NAME_SIZE = 100

/** Size of the ustar `prefix` field, in bytes. */
const PREFIX_SIZE = 155

/** Byte offset of the `chksum` field within a header block. */
const CHECKSUM_OFFSET = 148

/** Size of the `chksum` field, in bytes. */
const CHECKSUM_SIZE = 8

/** Default mode applied to file entries that do not carry one. */
const DEFAULT_FILE_MODE = 0o644

/** Default mode applied to directory entries that do not carry one. */
const DEFAULT_DIRECTORY_MODE = 0o755

/**
 * Permission bits kept on write and on read. Masking with this drops
 * setuid/setgid/sticky (`0o7000`), so a restored file can never be setuid.
 */
const MODE_MASK = 0o777

/**
 * Cap applied when the caller supplies no `maxUncompressedBytes`: 2 GiB.
 *
 * Deliberately safe-by-default — a caller that forgets to pass limits still
 * cannot be forced to materialise an unbounded buffer.
 */
const DEFAULT_MAX_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024

/** Longest path fragment echoed into an error message. */
const MAX_DESCRIBED_PATH_LENGTH = 120

/**
 * A part path decomposed by the canonical model.
 */
export interface NormalizedPartPath {
  /** The canonical path: {@link NormalizedPartPath.segments} joined with `'/'`. */
  path: string

  /**
   * The canonical segments: separator-folded, empty segments removed, each one
   * trimmed of leading/trailing whitespace.
   *
   * This is the array EVERY rule matches against — path safety, collision
   * detection, and the provider's `.env` refusal alike.
   */
  segments: string[]

  /**
   * True when normalising CHANGED the input — it contained a `'\'`, a repeated
   * or trailing separator, or a whitespace-padded segment.
   *
   * {@link assertSafePartPath} REFUSES such a path rather than storing the
   * normalised form.
   */
  changed: boolean

  /**
   * The raw segments, before empties were dropped and whitespace trimmed.
   *
   * Only path VALIDATION uses these, so it can name the precise defect (an
   * empty segment, a `'.'` segment, a `'..'` traversal) instead of reporting
   * every malformed path as "not canonical".
   */
  rawSegments: string[]
}

/**
 * A single entry in a tar archive.
 */
export interface TarEntry {
  /**
   * POSIX-relative path inside the archive. Must not be absolute, must not
   * contain a `..`, `.` or empty segment, and must not collide with another
   * entry after Unicode/case normalisation — {@link createTar} and
   * {@link parseTar} both reject such paths.
   */
  path: string

  /**
   * The entry's bytes. Always empty for a directory entry.
   */
  content: Uint8Array

  /**
   * Unix mode bits, always masked to `0o777` (setuid/setgid/sticky are
   * stripped). Defaults to `0o644` for files and `0o755` for directories when
   * writing; always populated when reading.
   */
  mode?: number

  /**
   * Modification time in seconds since the epoch. Defaults to `0` when writing,
   * which keeps the artifact byte-reproducible for identical input.
   */
  mtime?: number

  /**
   * Entry kind. Defaults to `'file'` when writing; always populated when
   * reading.
   */
  type?: 'file' | 'directory'
}

/**
 * Size caps applied while reading untrusted bytes.
 *
 * These exist because the artifact is downloaded from object storage: a
 * hostile or corrupt `.tar.gz` must not be able to exhaust the process's
 * memory before anything has had a chance to validate it.
 */
export interface TarLimits {
  /**
   * Maximum number of UNCOMPRESSED bytes to materialise, in bytes. Enforced by
   * {@link gunzipBytes} while inflating and by {@link parseTar} both on the
   * archive it is handed and while accumulating entry data.
   *
   * Defaults to 2 GiB (`2 * 1024 * 1024 * 1024`).
   */
  maxUncompressedBytes?: number
}

/**
 * Splits a path into raw segments on either separator.
 *
 * **The only path split in this package.** Everything else consumes
 * {@link normalizePartPath}. A second splitter is how `'\'` came to mean two
 * different things in one package and a `.env` reached plaintext storage.
 *
 * @param path - The path to split.
 * @returns Its raw segments, in order, including empty ones (a repeated or
 *   trailing separator yields an empty segment, which validation rejects).
 */
export function segmentsOf(path: string): string[] {
  return path.split(SEPARATORS)
}

/**
 * Decomposes a part path with the canonical model: folds `'\'` onto `'/'`,
 * collapses repeated separators, and trims leading/trailing whitespace from
 * EACH segment.
 *
 * Pure and non-throwing — it reports what the canonical form WOULD be and
 * whether that differs from the input. Deciding what to do about a difference
 * belongs to {@link assertSafePartPath}, which refuses it.
 *
 * @param path - The path to decompose.
 * @returns The canonical path, its segments, whether normalisation changed the
 *   input, and the raw segments for precise validation errors.
 */
export function normalizePartPath(path: string): NormalizedPartPath {
  const rawSegments = segmentsOf(path)
  const segments = rawSegments.map((segment) => segment.trim()).filter((segment) => segment !== '')
  const normalized = segments.join('/')

  return { path: normalized, segments, changed: normalized !== path, rawSegments }
}

/**
 * The key two paths are compared by when deciding whether they would overwrite
 * each other on restore.
 *
 * Built from the canonical model, so `a\b`, `a//b` and `a/b/` all key the same
 * as `a/b`, then NFC-folded (so a precomposed `é` and a decomposed `é` compare
 * equal) and lower-cased (so a case-insensitive filesystem cannot silently
 * replace one entry with another). Comparison only — never stored.
 *
 * @param path - The path to key.
 * @returns The comparison key.
 */
export function pathCollisionKey(path: string): string {
  return normalizePartPath(path).path.normalize('NFC').toLowerCase()
}

/**
 * Views a `Uint8Array` as a `Buffer` without copying, so the parser can use
 * Buffer's string/slice helpers on caller-supplied bytes.
 *
 * @param data - The bytes to view.
 * @returns A `Buffer` over the same memory.
 */
function toBuffer(data: Uint8Array): Buffer {
  return Buffer.isBuffer(data) ? data : Buffer.from(data.buffer, data.byteOffset, data.byteLength)
}

/**
 * Renders a path for an error message: control characters (including NUL,
 * CR and LF) are escaped and the result is truncated.
 *
 * Paths are metadata, not archive content — echoing one is what makes an error
 * actionable. Escaping is what keeps a hostile archive from injecting newlines
 * or terminal escapes into a log line, and truncation keeps a 4 KB crafted
 * path out of the message.
 *
 * Shared with the artifact layer because every module that names a path from a
 * DOWNLOADED artifact owes the same hygiene: colliding parts, unindexed parts
 * and stowaway members are all reported by path, and all of those strings came
 * out of a bucket. An ordinary path passes through unchanged, so it is safe to
 * wrap every such message in it.
 *
 * @param path - The raw path.
 * @returns A safe, bounded rendering of the path.
 */
export function describePath(path: string): string {
  let escaped = ''
  let truncated = false
  for (const character of path) {
    const code = character.codePointAt(0) ?? 0
    const rendered =
      code < 0x20 || code === 0x7f ? `\\x${code.toString(16).padStart(2, '0')}` : character
    if (escaped.length + rendered.length > MAX_DESCRIBED_PATH_LENGTH) {
      truncated = true
      break
    }
    escaped += rendered
  }
  return truncated ? `${escaped}...` : escaped
}

/**
 * Resolves the effective uncompressed-byte cap for a read operation.
 *
 * @param limits - The caller's limits, if any.
 * @returns The cap in bytes.
 * @throws {Error} If the supplied cap is not a positive finite number.
 */
function resolveMaxUncompressedBytes(limits?: TarLimits): number {
  const cap = limits?.maxUncompressedBytes ?? DEFAULT_MAX_UNCOMPRESSED_BYTES
  if (!Number.isFinite(cap) || cap <= 0) {
    throw new Error(`Invalid maxUncompressedBytes: ${cap} (expected a positive number of bytes).`)
  }
  return Math.floor(cap)
}

/**
 * Shared path validator behind {@link assertSafePartPath} and
 * {@link assertSafeEntryPath}.
 *
 * Order matters: the traversal and `.`/empty-segment checks run FIRST, so the
 * most dangerous shape is always named as what it is (`src\..\..\etc\passwd` is
 * reported as traversal, not as a separator problem), and the canonical-form
 * checks run last as the catch-all that leaves no non-canonical path accepted.
 *
 * @param path - The path to validate.
 * @param label - How to name the path in error messages.
 * @throws {Error} If the path is empty, `.`-only, absolute, drive-qualified,
 *   contains a NUL byte, contains a `..`, `.` or empty segment, or is not
 *   already canonical (a `'\'` separator, a repeated or trailing separator, or
 *   a whitespace-padded segment).
 */
function assertSafePath(path: string, label: string): void {
  if (typeof path !== 'string' || path === '') {
    throw new Error(`Invalid ${label}: the path is empty.`)
  }
  if (path.includes('\0')) {
    throw new Error(`Invalid ${label} "${describePath(path)}": paths must not contain NUL bytes.`)
  }
  if (path.startsWith('/') || path.startsWith('\\')) {
    throw new Error(`Unsafe ${label} "${describePath(path)}": absolute paths are rejected.`)
  }
  if (/^[a-zA-Z]:[/\\]?/.test(path)) {
    throw new Error(`Unsafe ${label} "${describePath(path)}": drive-qualified paths are rejected.`)
  }

  const model = normalizePartPath(path)
  const segments = model.rawSegments

  if (segments.every((segment) => segment === '.' || segment === '')) {
    throw new Error(
      `Invalid ${label} "${describePath(path)}": the path names no file (it is "." or empty).`,
    )
  }

  for (const segment of segments) {
    if (segment === '..') {
      throw new Error(
        `Unsafe ${label} "${describePath(path)}": paths containing a ".." segment are rejected (path traversal).`,
      )
    }
  }
  for (const segment of segments) {
    if (segment === '.') {
      throw new Error(
        `Unsafe ${label} "${describePath(path)}": paths containing a "." segment are rejected (ambiguous on restore).`,
      )
    }
    if (segment === '') {
      throw new Error(
        `Unsafe ${label} "${describePath(path)}": paths containing an empty segment are rejected (ambiguous on restore).`,
      )
    }
  }

  for (const segment of segments) {
    if (segment !== segment.trim()) {
      throw new Error(
        `Unsafe ${label} "${describePath(path)}": the segment "${describePath(segment)}" is padded ` +
          `with whitespace, which is rejected. Windows and macOS strip a trailing space, so ".env " ` +
          `IS ".env" there — a padded segment is a different string to a matching rule and the same ` +
          `file to the filesystem.`,
      )
    }
  }

  if (path.includes('\\')) {
    throw new Error(
      `Unsafe ${label} "${describePath(path)}": paths must use "/" as their separator, and this one ` +
        `contains a backslash. It is REJECTED rather than folded to "${describePath(model.path)}", ` +
        `because the path you send and the path the manifest records must be identical. (A "\\" that ` +
        `some rules read as a separator and others as an ordinary character is how "config\\.env" ` +
        `was archived past the secrets refusal.)`,
    )
  }

  if (model.changed) {
    // Unreachable via the checks above today; kept as the invariant's backstop,
    // so no future normalisation rule can be added to the model without a path
    // that violates it being refused here.
    throw new Error(
      `Unsafe ${label} "${describePath(path)}": it is not canonical — it normalises to ` +
        `"${describePath(model.path)}". A path is REJECTED rather than rewritten, so the caller's ` +
        `path and the stored path are always the same string.`,
    )
  }
}

/**
 * Rejects a caller-supplied, UNPREFIXED `ArchivePart` path that would be unsafe
 * to archive or to restore.
 *
 * **Call this on the RAW path, before any `parts/` prefix is applied.** A
 * prefix is precisely what disguises a hostile path: `'parts/' + '/etc/passwd'`
 * is `'parts//etc/passwd'`, which is neither absolute nor traversing and would
 * sail past a guard that only ever sees the prefixed form. It is the same
 * validation {@link assertSafeEntryPath} applies to archive-internal paths, run
 * one step earlier.
 *
 * Every part is the same to this guard: a source file, a database dump and a
 * git bundle are all checked identically, because nothing about a part's
 * `kind` makes an absolute or traversing path safe.
 *
 * @param path - The caller's relative part path, exactly as supplied.
 * @throws {Error} If the path is empty or `.`-only, absolute (`/x`), starts
 *   with a backslash, is drive-qualified (`C:\x`), contains a NUL byte,
 *   contains a `..`, `.` or empty segment, or is not canonical under the one
 *   path model — a backslash ANYWHERE (`config\.env`), a repeated or trailing
 *   separator (`a//b`, `a/b/`), or a whitespace-padded segment (`.env `,
 *   ` .env`). Non-canonical paths are refused, never silently rewritten.
 */
export function assertSafePartPath(path: string): void {
  assertSafePath(path, 'part path')
}

/**
 * Rejects paths that would let an extracted archive escape its destination
 * directory (the "tar slip" vulnerability), plus paths tar cannot represent.
 *
 * Enforced when WRITING as well as when READING: an archive this package
 * produces can never contain an unsafe path in the first place, and an archive
 * it did not produce can never hand one back.
 *
 * @param path - The archive-internal entry path to validate (no trailing
 *   slash — {@link createTar} and {@link parseTar} strip a directory entry's
 *   trailing slash before validating).
 * @throws {Error} If the path is empty or `.`-only, absolute, drive-qualified,
 *   contains a NUL byte, contains a `..`, `.` or empty segment, or is not
 *   canonical (a backslash, a repeated separator, or a whitespace-padded
 *   segment). A DOWNLOADED artifact naming a member non-canonically was not
 *   written by this package, and its member paths would mean different things
 *   on different platforms.
 */
export function assertSafeEntryPath(path: string): void {
  assertSafePath(path, 'tar entry path')
}

/**
 * Writes a UTF-8 string into a header field, NUL-padded to the field width.
 *
 * @param header - The 512-byte header block being built.
 * @param value - The string to write.
 * @param offset - Byte offset of the field.
 * @param size - Byte width of the field.
 * @throws {Error} If the encoded string does not fit the field.
 */
function writeString(header: Buffer, value: string, offset: number, size: number): void {
  const bytes = Buffer.from(value, 'utf8')
  if (bytes.length > size) {
    throw new Error(
      `Value "${describePath(value)}" does not fit in a ${size}-byte tar header field.`,
    )
  }
  bytes.copy(header, offset)
}

/**
 * Writes a non-negative integer as a NUL-terminated, zero-padded octal string,
 * the numeric field encoding POSIX tar mandates.
 *
 * @param header - The 512-byte header block being built.
 * @param value - The value to encode.
 * @param offset - Byte offset of the field.
 * @param size - Byte width of the field, including the terminating NUL.
 * @throws {Error} If the value is negative or too large for the field.
 */
function writeOctal(header: Buffer, value: number, offset: number, size: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Cannot encode ${value} as a tar octal field.`)
  }
  const digits = size - 1
  const octal = Math.floor(value).toString(8)
  if (octal.length > digits) {
    throw new Error(
      `Value ${value} does not fit in a ${digits}-digit octal tar header field (max ${8 ** digits - 1}).`,
    )
  }
  writeString(header, octal.padStart(digits, '0'), offset, digits)
}

/**
 * Reads a NUL/space-terminated octal numeric header field.
 *
 * The field's raw bytes are NEVER echoed into the error — a corrupt archive
 * must not be able to push its own bytes into a log line.
 *
 * @param header - The header block.
 * @param offset - Byte offset of the field.
 * @param size - Byte width of the field.
 * @param field - Human-readable field name, for error messages.
 * @returns The decoded value, or 0 when the field is blank.
 * @throws {Error} If the field is not valid octal.
 */
function readOctal(header: Buffer, offset: number, size: number, field: string): number {
  const raw = header.subarray(offset, offset + size).toString('ascii')
  const trimmed = raw.replace(/\0/g, ' ').trim()
  if (trimmed === '') return 0
  if (!/^[0-7]+$/.test(trimmed)) {
    throw new Error(`Corrupt tar header: the "${field}" field is not a valid octal numeric field.`)
  }
  const value = parseInt(trimmed, 8)
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Corrupt tar header: the "${field}" field is out of range.`)
  }
  return value
}

/**
 * Reads a NUL-terminated UTF-8 string header field.
 *
 * @param header - The header block.
 * @param offset - Byte offset of the field.
 * @param size - Byte width of the field.
 * @returns The decoded string with trailing NUL padding removed.
 */
function readString(header: Buffer, offset: number, size: number): string {
  const field = header.subarray(offset, offset + size)
  const end = field.indexOf(0)
  return field.subarray(0, end === -1 ? field.length : end).toString('utf8')
}

/**
 * Computes the POSIX header checksums: the sum of every header byte with the
 * `chksum` field itself treated as eight ASCII spaces.
 *
 * Both the unsigned sum (what every modern writer emits, including
 * {@link createTar}) and the signed sum (what a handful of historic writers
 * emitted for headers containing bytes >= 0x80) are returned, because a reader
 * that accepts only one of them rejects otherwise-valid third-party archives.
 *
 * @param header - The 512-byte header block.
 * @returns The unsigned and signed checksum values.
 */
function computeChecksums(header: Buffer): { unsigned: number; signed: number } {
  let unsigned = 0
  let signed = 0
  for (let i = 0; i < BLOCK_SIZE; i++) {
    const blank = i >= CHECKSUM_OFFSET && i < CHECKSUM_OFFSET + CHECKSUM_SIZE
    const byte = blank ? 0x20 : header[i]
    unsigned += byte
    signed += byte > 0x7f ? byte - 0x100 : byte
  }
  return { unsigned, signed }
}

/**
 * Splits a path across ustar's `name` (100 bytes) and `prefix` (155 bytes)
 * fields, measured in UTF-8 BYTES rather than characters.
 *
 * @param path - The entry path.
 * @returns The `name` and `prefix` field values (`prefix` is `''` when unused).
 * @throws {Error} If no split satisfies both field limits — e.g. a single path
 *   component longer than 100 bytes, or a total longer than 255 bytes.
 */
function splitPath(path: string): { name: string; prefix: string } {
  if (Buffer.byteLength(path, 'utf8') <= NAME_SIZE) {
    return { name: path, prefix: '' }
  }
  // The canonical segments, like every other rule here — the path reached this
  // function through assertSafeEntryPath, so it is already canonical.
  const parts = segmentsOf(path)
  for (let i = 1; i < parts.length; i++) {
    const prefix = parts.slice(0, i).join('/')
    const name = parts.slice(i).join('/')
    if (
      Buffer.byteLength(prefix, 'utf8') <= PREFIX_SIZE &&
      Buffer.byteLength(name, 'utf8') <= NAME_SIZE
    ) {
      return { name, prefix }
    }
  }
  throw new Error(
    `Path "${describePath(path)}" (${Buffer.byteLength(path, 'utf8')} bytes) cannot be represented in the ustar ` +
      `format: it needs a "/" split with at most ${PREFIX_SIZE} bytes of prefix and ${NAME_SIZE} bytes of name.`,
  )
}

/**
 * Builds the 512-byte ustar header for one entry.
 *
 * @param entry - The entry to describe.
 * @param path - The already-validated, canonical entry path (no trailing
 *   slash).
 * @returns The header block.
 */
function buildHeader(entry: TarEntry, path: string): Buffer {
  const isDirectory = entry.type === 'directory'
  const headerPath = isDirectory ? `${path}/` : path
  const { name, prefix } = splitPath(headerPath)
  const header = Buffer.alloc(BLOCK_SIZE)

  writeString(header, name, 0, NAME_SIZE)
  // Mode hygiene: mask to 0o777 so setuid/setgid/sticky can never be archived.
  writeOctal(
    header,
    (entry.mode ?? (isDirectory ? DEFAULT_DIRECTORY_MODE : DEFAULT_FILE_MODE)) & MODE_MASK,
    100,
    8,
  )
  writeOctal(header, 0, 108, 8) // uid
  writeOctal(header, 0, 116, 8) // gid
  writeOctal(header, isDirectory ? 0 : entry.content.byteLength, 124, 12)
  writeOctal(header, entry.mtime ?? 0, 136, 12)
  writeString(header, isDirectory ? '5' : '0', 156, 1)
  writeString(header, 'ustar\0', 257, 6)
  writeString(header, '00', 263, 2)
  writeOctal(header, 0, 329, 8) // devmajor
  writeOctal(header, 0, 337, 8) // devminor
  writeString(header, prefix, 345, PREFIX_SIZE)

  // The checksum must be computed with the field blank, then written back.
  header.fill(0x20, CHECKSUM_OFFSET, CHECKSUM_OFFSET + CHECKSUM_SIZE)
  const { unsigned } = computeChecksums(header)
  writeString(header, `${unsigned.toString(8).padStart(6, '0')}\0 `, CHECKSUM_OFFSET, CHECKSUM_SIZE)

  return header
}

/**
 * Serializes entries into an uncompressed POSIX ustar archive.
 *
 * Entries are written in the order given, each as a 512-byte header followed by
 * its content padded up to a 512-byte boundary, and the stream is terminated by
 * two zero blocks (1024 bytes) as the format requires. `mtime` defaults to 0, so
 * identical input produces a byte-identical archive. Modes are masked to
 * `0o777`, so no artifact this package writes can carry setuid/setgid/sticky.
 *
 * @param entries - The entries to write.
 * @returns The tar bytes (always a multiple of 512).
 * @throws {Error} If an entry path is unsafe (absolute, drive-qualified, or
 *   containing a `..`, `.` or empty segment), cannot be represented in ustar's
 *   name/prefix fields, or collides with another entry after Unicode/case
 *   normalisation.
 */
export function createTar(entries: readonly TarEntry[]): Uint8Array {
  const seen = new Map<string, string>()
  const blocks: Buffer[] = []

  for (const entry of entries) {
    // A directory's canonical path carries no trailing slash; the header does.
    const path = entry.type === 'directory' ? entry.path.replace(/\/+$/, '') : entry.path

    assertSafeEntryPath(path)

    const key = pathCollisionKey(path)
    const previous = seen.get(key)
    if (previous !== undefined) {
      throw new Error(
        `Duplicate tar entry path "${describePath(path)}": it collides with "${describePath(previous)}" ` +
          `after Unicode/case normalisation, so restoring both would overwrite one with the other.`,
      )
    }
    seen.set(key, path)

    blocks.push(buildHeader(entry, path))

    if (entry.type === 'directory') continue

    const content = toBuffer(entry.content)
    if (content.length > 0) {
      blocks.push(content)
      const remainder = content.length % BLOCK_SIZE
      if (remainder !== 0) {
        blocks.push(Buffer.alloc(BLOCK_SIZE - remainder))
      }
    }
  }

  // End-of-archive marker: two consecutive zero-filled blocks.
  blocks.push(Buffer.alloc(BLOCK_SIZE * 2))

  return new Uint8Array(Buffer.concat(blocks))
}

/**
 * Tests whether a header block is entirely zero — the end-of-archive marker.
 *
 * @param block - The 512-byte block to test.
 * @returns True when every byte is zero.
 */
function isZeroBlock(block: Buffer): boolean {
  for (let i = 0; i < block.length; i++) {
    if (block[i] !== 0) return false
  }
  return true
}

/**
 * Parses an uncompressed POSIX ustar archive.
 *
 * Nothing in the header is taken on trust:
 *
 * - every header's stored checksum is RECOMPUTED and compared (unsigned, or
 *   the historic signed variant) before the header is used,
 * - every entry path is validated with {@link assertSafeEntryPath} BEFORE the
 *   entry is returned — so a malicious archive containing `../evil` or
 *   `/etc/passwd` throws here rather than escaping the caller's extraction
 *   directory later,
 * - entries that collide after Unicode/case normalisation are rejected, so a
 *   restore cannot silently overwrite one file with another,
 * - modes are masked to `0o777`, so a restored file can never carry setuid,
 * - the total data size is checked against `maxUncompressedBytes` BEFORE each
 *   entry's bytes are copied, so a header claiming 8 GiB throws instead of
 *   allocating, and
 * - the two-zero-block end-of-archive marker must be present, so an artifact
 *   truncated at a block boundary fails loudly instead of yielding half a
 *   project.
 *
 * @param data - The tar bytes.
 * @param limits - Optional size caps; `maxUncompressedBytes` defaults to 2 GiB.
 * @returns The entries in archive order, each with a copied `content` buffer.
 * @throws {Error} If the archive is empty, truncated, exceeds
 *   `maxUncompressedBytes`, a header checksum fails, the ustar magic is
 *   missing, an entry type is unsupported, an entry path is unsafe or
 *   colliding, or `maxUncompressedBytes` is not a positive number.
 */
export function parseTar(data: Uint8Array, limits?: TarLimits): TarEntry[] {
  const maxUncompressedBytes = resolveMaxUncompressedBytes(limits)
  const buffer = toBuffer(data)

  if (buffer.length === 0) {
    throw new Error('Corrupt tar archive: the archive is empty (0 bytes).')
  }
  if (buffer.length % BLOCK_SIZE !== 0) {
    throw new Error(
      `Corrupt tar archive: length ${buffer.length} is not a multiple of ${BLOCK_SIZE} bytes.`,
    )
  }
  if (buffer.length > maxUncompressedBytes) {
    throw new Error(
      `Tar archive is too large: ${buffer.length} bytes exceeds the ${maxUncompressedBytes}-byte ` +
        `maxUncompressedBytes cap.`,
    )
  }

  const entries: TarEntry[] = []
  const seen = new Map<string, string>()
  let offset = 0
  let totalContentBytes = 0
  let sawEndOfArchive = false

  while (offset + BLOCK_SIZE <= buffer.length) {
    const header = buffer.subarray(offset, offset + BLOCK_SIZE)
    if (isZeroBlock(header)) {
      sawEndOfArchive = true
      break
    }

    const blockIndex = offset / BLOCK_SIZE
    const storedChecksum = readOctal(header, CHECKSUM_OFFSET, CHECKSUM_SIZE, 'chksum')
    const { unsigned, signed } = computeChecksums(header)
    if (storedChecksum !== unsigned && storedChecksum !== signed) {
      throw new Error(
        `Corrupt tar archive: header checksum mismatch at block ${blockIndex} — the archive has been ` +
          `truncated, corrupted, or tampered with.`,
      )
    }

    const magic = header.subarray(257, 262).toString('ascii')
    if (magic !== 'ustar') {
      throw new Error(
        `Unsupported tar archive at block ${blockIndex}: the "ustar" magic is missing.`,
      )
    }

    const typeByte = header[156]
    const typeflag = typeByte === 0 ? '0' : String.fromCharCode(typeByte)
    if (typeflag !== '0' && typeflag !== '5') {
      throw new Error(
        `Unsupported tar entry type at block ${blockIndex}: only regular files ("0") and ` +
          `directories ("5") are supported.`,
      )
    }

    const name = readString(header, 0, NAME_SIZE)
    const prefix = readString(header, 345, PREFIX_SIZE)
    const rawPath = prefix === '' ? name : `${prefix}/${name}`
    const path = typeflag === '5' ? rawPath.replace(/\/+$/, '') : rawPath

    // Tar-slip guard — validated before the entry escapes this function.
    assertSafeEntryPath(path)

    const key = pathCollisionKey(path)
    const previous = seen.get(key)
    if (previous !== undefined) {
      throw new Error(
        `Corrupt tar archive: duplicate entry path "${describePath(path)}" collides with ` +
          `"${describePath(previous)}" after Unicode/case normalisation.`,
      )
    }
    seen.set(key, path)

    const size = typeflag === '5' ? 0 : readOctal(header, 124, 12, 'size')

    // Cap BEFORE the truncation check and BEFORE copying, so a header claiming
    // 8 GiB is rejected without allocating anything.
    totalContentBytes += size
    if (totalContentBytes > maxUncompressedBytes) {
      throw new Error(
        `Tar archive contents are too large: entry "${describePath(path)}" pushes the total past the ` +
          `${maxUncompressedBytes}-byte maxUncompressedBytes cap.`,
      )
    }

    const dataStart = offset + BLOCK_SIZE
    if (dataStart + size > buffer.length) {
      throw new Error(
        `Corrupt tar archive: entry "${describePath(path)}" claims ${size} bytes but the archive ends early.`,
      )
    }

    entries.push({
      path,
      content: new Uint8Array(buffer.subarray(dataStart, dataStart + size)),
      // Mode hygiene: strip setuid/setgid/sticky from whatever the header says.
      mode: readOctal(header, 100, 8, 'mode') & MODE_MASK,
      mtime: readOctal(header, 136, 12, 'mtime'),
      type: typeflag === '5' ? 'directory' : 'file',
    })

    offset = dataStart + Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE
  }

  if (!sawEndOfArchive) {
    throw new Error(
      'Corrupt tar archive: the end-of-archive marker is missing — the archive is truncated.',
    )
  }

  return entries
}

/**
 * Gzip-compresses bytes.
 *
 * Synchronous, like the rest of this codec: the whole artifact is buffered in
 * memory anyway, so there is nothing to stream around.
 *
 * @param data - The bytes to compress.
 * @returns The gzip stream bytes.
 */
export function gzipBytes(data: Uint8Array): Uint8Array {
  return new Uint8Array(gzipSync(toBuffer(data)))
}

/**
 * Gunzip-decompresses bytes, refusing to expand past `maxUncompressedBytes`.
 *
 * This is the decompression-bomb guard: a few KB of gzip can inflate to
 * gigabytes of zeros, so the cap is handed to zlib itself
 * (`maxOutputLength`) — inflation ABORTS at the cap rather than completing and
 * then being measured. The gzip trailer's declared uncompressed size is also
 * checked first, which rejects the obvious bomb before any CPU is spent.
 *
 * @param data - The gzip stream bytes.
 * @param limits - Optional size caps; `maxUncompressedBytes` defaults to 2 GiB.
 * @returns The decompressed bytes.
 * @throws {Error} If the input is not a valid gzip stream, expands beyond
 *   `maxUncompressedBytes`, or `maxUncompressedBytes` is not a positive number.
 */
export function gunzipBytes(data: Uint8Array, limits?: TarLimits): Uint8Array {
  const maxUncompressedBytes = resolveMaxUncompressedBytes(limits)
  const buffer = toBuffer(data)

  // Cheap pre-check: the gzip trailer's ISIZE (little-endian, mod 2^32). A
  // stream that admits up front that it exceeds the cap is rejected without
  // inflating a byte. It can under-report (multi-member streams, sizes past
  // 4 GiB), which is why it is only a fast path — maxOutputLength below is the
  // enforcement.
  if (buffer.length >= 8 && maxUncompressedBytes < 0x100000000) {
    const declared = buffer.readUInt32LE(buffer.length - 4)
    if (declared > maxUncompressedBytes) {
      throw new Error(
        `Refusing to decompress: the gzip stream declares ${declared} uncompressed bytes, past the ` +
          `${maxUncompressedBytes}-byte maxUncompressedBytes cap.`,
      )
    }
  }

  try {
    return new Uint8Array(
      gunzipSync(buffer, {
        maxOutputLength: Math.min(maxUncompressedBytes, bufferConstants.MAX_LENGTH),
      }),
    )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ERR_BUFFER_TOO_LARGE') {
      // Re-thrown with the cap named; zlib's message says only "Cannot create a
      // Buffer larger than N bytes", which does not say WHICH limit fired.
      throw new Error(
        `Refusing to decompress: the gzip stream expands past the ${maxUncompressedBytes}-byte ` +
          `maxUncompressedBytes cap (possible decompression bomb).`,
        { cause: error },
      )
    }
    // Re-thrown with context. zlib's own message ("incorrect header check") is
    // a fixed string — it never contains archive bytes — so it is safe to keep
    // as the `cause`.
    throw new Error('Corrupt artifact: the bytes are not a valid gzip stream.', { cause: error })
  }
}
