/**
 * File-backed paracrine store — messages between the AI agents on one machine.
 *
 * @remarks
 * **Zero config, zero daemon.** One private SQLite database in
 * `~/.agents/paracrine` (or `PARACRINE_DIR`) holds messages, per-recipient
 * delivery state, and receipts. WAL transactions make sends, bounded claims,
 * acknowledgements, and retries atomic across bonded processes and the CLI.
 *
 * **Bonds as the paracrine singleton.** `setProvider(createProvider())` at
 * startup; `requireProvider()` from `@molecule/api-paracrine` everywhere
 * else. Explicit `rootDir` config when a test or a platform wants an isolated
 * store. On the first open, an existing plain-file store is imported in one
 * SQLite transaction and left untouched. Every provider call therefore sees
 * the complete imported state. Transient I/O failures and JSON modified within
 * the last minute fail that open for retry; older malformed JSON is preserved
 * under `legacy-unreadable/` and listed by `status()` or `paracrine status`.
 *
 * **Interoperability is the point.** A harness with no bond support
 * participates through the CLI (`npx @molecule/api-paracrine-file -- …` via
 * the `paracrine` bin). Tool-boundary callers can claim pending deliveries,
 * emit them, acknowledge successful claims, or release them for immediate
 * retry. A claim lease permits recovery after a killed process.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-paracrine'
 * import { createProvider } from '@molecule/api-paracrine-file'
 *
 * setProvider(createProvider()) // ~/.agents/paracrine
 * const asked = await requireProvider().send({
 *   from: 'claude-code-1',
 *   to: 'codex-2',
 *   subject: 'images',
 *   body: 'May I delete the archived benchmark images?',
 * })
 * // …the other side, in any harness:
 * //   paracrine recv --for codex-2 --unread
 * //   paracrine ack --for codex-2 <id>
 * const seen = (await requireProvider().reads(asked.id)).length > 0
 * ```
 *
 * @module
 */

import './runtime.js'

export { runCli } from './cli.js'
export * from './provider.js'
