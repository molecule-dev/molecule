/**
 * `chat:tips` — the onboarding / idle tip cards, ported from React's
 * `chat:tips` region: the card list, the one-shot viewer prefill flag and the
 * dismiss action.
 *
 * React's four effects are registered in their own order: the conversation
 * switch reset (1), the entry tip (2), the read-only viewer's orientation tip
 * (3) and the idle rotation (4). The switch effect re-arms the entry tip and the
 * viewer composer prefill for a new conversation; the idle effect arms one
 * timer and clears it on every message change, exactly as React's cleanup does.
 *
 * @module
 */

import { onMounted, onUnmounted, type Ref, ref, watch } from 'vue'

import { NOTICE_TONE } from '@molecule/app-ide-panel-logic'
import type { TipCardEntry } from '@molecule/app-ide-panel-logic/panels'
import {
  ENTRY_TIP,
  pickIdleTip,
  shouldShowIdleTip,
  TIP_IDLE_MS,
  TIP_MIN_MESSAGES,
  VIEWER_TIP,
} from '@molecule/app-ide-panel-logic/panels'

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

/** What the `chat:tips` slice exposes. */
export interface ChatTipsSlice {
  /** The tip cards in the timeline. */
  readonly tipCards: Ref<TipCardEntry[]>
  /** Whether the viewer's one-time composer prefill already ran. */
  readonly viewerPrefillDoneRef: MutableRef<boolean>
  /** Dismisses one tip. */
  readonly dismissTip: (id: string) => void
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:tips:1` — resets the tips when switching conversations. */
    readonly 1: ChatEffect
    /** `#effect chat:tips:2` — the entry tip on a fresh conversation. */
    readonly 2: ChatEffect
    /** `#effect chat:tips:3` — the read-only viewer's orientation tip. */
    readonly 3: ChatEffect
    /** `#effect chat:tips:4` — the idle-tip rotation. */
    readonly 4: ChatEffect
  }
}

/**
 * Builds the `chat:tips` slice.
 *
 * @param ctx - The panel context (the conversation, the transcript and the props the gates read).
 * @returns The tips slice.
 */
export function createChatTips(ctx: ChatCtx): ChatTipsSlice {
  const tipCards = ref<TipCardEntry[]>([])
  const setTipCards = makeSetter(tipCards)
  const lastTipAtRef: MutableRef<number> = { current: 0 }
  const shownTipIdsRef: MutableRef<string[]> = { current: [] }
  const entryTipShownRef: MutableRef<boolean> = { current: false }
  // Whether the viewer composer's "/teamsay " prefill already ran (see chat:input).
  const viewerPrefillDoneRef: MutableRef<boolean> = { current: false }
  const viewerTipShownRef: MutableRef<boolean> = { current: false }

  /**
   * Removes one tip from the timeline.
   *
   * @param id - The tip card's id.
   */
  const dismissTip = (id: string): void => {
    setTipCards((prev) => prev.filter((card) => card.id !== id))
  }

  return {
    tipCards,
    viewerPrefillDoneRef,
    dismissTip,
    effects: {
      1: () => {
        // Reset tips when switching to a *different* existing conversation. The
        // null→id transition (a brand-new conversation getting its server id) is
        // NOT a switch.
        let prevConvId: string | null = ctx.env.conversationId.value
        watch(
          ctx.env.conversationId,
          (conversationId) => {
            if (prevConvId === conversationId) return
            const switchedConversation = prevConvId != null
            prevConvId = conversationId
            if (switchedConversation) {
              setTipCards([])
              lastTipAtRef.current = 0
              shownTipIdsRef.current = []
              // Re-arm the entry tip so a freshly-started chat shows the onboarding hint.
              entryTipShownRef.current = false
              // Re-arm the viewer composer prefill ('/teamsay ') for the new conversation.
              viewerPrefillDoneRef.current = false
            }
          },
          { flush: 'post' },
        )
      },
      2: () => {
        // Entry tip: the onboarding moment. Show ONE high-value hint as soon as a
        // fresh conversation opens (no server id yet AND no messages) — before the
        // first prompt — so a new user is never left with zero tips.
        const run = (): void => {
          if (ctx.env.transcriptOnly.value) return
          // No onboarding tip during the initial discovery phase (mvp B1).
          if (ctx.props.discovery) return
          if (ctx.env.conversationId.value != null || ctx.chat.messages.value.length > 0) return
          // Once per conversation (the switch effect above re-arms it).
          if (entryTipShownRef.current) return
          entryTipShownRef.current = true
          shownTipIdsRef.current = [...shownTipIdsRef.current, ENTRY_TIP.id]
          // The entry stores the tip's KEY + English default, not the sentence.
          const entryCard = {
            id: crypto.randomUUID(),
            tip: ENTRY_TIP,
            timestamp: Date.now(),
          }
          setTipCards((prev) => [...prev, entryCard])
        }
        onMounted(run)
        watch(
          [
            () => ctx.env.conversationId.value,
            () => ctx.chat.messages.value.length,
            () => ctx.props.discovery,
            () => ctx.env.transcriptOnly.value,
          ],
          run,
          { flush: 'post' },
        )
      },
      3: () => {
        // Viewer orientation tip: a read-only member's explainer — GOLD like the
        // team-only messages and led by the same `people` icon it explains.
        const run = (): void => {
          if (ctx.env.transcriptOnly.value || ctx.props.canEdit !== false || ctx.props.discovery)
            return
          if (viewerTipShownRef.current) return
          viewerTipShownRef.current = true
          const viewerCard = {
            id: crypto.randomUUID(),
            tip: VIEWER_TIP,
            timestamp: Date.now(),
            accent: NOTICE_TONE.gold.accent,
            icon: 'people' as const,
          }
          setTipCards((prev) => [...prev, viewerCard])
        }
        onMounted(run)
        watch(
          [() => ctx.props.canEdit, () => ctx.props.discovery, () => ctx.env.transcriptOnly.value],
          run,
          { flush: 'post' },
        )
      },
      4: () => {
        // Surface an occasional idle tip. The effect re-runs on every message
        // change, so the idle timer is continually reset by activity.
        let timer: ReturnType<typeof setTimeout> | undefined
        const readMessageCount = (): number => ctx.chat.messages.value.length
        const run = (): void => {
          if (timer) {
            clearTimeout(timer)
            timer = undefined
          }
          // Public transcript viewers have no actionable composer onboarding.
          if (ctx.env.transcriptOnly.value) return
          // No idle tips during the initial discovery phase (mvp B1).
          if (ctx.props.discovery) return
          const messages = ctx.chat.messages.value
          if (messages.some((message) => message.isStreaming) || messages.length < TIP_MIN_MESSAGES)
            return
          const armedAt = Date.now()
          timer = setTimeout(() => {
            const show = shouldShowIdleTip(
              {
                messageCount: readMessageCount(),
                msSinceLastActivity: Date.now() - armedAt,
                msSinceLastTip: lastTipAtRef.current
                  ? Date.now() - lastTipAtRef.current
                  : Number.POSITIVE_INFINITY,
              },
              Math.random(),
            )
            if (!show) return
            const tip = pickIdleTip(shownTipIdsRef.current, Math.random())
            shownTipIdsRef.current = [...shownTipIdsRef.current, tip.id]
            lastTipAtRef.current = Date.now()
            const idleCard = { id: crypto.randomUUID(), tip, timestamp: Date.now() }
            setTipCards((prev) => [...prev, idleCard])
          }, TIP_IDLE_MS)
        }
        onMounted(run)
        onUnmounted(() => {
          if (timer) clearTimeout(timer)
        })
        watch(
          [ctx.chat.messages, () => ctx.props.discovery, () => ctx.env.transcriptOnly.value],
          run,
          {
            flush: 'post',
          },
        )
      },
    },
  }
}
