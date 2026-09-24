/**
 * Codex CLI's session log: `~/.codex/sessions/YYYY/MM/DD/rollout-<time>-<id>.jsonl`.
 * One `{ timestamp, type, payload }` object per line; `session_meta` first.
 *
 * @module
 */

import type { AgentSession, AgentTurn } from '@molecule/api-agent-transcript'

import { findPatches, writesOfPatch } from './patch.js'

/** One logged line (only the fields read here). */
interface Line {
  timestamp?: string
  type?: string
  payload?: {
    type?: string
    role?: string
    model?: string
    cli_version?: string
    timestamp?: string
    content?: Array<{ type?: string; text?: string }>
    input?: string
    arguments?: string
  }
}

/** A user content block that is wholly one tag Codex injects (`<environment_context>…</environment_context>`). */
const INJECTED = /^\s*<([a-z_][a-z0-9_]*)\b[^>]*>[\s\S]*<\/\1>\s*$/i

/**
 * Whether a text is a Codex rollout.
 *
 * @param text - The file's text.
 * @returns True when its first JSON line is a `session_meta` record.
 */
export function looksLikeRollout(text: string): boolean {
  const first = text.split('\n').find((l) => l.trim())
  if (!first?.trim().startsWith('{')) return false
  try {
    return (JSON.parse(first) as Line).type === 'session_meta'
  } catch (_error) {
    // Not JSON — not a rollout.
    return false
  }
}

/**
 * Read a Codex rollout.
 *
 * @param text - The `.jsonl` text.
 * @returns The normalized session.
 */
export function readRollout(text: string): AgentSession {
  const turns: AgentTurn[] = []
  let version: string | undefined
  let startedAt: string | undefined
  let model: string | undefined
  const models = new Set<string>()
  let current: AgentTurn | null = null
  const assistant = (ts?: string): AgentTurn => {
    if (!current) {
      current = { role: 'assistant', text: '', timestamp: ts, model, files: [] }
      turns.push(current)
    }
    return current
  }
  for (const raw of text.split('\n')) {
    if (!raw.trim().startsWith('{')) continue
    let o: Line
    try {
      o = JSON.parse(raw) as Line
    } catch (_error) {
      // A torn final line carries nothing to read.
      continue
    }
    const p = o.payload ?? {}
    if (o.type === 'session_meta') {
      version = p.cli_version
      startedAt = p.timestamp ?? o.timestamp
    } else if (o.type === 'turn_context' && p.model) {
      model = p.model
      models.add(p.model)
    } else if (o.type === 'response_item' && p.type === 'message') {
      if (p.role === 'user') {
        const typed = (p.content ?? [])
          .filter((c) => c.type === 'input_text' && c.text && !INJECTED.test(c.text))
          .map((c) => c.text!.trim())
        if (typed.length === 0) continue
        current = null
        turns.push({ role: 'user', text: typed.join('\n\n'), timestamp: o.timestamp, files: [] })
      } else if (p.role === 'assistant') {
        const said = (p.content ?? [])
          .filter((c) => c.type === 'output_text' && c.text?.trim())
          .map((c) => c.text!.trim())
        if (said.length === 0) continue
        const t = assistant(o.timestamp)
        t.text = [t.text, ...said].filter(Boolean).join('\n\n')
      }
    } else if (o.type === 'response_item' && /call$/.test(p.type ?? '')) {
      const input = p.input ?? p.arguments ?? ''
      const files = findPatches(input).flatMap(writesOfPatch)
      if (files.length) assistant(o.timestamp).files.push(...files)
    }
  }
  return {
    format: 'codex',
    harness: 'Codex CLI',
    harnessVersion: version,
    model: models.size === 1 ? [...models][0] : undefined,
    startedAt,
    turns,
  }
}
