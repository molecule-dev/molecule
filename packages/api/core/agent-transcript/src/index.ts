/**
 * One normalized shape for a coding agent's session, whatever harness recorded it.
 *
 * Defines `AgentSession` — the turns of a conversation (the user's messages as
 * typed, the assistant's prose replies, and the files each assistant turn
 * wrote) — and the `AgentTranscriptReader` contract that format bonds
 * implement. Use it to publish, search, audit or attribute what an agent
 * wrote: `@molecule/api-text-provenance` takes these sessions to mark which
 * paragraphs of a document came from the AI.
 *
 * Readers, one per real export format: `@molecule/api-agent-transcript-claude-code`
 * (the `/export` text and the session `.jsonl`), `-codex` (the Markdown export
 * and the rollout `.jsonl`), `-molecule-ide` (a Molecule IDE conversation's
 * JSON). `@molecule/api-agent-transcript-autodetect` bundles all three and
 * picks the one that recognizes each file — bond that unless you only ever
 * read one format.
 *
 * @example
 * ```typescript
 * import { readFileSync } from 'node:fs'
 * import { readTranscript, setProvider } from '@molecule/api-agent-transcript'
 * import { provider } from '@molecule/api-agent-transcript-autodetect'
 *
 * setProvider(provider)
 *
 * const session = readTranscript({
 *   text: readFileSync('transcripts/my-post/claude-code-export.txt', 'utf8'),
 *   fileName: 'claude-code-export.txt',
 * })
 * for (const turn of session.turns) {
 *   console.log(turn.role, turn.model ?? session.model, turn.text.slice(0, 60), turn.files.map((f) => f.path))
 * }
 * ```
 *
 * @remarks
 * - **A user turn is only what the person typed.** Harness-injected context
 *   (environment blocks, slash-command echoes, platform auto-continue messages,
 *   tool results) is dropped by every reader, so a user turn is safe to show as
 *   "the prompt".
 * - **Assistant text is prose only.** Tool calls are not text; the files they
 *   wrote are in `turn.files` (`create` = whole file, `edit` = the replacement
 *   text). Content an agent put in a file counts as the agent's writing.
 * - **Exports lose detail, and `complete: false` says so.** Claude Code's
 *   `/export` renders markdown (headings lose their `#`, bold loses its `**`)
 *   and collapses some edits; prefer its session `.jsonl` when you have it. A
 *   Molecule IDE conversation may elide long file contents.
 * - Readers never guess: `detect()` is false for anything not positively
 *   recognized, and `read()` throws on it. Keep the transcript's original file
 *   name when you have it — it is a detection hint.
 * - Parsing is pure and synchronous; nothing is fetched or written.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
