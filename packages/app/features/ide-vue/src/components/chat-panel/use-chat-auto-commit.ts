/**
 * `chat:auto-commit` — React's four `chat:auto-commit` regions: the countdown
 * reducer, the debounced persistence of the user's cadence, the file-change and
 * host-signal re-arms, and the once-a-second tick that fires the existing
 * `/commit` path when it lapses.
 *
 * The live source of truth is the pure reducer from `@molecule/app-ide-panel-logic`;
 * this slice owns only the side effects React's component owns — the debounced
 * `PATCH` of `project.settings.autoCommitSeconds` (skipping the value just
 * hydrated on load and gated until that load resolves), the reset on every AI
 * or user-side file change, the tick interval, and the HOLD: a turn streaming
 * from this client, a teammate's remote turn, or a pending verification
 * auto-fix follow-up freezes the countdown, so a commit only ever fires once
 * the agent and the user are actually finished.
 *
 * @module
 */

import { computed, type ComputedRef, onMounted, onUnmounted, type Ref, ref, watch } from 'vue'

import {
  AUTO_COMMIT_DISABLED,
  type AutoCommitAction,
  autoCommitReducer,
  type AutoCommitState,
  isAutoCommitArmed,
} from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'

import type { ChatCtx, ChatEffect, MutableRef, SetState } from './context.js'

const logger = getLogger('chat-panel')

/** What the `chat:auto-commit` slice exposes. */
export interface ChatAutoCommitSlice {
  /** The auto-commit state machine's state. */
  readonly autoCommit: Ref<AutoCommitState>
  /** Dispatches one reducer action. */
  readonly dispatchAutoCommit: (action: AutoCommitAction) => void
  /** The cadence last read from / written to the project, in seconds. */
  readonly autoCommitPersistedRef: MutableRef<number>
  /** Reads the current `canEdit` (a viewer's client never arms the countdown). */
  readonly readCanEdit: () => boolean | undefined
  /** Records that the persisted cadence was read. */
  readonly setAutoCommitLoaded: SetState<boolean>
  /** Whether auto-commit must hold: a turn is streaming or auto-fix is counting down. */
  readonly autoCommitHeld: ComputedRef<boolean>
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:auto-commit:1`. */
    readonly 1: ChatEffect
    /** `#effect chat:auto-commit:2`. */
    readonly 2: ChatEffect
    /** `#effect chat:auto-commit:3`. */
    readonly 3: ChatEffect
  }
}

/**
 * Builds the `chat:auto-commit` slice.
 *
 * @param ctx - The panel context (the chat session, auto-fix, the commands and the project).
 * @returns The auto-commit slice.
 */
export function createChatAutoCommit(ctx: ChatCtx): ChatAutoCommitSlice {
  const autoCommit = ref<AutoCommitState>(AUTO_COMMIT_DISABLED)

  /**
   * Applies one reducer action to the countdown state.
   *
   * @param action - The action to apply.
   */
  const dispatchAutoCommit = (action: AutoCommitAction): void => {
    autoCommit.value = autoCommitReducer(autoCommit.value, action)
  }

  const autoCommitLoaded = ref(false)

  /**
   * Records whether the persisted cadence has been read yet, accepting React's
   * value-or-updater shape.
   *
   * @param value - Whether the load settled, or an updater of the previous value.
   */
  const setAutoCommitLoaded: SetState<boolean> = (value) => {
    autoCommitLoaded.value = typeof value === 'function' ? value(autoCommitLoaded.value) : value
  }

  // Live canEdit for async callbacks (the settings hydrate) that must not
  // capture a stale role from mount time.
  const readCanEdit = (): boolean | undefined => ctx.props.canEdit

  const autoCommitPersistedRef: MutableRef<number> = { current: 0 }
  const autoCommitPatchTimerRef: MutableRef<ReturnType<typeof setTimeout> | null> = {
    current: null,
  }

  // A turn streaming from this client, a teammate's remote turn, or a pending
  // verification auto-fix follow-up: while any holds, the countdown is frozen
  // (no ticks) so a commit only fires once everyone is actually finished.
  const autoCommitHeld = computed<boolean>(
    () =>
      ctx.chat.isLoading.value ||
      ctx.chat.isRemoteStreaming.value ||
      ctx.autoFix.autoFixCountdown.value !== null,
  )

  /**
   * One second of the countdown has passed. The last second fires `/commit` and
   * pauses the countdown until the next file change; a viewer's countdown runs
   * out and stays there.
   */
  const onAutoCommitSecond = (): void => {
    if (autoCommit.value.remaining === null || autoCommitHeld.value) return
    if (autoCommit.value.remaining > 1 || ctx.props.canEdit === false) {
      dispatchAutoCommit({ type: 'tick' })
      return
    }
    void ctx.commands.executeCommand('commit')
    dispatchAutoCommit({ type: 'fired' })
  }

  return {
    autoCommit,
    dispatchAutoCommit,
    autoCommitPersistedRef,
    readCanEdit,
    setAutoCommitLoaded,
    autoCommitHeld,
    effects: {
      1: () => {
        // Persist the cadence (debounced) so it survives a reload/reconnect.
        // Gated until the settings load resolves, never for a viewer, and
        // skipping the value that load just hydrated.
        watch(
          [
            () => autoCommit.value.intervalSeconds,
            autoCommitLoaded,
            () => ctx.env.http,
            () => ctx.props.projectId,
            () => ctx.props.canEdit,
          ],
          (_changes, _previous, onCleanup) => {
            onCleanup(() => {
              if (autoCommitPatchTimerRef.current) {
                clearTimeout(autoCommitPatchTimerRef.current)
                autoCommitPatchTimerRef.current = null
              }
            })
            if (!autoCommitLoaded.value) return
            // A viewer never mirrors auto-commit state back to the project.
            if (ctx.props.canEdit === false) return
            const seconds = autoCommit.value.intervalSeconds
            if (autoCommitPersistedRef.current === seconds) return
            autoCommitPatchTimerRef.current = setTimeout(() => {
              autoCommitPatchTimerRef.current = null
              autoCommitPersistedRef.current = seconds
              ctx.env.http
                .patch(`/projects/${ctx.props.projectId}`, {
                  settings: { autoCommitSeconds: seconds },
                })
                .catch((error: unknown) => {
                  logger.warn('Failed to persist auto-commit cadence to server', { error })
                })
            }, 500)
          },
          { flush: 'post' },
        )
      },
      2: () => {
        // A user-side file mutation also restarts the countdown — the parent's
        // external git-status tick is the canonical "files moved" signal.
        // Skipped on the initial 0 so opening a project doesn't arm anything.
        onMounted(() => {
          if (!ctx.props.gitStatusTick) return
          dispatchAutoCommit({ type: 'reset' })
        })
        watch(
          () => ctx.props.gitStatusTick,
          (tick) => {
            if (!tick) return
            dispatchAutoCommit({ type: 'reset' })
          },
          { flush: 'post' },
        )
      },
      3: () => {
        let interval: ReturnType<typeof setInterval> | null = null

        /** Stops the tick interval, if one is running. */
        const stop = (): void => {
          if (interval !== null) {
            clearInterval(interval)
            interval = null
          }
        }

        // Arm the one-second tick exactly while the countdown is counting down
        // and nothing holds it; any change in either stops or starts it.
        const sync = (): void => {
          const shouldRun = isAutoCommitArmed(autoCommit.value) && !autoCommitHeld.value
          if (shouldRun) {
            if (interval === null) interval = setInterval(onAutoCommitSecond, 1000)
          } else {
            stop()
          }
        }

        onMounted(sync)
        watch([() => isAutoCommitArmed(autoCommit.value), autoCommitHeld], sync, { flush: 'post' })
        onUnmounted(stop)
      },
    },
  }
}
