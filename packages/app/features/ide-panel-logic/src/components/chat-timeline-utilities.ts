/**
 * The pure derivations behind the chat timeline's card list: which recorded
 * limit card the live banner already states, which local commit cards a history
 * reload has made redundant, and the context handed to the host's
 * `buildUpgradeCta` for a refusal.
 *
 * Every framework's chat panel builds the same card list from the same inputs,
 * so these rules live here, framework-neutral. Nothing in this module reads
 * React state, refs, props or hooks: the caller passes every input in.
 *
 * @module
 */

import type { ChatErrorMeta, ChatMessage } from '@molecule/app-ai-chat'

import type { CommitCard, SystemCard } from './chat-card-event-utilities.js'

/**
 * The card fields {@link cardCoveredByLimit} reads: the card's variant (only
 * the plain card is suppressed — never the `/help` or skills notice) and the
 * limit it already explains.
 */
export type LimitCoveringCard = Pick<SystemCard, 'variant'> & {
  /** The limit this card already explains (a backend `limitType`). */
  coversLimitType?: string
}

/**
 * Whether a recorded card states the SAME limit the live error banner is
 * already stating, so rendering it too would state one fact twice. The banner
 * is never the one suppressed — it is the refused send's only feedback.
 *
 * Only the plain card qualifies: a `/help` or skills notice has its own body,
 * so it is never the redundant copy of the banner.
 *
 * @param card - The recorded card.
 * @param liveLimitType - The limit rule the live error carries, if any.
 * @returns True when the card is redundant while that error is showing.
 */
export function cardCoveredByLimit(
  card: LimitCoveringCard,
  liveLimitType: string | undefined,
): boolean {
  return !!liveLimitType && card.variant === undefined && card.coversLimitType === liveLimitType
}

/**
 * The commit hashes the persisted transcript already carries as `commitRecord`
 * messages — a history reload pulls a committed record into `messages`, and the
 * local card for the same commit is then a duplicate.
 *
 * @param messages - The visible transcript.
 * @returns The set of persisted commit hashes.
 */
export function persistedCommitHashes(messages: readonly ChatMessage[]): Set<string> {
  const hashes = new Set<string>()
  for (const message of messages) {
    const hash = message.commitRecord?.hash
    if (hash) hashes.add(hash)
  }
  return hashes
}

/**
 * Whether a local commit card still renders: it has no hash yet (the commit is
 * in flight) or its hash is not in the persisted transcript.
 *
 * @param card - The local commit card.
 * @param persisted - The persisted commit hashes.
 * @returns True when the card is not a duplicate.
 */
export function commitCardVisible(
  card: Pick<CommitCard, 'hash'>,
  persisted: ReadonlySet<string>,
): boolean {
  return !card.hash || !persisted.has(card.hash)
}

/**
 * The context the panel forwards to the host's `buildUpgradeCta` for a
 * refusal: everything the backend said about it — the rule that fired, the
 * remedy it resolved and the plan an upgrade would move to.
 *
 * The rest is the backend's own description of the limit that fired, forwarded
 * verbatim so the host never has to guess the right button:
 *
 * - `limitType` — the RULE the backend enforced (e.g. `usage_balance`,
 *   `spend_cap`, `ai_cost`, `max_tool_loops`).
 * - `billingAction` — the REMEDY the backend resolved (e.g. `sign_up`,
 *   `upgrade`, `add_payment_method`, `add_funds`, `raise_spend_cap`,
 *   `enable_extra_usage`, `contact_support`, `owner_only`, `none`).
 * - `upgradeTier` — the plan an upgrade would move to, explicitly `null` when
 *   there is no higher tier, so a top-tier user is never sent to a plans page
 *   with nothing to sell them.
 */
export interface UpgradeCtaContext {
  /** Whether the backend says the caller must sign up rather than upgrade. */
  requiresSignup?: boolean
  /** The limit rule the backend enforced. */
  limitType?: string
  /** The remedy the backend resolved for this account. */
  billingAction?: string
  /** The plan an upgrade would move to, or `null` when there is none. */
  upgradeTier?: string | null
}

/**
 * The exact context the panel forwards to the host's `buildUpgradeCta` for a
 * refusal: every field, present or undefined.
 *
 * @param meta - The error's limit metadata, or null.
 * @returns The context React forwards (every field, present or undefined).
 */
export function upgradeContextFromError(meta: ChatErrorMeta | null): UpgradeCtaContext {
  return {
    requiresSignup: meta?.requiresSignup,
    limitType: meta?.limitType,
    billingAction: meta?.billingAction,
    upgradeTier: meta?.upgradeTier,
  }
}
