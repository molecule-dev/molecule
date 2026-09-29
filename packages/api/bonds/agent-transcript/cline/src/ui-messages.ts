/**
 * Cline and Roo Code task history: the `ui_messages.json` each task keeps in
 * the extension's storage (`…/tasks/<taskId>/ui_messages.json`). Verified
 * 2026-09-29 against cline/cline `main`
 * (`apps/vscode/src/shared/ExtensionMessage.ts` — `ClineMessage`, `ClineSay`,
 * `ClineAsk`, `ClineSayTool`; `webview-ui/…/DiffEditRow.tsx` — the diff
 * markers) and RooCodeInc/Roo-Code `main` (`packages/types/src/message.ts`,
 * `packages/types/src/vscode-extension-host.ts`, `src/core/task/Task.ts`,
 * `src/shared/globalFileNames.ts`).
 *
 * The file is the array of messages the chat panel shows:
 * `{ ts, type: 'say' | 'ask', say?, ask?, text?, partial?, … }`.
 *
 * - The task: Cline records it as `say: 'task'`; Roo Code as the first
 *   `say: 'text'`. Later messages from the person are `say: 'user_feedback'`.
 * - Replies: `say: 'text'`, `say: 'completion_result'`, and the questions and
 *   plans it asks (`ask: 'followup'` — JSON `{ question, … }`;
 *   `ask: 'plan_mode_respond'` — JSON `{ response, … }`).
 * - Files: `say`/`ask: 'tool'` whose text is a JSON `ClineSayTool` —
 *   `newFileCreated` (the whole file in `content`), `editedExistingFile`
 *   and Roo's `appliedDiff` (a SEARCH/REPLACE `diff`).
 *
 * The sibling `api_conversation_history.json` is the raw provider request
 * history, with the platform's injected context (environment details, tool
 * results) inside the user messages; `ui_messages.json` is what the person
 * saw, so it is the one read here.
 *
 * @module
 */

import type { AgentFileWrite, AgentSession, AgentTurn } from '@molecule/api-agent-transcript'

/** One stored UI message, as far as the reader looks at it. */
interface UiMessage {
  ts: number
  type: 'say' | 'ask'
  say?: string
  ask?: string
  text?: string
  partial?: boolean
}

/**
 * Parse text as JSON, or `undefined`.
 *
 * @param text - The text.
 * @returns The value.
 */
function tryJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch (_error) {
    // Not JSON: the caller treats the text as plain.
    return undefined
  }
}

/**
 * The messages, when the text is a `ui_messages.json` array.
 *
 * @param text - The file's text.
 * @returns The messages, or `null`.
 */
function parse(text: string): UiMessage[] | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith('[')) return null
  const v = tryJson(trimmed)
  if (!Array.isArray(v) || v.length === 0) return null
  const ok = v.every(
    (m) =>
      typeof m === 'object' &&
      m !== null &&
      typeof (m as UiMessage).ts === 'number' &&
      ((m as UiMessage).type === 'say' || (m as UiMessage).type === 'ask'),
  )
  return ok ? (v as UiMessage[]) : null
}

/**
 * Whether a text is a Cline / Roo Code `ui_messages.json`.
 *
 * @param text - The file's text.
 * @returns True on a positive match.
 */
export function looksLikeUiMessages(text: string): boolean {
  const msgs = parse(text)
  return (
    !!msgs && msgs.some((m) => m.say === 'task' || m.say === 'text' || m.say === 'user_feedback')
  )
}

/**
 * The text each SEARCH/REPLACE block replaces with, in any of the three
 * marker styles (Cline's `------- SEARCH` / `+++++++ REPLACE`, Roo Code's and
 * older Cline's `<<<<<<< SEARCH` / `>>>>>>> REPLACE`, and Cline's
 * `*** Begin Patch` files).
 *
 * @param diff - The diff text.
 * @returns The replacement texts, and whether the whole file was written.
 */
export function replacementsOf(diff: string): Array<{ text: string; create: boolean }> {
  const lines = diff.replace(/\r\n?/g, '\n').split('\n')
  const out: Array<{ text: string; create: boolean }> = []
  if (lines.some((l) => /^(-{7,}|<{7}) SEARCH\s*$/.test(l.trim()))) {
    let mode: 'none' | 'search' | 'replace' = 'none'
    let search: string[] = []
    let replace: string[] = []
    for (const raw of lines) {
      const l = raw.trim()
      if (/^(-{7,}|<{7}) SEARCH$/.test(l)) {
        mode = 'search'
        search = []
        replace = []
      } else if (mode === 'search' && /^={7}$/.test(l)) {
        mode = 'replace'
      } else if (mode === 'replace' && /^(\+{7,}|>{7}) REPLACE$/.test(l)) {
        out.push({ text: replace.join('\n'), create: !search.join('').trim() })
        mode = 'none'
      } else if (mode === 'search') {
        // Roo Code puts `:start_line:N` and a `-------` rule at the top of the SEARCH side.
        if (!/^:start_line:\d+$/.test(l) && !/^-{7}$/.test(l)) search.push(raw)
      } else if (mode === 'replace') {
        replace.push(raw)
      }
    }
    return out
  }
  if (lines.some((l) => l.startsWith('*** Begin Patch'))) {
    let cur: { create: boolean; lines: string[] } | null = null
    const close = (): void => {
      if (cur) out.push({ text: cur.lines.join('\n'), create: cur.create })
      cur = null
    }
    for (const l of lines) {
      if (l.startsWith('*** Add File: ')) {
        close()
        cur = { create: true, lines: [] }
      } else if (l.startsWith('*** Update File: ')) {
        close()
        cur = { create: false, lines: [] }
      } else if (l.startsWith('*** ')) {
        close()
      } else if (cur && l.startsWith('+')) {
        cur.lines.push(l.slice(1))
      }
    }
    close()
  }
  return out
}

/**
 * The file a tool message wrote.
 *
 * @param text - The message's JSON text.
 * @returns The writes.
 */
function writesOf(text: string): AgentFileWrite[] {
  const t = tryJson(text) as
    { tool?: string; path?: string; content?: string; diff?: string } | undefined
  if (!t || typeof t.path !== 'string' || !t.path) return []
  if (t.tool === 'newFileCreated' && typeof t.content === 'string') {
    return [{ path: t.path, kind: 'create', text: t.content, complete: true }]
  }
  if (t.tool === 'editedExistingFile' || t.tool === 'appliedDiff' || t.tool === 'newFileCreated') {
    const reps = typeof t.diff === 'string' ? replacementsOf(t.diff) : []
    if (reps.length) {
      return reps.map((r) => ({
        path: t.path!,
        kind: r.create ? 'create' : 'edit',
        text: r.text,
        complete: true,
      }))
    }
    if (typeof t.content === 'string')
      return [{ path: t.path, kind: 'create', text: t.content, complete: true }]
    return [{ path: t.path, kind: 'edit', text: '', complete: false }]
  }
  return []
}

/**
 * The prose of an `ask` whose text is JSON (`followup`, `plan_mode_respond`).
 *
 * @param text - The ask's text.
 * @returns The question or response.
 */
function askProse(text: string): string {
  const v = tryJson(text) as { question?: unknown; response?: unknown } | undefined
  if (v && typeof v === 'object') {
    if (typeof v.question === 'string') return v.question
    if (typeof v.response === 'string') return v.response
  }
  return text
}

/**
 * Read a Cline / Roo Code `ui_messages.json`.
 *
 * @param text - The file's text.
 * @returns The normalized session.
 * @throws {Error} When the text is not one.
 */
export function readUiMessages(text: string): AgentSession {
  const msgs = parse(text)
  if (!msgs) throw new Error('Not a Cline / Roo Code ui_messages.json.')
  const isCline = msgs.some((m) => m.say === 'task')
  const turns: AgentTurn[] = []
  let assistant: AgentTurn | null = null
  let sawTask = false
  const seenWrites = new Set<string>()
  const user = (t: string, ts: number): void => {
    const trimmed = t.trim()
    if (!trimmed) return
    turns.push({ role: 'user', text: trimmed, timestamp: new Date(ts).toISOString(), files: [] })
    assistant = null
  }
  const reply = (t: string, ts: number): AgentTurn => {
    if (!assistant) {
      assistant = { role: 'assistant', text: '', timestamp: new Date(ts).toISOString(), files: [] }
      turns.push(assistant)
    }
    const trimmed = t.trim()
    if (trimmed && !assistant.text.endsWith(trimmed)) {
      assistant.text = assistant.text ? `${assistant.text}\n\n${trimmed}` : trimmed
    }
    return assistant
  }
  for (const m of msgs) {
    if (m.partial) continue
    const t = m.text ?? ''
    if (m.type === 'say' && m.say === 'task') {
      user(t, m.ts)
      sawTask = true
    } else if (m.type === 'say' && m.say === 'text') {
      if (!isCline && !sawTask) {
        user(t, m.ts)
        sawTask = true
      } else {
        reply(t, m.ts)
      }
    } else if (m.type === 'say' && m.say === 'user_feedback') {
      user(t, m.ts)
    } else if (m.say === 'completion_result' || m.ask === 'completion_result') {
      reply(t, m.ts)
    } else if (m.type === 'ask' && (m.ask === 'followup' || m.ask === 'plan_mode_respond')) {
      reply(askProse(t), m.ts)
    } else if (m.say === 'tool' || m.ask === 'tool') {
      const writes = writesOf(t)
      if (!writes.length) continue
      const turn = reply('', m.ts)
      for (const w of writes) {
        const key = `${w.path}\u0000${w.kind}\u0000${w.text}`
        if (seenWrites.has(key)) continue // the ask and the say of one approved edit
        seenWrites.add(key)
        turn.files.push(w)
      }
    }
  }
  return {
    format: 'cline',
    harness: isCline ? 'Cline' : 'Roo Code',
    startedAt: msgs.length ? new Date(msgs[0].ts).toISOString() : undefined,
    turns: turns.filter((x) => x.role === 'user' || x.text || x.files.length),
  }
}
