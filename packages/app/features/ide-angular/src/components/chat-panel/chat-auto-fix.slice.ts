/**
 * React's `chat:auto-fix` regions of ChatPanel.tsx (lines 596–625 and 746–797):
 * the verification auto-fix countdown and the deferred messages a stream end
 * may send.
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
 * The deferred pending message is the auto-fix path's echo of the host's
 * `pendingMessage`: a preview error or stuck report that arrived mid-stream is
 * held here and sent once the turn ends, unless verification already caught
 * the same errors. The refs are plain objects, as React's `useRef` values are.
 *
 * @module
 */

import { computed, DestroyRef, inject, Injectable, Injector, signal } from '@angular/core'

import type {
  AutoFixAction,
  AutoFixCountdown,
  AutoFixState,
} from '@molecule/app-ide-panel-logic/panels'
import { AUTO_FIX_IDLE, autoFixCountdownReducer } from '@molecule/app-ide-panel-logic/panels'

import type { ChatSendMessage } from './chat-inner-state.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'

/** The identifiers other slices and sections read from the `chat:auto-fix` slice. */
export interface ChatAutoFixSlice {
  /** React's mount I/O for the region (its I/O runs in the registered effects). */
  mount(): void

  /** React's `#effect chat:auto-fix:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void }

  /** The countdown the composer shows, or `null` when none is armed. */
  readonly autoFixCountdown: () => AutoFixCountdown | null
  /** Dispatches one auto-fix reducer action. */
  readonly dispatchAutoFix: (action: AutoFixAction) => void
  /** A pending message deferred until the stream ends, or `null`. */
  readonly deferredPendingRef: { current: string | null }
  /** Whether the deferred pending message suppresses its user bubble. */
  readonly deferredPendingSuppressRef: { current: boolean }
  /** Whether the deferred pending message was user-initiated. */
  readonly deferredPendingUserInitiatedRef: { current: boolean }
  /** The latest committed `sendMessage`, for the deferred path. */
  readonly sendMessageRef: { current: ChatSendMessage | null }
  /** Pauses the countdown when the user starts typing. */
  readonly handleAutoFixPauseOnInput: () => void
}

/** React's `chat:auto-fix` slice: the countdown state machine and its timer. */
@Injectable()
export class ChatAutoFix implements ChatAutoFixSlice {
  /** The shared state, read for the live `canEdit` prop the last second checks. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the timer in. */
  private readonly injector = inject(Injector)

  /** Clears the countdown interval when the panel unmounts (React's effect cleanup). */
  private readonly destroyRef = inject(DestroyRef)

  /** React's `useReducer(autoFixCountdownReducer, AUTO_FIX_IDLE)` state. */
  private readonly autoFixState = signal<AutoFixState>(AUTO_FIX_IDLE)

  /** The running one-second interval, or `null` (React's `autoFixIntervalRef`). */
  private readonly autoFixIntervalRef: { current: ReturnType<typeof setInterval> | null } = {
    current: null,
  }

  /** The countdown the composer shows (React's `autoFixState.countdown`). */
  readonly autoFixCountdown = computed<AutoFixCountdown | null>(() => this.autoFixState().countdown)

  /** The seconds left, read by the timer effect (React's dependency). */
  private readonly autoFixSecondsLeft = computed(() => this.autoFixState().countdown?.secondsLeft)

  /** Whether the countdown is paused, read by the timer effect (React's dependency). */
  private readonly autoFixPaused = computed(() => this.autoFixState().countdown?.paused)

  /** A pending message deferred until the stream ends (React's ref). */
  readonly deferredPendingRef: { current: string | null } = { current: null }

  /** Whether the deferred pending message suppresses its user bubble (React's ref). */
  readonly deferredPendingSuppressRef: { current: boolean } = { current: false }

  /** Whether the deferred pending message was user-initiated (React's ref). */
  readonly deferredPendingUserInitiatedRef: { current: boolean } = { current: false }

  /** The latest committed `sendMessage`, for the deferred path (React's ref). */
  readonly sendMessageRef: { current: ChatSendMessage | null } = { current: null }

  /** React's `#effect chat:auto-fix:1`: clear the interval on unmount. */
  readonly effects = {
    1: (): void => {
      // React's mount-only effect holds a cleanup and nothing else, so its
      // mount run does nothing here; the unmount cleanup is what remains.
      this.destroyRef.onDestroy(() => this.clearAutoFixInterval())
    },
    2: (): void => {
      // React's effect on `[autoFixPaused, autoFixSecondsLeft]`: it restarts the
      // one-second interval on every second the countdown moves and whenever it
      // pauses or resumes, and holds nothing else about the countdown.
      registerChatEffect(this.injector, (skip) => {
        const secondsLeft = this.autoFixSecondsLeft()
        const paused = this.autoFixPaused()
        // The first run is React's mount run, before any countdown can be armed.
        if (skip) return
        this.clearAutoFixInterval()
        if (secondsLeft === undefined || paused || secondsLeft <= 0) return
        this.autoFixIntervalRef.current = setInterval(() => this.onAutoFixSecond(), 1000)
      })
    },
  }

  /** React's mount I/O for the region: its I/O runs in the registered effects. */
  mount(): void {
    // `chat:auto-fix` has no mount I/O outside its effects: the timer effect's
    // registrations are its mount work, which `ChatInner` performs in order.
  }

  /** Dispatches one auto-fix reducer action (React's `dispatchAutoFix`). */
  readonly dispatchAutoFix = (action: AutoFixAction): void => {
    this.autoFixState.update((state) => autoFixCountdownReducer(state, action))
  }

  /** Pauses the countdown when the user starts typing (React's callback). */
  readonly handleAutoFixPauseOnInput = (): void => {
    this.dispatchAutoFix({ type: 'pause' })
  }

  /** Clears the ticking interval, if one is running. */
  private clearAutoFixInterval(): void {
    if (this.autoFixIntervalRef.current) {
      clearInterval(this.autoFixIntervalRef.current)
      this.autoFixIntervalRef.current = null
    }
  }

  /** One second of the countdown has passed; the last second sends the fix message. */
  private onAutoFixSecond(): void {
    const countdown = this.autoFixCountdown()
    if (!countdown || countdown.paused) return
    if (countdown.secondsLeft > 1) {
      this.dispatchAutoFix({ type: 'tick' })
      return
    }
    this.dispatchAutoFix({ type: 'tick' })
    // An autonomous agent-turn dispatch never fires from a read-only client.
    if (this.state.props().canEdit === false) return
    this.sendMessageRef.current?.(`Fix these issues:\n\n${countdown.output}`, undefined, {
      automatic: true,
    })
  }
}
