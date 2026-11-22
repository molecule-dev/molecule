/**
 * React's `chat:undo` region of ChatPanel.tsx (lines 1000–1045): which tool
 * calls the user has marked undone, the set re-seeded when history bulk-loads,
 * and the server write that keeps the state across a refresh.
 *
 * React initialises the set from the persisted `isUndone` flags of the loaded
 * messages and re-syncs it during render when the transcript goes from empty to
 * non-empty. An individual toggle updates the set at once and mirrors it to the
 * project; a failed write is only a warning, because the toggle still works for
 * the rest of the session.
 *
 * @module
 */

import { SvelteSet } from 'svelte/reactivity'

import { initialUndoneToolCallIds } from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import type { ChatSetState } from './chat-popups.svelte.js'
import type { ChatContext } from './context.svelte.js'

/** The package logger (the same channel the rest of the panel logs on). */
const logger = getLogger('chat-panel')

/** The identifiers other slices and sections read from the `chat:undo` slice. */
export interface ChatUndoSlice {
  /** The ids of the tool calls currently in the undone state. */
  readonly undoneTcIds: Set<string>
  /** Sets the undone tool-call ids. */
  readonly setUndoneTcIds: ChatSetState<Set<string>>
  /** Persists one undo toggle to the server. */
  readonly persistUndoToggle: (toolCallIds: string[], undone: boolean) => void
  /** Flips one tool call's undone state and persists it. */
  readonly handleUndoToggle: (tcId: string, undone: boolean) => void

  /** React's mount I/O for the region: the render-phase re-sync, replayed. */
  mount(): void
}

/**
 * Creates the `chat:undo` slice.
 *
 * @param ctx - The shared chat context (the transcript, the HTTP client and the project).
 * @returns The undone set, its setter, the persist/toggle actions and the re-sync.
 */
export function createChatUndo(ctx: ChatContext): ChatUndoSlice {
  // React's `undoneTcIds` state — the tool calls shown as undone, initialised
  // from the persisted flags of the messages loaded at creation.
  let undoneTcIds = $state.raw<Set<string>>(initialUndoneToolCallIds(ctx.chat.messages))

  /** React's `setUndoneTcIds`. */
  const setUndoneTcIds: ChatSetState<Set<string>> = (value) => {
    undoneTcIds = typeof value === 'function' ? value(undoneTcIds) : value
  }

  // React's `undoSyncCount`: the message count the set was last synced at. Set
  // while rendering when the count changes, so the render that goes from empty
  // to loaded reads the persisted flags.
  let undoSyncCount = ctx.chat.messages.length

  /**
   * Persists undo state to the server and updates local tracking.
   *
   * @param toolCallIds - The tool calls whose state changed.
   * @param undone - Whether they are now undone.
   */
  const persistUndoToggle = (toolCallIds: string[], undone: boolean): void => {
    ctx.env.http
      .post(`/projects/${ctx.props.projectId}/tool-call-undo`, { toolCallIds, undone })
      .catch((error) => {
        // Non-critical — undo state won't survive refresh but still works in-session
        logger.warn('chat-panel: persisting tool-call undo state failed', { error })
      })
  }

  /**
   * Flips one tool call's undone state and persists it.
   *
   * @param tcId - The tool call to toggle.
   * @param undone - Whether it should be undone.
   */
  const handleUndoToggle = (tcId: string, undone: boolean): void => {
    setUndoneTcIds((previous) => {
      const next = new SvelteSet(previous)
      if (undone) next.add(tcId)
      else next.delete(tcId)
      return next
    })
    persistUndoToggle([tcId], undone)
  }

  return {
    get undoneTcIds(): Set<string> {
      return undoneTcIds
    },
    setUndoneTcIds,
    persistUndoToggle,
    handleUndoToggle,
    mount(): void {
      // React's render-phase update, replayed as an effect: only a bulk load
      // (the list was empty) re-seeds the set from the persisted flags, so an
      // append mid-stream never resets a user's toggle.
      $effect(() => {
        const length = ctx.chat.messages.length
        if (undoSyncCount === length) return
        const previous = undoSyncCount
        undoSyncCount = length
        if (previous !== 0) return
        const ids = initialUndoneToolCallIds(ctx.chat.messages)
        if (ids.size > 0) setUndoneTcIds(ids)
      })
    },
  }
}
