import type { ParacrineAgentId, ParacrineMessage } from '@molecule/api-paracrine'
import { isParacrineAgentId, PARACRINE_BROADCAST } from '@molecule/api-paracrine'

/** Message ids are flat and safe for legacy filenames. */
export const MESSAGE_ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,127}$/

/** Validate one flat agent id and return its branded core type. */
export const assertAgentId = (value: string, role: string): ParacrineAgentId => {
  if (!isParacrineAgentId(value)) {
    throw new Error(
      `Invalid paracrine ${role} id: ${JSON.stringify(value)} — ids are flat ` +
        '[A-Za-z0-9_.:@-] strings (a path here would retarget the mailbox, so ' +
        'malformed ids are refused, not sanitized).',
    )
  }
  return value
}

/** Reject path-shaped or oversized message ids. */
export const assertMessageId = (value: string): void => {
  if (!MESSAGE_ID.test(value)) {
    throw new Error(`Invalid paracrine message id: ${JSON.stringify(value)}`)
  }
}

/** Validate legacy content without coupling sentAt to its old filename timestamp. */
export const legacyMessage = (value: unknown): ParacrineMessage | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.id !== 'string' ||
    !MESSAGE_ID.test(candidate.id) ||
    typeof candidate.from !== 'string' ||
    !isParacrineAgentId(candidate.from) ||
    (candidate.to !== PARACRINE_BROADCAST &&
      (typeof candidate.to !== 'string' || !isParacrineAgentId(candidate.to))) ||
    typeof candidate.body !== 'string' ||
    typeof candidate.sentAt !== 'string' ||
    candidate.sentAt.length > 32 ||
    !Number.isFinite(Date.parse(candidate.sentAt)) ||
    (candidate.subject !== undefined && typeof candidate.subject !== 'string') ||
    (candidate.threadId !== undefined && typeof candidate.threadId !== 'string')
  )
    return null
  return candidate as unknown as ParacrineMessage
}
