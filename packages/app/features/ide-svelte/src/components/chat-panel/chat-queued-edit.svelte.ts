/**
 * React's `chat:queued-edit` region of ChatPanel.tsx (lines 2186–2197): the
 * inline editor of a queued message — which queued row is open, the text being
 * edited, the textarea the focus moves into, and the effect that focuses it.
 *
 * React pairs the two state cells with the `useEffect` that moves focus into the
 * editor when a row opens (the WAI-ARIA pattern for a user action that opens an
 * input, done here instead of with `autoFocus`).
 *
 * @module
 */

import type { ChatSetState } from './chat-popups.svelte.js'
import type { ChatContext, MutableRef } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:queued-edit` slice. */
export interface ChatQueuedEditSlice {
  /** The queued message being edited, or null. */
  readonly editingQueuedId: string | null
  /** Opens or closes the inline editor. */
  readonly setEditingQueuedId: ChatSetState<string | null>
  /** The editor's text. */
  readonly editingQueuedText: string
  /** Sets the editor's text. */
  readonly setEditingQueuedText: ChatSetState<string>
  /** The editor's textarea (focus moves into it when it opens). */
  readonly queuedEditRef: MutableRef<HTMLTextAreaElement | null>

  /** React's mount I/O for the region (none: the region declares state only). */
  mount(): void

  /** React's `#effect chat:queued-edit:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }
}

/**
 * Resolves React's `SetStateAction<T>` argument against the latest value.
 *
 * @param previous - The latest value.
 * @param value - The React setter argument: a value or an updater.
 * @returns The next value.
 */
function resolveState<T>(previous: T, value: T | ((previous: T) => T)): T {
  return typeof value === 'function' ? (value as (previous: T) => T)(previous) : value
}

/**
 * Creates the `chat:queued-edit` slice.
 *
 * @param _ctx - The shared chat context (the region reads no services).
 * @returns The editor's state, its textarea ref and the focus effect.
 */
export function createChatQueuedEdit(_ctx: ChatContext): ChatQueuedEditSlice {
  let editingQueuedId = $state<string | null>(null)
  let editingQueuedText = $state<string>('')
  /** React's `queuedEditRef` — the inline editor's textarea. */
  const queuedEditRef: MutableRef<HTMLTextAreaElement | null> = { current: null }

  /**
   * React's `setEditingQueuedId`.
   *
   * @param value - The next id, or an updater of the latest one.
   */
  const setEditingQueuedId: ChatSetState<string | null> = (value): void => {
    editingQueuedId = resolveState(editingQueuedId, value)
  }

  /**
   * React's `setEditingQueuedText`.
   *
   * @param value - The next text, or an updater of the latest one.
   */
  const setEditingQueuedText: ChatSetState<string> = (value): void => {
    editingQueuedText = resolveState(editingQueuedText, value)
  }

  return {
    get editingQueuedId(): string | null {
      return editingQueuedId
    },
    setEditingQueuedId,
    get editingQueuedText(): string {
      return editingQueuedText
    },
    setEditingQueuedText,
    queuedEditRef,
    mount(): void {
      // React's region declares state only; there is no mount I/O to repeat.
    },
    effects: {
      1: (): void => {
        // Opening the editor is a user action, so moving focus into it is the
        // WAI-ARIA pattern — done here instead of with `autoFocus`.
        $effect(() => {
          if (editingQueuedId) queuedEditRef.current?.focus()
        })
      },
    },
  }
}
