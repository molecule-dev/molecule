/**
 * Cursor's "Export Chat" Markdown (the chat panel's ⋯ → Export Chat).
 *
 * Cursor is closed source, so the format was read off real exports committed
 * to public repositories, written by Cursor 1.1.7, 2.1.46 and 2.3.41
 * (checked 2026-09-29):
 *
 * ```markdown
 * # <chat title>
 * _Exported on 1/23/2026 at 19:23:47 CST from Cursor (2.3.41)_
 *
 * ---
 *
 * **User**
 *
 * The message as typed.
 *
 * ---
 *
 * **Cursor**
 *
 * The reply, markdown as written.
 * ```
 *
 * The date is written in the exporting machine's locale (`2025/8/10 at
 * GMT+8 15:36:58` is also seen), so it is not parsed. The export names no
 * model and records no tool calls or file writes. The chat, Composer and
 * Agent panels share this export.
 *
 * @module
 */

import type { AgentSession, AgentTurn } from '@molecule/api-agent-transcript'

const EXPORTED = /^_Exported on .+ from Cursor(?: \(([^)]+)\))?_\s*$/
const SPEAKER = /^\*\*(User|Cursor)\*\*\s*$/

/**
 * Whether a text is a Cursor chat export.
 *
 * @param text - The file's text.
 * @returns True when its header names Cursor and a speaker marker follows.
 */
export function looksLikeCursorExport(text: string): boolean {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => l.trim())
  return (
    lines.length > 2 &&
    lines[0].startsWith('# ') &&
    EXPORTED.test(lines[1]) &&
    lines.some((l) => SPEAKER.test(l))
  )
}

/**
 * Read a Cursor chat export.
 *
 * @param text - The export's text.
 * @returns The normalized session.
 */
export function readCursorExport(text: string): AgentSession {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const header = lines.find((l) => EXPORTED.test(l))
  const version = header ? EXPORTED.exec(header)![1] : undefined
  const turns: AgentTurn[] = []
  let current: { role: 'user' | 'assistant'; body: string[] } | null = null
  const close = (): void => {
    if (!current) return
    const body = [...current.body]
    // The separator before the next speaker belongs to the export, not the message.
    while (body.length && !body[body.length - 1].trim()) body.pop()
    if (body.length && body[body.length - 1].trim() === '---') body.pop()
    const t = body.join('\n').trim()
    if (t) {
      const last = turns[turns.length - 1]
      if (last && last.role === current.role) last.text = `${last.text}\n\n${t}`
      else turns.push({ role: current.role, text: t, files: [] })
    }
    current = null
  }
  for (const line of lines) {
    const m = SPEAKER.exec(line)
    if (m) {
      close()
      current = { role: m[1] === 'User' ? 'user' : 'assistant', body: [] }
    } else if (current) {
      current.body.push(line)
    }
  }
  close()
  const session: AgentSession = { format: 'cursor', harness: 'Cursor', turns }
  if (version) session.harnessVersion = version
  return session
}
