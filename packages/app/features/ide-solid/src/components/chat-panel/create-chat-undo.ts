/**
 * `chat:undo` — tracks which tool calls are currently in the "undone" state,
 * seeded from the persisted flags and kept in sync when history bulk-loads, so
 * `/undo` can flip them in bulk and the individual undo buttons stay in sync.
 *
 * @module
 */

import type { Accessor, Setter } from 'solid-js'
import { createEffect, createSignal } from 'solid-js'

import { initialUndoneToolCallIds } from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, SliceEffects } from './context.js'

/** What other slices read from `chat:undo`. */
export interface ChatUndoSlice {
  /** The ids of the tool calls currently in the undone state. */
  undoneTcIds: Accessor<Set<string>>
  /** Sets the undone tool-call ids. */
  setUndoneTcIds: Setter<Set<string>>
  /** Persists one undo toggle to the server. */
  persistUndoToggle: (toolCallIds: string[], undone: boolean) => void
  /** Flips one tool call's undone state and persists it. */
  handleUndoToggle: (tcId: string, undone: boolean) => void
  /** The slice's effects, by ledger position (this slice has none). */
  effects: SliceEffects
}

/**
 * Creates `chat:undo`.
 * @param ctx - The inner ctx (the transcript to seed from, the HTTP client, the
 *   logger and the project).
 * @returns The undo slice.
 */
export function createChatUndo(ctx: ChatInnerCtx): ChatUndoSlice {
  const [undoneTcIds, setUndoneTcIds] = createSignal<Set<string>>(
    initialUndoneToolCallIds(ctx.chat.messages()),
  )

  /**
   * Persists undo state to the server and updates local tracking.
   * @param toolCallIds - The tool calls whose state changed.
   * @param undone - Whether they are now undone.
   */
  const persistUndoToggle = (toolCallIds: string[], undone: boolean): void => {
    ctx.env.http
      .post(`/projects/${ctx.props.projectId}/tool-call-undo`, { toolCallIds, undone })
      .catch((error) => {
        // Non-critical — undo state won't survive a refresh but still works in-session.
        ctx.env.logger.warn('chat-panel: persisting tool-call undo state failed', { error })
      })
  }

  /**
   * Flips one tool call's undone state locally and persists it.
   * @param tcId - The tool call id.
   * @param undone - Whether it is now undone.
   */
  const handleUndoToggle = (tcId: string, undone: boolean): void => {
    setUndoneTcIds((prev) => {
      const next = new Set(prev)
      if (undone) next.add(tcId)
      else next.delete(tcId)
      return next
    })
    persistUndoToggle([tcId], undone)
  }

  // React re-syncs from the persisted flags during the render in which the
  // transcript goes from empty to non-empty (history load), not on individual
  // stream appends. This post-render effect makes the same move: only the
  // 0 → non-empty transition re-seeds, and only when the load carries flags.
  // `undoSyncCount` is React's state (the previous render's length), seeded at
  // creation; `on`'s deferred first run does not hand back the seed, so it is
  // kept here.
  let undoSyncCount = ctx.chat.messages().length
  createEffect(() => {
    const length = ctx.chat.messages().length
    if (undoSyncCount === length) return
    const previous = undoSyncCount
    undoSyncCount = length
    // Only re-sync on bulk message loads (history), not on individual stream appends.
    if (previous !== 0) return
    const ids = initialUndoneToolCallIds(ctx.chat.messages())
    if (ids.size > 0) setUndoneTcIds(ids)
  })

  return {
    undoneTcIds,
    setUndoneTcIds,
    persistUndoToggle,
    handleUndoToggle,
    effects: {},
  }
}
