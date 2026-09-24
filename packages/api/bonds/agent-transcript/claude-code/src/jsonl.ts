/**
 * Claude Code's session log (`~/.claude/projects/<project>/<session>.jsonl`):
 * one JSON object per line; `type: 'user' | 'assistant'` lines carry an
 * Anthropic Messages API `message`.
 *
 * @module
 */

import type { AgentFileWrite, AgentSession, AgentTurn } from '@molecule/api-agent-transcript'

/** A content block of a logged message (only the fields read here). */
interface Block {
  type: string
  text?: string
  name?: string
  input?: Record<string, unknown>
}

/** One logged line (only the fields read here). */
interface Line {
  type?: string
  isSidechain?: boolean
  isMeta?: boolean
  timestamp?: string
  version?: string
  message?: { role?: string; model?: string; content?: string | Block[] }
}

/** User text Claude Code writes on the user's behalf: slash-command echoes, their output, caveats. */
const INJECTED_USER_TEXT =
  /^\s*<(command-name|command-message|command-args|local-command-stdout|local-command-stderr|local-command-caveat|system-reminder|bash-input|bash-stdout|bash-stderr)>/

/**
 * Whether a text looks like a Claude Code session log.
 *
 * @param text - The file's text.
 * @returns True when the first parseable lines are Claude Code log records.
 */
export function looksLikeSessionJsonl(text: string): boolean {
  let seen = 0
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (!line.startsWith('{')) return false
    let o: Line & { sessionId?: unknown; uuid?: unknown }
    try {
      o = JSON.parse(line) as typeof o
    } catch (_error) {
      // A line that is not JSON means this is not a .jsonl log.
      return false
    }
    if ((o.type === 'user' || o.type === 'assistant') && o.message && (o.sessionId || o.uuid))
      return true
    if (++seen > 20) return false
  }
  return false
}

/**
 * A file write or edit from a tool call, or null when the tool does not write.
 *
 * @param block - The `tool_use` block.
 * @returns The writes it made.
 */
function writesOf(block: Block): AgentFileWrite[] {
  const input = block.input ?? {}
  const path =
    typeof input.file_path === 'string'
      ? input.file_path
      : typeof input.path === 'string'
        ? input.path
        : ''
  if (!path) return []
  if (block.name === 'Write' && typeof input.content === 'string') {
    return [{ path, kind: 'create', text: input.content, complete: true }]
  }
  if (block.name === 'Edit' && typeof input.new_string === 'string') {
    return [{ path, kind: 'edit', text: input.new_string, complete: true }]
  }
  if (block.name === 'MultiEdit' && Array.isArray(input.edits)) {
    return (input.edits as Array<{ new_string?: unknown }>)
      .filter((e) => typeof e.new_string === 'string')
      .map((e) => ({ path, kind: 'edit' as const, text: e.new_string as string, complete: true }))
  }
  return []
}

/**
 * Read a Claude Code session log.
 *
 * @param text - The `.jsonl` text.
 * @returns The normalized session.
 */
export function readSessionJsonl(text: string): AgentSession {
  const turns: AgentTurn[] = []
  let version: string | undefined
  let startedAt: string | undefined
  let current: AgentTurn | null = null
  const models = new Set<string>()
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line.startsWith('{')) continue
    let o: Line
    try {
      o = JSON.parse(line) as Line
    } catch (_error) {
      // A torn final line (a log still being written) carries nothing to read.
      continue
    }
    if (o.type !== 'user' && o.type !== 'assistant') continue
    // A subagent's own conversation, and lines Claude Code marks as meta, are not the session.
    if (o.isSidechain || o.isMeta) continue
    version ??= o.version
    startedAt ??= o.timestamp
    const content = o.message?.content
    const blocks: Block[] =
      typeof content === 'string' ? [{ type: 'text', text: content }] : (content ?? [])
    if (o.type === 'user') {
      // Tool results arrive as user lines; they belong to the assistant turn in progress.
      const typed = blocks
        .filter(
          (b) =>
            b.type === 'text' && typeof b.text === 'string' && !INJECTED_USER_TEXT.test(b.text),
        )
        .map((b) => b.text as string)
      if (typed.length === 0) continue
      current = null
      turns.push({
        role: 'user',
        text: typed.join('\n\n').trim(),
        timestamp: o.timestamp,
        files: [],
      })
      continue
    }
    if (!current) {
      current = {
        role: 'assistant',
        text: '',
        timestamp: o.timestamp,
        files: [],
      }
      turns.push(current)
    }
    // `<synthetic>` marks a message Claude Code made itself (an interruption notice), not a model.
    if (o.message?.model && !o.message.model.startsWith('<')) {
      current.model ??= o.message.model
      models.add(o.message.model)
    }
    for (const b of blocks) {
      if (b.type === 'text' && b.text?.trim())
        current.text = current.text ? `${current.text}\n\n${b.text.trim()}` : b.text.trim()
      else if (b.type === 'tool_use') current.files.push(...writesOf(b))
    }
  }
  return {
    format: 'claude-code',
    harness: 'Claude Code',
    harnessVersion: version,
    model: models.size === 1 ? [...models][0] : undefined,
    startedAt,
    turns: turns.filter((t) => t.role === 'user' || t.text || t.files.length),
  }
}
