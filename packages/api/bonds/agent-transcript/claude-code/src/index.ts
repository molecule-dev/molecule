/**
 * Claude Code transcript reader for `@molecule/api-agent-transcript`.
 *
 * Reads both forms of a Claude Code session into a normalized `AgentSession`:
 * the session log Claude Code keeps at
 * `~/.claude/projects/<project>/<session-id>.jsonl` (full fidelity: the
 * assistant's markdown as written, per-message model and timestamps, and the
 * complete text of every `Write` / `Edit` / `MultiEdit`), and the plain text
 * `/export` writes (the terminal rendering: user `❯`, assistant `●`, tool
 * calls such as `Write(path)` with the lines they wrote).
 *
 * @example
 * ```typescript
 * import { readFileSync } from 'node:fs'
 * import { readTranscript, setProvider } from '@molecule/api-agent-transcript'
 * import { provider } from '@molecule/api-agent-transcript-claude-code'
 *
 * setProvider(provider)
 * const session = readTranscript({ text: readFileSync('session.jsonl', 'utf8'), fileName: 'session.jsonl' })
 * // session.turns: [{ role: 'user', text: '…as typed…' }, { role: 'assistant', model: 'claude-…', text, files }]
 * ```
 *
 * @remarks
 * - **Prefer the `.jsonl` when you have it.** The `/export` text is a rendering:
 *   markdown is already applied (a `## heading` arrives as `heading`, `**bold**`
 *   as `bold`), paragraphs are re-joined from terminal wrapping, and the model
 *   is only the display name in the header (`Haiku 4.5`). Edits the terminal
 *   showed collapsed ("Made 1 edit") carry no text, and a truncated preview
 *   (`… +N lines`) is marked `complete: false`.
 * - Dropped from user turns: slash-command echoes (`<command-name>` …), their
 *   output, `<system-reminder>` text, tool results, and lines Claude Code marks
 *   `isMeta`. A subagent's own messages (`isSidechain`) are not part of the
 *   session.
 * - Verified against Claude Code 2.1.281's own files; the older `>` / `⏺`
 *   markers are accepted too.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './export-text.js'
export * from './jsonl.js'
export * from './provider.js'
