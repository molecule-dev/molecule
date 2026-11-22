/**
 * React's `chat:activity` region of ChatPanel.tsx (lines 1473–1559): the inline
 * activity cards — captured outbound side effects (email / sms / push /
 * webhook / channel) the agent caused — plus the stream's card publisher and
 * the two effects that restore and persist the list on the conversation.
 *
 * `addActivityCard` places each card just before an actively-streaming reply
 * (the same heuristic as `addSystemCard`), dedupes it by id, and scrolls the
 * newest into view unless the user scrolled away. The cards are fully
 * serializable, so the effects store them on the conversation like the local
 * command cards: the restore merges by id (a card captured before the fetch
 * resolved survives) and the write-back excludes the cards this viewer received
 * from a teammate (their author persists them).
 *
 * React performs each effect's mount-time work on the first run; Angular runs
 * that work in {@link ChatActivity.mount} (called from `ChatInner`'s mount
 * pass, child before parent) and each `effects.<n>()` registers the update half
 * with its first run skipped, so React's effect order is preserved.
 *
 * @module
 */

import { computed, DestroyRef, inject, Injectable, Injector, signal } from '@angular/core'

import type { Activity } from '@molecule/app-ide-panel-logic'
import type { ActivityCardEntry } from '@molecule/app-ide-panel-logic/panels'

import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import { ChatScroll } from './chat-scroll.slice.js'
import { ChatStream } from './chat-stream.slice.js'
import { ChatSystemCards } from './chat-system-cards.slice.js'

/** The identifiers other slices and sections read from the `chat:activity` slice. */
export interface ChatActivitySlice {
  /** React's mount I/O for the region: the two effects' initial runs. */
  mount(): void

  /** React's `#effect chat:activity:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void }

  /** The activity cards in the timeline. */
  readonly activityCards: () => ActivityCardEntry[]
  /** Publishes one captured activity card into the timeline. */
  readonly addActivityCard: (activity: Activity) => void
}

/**
 * React's `chat:activity` slice: the captured side-effect cards, restored and
 * persisted on the conversation.
 */
@Injectable()
export class ChatActivity implements ChatActivitySlice {
  /** The shared state, read for the conversation, the project and the props. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the region's effects in. */
  private readonly injector = inject(Injector)

  /** Cancels the in-flight restore when the panel unmounts (React's effect cleanup). */
  private readonly destroyRef = inject(DestroyRef)

  /** The activity cards in the timeline (React's `useState<ActivityCardEntry[]>([])`). */
  readonly activityCards = signal<ActivityCardEntry[]>([])

  /**
   * The project id, as a computed so the restore effect re-runs only when the
   * id itself changes — React's `[projectId]` dependency.
   */
  private readonly projectId = computed(() => this.state.props().projectId)

  /**
   * The edit permission, as a computed so the effects re-run only when it
   * changes — React's `[canEdit]` dependency.
   */
  private readonly canEdit = computed(() => this.state.props().canEdit)

  /**
   * Which conversation's cards are loaded (React's `activityCardsLoadedConvRef`),
   * so a write-back never runs before that conversation's restore resolved.
   */
  private readonly activityCardsLoadedConvRef: { current: string | null } = { current: null }

  /**
   * The conversation the restore effect last ran for (React's
   * `prevActivityCardsConvRef`), so a switch can clear the previous list.
   */
  private readonly prevActivityCardsConvRef: { current: string | null } = { current: null }

  /** Cancels the current restore run (React's effect cleanup), or null. */
  private cancelRestore: (() => void) | null = null

  /** React's committed ref: the stream publishes activity cards through this. */
  constructor() {
    // `addActivityCard` is stable, so the stream callback's ref is filled once.
    this.state.slice(ChatStream).addActivityCardRef.current = this.addActivityCard
    this.destroyRef.onDestroy(() => this.cancelRestore?.())
  }

  /**
   * Publishes one captured activity card into the timeline, ahead of an
   * actively-streaming reply, deduped by the activity id.
   *
   * @param activity - The captured side effect to show.
   */
  readonly addActivityCard = (activity: Activity): void => {
    // Captured synchronously here (NOT inside the setState updater, which React
    // invokes during reconciliation after applyPushedStreamEvent has reset the
    // ref) so a pushed card is reliably flagged received and excluded from this
    // viewer's persist PUT.
    const received = this.state.slice(ChatStream).applyingPushedRef.current || undefined
    // Place just before an actively-streaming message so the card isn't pinned
    // below the growing response (same heuristic as addSystemCard).
    let ts = new Date(activity.timestamp).getTime()
    if (Number.isNaN(ts)) ts = Date.now()
    const streaming = this.state
      .slice(ChatSystemCards)
      .readMessages()
      .find((m) => m.isStreaming)
    if (streaming && streaming.timestamp <= ts) {
      ts = streaming.timestamp - 1
    }
    this.activityCards.update((prev) =>
      prev.some((c) => c.id === activity.id)
        ? prev
        : [...prev, { id: activity.id, activity, timestamp: ts, received }],
    )
    if (!this.state.slice(ChatScroll).userScrolledUpRef.current) {
      setTimeout(() => {
        const el = this.state.slice(ChatScroll).messagesContainerRef.current
        if (el) el.scrollTop = el.scrollHeight
      }, 50)
    }
  }

  /**
   * React's `#effect chat:activity:1`: restores the conversation's inline
   * activity cards, merging them by id with any captured meanwhile.
   */
  private restoreActivityCards(): void {
    // React's cleanup of the previous run (deps changed or unmounted).
    this.cancelRestore?.()
    this.cancelRestore = null
    const conversationId = this.state.env.conversationId()
    const prevConv = this.prevActivityCardsConvRef.current
    this.prevActivityCardsConvRef.current = conversationId
    this.activityCardsLoadedConvRef.current = null
    if (!conversationId) return
    if (prevConv && prevConv !== conversationId) this.activityCards.set([])
    const projectId = this.projectId()
    let cancelled = false
    this.cancelRestore = (): void => {
      cancelled = true
    }
    void this.state.env.http
      .get<{ activityCards?: ActivityCardEntry[] }>(
        `/projects/${projectId}/conversations/${conversationId}/activity-cards`,
      )
      .then((res) => {
        if (cancelled) return
        const loaded = res.data?.activityCards ?? []
        // Merge by id so a card added before the fetch resolved is preserved.
        this.activityCards.update((prev) => {
          const byId = new Map<string, ActivityCardEntry>()
          for (const card of loaded) byId.set(card.id, card)
          for (const card of prev) byId.set(card.id, card)
          return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp)
        })
        this.activityCardsLoadedConvRef.current = conversationId
      })
      .catch((_error) => {
        // Best-effort restore (bound as `_error` per Rule 14): a failed
        // activity-card fetch is non-critical; allow newly-added cards to
        // persist by marking this conversation loaded.
        if (!cancelled) this.activityCardsLoadedConvRef.current = conversationId
      })
  }

  /**
   * React's `#effect chat:activity:2`: writes back the cards this viewer
   * captured (a received card is its author's to persist).
   */
  private persistActivityCards(): void {
    const conversationId = this.state.env.conversationId()
    const cards = this.activityCards()
    if (!conversationId || this.activityCardsLoadedConvRef.current !== conversationId) return
    if (this.canEdit() === false) return
    const projectId = this.projectId()
    void this.state.env.http
      .put(`/projects/${projectId}/conversations/${conversationId}/activity-cards`, {
        activityCards: cards.filter((card) => !card.received),
      })
      .catch((_error) => {
        // Best-effort save (bound as `_error` per Rule 14): the in-memory cards
        // remain the source of truth this session if the PUT fails.
      })
  }

  /** React's mount I/O for the region: effect 1's restore runs at its own ledger position. */
  mount(): void {
    // The restore is effect 1's first run, registered among the other effects so
    // the conversation's activity-cards GET keeps React's position (immediately
    // after the session's history load and before the model catalog's fetch).
  }

  /** React's `#effect chat:activity:<n>` ledger, registered at its positions. */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, () => {
        // React's dependencies: [conversationId, projectId, http, canEdit]; its
        // mount run is this effect's first run, and a change re-runs it.
        this.restoreActivityCards()
      })
    },
    2: (): void => {
      registerChatEffect(this.injector, (skip) => {
        // React's dependencies: [activityCards, conversationId, projectId, http, canEdit].
        void this.activityCards()
        void this.state.env.conversationId()
        void this.projectId()
        void this.canEdit()
        if (skip) return
        this.persistActivityCards()
      })
    },
  }
}
