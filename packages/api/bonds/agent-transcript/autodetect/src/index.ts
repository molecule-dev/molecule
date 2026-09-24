/**
 * The transcript reader to bond when files can come from more than one harness.
 *
 * Implements `@molecule/api-agent-transcript` by trying each bundled reader's
 * `detect()` and delegating to the first that recognizes the file: Claude Code
 * (`/export` text, session `.jsonl`), Codex CLI (Markdown export, rollout
 * `.jsonl`) and the Molecule IDE (stored conversation JSON). `createReader()`
 * composes any other list, including readers of your own.
 *
 * @example
 * ```typescript
 * import { readdirSync, readFileSync } from 'node:fs'
 * import { join } from 'node:path'
 *
 * import { canReadTranscript, readTranscript, setProvider } from '@molecule/api-agent-transcript'
 * import { provider } from '@molecule/api-agent-transcript-autodetect'
 *
 * // Startup: bond the autodetecting reader (Claude Code, Codex CLI, Molecule IDE).
 * setProvider(provider)
 *
 * // Pass the TEXT plus the original file name (a detection hint), never a path.
 * const dir = 'transcripts/my-post'
 * const sessions = readdirSync(dir)
 *   .map((fileName) => ({ text: readFileSync(join(dir, fileName), 'utf8'), fileName }))
 *   .filter((input) => canReadTranscript(input)) // skip a README beside the exports
 *   .map((input) => readTranscript(input))
 *
 * for (const session of sessions) {
 *   const prompt = session.turns.find((turn) => turn.role === 'user')?.text
 *   console.log(session.format, session.turns.length, prompt) // e.g. 'codex' 6 'Write a post...'
 * }
 * ```
 *
 * @remarks
 * - A file no reader recognizes throws, naming the file and the readers
 *   tried — it is never read as an empty session. Check `canReadTranscript()`
 *   first to skip non-transcript files (a README beside the exports).
 * - Order matters only for a file two readers would both accept; the bundled
 *   readers accept disjoint formats.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
