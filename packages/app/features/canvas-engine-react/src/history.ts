/**
 * Bounded undo/redo history stack used by `<CanvasEngine>`. Stores
 * full document snapshots — vector docs are tiny relative to JS heap,
 * so the simplicity wins over a delta scheme.
 *
 * @module
 */

import type { CanvasDocument } from './types.js'

/** Default cap matches the design spec (100 entries). */
export const DEFAULT_HISTORY_LIMIT = 100

/** Snapshot of the editor state used by the history stack. */
export interface HistoryEntry {
  /** Document snapshot at this point in time. */
  document: CanvasDocument
}

/**
 * Bounded LIFO + LIFO pair backing undo/redo. State is intentionally
 * mutable so React refs can wrap it — every public method either
 * pushes/pops a snapshot or queries stack depth.
 */
export class HistoryStack {
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private readonly limit: number

  /**
   * Create a new history stack with the given undo/redo entry cap.
   *
   * @param limit - Max number of undo entries kept. Defaults to 100.
   */
  constructor(limit: number = DEFAULT_HISTORY_LIMIT) {
    this.limit = Math.max(1, Math.floor(limit))
  }

  /**
   * Push a snapshot of the document _before_ a mutation. Clears the
   * redo stack — once you make a new edit, the redo path is gone.
   *
   * @param entry - Snapshot to record.
   */
  push(entry: HistoryEntry): void {
    this.undoStack.push(entry)
    if (this.undoStack.length > this.limit) {
      this.undoStack.splice(0, this.undoStack.length - this.limit)
    }
    this.redoStack = []
  }

  /**
   * Pop the latest undo entry; the caller passes the _current_ state
   * so it can be moved onto the redo stack.
   *
   * @param current - Current document, captured into redo.
   * @returns The previous document, or `null` when the stack is empty.
   */
  undo(current: HistoryEntry): HistoryEntry | null {
    const prev = this.undoStack.pop()
    if (!prev) return null
    this.redoStack.push(current)
    if (this.redoStack.length > this.limit) {
      this.redoStack.splice(0, this.redoStack.length - this.limit)
    }
    return prev
  }

  /**
   * Pop the latest redo entry; the caller passes the _current_ state
   * so it can be moved back onto the undo stack.
   *
   * @param current - Current document, captured into undo.
   * @returns The next document, or `null` when redo is empty.
   */
  redo(current: HistoryEntry): HistoryEntry | null {
    const next = this.redoStack.pop()
    if (!next) return null
    this.undoStack.push(current)
    if (this.undoStack.length > this.limit) {
      this.undoStack.splice(0, this.undoStack.length - this.limit)
    }
    return next
  }

  /** `true` when there is at least one undo entry. */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /** `true` when there is at least one redo entry. */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /** Drop every entry on both stacks. */
  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }
}
