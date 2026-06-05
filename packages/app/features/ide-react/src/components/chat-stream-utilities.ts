/**
 * Helpers for the live streaming-message indicator (token estimate).
 *
 * @module
 */

/**
 * Cache of a tool input's serialized character length, keyed by the input object.
 * A completed tool input is immutable, so we serialize it ONCE and reuse the length
 * on every subsequent render. Without this, {@link estimateStreamTokens} ran a full
 * `JSON.stringify` over EVERY tool call's input — and a `write_file` input is the
 * whole file content — on every ~50ms stream flush. That is O(total content) per
 * flush, i.e. O(n²) across a build, which pegged the main thread and froze the IDE
 * on large builds. A WeakMap auto-evicts entries once the input objects are GC'd.
 */
const toolInputCharCache = new WeakMap<object, number>()

/**
 * Character length of a tool call's input, for the live token estimate. While the
 * input is still streaming, counts the bytes seen so far; once the final input has
 * arrived, serializes it ONCE and caches the length by object identity.
 * @param tc - The tool call.
 * @param tc.input - The final tool input, once it has fully arrived.
 * @param tc.streamInputChars - Bytes of the input received so far while streaming.
 * @returns Approximate character length of the input.
 */
export function toolInputChars(tc: { input?: unknown; streamInputChars?: number }): number {
  const input = tc.input
  // Still streaming — the final input object hasn't arrived; count bytes so far.
  if (input === undefined || input === null) return tc.streamInputChars ?? 0
  if (typeof input === 'object') {
    const cached = toolInputCharCache.get(input)
    if (cached !== undefined) return cached
    let len = 0
    try {
      len = JSON.stringify(input).length
    } catch {
      /* unserializable input — skip */
    }
    toolInputCharCache.set(input, len)
    return len
  }
  try {
    return JSON.stringify(input).length
  } catch {
    return 0
  }
}

/**
 * Rough estimate of tokens generated so far in a streaming message (~4 chars/token),
 * from the assistant text + thinking content + tool-call inputs. Cheap to call on
 * every stream flush: string lengths are O(1) and each completed tool input's length
 * is cached (see {@link toolInputChars}), so this is O(blocks + toolCalls), NOT
 * O(total content) — the difference between a smooth stream and a frozen tab.
 * @param msg - The streaming assistant message.
 * @param msg.content - Accumulated assistant text.
 * @param msg.blocks - Ordered stream blocks (thinking content counts).
 * @param msg.toolCalls - Tool calls (their inputs count as generated output).
 * @returns The estimated token count.
 */
export function estimateStreamTokens(msg: {
  content?: string
  blocks?: Array<{ type: string; content?: string }>
  toolCalls?: Array<{ input?: unknown; streamInputChars?: number }>
}): number {
  let chars = msg.content?.length ?? 0
  for (const b of msg.blocks ?? []) {
    if (b.type === 'thinking') chars += b.content?.length ?? 0
  }
  for (const tc of msg.toolCalls ?? []) {
    chars += toolInputChars(tc)
  }
  return Math.round(chars / 4)
}
