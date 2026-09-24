/**
 * A Molecule IDE conversation as molecule.dev stores it: `{ messages: [...] }`
 * (or the bare array), each message `{ role, content, model?, timestamp?,
 * hidden?, toolCalls?: [{ name, input, output }] }`.
 *
 * @module
 */

import type { AgentFileWrite, AgentSession, AgentTurn } from '@molecule/api-agent-transcript'

/** A stored message (only the fields read here). */
interface StoredMessage {
  role?: string
  content?: unknown
  model?: string
  timestamp?: string
  hidden?: boolean
  blocks?: unknown
  toolCalls?: Array<{ name?: string; input?: Record<string, unknown> }>
}

/** The stored conversation (only the fields read here). */
interface StoredConversation {
  messages?: StoredMessage[]
  createdAt?: string
  projectId?: unknown
  aiContext?: unknown
}

/** Messages the platform sends on its own; they are hidden from the user and are not prompts. */
const PLATFORM_MESSAGE = /^\s*\[(auto-continue|project-context)\]/

/** How a stored row marks file content it left out. */
const ELIDED = /^\[elided \d+ chars; the file is on disk\]$/

/**
 * Parse a text as a stored conversation, or null when it is not one.
 *
 * @param text - The file's text.
 * @returns The messages, or null.
 */
function parse(text: string): { messages: StoredMessage[]; createdAt?: string } | null {
  const head = text.trimStart()[0]
  if (head !== '{' && head !== '[') return null
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (_error) {
    // Not JSON — not a stored conversation.
    return null
  }
  const conv = (Array.isArray(data) ? { messages: data } : data) as StoredConversation
  const messages = conv?.messages
  if (!Array.isArray(messages) || messages.length === 0) return null
  if (!messages.every((m) => m && typeof m === 'object' && typeof m.role === 'string')) return null
  // Molecule's own markers: tool calls with name + input, content blocks, or the conversation row's fields.
  const molecule =
    conv.projectId !== undefined ||
    conv.aiContext !== undefined ||
    messages.some(
      (m) =>
        Array.isArray(m.blocks) ||
        (Array.isArray(m.toolCalls) && m.toolCalls.some((t) => t?.name && t.input)),
    )
  return molecule ? { messages, createdAt: conv.createdAt } : null
}

/**
 * Whether a text is a stored Molecule IDE conversation.
 *
 * @param text - The file's text.
 * @returns True when it parses as one.
 */
export function looksLikeConversation(text: string): boolean {
  return parse(text) !== null
}

/**
 * The files a tool call wrote.
 *
 * @param call - The stored tool call.
 * @param call.name - The tool's name.
 * @param call.input - The tool's input.
 * @returns The writes.
 */
function writesOf(call: { name?: string; input?: Record<string, unknown> }): AgentFileWrite[] {
  const input = call.input ?? {}
  const path = typeof input.path === 'string' ? input.path : ''
  if (!path) return []
  if (call.name === 'write_file' && typeof input.content === 'string') {
    const elided = ELIDED.test(input.content)
    return [{ path, kind: 'create', text: elided ? '' : input.content, complete: !elided }]
  }
  if (call.name === 'edit_file') {
    const edits = Array.isArray(input.replacements)
      ? (input.replacements as Array<{ new_string?: unknown }>)
      : [{ new_string: input.new_string }]
    return edits
      .filter((e) => typeof e.new_string === 'string')
      .map((e) => ({ path, kind: 'edit' as const, text: e.new_string as string, complete: true }))
  }
  return []
}

/**
 * Read a stored Molecule IDE conversation.
 *
 * @param text - The conversation's JSON.
 * @returns The normalized session.
 * @throws {Error} When the text is not a stored conversation.
 */
export function readConversation(text: string): AgentSession {
  const conv = parse(text)
  if (!conv)
    throw new Error(
      'Not a Molecule IDE conversation: expected { messages: [...] } with tool calls.',
    )
  const turns: AgentTurn[] = []
  const models = new Set<string>()
  let current: AgentTurn | null = null
  for (const m of conv.messages) {
    const content = typeof m.content === 'string' ? m.content.trim() : ''
    if (m.role === 'user') {
      if (m.hidden || PLATFORM_MESSAGE.test(content) || !content) continue
      current = null
      turns.push({ role: 'user', text: content, timestamp: m.timestamp, files: [] })
    } else if (m.role === 'assistant') {
      if (!current) {
        current = { role: 'assistant', text: '', timestamp: m.timestamp, model: m.model, files: [] }
        turns.push(current)
      }
      if (m.model) {
        current.model ??= m.model
        models.add(m.model)
      }
      if (content) current.text = current.text ? `${current.text}\n\n${content}` : content
      for (const call of m.toolCalls ?? []) current.files.push(...writesOf(call))
    }
    // `system` rows are platform cards shown to the user, not conversation.
  }
  return {
    format: 'molecule-ide',
    harness: 'Molecule IDE',
    model: models.size === 1 ? [...models][0] : undefined,
    startedAt: conv.createdAt ?? conv.messages[0]?.timestamp,
    turns: turns.filter((t) => t.role === 'user' || t.text || t.files.length),
  }
}
