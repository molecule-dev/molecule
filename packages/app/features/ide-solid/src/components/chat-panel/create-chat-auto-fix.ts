/**
 * `chat:auto-fix` — the verification auto-fix countdown and the deferred
 * messages a stream end may send (React's two `chat:auto-fix` regions, ported
 * by unit U5).
 *
 * After the AI finishes, if verification found errors, a three-second
 * countdown runs before the panel sends a fix message itself; the user can
 * pause, resume or cancel it. The pending errors and the countdown are one
 * pure state machine (`autoFixCountdownReducer` in
 * `@molecule/app-ide-panel-logic`), held here as one signal. The interval
 * restarts on every second the countdown moves and whenever it pauses or
 * resumes — nothing else about the countdown changes the timer — and it is
 * cleared on unmount so a countdown that outlives the panel sends nothing.
 *
 * @module
 */

import type { Accessor } from 'solid-js'
import { createEffect, createSignal, onCleanup } from 'solid-js'

import type {
  AutoFixAction,
  AutoFixCountdown,
  AutoFixState,
} from '@molecule/app-ide-panel-logic/panels'
import { AUTO_FIX_IDLE, autoFixCountdownReducer } from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, MutableRef, SendChatMessage, SliceEffects } from './context.js'

/** What other slices read from `chat:auto-fix`. */
export interface ChatAutoFixSlice {
  /** The countdown, or null when nothing is armed. */
  autoFixCountdown: Accessor<AutoFixCountdown | null>
  /** Dispatches one reducer action (React's `useReducer` dispatcher). */
  dispatchAutoFix: (action: AutoFixAction) => void
  /** A message deferred until streaming ends. */
  deferredPendingRef: MutableRef<string | null>
  /** Whether the deferred message suppresses its user bubble. */
  deferredPendingSuppressRef: MutableRef<boolean>
  /** Whether the deferred message was directly requested by the user. */
  deferredPendingUserInitiatedRef: MutableRef<boolean>
  /** The latest `sendMessage`, filled once the chat slice exists. */
  sendMessageRef: MutableRef<SendChatMessage | null>
  /** Pauses the countdown when the user starts typing. */
  handleAutoFixPauseOnInput: () => void
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:auto-fix`.
 * @param ctx - The inner ctx (the live `canEdit` prop the last second checks).
 * @returns The auto-fix slice.
 */
export function createChatAutoFix(ctx: ChatInnerCtx): ChatAutoFixSlice {
  const [autoFixState, setAutoFixState] = createSignal<AutoFixState>(AUTO_FIX_IDLE)
  const autoFixIntervalRef: MutableRef<ReturnType<typeof setInterval> | null> = { current: null }

  // Deferred pending message — stores auto-fix messages (preview errors, stuck)
  // that arrived while the AI was streaming. Sent after streaming ends, unless
  // verification already caught the same errors (to avoid duplicates).
  const deferredPendingRef: MutableRef<string | null> = { current: null }
  // Tracks whether a deferred pending message should suppress its user bubble
  // (mirrors pendingMessageSuppressUser for the deferred-send path).
  const deferredPendingSuppressRef: MutableRef<boolean> = { current: false }
  // Mirrors pendingMessageUserInitiated for the deferred-send path, so a user's
  // own "Fix with AI" request keeps its stop-bypassing intent when deferred.
  const deferredPendingUserInitiatedRef: MutableRef<boolean> = { current: false }
  const sendMessageRef: MutableRef<SendChatMessage | null> = { current: null }

  const autoFixCountdown = (): AutoFixCountdown | null => autoFixState().countdown

  /**
   * Applies one reducer action to the auto-fix state.
   * @param action - The action to apply.
   */
  const dispatchAutoFix = (action: AutoFixAction): void => {
    setAutoFixState((state) => autoFixCountdownReducer(state, action))
  }

  /** Clears the ticking interval, if one is running. */
  const clearAutoFixInterval = (): void => {
    if (autoFixIntervalRef.current) {
      clearInterval(autoFixIntervalRef.current)
      autoFixIntervalRef.current = null
    }
  }

  /** One second of the countdown has passed; the last second sends the fix message. */
  const onAutoFixSecond = (): void => {
    const countdown = autoFixCountdown()
    if (!countdown || countdown.paused) return
    if (countdown.secondsLeft > 1) {
      dispatchAutoFix({ type: 'tick' })
      return
    }
    dispatchAutoFix({ type: 'tick' })
    // An autonomous agent-turn dispatch never fires from a read-only client.
    if (ctx.props.canEdit === false) return
    sendMessageRef.current?.(`Fix these issues:\n\n${countdown.output}`, undefined, {
      automatic: true,
    })
  }

  return {
    autoFixCountdown,
    dispatchAutoFix,
    deferredPendingRef,
    deferredPendingSuppressRef,
    deferredPendingUserInitiatedRef,
    sendMessageRef,
    // Auto-pause countdown when user starts typing
    handleAutoFixPauseOnInput: () => {
      dispatchAutoFix({ type: 'pause' })
    },
    effects: {
      // #effect chat:auto-fix:1 — clear the countdown interval on unmount.
      1: () => {
        onCleanup(clearAutoFixInterval)
      },

      // #effect chat:auto-fix:2
      2: () => {
        // Ticks the countdown down and auto-sends the fix message. It restarts
        // on every second the countdown moves and whenever it pauses or
        // resumes; nothing else about the countdown changes the timer.
        createEffect(() => {
          const countdown = autoFixCountdown()
          const secondsLeft = countdown?.secondsLeft
          const paused = countdown?.paused
          clearAutoFixInterval()
          if (secondsLeft === undefined || paused || secondsLeft <= 0) return

          const interval = setInterval(onAutoFixSecond, 1000)
          autoFixIntervalRef.current = interval

          onCleanup(() => {
            clearInterval(interval)
            if (autoFixIntervalRef.current === interval) autoFixIntervalRef.current = null
          })
        })
      },
    },
  }
}
