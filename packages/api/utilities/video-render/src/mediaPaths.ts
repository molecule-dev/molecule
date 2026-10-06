/**
 * Confinement of untrusted file references to configured directories.
 *
 * The HTTP handler receives clip sources from a request body. A client must
 * never be able to point ffmpeg at an arbitrary local file, at a URL ffmpeg
 * would fetch (cloud metadata endpoints, internal services), or choose where
 * the rendered file is written. These helpers resolve every client-supplied
 * source against a server-configured media root and mint output paths inside
 * a server-configured output directory.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'
import { realpathSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'

/** Matches a leading URL scheme such as `http:`, `file:` or `data:`. */
const SCHEME_RE = /^[A-Za-z][A-Za-z0-9+.-]*:/

/**
 * Whether a path string contains a `..` segment (with `/` or `\` separators).
 *
 * @param value - The path to inspect.
 * @returns `true` when any segment is exactly `..`.
 */
export function hasTraversalSegment(value: string): boolean {
  return value.split(/[\\/]/).some((segment) => segment === '..')
}

/**
 * Resolve a client-supplied media source to an absolute path inside
 * `mediaRoot`. Relative paths are resolved against the root; absolute paths
 * are accepted only when they already sit inside it.
 *
 * @param source - The untrusted source string from the request.
 * @param mediaRoot - The directory every source must live under.
 * @param label - Field name used in error messages.
 * @returns The absolute, confined path.
 * @throws {TypeError} If the source is not a string, carries a URL scheme,
 *   contains a `..` segment, does not exist, or resolves (through a symlink or
 *   not) outside `mediaRoot`.
 */
export function resolveMediaSource(source: unknown, mediaRoot: string, label: string): string {
  if (typeof source !== 'string' || source.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`)
  }
  if (SCHEME_RE.test(source)) {
    throw new TypeError(`${label} must be a path inside the media root, not a URL`)
  }
  if (hasTraversalSegment(source)) {
    throw new TypeError(`${label} must not contain '..' segments`)
  }
  const root = resolve(mediaRoot)
  const resolved = isAbsolute(source) ? resolve(source) : resolve(root, source)
  const rel = relative(root, resolved)
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new TypeError(`${label} must resolve to a file inside the media root`)
  }
  // The check above is on the NAME. A symlink inside the root can point anywhere, and ffmpeg
  // follows it, so the file the name really reaches must sit inside the real root too. The
  // resolved real path is what is returned, so what is checked is what is opened.
  let realRoot: string
  let realTarget: string
  try {
    realRoot = realpathSync(root)
    realTarget = realpathSync(resolved)
  } catch (error) {
    throw new TypeError(`${label} must be an existing file inside the media root`, {
      cause: error,
    })
  }
  const realRel = relative(realRoot, realTarget)
  if (realRel === '' || realRel.startsWith('..') || isAbsolute(realRel)) {
    throw new TypeError(`${label} must resolve to a file inside the media root`)
  }
  return realTarget
}

/**
 * Mint a fresh output path inside `outputDir` from a random UUID.
 *
 * @param outputDir - The directory rendered files are written to.
 * @param extension - File extension without the dot (e.g. `mp4`).
 * @returns An absolute output path no client input contributed to.
 */
export function createOutputPath(outputDir: string, extension: string): string {
  return join(resolve(outputDir), `${randomUUID()}.${extension}`)
}
