import { describe, expect, it } from 'vitest'

import { timelineSortKey } from '../chatTimelineOrdering.js'

/** Build a message item. */
const msg = (
  timestamp: number,
  opts: { isStreaming?: boolean; content?: string; blocks?: unknown[] } = {},
) => ({ kind: 'message' as const, msg: { timestamp, ...opts } })
/** Build a card item. */
const card = (timestamp: number) => ({ kind: 'system' as const, card: { timestamp } })

describe('timelineSortKey', () => {
  it('orders a normal message by its timestamp', () => {
    expect(timelineSortKey(msg(42))).toBe(42)
  })

  it('orders a card by its timestamp', () => {
    expect(timelineSortKey(card(42))).toBe(42)
  })

  it('sorts an empty streaming message LAST (it is the pending response)', () => {
    expect(timelineSortKey(msg(10, { isStreaming: true }))).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('orders a streaming message that already has content by its timestamp', () => {
    // After useChat re-stamps it to first-content time, it sorts by time again.
    expect(timelineSortKey(msg(20, { isStreaming: true, blocks: [{}] }))).toBe(20)
    expect(timelineSortKey(msg(20, { isStreaming: true, content: 'hi' }))).toBe(20)
  })

  it('does NOT special-case a finished (non-streaming) empty message', () => {
    expect(timelineSortKey(msg(15, { isStreaming: false }))).toBe(15)
  })

  it('places the turn preamble ABOVE the still-thinking response (the reported bug)', () => {
    // Live: user + empty streaming placeholder share the send-time ts (34); the
    // preamble cards arrive a beat later (35..37). The empty response must sort last.
    const items = [
      msg(34), // user prompt
      msg(34, { isStreaming: true }), // empty streaming assistant placeholder
      card(35), // "Building your app"
      card(36), // "now using deepseek"
      card(37), // "loaded 9 skills"
    ]
    const order = [...items].sort((a, b) => timelineSortKey(a) - timelineSortKey(b))
    // The empty streaming response is last; the three cards sit above it.
    expect(order[order.length - 1]).toBe(items[1])
    expect(order.slice(0, 4)).toEqual([items[0], items[2], items[3], items[4]])
  })

  it('keeps the preamble above once the response has content (re-stamped after them)', () => {
    const items = [
      msg(34), // user prompt
      card(35),
      card(36),
      card(37),
      msg(40, { isStreaming: true, content: 'reading files…' }), // re-stamped to first-content
    ]
    const order = [...items].sort((a, b) => timelineSortKey(a) - timelineSortKey(b))
    expect(order).toEqual(items) // already in the right order; response stays last
  })
})
