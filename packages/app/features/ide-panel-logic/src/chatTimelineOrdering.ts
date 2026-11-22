/**
 * Building and ordering the chat transcript's timeline, plus the small
 * derivations the timeline region computes from it — which messages render, the
 * live work card's visibility, the plan's waiting state, and where each item's
 * timestamp belongs.
 *
 * Every framework's chat panel renders the same timeline from the same inputs,
 * so this lives here, framework-neutral. Nothing in this module reads React
 * state, refs, props or hooks: the caller passes every input in.
 *
 * @module
 */

import type { CardEvent, ChatErrorMeta, ChatMessage } from '@molecule/app-ai-chat'

import type {
  ActivityCardEntry,
  CommitCard,
  SystemCard,
  TipCardEntry,
} from './components/chat-card-event-utilities.js'
import {
  cardCoveredByLimit,
  commitCardVisible,
  persistedCommitHashes,
} from './components/chat-timeline-utilities.js'
import type { ChatTimestampSlot } from './components/chat-timestamps-utilities.js'

/** The minimal shape {@link timelineSortKey} reads from a timeline item. */
interface OrderableItem {
  kind: string
  msg?: {
    timestamp: number
    isStreaming?: boolean
    content?: string
    blocks?: unknown[]
    queued?: boolean
  }
  card?: { timestamp: number }
}

/**
 * Sort key for a chat-timeline item (message or any card). Items normally order by
 * their `timestamp`, with TWO exceptions: a streaming assistant message that has not
 * yet produced any content sorts after every timestamped item, and a QUEUED user
 * message sorts dead last.
 *
 * Why (empty streaming): a turn's preamble cards (the model / "Building your app"
 * notices, the "models_intro" note, the onboarding tip) are emitted a beat BEFORE the
 * response content. The server defers each assistant message's `message_start` — and
 * thus its timestamp — to that message's FIRST content event, so the message is
 * timestamped when it visually appears, strictly after every preamble item, and orders
 * below them. This rule only covers the brief window between `message_start` and the
 * first flushed content: while still empty the message sorts last (bottom of the turn)
 * instead of leap-frogging the cards on an earlier timestamp; once content lands it
 * orders by its first-content timestamp, still after the preamble. No card opts in by
 * name, and because that timestamp is the server's persisted value, live and reload
 * order identically.
 *
 * Why (queued): a message queued while a response streams belongs to a FUTURE turn —
 * it must pin to the very bottom of the transcript, below everything the current turn
 * keeps streaming (new assistant messages, cards), instead of drifting up as later-
 * timestamped items are appended after it. Multiple queued messages keep their queue
 * order via sort stability. When the queue drains, useChat re-stamps the message to
 * its actual send time, so it settles exactly where the transcript reached.
 *
 * @param item - A timeline item.
 * @returns The numeric key to sort ascending by.
 */
export function timelineSortKey(item: OrderableItem): number {
  if (item.kind === 'message' && item.msg) {
    const m = item.msg
    if (m.queued) return Number.MAX_SAFE_INTEGER
    const empty = !m.content && (!m.blocks || m.blocks.length === 0)
    if (m.isStreaming && empty) return Number.MAX_SAFE_INTEGER - 1
    return m.timestamp
  }
  return item.card?.timestamp ?? 0
}

/**
 * One item of the rendered chat timeline: a chat message, or one of the card
 * kinds the panel appends after the messages (commit cards, system cards,
 * activity cards, tip cards).
 */
export type ChatTimelineItem =
  | { kind: 'message'; msg: ChatMessage }
  | { kind: 'commit'; card: CommitCard }
  | { kind: 'system'; card: SystemCard }
  | { kind: 'activity'; card: ActivityCardEntry }
  | { kind: 'tip'; card: TipCardEntry }

/**
 * Never render hidden driver messages (the post-boot kickoff etc.). The server
 * already filters them on read, but guard here too so the client NEVER shows
 * one — even an optimistic/in-flight hidden message.
 *
 * @param messages - The transcript's messages.
 * @returns The messages the timeline may render.
 */
export function selectVisibleMessages(messages: readonly ChatMessage[]): ChatMessage[] {
  return messages.filter((m) => !m.hidden)
}

/**
 * Splits out the queued messages (user/auto messages waiting to send while the
 * agent works). They are NOT rendered inline in the scrolling timeline — they'd
 * be pushed around and reflow as the response streams. They render instead in an
 * anchored bar pinned above the composer (the same fixed-position treatment as
 * the commit bar), so the timeline never includes them.
 *
 * @param visibleMessages - The visible messages (see {@link selectVisibleMessages}).
 * @returns The queued subset, in queue order.
 */
export function selectQueuedMessages(visibleMessages: readonly ChatMessage[]): ChatMessage[] {
  return visibleMessages.filter((m) => m.queued)
}

/**
 * Whether a limit the backend raised for an ANONYMOUS caller is now STALE — the
 * viewer signed in, so they have an account, a different allowance, and two
 * dead-end buttons. A `requiresSignup` error, whose whole message is "…for
 * guests … or create a free account for more" and whose CTAs are Sign up / Log
 * in, is stale the moment the viewer is no longer anonymous. The error state
 * survives the in-place auth modal (nothing navigates, and useChat only clears
 * it on the next send), so without this the freshly-signed-up user keeps reading
 * the guest limit they just escaped. Same reasoning the host's `upgrade_prompt`
 * card factory already applies to the recorded guest card.
 *
 * @param errorMeta - The error's limit metadata, or `null` when there is none.
 * @param isAnonymous - Whether the viewer is still anonymous; `undefined` (not yet
 *   known) counts as anonymous, so the limit stays until sign-in is confirmed.
 * @returns Whether the guest limit is stale and must not render.
 */
export function isStaleAnonymousLimit(
  errorMeta: ChatErrorMeta | null,
  isAnonymous: boolean | undefined,
): boolean {
  return errorMeta?.requiresSignup === true && isAnonymous === false
}

/** Everything {@link buildChatTimeline} needs to build the timeline. */
export interface BuildChatTimelineInput {
  /** The messages to render (already filtered through {@link selectVisibleMessages}). */
  visibleMessages: readonly ChatMessage[]
  /** Builds a system card from a card-message's recorded event, or `null` to drop it. */
  cardEventToSystemCard: (cardEvent: CardEvent, id: string, timestamp: number) => SystemCard | null
  /** This session's local commit cards. */
  commitCards: readonly CommitCard[]
  /** This session's local command cards (ephemeral). */
  systemCards: readonly SystemCard[]
  /** The captured activity cards. */
  activityCards: readonly ActivityCardEntry[]
  /** The dismissable tip cards. */
  tipCards: readonly TipCardEntry[]
  /** The live error text, or `null`. */
  error: string | null
  /** The live error's limit metadata, or `null`. */
  errorMeta: ChatErrorMeta | null
  /** Whether the live error's anonymous limit is stale (see {@link isStaleAnonymousLimit}). */
  isStaleAnonymousLimit: boolean
}

/**
 * Build a unified timeline so commit cards appear at the correct position.
 *
 * A card-message (role:'system' carrying a cardEvent) renders as a SYSTEM CARD,
 * not a chat bubble — split it out here so it flows through the same card render
 * path, sourced from the ONE transcript. Every other message renders as a
 * message. A limit the LIVE banner is already stating is dropped from its card
 * while the banner is up: a limit is hit once but surfaces twice — the card
 * recorded when the turn was interrupted, then the banner when the next send is
 * refused — so a card that declares it covers this same limit is dropped while
 * the banner is up (it comes back when the error clears). The banner stays: it
 * is the refused send's only feedback, and its message can be the more specific
 * one (platform capacity vs the user's own budget, same `limitType`).
 *
 * The commit endpoint both returns the commit AND persists it as a
 * `commitRecord` message, so once any history reload (tab refocus,
 * end-of-turn reconcile) pulls that record into `messages`, this session's local
 * card for the same commit is a duplicate. The persisted record wins; a local
 * card is kept only until it lands.
 *
 * Order by timestamp, EXCEPT an empty (still-thinking) streaming response sorts
 * last — so a turn's preamble cards (mode/model/skills notices, onboarding tips),
 * emitted a beat after the placeholder is created, render ABOVE the response
 * rather than below the whole streamed block. See {@link timelineSortKey}.
 *
 * @param input - The messages and cards to build from, plus the live error state.
 * @returns The ordered timeline items.
 */
export function buildChatTimeline(input: BuildChatTimelineInput): ChatTimelineItem[] {
  const { visibleMessages, cardEventToSystemCard } = input
  const items: ChatTimelineItem[] = []
  const liveLimitType =
    input.error && !input.isStaleAnonymousLimit ? input.errorMeta?.limitType : undefined
  for (const msg of visibleMessages) {
    // Queued messages render in the anchored bar above the composer, not inline.
    if (msg.queued) continue
    if (msg.cardEvent) {
      const card = cardEventToSystemCard(msg.cardEvent, msg.id, msg.timestamp)
      if (!card) continue
      if (cardCoveredByLimit(card, liveLimitType)) continue
      items.push({ kind: 'system', card })
    } else {
      items.push({ kind: 'message', msg })
    }
  }
  const persistedHashes = persistedCommitHashes(visibleMessages)
  // systemCards now holds ONLY this session's local command cards (ephemeral, see above).
  items.push(
    ...input.commitCards
      .filter((card) => commitCardVisible(card, persistedHashes))
      .map((card) => ({ kind: 'commit' as const, card })),
    ...input.systemCards.map((card) => ({ kind: 'system' as const, card })),
    ...input.activityCards.map((card) => ({ kind: 'activity' as const, card })),
    ...input.tipCards.map((card) => ({ kind: 'tip' as const, card })),
  )
  items.sort((a, b) => timelineSortKey(a) - timelineSortKey(b))
  return items
}

/** A timeline item's timestamp placement: in the header row, or on its own line. */
export interface TimelineTimestampSlot extends ChatTimestampSlot {
  /** Where the time renders: in the message header row, or on a line above the item. */
  placement: 'header' | 'line'
  /** Text alignment for a line-placed time. */
  align: 'left' | 'center'
}

/**
 * Where (if anywhere) a timeline item carries its time. Typed user messages and
 * team notes carry it in their header row and always qualify; Synthase replies
 * and event cards get a line above them, and qualify with timestamps off only
 * when critical. The command browsers (/settings, /skills, /scripts, /help) are
 * this viewer's UI, not something that happened, so they never carry one.
 *
 * @param item - The timeline item.
 * @returns Its slot, or `null` when it carries no timestamp.
 */
export function timestampSlotFor(item: ChatTimelineItem): TimelineTimestampSlot | null {
  if (item.kind === 'message') {
    const { msg } = item
    if (typeof msg.timestamp !== 'number') return null
    const base = { id: msg.id, timestamp: msg.timestamp, align: 'left' as const }
    if ((msg.role === 'user' && !msg.automatic) || msg.teamOnly)
      return { ...base, alwaysShown: true, placement: 'header' }
    // An assistant placeholder with nothing rendered yet (still thinking).
    if (!msg.commitRecord && !msg.content && !msg.blocks?.length && !msg.toolCalls?.length)
      return null
    // A reply that failed verification or hit a resource limit is a critical event.
    const critical = !!msg.blocks?.some((block) => {
      const b = block as { type?: string; status?: string }
      return (b.type === 'verification' && b.status === 'error') || b.type === 'resource_limit'
    })
    return { ...base, alwaysShown: critical, placement: 'line' }
  }
  const { card } = item
  if (typeof card.timestamp !== 'number') return null
  const base = { id: card.id, timestamp: card.timestamp, placement: 'line' as const }
  if (item.kind === 'commit')
    return { ...base, alwaysShown: item.card.status === 'error', align: 'left' }
  if (item.kind === 'activity')
    return { ...base, alwaysShown: item.card.activity.status === 'failed', align: 'left' }
  if (item.kind === 'tip') return { ...base, alwaysShown: false, align: 'left' }
  const systemCard = item.card
  if (systemCard.variant === 'help') return null
  // Centered one-line notices center their time to match.
  const centered =
    systemCard.variant === 'skillsLoaded' ||
    (systemCard.variant === undefined &&
      !(systemCard.tone || systemCard.emphasized || systemCard.action) &&
      !systemCard.text.includes('\n'))
  return {
    ...base,
    alwaysShown: systemCard.variant === undefined && !!systemCard.critical,
    align: centered ? 'center' : 'left',
  }
}

/**
 * Whether the latest plan is waiting on the person: a plan step only spins while
 * a turn is running; otherwise it says it is waiting on the person when the last
 * message carries an unanswered `ask_user` (a tool call whose output status is
 * `awaiting_response`).
 *
 * @param messages - The transcript's messages.
 * @returns Whether the plan awaits a user response.
 */
export function planAwaitingUser(messages: readonly ChatMessage[]): boolean {
  return (messages[messages.length - 1]?.toolCalls ?? []).some(
    (tc) =>
      tc.output != null &&
      typeof tc.output === 'object' &&
      (tc.output as { status?: string }).status === 'awaiting_response',
  )
}

/** Everything {@link isWorkVisible} needs to decide whether the work card shows. */
export interface ChatWorkVisibilityInput {
  /** The composer's slash-command menu, when open. */
  commandMenu: unknown
  /** The model picker, when open. */
  modelPicker: unknown
  /** The effort picker, when open. */
  effortPicker: unknown
  /** The closeable panel overlay, when open. */
  panelOverlay: unknown
  /** The latest plan's steps. */
  plan: readonly unknown[]
  /** The background tasks in flight. */
  backgroundTasks: readonly unknown[]
  /** Whether the tests strip shows. */
  showTests: boolean
  /** Whether the pending-files strip shows. */
  showFiles: boolean
}

/**
 * Everything about the work in flight shares one card above the composer. The
 * tests strip also shows for a read-only viewer (watching is not editing); the
 * files strip does not (committing is editor work). Popups hide the card.
 *
 * @param input - The popup states and the work the card would show.
 * @returns Whether the work card renders.
 */
export function isWorkVisible(input: ChatWorkVisibilityInput): boolean {
  return (
    !input.commandMenu &&
    !input.modelPicker &&
    !input.effortPicker &&
    !input.panelOverlay &&
    (input.plan.length > 0 ||
      input.backgroundTasks.length > 0 ||
      input.showTests ||
      input.showFiles)
  )
}
