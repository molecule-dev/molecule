/**
 * Codex CLI's Markdown export (`/export` → "Save to file"; verified against
 * Codex CLI 0.156.1):
 *
 * ```markdown
 * # Codex conversation
 *
 * ## User
 *
 * The message as typed.
 *
 * ## Assistant
 *
 * The reply, markdown as written (its own `##` headings included).
 *
 * ## Activity
 *
 *     file changes: Completed · 1 changes
 *     Add: /path/notes.md
 *     # Notes
 *     …
 *     Update { move_path: None }: /path/notes.md
 *     @@ -1,2 +1,2 @@
 *     -# Notes
 *     +# Field notes
 * ```
 *
 * The export names no model and no times.
 *
 * @module
 */

import type { AgentFileWrite, AgentSession, AgentTurn } from '@molecule/api-agent-transcript'

const ROLE = /^## (User|Assistant|Activity)\s*$/

/**
 * Whether a text is a Codex Markdown export.
 *
 * @param text - The file's text.
 * @returns True when it opens with the export's title and has a role section.
 */
export function looksLikeMarkdownExport(text: string): boolean {
  const first = text.split('\n').find((l) => l.trim())
  return /^# Codex conversation\s*$/.test(first ?? '') && /^## (User|Assistant)\s*$/m.test(text)
}

/**
 * The files an Activity section shows being written.
 *
 * @param body - The section's lines.
 * @returns The writes.
 */
function writesOfActivity(body: string[]): AgentFileWrite[] {
  const writes: AgentFileWrite[] = []
  let cur: { path: string; kind: 'create' | 'edit'; lines: string[] } | null = null
  const close = (): void => {
    if (cur) {
      while (cur.lines.length && !cur.lines[cur.lines.length - 1].trim()) cur.lines.pop()
      writes.push({ path: cur.path, kind: cur.kind, text: cur.lines.join('\n'), complete: true })
    }
    cur = null
  }
  for (const raw of body) {
    const line = raw.replace(/^ {4}/, '')
    const add = /^Add: (.+)$/.exec(line)
    const upd = /^Update(?: \{[^}]*\})?: (.+)$/.exec(line)
    if (add || upd) {
      close()
      cur = { path: (add ?? upd)![1].trim(), kind: add ? 'create' : 'edit', lines: [] }
    } else if (/^(Delete(?: \{[^}]*\})?: |file changes: )/.test(line)) {
      close()
    } else if (cur?.kind === 'create') {
      cur.lines.push(line.replace(/\s+$/, ''))
    } else if (cur?.kind === 'edit' && line.startsWith('+') && !line.startsWith('+++')) {
      cur.lines.push(line.slice(1).replace(/\s+$/, ''))
    }
  }
  close()
  return writes
}

/**
 * Read a Codex Markdown export.
 *
 * @param text - The export's text.
 * @returns The normalized session.
 */
export function readMarkdownExport(text: string): AgentSession {
  const turns: AgentTurn[] = []
  let assistant: AgentTurn | null = null
  let section: { role: string; body: string[] } | null = null
  const close = (): void => {
    if (!section) return
    const body = section.body.join('\n').trim()
    if (section.role === 'User') {
      if (body) turns.push({ role: 'user', text: body, files: [] })
      assistant = null
    } else {
      if (!assistant) {
        assistant = { role: 'assistant', text: '', files: [] }
        turns.push(assistant)
      }
      if (section.role === 'Assistant') {
        if (body) assistant.text = assistant.text ? `${assistant.text}\n\n${body}` : body
      } else {
        assistant.files.push(...writesOfActivity(section.body))
      }
    }
    section = null
  }
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const m = ROLE.exec(line)
    if (m) {
      close()
      section = { role: m[1], body: [] }
    } else if (section) {
      section.body.push(line)
    }
  }
  close()
  return {
    format: 'codex',
    harness: 'Codex CLI',
    turns: turns.filter((t) => t.role === 'user' || t.text || t.files.length),
  }
}
