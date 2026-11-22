/**
 * React's `chat:tips` region of ChatPanel.tsx (lines 1561–1679): the
 * onboarding and idle tip cards, the one-shot viewer composer prefill flag and
 * the dismiss action.
 *
 * React's four effects are registered in their own order: the conversation
 * switch reset (1), the entry tip (2), the read-only viewer's orientation tip
 * (3) and the idle rotation (4). The switch effect re-arms the entry tip and the
 * viewer composer prefill for a new conversation; the idle effect arms one
 * timer and clears it on every message change, exactly as React's cleanup does.
 *
 * @module
 */

import { untrack } from 'svelte'

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

import type { ChatContext, MutableRef } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:tips` slice. */
export interface ChatTipsSlice {
  /** The tip cards currently in the timeline. */
  readonly tipCards: TipCardEntry[]
  /** Whether the viewer prefill already ran (it must run once). */
  readonly viewerPrefillDoneRef: MutableRef<boolean>
  /** Dismisses one tip card. */
  readonly dismissTip: (id: string) => void

  /** React's mount I/O for the region: none — the region declares state and four effects. */
  mount(): void

  /** React's `#effect chat:tips:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void; 3: () => void; 4: () => void }
}

/**
 * Creates the `chat:tips` slice.
 *
 * @param ctx - The shared chat context (the conversation, the transcript and the props the gates read).
 * @returns The tip cards, the one-shot prefill flag and React's four effects.
 */
export function createChatTips(ctx: ChatContext): ChatTipsSlice {
  /** React's `tipCards` — the tips currently in the timeline. */
  let tipCards = $state.raw<TipCardEntry[]>([])
  /** React's `lastTipAtRef` — when the last rotation tip appeared. */
  const lastTipAtRef: MutableRef<number> = { current: 0 }
  /** React's `shownTipIdsRef` — the tips already shown this conversation. */
  const shownTipIdsRef: MutableRef<string[]> = { current: [] }
  /** React's `entryTipShownRef` — the entry tip shows once per conversation. */
  const entryTipShownRef: MutableRef<boolean> = { current: false }
  /** React's `viewerPrefillDoneRef` — the prefill runs once per panel. */
  const viewerPrefillDoneRef: MutableRef<boolean> = { current: false }
  /** React's `viewerTipShownRef` — the viewer orientation tip shows once. */
  const viewerTipShownRef: MutableRef<boolean> = { current: false }
  /** React's `prevConvIdRef` — the conversation id the switch effect last saw. */
  const prevConvIdRef: MutableRef<string | null> = { current: ctx.env.conversationId }

  /**
   * Appends one tip card without subscribing this run to the list it reads,
   * React's `setTipCards((prev) => [...prev, card])` updater.
   *
   * @param card - The tip card to append.
   */
  const appendTip = (card: TipCardEntry): void => {
    tipCards = untrack(() => [...tipCards, card])
  }

  return {
    get tipCards(): TipCardEntry[] {
      return tipCards
    },
    viewerPrefillDoneRef,
    dismissTip(id: string): void {
      tipCards = tipCards.filter((card) => card.id !== id)
    },
    mount(): void {
      // React's region declares state and four effects; there is no mount I/O.
    },
    effects: {
      1: (): void => {
        // Reset tips when switching to a *different* existing conversation. The
        // null→id transition (a brand-new conversation getting its server id) is
        // NOT a switch.
        $effect(() => {
          const conversationId = ctx.env.conversationId
          if (prevConvIdRef.current === conversationId) return
          const switchedConversation = prevConvIdRef.current != null
          prevConvIdRef.current = conversationId
          if (!switchedConversation) return
          tipCards = []
          lastTipAtRef.current = 0
          shownTipIdsRef.current = []
          // Re-arm the entry tip so a freshly-started chat shows the onboarding hint.
          entryTipShownRef.current = false
          // Re-arm the viewer composer prefill ('/teamsay ') for the new conversation.
          viewerPrefillDoneRef.current = false
        })
      },
      2: (): void => {
        // Entry tip: the onboarding moment. Show ONE high-value hint as soon as a
        // fresh conversation opens (no server id yet AND no messages) — before the
        // first prompt — so a new user is never left with zero tips.
        $effect(() => {
          if (ctx.env.transcriptOnly) return
          // No onboarding tip during the initial discovery phase (mvp B1).
          if (ctx.props.discovery) return
          if (ctx.env.conversationId != null || ctx.chat.messages.length > 0) return
          // Once per conversation (the switch effect above re-arms it).
          if (entryTipShownRef.current) return
          entryTipShownRef.current = true
          shownTipIdsRef.current = [...shownTipIdsRef.current, ENTRY_TIP.id]
          // The entry stores the tip's KEY + English default, not the sentence:
          // the render translates it, so a locale switch re-translates this tip too.
          appendTip({ id: crypto.randomUUID(), tip: ENTRY_TIP, timestamp: Date.now() })
        })
      },
      3: (): void => {
        // Viewer orientation tip: a read-only member's explainer — GOLD like the
        // team-only messages and led by the same `people` icon it explains. Gated
        // on an EXPLICIT canEdit === false so hosts that don't do roles never see it.
        $effect(() => {
          if (ctx.env.transcriptOnly || ctx.props.canEdit !== false || ctx.props.discovery) return
          if (viewerTipShownRef.current) return
          viewerTipShownRef.current = true
          // Same as the entry tip: the entry carries the tip's definition and the
          // render translates it, so a locale switch re-translates this tip too.
          appendTip({
            id: crypto.randomUUID(),
            tip: VIEWER_TIP,
            timestamp: Date.now(),
            accent: NOTICE_TONE.gold.accent,
            icon: 'people' as const,
          })
        })
      },
      4: (): void => {
        // Surface an occasional idle tip. This effect re-runs on every message
        // change, so the idle timer is continually reset by activity; it only
        // fires once the conversation has been quiet for TIP_IDLE_MS.
        let timer: ReturnType<typeof setTimeout> | undefined
        /**
         * Reads the live message count without subscribing, React's
         * `useEffectEvent(() => messages.length)`.
         *
         * @returns The transcript's message count.
         */
        const readMessageCount = (): number => ctx.chat.messages.length
        $effect(() => {
          if (timer) {
            clearTimeout(timer)
            timer = undefined
          }
          // Public transcript viewers have no actionable composer onboarding.
          if (ctx.env.transcriptOnly) return
          // No idle tips during the initial discovery phase (mvp B1).
          if (ctx.props.discovery) return
          const messages = ctx.chat.messages
          if (messages.some((m) => m.isStreaming) || messages.length < TIP_MIN_MESSAGES) return
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
            // Same as the entry tip: key + English default now, sentence at render.
            tipCards = [...tipCards, { id: crypto.randomUUID(), tip, timestamp: Date.now() }]
          }, TIP_IDLE_MS)
          return () => {
            if (timer) {
              clearTimeout(timer)
              timer = undefined
            }
          }
        })
      },
    },
  }
}
