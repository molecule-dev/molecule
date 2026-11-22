/**
 * `chat:activity` — the conversation's persisted activity cards (captured side
 * effects): the card list, the stream's publisher, and the two effects that
 * restore and persist the list (React's `chat:activity` region, ported by unit
 * U4).
 *
 * The cards are the outbound side effects the agent caused (email / sms / push
 * / webhook / channel): `addActivityCard` places each just before an actively
 * streaming reply so it is never pinned below the growing response, dedupes it
 * by id, and — unless the user scrolled away — scrolls the newest into view.
 * Effect 1 restores the conversation's list; effect 2 writes back every card
 * this viewer captured, while a pushed card arrives `received` and is excluded
 * from the PUT, exactly as React's two effects do, in the same order.
 *
 * @module
 */

import type { Accessor } from 'solid-js'
import { createEffect, createSignal, on, onCleanup } from 'solid-js'

import type { Activity } from '@molecule/app-ide-panel-logic'
import type { ActivityCardEntry } from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, MutableRef, SliceEffects } from './context.js'

/** What other slices read from `chat:activity`. */
export interface ChatActivitySlice {
  /** The conversation's activity cards, in timeline order. */
  activityCards: Accessor<ActivityCardEntry[]>
  /** Adds one captured activity to the timeline and persists it. */
  addActivityCard: (activity: Activity) => void
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:activity`.
 * @param ctx - The inner ctx (the stream's applying-pushed flag, the transcript
 *   the insertion heuristic reads, the scroll port and the conversation).
 * @returns The activity slice.
 */
export function createChatActivity(ctx: ChatInnerCtx): ChatActivitySlice {
  const [activityCards, setActivityCards] = createSignal<ActivityCardEntry[]>([])
  // Which conversation's cards are loaded, so a PUT never runs before its restore.
  const activityCardsLoadedConvRef: MutableRef<string | null> = { current: null }
  // The conversation the restore effect ran for last time, so a switch can clear.
  const prevActivityCardsConvRef: MutableRef<string | null> = { current: null }

  /**
   * Publishes one captured activity card into the timeline, ahead of an
   * actively-streaming reply, deduped by the activity id.
   * @param activity - The captured side effect to show.
   */
  const addActivityCard = (activity: Activity): void => {
    // Captured synchronously here (NOT inside the setState updater, which React
    // invokes during reconciliation after applyPushedStreamEvent has reset the
    // ref) so a pushed card is reliably flagged received and excluded from this
    // viewer's persist PUT.
    const received = ctx.stream.applyingPushedRef.current || undefined
    // Place just before an actively-streaming message so the card isn't pinned
    // below the growing response (same heuristic as addSystemCard).
    let ts = new Date(activity.timestamp).getTime()
    if (Number.isNaN(ts)) ts = Date.now()
    const streaming = ctx.systemCards.readMessages().find((message) => message.isStreaming)
    if (streaming && streaming.timestamp <= ts) {
      ts = streaming.timestamp - 1
    }
    setActivityCards((previous) =>
      previous.some((card) => card.id === activity.id)
        ? previous
        : [...previous, { id: activity.id, activity, timestamp: ts, received }],
    )
    if (!ctx.scroll.userScrolledUpRef.current) {
      setTimeout(() => {
        const element = ctx.scroll.messagesContainerRef.current
        if (element) element.scrollTop = element.scrollHeight
      }, 50)
    }
  }

  // `addActivityCard` is stable, so the stream callback's ref is filled once.
  ctx.stream.addActivityCardRef.current = addActivityCard

  return {
    activityCards,
    addActivityCard,
    effects: {
      // #effect chat:activity:1
      1: () => {
        // Persist + restore the inline activity cards on the conversation
        // (mirrors systemCards) so the captured side effects the user saw live
        // reappear on reload — live === stored. The entries are fully
        // serializable (id + activity data + timestamp), so unlike systemCards
        // there is no in-session callback to strip.
        const run = (): void => {
          const conversationId = ctx.env.conversationId()
          const prevConv = prevActivityCardsConvRef.current
          prevActivityCardsConvRef.current = conversationId
          activityCardsLoadedConvRef.current = null
          if (!conversationId) return
          if (prevConv && prevConv !== conversationId) setActivityCards([])
          let cancelled = false
          onCleanup(() => {
            cancelled = true
          })
          void ctx.env.http
            .get<{ activityCards?: ActivityCardEntry[] }>(
              `/projects/${ctx.props.projectId}/conversations/${conversationId}/activity-cards`,
            )
            .then((res) => {
              if (cancelled) return
              const loaded = res.data?.activityCards ?? []
              // Marked loaded BEFORE the merge below: the merge is a state
              // update, and this framework runs the persist effect synchronously
              // from it, so the flag must already be set when that effect runs.
              activityCardsLoadedConvRef.current = conversationId
              // Merge by id so a card added before the fetch resolved is preserved.
              setActivityCards((previous) => {
                const byId = new Map<string, ActivityCardEntry>()
                for (const card of loaded) byId.set(card.id, card)
                for (const card of previous) byId.set(card.id, card)
                return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp)
              })
            })
            .catch((_error) => {
              // Best-effort restore (bound as `_error` per Rule 14): a failed
              // activity-card fetch is non-critical; allow newly-added cards to
              // persist by marking this conversation loaded.
              if (!cancelled) activityCardsLoadedConvRef.current = conversationId
            })
        }
        createEffect(
          on(() => [ctx.env.conversationId(), ctx.props.projectId, ctx.props.canEdit], run, {
            defer: false,
          }),
        )
      },

      // #effect chat:activity:2
      2: () => {
        const run = (): void => {
          const conversationId = ctx.env.conversationId()
          if (!conversationId || activityCardsLoadedConvRef.current !== conversationId) return
          if (ctx.props.canEdit === false) return
          void ctx.env.http
            .put(
              `/projects/${ctx.props.projectId}/conversations/${conversationId}/activity-cards`,
              {
                activityCards: activityCards().filter((card) => !card.received),
              },
            )
            .catch((_error) => {
              // Best-effort save (bound as `_error` per Rule 14): the in-memory
              // cards remain the source of truth this session if the PUT fails.
            })
        }
        createEffect(
          on(
            () => [
              activityCards(),
              ctx.env.conversationId(),
              ctx.props.projectId,
              ctx.props.canEdit,
            ],
            run,
            { defer: false },
          ),
        )
      },
    },
  }
}
