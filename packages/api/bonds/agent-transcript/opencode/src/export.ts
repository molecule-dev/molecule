/**
 * OpenCode's session export — what `opencode export [sessionID]` prints
 * (verified 2026-09-29 against anomalyco/opencode `dev`:
 * `packages/opencode/src/cli/cmd/export.ts`,
 * `packages/schema/src/v1/session.ts`, `packages/opencode/src/tool/{write,edit,apply_patch}.ts`):
 *
 * ```json
 * {
 *   "info": { "id": "ses_…", "title": "…", "version": "1.x", "time": { "created": 1790…, "updated": … }, … },
 *   "messages": [
 *     { "info": { "role": "user", "time": { "created": … }, … },
 *       "parts": [{ "type": "text", "text": "…", "synthetic"?: true }] },
 *     { "info": { "role": "assistant", "modelID": "…", "providerID": "…", … },
 *       "parts": [{ "type": "text", "text": "…" },
 *                 { "type": "tool", "tool": "write", "state": { "status": "completed", "input": { … } } }] }
 *   ]
 * }
 * ```
 *
 * User turns are the text parts the person typed; `synthetic` parts (the
 * contents OpenCode attaches for an `@file` mention) and `ignored` parts are
 * left out. Reasoning, step and snapshot parts are not prose.
 *
 * Files: completed `write` (`filePath`, `content`) is the whole file; `edit`
 * (`filePath`, `newString`) is an edit; `apply_patch` (`patchText`, the
 * `*** Begin Patch` format) contributes each added file whole and each
 * update's added lines.
 *
 * @module
 */

import type { AgentFileWrite, AgentSession, AgentTurn } from '@molecule/api-agent-transcript'

/** One exported part, as far as the reader looks at it. */
interface Part {
  type?: string
  text?: string
  synthetic?: boolean
  ignored?: boolean
  tool?: string
  state?: { status?: string; input?: Record<string, unknown> }
}

/** One exported message. */
interface Message {
  info?: {
    role?: string
    time?: { created?: number }
    modelID?: string
  }
  parts?: Part[]
}

/** The export. */
interface Export {
  info: { id: string; version?: string; time?: { created?: number } }
  messages: Message[]
}

/**
 * The export, when the text is one.
 *
 * @param text - The file's text.
 * @returns The export, or `null`.
 */
function parse(text: string): Export | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{')) return null
  let v: unknown
  try {
    v = JSON.parse(trimmed)
  } catch (_error) {
    // Not JSON: not an export.
    return null
  }
  const e = v as Partial<Export>
  if (!e || typeof e !== 'object' || !e.info || typeof e.info !== 'object') return null
  if (typeof e.info.id !== 'string' || typeof e.info.time?.created !== 'number') return null
  if (!Array.isArray(e.messages)) return null
  const ok = e.messages.every(
    (m) =>
      m &&
      typeof m === 'object' &&
      (m.info?.role === 'user' || m.info?.role === 'assistant') &&
      Array.isArray(m.parts),
  )
  return ok ? (e as Export) : null
}

/**
 * Whether a text is an `opencode export` session.
 *
 * @param text - The file's text.
 * @returns True on a positive match.
 */
export function looksLikeOpencodeExport(text: string): boolean {
  return parse(text) !== null
}

/**
 * The files an `apply_patch` call wrote.
 *
 * @param patch - The patch text.
 * @returns The writes.
 */
export function writesOfPatch(patch: string): AgentFileWrite[] {
  const writes: AgentFileWrite[] = []
  let cur: { path: string; kind: 'create' | 'edit'; lines: string[] } | null = null
  const close = (): void => {
    if (cur)
      writes.push({ path: cur.path, kind: cur.kind, text: cur.lines.join('\n'), complete: true })
    cur = null
  }
  for (const line of patch.replace(/\r\n?/g, '\n').split('\n')) {
    const add = /^\*\*\* Add File: (.+)$/.exec(line)
    const upd = /^\*\*\* Update File: (.+)$/.exec(line)
    if (add || upd) {
      close()
      cur = { path: (add ?? upd)![1].trim(), kind: add ? 'create' : 'edit', lines: [] }
    } else if (line.startsWith('*** ')) {
      close()
    } else if (cur && line.startsWith('+')) {
      cur.lines.push(line.slice(1))
    }
  }
  close()
  return writes
}

/**
 * The files a tool part wrote.
 *
 * @param part - The tool part.
 * @returns The writes.
 */
function writesOf(part: Part): AgentFileWrite[] {
  if (part.state?.status !== 'completed') return []
  const input = part.state.input ?? {}
  const path = typeof input.filePath === 'string' ? input.filePath : ''
  if (part.tool === 'write' && path && typeof input.content === 'string') {
    return [{ path, kind: 'create', text: input.content, complete: true }]
  }
  if (part.tool === 'edit' && path && typeof input.newString === 'string') {
    return [{ path, kind: 'edit', text: input.newString, complete: true }]
  }
  if (part.tool === 'apply_patch' && typeof input.patchText === 'string') {
    return writesOfPatch(input.patchText)
  }
  return []
}

/**
 * Read an `opencode export` session.
 *
 * @param text - The export's text.
 * @returns The normalized session.
 * @throws {Error} When the text is not an export.
 */
export function readOpencodeExport(text: string): AgentSession {
  const e = parse(text)
  if (!e) throw new Error('Not an opencode export.')
  const turns: AgentTurn[] = []
  let assistant: AgentTurn | null = null
  const iso = (ms?: number): string | undefined =>
    typeof ms === 'number' ? new Date(ms).toISOString() : undefined
  for (const m of e.messages) {
    const parts = m.parts ?? []
    const prose = parts
      .filter((p) => p.type === 'text' && typeof p.text === 'string' && !p.synthetic && !p.ignored)
      .map((p) => p.text!.trim())
      .filter(Boolean)
      .join('\n\n')
    if (m.info?.role === 'user') {
      if (!prose) continue
      turns.push({ role: 'user', text: prose, timestamp: iso(m.info.time?.created), files: [] })
      assistant = null
    } else {
      if (!assistant) {
        assistant = {
          role: 'assistant',
          text: '',
          timestamp: iso(m.info?.time?.created),
          model: m.info?.modelID,
          files: [],
        }
        turns.push(assistant)
      }
      if (prose) assistant.text = assistant.text ? `${assistant.text}\n\n${prose}` : prose
      for (const p of parts) if (p.type === 'tool') assistant.files.push(...writesOf(p))
    }
  }
  const session: AgentSession = {
    format: 'opencode',
    harness: 'OpenCode',
    startedAt: iso(e.info.time?.created),
    turns: turns.filter((t) => t.role === 'user' || t.text || t.files.length),
  }
  if (typeof e.info.version === 'string') session.harnessVersion = e.info.version
  const models = new Set(session.turns.map((t) => t.model).filter(Boolean))
  if (models.size === 1) session.model = [...models][0]
  return session
}
