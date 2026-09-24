/**
 * Molecule IDE transcript reader for `@molecule/api-agent-transcript`.
 *
 * Reads a Molecule IDE conversation — the JSON molecule.dev stores for a
 * project's chat (`{ messages: [{ role, content, model, timestamp, hidden,
 * toolCalls }] }`, or the bare `messages` array) — into a normalized
 * `AgentSession`: the person's messages, Synthase's replies with the model of
 * each, and every file its `write_file` / `edit_file` calls wrote.
 *
 * @example
 * ```typescript
 * import { readFileSync } from 'node:fs'
 * import { readTranscript, setProvider } from '@molecule/api-agent-transcript'
 * import { provider } from '@molecule/api-agent-transcript-molecule-ide'
 *
 * setProvider(provider)
 * const session = readTranscript({ text: readFileSync('conversation.json', 'utf8'), fileName: 'conversation.json' })
 * ```
 *
 * @remarks
 * - Dropped: messages the platform sends on its own (`hidden: true`,
 *   `[auto-continue]`, `[project-context]`) and `system` rows (cards shown to
 *   the user). A user turn is only what a person typed.
 * - A stored row may elide a long file's content (`[elided N chars; the file
 *   is on disk]`); that write is kept with `text: ''` and `complete: false`.
 * - `detect()` claims only JSON with Molecule's own markers (tool calls with a
 *   name and input, content `blocks`, or the row's `projectId` / `aiContext`),
 *   so it never mistakes a generic chat log for one.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './conversation.js'
export * from './provider.js'
