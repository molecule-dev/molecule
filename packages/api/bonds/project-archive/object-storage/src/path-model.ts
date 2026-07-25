/**
 * The ONE canonical path model: what a part path's SEGMENTS are, and every
 * matching primitive built on them.
 *
 * This module exists because the same package used to hold three different
 * answers to "where does a path segment end", and the defects kept resurfacing
 * in whichever copy was not fixed last:
 *
 * - the tar codec split on `/[/\\]/` and folded `'\'` onto `'/'`, so path
 *   safety and collision detection treated a backslash as a separator;
 * - the provider's policy check split on `'/'` alone, so `'\'` was an ORDINARY
 *   CHARACTER to the one rule that keeps credentials out of the artifact;
 * - the advisory filter carried a third rule of its own for basenames.
 *
 * The measured consequence, reproduced against the built package:
 * `archive({ parts: [{ path: 'config\\.env', … }] })` was accepted, uploaded and
 * reported `verified: true` — a live dotenv secret written into object storage
 * that is NOT encrypted at rest — because the segment the secrets rule needed to
 * see (`.env`) only exists once `'\'` is understood as a separator. `.env\prod.key`,
 * `.env ` and ` .env` did the same. So did `node_modules\pkg\index.js`, which
 * escaped both the refusal and the excludes filter.
 *
 * Therefore:
 *
 * 1. **{@link segmentsOf} is the ONLY place in this package that splits a
 *    path.** A test greps every non-test source file to keep it that way
 *    (`__tests__/path-model.test.ts` → "there is exactly ONE place that decides
 *    what a path's segments are"). If you need segments, import them; do not
 *    write `.split('/')`.
 * 2. **Every rule consumes {@link normalizePartPath}'s segments** — path
 *    safety, the policy refusal, the advisory filter, and collision detection.
 * 3. **Normalisation is a TEST, not a transformation.** A path whose
 *    normalisation would change it is REJECTED by
 *    `assertSafePartPath` (`./tar.js`) rather than silently rewritten: the path
 *    the caller sent and the path the manifest records must be identical, or
 *    the manifest describes a tree the caller did not send — immediately before
 *    the caller deletes the original.
 *
 * Unicode is normalised to NFC for COMPARISON only ({@link foldedSegment},
 * {@link pathComparisonKey}), never in the stored path: a decomposed filename is
 * a legitimate filename, and rewriting one would break the round trip this
 * package exists to guarantee.
 *
 * @module
 */

/**
 * Path separators this package recognises: POSIX `'/'` and Windows `'\'`.
 *
 * A caller that walked a workspace with `path.join()` on win32 hands over
 * backslash-separated paths, and an attacker-influenced path list can spell a
 * separator either way on purpose. Both are separators to EVERY rule here, or
 * they are a hole in whichever rule disagrees.
 */
const SEPARATORS = /[/\\]/

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
   * This is the array EVERY rule matches against — the policy refusal, the
   * advisory filter, and path safety alike.
   */
  segments: string[]

  /**
   * True when normalising CHANGED the input — it contained a `'\'`, a repeated
   * or trailing separator, or a whitespace-padded segment.
   *
   * A provider REFUSES such a path rather than storing the normalised form; see
   * `assertSafePartPath` (`./tar.js`).
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
 * belongs to `assertSafePartPath` (`./tar.js`), which refuses it.
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
 * The comparison form of one segment: Unicode NFC, lower-cased.
 *
 * Comparison only — never stored. A precomposed `é` and a decomposed `é` are the
 * same filename to a filesystem, and so are `.env` and `.ENV` on the
 * case-insensitive filesystems developers author them on.
 *
 * @param segment - The segment to fold.
 * @returns Its case- and composition-folded form.
 */
export function foldedSegment(segment: string): string {
  return segment.trim().normalize('NFC').toLowerCase()
}

/**
 * The key two paths are compared by when deciding whether they would overwrite
 * each other on restore.
 *
 * Built from the canonical model, so `a\b`, `a//b` and `a/b/` all key the same
 * as `a/b`, then NFC-folded and lower-cased so a case-insensitive or
 * composition-folding filesystem cannot silently replace one entry with
 * another.
 *
 * @param path - The path to key.
 * @returns The comparison key.
 */
export function pathComparisonKey(path: string): string {
  return normalizePartPath(path).path.normalize('NFC').toLowerCase()
}

/**
 * Tests whether a path's canonical segments contain `entry` at ANY depth,
 * case-SENSITIVELY.
 *
 * The rule behind `ArchivePolicy.refuseSegments` and the advisory filter's
 * any-segment set. Segment-based, never substring-based: `'node_modules'`
 * matches `api/node_modules/x` but never `node_modules_notes.md`.
 *
 * @param segments - The path's canonical segments.
 * @param entry - The segment to look for.
 * @returns True when any segment equals the entry.
 */
export function matchesAnySegment(segments: readonly string[], entry: string): boolean {
  return segments.includes(entry)
}

/**
 * Tests whether `entry`, read as a leading path, contains the path.
 *
 * `'build'` matches `build` and `build/bundle.js`, and NOT `src/build/compiler.ts`
 * — the anchoring that stopped the filter from deleting real source. A caller
 * that genuinely wants a deeper subtree gone names it (`'packages/api/dist'`),
 * and this rule honours it the same way.
 *
 * @param segments - The path's canonical segments.
 * @param entrySegments - The entry's canonical segments.
 * @returns True when the entry is a leading path of (or equal to) the path.
 */
export function matchesAnchoredPath(
  segments: readonly string[],
  entrySegments: readonly string[],
): boolean {
  if (entrySegments.length === 0 || entrySegments.length > segments.length) return false
  return entrySegments.every((value, index) => segments[index] === value)
}

/**
 * Tests the DOT-ENTRY family rule: a basename equal to the entry, or prefixed
 * by `'<entry>.'` — and ONLY for an entry that itself starts with `'.'`.
 *
 * @remarks
 * The dot restriction is the whole point, and it is the fix for the same
 * defect class twice over. The family rule exists so `'.env'` also catches
 * `.env.local` and `.env.production` — the same secret in a different file —
 * and so `'.DS_Store'` is caught wherever it sits. Applied to a PLAIN DIRECTORY
 * name it silently deletes real work: measured against the shipped filter with
 * `NODE_PROJECT_EXCLUDES`, `'tmp'` ate `src/tmp.ts`, `'build'` ate
 * `src/build.rs` and `lib/build.gradle`, `'dist'` ate `src/dist.config.js`, and
 * every one of `.git/refs/heads/dist`, `.git/refs/tags/build` and
 * `.git/logs/refs/heads/tmp` was dropped — corrupting the history of the one
 * directory this package deliberately keeps, because history is user work and
 * is not reproducible from a source snapshot.
 *
 * A non-dot entry therefore matches a DIRECTORY (via
 * {@link matchesAnchoredPath} / {@link matchesAnySegment}) and never a filename
 * or a filename prefix.
 *
 * CASE-SENSITIVE, like the POSIX paths these archives are built from. The
 * POLICY's secret rule deliberately differs — see `matchesSecretSegment`.
 *
 * @param basename - The path's last canonical segment.
 * @param entry - The exclude entry.
 * @returns True when the entry is dot-shaped and the basename is in its family.
 */
export function matchesDotFamily(basename: string, entry: string): boolean {
  if (!entry.startsWith('.')) return false
  return basename === entry || basename.startsWith(`${entry}.`)
}

/**
 * Tests one canonical segment against one `ArchivePolicy.refuseFilePrefixes`
 * entry — equal to it, or prefixed by `'<entry>.'` — comparing
 * CASE-INSENSITIVELY and under NFC.
 *
 * @remarks
 * Three widenings over the obvious implementation, each of which closed a real
 * credential leak: a secrets file that reached plaintext object storage.
 *
 * 1. **Case-insensitive.** `.ENV`, `.Env` and `.eNv.production` were NOT
 *    refused under a case-sensitive compare, yet every dotenv loader reads them
 *    and developers author them on the case-insensitive filesystems (macOS,
 *    Windows) where they are literally the same file. The asymmetry with
 *    `ArchivePolicy.refuseSegments` — which stays case-SENSITIVE, because Linux
 *    paths are and `Build/` may be a real source directory a refusal would throw
 *    over — is deliberate and is about what a miss COSTS: missing reproducible
 *    bulk wastes bytes and nothing else, while missing a secret writes a live
 *    credential into an artifact that is not encrypted at rest, and rotating the
 *    credential is the only remedy left.
 * 2. **Every path segment, not just the basename.** A `.env` DIRECTORY holds
 *    exactly the same credentials as a `.env` file, so `.env/prod.key` and
 *    `config/.env/staging` must be refused too. A basename-only compare
 *    archived every one of them, because the basename of `.env/prod.key` is
 *    `prod.key`, which matches nothing.
 * 3. **On the CANONICAL segment, and trimmed again here.** `config\.env`,
 *    `.env\prod.key`, `.env ` and ` .env` all reached storage while this rule
 *    read raw `'/'`-split text. The canonical model already folds the separator
 *    and trims the segment; folding again inside this function is deliberate
 *    belt-and-braces, because it is the one rule whose failure cannot be undone.
 *
 * @param segment - One canonical segment of the part's path.
 * @param prefix - The refused prefix entry to test against.
 * @returns True when the segment belongs to that prefix's family.
 */
export function matchesSecretSegment(segment: string, prefix: string): boolean {
  const folded = foldedSegment(segment)
  const foldedPrefix = foldedSegment(prefix)
  if (foldedPrefix === '') return false
  return folded === foldedPrefix || folded.startsWith(`${foldedPrefix}.`)
}
