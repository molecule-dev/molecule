import { describe, expect, it } from 'vitest'

import { readChatStream } from '../stream.js'
import type { EmbeddableChatStreamEvent } from '../types.js'

/**
 * Build a `ReadableStream<Uint8Array>` from a sequence of UTF-8 strings.
 *
 * @param chunks Strings to enqueue (in order).
 */
function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c))
      controller.close()
    },
  })
}

describe('readChatStream', () => {
  it('parses canonical SSE content + done events', async () => {
    const events: EmbeddableChatStreamEvent[] = []
    const stream = streamFrom([
      'data: {"type":"content","delta":"Hi"}\n\n',
      'data: {"type":"content","delta":" there"}\n\n',
      'data: {"type":"done"}\n\n',
    ])
    await readChatStream(stream, (e) => events.push(e))
    expect(events).toEqual([
      { type: 'content', delta: 'Hi' },
      { type: 'content', delta: ' there' },
      { type: 'done' },
    ])
  })

  it('treats [DONE] sentinel as a done event', async () => {
    const events: EmbeddableChatStreamEvent[] = []
    const stream = streamFrom(['data: {"type":"content","delta":"x"}\n\n', 'data: [DONE]\n\n'])
    await readChatStream(stream, (e) => events.push(e))
    expect(events).toEqual([{ type: 'content', delta: 'x' }, { type: 'done' }])
  })

  it('forwards plain chunked text as content deltas', async () => {
    const events: EmbeddableChatStreamEvent[] = []
    const stream = streamFrom(['hello\nworld\n'])
    await readChatStream(stream, (e) => events.push(e))
    expect(events).toEqual([
      { type: 'content', delta: 'hello\n' },
      { type: 'content', delta: 'world\n' },
    ])
  })

  it('translates server error events', async () => {
    const events: EmbeddableChatStreamEvent[] = []
    const stream = streamFrom(['data: {"type":"error","message":"boom"}\n\n'])
    await readChatStream(stream, (e) => events.push(e))
    expect(events).toEqual([{ type: 'error', message: 'boom' }])
  })
})
