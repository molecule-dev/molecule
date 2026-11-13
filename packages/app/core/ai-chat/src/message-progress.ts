/**
 * How far along a chat message is, and how a tool call's output reads.
 *
 * Internal to the chat session and the history merge; not exported from the
 * package barrel.
 *
 * @module
 */

import type { ChatMessage } from './types.js'

/**
 * Tool-call outputs that mean "this call is still open", not "this call
 * finished". The server writes these sentinels when a call is waiting on the
 * USER — an `ask_user` card, a hook-confirm gate — so a stored copy carrying
 * one is BEHIND a live copy whose card the user has just answered. A bare
 * `output !== undefined` check reads them as finished and scores the two copies
 * equal, which is how an answered card got rewound to unanswered.
 */
const PENDING_TOOL_OUTPUT_STATUSES = new Set(['awaiting_response', 'blocked_by_hook'])

/**
 * Whether a tool call's output represents a RESOLVED call rather than one still
 * waiting on the user.
 *
 * @param output - The tool call's output, as streamed or as persisted.
 * @returns `true` when the call has a real result.
 */
function isResolvedToolOutput(output: unknown): boolean {
  if (output === undefined) return false
  const status = (output as { status?: unknown } | null)?.status
  return !(typeof status === 'string' && PENDING_TOOL_OUTPUT_STATUSES.has(status))
}

/**
 * Rough forward-progress score for one message — how much of a streaming turn it
 * already holds. Used by `convergeHistory` to decide, per message id, whether
 * the server snapshot or the locally-accumulated live copy is further along, so
 * applying a history can only ever ADD content, never visibly rewind text a
 * pushed delta already rendered (the snapshot is throttled server-side, and the
 * full transcript is persisted only when the turn ENDS, so it can trail the
 * live frames by anything from a few seconds to a whole turn).
 *
 * @param m - The message to score.
 * @returns A monotonic-ish progress score.
 */
export function messageProgress(m: ChatMessage): number {
  let score = m.content.length
  if (m.toolCalls) {
    for (const tc of m.toolCalls) {
      score += 50 // each started tool call is progress
      // …and each RESOLVED one, more. A call still marked awaiting_response /
      // blocked_by_hook has not finished, so it must not score as though it had.
      if (isResolvedToolOutput(tc.output)) score += 50
      score += tc.streamInputChars ?? 0
    }
  }
  if (m.blocks) {
    for (const b of m.blocks) {
      score +=
        typeof (b as { content?: unknown }).content === 'string'
          ? ((b as { content: string }).content?.length ?? 0)
          : 10
    }
  }
  return score
}

/**
 * Derive a tool call's terminal status from its output. MUST match the http
 * provider's loadHistory derivation so the live and reloaded tool cards agree
 * (status is not persisted — both sides derive it from `output`).
 *
 * A call the person skipped (`skipped_by_user`) or a restart interrupted
 * (`interrupted_by_restart`) is terminal but neither a success nor a failure:
 * it derives 'done' here (finished, nothing to wait for), and the tool card
 * reads the output's `status` to show it gray with its own word, never green.
 *
 * @param output - The tool call's output payload.
 * @returns 'error' if the output looks like an error object, else 'done'.
 */
export function deriveToolStatus(output: unknown): 'done' | 'error' {
  return typeof output === 'object' && output !== null && 'error' in output ? 'error' : 'done'
}
