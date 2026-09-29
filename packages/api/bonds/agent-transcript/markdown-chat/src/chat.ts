/**
 * A plain Markdown or text chat: turns introduced by a speaker marker in one
 * of three styles — a heading (`## User`), a bold label (`**User:**`, text
 * may follow on the same line) or a plain label at the start of a line
 * (`User: …`).
 *
 * This is the reader of last resort, for chats saved by hand, by a harness
 * with no reader of its own, or by a chat web app's copy button. It never
 * guesses at a format: the file must hold at least one user marker AND one
 * assistant marker, and only the style of the file's first marker splits
 * turns, so a `Model:` line or `## Assistant notes` heading inside a reply
 * cannot start a new turn in a file that uses another style. Markers inside
 * fenced code blocks are ignored.
 *
 * @module
 */

import type { AgentSession, AgentTurn, AgentTurnRole } from '@molecule/api-agent-transcript'

/** Names that mark the person. */
export const USER_NAMES = ['user', 'human', 'you', 'me'] as const

/** Names that mark the assistant. */
export const ASSISTANT_NAMES = [
  'assistant',
  'ai',
  'bot',
  'model',
  'agent',
  'claude',
  'chatgpt',
  'gpt',
  'gemini',
  'copilot',
  'cursor',
] as const

type Style = 'heading' | 'bold' | 'plain'

const NAME = `(${[...USER_NAMES, ...ASSISTANT_NAMES].join('|')})`
const PATTERNS: Record<Style, RegExp> = {
  heading: new RegExp(`^#{1,4}\\s+${NAME}\\s*:?\\s*$`, 'i'),
  bold: new RegExp(`^\\*\\*${NAME}(?::\\*\\*|\\*\\*:?)\\s*(.*)$`, 'i'),
  plain: new RegExp(`^${NAME}:\\s*(.*)$`, 'i'),
}
const STYLES: Style[] = ['heading', 'bold', 'plain']

/** A marker found on a line. */
interface Marker {
  style: Style
  role: AgentTurnRole
  rest: string
}

/**
 * The speaker marker on a line, if any.
 *
 * @param line - The line.
 * @param only - Only this style counts, when given.
 * @returns The marker, or `null`.
 */
function markerOf(line: string, only?: Style): Marker | null {
  for (const style of only ? [only] : STYLES) {
    const m = PATTERNS[style].exec(line)
    if (!m) continue
    const name = m[1].toLowerCase()
    const role: AgentTurnRole = (USER_NAMES as readonly string[]).includes(name)
      ? 'user'
      : 'assistant'
    return { style, role, rest: (m[2] ?? '').trim() }
  }
  return null
}

/**
 * The lines outside fenced code blocks, with their fence state.
 *
 * @param text - The text.
 * @returns Each line and whether it is inside a fence.
 */
function withFences(text: string): Array<{ line: string; fenced: boolean }> {
  let fence: string | null = null
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => {
      const f = /^\s*(`{3,}|~{3,})/.exec(line)
      const wasFenced = fence !== null
      if (f) {
        if (fence === null) fence = f[1][0]
        else if (f[1][0] === fence) fence = null
      }
      return { line, fenced: wasFenced || !!f }
    })
}

/**
 * The marker style a text uses: the style of its first marker, provided the
 * text has at least one user and one assistant marker in that style.
 *
 * @param text - The text.
 * @returns The style, or `null` when the text is not a chat.
 */
export function chatStyleOf(text: string): Style | null {
  const lines = withFences(text).filter((l) => !l.fenced)
  const first = lines.map((l) => markerOf(l.line)).find(Boolean)
  if (!first) return null
  const roles = new Set(lines.map((l) => markerOf(l.line, first.style)?.role).filter(Boolean))
  return roles.has('user') && roles.has('assistant') ? first.style : null
}

/**
 * Whether a text is a Markdown / plain-text chat.
 *
 * @param text - The file's text.
 * @returns True when it has user and assistant markers in one style.
 */
export function looksLikeMarkdownChat(text: string): boolean {
  return chatStyleOf(text) !== null
}

/**
 * Read a Markdown / plain-text chat.
 *
 * @param text - The chat's text.
 * @returns The normalized session.
 * @throws {Error} When the text is not a chat.
 */
export function readMarkdownChat(text: string): AgentSession {
  const style = chatStyleOf(text)
  if (!style) throw new Error('Not a Markdown chat: no user and assistant speaker markers.')
  const turns: AgentTurn[] = []
  let current: { role: AgentTurnRole; body: string[] } | null = null
  const close = (): void => {
    if (!current) return
    const body = current.body.join('\n').trim()
    if (body) {
      const last = turns[turns.length - 1]
      if (last && last.role === current.role) last.text = `${last.text}\n\n${body}`
      else turns.push({ role: current.role, text: body, files: [] })
    }
    current = null
  }
  for (const { line, fenced } of withFences(text)) {
    const m = fenced ? null : markerOf(line, style)
    if (m) {
      close()
      current = { role: m.role, body: m.rest ? [m.rest] : [] }
    } else if (current) {
      current.body.push(line)
    }
  }
  close()
  // A `---` rule between turns belongs to the file's layout, not the message.
  for (const t of turns) t.text = t.text.replace(/\n+-{3,}\s*$/, '').trim()
  return { format: 'markdown-chat', harness: 'Markdown chat', turns }
}
