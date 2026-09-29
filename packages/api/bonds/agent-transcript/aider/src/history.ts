/**
 * Aider's chat history file, `.aider.chat.history.md` (verified 2026-09-29
 * against Aider-AI/aider `main`: `aider/io.py` `InputOutput.user_input`,
 * `ai_output`, `tool_output`, `append_chat_history`, and
 * `aider/coders/base_coder.py` `get_announcements` / `apply_updates`):
 *
 * ```markdown
 *
 * # aider chat started at 2026-09-29 10:00:00
 *
 * > Aider v0.86.1  ← tool output: "> " + line + two spaces
 * > Main model: anthropic/claude-sonnet-4-5 with diff edit format  ← the model
 *
 * #### Create notes.md  ← the person's input: "#### " + line + two spaces
 * #### with one sentence
 *
 * The model's reply, markdown as written.
 *
 * > Applied edit to notes.md
 * ```
 *
 * The file is appended to by every session run in that directory, so one
 * file usually holds several sessions, each opened by its `# aider chat
 * started at` line.
 *
 * The two trailing spaces are what tell Aider's own lines apart from the
 * model's markdown: a `> quote` or `#### Heading` inside a reply does not end
 * in two spaces, while every line `user_input` and `tool_output` write does.
 *
 * @module
 */

import type { AgentFileWrite, AgentSession, AgentTurn } from '@molecule/api-agent-transcript'

const START = /^# aider chat started at (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})\s*$/
const USER = /^#### (.*?) {2}$/
const TOOL = /^>(?: (.*?))? {2}$/
const MODEL = /^(?:Main model|Model): (\S+) with /
const APPLIED = /^Applied edit to (.+)$/

/** One session's raw sections. */
interface Block {
  kind: 'user' | 'assistant' | 'tool'
  lines: string[]
}

/**
 * Whether a text is an Aider chat history file.
 *
 * @param text - The file's text.
 * @returns True when it has a session start line.
 */
export function looksLikeAiderHistory(text: string): boolean {
  return /^# aider chat started at \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\s*$/m.test(text)
}

/**
 * Split history lines into user / assistant / tool blocks.
 *
 * @param lines - The lines after a start line.
 * @returns The blocks, in order.
 */
function blocksOf(lines: string[]): Block[] {
  const blocks: Block[] = []
  const push = (kind: Block['kind'], line: string): void => {
    const last = blocks[blocks.length - 1]
    if (last && last.kind === kind) last.lines.push(line)
    else blocks.push({ kind, lines: [line] })
  }
  for (const line of lines) {
    const u = USER.exec(line)
    if (u) {
      push('user', u[1])
      continue
    }
    const t = TOOL.exec(line)
    if (t) {
      push('tool', t[1] ?? '')
      continue
    }
    push('assistant', line)
  }
  return blocks
}

/** A SEARCH/REPLACE edit block in a reply. */
interface EditBlock {
  path: string
  search: string
  replace: string
}

/**
 * The SEARCH/REPLACE blocks in a reply, each with the file name written on
 * the line before its fence (or as the fence's first line).
 *
 * @param text - The reply.
 * @returns The blocks.
 */
export function editBlocksOf(text: string): EditBlock[] {
  const out: EditBlock[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== '<<<<<<< SEARCH') continue
    let path = ''
    for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
      const l = lines[j].trim()
      if (!l) continue
      if (/^`{3,}/.test(l)) continue
      path = l.replace(/^[*`#\s]+|[*`:\s]+$/g, '')
      break
    }
    const search: string[] = []
    const replace: string[] = []
    let k = i + 1
    for (; k < lines.length && lines[k].trim() !== '======='; k++) search.push(lines[k])
    for (k++; k < lines.length && !/^>>>>>>> REPLACE\s*$/.test(lines[k].trim()); k++)
      replace.push(lines[k])
    if (path) out.push({ path, search: search.join('\n'), replace: replace.join('\n') })
    i = k
  }
  return out
}

/**
 * The fenced block right after a line that is exactly `path` (the `whole`
 * edit format), or `null`.
 *
 * @param text - The reply.
 * @param path - The file path.
 * @returns The block's text.
 */
function wholeFileOf(text: string, path: string): string | null {
  const lines = text.split('\n')
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].trim() !== path || !/^`{3,}/.test(lines[i + 1].trim())) continue
    const fence = /^(`{3,})/.exec(lines[i + 1].trim())![1]
    const body: string[] = []
    for (let k = i + 2; k < lines.length && lines[k].trim() !== fence; k++) body.push(lines[k])
    return body.join('\n')
  }
  return null
}

/**
 * The files a reply wrote, from Aider's own "Applied edit to" lines and the
 * edit blocks the reply carries.
 *
 * @param reply - The assistant's reply.
 * @param applied - The paths Aider reported applying edits to.
 * @returns The writes.
 */
function writesOf(reply: string, applied: string[]): AgentFileWrite[] {
  const blocks = editBlocksOf(reply)
  const writes: AgentFileWrite[] = []
  for (const path of applied) {
    const own = blocks.filter(
      (b) => b.path === path || b.path.endsWith(`/${path}`) || path.endsWith(`/${b.path}`),
    )
    if (own.length) {
      for (const b of own) {
        writes.push({
          path,
          kind: b.search.trim() ? 'edit' : 'create',
          text: b.replace,
          complete: true,
        })
      }
      continue
    }
    const whole = wholeFileOf(reply, path)
    if (whole !== null) writes.push({ path, kind: 'create', text: whole, complete: true })
    else writes.push({ path, kind: 'edit', text: '', complete: false })
  }
  return writes
}

/**
 * Read every session in an Aider chat history file into one session, in
 * file order. `startedAt` is the first session's start, as Aider wrote it
 * (local time, no zone).
 *
 * @param text - The history file's text.
 * @returns The normalized session.
 */
export function readAiderHistory(text: string): AgentSession {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const turns: AgentTurn[] = []
  let startedAt: string | undefined
  let model: string | undefined
  const models = new Set<string>()
  let segment: string[] = []
  const flush = (): void => {
    let assistant: AgentTurn | null = null
    let applied: string[] = []
    const closeAssistant = (): void => {
      if (assistant) assistant.files = writesOf(assistant.text, applied)
      applied = []
    }
    for (const b of blocksOf(segment)) {
      if (b.kind === 'tool') {
        for (const l of b.lines) {
          const m = MODEL.exec(l)
          if (m) {
            model = m[1]
            models.add(model)
          }
          const a = APPLIED.exec(l)
          if (a && assistant) applied.push(a[1].trim())
        }
      } else if (b.kind === 'user') {
        const text = b.lines.join('\n').trim()
        if (!text || text === '<blank>' || text.startsWith('/')) continue
        closeAssistant()
        assistant = null
        turns.push({ role: 'user', text, files: [] })
      } else {
        const text = b.lines.join('\n').trim()
        if (!text) continue
        if (!assistant) {
          assistant = { role: 'assistant', text, model, files: [] }
          turns.push(assistant)
        } else {
          assistant.text = `${assistant.text}\n\n${text}`
        }
      }
    }
    closeAssistant()
    segment = []
  }
  let started = false
  for (const line of lines) {
    const s = START.exec(line)
    if (s) {
      if (started) flush()
      started = true
      startedAt ??= `${s[1]}T${s[2]}`
      continue
    }
    if (started) segment.push(line)
  }
  if (started) flush()
  const session: AgentSession = { format: 'aider', harness: 'Aider', startedAt, turns }
  if (models.size === 1) session.model = [...models][0]
  return session
}
