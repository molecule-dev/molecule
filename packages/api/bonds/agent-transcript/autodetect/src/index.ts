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
 * import { readTranscript, setProvider } from '@molecule/api-agent-transcript'
 * import { provider } from '@molecule/api-agent-transcript-autodetect'
 *
 * setProvider(provider)
 *
 * const dir = 'transcripts/my-post'
 * const sessions = readdirSync(dir).map((f) =>
 *   readTranscript({ text: readFileSync(join(dir, f), 'utf8'), fileName: f }),
 * )
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
