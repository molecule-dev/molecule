/**
 * Pi's session files — `~/.pi/agent/sessions/--<path>--/<timestamp>_<id>.jsonl`
 * — and the stream `pi --mode json` prints.
 *
 * Verified 2026-10-03 against `packages/coding-agent/docs/session-format.md`,
 * `docs/message-types.md`, `docs/json.md`, `src/core/tools/{write,edit}.ts`,
 * and real files written by `@earendil-works/pi-coding-agent@1.0.0`:
 *
 * ```jsonl
 * {"type":"session","version":3,"id":"…","timestamp":"2026-10-03T10:15:34.739Z","cwd":"/path"}
 * {"type":"model_change","id":"12f4dd28","parentId":null,"timestamp":"…","provider":"anthropic","modelId":"…"}
 * {"type":"message","id":"c4c2333e","parentId":"…","timestamp":"…","message":{"role":"user","content":[{"type":"text","text":"…"}]}}
 * {"type":"message","id":"0192d65c","parentId":"c4c2333e","timestamp":"…","message":{"role":"assistant","content":[{"type":"text","text":"…"},{"type":"toolCall","id":"…","name":"write","arguments":{"path":"…","content":"…"}}],"provider":"anthropic","model":"…","stopReason":"toolUse"}}
 * {"type":"message","id":"…","parentId":"0192d65c","timestamp":"…","message":{"role":"toolResult","toolCallId":"…","toolName":"write","isError":false,"content":[…]}}
 * ```
 *
 * Entries form a tree through `id` / `parentId`; the conversation is the
 * branch that ends at the last entry, so abandoned branches are left out.
 * The JSON-mode stream has the same header followed by events; its
 * conversation is the `message_end` messages, in order.
 *
 * Files: a `write` call (`path`, `content`) is the whole file; an `edit` call
 * contributes each `edits[].newText` — `edits` may also arrive as a JSON
 * string or a single object, and older calls carry `oldText`/`newText` at the
 * top level. A call counts only when its tool result is on the branch and is
 * not an error.
 *
 * @module
 */

import type { AgentFileWrite, AgentSession, AgentTurn } from '@molecule/api-agent-transcript'

/** One content block, as far as the reader looks at it. */
interface Block {
  type?: string
  text?: string
  id?: string
  name?: string
  arguments?: Record<string, unknown>
}

/** One Pi message, as far as the reader looks at it. */
interface Message {
  role?: string
  content?: string | Block[]
  model?: string
  toolCallId?: string
  isError?: boolean
  timestamp?: number
}

/** A parsed record: a session entry or a JSON-mode event. */
interface PiRecord {
  type?: string
  id?: string
  parentId?: string | null
  timestamp?: string
  message?: Message
  toolCallId?: string
  isError?: boolean
}

/** The session header — the first line of both shapes. */
interface Header {
  type: 'session'
  version?: number
  id: string
  timestamp?: string
  cwd: string
}

/**
 * The first line, when it is a Pi session header.
 *
 * @param text - The file's text.
 * @returns The header, or `null`.
 */
function header(text: string): Header | null {
  const nl = text.indexOf('\n')
  const first = (nl === -1 ? text : text.slice(0, nl)).replace(/\r$/, '').trim()
  if (!first.startsWith('{') || !first.includes('"session"')) return null
  let v: unknown
  try {
    v = JSON.parse(first)
  } catch (_error) {
    // Not JSON: not a Pi session.
    return null
  }
  const h = v as Partial<Header>
  if (h.type !== 'session' || typeof h.id !== 'string' || typeof h.cwd !== 'string') return null
  if (h.version !== undefined && (typeof h.version !== 'number' || h.version < 1 || h.version > 3))
    return null
  return h as Header
}

/**
 * Whether a text is a Pi session file or a `pi --mode json` stream.
 *
 * @param text - The file's text.
 * @returns True on a positive match.
 */
export function looksLikePiSession(text: string): boolean {
  return header(text) !== null
}

/**
 * Every record after the header (LF framing; U+2028 inside a string is content).
 *
 * @param text - The file's text.
 * @returns The parsed records.
 */
function records(text: string): PiRecord[] {
  const out: PiRecord[] = []
  for (const raw of text.split('\n').slice(1)) {
    const line = raw.replace(/\r$/, '')
    if (!line.trim()) continue
    try {
      out.push(JSON.parse(line) as PiRecord)
    } catch (_error) {
      // A torn final line (the session was being written) carries nothing readable.
      continue
    }
  }
  return out
}

/**
 * The messages of the conversation, in order, with each one's entry time.
 *
 * @param recs - The records after the header.
 * @returns The messages on the active branch (session file) or every completed message (JSON stream).
 */
function conversation(recs: PiRecord[]): Array<{ message: Message; at?: string }> {
  const entries = recs.filter((r) => typeof r.id === 'string')
  if (entries.length) {
    const byId = new Map(entries.map((e) => [e.id!, e]))
    const branch: PiRecord[] = []
    const seen = new Set<string>()
    for (let e: PiRecord | undefined = entries[entries.length - 1]; e && !seen.has(e.id!);) {
      seen.add(e.id!)
      branch.push(e)
      e = e.parentId ? byId.get(e.parentId) : undefined
    }
    return branch
      .reverse()
      .filter((e) => e.type === 'message' && e.message)
      .map((e) => ({ message: e.message!, at: e.timestamp }))
  }
  return recs
    .filter((r) => r.type === 'message_end' && r.message)
    .map((r) => ({
      message: r.message!,
      at:
        typeof r.message!.timestamp === 'number'
          ? new Date(r.message!.timestamp).toISOString()
          : undefined,
    }))
}

/**
 * The text of a message's content.
 *
 * @param content - String content or blocks.
 * @returns The text blocks joined by a blank line.
 */
function textOf(content: Message['content']): string {
  if (typeof content === 'string') return content.trim()
  return (content ?? [])
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text!.trim())
    .filter(Boolean)
    .join('\n\n')
}

/**
 * The `edits` of an edit call in every shape Pi accepts.
 *
 * @param args - The call's arguments.
 * @returns The replacement texts.
 */
function editTexts(args: Record<string, unknown>): string[] {
  let edits: unknown = args.edits
  if (typeof edits === 'string') {
    try {
      edits = JSON.parse(edits)
    } catch (_error) {
      // Pi rejects an unparseable edits string, so the call wrote nothing.
      return []
    }
  }
  const list: unknown[] = Array.isArray(edits) ? [...edits] : edits ? [edits] : []
  if (typeof args.oldText === 'string' && typeof args.newText === 'string') {
    list.push({ oldText: args.oldText, newText: args.newText })
  }
  return list
    .filter(
      (e): e is { newText: string } =>
        !!e && typeof e === 'object' && typeof (e as { newText?: unknown }).newText === 'string',
    )
    .map((e) => e.newText)
}

/**
 * The files one tool call wrote.
 *
 * @param call - The `toolCall` block.
 * @returns The writes.
 */
function writesOf(call: Block): AgentFileWrite[] {
  const args = call.arguments ?? {}
  const path = typeof args.path === 'string' ? args.path : ''
  if (!path) return []
  if (call.name === 'write' && typeof args.content === 'string') {
    return [{ path, kind: 'create', text: args.content, complete: true }]
  }
  if (call.name === 'edit') {
    return editTexts(args).map((text) => ({ path, kind: 'edit' as const, text, complete: true }))
  }
  return []
}

/**
 * Read a Pi session file or `pi --mode json` stream.
 *
 * @param text - The file's text.
 * @returns The normalized session.
 * @throws {Error} When the text is not a Pi session.
 */
export function readPiSession(text: string): AgentSession {
  const h = header(text)
  if (!h) throw new Error('Not a Pi session.')
  const recs = records(text)
  const messages = conversation(recs)
  // A call succeeded when its tool result is on the branch and not an error —
  // in a JSON stream, also when its `tool_execution_end` says so.
  const succeeded = new Set<string | undefined>([
    ...messages
      .filter((m) => m.message.role === 'toolResult' && m.message.isError !== true)
      .map((m) => m.message.toolCallId),
    ...recs
      .filter((r) => r.type === 'tool_execution_end' && r.isError === false)
      .map((r) => r.toolCallId),
  ])
  const turns: AgentTurn[] = []
  let assistant: AgentTurn | null = null
  for (const { message, at } of messages) {
    if (message.role === 'user') {
      const typed = textOf(message.content)
      if (!typed) continue
      turns.push({ role: 'user', text: typed, timestamp: at, files: [] })
      assistant = null
    } else if (message.role === 'assistant') {
      if (!assistant) {
        assistant = { role: 'assistant', text: '', timestamp: at, model: message.model, files: [] }
        turns.push(assistant)
      }
      const prose = textOf(message.content)
      if (prose) assistant.text = assistant.text ? `${assistant.text}\n\n${prose}` : prose
      if (Array.isArray(message.content)) {
        for (const b of message.content) {
          if (b.type === 'toolCall' && succeeded.has(b.id)) assistant.files.push(...writesOf(b))
        }
      }
    }
  }
  const session: AgentSession = {
    format: 'pi',
    harness: 'Pi',
    startedAt: h.timestamp,
    turns: turns.filter((t) => t.role === 'user' || t.text || t.files.length),
  }
  const models = new Set(session.turns.map((t) => t.model).filter(Boolean))
  if (models.size === 1) session.model = [...models][0]
  return session
}
