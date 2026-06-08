/**
 * SSE / chunked-text reader used by the embeddable chat widget. Kept
 * separate from the React component so unit tests can drive it with
 * mocked Response bodies without rendering a tree.
 *
 * @module
 */

import type { EmbeddableChatStreamEvent } from './types.js'

/**
 * Reads a fetch Response body and yields normalized stream events. Tolerates
 * both SSE-formatted chunks (`data: {json}\n\n`) and plain text chunks (any
 * non-data line is forwarded as a `content` delta).
 *
 * Stops cleanly on `done` events, AbortError, or stream end.
 *
 * @param body - The `ReadableStream` returned by `fetch().body`.
 * @param onEvent - Callback invoked once per parsed event.
 */
export async function readChatStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: EmbeddableChatStreamEvent) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        if (trimmed.startsWith('data:')) {
          const data = trimmed.slice(5).trim()
          if (!data) continue
          dispatch(data, onEvent)
        } else {
          // Plain chunked text — treat as a content delta (with the
          // newline that the split removed restored).
          onEvent({ type: 'content', delta: line + '\n' })
        }
      }
    }
    if (buffer.trim()) {
      const trimmed = buffer.trim()
      if (trimmed.startsWith('data:')) {
        dispatch(trimmed.slice(5).trim(), onEvent)
      } else {
        onEvent({ type: 'content', delta: buffer })
      }
    }
  } finally {
    try {
      reader.releaseLock()
    } catch (_error) {
      // Some polyfills don't support releaseLock — safe to swallow.
    }
  }
}

/**
 * Best-effort parse of a single SSE `data:` payload. JSON payloads with a
 * recognized `type` are forwarded as-is. Anything else is treated as a raw
 * content delta so plain-text backends stream correctly.
 *
 * @param data - The raw payload following `data:` on one SSE line.
 * @param onEvent - Callback invoked with the resulting event.
 */
function dispatch(data: string, onEvent: (event: EmbeddableChatStreamEvent) => void): void {
  if (data === '[DONE]') {
    onEvent({ type: 'done' })
    return
  }
  try {
    const parsed = JSON.parse(data) as Partial<EmbeddableChatStreamEvent> & {
      content?: string
      text?: string
    }
    if (parsed && typeof parsed === 'object' && 'type' in parsed) {
      if (parsed.type === 'content' && typeof parsed.delta === 'string') {
        onEvent({ type: 'content', delta: parsed.delta })
        return
      }
      if (parsed.type === 'done') {
        onEvent({ type: 'done' })
        return
      }
      if (parsed.type === 'error') {
        onEvent({ type: 'error', message: parsed.message ?? '' })
        return
      }
    }
    // OpenAI/Anthropic-shaped payloads with a `content` or `text` field
    // get treated as content deltas for compatibility.
    const fallback = parsed.content ?? parsed.text
    if (typeof fallback === 'string') {
      onEvent({ type: 'content', delta: fallback })
      return
    }
  } catch (_error) {
    // Not JSON — pass through as raw text.
    onEvent({ type: 'content', delta: data })
  }
}
