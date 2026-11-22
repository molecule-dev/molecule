/**
 * React's two `chat:auto-fix` regions of ChatPanel.tsx (lines 596–625 and
 * 746–797): the verification auto-fix countdown and the deferred pending
 * message.
 *
 * The countdown is one pure state machine from
 * `@molecule/app-ide-panel-logic/panels` (`autoFixCountdownReducer`): it holds
 * the pending verification errors and, once the turn ends, arms a three-second
 * countdown. The component owns the side effects — the one-second interval, and
 * the fix message the last second sends (automatic, never from a read-only
 * client). The interval restarts on every second the countdown moves and
 * whenever it pauses or resumes; nothing else about the countdown changes the
 * timer, exactly as React's dependency array says.
 *
 * @module
 */

import {
  AUTO_FIX_IDLE,
  type AutoFixAction,
  type AutoFixCountdown,
  autoFixCountdownReducer,
  type AutoFixState,
} from '@molecule/app-ide-panel-logic/panels'

import type { ChatContext, ChatSendMessage, MutableRef } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:auto-fix` slice. */
export interface ChatAutoFixSlice {
  /** The countdown, or null when nothing is armed. */
  readonly autoFixCountdown: AutoFixCountdown | null
  /** Arms, ticks, pauses or clears the countdown. */
  readonly dispatchAutoFix: (action: AutoFixAction) => void
  /** The message deferred until the running turn ends. */
  readonly deferredPendingRef: MutableRef<string | null>
  /** Whether the deferred message suppresses its user bubble. */
  readonly deferredPendingSuppressRef: MutableRef<boolean>
  /** Whether the deferred message was directly requested by the user. */
  readonly deferredPendingUserInitiatedRef: MutableRef<boolean>
  /** The latest `sendMessage`, filled once the chat slice exists. */
  readonly sendMessageRef: MutableRef<ChatSendMessage | null>
  /** Pauses the countdown when the user starts typing. */
  readonly handleAutoFixPauseOnInput: () => void

  /** React's mount I/O for the region: none — it declares state, refs and two effects. */
  mount(): void

  /** React's `#effect chat:auto-fix:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void }
}

/**
 * Creates the `chat:auto-fix` slice.
 *
 * @param ctx - The shared chat context (the read-only gate the send path reads).
 * @returns The countdown state, the shared refs, the input-pause action and React's two effects.
 */
export function createChatAutoFix(ctx: ChatContext): ChatAutoFixSlice {
  /** React's `autoFixState` — the pending verification and the live countdown. */
  let autoFixState = $state.raw<AutoFixState>(AUTO_FIX_IDLE)
  /** React's `autoFixIntervalRef` — the one-second ticker, or null when idle. */
  const autoFixIntervalRef: MutableRef<ReturnType<typeof setInterval> | null> = { current: null }
  /** React's `deferredPendingRef` — a message deferred until streaming ends. */
  const deferredPendingRef: MutableRef<string | null> = { current: null }
  /** React's `deferredPendingSuppressRef` — the deferred message's bubble gate. */
  const deferredPendingSuppressRef: MutableRef<boolean> = { current: false }
  /** React's `deferredPendingUserInitiatedRef` — the deferred message's intent. */
  const deferredPendingUserInitiatedRef: MutableRef<boolean> = { current: false }
  /** React's `sendMessageRef` — filled once the chat slice exists. */
  const sendMessageRef: MutableRef<ChatSendMessage | null> = { current: null }

  /**
   * Applies one reducer action to the countdown state.
   *
   * @param action - The action to apply.
   */
  const dispatchAutoFix = (action: AutoFixAction): void => {
    autoFixState = autoFixCountdownReducer(autoFixState, action)
  }

  // React's two effect-2 dependencies, as derived cells: a derived re-notifies
  // only when ITS value changed, so an unrelated reducer update (the pending
  // errors) leaves the one-second timer running, exactly as React's
  // `[autoFixPaused, autoFixSecondsLeft]` array does.
  const autoFixPaused = $derived(autoFixState.countdown?.paused)
  const autoFixSecondsLeft = $derived(autoFixState.countdown?.secondsLeft)

  /** Clears the ticking interval, if one is running. */
  const clearAutoFixInterval = (): void => {
    if (autoFixIntervalRef.current) {
      clearInterval(autoFixIntervalRef.current)
      autoFixIntervalRef.current = null
    }
  }

  // One second of the countdown has passed. The last second sends the fix message.
  const onAutoFixSecond = (): void => {
    const countdown = autoFixState.countdown
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
    get autoFixCountdown(): AutoFixCountdown | null {
      return autoFixState.countdown
    },
    dispatchAutoFix,
    deferredPendingRef,
    deferredPendingSuppressRef,
    deferredPendingUserInitiatedRef,
    sendMessageRef,
    handleAutoFixPauseOnInput(): void {
      // Auto-pause countdown when the user starts typing.
      dispatchAutoFix({ type: 'pause' })
    },
    mount(): void {
      // React's region declares state, refs and two effects; there is no mount I/O.
    },
    effects: {
      1: (): void => {
        // Clear the countdown interval on unmount (React's cleanup-only effect).
        $effect(() => {
          return () => {
            clearAutoFixInterval()
          }
        })
      },
      2: (): void => {
        $effect(() => {
          // React's dependencies are exactly the pause flag and the seconds left.
          const paused = autoFixPaused
          const secondsLeft = autoFixSecondsLeft
          clearAutoFixInterval()
          if (secondsLeft === undefined || paused || secondsLeft <= 0) return

          autoFixIntervalRef.current = setInterval(onAutoFixSecond, 1000)

          return () => {
            clearAutoFixInterval()
          }
        })
      },
    },
  }
}
