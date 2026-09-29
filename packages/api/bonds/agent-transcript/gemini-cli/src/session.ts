/**
 * Gemini CLI's saved sessions, in the three shapes it writes (verified
 * 2026-09-29 against google-gemini/gemini-cli `main`:
 * `packages/core/src/services/chatRecordingTypes.ts`,
 * `chatRecordingService.ts`, `packages/core/src/core/logger.ts`):
 *
 * 1. **The session log** `~/.gemini/tmp/<project>/chats/session-*.jsonl` —
 *    one JSON record per line: a metadata line
 *    (`{ sessionId, projectHash, startTime, … }`), then message records
 *    (`{ id, timestamp, type, content, displayContent?, toolCalls?, model? }`),
 *    `{ $set: {…} }` metadata updates (a `$set.messages` array is a
 *    checkpoint that replaces everything before it) and `{ $rewindTo: id }`
 *    (drops that message and everything after it).
 * 2. **The older session file** `session-*.json` — the whole
 *    `ConversationRecord` (`{ sessionId, projectHash, startTime, lastUpdated,
 *    messages }`) as one JSON object.
 * 3. **A `/chat save <tag>` checkpoint** `checkpoint-<tag>.json` — the model's
 *    history as Gemini API `Content[]` (`{ role: 'user' | 'model', parts }`),
 *    either bare or as `{ history: Content[] }`.
 *
 * `type: 'user'` records are the person; `type: 'gemini'` are the model
 * (with `model` and `toolCalls`); `info` / `error` / `warning` are the CLI's
 * own notices and are left out. A user message that is a slash command
 * (`/…`), a help query (`?…`) or injected context (`<session_context>`,
 * `<hook_context>`) is not something the person said to the model and is
 * skipped — the same test Gemini CLI applies when it lists sessions to resume.
 *
 * Files: the `write_file` tool (`file_path`, `content`) writes a whole file;
 * `replace` (`file_path`, `old_string`, `new_string`) edits one. Only calls
 * whose status is `success` are counted.
 *
 * @module
 */

import type { AgentFileWrite, AgentSession, AgentTurn } from '@molecule/api-agent-transcript'

/** One Gemini API part, as far as the reader looks at it. */
interface Part {
  text?: unknown
  thought?: unknown
  functionCall?: { name?: unknown; args?: Record<string, unknown> }
}

/** One stored message record. */
interface MessageRecord {
  id: string
  timestamp?: string
  type?: string
  content?: unknown
  displayContent?: unknown
  model?: string
  toolCalls?: Array<{ name?: unknown; args?: Record<string, unknown>; status?: unknown }>
}

/** One Gemini API content entry (a `/chat save` checkpoint). */
interface Content {
  role?: unknown
  parts?: unknown
}

const INJECTED = /^(\/|\?|<session_context>|<hook_context>)/

/**
 * Parse text as JSON, or `undefined` when it is not JSON.
 *
 * @param text - The text.
 * @returns The value.
 */
function tryJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch (_error) {
    // Not JSON: the caller tries the next shape.
    return undefined
  }
}

/**
 * Whether a value is a plain object.
 *
 * @param v - The value.
 * @returns True for a non-array object.
 */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * The text of a Gemini `PartListUnion` (a string, one part, or an array of
 * them). Thought parts are left out.
 *
 * @param content - The content.
 * @returns The text.
 */
export function partText(content: unknown): string {
  if (typeof content === 'string') return content
  const parts = Array.isArray(content) ? content : [content]
  return parts
    .map((p) => {
      if (typeof p === 'string') return p
      const part = p as Part
      if (part && typeof part.text === 'string' && part.thought !== true) return part.text
      return ''
    })
    .join('')
}

/**
 * The file a tool call wrote, when it was a successful write or edit.
 *
 * @param name - The tool's name.
 * @param args - Its arguments.
 * @returns The write, or `null`.
 */
function writeOf(name: unknown, args: Record<string, unknown> | undefined): AgentFileWrite | null {
  const a = args ?? {}
  const path = typeof a.file_path === 'string' ? a.file_path : ''
  if (!path) return null
  if (name === 'write_file' && typeof a.content === 'string') {
    return { path, kind: 'create', text: a.content, complete: true }
  }
  if (name === 'replace' && typeof a.new_string === 'string') {
    return { path, kind: 'edit', text: a.new_string, complete: true }
  }
  return null
}

/**
 * Whether a parsed JSON value is a session metadata line or a whole
 * conversation record (both carry `sessionId` and `projectHash`).
 *
 * @param v - The value.
 * @returns True when it is.
 */
function isSessionHeader(v: unknown): v is Record<string, unknown> {
  return isObject(v) && typeof v.sessionId === 'string' && typeof v.projectHash === 'string'
}

/**
 * Whether a value is a Gemini API `Content[]` with at least one `model` turn.
 *
 * @param v - The value.
 * @returns True when it is.
 */
function isContentList(v: unknown): v is Content[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every(
      (c) => isObject(c) && (c.role === 'user' || c.role === 'model') && Array.isArray(c.parts),
    ) &&
    v.some((c) => (c as Content).role === 'model')
  )
}

/**
 * The checkpoint history inside a `/chat save` file, or `null`.
 *
 * @param v - The parsed file.
 * @returns The history.
 */
function checkpointHistory(v: unknown): Content[] | null {
  if (isContentList(v)) return v
  if (isObject(v) && isContentList(v.history)) return v.history
  return null
}

/**
 * Whether a text is one of Gemini CLI's session shapes.
 *
 * @param text - The file's text.
 * @returns True only on a positive match.
 */
export function looksLikeGeminiSession(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false
  const whole = tryJson(trimmed)
  if (whole !== undefined) {
    if (isSessionHeader(whole) && Array.isArray(whole.messages)) return true
    return checkpointHistory(whole) !== null
  }
  const first = trimmed.split('\n', 1)[0]
  return isSessionHeader(tryJson(first))
}

/**
 * The live message records of a session log, applying `$set` checkpoints and
 * `$rewindTo` the way Gemini CLI's loader does.
 *
 * @param text - The `.jsonl` text.
 * @returns The metadata and the messages, in order.
 */
function replayLog(text: string): { meta: Record<string, unknown>; messages: MessageRecord[] } {
  let meta: Record<string, unknown> = {}
  const byId = new Map<string, MessageRecord>()
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    const rec = tryJson(line)
    if (!isObject(rec)) continue
    if (typeof rec.$rewindTo === 'string') {
      let found = false
      for (const id of [...byId.keys()]) {
        if (id === rec.$rewindTo) found = true
        if (found) byId.delete(id)
      }
      if (!found) byId.clear()
    } else if (typeof rec.id === 'string') {
      byId.set(rec.id, rec as unknown as MessageRecord)
    } else if (isObject(rec.$set)) {
      const set = rec.$set
      if (Array.isArray(set.messages)) {
        byId.clear()
        for (const m of set.messages)
          if (isObject(m) && typeof m.id === 'string') byId.set(m.id, m as unknown as MessageRecord)
      }
      meta = { ...meta, ...set }
    } else if (isSessionHeader(rec)) {
      meta = { ...meta, ...rec }
      if (Array.isArray(rec.messages)) {
        for (const m of rec.messages)
          if (isObject(m) && typeof m.id === 'string') byId.set(m.id, m as unknown as MessageRecord)
      }
    }
  }
  return { meta, messages: [...byId.values()] }
}

/**
 * Turns from message records.
 *
 * @param messages - The records, in order.
 * @returns The turns.
 */
function turnsOfRecords(messages: MessageRecord[]): AgentTurn[] {
  const turns: AgentTurn[] = []
  let assistant: AgentTurn | null = null
  for (const m of messages) {
    if (m.type === 'user') {
      const text = partText(m.displayContent ?? m.content).trim()
      if (!text || INJECTED.test(text)) continue
      turns.push({ role: 'user', text, timestamp: m.timestamp, files: [] })
      assistant = null
    } else if (m.type === 'gemini') {
      if (!assistant) {
        assistant = {
          role: 'assistant',
          text: '',
          timestamp: m.timestamp,
          model: m.model,
          files: [],
        }
        turns.push(assistant)
      }
      if (!assistant.model && m.model) assistant.model = m.model
      const text = partText(m.displayContent ?? m.content).trim()
      if (text) assistant.text = assistant.text ? `${assistant.text}\n\n${text}` : text
      for (const call of m.toolCalls ?? []) {
        if (call.status !== 'success') continue
        const w = writeOf(call.name, call.args)
        if (w) assistant.files.push(w)
      }
    }
  }
  return turns
}

/**
 * Turns from a `/chat save` checkpoint's API history. The context Gemini CLI
 * injects as the first user message, and the model's reply to it, are left out.
 *
 * @param history - The contents, in order.
 * @returns The turns.
 */
function turnsOfCheckpoint(history: Content[]): AgentTurn[] {
  const turns: AgentTurn[] = []
  let assistant: AgentTurn | null = null
  let skipReply = false
  for (const c of history) {
    const parts = (c.parts as Part[]) ?? []
    if (c.role === 'user') {
      const text = partText(parts).trim()
      if (text && INJECTED.test(text)) {
        skipReply = true
        continue
      }
      skipReply = false
      if (!text) continue // a tool response (functionResponse parts) — not the person.
      turns.push({ role: 'user', text, files: [] })
      assistant = null
    } else {
      const calls = parts.filter((p) => p && p.functionCall)
      if (skipReply && calls.length === 0) {
        skipReply = false
        continue
      }
      skipReply = false
      if (!assistant) {
        assistant = { role: 'assistant', text: '', files: [] }
        turns.push(assistant)
      }
      const text = partText(parts).trim()
      if (text) assistant.text = assistant.text ? `${assistant.text}\n\n${text}` : text
      for (const p of calls) {
        const w = writeOf(p.functionCall?.name, p.functionCall?.args)
        if (w) assistant.files.push(w)
      }
    }
  }
  return turns
}

/**
 * Read a Gemini CLI session in any of its three shapes.
 *
 * @param text - The file's text.
 * @returns The normalized session.
 * @throws {Error} When the text is none of them.
 */
export function readGeminiSession(text: string): AgentSession {
  const trimmed = text.trim()
  const whole = tryJson(trimmed)
  const base = { format: 'gemini-cli', harness: 'Gemini CLI' }
  let session: AgentSession
  if (whole !== undefined && checkpointHistory(whole)) {
    session = { ...base, turns: turnsOfCheckpoint(checkpointHistory(whole)!) }
  } else if (whole !== undefined && isSessionHeader(whole)) {
    const messages = (Array.isArray(whole.messages) ? whole.messages : []) as MessageRecord[]
    session = { ...base, startedAt: str(whole.startTime), turns: turnsOfRecords(messages) }
  } else if (isSessionHeader(tryJson(trimmed.split('\n', 1)[0]))) {
    const { meta, messages } = replayLog(trimmed)
    session = { ...base, startedAt: str(meta.startTime), turns: turnsOfRecords(messages) }
  } else {
    throw new Error(
      'Not a Gemini CLI session: expected a session .jsonl/.json or a /chat save checkpoint.',
    )
  }
  const models = new Set(session.turns.map((t) => t.model).filter(Boolean))
  if (models.size === 1) session.model = [...models][0]
  return session
}

/**
 * A string value, or `undefined`.
 *
 * @param v - The value.
 * @returns The string.
 */
function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}
