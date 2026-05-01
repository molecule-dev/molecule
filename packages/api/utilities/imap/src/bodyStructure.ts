/**
 * Helpers for traversing an IMAP `BODYSTRUCTURE` tree to enumerate message
 * parts. Pure functions — no I/O, no driver imports.
 *
 * @module
 */

import type { ImapBodyNode } from './driverTypes.js'

/**
 * A single discovered body part with its IMAP part-number identifier and
 * decoded metadata.
 *
 * @internal
 */
export interface DiscoveredPart {
  part: string
  type: string
  encoding?: string
  filename?: string
  contentId?: string
  disposition?: string
  inline: boolean
  size: number
}

/**
 * Walk an IMAP `BODYSTRUCTURE` tree depth-first and yield each leaf part
 * with its IMAP part-number identifier (`1`, `1.1`, `2`, …).
 *
 * Multipart container nodes are skipped — only leaf parts (text, html,
 * attachments) are returned.
 *
 * @param root - Root `BODYSTRUCTURE` node from a fetch response.
 * @returns Flat array of discovered leaf parts in encounter order.
 */
export function flattenBodyStructure(root: ImapBodyNode | undefined): DiscoveredPart[] {
  if (!root) return []
  const out: DiscoveredPart[] = []
  walkPart(root, out, '1')
  return out
}

function walkPart(node: ImapBodyNode, out: DiscoveredPart[], path: string): void {
  if (Array.isArray(node.childNodes) && node.childNodes.length > 0) {
    for (let i = 0; i < node.childNodes.length; i++) {
      // Multipart parts use 1-indexed child paths joined with dots; the root
      // multipart itself is not addressable as a part on its own.
      const childPath = path === '' ? String(i + 1) : `${path}.${i + 1}`
      walkPart(node.childNodes[i], out, childPath)
    }
    return
  }

  const filename = node.dispositionParameters?.filename ?? node.parameters?.name ?? undefined
  const disposition = node.disposition?.toLowerCase()
  const inline = disposition === 'inline' || (disposition === undefined && Boolean(node.id))

  out.push({
    part: node.part ?? path,
    type: (node.type ?? 'application/octet-stream').toLowerCase(),
    encoding: node.encoding,
    filename,
    contentId: node.id ? stripAngleBrackets(node.id) : undefined,
    disposition,
    inline,
    size: node.size ?? 0,
  })
}

function stripAngleBrackets(value: string): string {
  if (value.startsWith('<') && value.endsWith('>')) {
    return value.slice(1, -1)
  }
  return value
}

/**
 * Determine whether a {@link DiscoveredPart} is a text body part (plain or
 * HTML) — used to populate {@link import('./types.js').FullMessage}'s
 * `text` / `html` fields.
 *
 * @param part - The discovered part.
 * @returns `'text'`, `'html'`, or `undefined`.
 */
export function classifyTextPart(part: DiscoveredPart): 'text' | 'html' | undefined {
  if (part.disposition === 'attachment' || part.filename) return undefined
  if (part.type === 'text/plain') return 'text'
  if (part.type === 'text/html') return 'html'
  return undefined
}

/**
 * Determine whether a {@link DiscoveredPart} should be returned as a
 * structured attachment.
 *
 * @param part - The discovered part.
 * @returns `true` if the part should be exposed as an attachment.
 */
export function isAttachmentPart(part: DiscoveredPart): boolean {
  if (part.disposition === 'attachment') return true
  if (part.filename) return true
  // Inline images with a Content-ID (referenced by HTML) are also surfaced as
  // attachments so the consumer can resolve `cid:` references.
  if (part.contentId) return true
  return false
}
