/**
 * React's `chat:prefs` region of ChatPanel.tsx (lines 1705–1724): the
 * per-device timestamp preference, the per-device tests-bar preference, the
 * shared minute clock, and the action that persists the timestamp preference
 * and confirms it with a system card.
 *
 * Both preferences are localStorage-backed device settings, so mounting reads
 * both keys — the same reads React's store snapshots make during its first
 * render.
 *
 * @module
 */

import { fromStore } from 'svelte/store'

import { setChatTimestampsVisible } from '@molecule/app-ide-panel-logic'

import { useChatTimestampsVisible, useMinuteNow } from '../../hooks/useChatTimestampsVisible.js'
import { useTestsBarVisible } from '../../hooks/useTestsBarVisible.js'
import type { ChatContext } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:prefs` slice. */
export interface ChatPrefsSlice {
  /** Whether message timestamps are shown. */
  readonly timestampsVisible: boolean
  /** Whether the tests bar is shown. */
  readonly testsBarVisible: boolean
  /** The current minute (re-read every minute, for relative times). */
  readonly minuteNow: number
  /** Persists and announces the timestamps preference. */
  readonly applyTimestampsVisible: (visible: boolean) => void

  /** React's mount I/O for the region: none — the subscribers are created above. */
  mount(): void
}

/**
 * Creates the `chat:prefs` slice.
 *
 * @param ctx - The shared chat context.
 * @returns The two device preferences, the minute clock and the toggle action.
 */
export function createChatPrefs(ctx: ChatContext): ChatPrefsSlice {
  const timestamps = fromStore(useChatTimestampsVisible())
  const testsBar = fromStore(useTestsBarVisible())
  const minute = fromStore(useMinuteNow())

  return {
    get timestampsVisible(): boolean {
      return timestamps.current
    },
    get testsBarVisible(): boolean {
      return testsBar.current
    },
    get minuteNow(): number {
      return minute.current
    },
    applyTimestampsVisible(visible: boolean): void {
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
    },
    mount(): void {
      // React's region declares state and one action; the subscribers are the
      // hooks above, created during init, so there is no mount I/O.
    },
  }
}
