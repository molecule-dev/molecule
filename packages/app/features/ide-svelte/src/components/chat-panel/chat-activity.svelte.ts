/**
 * React's `chat:activity` region of ChatPanel.tsx (lines 1473–1559): the inline
 * activity cards — the captured outbound side effects a turn produced — the
 * adder the stream fills once, and the two effects that persist and restore
 * them on the conversation so live === stored.
 *
 * The adder is a plain function reading the transcript, the pushed-frame ref and
 * the scroll refs at call time, exactly as React's stable `useCallback` does, and
 * it is published through `ctx.stream.addActivityCardRef` where React fills
 * `addActivityCardRef` with `useCommittedRef`.
 *
 * @module
 */

import { SvelteDate, SvelteMap } from 'svelte/reactivity'

import type { Activity } from '@molecule/app-ide-panel-logic'
import type { ActivityCardEntry } from '@molecule/app-ide-panel-logic/panels'

import type { ChatContext } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:activity` slice. */
export interface ChatActivitySlice {
  /** The conversation's activity cards, in timeline order. */
  readonly activityCards: ActivityCardEntry[]

  /**
   * React's `addActivityCard`: stamps and appends a captured side effect, deduped
   * by id, placing it just above an actively-streaming reply.
   *
   * @param activity - The captured side effect.
   */
  addActivityCard(activity: Activity): void

  /** React's mount I/O for the region: publish the adder to the stream slice. */
  mount(): void

  /** React's `#effect chat:activity:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void }
}

/**
 * Creates the `chat:activity` slice.
 *
 * @param ctx - The shared chat context (the transcript, the stream refs and the scroll refs).
 * @returns The activity cards, the adder, and React's two effects.
 */
export function createChatActivity(ctx: ChatContext): ChatActivitySlice {
  /** React's `activityCards` state — the inline captured side effects. */
  let activityCards = $state.raw<ActivityCardEntry[]>([])

  // React's refs: the conversation whose cards are loaded (gating the persist
  // effect), and the previous conversation id (telling a switch from a new one).
  const activityCardsLoadedConvRef: { current: string | null } = { current: null }
  const prevActivityCardsConvRef: { current: string | null } = { current: null }

  // The effects' dependencies as derived cells: a prop source re-notifies on
  // every host-prop write (even to the same value), and reading the props
  // directly would re-run these effects — re-fetching the conversation's
  // activity cards — whenever an unrelated prop changes. A derived re-notifies
  // only when the VALUE moves, which is React's per-dependency effect.
  const liveConversationId = $derived(ctx.env.conversationId)
  const liveProjectId = $derived(ctx.props.projectId)
  const liveCanEdit = $derived(ctx.props.canEdit)

  /**
   * React's `addActivityCard`: captures whether this card came from a teammate's
   * push (so it is never re-persisted), places it just before an actively
   * streaming reply, dedupes by id, and pins the view to the bottom unless the
   * user has scrolled up.
   *
   * @param activity - The captured side effect.
   */
  const addActivityCard = (activity: Activity): void => {
    // Captured synchronously here (NOT inside a state updater, which React invokes
    // during reconciliation after applyPushedStreamEvent has reset the ref) so a
    // pushed card is reliably flagged received and excluded from this viewer's
    // persist PUT.
    const received = ctx.stream.applyingPushedRef.current || undefined
    // Place just before an actively-streaming message so the card isn't pinned
    // below the growing response (same heuristic as addSystemCard).
    let ts = new SvelteDate(activity.timestamp).getTime()
    if (Number.isNaN(ts)) ts = Date.now()
    const streaming = ctx.chat.messages.find((message) => message.isStreaming)
    if (streaming && streaming.timestamp <= ts) {
      ts = streaming.timestamp - 1
    }
    if (!activityCards.some((card) => card.id === activity.id)) {
      activityCards = [...activityCards, { id: activity.id, activity, timestamp: ts, received }]
    }
    if (!ctx.scroll.userScrolledUpRef.current) {
      setTimeout(() => {
        const el = ctx.scroll.messagesContainerRef.current
        if (el) el.scrollTop = el.scrollHeight
      }, 50)
    }
  }

  return {
    get activityCards(): ActivityCardEntry[] {
      return activityCards
    },
    addActivityCard,
    mount(): void {
      // React's `useCommittedRef` fills the stream's adder ref on every commit;
      // the adder is stable here, so it is filled once.
      ctx.stream.addActivityCardRef.current = addActivityCard
    },
    effects: {
      1: (): void => {
        // React's restore effect: on a conversation switch clear this session's
        // cards, then merge the stored ones by id (a card captured before the
        // fetch resolved is preserved and both sides sort by timestamp).
        $effect(() => {
          const conversationId = liveConversationId
          const projectId = liveProjectId
          // Read so a viewer/editor change re-runs the effect as React's
          // dependency array does; the fetch itself does not use it.
          void liveCanEdit
          const http = ctx.env.http

          const prevConv = prevActivityCardsConvRef.current
          prevActivityCardsConvRef.current = conversationId
          activityCardsLoadedConvRef.current = null
          if (!conversationId) return
          if (prevConv && prevConv !== conversationId) activityCards = []

          let cancelled = false
          void http
            .get<{ activityCards?: ActivityCardEntry[] }>(
              `/projects/${projectId}/conversations/${conversationId}/activity-cards`,
            )
            .then((res) => {
              if (cancelled) return
              const loaded = res.data?.activityCards ?? []
              // Merge by id so a card added before the fetch resolved is preserved.
              const byId = new SvelteMap<string, ActivityCardEntry>()
              for (const card of loaded) byId.set(card.id, card)
              for (const card of activityCards) byId.set(card.id, card)
              activityCards = [...byId.values()].sort((a, b) => a.timestamp - b.timestamp)
              activityCardsLoadedConvRef.current = conversationId
            })
            .catch((_error) => {
              // Best-effort restore (bound as _error per Rule 14): a failed activity-card
              // fetch is non-critical; allow newly-added cards to persist by marking this
              // conversation loaded.
              if (!cancelled) activityCardsLoadedConvRef.current = conversationId
            })
          return () => {
            cancelled = true
          }
        })
      },
      2: (): void => {
        // React's persist effect: once the conversation's cards are loaded, PUT
        // this viewer's own cards (never the pushed/received ones). A read-only
        // viewer never writes.
        $effect(() => {
          const conversationId = liveConversationId
          const projectId = liveProjectId
          const http = ctx.env.http
          const canEdit = liveCanEdit
          const cards = activityCards
          if (!conversationId || activityCardsLoadedConvRef.current !== conversationId) return
          if (canEdit === false) return
          void http
            .put(`/projects/${projectId}/conversations/${conversationId}/activity-cards`, {
              activityCards: cards.filter((card) => !card.received),
            })
            .catch((_error) => {
              // Best-effort save (bound as _error per Rule 14): the in-memory cards remain
              // the source of truth this session if the PUT fails.
            })
        })
      },
    },
  }
}
