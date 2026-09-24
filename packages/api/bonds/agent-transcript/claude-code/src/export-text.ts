/**
 * Claude Code's `/export` file: the terminal rendering of the conversation as
 * plain text (verified against Claude Code 2.1.281).
 *
 * ```text
 *  ▐▛███▛█   Claude Code v2.1.281
 * ▝▜██████▀  Haiku 4.5 · Claude Max
 *
 * ❯ The user's message, wrapped at the terminal width and padded with spaces
 *   to it.
 *
 * ● The assistant's reply, markdown already rendered (a heading loses its
 *   `#`), wrapped at the terminal width.
 *
 * ● Write(notes.md)
 *   ⎿  Wrote 3 lines to notes.md
 *       1 # Notes
 *       2
 *       3 A line that runs past the width is broken mid-wo
 *         rd.
 *
 * ✻ Cooked for 5s · done 8:43 AM
 * ```
 *
 * Older versions used `>` for the user and `⏺` for the assistant; both are accepted.
 *
 * @module
 */

import type { AgentFileWrite, AgentSession, AgentTurn } from '@molecule/api-agent-transcript'

const USER = /^(?:❯|>) ?(.*)$/
const ASSISTANT = /^(?:●|⏺) ?(.*)$/
const STATUS = /^✻ /
const TOOL_CALL = /^([A-Z][A-Za-z]*)\((.*)\)\s*$/
const RESULT = /^\s*⎿\s*(.*)$/
const NUMBERED = /^\s{2,}(\d+) ?(.*)$/
const MORE = /…\s*\+?\d+ lines?|ctrl\+o to expand/

/**
 * Whether a text looks like a Claude Code `/export`.
 *
 * @param text - The file's text.
 * @returns True when it carries the export's header or both of its speaker markers.
 */
export function looksLikeExportText(text: string): boolean {
  if (/^\s*[▐▛█▜▝▘▀▄▌ ]*Claude Code v\d/m.test(text.slice(0, 600))) return true
  const lines = text.split('\n')
  return lines.some((l) => /^(?:❯|>) \S/.test(l)) && lines.some((l) => /^(?:●|⏺) \S/.test(l))
}

/**
 * Re-join text the terminal wrapped: consecutive lines of one paragraph become
 * one line; a blank line ends a paragraph; list items keep their own lines.
 *
 * @param lines - The block's lines, already de-indented.
 * @returns The prose.
 */
function unwrap(lines: string[]): string {
  const out: string[] = []
  let para: string[] = []
  let inList = false
  const flush = (): void => {
    if (para.length) out.push(para.join(inList ? '\n' : ' '))
    para = []
    inList = false
  }
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (!line.trim()) {
      flush()
      continue
    }
    const item = /^(?:[-*•]|\d+\.) /.test(line)
    if (item) {
      if (!inList) flush()
      inList = true
      para.push(line)
    } else if (inList && /^\s+\S/.test(line)) {
      para[para.length - 1] += ` ${line.trim()}`
    } else {
      if (inList) flush()
      para.push(line.trim())
    }
  }
  flush()
  return out.join('\n\n')
}

/**
 * Read the file content a `Write` / `Update` result shows.
 *
 * @param name - The tool name.
 * @param arg - The call's argument (the path).
 * @param body - The lines under the call.
 * @returns The write, or null for tools that do not write.
 */
function writeFrom(name: string, arg: string, body: string[]): AgentFileWrite | null {
  const kind =
    name === 'Write'
      ? 'create'
      : name === 'Update' || name === 'Edit' || name === 'MultiEdit'
        ? 'edit'
        : null
  if (!kind) return null
  const out: string[] = []
  let complete = true
  let last: 'kept' | 'dropped' = 'dropped'
  for (const raw of body) {
    if (MORE.test(raw)) {
      complete = false
      continue
    }
    if (RESULT.test(raw)) continue
    const m = NUMBERED.exec(raw)
    if (m) {
      let text = m[2].replace(/\s+$/, '')
      if (/No newline at end of file/.test(text)) {
        last = 'dropped'
        continue
      }
      if (kind === 'edit') {
        // Diff rows: "+added", "-removed", " context". Only what the edit put in counts.
        if (!text.startsWith('+')) {
          last = 'dropped'
          continue
        }
        text = text.slice(1)
      }
      out.push(text)
      last = 'kept'
    } else if (raw.trim() && last === 'kept') {
      // A content line broken at the terminal width continues mid-word.
      out[out.length - 1] += raw.trim()
    }
  }
  return { path: arg.trim(), kind, text: out.join('\n'), complete: complete && out.length > 0 }
}

/**
 * Read a Claude Code `/export` text.
 *
 * @param text - The export's text.
 * @returns The normalized session.
 */
export function readExportText(text: string): AgentSession {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const header = lines.slice(0, 8).join('\n')
  const version = /Claude Code v([\d.]+)/.exec(header)?.[1]
  const modelLine = lines
    .slice(0, 6)
    .map((l) => l.replace(/^[\s▐▛█▜▝▘▀▄▌▗▖]+/, ''))
    .find((l) => / · /.test(l) && !/Claude Code v/.test(l))
  const model = modelLine?.split(' · ')[0]?.trim() || undefined

  const turns: AgentTurn[] = []
  let assistant: AgentTurn | null = null
  // The block being read: its kind, first line and the lines under it.
  let block: { kind: 'user' | 'text' | 'tool'; first: string; body: string[] } | null = null
  const closeBlock = (): void => {
    if (!block) return
    if (block.kind === 'user') {
      const body: string[] = []
      for (const l of block.body) {
        // A user message is one contiguous run; the first blank line ends it (what follows, indented, is
        // the harness's collapsed activity: "Made 1 edit", "Read 3 files").
        if (!l.trim()) break
        body.push(l.replace(/^ {2}/, ''))
      }
      turns.push({
        role: 'user',
        text: unwrap([block.first, ...body])
          .replace(/\n\n/g, ' ')
          .trim(),
        files: [],
      })
      assistant = null
    } else {
      if (!assistant) {
        assistant = { role: 'assistant', text: '', model, files: [] }
        turns.push(assistant)
      }
      if (block.kind === 'tool') {
        const call = TOOL_CALL.exec(block.first)
        const w = call ? writeFrom(call[1], call[2], block.body) : null
        if (w) assistant.files.push(w)
      } else {
        const prose = unwrap([block.first, ...block.body.map((l) => l.replace(/^ {2}/, ''))])
        if (prose) assistant.text = assistant.text ? `${assistant.text}\n\n${prose}` : prose
      }
    }
    block = null
  }
  for (const line of lines) {
    const u = USER.exec(line)
    const a = u ? null : ASSISTANT.exec(line)
    if (u && !/^\s/.test(line)) {
      closeBlock()
      block = { kind: 'user', first: u[1], body: [] }
    } else if (a && !/^\s/.test(line)) {
      closeBlock()
      block = { kind: TOOL_CALL.test(a[1]) ? 'tool' : 'text', first: a[1], body: [] }
    } else if (STATUS.test(line)) {
      closeBlock()
    } else if (block) {
      block.body.push(line)
    }
  }
  closeBlock()
  return {
    format: 'claude-code',
    harness: 'Claude Code',
    harnessVersion: version,
    model,
    turns: turns.filter((t) => t.role === 'user' || t.text || t.files.length),
  }
}
