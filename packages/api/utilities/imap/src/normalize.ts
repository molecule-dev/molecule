/**
 * Pure normalization helpers — convert raw `imapflow` data structures into
 * the `@molecule/api-imap` public shapes. Kept dependency-free so they can
 * be unit-tested in isolation.
 *
 * @module
 */

import type {
  ImapBodyNode,
  ImapEnvelope,
  ImapEnvelopeAddress,
  ImapListResponse,
} from './driverTypes.js'
import type { ImapAddress, ImapFolder } from './types.js'

/**
 * Convert an `imapflow` envelope-address array into the normalized
 * {@link ImapAddress} shape, dropping entries that have no `address`.
 *
 * @param raw - Driver address list.
 * @returns Normalized addresses (always an array, possibly empty).
 */
export function normalizeAddresses(raw: ImapEnvelopeAddress[] | undefined): ImapAddress[] {
  if (!raw) return []
  const out: ImapAddress[] = []
  for (const entry of raw) {
    if (!entry.address) continue
    const next: ImapAddress = { address: entry.address }
    if (entry.name) next.name = entry.name
    out.push(next)
  }
  return out
}

/**
 * Coerce an envelope `date` field (which may be `Date | string | undefined`)
 * into a `Date`. Falls back to the unix epoch if parsing fails so callers
 * never have to handle `NaN`-dates.
 *
 * @param raw - Driver date value.
 * @returns Parsed `Date` (epoch on parse failure).
 */
export function normalizeDate(raw: Date | string | undefined): Date {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw
  if (typeof raw === 'string') {
    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date(0)
}

/**
 * Coerce an `imapflow` flags representation (which may be a `Set<string>`,
 * an array, or undefined) into a stable string array.
 *
 * @param raw - Driver flags container.
 * @returns Flag list (possibly empty).
 */
export function normalizeFlags(raw: Set<string> | string[] | undefined): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return [...raw]
  return [...raw.values()]
}

/**
 * Convert an `imapflow` list-response into our normalized
 * {@link ImapFolder} shape.
 *
 * @param raw - Single driver list entry.
 * @returns Normalized folder.
 */
export function normalizeFolder(raw: ImapListResponse): ImapFolder {
  const delimiter = raw.delimiter ?? '/'
  const segments = raw.path.split(delimiter)
  const name = raw.name ?? segments[segments.length - 1] ?? raw.path
  const folder: ImapFolder = {
    path: raw.path,
    name,
    delimiter,
    subscribed: raw.subscribed ?? false,
  }
  if (raw.specialUse) folder.specialUse = raw.specialUse
  return folder
}

/**
 * Normalize an envelope's subject — `imapflow` may report `undefined` when
 * the message has no Subject header. We always return a string so callers
 * can render uniformly.
 *
 * @param raw - Envelope subject.
 * @returns Subject string (empty when missing).
 */
export function normalizeSubject(raw: string | undefined): string {
  return raw?.trim() ?? ''
}

/**
 * Walk a `BODYSTRUCTURE` tree and decide whether the message has at least
 * one non-inline attachment.
 *
 * @param root - Root body-structure node from a fetch response.
 * @returns `true` if the message has any attachment-disposition part with a
 *   non-empty filename.
 */
export function detectHasAttachments(root: ImapBodyNode | undefined): boolean {
  if (!root) return false
  return walkForAttachment(root)
}

/**
 * Recursively walk a BODYSTRUCTURE node tree, returning `true` on the first
 * part whose disposition is `attachment` or whose filename is non-empty and
 * not `inline`.
 */
function walkForAttachment(node: ImapBodyNode): boolean {
  const disposition = node.disposition?.toLowerCase()
  const filename = node.dispositionParameters?.filename ?? node.parameters?.name ?? undefined
  if (disposition === 'attachment') return true
  if (filename && disposition !== 'inline') return true
  if (Array.isArray(node.childNodes)) {
    for (const child of node.childNodes) {
      if (walkForAttachment(child)) return true
    }
  }
  return false
}

/**
 * Normalize `imapflow`'s `envelope` shape into the trio of fields we expose
 * on a {@link import('./types.js').FullMessage}.
 *
 * @param envelope - Driver envelope (may be partially populated).
 * @returns Normalized fields.
 */
export function normalizeEnvelope(envelope: ImapEnvelope | undefined): {
  from: ImapAddress[]
  to: ImapAddress[]
  cc: ImapAddress[]
  subject: string
  date: Date
} {
  return {
    from: normalizeAddresses(envelope?.from),
    to: normalizeAddresses(envelope?.to),
    cc: normalizeAddresses(envelope?.cc),
    subject: normalizeSubject(envelope?.subject),
    date: normalizeDate(envelope?.date),
  }
}
