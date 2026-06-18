/**
 * Timeline ordering for the chat transcript.
 *
 * @module
 */

/** The minimal shape {@link timelineSortKey} reads from a timeline item. */
interface OrderableItem {
  kind: string
  msg?: { timestamp: number; isStreaming?: boolean; content?: string; blocks?: unknown[] }
  card?: { timestamp: number }
}

/**
 * Sort key for a chat-timeline item (message or any card). Items normally order by
 * their `timestamp`, with ONE exception: a streaming assistant message that has not
 * yet produced any content sorts LAST.
 *
 * Why: a turn's preamble cards (the model / "Building your app" notices, the
 * "models_intro" note, the onboarding tip) are emitted a beat BEFORE the response
 * content. The server defers each assistant message's `message_start` — and thus its
 * timestamp — to that message's FIRST content event, so the message is timestamped when
 * it visually appears, strictly after every preamble item, and orders below them. This
 * rule only covers the brief window between `message_start` and the first flushed
 * content: while still empty the message sorts last (bottom of the turn) instead of
 * leap-frogging the cards on an earlier timestamp; once content lands it orders by its
 * first-content timestamp, still after the preamble. No card opts in by name, and because
 * that timestamp is the server's persisted value, live and reload order identically.
 *
 * @param item - A timeline item.
 * @returns The numeric key to sort ascending by.
 */
export function timelineSortKey(item: OrderableItem): number {
  if (item.kind === 'message' && item.msg) {
    const m = item.msg
    const empty = !m.content && (!m.blocks || m.blocks.length === 0)
    if (m.isStreaming && empty) return Number.MAX_SAFE_INTEGER
    return m.timestamp
  }
  return item.card?.timestamp ?? 0
}
