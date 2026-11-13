/**
 * Applying a server transcript to a live chat view without rewinding it.
 *
 * @module
 */

import { messageProgress } from './message-progress.js'
import type { ChatMessage } from './types.js'

/**
 * Converge a live store on a fresh server history WITHOUT rewinding anything
 * already on screen. This is the ONE place a server transcript is applied to a
 * local view — the page-lifecycle/push reconcile, the remote-turn poll, the
 * dropped-stream reconcile and the resume poll all go through it, because two
 * paths that almost agree is how a message came to vanish and come back
 * (reported 2026-09-21).
 *
 * Per message id the further-along copy wins (a progress score over text, tool
 * calls and blocks); a TIE keeps the local copy, so an unchanged transcript
 * returns the same object references and a poll neither churns the view nor
 * rewinds. Messages only the server has are added in the server's order
 * (filling gaps a watcher missed); messages only the store has
 * ({@link localOnlyMessages} — an answer still carrying its local id, a
 * session-local card, a turn the server has not persisted yet) are kept after
 * them.
 *
 * @param prev - The store's current messages.
 * @param history - The messages from the server's history endpoint.
 * @returns The converged message list.
 */
export function convergeHistory(prev: ChatMessage[], history: ChatMessage[]): ChatMessage[] {
  const prevById = new Map(prev.map((m) => [m.id, m]))
  const merged = history.map((h) => {
    const local = prevById.get(h.id)
    if (!local) return h
    if (local.queued) return h
    if (h.queued) return local
    // Keep the live copy when it is at least as far along; carry its streaming
    // flag either way so an in-progress message keeps its spinner across merges.
    const winner = messageProgress(local) >= messageProgress(h) ? local : h
    return local.isStreaming && !winner.isStreaming ? { ...winner, isStreaming: true } : winner
  })
  const extras = localOnlyMessages(prev, history)
  return extras.length > 0 ? [...merged, ...extras] : merged
}

/**
 * The messages only the local store holds, given a server history: optimistic
 * bubbles and session-local cards, minus the optimistic ECHO of a send the
 * server already persisted. A local user message carries a local id
 * (`user-N`), the server's copy a server id, so ids never match — content does.
 * Without this, the dashboard's first prompt (auto-sent by the workspace,
 * then merged back in from history by the remote-stream poll) rendered as two
 * identical user bubbles in every new project (2026-09-08).
 *
 * @param prev - The store's current messages.
 * @param history - The server's history.
 * @returns The local-only messages to keep after the merged history.
 */
export function localOnlyMessages(prev: ChatMessage[], history: ChatMessage[]): ChatMessage[] {
  const historyIds = new Set(history.map((m) => m.id))
  const serverUserContents = new Set(history.filter((m) => m.role === 'user').map((m) => m.content))
  return prev.filter(
    (m) =>
      !historyIds.has(m.id) &&
      !(m.role === 'user' && !m.queued && serverUserContents.has(m.content)),
  )
}
