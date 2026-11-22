/**
 * `chat:auto-commit` — the auto-commit reducer, its persistence, the countdown
 * tick and the hold that freezes it while the agent works.
 *
 * The cadence is a persisted project setting (`project.settings.autoCommitSeconds`):
 * the models slice's settings load hydrates it paused (see
 * {@link ChatAutoCommitSlice.autoCommitPersistedRef}), a debounced PATCH here
 * mirrors genuine changes back, and the countdown re-arms from full on the next
 * file change. When it reaches zero it fires the existing `/commit` path and
 * pauses until another file change, so a clean tree is never committed in a
 * loop. The hold (a local turn, a teammate's remote turn, or a pending
 * verification auto-fix) freezes the ticks and the fire until the agent and the
 * user are both finished.
 *
 * @module
 */

import type { Accessor, Setter } from 'solid-js'
import { createEffect, createMemo, createSignal, on, onCleanup } from 'solid-js'

import type { AutoCommitAction, AutoCommitState } from '@molecule/app-ide-panel-logic'
import {
  AUTO_COMMIT_DISABLED,
  autoCommitReducer,
  isAutoCommitArmed,
} from '@molecule/app-ide-panel-logic'

import type { ChatInnerCtx, MutableRef, SliceEffects } from './context.js'

/** What other slices read from `chat:auto-commit`. */
export interface ChatAutoCommitSlice {
  /** The reducer's current state. */
  autoCommit: Accessor<AutoCommitState>
  /** Dispatches one reducer action. */
  dispatchAutoCommit: (action: AutoCommitAction) => void
  /** Marks the saved cadence as loaded (the patch is gated on it). */
  setAutoCommitLoaded: Setter<boolean>
  /** Reads the viewer's `canEdit` at call time (a viewer never hydrates). */
  readCanEdit: () => boolean | undefined
  /** The cadence last persisted (or hydrated) to the server. */
  autoCommitPersistedRef: MutableRef<number>
  /** Whether the countdown is frozen (a turn is running or auto-fix is armed). */
  autoCommitHeld: Accessor<boolean>
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:auto-commit`.
 * @param ctx - The inner ctx (the project, HTTP, logger, the chat session, the
 *   auto-fix countdown and the command dispatch the fire runs through).
 * @returns The auto-commit slice.
 */
export function createChatAutoCommit(ctx: ChatInnerCtx): ChatAutoCommitSlice {
  const [autoCommit, setAutoCommit] = createSignal<AutoCommitState>(AUTO_COMMIT_DISABLED)
  // Persistence gates: `…Loaded` holds the PATCH back until the server value is
  // known (so it is never blindly overwritten); `…PersistedRef` tracks the value
  // believed to be on the server, so only genuine changes PATCH.
  const [autoCommitLoaded, setAutoCommitLoaded] = createSignal(false)
  const autoCommitPersistedRef: MutableRef<number> = { current: 0 }
  const autoCommitPatchTimerRef: MutableRef<ReturnType<typeof setTimeout> | null> = {
    current: null,
  }

  /** Applies one reducer action to the countdown state. */
  const dispatchAutoCommit = (action: AutoCommitAction): void => {
    setAutoCommit((prev) => autoCommitReducer(prev, action))
  }

  /**
   * Reads the live `canEdit` (React's `useEffectEvent`), so the async settings
   * hydrate never captures a stale role from mount time.
   */
  const readCanEdit = (): boolean | undefined => ctx.props.canEdit

  /**
   * Whether the countdown is frozen: a local turn streaming, a teammate's remote
   * turn, or a pending verification auto-fix follow-up.
   */
  const autoCommitHeld: Accessor<boolean> = () =>
    ctx.chat.isLoading() || ctx.chat.isRemoteStreaming() || ctx.autoFix.autoFixCountdown() !== null

  return {
    autoCommit,
    dispatchAutoCommit,
    setAutoCommitLoaded,
    readCanEdit,
    autoCommitPersistedRef,
    autoCommitHeld,
    effects: {
      // #effect chat:auto-commit:1 — mirror genuine cadence changes back to the
      // project (debounced), skipping the value just hydrated and gated until
      // that load resolves. A viewer never mirrors it. The memos keep React's
      // value-based deps: a countdown tick changes the state object but not the
      // cadence, and must not re-arm the patch's debounce.
      1: () => {
        const loaded = createMemo(() => autoCommitLoaded())
        const seconds = createMemo(() => autoCommit().intervalSeconds)
        createEffect(
          on(
            () => [loaded(), seconds(), ctx.props.canEdit, ctx.props.projectId] as const,
            ([isLoaded, cadence, canEdit, projectId]) => {
              if (!isLoaded) return
              // A viewer never mirrors auto-commit state back to the project.
              if (canEdit === false) return
              if (autoCommitPersistedRef.current === cadence) return
              if (autoCommitPatchTimerRef.current) clearTimeout(autoCommitPatchTimerRef.current)
              autoCommitPatchTimerRef.current = setTimeout(() => {
                autoCommitPatchTimerRef.current = null
                autoCommitPersistedRef.current = cadence
                ctx.env.http
                  .patch(`/projects/${projectId}`, {
                    settings: { autoCommitSeconds: cadence },
                  })
                  .catch((error) => {
                    ctx.env.logger.warn('Failed to persist auto-commit cadence to server', {
                      error,
                    })
                  })
              }, 500)
              onCleanup(() => {
                if (autoCommitPatchTimerRef.current) clearTimeout(autoCommitPatchTimerRef.current)
              })
            },
          ),
        )
      },
      // #effect chat:auto-commit:2 — a user-side file mutation also restarts the
      // countdown (the parent's external tick is the "files moved" signal).
      // Skipped on the initial 0 so opening a project arms nothing.
      2: () => {
        createEffect(
          on(
            () => ctx.props.gitStatusTick,
            (externalGitStatusTick) => {
              if (!externalGitStatusTick) return
              dispatchAutoCommit({ type: 'reset' })
            },
          ),
        )
      },
      // #effect chat:auto-commit:3 — tick the countdown once per second while it
      // is armed and not held. The last second fires /commit and pauses. The
      // memos keep React's value-based deps: the tick interval must survive a
      // transcript state change that leaves "armed" and "held" as they were,
      // otherwise every message append would restart the one-second timer.
      3: () => {
        const armed = createMemo(() => isAutoCommitArmed(autoCommit()))
        const held = createMemo(() => autoCommitHeld())
        createEffect(
          on(
            () => [armed(), held()] as const,
            ([isArmed, isHeld]) => {
              if (!isArmed || isHeld) return
              const id = setInterval(() => {
                const state = autoCommit()
                if (state.remaining === null || autoCommitHeld()) return
                if (state.remaining > 1 || ctx.props.canEdit === false) {
                  dispatchAutoCommit({ type: 'tick' })
                  return
                }
                void ctx.commands.executeCommand('commit')
                dispatchAutoCommit({ type: 'fired' })
              }, 1000)
              onCleanup(() => clearInterval(id))
            },
          ),
        )
      },
    },
  }
}
