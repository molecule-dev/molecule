/**
 * VS Code's chat export — the JSON "Chat: Export Chat…" saves
 * (`chat.json`) from GitHub Copilot Chat or any other chat participant.
 * Verified 2026-09-29 against microsoft/vscode `main`:
 * `src/vs/workbench/contrib/chat/browser/actions/chatImportExport.ts`
 * (writes `JSON.stringify(model.toExport())`) and
 * `src/vs/workbench/contrib/chat/common/model/chatModel.ts`
 * (`IExportableChatData`, `ISerializableChatRequestData`, `toExport()`).
 *
 * ```json
 * {
 *   "initialLocation": "panel",
 *   "responderUsername": "GitHub Copilot",
 *   "requests": [
 *     {
 *       "requestId": "request_…",
 *       "message": { "text": "the message as typed", "parts": [ … ] },
 *       "timestamp": 1790582400000,
 *       "modelId": "copilot/gpt-5.3",
 *       "response": [
 *         { "value": "markdown…" },
 *         { "kind": "inlineReference", "inlineReference": { "path": "/src/app.ts", … }, "name"?: "…" },
 *         { "kind": "textEditGroup", "uri": { "path": "/src/app.ts", … }, "edits": [[{ "range": …, "text": "…" }]] },
 *         { "kind": "toolInvocationSerialized", … }
 *       ]
 *     }
 *   ]
 * }
 * ```
 *
 * A response is a list of parts: markdown is written as a bare
 * `IMarkdownString` (`{ value }`, no `kind`), everything else keeps its
 * `kind`. Older exports stored `message` as a plain string.
 *
 * @module
 */

import type { AgentFileWrite, AgentSession, AgentTurn } from '@molecule/api-agent-transcript'

/** A URI as VS Code serializes it. */
interface UriLike {
  path?: string
  fsPath?: string
}

/** One exported request, as far as the reader looks at it. */
interface Request {
  message?: string | { text?: string }
  response?: unknown[]
  timestamp?: number
  modelId?: string
  isSystemInitiated?: boolean
  hiddenFromTranscript?: boolean
}

/** The export. */
interface Export {
  responderUsername: string
  requests: Request[]
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
  if (!e || typeof e.responderUsername !== 'string' || !Array.isArray(e.requests)) return null
  const ok = e.requests.every(
    (r) =>
      r &&
      typeof r === 'object' &&
      (typeof r.message === 'string' || (typeof r.message === 'object' && r.message !== null)) &&
      (r.response === undefined || r.response === null || Array.isArray(r.response)),
  )
  return ok ? (e as Export) : null
}

/**
 * Whether a text is a VS Code chat export.
 *
 * @param text - The file's text.
 * @returns True on a positive match.
 */
export function looksLikeChatExport(text: string): boolean {
  return parse(text) !== null
}

/**
 * The path a serialized URI (or location) points at.
 *
 * @param v - The URI, or a `{ uri, range }` location.
 * @returns The path, or ''.
 */
function pathOf(v: unknown): string {
  const u = v as UriLike & { uri?: UriLike }
  if (!u || typeof u !== 'object') return ''
  if (u.uri) return pathOf(u.uri)
  return u.fsPath ?? u.path ?? ''
}

/**
 * The prose and files of one response.
 *
 * @param parts - The response parts.
 * @returns The reply's text and writes.
 */
function readResponse(parts: unknown[]): { text: string; files: AgentFileWrite[] } {
  let text = ''
  const files: AgentFileWrite[] = []
  for (const raw of parts) {
    const p = raw as {
      kind?: string
      value?: unknown
      name?: string
      inlineReference?: unknown
      uri?: unknown
      edits?: unknown
    }
    if (!p || typeof p !== 'object') continue
    if (p.kind === undefined && typeof p.value === 'string') {
      text += p.value
    } else if (p.kind === 'inlineReference') {
      const path = pathOf(p.inlineReference)
      const label = p.name ?? path.split('/').pop() ?? ''
      if (label) text += `\`${label}\``
    } else if (p.kind === 'textEditGroup') {
      const path = pathOf(p.uri)
      const groups = Array.isArray(p.edits) ? (p.edits as unknown[]) : []
      const inserted = groups
        .flatMap((g) => (Array.isArray(g) ? g : []))
        .map((e) =>
          e && typeof (e as { text?: unknown }).text === 'string'
            ? (e as { text: string }).text
            : '',
        )
        .filter(Boolean)
      if (path && inserted.length)
        files.push({ path, kind: 'edit', text: inserted.join('\n'), complete: true })
    }
  }
  return { text: text.trim(), files }
}

/**
 * Read a VS Code chat export.
 *
 * @param text - The export's text.
 * @returns The normalized session.
 * @throws {Error} When the text is not an export.
 */
export function readChatExport(text: string): AgentSession {
  const e = parse(text)
  if (!e) throw new Error('Not a VS Code chat export.')
  const turns: AgentTurn[] = []
  const iso = (ms?: number): string | undefined =>
    typeof ms === 'number' ? new Date(ms).toISOString() : undefined
  for (const r of e.requests) {
    if (r.hiddenFromTranscript) continue
    const said = (typeof r.message === 'string' ? r.message : (r.message?.text ?? '')).trim()
    if (said && !r.isSystemInitiated) {
      turns.push({ role: 'user', text: said, timestamp: iso(r.timestamp), files: [] })
    }
    const { text: reply, files } = readResponse(r.response ?? [])
    if (reply || files.length) {
      const last = turns[turns.length - 1]
      if (last && last.role === 'assistant') {
        last.text = [last.text, reply].filter(Boolean).join('\n\n')
        last.files.push(...files)
      } else {
        turns.push({
          role: 'assistant',
          text: reply,
          timestamp: iso(r.timestamp),
          model: r.modelId,
          files,
        })
      }
    }
  }
  const copilot = /copilot/i.test(e.responderUsername)
  const session: AgentSession = {
    format: 'copilot-chat',
    harness: copilot ? 'GitHub Copilot Chat' : `VS Code Chat (${e.responderUsername})`,
    startedAt: turns[0]?.timestamp,
    turns,
  }
  const models = new Set(turns.map((t) => t.model).filter(Boolean))
  if (models.size === 1) session.model = [...models][0]
  return session
}
