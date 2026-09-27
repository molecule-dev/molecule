/**
 * Tool-call ids in the shape the Anthropic Messages API accepts.
 *
 * The API rejects a whole request (HTTP 400, `tool_use.id: String should match
 * pattern '^[a-zA-Z0-9_-]+$'`) when any `tool_use.id` or
 * `tool_result.tool_use_id` in the history contains another character. Other
 * providers accept such ids, so a conversation can carry them — for example a
 * host application's own synthetic tool calls (`plan-approval:<hash>`) or a
 * history started on a different model. One such id makes every later request
 * of that conversation fail.
 *
 * @module
 */

/** The characters the Anthropic API allows in a tool-call id. */
const VALID_TOOL_ID = /^[a-zA-Z0-9_-]+$/

/**
 * A short, stable hex digest (FNV-1a, 32-bit) of a string.
 *
 * @param value - The string to digest.
 * @returns Eight hex characters.
 */
function fnv1a(value: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * Maps a tool-call id to one the Anthropic API accepts. Valid ids pass through
 * unchanged. Any other id has each disallowed character replaced by `_` and a
 * digest of the ORIGINAL id appended, so the mapping is deterministic (a
 * `tool_use` and its `tool_result` still match) and two different ids cannot
 * collapse into one.
 *
 * @param id - The id as stored in the conversation.
 * @returns An id matching `^[a-zA-Z0-9_-]+$`.
 */
export function toAnthropicToolId(id: string): string {
  if (VALID_TOOL_ID.test(id)) return id
  return `${id.replace(/[^a-zA-Z0-9_-]/g, '_')}_${fnv1a(id)}`
}
