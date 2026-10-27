/**
 * File-backed paracrine store — messages between the AI agents on one machine.
 *
 * @remarks
 * **Zero config, zero daemon.** One directory (`~/.agents/paracrine`, or
 * `PARACRINE_DIR`) holds every message and receipt as plain files, written
 * atomically and read by path — so a bonded Node process, the `paracrine`
 * CLI, a shell one-liner or `cat` all see the same store with nothing to
 * start, and a machine that reboots forgets nothing.
 *
 * **Bonds as the paracrine singleton.** `setProvider(createProvider())` at
 * startup; `requireProvider()` from `@molecule/api-paracrine` everywhere
 * else. Explicit `rootDir` config when a test or a platform wants an isolated
 * store.
 *
 * **Interoperability is the point.** A harness with no bond support
 * participates through the CLI (`npx @molecule/api-paracrine-file -- …` via
 * the `paracrine` bin): a CLI send is a bonded receive, and a bonded ack is
 * a CLI `reads`. Nothing in the directory is private to this package.
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

export { runCli } from './cli.js'
export * from './provider.js'
