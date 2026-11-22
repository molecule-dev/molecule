/**
 * `chat:activity` — the inline activity cards, ported from React's
 * `chat:activity` region: the activity list, the stream's card publisher, and
 * the two effects that load and persist the list on the conversation.
 *
 * The cards are captured outbound side effects the agent caused (email / sms /
 * push / webhook / channel): `addActivityCard` places each just before an
 * actively-streaming reply, dedupes it by id, and (unless the user scrolled
 * away) scrolls the newest into view. The effects restore the list on a
 * conversation switch and write back every card this viewer captured — a
 * pushed card arrives `received`, so it is excluded from the PUT — exactly as
 * React's two effects do, in the same order.
 *
 * @module
 */

import { onMounted, onUnmounted, type Ref, ref, watch } from 'vue'

import type { Activity } from '@molecule/app-ide-panel-logic'
import type { ActivityCardEntry } from '@molecule/app-ide-panel-logic/panels'

import type { ChatCtx, ChatEffect, MutableRef, SetState } from './context.js'

/**
 * Wraps a ref in React's `setState` shape: a value, or an updater of the
 * previous value.
 *
 * @param target - The ref the state lives in.
 * @returns The setter.
 */
function makeSetter<T>(target: Ref<T>): SetState<T> {
  return (value) => {
    target.value = typeof value === 'function' ? (value as (previous: T) => T)(target.value) : value
  }
}

/** What the `chat:activity` slice exposes. */
export interface ChatActivitySlice {
  /** The activity cards in the timeline. */
  readonly activityCards: Ref<ActivityCardEntry[]>
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:activity:1` — restores the conversation's cards. */
    readonly 1: ChatEffect
    /** `#effect chat:activity:2` — persists the viewer's captured cards. */
    readonly 2: ChatEffect
  }
}

/**
 * Builds the `chat:activity` slice.
 *
 * @param ctx - The panel context (the stream, the transcript, the scroll port and the conversation).
 * @returns The activity slice.
 */
export function createChatActivity(ctx: ChatCtx): ChatActivitySlice {
  const activityCards = ref<ActivityCardEntry[]>([])
  const setActivityCards = makeSetter(activityCards)
  // Which conversation's cards are loaded (so a PUT never runs before the restore).
  const activityCardsLoadedConvRef: MutableRef<string | null> = { current: null }
  // The conversation the effect ran for last time, so a switch can clear the list.
  const prevActivityCardsConvRef: MutableRef<string | null> = { current: null }

  /**
   * Publishes one captured activity card into the timeline, ahead of an
   * actively-streaming reply, deduped by the activity id.
   *
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
    setActivityCards((prev) =>
      prev.some((card) => card.id === activity.id)
        ? prev
        : [...prev, { id: activity.id, activity, timestamp: ts, received }],
    )
    if (!ctx.scroll.userScrolledUpRef.current) {
      setTimeout(() => {
        const el = ctx.scroll.messagesContainerRef.current
        if (el) el.scrollTop = el.scrollHeight
      }, 50)
    }
  }

  // addActivityCard is stable, so the stream callback's ref is filled once.
  ctx.stream.addActivityCardRef.current = addActivityCard

  return {
    activityCards,
    effects: {
      1: () => {
        // Persist + restore the inline activity cards on the conversation so the
        // captured side effects the user saw live reappear on reload — live ===
        // stored. The entries are fully serializable, so there is no in-session
        // callback to strip.
        let cancelCurrent: (() => void) | null = null
        const run = (): void => {
          cancelCurrent?.()
          cancelCurrent = null
          const conversationId = ctx.env.conversationId.value
          const prevConv = prevActivityCardsConvRef.current
          prevActivityCardsConvRef.current = conversationId
          activityCardsLoadedConvRef.current = null
          if (!conversationId) return
          if (prevConv && prevConv !== conversationId) setActivityCards([])
          let cancelled = false
          cancelCurrent = () => {
            cancelled = true
          }
          const projectId = ctx.props.projectId
          void ctx.env.http
            .get<{ activityCards?: ActivityCardEntry[] }>(
              `/projects/${projectId}/conversations/${conversationId}/activity-cards`,
            )
            .then((res) => {
              if (cancelled) return
              const loaded = res.data?.activityCards ?? []
              // Merge by id so a card added before the fetch resolved is preserved.
              setActivityCards((prev) => {
                const byId = new Map<string, ActivityCardEntry>()
                for (const card of loaded) byId.set(card.id, card)
                for (const card of prev) byId.set(card.id, card)
                return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp)
              })
              activityCardsLoadedConvRef.current = conversationId
            })
            .catch((_error) => {
              // Best-effort restore (bound as `_error` per Rule 14): a failed
              // activity-card fetch is non-critical; allow newly-added cards to
              // persist by marking this conversation loaded.
              if (!cancelled) activityCardsLoadedConvRef.current = conversationId
            })
        }
        onMounted(run)
        onUnmounted(() => cancelCurrent?.())
        // The session's conversation source, not the endpoint itself: it advances
        // from the context-usage effect's change callback, so this restore lands
        // AFTER the history load, as React's later-registered effect does.
        watch(
          [ctx.chat.conversationSource, () => ctx.props.projectId, () => ctx.props.canEdit],
          run,
          {
            flush: 'post',
          },
        )
      },
      2: () => {
        const run = (): void => {
          const conversationId = ctx.env.conversationId.value
          if (!conversationId || activityCardsLoadedConvRef.current !== conversationId) return
          if (ctx.props.canEdit === false) return
          const projectId = ctx.props.projectId
          void ctx.env.http
            .put(`/projects/${projectId}/conversations/${conversationId}/activity-cards`, {
              activityCards: activityCards.value.filter((card) => !card.received),
            })
            .catch((_error) => {
              // Best-effort save (bound as `_error` per Rule 14): the in-memory
              // cards remain the source of truth this session if the PUT fails.
            })
        }
        onMounted(run)
        watch(
          [
            activityCards,
            ctx.env.conversationId,
            () => ctx.props.projectId,
            () => ctx.props.canEdit,
          ],
          run,
          { flush: 'post' },
        )
      },
    },
  }
}
