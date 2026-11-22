/**
 * `chat:prefs` — the per-device chat preferences, ported from React's
 * `chat:prefs` region: the timestamps-visible flag and its confirmation card,
 * the tests-bar visibility and the once-a-minute clock the timestamps read.
 *
 * The three preference hooks are the Vue counterparts of React's and subscribe
 * to the same shared stores when the slice is created (React reads their
 * snapshots during render). The setter publishes its confirmation through the
 * system-card slice, as React's `applyTimestampsVisible` does.
 *
 * @module
 */

import type { Ref } from 'vue'

import { setChatTimestampsVisible } from '@molecule/app-ide-panel-logic'

import { useChatTimestampsVisible, useMinuteNow } from '../../hooks/useChatTimestampsVisible.js'
import { useTestsBarVisible } from '../../hooks/useTestsBarVisible.js'
import type { ChatCtx } from './context.js'

/** What the `chat:prefs` slice exposes. */
export interface ChatPrefsSlice {
  /** Whether timestamps are shown beside messages. */
  readonly timestampsVisible: Ref<boolean>
  /** Whether the tests status strip is shown. */
  readonly testsBarVisible: Ref<boolean>
  /** The current minute, so relative timestamps re-render. */
  readonly minuteNow: Ref<number>
  /** Sets the timestamps preference and confirms it with a card. */
  readonly applyTimestampsVisible: (visible: boolean) => void
}

/**
 * Builds the `chat:prefs` slice.
 *
 * @param ctx - The panel context (translation and the system-card publisher).
 * @returns The prefs slice.
 */
export function createChatPrefs(ctx: ChatCtx): ChatPrefsSlice {
  const timestampsVisible = useChatTimestampsVisible()
  const testsBarVisible = useTestsBarVisible()
  const minuteNow = useMinuteNow()

  /**
   * Turns item timestamps on or off for this device and confirms the change
   * with an inline system card, using React's i18n keys and defaults.
   *
   * @param visible - Whether timestamps should show.
   */
  const applyTimestampsVisible = (visible: boolean): void => {
    setChatTimestampsVisible(visible)
    ctx.systemCards.addSystemCard(
      visible
        ? ctx.env.t('ide.chat.timestampsShown', undefined, {
            defaultValue: 'Timestamps shown.',
          })
        : ctx.env.t('ide.chat.timestampsHidden', undefined, {
            defaultValue: 'Timestamps hidden.',
          }),
    )
  }

  return {
    timestampsVisible,
    testsBarVisible,
    minuteNow,
    applyTimestampsVisible,
  }
}
