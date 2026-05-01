import { createHash } from 'node:crypto'

import { normalizeFrame } from './normalizeFrame.js'
import { parseStackFrames } from './parseStackFrames.js'
import type { FingerprintInput, FingerprintOptions } from './types.js'

const DEFAULT_TOP_FRAMES = 5

/**
 * Compute a deterministic SHA-1 fingerprint for an error.
 *
 * The fingerprint is a hex SHA-1 of:
 *   1. The error `type` (e.g. `TypeError`), if `includeType` (default).
 *   2. The error `message`, if `includeMessage` (default `false`).
 *   3. The top N normalized frames as `function|file` lines.
 *
 * Two errors thrown from the same call-site will produce the same
 * fingerprint across runs, machines, Node versions, and tmp dirs —
 * use this as the grouping key in an issue tracker.
 *
 * If `stack` is missing or unparseable, the fingerprint falls back to
 * a hash of `(type ?? '') + '\n' + (message ?? '')` so identical "bare"
 * errors still group together. A wholly empty input hashes the empty
 * string — callers should treat that as the "no fingerprint" sentinel.
 *
 * @param input - Error fields. Pass a thrown `Error` after copying its
 *   `name`/`message`/`stack` into this shape (or use the JSON form
 *   delivered over the wire).
 * @param options - Override frame count / path normalizers / what
 *   fields are mixed into the hash.
 * @returns Lowercase 40-char SHA-1 hex string.
 */
export const fingerprintError = (
  input: FingerprintInput,
  options: FingerprintOptions = {},
): string => {
  const topFrames = options.topFrames ?? DEFAULT_TOP_FRAMES
  const includeType = options.includeType ?? true
  const includeMessage = options.includeMessage ?? false

  const parts: string[] = []

  if (includeType && input.type) {
    parts.push(`type:${input.type}`)
  }

  if (includeMessage && input.message) {
    parts.push(`message:${input.message}`)
  }

  const frames = parseStackFrames(input.stack).slice(0, topFrames)
  if (frames.length === 0) {
    // No stack — fall back to type + message so bare errors still group.
    parts.push(`bare:${input.type ?? ''}:${input.message ?? ''}`)
  } else {
    for (const frame of frames) {
      const normalized = normalizeFrame(frame, options)
      parts.push(`frame:${normalized.function}|${normalized.file}`)
    }
  }

  return createHash('sha1').update(parts.join('\n'), 'utf8').digest('hex')
}
