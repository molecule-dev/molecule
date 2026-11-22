/**
 * React's `chat:auto-commit` regions of ChatPanel.tsx (the countdown reducer at
 * line 805, the debounced persistence effect at 2119, the file-change re-arm and
 * the one-second tick at 2369–2401, and the committed-ref wiring at 3956).
 *
 * The live source of truth is the pure reducer from `@molecule/app-ide-panel-logic`;
 * this slice owns only the side effects React's component owns — the debounced
 * `PATCH` of `project.settings.autoCommitSeconds` (skipping the value just
 * hydrated on load and gated until that load resolves), the reset on every AI or
 * user-side file change, the tick interval, and the HOLD: a turn streaming from
 * this client, a teammate's remote turn, or a pending verification auto-fix
 * follow-up freezes the countdown, so a commit only ever fires once the agent
 * and the user are actually finished.
 *
 * React's `executeCommandRef` (region 4) is kept current with the latest command
 * dispatcher; here the tick reads `ctx.commands.executeCommand` at call time,
 * which is the same "latest committed version" the ref holds, so no separate
 * wiring step is needed.
 *
 * @module
 */

import { untrack } from 'svelte'

import {
  AUTO_COMMIT_DISABLED,
  type AutoCommitAction,
  autoCommitReducer,
  type AutoCommitState,
  isAutoCommitArmed,
} from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'

import type { ChatSetState } from './chat-popups.svelte.js'
import type { ChatContext, MutableRef } from './context.svelte.js'

/** The package logger (the same channel the rest of the panel logs on). */
const logger = getLogger('chat-panel')

/** The identifiers other slices and sections read from the `chat:auto-commit` slice. */
export interface ChatAutoCommitSlice {
  /** The reducer's current state. */
  readonly autoCommit: AutoCommitState
  /** Dispatches one reducer action. */
  readonly dispatchAutoCommit: (action: AutoCommitAction) => void
  /** Marks the persisted cadence as loaded (the PATCH is gated on it). */
  readonly setAutoCommitLoaded: ChatSetState<boolean>
  /** Reads the viewer's `canEdit` at call time (a viewer never hydrates). */
  readonly readCanEdit: () => boolean | undefined
  /** The cadence last persisted (or hydrated) to the server. */
  readonly autoCommitPersistedRef: MutableRef<number>
  /** Whether the countdown is frozen (a turn is running or auto-fix is armed). */
  readonly autoCommitHeld: boolean

  /** React's mount I/O for the region: none — its effects are declared here. */
  mount(): void

  /** React's `#effect chat:auto-commit:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void; 3: () => void }
}

/**
 * Creates the `chat:auto-commit` slice.
 *
 * @param ctx - The shared chat context (the session, auto-fix, the commands, the project).
 * @returns The countdown state, its actions, the hold and effects 1–3.
 */
export function createChatAutoCommit(ctx: ChatContext): ChatAutoCommitSlice {
  /** React's `autoCommit` reducer state. */
  let autoCommit = $state.raw<AutoCommitState>(AUTO_COMMIT_DISABLED)
  /** React's `autoCommitLoaded` — gates the persistence PATCH until the load settles. */
  let autoCommitLoaded = $state(false)

  /** React's `dispatchAutoCommit`. */
  const dispatchAutoCommit = (action: AutoCommitAction): void => {
    autoCommit = autoCommitReducer(autoCommit, action)
  }

  /** React's `setAutoCommitLoaded`. */
  const setAutoCommitLoaded: ChatSetState<boolean> = (value) => {
    autoCommitLoaded = typeof value === 'function' ? value(autoCommitLoaded) : value
  }

  /** Live `canEdit` for async callbacks that must not capture a mount-time role. */
  const readCanEdit = (): boolean | undefined => ctx.props.canEdit

  /** React's `autoCommitPersistedRef` — the cadence believed to be on the server. */
  const autoCommitPersistedRef: MutableRef<number> = { current: 0 }
  /** React's `autoCommitPatchTimerRef` — the pending debounced PATCH. */
  const autoCommitPatchTimerRef: MutableRef<ReturnType<typeof setTimeout> | null> = {
    current: null,
  }

  /**
   * React's `autoCommitArmed`: whether the countdown is running. A derived
   * boolean, so it re-notifies the tick effect only when it flips, not on every
   * reducer change.
   */
  const autoCommitArmed = $derived(isAutoCommitArmed(autoCommit))

  /**
   * React's `autoCommitHeld`: a turn streaming from this client, a teammate's
   * remote turn, or a pending verification auto-fix follow-up freezes the
   * countdown. Reads live so the tick and the button follow both.
   *
   * @returns True while the countdown must stay frozen.
   */
  const readHeld = (): boolean =>
    ctx.chat.isLoading || ctx.chat.isRemoteStreaming || ctx.autoFix.autoFixCountdown !== null

  /**
   * One second of the countdown has passed. The last second fires `/commit`
   * and pauses the countdown until the next file change; a viewer's countdown
   * runs out and stays there (React's `useEffectEvent(onAutoCommitSecond)`).
   */
  const onAutoCommitSecond = (): void => {
    if (autoCommit.remaining === null || readHeld()) return
    if (autoCommit.remaining > 1 || ctx.props.canEdit === false) {
      dispatchAutoCommit({ type: 'tick' })
      return
    }
    // React's `executeCommandRef.current?.('commit')`: the latest committed
    // dispatcher, read at call time.
    void ctx.commands.executeCommand('commit')
    dispatchAutoCommit({ type: 'fired' })
  }

  return {
    get autoCommit(): AutoCommitState {
      return autoCommit
    },
    dispatchAutoCommit,
    setAutoCommitLoaded,
    readCanEdit,
    autoCommitPersistedRef,
    get autoCommitHeld(): boolean {
      return readHeld()
    },
    mount(): void {
      // React's region declares state, refs and three effects; there is no
      // separate mount I/O.
    },
    effects: {
      1: (): void => {
        // Persist the cadence (debounced) so it survives a reload/reconnect.
        // Gated until the settings load resolves, never for a viewer, and
        // skipping the value that load just hydrated.
        $effect(() => {
          const loaded = autoCommitLoaded
          const canEdit = ctx.props.canEdit
          const seconds = autoCommit.intervalSeconds
          const projectId = ctx.props.projectId
          const http = ctx.env.http
          if (!loaded) return
          // A viewer never mirrors auto-commit state back to the project.
          if (canEdit === false) return
          if (autoCommitPersistedRef.current === seconds) return
          if (autoCommitPatchTimerRef.current) clearTimeout(autoCommitPatchTimerRef.current)
          autoCommitPatchTimerRef.current = setTimeout(() => {
            autoCommitPatchTimerRef.current = null
            autoCommitPersistedRef.current = seconds
            http
              .patch(`/projects/${projectId}`, { settings: { autoCommitSeconds: seconds } })
              .catch((error) => {
                logger.warn('Failed to persist auto-commit cadence to server', { error })
              })
          }, 500)
          return () => {
            if (autoCommitPatchTimerRef.current) clearTimeout(autoCommitPatchTimerRef.current)
          }
        })
      },
      2: (): void => {
        // A user-side file mutation restarts the auto-commit countdown — the
        // parent's external git-status tick is the canonical "files moved"
        // signal. Skipped on the initial 0 so opening a project arms nothing.
        $effect(() => {
          const tick = ctx.props.gitStatusTick
          if (!tick) return
          // The reducer reads and writes the same cell; untrack it so this
          // effect depends only on the tick (React's single dependency) and is
          // not a self-dependency.
          untrack(() => dispatchAutoCommit({ type: 'reset' }))
        })
      },
      3: (): void => {
        // Tick the countdown once a second while it is armed and nothing holds
        // it; any change in either stops or starts the interval. React's effect
        // depends on the ARMED BOOLEAN and the held flag, not on the reducer
        // state: reading the whole state here would restart the interval on
        // every one-second tick, resetting its phase and delaying the fire
        // behind unrelated timers.
        $effect(() => {
          if (!autoCommitArmed) return
          if (readHeld()) return
          const interval = setInterval(onAutoCommitSecond, 1000)
          return () => clearInterval(interval)
        })
      },
    },
  }
}
