/**
 * `chat:prefs` — the timestamp and tests-bar display preferences, the shared
 * minute clock, and `/timestamps` (React's `chat:prefs` region, ported by unit
 * P3).
 *
 * Both preferences are per-device (`localStorage`, like sounds) and follow
 * changes from this tab and from other tabs. React reads them through
 * `useSyncExternalStore`; Solid uses a signal refreshed by the same two events
 * (the panel's custom event and the `storage` event).
 *
 * @module
 */

import type { Accessor } from 'solid-js'
import { createSignal, onCleanup } from 'solid-js'

import { setChatTimestampsVisible } from '@molecule/app-ide-panel-logic'
import {
  getTestsBarVisible,
  TESTS_BAR_EVENT,
  TESTS_BAR_STORAGE_KEY,
} from '@molecule/app-ide-panel-logic/panels'

import { useChatTimestampsVisible, useMinuteNow } from '../../hooks/useChatTimestampsVisible.js'
import type { ChatInnerCtx, SliceEffects } from './context.js'

/** What other slices read from `chat:prefs`. */
export interface ChatPrefsSlice {
  /** Whether message timestamps are shown. */
  timestampsVisible: Accessor<boolean>
  /** Whether the tests bar is shown. */
  testsBarVisible: Accessor<boolean>
  /** The current minute (re-read every minute, for relative times). */
  minuteNow: Accessor<number>
  /** Persists and announces the timestamps preference. */
  applyTimestampsVisible: (visible: boolean) => void
  /** The slice's effects, by ledger position (this slice has none). */
  effects: SliceEffects
}

/**
 * Subscribes to the tests-bar preference: this tab's custom event and another
 * tab's `storage` event (React's `useSyncExternalStore` subscribe).
 * @param onChange - Called whenever the preference may have changed.
 * @returns The unsubscribe function.
 */
function subscribeTestsBar(onChange: () => void): () => void {
  /**
   * Applies a cross-tab preference change.
   * @param event - The `storage` event another tab fired.
   */
  const onStorage = (event: StorageEvent): void => {
    if (event.key === TESTS_BAR_STORAGE_KEY) onChange()
  }
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(TESTS_BAR_EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(TESTS_BAR_EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * Whether the tests status bar is shown on this device, as a signal that
 * updates when `/test on|off`, a host settings toggle, or another tab changes
 * it.
 * @returns `true` when the bar should render (default `true`).
 */
function useTestsBarVisible(): Accessor<boolean> {
  const [visible, setVisible] = createSignal(getTestsBarVisible())

  /**
   * Re-reads the preference, the way React's store snapshot re-reads.
   */
  const refresh = (): void => {
    setVisible(getTestsBarVisible())
  }
  onCleanup(subscribeTestsBar(refresh))
  return visible
}

/**
 * Creates `chat:prefs`.
 * @param ctx - The inner ctx (the translator and the system-card list
 *   `/timestamps` announces through).
 * @returns The prefs slice.
 */
export function createChatPrefs(ctx: ChatInnerCtx): ChatPrefsSlice {
  const timestampsVisible = useChatTimestampsVisible()
  const testsBarVisible = useTestsBarVisible()
  const minuteNow = useMinuteNow()

  /**
   * Persists the timestamps preference and announces it in the timeline.
   * @param visible - Whether timestamps are now shown.
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
    effects: {},
  }
}
