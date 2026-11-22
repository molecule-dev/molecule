/**
 * React's `chat:prefs` region of ChatPanel.tsx (lines 1706–1725): the
 * per-device display preferences — whether message timestamps show, whether the
 * tests strip shows — plus the shared minute clock the timestamps read, and the
 * setter that confirms a timestamps change with an inline system card.
 *
 * React resolves all three through hooks during render (a `localStorage`-backed
 * store subscribed for cross-tab updates); the Angular hooks subscribe at slice
 * construction, which runs at the same point in the panel's lifecycle, so a
 * `/timestamps` toggle or another tab's change reaches the timeline the same
 * way. The region declares no effects in React, so this slice has no `effects`
 * entry and its `mount()` reads nothing.
 *
 * @module
 */

import { inject, Injectable, type Signal } from '@angular/core'

import { setChatTimestampsVisible } from '@molecule/app-ide-panel-logic'

import { useChatTimestampsVisible, useMinuteNow } from '../../hooks/useChatTimestampsVisible.js'
import { useTestsBarVisible } from '../../hooks/useTestsBarVisible.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatSystemCards } from './chat-system-cards.slice.js'

/** The identifiers other slices and sections read from the `chat:prefs` slice. */
export interface ChatPrefsSlice {
  /** React's mount I/O for the region (the region declares no effects). */
  mount(): void

  /** Whether timestamps are shown beside messages. */
  readonly timestampsVisible: Signal<boolean>
  /** Whether the tests status strip is shown. */
  readonly testsBarVisible: Signal<boolean>
  /** The current minute, so relative timestamps re-render. */
  readonly minuteNow: Signal<number>
  /** Sets the timestamps preference and confirms it with a card. */
  readonly applyTimestampsVisible: (visible: boolean) => void
}

/** React's `chat:prefs` slice: the display preferences and their clock. */
@Injectable()
export class ChatPrefs implements ChatPrefsSlice {
  /** The shared state, read for the translation and the card publisher. */
  private readonly state = inject(ChatInnerState)

  /** Whether timestamps are shown beside messages (React's `useChatTimestampsVisible`). */
  readonly timestampsVisible: Signal<boolean> = useChatTimestampsVisible()

  /** Whether the tests status strip is shown (React's `useTestsBarVisible`). */
  readonly testsBarVisible: Signal<boolean> = useTestsBarVisible()

  /** The current minute, so relative timestamps re-render (React's `useMinuteNow`). */
  readonly minuteNow: Signal<number> = useMinuteNow()

  /** React's mount I/O for the region: the region declares no mount work. */
  mount(): void {
    // No mount I/O in `chat:prefs`: the preference stores subscribe during
    // construction (React's hooks read their snapshots during render).
  }

  /**
   * Sets the timestamps preference and announces the new state with an inline
   * system card, using React's i18n keys and default copy.
   *
   * @param visible - Whether message timestamps should show.
   */
  readonly applyTimestampsVisible = (visible: boolean): void => {
    setChatTimestampsVisible(visible)
    const t = this.state.env.t
    this.state
      .slice(ChatSystemCards)
      .addSystemCard(
        visible
          ? t('ide.chat.timestampsShown', undefined, { defaultValue: 'Timestamps shown.' })
          : t('ide.chat.timestampsHidden', undefined, { defaultValue: 'Timestamps hidden.' }),
      )
  }
}
