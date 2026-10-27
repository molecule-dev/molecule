/**
 * Paracrine message types.
 *
 * A paracrine message is one agent's note to another agent — or to every
 * agent — on the same machine. In biology, paracrine signaling is how NEARBY
 * cells talk (as opposed to endocrine, the long-distance kind); here it is
 * how the AI agents sharing one checkout and one daemon ask each other
 * questions, answer them, claim work and broadcast what they are doing,
 * whatever harness each one runs in.
 *
 * @module
 */

/**
 * An agent's identity on the machine — opaque to the store.
 *
 * Whatever the caller considers stable enough to route by: a presence
 * registry session id, `harness:pid`, a project slug. A store MUST treat it
 * as an untrusted string (see {@link PARACRINE_AGENT_ID}) and never as a
 * filesystem path.
 */
export type ParacrineAgentId = string

/** The recipient address meaning "every agent that checks". */
export const PARACRINE_BROADCAST = '*'

/**
 * The shape an agent id must have before a file-backed store may use it.
 *
 * One flat character class, no separators, no percent-encoding, no whitespace:
 * anything with path structure (`/`, `..`, `?`) or escape sequences could
 * retarget a filesystem path when interpolated, so such ids are refused
 * outright rather than sanitized — a normalized id is an identity the caller
 * did not name.
 */
export const PARACRINE_AGENT_ID = /^[A-Za-z0-9][A-Za-z0-9_.:@-]{0,127}$/

/** Whether a value is a safe agent id ({@link PARACRINE_AGENT_ID}). */
export const isParacrineAgentId = (value: unknown): value is ParacrineAgentId =>
  typeof value === 'string' && PARACRINE_AGENT_ID.test(value)

/** One message between agents. */
export interface ParacrineMessage {
  /** The store's identity for this message, unique within the store. */
  id: string
  /** Who sent it. */
  from: ParacrineAgentId
  /** Who it is for — one agent id, or {@link PARACRINE_BROADCAST}. */
  to: ParacrineAgentId | typeof PARACRINE_BROADCAST
  /** A short line for listings; the body is the message. */
  subject?: string
  /** The message body. */
  body: string
  /**
   * When the store accepted it, ISO 8601 UTC (`date -u` at send time — never
   * an estimate of elapsed time).
   */
  sentAt: string
  /** Replies carry the id of the message they answer, so a question and its answer thread. */
  threadId?: string
}

/** What a caller hands the store to send. The store mints `id` and `sentAt`. */
export interface ParacrineSendInput {
  from: ParacrineAgentId
  to: ParacrineAgentId | typeof PARACRINE_BROADCAST
  subject?: string
  body: string
  threadId?: string
}

/** How one agent narrows what it receives. */
export interface ParacrineQuery {
  /** The mailbox to read. */
  for: ParacrineAgentId
  /** Only messages sent at or after this instant, ISO 8601. */
  since?: string
  /** Only messages no read-receipt from `for` exists for. Default `false`. */
  unreadOnly?: boolean
  /** Only messages whose subject starts with this prefix (case-sensitive). */
  subjectPrefix?: string
}

/** One agent's read receipt for one message. */
export interface ParacrineRead {
  messageId: string
  by: ParacrineAgentId
  /** When the receipt was recorded, ISO 8601 UTC. */
  at: string
}

/** What a store may purge, and what it must never touch. */
export interface ParacrinePurgeOptions {
  /** Purge only messages sent strictly before this instant, ISO 8601. */
  before: string
  /**
   * Purge receipts too. Default `false`: a receipt is a fact about work done,
   * and losing it re-surfaces an answered message as unread.
   */
  includeReceipts?: boolean
}

/**
 * The paracrine store — the one contract every provider implements.
 *
 * Delivery is NEVER destructive: `receive` reports, `ack` records that the
 * recipient has seen a message, and what happens after an ack (delete,
 * archive, nothing) is the recipient's policy, not the store's. A message
 * that reached nobody is still a fact the sender can check through
 * {@link ParacrineProvider.reads}.
 *
 * @remarks
 * **Everything past `purge` is optional, and absence means "cannot".** An
 * absent method is a property of the store (a file store may not be able to
 * push), a rejecting one is a failed attempt; callers detect rather than
 * assume, the same distinction every bond category makes.
 */
export interface ParacrineProvider {
  readonly name: string

  /** Place one message in its recipient's mailbox (or the broadcast stream). */
  send(input: ParacrineSendInput): Promise<ParacrineMessage>
  /**
   * Report the messages `for` may read: addressed to it, plus broadcasts.
   * Ordered by `sentAt`, then id. Never consumes anything.
   *
   * @throws {Error} When the mailbox cannot be read — an empty list is
   *   "looked, found none", never "could not look".
   */
  receive(query: ParacrineQuery): Promise<ParacrineMessage[]>
  /** Record that `by` has read one message. Idempotent. */
  ack(messageId: string, by: ParacrineAgentId): Promise<void>
  /** Every read receipt for one message — how a sender learns it was seen. */
  reads(messageId: string): Promise<ParacrineRead[]>
  /**
   * Remove messages older than a bound. Retention policy belongs to the
   * caller; only the mechanism is here.
   */
  purge(options: ParacrinePurgeOptions): Promise<number>
}
