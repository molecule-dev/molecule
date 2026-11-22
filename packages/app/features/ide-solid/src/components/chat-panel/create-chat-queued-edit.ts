/**
 * `chat:queued-edit` — the inline editor for a queued message (React's
 * `chat:queued-edit` region and its one effect, ported by unit U8).
 *
 * The queued-message bar renders whichever row's id matches `editingQueuedId`
 * as a textarea holding `editingQueuedText`; the bar's own section saves,
 * deletes or cancels through these setters. Opening the editor is a user
 * action, so focus moves into it from the effect (the WAI-ARIA pattern)
 * rather than with `autoFocus`.
 *
 * @module
 */

import type { Accessor, Setter } from 'solid-js'
import { createEffect, createSignal, on } from 'solid-js'

import type { ChatInnerCtx, MutableRef, SliceEffects } from './context.js'

/** What other slices read from `chat:queued-edit`. */
export interface ChatQueuedEditSlice {
  /** The queued message being edited, or null. */
  editingQueuedId: Accessor<string | null>
  /** Opens or closes the inline editor. */
  setEditingQueuedId: Setter<string | null>
  /** The editor's text. */
  editingQueuedText: Accessor<string>
  /** Sets the editor's text. */
  setEditingQueuedText: Setter<string>
  /** The editor's textarea (focus moves into it when it opens). */
  queuedEditRef: MutableRef<HTMLTextAreaElement | null>
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:queued-edit`.
 * @param _ctx - The inner ctx (the editor reads nothing from it).
 * @returns The queued-edit slice.
 */
export function createChatQueuedEdit(_ctx: ChatInnerCtx): ChatQueuedEditSlice {
  const [editingQueuedId, setEditingQueuedId] = createSignal<string | null>(null)
  const [editingQueuedText, setEditingQueuedText] = createSignal('')
  const queuedEditRef: MutableRef<HTMLTextAreaElement | null> = { current: null }

  return {
    editingQueuedId,
    setEditingQueuedId,
    editingQueuedText,
    setEditingQueuedText,
    queuedEditRef,
    effects: {
      // #effect chat:queued-edit:1 — opening the editor is a user action, so
      // moving focus into it is the WAI-ARIA pattern (done here instead of with
      // `autoFocus`).
      1: () => {
        createEffect(
          on(
            editingQueuedId,
            (id) => {
              if (id) queuedEditRef.current?.focus()
            },
            { defer: false },
          ),
        )
      },
    },
  }
}
