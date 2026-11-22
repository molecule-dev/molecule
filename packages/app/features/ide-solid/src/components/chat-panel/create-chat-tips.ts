/**
 * `chat:tips` — the onboarding, viewer-orientation and idle tip cards (React's
 * `chat:tips` region, ported by unit P5): the card list, the one-shot viewer
 * prefill flag and the dismiss action.
 *
 * React's four effects are registered in their own ledger order: the
 * conversation-switch reset (1), the entry tip (2), the read-only viewer's
 * orientation tip (3) and the idle rotation (4). The switch effect re-arms the
 * entry tip and the viewer composer prefill for a new conversation; the idle
 * effect arms one timer and clears it on every message change, exactly as
 * React's cleanup does.
 *
 * @module
 */

import type { Accessor } from 'solid-js'
import { createEffect, createSignal, on, onCleanup } from 'solid-js'

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

import type { ChatInnerCtx, MutableRef, SliceEffects } from './context.js'

/** What other slices read from `chat:tips`. */
export interface ChatTipsSlice {
  /** The tip cards currently in the timeline. */
  tipCards: Accessor<TipCardEntry[]>
  /** Whether the viewer prefill already ran (it must run once). */
  viewerPrefillDoneRef: MutableRef<boolean>
  /** Dismisses one tip card. */
  dismissTip: (id: string) => void
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:tips`.
 * @param ctx - The inner ctx (the conversation the tips key off, the transcript
 *   their idle gates read, and the props that switch them off).
 * @returns The tips slice.
 */
export function createChatTips(ctx: ChatInnerCtx): ChatTipsSlice {
  const [tipCards, setTipCards] = createSignal<TipCardEntry[]>([])
  const lastTipAtRef: MutableRef<number> = { current: 0 }
  const shownTipIdsRef: MutableRef<string[]> = { current: [] }
  const entryTipShownRef: MutableRef<boolean> = { current: false }
  // Whether the viewer composer's "/teamsay " prefill already ran (see chat:input).
  const viewerPrefillDoneRef: MutableRef<boolean> = { current: false }
  const viewerTipShownRef: MutableRef<boolean> = { current: false }

  /**
   * Removes one tip from the timeline.
   * @param id - The tip card's id.
   */
  const dismissTip = (id: string): void => {
    setTipCards((previous) => previous.filter((card) => card.id !== id))
  }

  return {
    tipCards,
    viewerPrefillDoneRef,
    dismissTip,
    effects: {
      // #effect chat:tips:1 — reset the tips when switching conversations.
      1: () => {
        // Reset tips when switching to a *different* existing conversation. The
        // null→id transition (a brand-new conversation getting its server id) is
        // NOT a switch.
        let previousConversationId: string | null = ctx.env.conversationId()
        createEffect(
          on(
            ctx.env.conversationId,
            (conversationId) => {
              if (previousConversationId === conversationId) return
              const switchedConversation = previousConversationId != null
              previousConversationId = conversationId
              if (!switchedConversation) return
              setTipCards([])
              lastTipAtRef.current = 0
              shownTipIdsRef.current = []
              // Re-arm the entry tip so a freshly-started chat shows the onboarding hint.
              entryTipShownRef.current = false
              // Re-arm the viewer composer prefill ('/teamsay ') for the new conversation.
              viewerPrefillDoneRef.current = false
            },
            { defer: false },
          ),
        )
      },

      // #effect chat:tips:2 — the entry tip on a fresh conversation.
      2: () => {
        // The onboarding moment: show ONE high-value hint as soon as a fresh
        // conversation opens (no server id yet AND no messages) — before the first
        // prompt — so a new user is never left with zero tips.
        const run = (): void => {
          if (ctx.env.transcriptOnly()) return
          // No onboarding tip during the initial discovery phase (mvp B1).
          if (ctx.props.discovery) return
          if (ctx.env.conversationId() != null || ctx.chat.messages().length > 0) return
          // Once per conversation (the switch effect above re-arms it).
          if (entryTipShownRef.current) return
          entryTipShownRef.current = true
          shownTipIdsRef.current = [...shownTipIdsRef.current, ENTRY_TIP.id]
          // The entry stores the tip's KEY + English default, not the sentence:
          // the render translates it, so a locale switch re-translates this tip too.
          const entryCard = { id: crypto.randomUUID(), tip: ENTRY_TIP, timestamp: Date.now() }
          // The onboarding card joins in the same commit as the transcript that
          // is already in flight (React batches a passive effect's update with
          // the pending history load); one microtask keeps the first paint from
          // showing a tip over an empty, still-loading conversation.
          queueMicrotask(() => setTipCards((previous) => [...previous, entryCard]))
        }
        createEffect(
          on(
            () => [
              ctx.env.conversationId(),
              ctx.chat.messages().length,
              ctx.props.discovery,
              ctx.env.transcriptOnly(),
            ],
            run,
            { defer: false },
          ),
        )
      },

      // #effect chat:tips:3 — the read-only viewer's orientation tip.
      3: () => {
        // A read-only member's explainer — GOLD like the team-only messages and led
        // by the same `people` icon it explains, so the badge on a team note is
        // self-describing. Gated on an EXPLICIT canEdit === false so hosts that
        // don't do roles never see it.
        const run = (): void => {
          if (ctx.env.transcriptOnly() || ctx.props.canEdit !== false || ctx.props.discovery) return
          if (viewerTipShownRef.current) return
          viewerTipShownRef.current = true
          // The entry carries the tip's definition and the render translates it, so
          // a locale switch re-translates this tip too.
          const viewerCard = {
            id: crypto.randomUUID(),
            tip: VIEWER_TIP,
            timestamp: Date.now(),
            accent: NOTICE_TONE.gold.accent,
            icon: 'people' as const,
          }
          // Queued beside the entry tip so both join in the same commit, in the
          // order their effects declared them (see the entry tip's note).
          queueMicrotask(() => setTipCards((previous) => [...previous, viewerCard]))
        }
        createEffect(
          on(() => [ctx.props.canEdit, ctx.props.discovery, ctx.env.transcriptOnly()], run, {
            defer: false,
          }),
        )
      },

      // #effect chat:tips:4 — the idle-tip rotation.
      4: () => {
        // This effect re-runs on every message change, so the idle timer is
        // continually reset by activity; it only fires once the conversation has
        // been quiet for TIP_IDLE_MS — and even then only when the cooldown + random
        // roll allow, and never before TIP_MIN_MESSAGES.
        let timer: ReturnType<typeof setTimeout> | undefined
        /** Reads the live message count the way React's effect event does. */
        const readMessageCount = (): number => ctx.chat.messages().length
        const run = (): void => {
          if (timer) {
            clearTimeout(timer)
            timer = undefined
          }
          // Public transcript viewers have no actionable composer onboarding.
          if (ctx.env.transcriptOnly()) return
          // No idle tips during the initial discovery phase (mvp B1).
          if (ctx.props.discovery) return
          const messages = ctx.chat.messages()
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
            // Key + English default now, sentence at render.
            const idleCard = { id: crypto.randomUUID(), tip, timestamp: Date.now() }
            setTipCards((previous) => [...previous, idleCard])
          }, TIP_IDLE_MS)
        }
        createEffect(
          on(() => [ctx.chat.messages(), ctx.props.discovery, ctx.env.transcriptOnly()], run, {
            defer: false,
          }),
        )
        onCleanup(() => {
          if (timer) clearTimeout(timer)
        })
      },
    },
  }
}
