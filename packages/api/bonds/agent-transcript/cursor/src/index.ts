/**
 * Cursor transcript reader for `@molecule/api-agent-transcript`.
 *
 * Reads the Markdown file Cursor's "Export Chat" writes (the chat panel's
 * ⋯ menu) into a normalized `AgentSession`: each `**User**` block is what
 * you typed, each `**Cursor**` block is the reply.
 *
 * @example
 * ```typescript
 * import { readFileSync } from 'node:fs'
 * import { readTranscript, setProvider } from '@molecule/api-agent-transcript'
 * import { provider } from '@molecule/api-agent-transcript-cursor'
 *
 * setProvider(provider)
 * const file = 'cursor_debugging_session.md'
 * const session = readTranscript({ text: readFileSync(file, 'utf8'), fileName: file })
 * console.log(session.harnessVersion, session.turns.length)
 * ```
 *
 * @remarks
 * - **The export names no model and records no file writes** — Cursor leaves
 *   tool calls out of it — so every turn's `model` is unset and `files` empty.
 * - `harnessVersion` is the Cursor version in the `_Exported on … from
 *   Cursor (x.y.z)_` line. The date on that line is in the exporting
 *   machine's locale and is not read.
 * - Only a `**User**` or `**Cursor**` line on its own splits turns, and the
 *   `---` rule before each is dropped; a reply's own `---` rules stay.
 * - Detection needs the `# title` line followed by the `_Exported on … from
 *   Cursor_` line, so a hand-written chat with `**User**` headings is not
 *   taken for a Cursor export.
 * - Format read off real exports from Cursor 1.1.7, 2.1.46 and 2.3.41
 *   (2026-09-29); Cursor itself is closed source.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './export.js'
export * from './provider.js'
