/**
 * Timeline ordering helpers for the chat transcript.
 *
 * @module
 */

/**
 * Minimal structural shape of a timeline item the reordering needs: either a
 * `'message'` (carrying `msg.role` + `msg.timestamp`) or any card kind (carrying
 * `card.timestamp` + an optional `card.placement`). The real ChatPanel items are
 * richer; this captures only the fields the reposition reads, so it stays generic.
 */
interface ReorderableItem {
  kind: string
  msg?: { role: string; timestamp: number }
  card?: { timestamp: number; placement?: string }
}

/**
 * Reposition any card flagged `placement: 'before-response'` so it renders directly
 * before ITS turn's assistant response, regardless of where its emit timestamp lands.
 *
 * Why this exists: a host app's onboarding notice (e.g. molecule.dev's "For free
 * users…" model-intro card) is emitted by the backend BEFORE the model streams, but
 * the frontend creates the streaming assistant placeholder at send-time — sharing the
 * user message's timestamp — so the notice's slightly-later arrival timestamp sorts it
 * AFTER the response. A pure timestamp sort therefore drops it below the question.
 *
 * Anchoring by the USER prompt is stable: the notice belongs before the first assistant
 * message that follows the latest user message at/under the notice's timestamp. The user
 * prompt always precedes the notice in time (the notice is emitted after the prompt is
 * sent), and prompts are far apart, so this picks the right turn in both the live and
 * reloaded transcript. (On reload it's effectively a no-op — the assistant message then
 * carries its server content-finish timestamp, which is already after the notice.)
 *
 * @param items - Timeline items, already sorted ascending by timestamp.
 * @returns A new array with any flagged cards moved before their turn's response;
 *   the same array reference when nothing is flagged.
 */
export function repositionBeforeResponseCards<T extends ReorderableItem>(items: T[]): T[] {
  const isFlagged = (it: T): boolean =>
    it.kind !== 'message' && it.card?.placement === 'before-response'
  if (!items.some(isFlagged)) return items

  const flagged = items.filter(isFlagged)
  const rest = items.filter((it) => !isFlagged(it))

  for (const card of flagged) {
    const cardTs = card.card?.timestamp ?? 0
    // Latest user message at or before the card's timestamp = the card's turn's prompt.
    let anchorUserIdx = -1
    for (let i = 0; i < rest.length; i++) {
      const it = rest[i]
      if (it.kind === 'message' && it.msg?.role === 'user' && it.msg.timestamp <= cardTs) {
        anchorUserIdx = i
      }
    }
    // Insert just before the first assistant message after that prompt; if there's no
    // such prompt or response yet, fall back to the card's natural (end) position.
    let insertIdx = rest.length
    if (anchorUserIdx >= 0) {
      const found = rest.findIndex(
        (it, i) => i > anchorUserIdx && it.kind === 'message' && it.msg?.role === 'assistant',
      )
      if (found >= 0) insertIdx = found
    }
    rest.splice(insertIdx, 0, card)
  }
  return rest
}
