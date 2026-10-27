/**
 * Paracrine core interface — messages between the AI agents on one machine.
 *
 * In biology, PARACRINE signaling is how nearby cells communicate — a cell
 * secretes a signal its neighbors read, with no central wire and no distance
 * to cross. This package is that, for AI agents: Claude Code, Codex, ZCode,
 * the IDE's executor and any other harness sharing one machine (or one
 * checkout) exchange messages through one bonded store, each in its own
 * process, with no harness-specific channel.
 *
 * The contract is a mailbox, deliberately NOT a queue and NOT an RPC:
 *
 * - `send` places a message for one agent (`to: 'agent-id'`) or for every
 *   agent (`to: PARACRINE_BROADCAST`).
 * - `receive` reports a mailbox non-destructively — addressed messages plus
 *   broadcasts, narrowed by time, subject prefix or read state. An agent that
 *   never checks still loses nothing that a re-check cannot find.
 * - `ack` records that the recipient has READ a message, and `reads` lets the
 *   sender learn that ("did the benchmark session see my question?"). A
 *   receipt is the only side effect reading has.
 * - `purge` is retention with the policy left to the caller.
 *
 * Every open coordination channel a workspace improvises today — deploy-ledger
 * notes, `who-owns` lookups, "ask the other session to fix its file" — is one
 * of those four operations on a message neither improvisation natively
 * supports: a QUESTION with a RECEIPT.
 *
 * Interface only. One store bonds as the singleton of the `paracrine`
 * category: a machine has one mailbox tree.
 *
 * Bonds:
 * - `@molecule/api-paracrine-file` — the zero-config local store: one
 *   directory of message files (default `~/.agents/paracrine`), readable by
 *   any process, with a `paracrine` CLI so a harness with no bond support at
 *   all can still send and receive.
 *
 * @remarks
 * **Agent ids are data, never paths.** A store treats every id as an
 * untrusted string and must refuse (not sanitize) anything outside
 * {@link PARACRINE_AGENT_ID} — a normalized id is an identity the caller did
 * not name.
 *
 * **Delivery never destroys.** There is no pop, no ack-and-delete, no
 * at-most-once: two harnesses may read the same broadcast, and a receipt
 * says "seen", not "gone".
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-paracrine'
 * import { createProvider } from '@molecule/api-paracrine-file'
 *
 * setProvider(createProvider()) // ~/.agents/paracrine, created on first use
 * // A question with a receipt the sender can check:
 * //   await requireProvider().send({ from: 'codex-42', to: 'bench-1', body: '…' })
 * //   await requireProvider().receive({ for: 'bench-1', unreadOnly: true })
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
