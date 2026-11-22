/**
 * React's `chat:auto-commit` regions of ChatPanel.tsx (line 800, 2112, 2364,
 * 3949): the `/autocommit` countdown's reducer state, its debounced persistence
 * into `project.settings.autoCommitSeconds`, the reset a user-side file change
 * triggers, and the once-a-second tick that fires the existing `/commit` path
 * when the countdown lapses.
 *
 * The cadence is hydrated by the models slice's settings read (React's
 * `#effect chat:models:2`), which calls {@link ChatAutoCommit.dispatchAutoCommit}
 * and {@link ChatAutoCommit.setAutoCommitLoaded}. Region 4's
 * `useCommittedRef(executeCommandRef, executeCommand)` is subsumed by reading
 * the commands slice at fire time, so no committed ref is needed.
 *
 * @module
 */

import { computed, DestroyRef, inject, Injectable, Injector, signal } from '@angular/core'

import type { AutoCommitAction, AutoCommitState } from '@molecule/app-ide-panel-logic'
import { autoCommitReducer, isAutoCommitArmed } from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'

import { ChatAutoFix } from './chat-auto-fix.slice.js'
import { ChatChat } from './chat-chat.slice.js'
import { ChatCommands } from './chat-commands.slice.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import type { ChatSetState } from './chat-popups.slice.js'

/** The package logger (React's module-level logger). */
const logger = getLogger('chat-panel')

/** React's `AUTO_COMMIT_DISABLED`: the reducer's initial state. */
const AUTO_COMMIT_DISABLED: AutoCommitState = { intervalSeconds: 0, remaining: null }

/** The identifiers other slices and sections read from the `chat:auto-commit` slice. */
export interface ChatAutoCommitSlice {
  /** React's mount I/O for the region (the countdown starts in its effects). */
  mount(): void

  /** React's `#effect chat:auto-commit:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void; 3: () => void }

  /** The auto-commit state machine's state. */
  readonly autoCommit: () => AutoCommitState
  /** Dispatches one auto-commit reducer action. */
  readonly dispatchAutoCommit: (action: AutoCommitAction) => void
  /** Records that the persisted cadence was read. */
  readonly setAutoCommitLoaded: ChatSetState<boolean>
  /** Reads the current `canEdit` (a viewer's client never arms the countdown). */
  readonly readCanEdit: () => boolean | undefined
  /** The cadence last read from / written to the project, in seconds. */
  readonly autoCommitPersistedRef: { current: number }
  /** Whether auto-commit must hold: a turn is streaming or auto-fix is counting down. */
  readonly autoCommitHeld: () => boolean
}

/** React's `chat:auto-commit` slice: the cadence state machine and its effects. */
@Injectable()
export class ChatAutoCommit implements ChatAutoCommitSlice {
  /** The shared state, read for the project, the role and the HTTP client. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the region's effects in. */
  private readonly injector = inject(Injector)

  /** Clears the region's timers when the panel unmounts. */
  private readonly destroyRef = inject(DestroyRef)

  /** The auto-commit state machine's state (React's reducer initial value). */
  readonly autoCommit = signal<AutoCommitState>(AUTO_COMMIT_DISABLED)

  /** The persisted-cadence-read flag React's `setAutoCommitLoaded` writes. */
  private readonly autoCommitLoaded = signal(false)

  /** The cadence last read from / written to the project (React's ref, initial `0`). */
  readonly autoCommitPersistedRef: { current: number } = { current: 0 }

  /** The debounced cadence PATCH timer, or null (React's patch-timer ref). */
  private autoCommitPatchTimer: ReturnType<typeof setTimeout> | null = null

  /** The once-a-second countdown interval, or null (React's effect-local timer). */
  private autoCommitInterval: ReturnType<typeof setInterval> | null = null

  /** The project the countdown belongs to (React's `projectId`). */
  private readonly projectId = computed(() => this.state.props().projectId)

  /** The live `canEdit` role, as a value dependency (React's `[canEdit]` dep). */
  private readonly canEdit = computed(() => this.state.props().canEdit)

  /** The host's file-mutation tick (React's `[externalGitStatusTick]` dep). */
  private readonly externalGitStatusTick = computed(() => this.state.props().gitStatusTick)

  /**
   * The cadence alone, so the persistence effect depends on the VALUE React's
   * `[autoCommit.intervalSeconds]` dependency reads, not on every tick.
   */
  private readonly intervalSeconds = computed(() => this.autoCommit().intervalSeconds)

  /** Whether the countdown is armed (React's `isAutoCommitArmed(autoCommit)`). */
  private readonly autoCommitArmed = computed(() => isAutoCommitArmed(this.autoCommit()))

  /**
   * Whether auto-commit must hold: a local turn is streaming, a teammate's
   * remote turn is streaming, or an auto-fix follow-up is pending.
   */
  readonly autoCommitHeld = computed(() => {
    const chat = this.state.slice(ChatChat)
    return (
      chat.isLoading() ||
      chat.isRemoteStreaming() ||
      this.state.slice(ChatAutoFix).autoFixCountdown() !== null
    )
  })

  /** React's mount I/O: none — the countdown starts in its effects. */
  mount(): void {}

  /** Clears the countdown and the pending PATCH when the panel unmounts. */
  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.autoCommitInterval) clearInterval(this.autoCommitInterval)
      if (this.autoCommitPatchTimer) clearTimeout(this.autoCommitPatchTimer)
    })
  }

  /** Dispatches one auto-commit reducer action. */
  dispatchAutoCommit(action: AutoCommitAction): void {
    this.autoCommit.update((state) => autoCommitReducer(state, action))
  }

  /** Records that the persisted cadence was read (value or updater). */
  readonly setAutoCommitLoaded: ChatSetState<boolean> = (next) => {
    this.autoCommitLoaded.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Reads the current `canEdit` from the live props. */
  readCanEdit(): boolean | undefined {
    return this.state.props().canEdit
  }

  /**
   * One second of the countdown has passed. The last second fires `/commit` and
   * pauses until the next file change; a viewer's countdown runs out and stays.
   */
  private onAutoCommitSecond(): void {
    const state = this.autoCommit()
    if (state.remaining === null || this.autoCommitHeld()) return
    if (state.remaining > 1 || this.state.props().canEdit === false) {
      this.dispatchAutoCommit({ type: 'tick' })
      return
    }
    void this.state.slice(ChatCommands).executeCommand('commit')
    this.dispatchAutoCommit({ type: 'fired' })
  }

  /** React's `#effect chat:auto-commit:<n>` ledger, registered at its positions. */
  readonly effects = {
    1: (): void => {
      // Persist the cadence (debounced), skipping the value just hydrated on load
      // and gated until that load resolves (React's dependencies read verbatim).
      registerChatEffect(this.injector, () => {
        // React's effect cleanup: a dependency change (the demotion included)
        // clears the timer a previous run armed, so no stale PATCH goes out.
        if (this.autoCommitPatchTimer) {
          clearTimeout(this.autoCommitPatchTimer)
          this.autoCommitPatchTimer = null
        }
        const loaded = this.autoCommitLoaded()
        const canEdit = this.canEdit()
        const seconds = this.intervalSeconds()
        const projectId = this.projectId()
        if (!loaded) return
        // A viewer never mirrors auto-commit state back to the project.
        if (canEdit === false) return
        if (this.autoCommitPersistedRef.current === seconds) return
        this.autoCommitPatchTimer = setTimeout(() => {
          this.autoCommitPatchTimer = null
          this.autoCommitPersistedRef.current = seconds
          this.state.env.http
            .patch(`/projects/${projectId}`, { settings: { autoCommitSeconds: seconds } })
            .catch((error: unknown) => {
              logger.warn('Failed to persist auto-commit cadence to server', { error })
            })
        }, 500)
      })
    },
    2: (): void => {
      // A user-side file mutation also restarts the countdown. Skipped on the
      // initial 0 so opening a project doesn't arm anything.
      registerChatEffect(this.injector, () => {
        const tick = this.externalGitStatusTick()
        if (!tick) return
        this.dispatchAutoCommit({ type: 'reset' })
      })
    },
    3: (): void => {
      // Tick the countdown once per second while it is armed and not held.
      registerChatEffect(this.injector, () => {
        const armed = this.autoCommitArmed()
        const held = this.autoCommitHeld()
        if (this.autoCommitInterval) {
          clearInterval(this.autoCommitInterval)
          this.autoCommitInterval = null
        }
        if (!armed || held) return
        this.autoCommitInterval = setInterval(() => this.onAutoCommitSecond(), 1000)
      })
    },
  }
}
