/**
 * React's `chat:undo` region of ChatPanel.tsx (line 2810): the set of tool
 * calls currently in the "undone" state, the persist that mirrors a toggle to
 * the project, and the re-seed a bulk history load performs.
 *
 * The set is seeded from the persisted `isUndone` flags on the loaded messages.
 * React re-syncs it while rendering (its state-follows-a-prop pattern): when the
 * transcript goes from empty to non-empty, the persisted flags are read again.
 * Here that is an effect watching the transcript length.
 *
 * @module
 */

import { effect, inject, Injectable, signal, untracked } from '@angular/core'

import { initialUndoneToolCallIds } from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import { ChatChat } from './chat-chat.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import type { ChatSetState } from './chat-popups.slice.js'

/** The package logger (React's module-level logger). */
const logger = getLogger('chat-panel')

/** The identifiers other slices and sections read from the `chat:undo` slice. */
export interface ChatUndoSlice {
  /** React's mount I/O for the region (it has none: the state is seeded in render). */
  mount(): void

  /** The tool-call ids currently marked undone. */
  readonly undoneTcIds: () => Set<string>
  /** Sets the undone ids. */
  readonly setUndoneTcIds: ChatSetState<Set<string>>
  /** Persists an undo toggle to the project. */
  readonly persistUndoToggle: (toolCallIds: string[], undone: boolean) => void
  /** Toggles one tool call's undone state and persists it. */
  readonly handleUndoToggle: (toolCallId: string, undone: boolean) => void
}

/** React's `chat:undo` slice: the undone set, its persist and its history re-sync. */
@Injectable()
export class ChatUndo implements ChatUndoSlice {
  /** The shared state, read for the project and the HTTP client. */
  private readonly state = inject(ChatInnerState)

  /** The tool-call ids currently marked undone, seeded from the loaded messages. */
  readonly undoneTcIds = signal<Set<string>>(
    new Set(initialUndoneToolCallIds(this.state.slice(ChatChat).messages())),
  )

  /** The transcript length the whole-set re-seed last saw (React's `undoSyncCount`). */
  private undoSyncCount = this.state.slice(ChatChat).messages().length

  /** React's mount I/O: none — the state is seeded and re-synced during render. */
  mount(): void {}

  /** Seeds the undone set when a bulk history load fills an empty transcript. */
  constructor() {
    effect(() => {
      const length = this.state.slice(ChatChat).messages().length
      if (length === this.undoSyncCount) return
      const previous = this.undoSyncCount
      this.undoSyncCount = length
      // Only re-sync on a bulk history load (0 -> N), not on individual stream
      // appends, exactly as React's render-phase check does.
      if (previous !== 0) return
      untracked(() => {
        const ids = initialUndoneToolCallIds(this.state.slice(ChatChat).messages())
        if (ids.size > 0) this.undoneTcIds.set(ids)
      })
    })
  }

  /** Sets the undone ids (value or updater). */
  readonly setUndoneTcIds: ChatSetState<Set<string>> = (next) => {
    this.undoneTcIds.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Persists an undo toggle to the project (a failure only warns). */
  persistUndoToggle(toolCallIds: string[], undone: boolean): void {
    this.state.env.http
      .post(`/projects/${this.state.props().projectId}/tool-call-undo`, { toolCallIds, undone })
      .catch((error: unknown) => {
        // Non-critical — undo state won't survive refresh but still works in-session
        logger.warn('chat-panel: persisting tool-call undo state failed', { error })
      })
  }

  /** Toggles one tool call's undone state and persists it. */
  handleUndoToggle(toolCallId: string, undone: boolean): void {
    this.setUndoneTcIds((prev) => {
      const next = new Set(prev)
      if (undone) next.add(toolCallId)
      else next.delete(toolCallId)
      return next
    })
    this.persistUndoToggle([toolCallId], undone)
  }
}
