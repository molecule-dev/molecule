/**
 * `chat:undo` — which tool calls the user has marked undone, and the server
 * write that keeps that state across a refresh, ported from React's `chat:undo`
 * region.
 *
 * The set starts from the persisted `isUndone` flags of the loaded messages
 * and is re-seeded when history arrives in bulk (the render that goes from an
 * empty list to a loaded one), exactly as React's render-phase state update
 * does. Individual toggles update the set immediately and mirror it to the
 * project; a failed write is only a warning, because the toggle still works for
 * the rest of the session.
 *
 * @module
 */

import { type Ref, ref, watch } from 'vue'

import { initialUndoneToolCallIds } from '@molecule/app-ide-panel-logic/panels'
import { getLogger } from '@molecule/app-logger'

import type { ChatCtx, SetState } from './context.js'

const logger = getLogger('chat-panel')

/** What the `chat:undo` slice exposes. */
export interface ChatUndoSlice {
  /** The tool-call ids currently marked undone. */
  readonly undoneTcIds: Ref<Set<string>>
  /** Sets the undone ids. */
  readonly setUndoneTcIds: SetState<Set<string>>
  /** Persists an undo toggle to the project. */
  readonly persistUndoToggle: (toolCallIds: string[], undone: boolean) => void
  /** Toggles one tool call's undone state and persists it. */
  readonly handleUndoToggle: (toolCallId: string, undone: boolean) => void
}

/**
 * Builds the `chat:undo` slice.
 *
 * @param ctx - The panel context (the transcript, the HTTP client and the project).
 * @returns The undo slice.
 */
export function createChatUndo(ctx: ChatCtx): ChatUndoSlice {
  const undoneTcIds = ref<Set<string>>(initialUndoneToolCallIds(ctx.chat.messages.value))

  /**
   * Writes the undone set, accepting React's value-or-updater shape.
   *
   * @param value - The next set, or an updater of the previous one.
   */
  const setUndoneTcIds: SetState<Set<string>> = (value) => {
    undoneTcIds.value = typeof value === 'function' ? value(undoneTcIds.value) : value
  }

  // React re-syncs during render when the message count changes: only a bulk
  // load (the list was empty) re-seeds the set from the persisted flags, so an
  // append mid-stream never resets a user's toggle. A sync watcher runs in the
  // same tick the list changes, before the render that reads it.
  let undoSyncCount = ctx.chat.messages.value.length
  watch(
    () => ctx.chat.messages.value.length,
    (length) => {
      if (undoSyncCount === length) return
      const previous = undoSyncCount
      undoSyncCount = length
      if (previous !== 0) return
      const ids = initialUndoneToolCallIds(ctx.chat.messages.value)
      if (ids.size > 0) undoneTcIds.value = ids
    },
    { flush: 'sync' },
  )

  /**
   * Persists one undo toggle to the server; the local set is already updated,
   * so a failure only means the state will not survive a refresh.
   *
   * @param toolCallIds - The tool calls that changed.
   * @param undone - Whether they are now undone.
   */
  const persistUndoToggle = (toolCallIds: string[], undone: boolean): void => {
    ctx.env.http
      .post(`/projects/${ctx.props.projectId}/tool-call-undo`, { toolCallIds, undone })
      .catch((error: unknown) => {
        // Non-critical — undo state won't survive refresh but still works in-session
        logger.warn('chat-panel: persisting tool-call undo state failed', { error })
      })
  }

  /**
   * Toggles one tool call's undone state and mirrors it to the project.
   *
   * @param toolCallId - The tool call to toggle.
   * @param undone - Whether it should be undone.
   */
  const handleUndoToggle = (toolCallId: string, undone: boolean): void => {
    setUndoneTcIds((previous) => {
      const next = new Set(previous)
      if (undone) next.add(toolCallId)
      else next.delete(toolCallId)
      return next
    })
    persistUndoToggle([toolCallId], undone)
  }

  return {
    undoneTcIds,
    setUndoneTcIds,
    persistUndoToggle,
    handleUndoToggle,
  }
}
