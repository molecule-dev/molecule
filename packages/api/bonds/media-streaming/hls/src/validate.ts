/**
 * Path-component validation helpers for the HLS provider.
 *
 * Caller-supplied values (stream ids, transcode profile names, segment
 * indexes) are interpolated into filesystem paths and ffmpeg argument lists.
 * If an application forwards untrusted input, an unvalidated component such as
 * `../../etc` or one containing a shell metacharacter could escape the output
 * directory or alter the ffmpeg invocation. These helpers fail closed: every
 * such component must be a single, allow-listed path segment, and the final
 * resolved path must stay inside its intended base directory.
 *
 * @module
 */

import { resolve, sep } from 'node:path'

/**
 * Allow-list for a single path component: ASCII alphanumerics plus `.`, `_`,
 * and `-`. This excludes path separators (`/`, `\`), NUL, whitespace, and
 * every shell/ffmpeg metacharacter, so a validated component is safe to use
 * both as a filesystem segment and as an ffmpeg argument fragment.
 */
const SAFE_COMPONENT = /^[A-Za-z0-9._-]+$/

/**
 * Asserts that a caller-supplied value is a safe single path component.
 *
 * Rejects empty strings, the relative segments `.` and `..`, anything
 * containing a path separator or NUL byte, and anything outside the
 * `[A-Za-z0-9._-]` allow-list (which also rejects shell metacharacters).
 *
 * @param value - The caller-supplied component (e.g. a stream id or profile name).
 * @param label - Human-readable name of the field, used in the error message.
 * @returns The validated component, unchanged.
 * @throws If the value is not a safe single path component.
 */
export const assertSafePathComponent = (value: string, label: string): string => {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value === '.' ||
    value === '..' ||
    value.includes('\0') ||
    !SAFE_COMPONENT.test(value)
  ) {
    throw new Error(
      `Invalid ${label}: must be a non-empty path component matching [A-Za-z0-9._-] (got ${JSON.stringify(value)})`,
    )
  }
  return value
}

/**
 * Asserts that a caller-supplied segment index is a non-negative integer.
 *
 * @param index - The caller-supplied segment index.
 * @returns The validated index, unchanged.
 * @throws If the value is not a non-negative integer.
 */
export const assertSegmentIndex = (index: number): number => {
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) {
    throw new Error(
      `Invalid segment index: must be a non-negative integer (got ${JSON.stringify(index)})`,
    )
  }
  return index
}

/**
 * Resolves `parts` against `base` and asserts the result stays within `base`.
 *
 * Defense-in-depth on top of {@link assertSafePathComponent}: even if a
 * component slipped through, the resolved absolute path is rejected unless it
 * is `base` itself or a descendant of it.
 *
 * @param base - The intended base directory.
 * @param parts - Path segments to append.
 * @returns The resolved absolute path, guaranteed to be inside `base`.
 * @throws If the resolved path escapes `base`.
 */
export const resolveWithinBase = (base: string, ...parts: string[]): string => {
  const resolvedBase = resolve(base)
  const resolved = resolve(resolvedBase, ...parts)
  if (resolved !== resolvedBase && !resolved.startsWith(resolvedBase + sep)) {
    throw new Error(`Resolved path escapes the output directory: ${JSON.stringify(resolved)}`)
  }
  return resolved
}
