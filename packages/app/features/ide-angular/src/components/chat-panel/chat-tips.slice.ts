/**
 * React's `chat:tips` region of ChatPanel.tsx (lines 1561–1679): the
 * dismissable onboarding tips — the entry tip on a fresh conversation, the
 * read-only viewer's orientation tip and the idle rotation — plus the one-shot
 * viewer composer-prefill flag.
 *
 * Two surfaces: an entry tip shown once on a fresh conversation so a brand-new
 * user always sees how to drive the agent, and an idle rotation that MAY
 * surface more tips after the conversation has sat idle for a while — gated by
 * a cooldown and a random roll, so the timeline never fills with tips. The idle
 * clock resets on any message activity, and a shown tip never reappears.
 *
 * React performs each effect's mount-time work on the first run; Angular does
 * the same on the effect's own first run, registered at its ledger position, so
 * React's effect order is preserved.
 *
 * @module
 */

import { DestroyRef, inject, Injectable, Injector, signal } from '@angular/core'

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

import { ChatChat } from './chat-chat.slice.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'

/** The identifiers other slices and sections read from the `chat:tips` slice. */
export interface ChatTipsSlice {
  /** React's mount I/O for the region: the effects' initial runs. */
  mount(): void

  /** React's `#effect chat:tips:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void; 3: () => void; 4: () => void }

  /** The tip cards in the timeline. */
  readonly tipCards: () => TipCardEntry[]
  /** Whether the viewer's one-time composer prefill already ran. */
  readonly viewerPrefillDoneRef: { current: boolean }
  /** Dismisses one tip. */
  readonly dismissTip: (id: string) => void
}

/**
 * React's `chat:tips` slice: the onboarding, viewer and idle tip cards.
 */
@Injectable()
export class ChatTips implements ChatTipsSlice {
  /** The shared state, read for the conversation, the props and the transcript. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the region's effects in. */
  private readonly injector = inject(Injector)

  /** Clears the idle timer when the panel unmounts (React's effect cleanup). */
  private readonly destroyRef = inject(DestroyRef)

  /** The tip cards in the timeline (React's `tipCards` state). */
  readonly tipCards = signal<TipCardEntry[]>([])

  /** When the last rotation tip appeared (React's `lastTipAtRef`, initial `0`). */
  private readonly lastTipAtRef: { current: number } = { current: 0 }

  /** The tips already shown this conversation (React's `shownTipIdsRef`). */
  private readonly shownTipIdsRef: { current: string[] } = { current: [] }

  /** Whether the entry tip already showed this conversation (React's ref). */
  private readonly entryTipShownRef: { current: boolean } = { current: false }

  /** Whether the viewer's one-time composer prefill already ran (React's ref). */
  readonly viewerPrefillDoneRef: { current: boolean } = { current: false }

  /** Whether the viewer orientation tip already showed (React's ref). */
  private readonly viewerTipShownRef: { current: boolean } = { current: false }

  /**
   * The conversation id the switch effect last saw (React's `prevConvIdRef`,
   * seeded from the endpoint by the switch effect's first run, as React's
   * `useRef` seeds it from the first render).
   */
  private readonly prevConvIdRef: { current: string | null } = { current: null }

  /** The armed idle-rotation timer, or null (React's effect-local timer). */
  private idleTimer: ReturnType<typeof setTimeout> | null = null

  /** Clears the idle timer on unmount, the way React's effect cleanup does. */
  constructor() {
    this.destroyRef.onDestroy(() => this.clearIdleTimer())
  }

  /**
   * Appends one tip card, React's `setTipCards((prev) => [...prev, card])`.
   *
   * @param card - The tip card to append.
   */
  private appendTip(card: TipCardEntry): void {
    this.tipCards.update((prev) => [...prev, card])
  }

  /** Clears the armed idle timer, if any. */
  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
  }

  /**
   * Resets the tips when switching to a *different* existing conversation. The
   * null→id transition (a brand-new conversation getting its server id) is NOT
   * a switch.
   */
  private switchConversation(): void {
    const conversationId = this.state.env.conversationId()
    if (this.prevConvIdRef.current === conversationId) return
    const switchedConversation = this.prevConvIdRef.current != null
    this.prevConvIdRef.current = conversationId
    if (!switchedConversation) return
    this.tipCards.set([])
    this.lastTipAtRef.current = 0
    this.shownTipIdsRef.current = []
    // Re-arm the entry tip so a freshly-started chat shows the onboarding hint.
    this.entryTipShownRef.current = false
    // Re-arm the viewer composer prefill ('/teamsay ') for the new conversation.
    this.viewerPrefillDoneRef.current = false
  }

  /**
   * Entry tip: the onboarding moment. Show ONE high-value hint as soon as a
   * fresh conversation opens (no server id yet AND no messages) — before the
   * first prompt — so a new user is never left with zero tips. Resuming an
   * existing conversation is NOT a fresh start.
   */
  private showEntryTip(): void {
    if (this.state.env.transcriptOnly()) return
    // No onboarding tip during the initial discovery phase (mvp B1).
    if (this.state.props().discovery) return
    if (this.state.env.conversationId() != null || this.state.slice(ChatChat).messages().length > 0)
      return
    // Once per conversation (the switch effect above re-arms it).
    if (this.entryTipShownRef.current) return
    this.entryTipShownRef.current = true
    this.shownTipIdsRef.current = [...this.shownTipIdsRef.current, ENTRY_TIP.id]
    // The entry stores the tip's KEY + English default, not the sentence: the
    // render translates it, so a locale switch re-translates this tip too.
    this.appendTip({ id: crypto.randomUUID(), tip: ENTRY_TIP, timestamp: Date.now() })
  }

  /**
   * Viewer orientation tip: a read-only member's explainer — GOLD like the
   * team-only messages and led by the same `people` icon it explains. Gated on
   * an EXPLICIT `canEdit === false` so hosts that do not do roles never see it.
   */
  private showViewerTip(): void {
    const props = this.state.props()
    if (this.state.env.transcriptOnly() || props.canEdit !== false || props.discovery) return
    if (this.viewerTipShownRef.current) return
    this.viewerTipShownRef.current = true
    // Same as the entry tip: the entry carries the tip's definition and the
    // render translates it, so a locale switch re-translates this tip too.
    this.appendTip({
      id: crypto.randomUUID(),
      tip: VIEWER_TIP,
      timestamp: Date.now(),
      accent: NOTICE_TONE.gold.accent,
      icon: 'people',
    })
  }

  /**
   * Surface an occasional idle tip. Re-armed on every message change, so the
   * idle clock is continually reset by activity; it only fires once the
   * conversation has been quiet for `TIP_IDLE_MS` — and even then only when the
   * cooldown + random roll allow, and never before `TIP_MIN_MESSAGES`. The timer
   * appends its card when it fires.
   */
  private armIdleTip(): void {
    this.clearIdleTimer()
    // Public transcript viewers have no actionable composer onboarding.
    if (this.state.env.transcriptOnly()) return
    // No idle tips during the initial discovery phase (mvp B1).
    if (this.state.props().discovery) return
    const messages = this.state.slice(ChatChat).messages()
    if (messages.some((message) => message.isStreaming) || messages.length < TIP_MIN_MESSAGES)
      return
    const armedAt = Date.now()
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null
      const show = shouldShowIdleTip(
        {
          messageCount: this.state.slice(ChatChat).messages().length,
          msSinceLastActivity: Date.now() - armedAt,
          msSinceLastTip: this.lastTipAtRef.current
            ? Date.now() - this.lastTipAtRef.current
            : Number.POSITIVE_INFINITY,
        },
        Math.random(),
      )
      if (!show) return
      const tip = pickIdleTip(this.shownTipIdsRef.current, Math.random())
      this.shownTipIdsRef.current = [...this.shownTipIdsRef.current, tip.id]
      this.lastTipAtRef.current = Date.now()
      // Same as the entry tip: key + English default now, sentence at render.
      this.appendTip({ id: crypto.randomUUID(), tip, timestamp: Date.now() })
    }, TIP_IDLE_MS)
  }

  /**
   * React's mount I/O for the region: each effect's first run happens inside
   * the effect itself, at its own ledger position (the entry tip lands before
   * the auto-sent initial message, as in React).
   */
  mount(): void {
    // The effects' first runs perform the region's mount work; nothing mounts here.
  }

  /** Dismisses one tip. */
  readonly dismissTip = (id: string): void => {
    this.tipCards.update((prev) => prev.filter((card) => card.id !== id))
  }

  /** React's `#effect chat:tips:<n>` ledger, registered at its positions. */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, (skip) => {
        void this.state.env.conversationId()
        if (skip) {
          // React's `useRef(conversationId)` initializer, read by the first run.
          this.prevConvIdRef.current = this.state.env.conversationId()
          return
        }
        this.switchConversation()
      })
    },
    2: (): void => {
      registerChatEffect(this.injector, () => {
        void this.state.env.transcriptOnly()
        void this.state.props()
        void this.state.env.conversationId()
        void this.state.slice(ChatChat).messages()
        this.showEntryTip()
      })
    },
    3: (): void => {
      registerChatEffect(this.injector, () => {
        void this.state.env.transcriptOnly()
        void this.state.props()
        this.showViewerTip()
      })
    },
    4: (): void => {
      registerChatEffect(this.injector, () => {
        void this.state.env.transcriptOnly()
        void this.state.props()
        void this.state.slice(ChatChat).messages()
        this.armIdleTip()
      })
    },
  }
}
