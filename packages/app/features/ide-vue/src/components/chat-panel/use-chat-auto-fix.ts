/**
 * `chat:auto-fix` — the verification auto-fix state machine and the deferred
 * pending messages, ported from React's two `chat:auto-fix` regions. React
 * keeps the countdown and the pending verification in one pure reducer from
 * `@molecule/app-ide-panel-logic`; this slice holds that state and the refs
 * the stream and the submit path share, ticks the countdown once a second, and
 * sends the fix message on the last second.
 *
 * The interval restarts on every second the countdown moves and whenever it
 * pauses or resumes — nothing else about the countdown changes the timer — and
 * it is cleared on unmount, so a countdown that outlives the panel sends
 * nothing.
 *
 * @module
 */

import { computed, type ComputedRef, onMounted, onUnmounted, type Ref, ref, watch } from 'vue'

import {
  AUTO_FIX_IDLE,
  type AutoFixAction,
  type AutoFixCountdown,
  autoFixCountdownReducer,
  type AutoFixState,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatCtx, ChatEffect, MutableRef, SendMessage } from './context.js'

/** What the `chat:auto-fix` slice exposes. */
export interface ChatAutoFixSlice {
  /** The reducer state: the pending verification and the live countdown. */
  readonly autoFixState: Ref<AutoFixState>
  /** Dispatches one auto-fix reducer action. */
  readonly dispatchAutoFix: (action: AutoFixAction) => void
  /** The countdown the composer shows, or `null` (React's derived value). */
  readonly autoFixCountdown: ComputedRef<AutoFixCountdown | null>
  /** A pending message deferred until the stream ends, or `null`. */
  readonly deferredPendingRef: MutableRef<string | null>
  /** Whether the deferred pending message suppresses its user bubble. */
  readonly deferredPendingSuppressRef: MutableRef<boolean>
  /** Whether the deferred pending message was user-initiated. */
  readonly deferredPendingUserInitiatedRef: MutableRef<boolean>
  /** The latest committed `sendMessage`, for the deferred path. */
  readonly sendMessageRef: MutableRef<SendMessage | null>
  /** Whether the countdown is paused (React's `autoFixCountdown?.paused`). */
  readonly autoFixPaused: ComputedRef<boolean | undefined>
  /** Pauses the countdown when the user starts typing. */
  readonly handleAutoFixPauseOnInput: () => void
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:auto-fix:1`. */
    readonly 1: ChatEffect
    /** `#effect chat:auto-fix:2`. */
    readonly 2: ChatEffect
  }
}

/**
 * Builds the `chat:auto-fix` slice.
 *
 * @param ctx - The panel context (the cap on sending, and the committed send).
 * @returns The auto-fix slice.
 */
export function createChatAutoFix(ctx: ChatCtx): ChatAutoFixSlice {
  const autoFixState = ref<AutoFixState>(AUTO_FIX_IDLE)
  const autoFixIntervalRef: MutableRef<ReturnType<typeof setInterval> | null> = { current: null }

  const deferredPendingRef: MutableRef<string | null> = { current: null }
  const deferredPendingSuppressRef: MutableRef<boolean> = { current: false }
  const deferredPendingUserInitiatedRef: MutableRef<boolean> = { current: false }
  const sendMessageRef: MutableRef<SendMessage | null> = { current: null }

  /**
   * Applies one reducer action to the countdown state.
   *
   * @param action - The action to apply.
   */
  const dispatchAutoFix = (action: AutoFixAction): void => {
    autoFixState.value = autoFixCountdownReducer(autoFixState.value, action)
  }

  const autoFixCountdown = computed<AutoFixCountdown | null>(() => autoFixState.value.countdown)
  const autoFixPaused = computed<boolean | undefined>(() => autoFixState.value.countdown?.paused)
  const autoFixSecondsLeft = computed<number | undefined>(
    () => autoFixState.value.countdown?.secondsLeft,
  )

  /** Clears the ticking interval, if one is running. */
  const clearAutoFixInterval = (): void => {
    if (autoFixIntervalRef.current) {
      clearInterval(autoFixIntervalRef.current)
      autoFixIntervalRef.current = null
    }
  }

  /** One second of the countdown has passed; the last second sends the fix message. */
  const onAutoFixSecond = (): void => {
    const countdown = autoFixState.value.countdown
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

  /** React's countdown-timer effect body: restarts the interval for the current second. */
  const runAutoFixTimer = (): void => {
    clearAutoFixInterval()
    const secondsLeft = autoFixSecondsLeft.value
    if (secondsLeft === undefined || autoFixPaused.value || secondsLeft <= 0) return
    autoFixIntervalRef.current = setInterval(onAutoFixSecond, 1000)
  }

  return {
    autoFixState,
    dispatchAutoFix,
    autoFixCountdown,
    deferredPendingRef,
    deferredPendingSuppressRef,
    deferredPendingUserInitiatedRef,
    sendMessageRef,
    autoFixPaused,
    // Auto-pause countdown when the user starts typing.
    handleAutoFixPauseOnInput: () => {
      dispatchAutoFix({ type: 'pause' })
    },
    effects: {
      1: () => {
        // Clear the countdown interval on unmount.
        onUnmounted(clearAutoFixInterval)
      },
      2: () => {
        onMounted(runAutoFixTimer)
        watch([autoFixPaused, autoFixSecondsLeft], runAutoFixTimer, { flush: 'post' })
        onUnmounted(clearAutoFixInterval)
      },
    },
  }
}
