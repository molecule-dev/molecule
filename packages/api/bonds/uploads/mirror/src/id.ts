/**
 * Mirror id encoding: `mir1.` + base64url(JSON `[[targetName, targetId], …]`).
 *
 * Callers must treat the id as opaque — store it and pass it back unchanged.
 *
 * @module
 */

import type { MirrorCopy } from './types.js'

/**
 * Prefix every mirror id starts with. The `1` is the format version.
 */
export const MIRROR_ID_PREFIX = 'mir1.'

/**
 * Pattern a target name must match.
 */
export const MIRROR_TARGET_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/

/**
 * Encodes copies into a mirror id.
 *
 * @param copies - The stored copies, in target order.
 * @returns The mirror id.
 */
export const encodeMirrorId = (copies: MirrorCopy[]): string =>
  MIRROR_ID_PREFIX +
  Buffer.from(JSON.stringify(copies.map((copy) => [copy.target, copy.id])), 'utf8').toString(
    'base64url',
  )

/**
 * Decodes a mirror id.
 *
 * @param id - Any id.
 * @returns The copies in id order, or `null` when `id` is not a well-formed mirror id.
 */
export const decodeMirrorId = (id: string): MirrorCopy[] | null => {
  if (typeof id !== 'string' || !id.startsWith(MIRROR_ID_PREFIX)) return null
  const body = id.slice(MIRROR_ID_PREFIX.length)
  if (!body || !/^[A-Za-z0-9_-]+$/.test(body)) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch (_error) {
    // Intentional noop — a body that is not JSON simply is not a mirror id; the
    // caller treats `null` as "a raw id" by contract.
    return null
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null
  const seen = new Set<string>()
  const copies: MirrorCopy[] = []
  for (const entry of parsed) {
    if (!Array.isArray(entry) || entry.length !== 2) return null
    const [target, targetId] = entry as unknown[]
    if (typeof target !== 'string' || !MIRROR_TARGET_NAME_PATTERN.test(target)) return null
    if (typeof targetId !== 'string' || targetId.length === 0) return null
    if (seen.has(target)) return null
    seen.add(target)
    copies.push({ target, id: targetId })
  }
  return copies
}
