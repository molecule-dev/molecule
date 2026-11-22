/**
 * Pure helpers backing the chat panel's `/undo` flow and the individual undo
 * buttons on persisted tool calls.
 *
 * The panel tracks which tool calls are currently in the "undone" state so
 * `/undo` can flip them in bulk and individual undo buttons stay in sync. This
 * module owns the two derivations that feed that tracking: the initial undone
 * set read from a loaded conversation's persisted `isUndone` flags, and the
 * collection of the last assistant turn's file-changing tool calls (with the
 * earliest original content per file) that `/undo` reverts.
 *
 * @module
 */

import type { ChatMessage } from '@molecule/app-ai-chat'

/**
 * The tool call ids already marked undone on a conversation's loaded messages.
 * Initializes the panel's undone set, and re-syncs it when history bulk-loads.
 *
 * @param messages - The loaded conversation messages, newest last.
 * @returns Every tool call id whose persisted `isUndone` flag is set.
 */
export function initialUndoneToolCallIds(
  messages: ReadonlyArray<Pick<ChatMessage, 'toolCalls'>>,
): Set<string> {
  const ids = new Set<string>()
  for (const msg of messages) {
    if (msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        if (tc.isUndone) ids.add(tc.id)
      }
    }
  }
  return ids
}

/** The file changes `/undo` reverts, and the tool calls to mark undone. */
export interface UndoTargets {
  /**
   * Original content per workspace-relative path. A Map so that when multiple
   * tool calls touched the same file, the earliest original wins (first write
   * wins).
   */
  fileOriginals: Map<string, string>
  /** The ids of the file-changing tool calls being reverted. */
  tcIdsToUndo: string[]
}

/**
 * Collects the file changes `/undo` reverts: the last assistant turn that has
 * file-changing tool calls (`write_file` / `edit_file`) with a `fileDiff`
 * snapshot that are not already undone, and those calls' earliest original
 * content per file.
 *
 * An empty {@link UndoTargets.fileOriginals} means there is nothing to undo.
 *
 * @param messages - The loaded conversation messages, newest last.
 * @param undoneTcIds - Tool call ids already marked undone, which are skipped.
 * @returns The file originals per path and the tool call ids to mark undone.
 */
export function collectUndoTargets(
  messages: ReadonlyArray<ChatMessage>,
  undoneTcIds: ReadonlySet<string>,
): UndoTargets {
  // Find the last assistant turn that has file-changing tool calls with fileDiff snapshots.
  // Skip tool calls that are already undone.
  const lastTurn = [...messages]
    .reverse()
    .find(
      (m) =>
        m.role === 'assistant' &&
        m.toolCalls?.some(
          (tc) =>
            (tc.name === 'write_file' || tc.name === 'edit_file') &&
            tc.fileDiff &&
            !undoneTcIds.has(tc.id),
        ),
    )
  // Collect the tool calls to undo and their original content.
  // Use a Map so that if multiple tool calls touched the same file, we restore
  // to the earliest original (first write wins).
  const fileOriginals = new Map<string, string>()
  const tcIdsToUndo: string[] = []
  for (const tc of lastTurn?.toolCalls ?? []) {
    if (
      (tc.name === 'write_file' || tc.name === 'edit_file') &&
      tc.fileDiff &&
      !undoneTcIds.has(tc.id)
    ) {
      const path = (tc.input as { path?: string })?.path
      const original = (tc.fileDiff as { original: string }).original
      if (path && !fileOriginals.has(path)) {
        fileOriginals.set(path, original)
      }
      tcIdsToUndo.push(tc.id)
    }
  }
  return { fileOriginals, tcIdsToUndo }
}
