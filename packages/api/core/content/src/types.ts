/**
 * Content types: a directory of front-matter files read into typed records.
 *
 * @module
 */

/**
 * One content file, parsed. The shape every content provider returns, whatever
 * the on-disk format (markdown with YAML front matter today).
 */
export interface ContentRecord {
  /**
   * URL-safe identifier: lowercase letters, digits and hyphens, from the
   * front matter's `slug` when present, else the file name without its
   * extension. Unique within one `readDirectory` call.
   */
  slug: string
  /** The file's path as given to the provider (absolute when the directory was). */
  path: string
  /** The parsed front matter as a plain object (never null; `{}` when the file has none). */
  frontMatter: Record<string, unknown>
  /** The body after the front matter, with the leading blank line removed. */
  body: string
  /** `true` when the front matter says `draft: true`. */
  draft: boolean
  /**
   * The front matter's `date` normalized to an ISO-8601 string when present
   * and valid; `undefined` when the file has no date.
   */
  date?: string
  /** The front matter's `title` when it is a string. */
  title?: string
}

/** Options for `parse` and `readDirectory`. */
export interface ContentReadOptions {
  /** Include records whose front matter says `draft: true`. Defaults to `false`. */
  includeDrafts?: boolean
  /**
   * Front-matter fields every record must carry (non-empty). A file missing
   * one fails loudly with a `ContentValidationError`; nothing is skipped
   * silently. Defaults to `[]`.
   */
  requiredFields?: string[]
}

/** What `parse` reads: the file's source and the path it came from (for errors and `record.path`). */
export interface ContentSource {
  /** The file's full text. */
  source: string
  /** Where it came from; used in error messages and `record.path`. */
  path: string
}

/**
 * The error every provider raises for a malformed file: a missing closing
 * front-matter fence, invalid YAML, front matter that is not a mapping, a
 * required field missing or empty, an invalid slug or date, two files with
 * the same slug. Identified by `code`, never by class, so any provider's
 * error is caught the same way (`isContentValidationError`).
 */
export interface ContentValidationError extends Error {
  /** Always `'CONTENT_VALIDATION'`. */
  code: 'CONTENT_VALIDATION'
  /** The offending file's path. */
  path: string
  /** What was wrong, in one sentence. */
  reason: string
  /** The 1-based line in the file when known. */
  line?: number
}

/**
 * Content provider interface. Bond packages implement it against one on-disk
 * format; application and build code reads records and never parses files.
 */
export interface ContentProvider {
  /** Provider name identifier. */
  readonly name: string
  /**
   * Parses one file's source into a record.
   *
   * @param input - The file's source and path.
   * @param options - Validation options.
   * @returns The record.
   * @throws {ContentValidationError} When the file is malformed.
   */
  parse(input: ContentSource, options?: ContentReadOptions): ContentRecord
  /**
   * Reads every content file under a directory into records, newest first
   * (by `date`, then by `slug`), drafts excluded unless asked for.
   *
   * @param dir - The directory to read.
   * @param options - Validation and filtering options.
   * @returns The records.
   * @throws {ContentValidationError} On the first malformed file, or a duplicate slug.
   */
  readDirectory(dir: string, options?: ContentReadOptions): Promise<ContentRecord[]>
}
