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
 * Why: the streaming placeholder is created at turn-start, sharing the user message's
 * timestamp — but a turn's preamble cards ("Building your app", the model / "loaded N
 * skills" notices, the onboarding tip) are emitted a beat later, so a plain timestamp
 * sort would drop every one of them BELOW the whole streamed response. Sorting the
 * still-empty (thinking) response last instead renders it as the bottom of the turn,
 * with the preamble above it. Once content arrives, useChat re-stamps the message to
 * that moment, so it then orders naturally by time — still after the preamble cards,
 * because they were emitted before its content. No card needs to opt in by name.
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
