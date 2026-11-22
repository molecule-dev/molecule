/**
 * `chat:queued-edit` — the inline editor over a queued message, ported from
 * React's `chat:queued-edit` region: which queued message is open for editing,
 * its draft text, the textarea the editor writes into, and the focus move that
 * follows the editor opening.
 *
 * Opening the editor is a user action, so moving focus into it is the WAI-ARIA
 * pattern — done by the effect rather than with `autoFocus`, exactly as React
 * does.
 *
 * @module
 */

import { type Ref, ref, watch } from 'vue'

import type { ChatCtx, ChatEffect, MutableRef, SetState } from './context.js'

/**
 * Wraps a ref in React's `setState` shape: a value, or an updater of the
 * previous value.
 *
 * @param target - The ref the state lives in.
 * @returns The setter.
 */
function makeSetter<T>(target: Ref<T>): SetState<T> {
  return (value) => {
    target.value = typeof value === 'function' ? (value as (previous: T) => T)(target.value) : value
  }
}

/** What the `chat:queued-edit` slice exposes. */
export interface ChatQueuedEditSlice {
  /** The queued message being edited, or `null`. */
  readonly editingQueuedId: Ref<string | null>
  /** Sets the message under edit. */
  readonly setEditingQueuedId: SetState<string | null>
  /** The textarea of the inline editor. */
  readonly queuedEditRef: MutableRef<HTMLTextAreaElement | null>
  /** The draft text of the edit. */
  readonly editingQueuedText: Ref<string>
  /** Sets the edit's draft text. */
  readonly setEditingQueuedText: SetState<string>
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:queued-edit:1`. */
    readonly 1: ChatEffect
  }
}

/**
 * Builds the `chat:queued-edit` slice.
 *
 * @param _ctx - The panel context (the region reads none of it directly).
 * @returns The queued-edit slice.
 */
export function createChatQueuedEdit(_ctx: ChatCtx): ChatQueuedEditSlice {
  const editingQueuedId = ref<string | null>(null)
  const editingQueuedText = ref('')
  const queuedEditRef: MutableRef<HTMLTextAreaElement | null> = { current: null }

  return {
    editingQueuedId,
    setEditingQueuedId: makeSetter(editingQueuedId),
    queuedEditRef,
    editingQueuedText,
    setEditingQueuedText: makeSetter(editingQueuedText),
    effects: {
      1: () => {
        watch(
          editingQueuedId,
          (id) => {
            // Opening the editor is a user action, so moving focus into it is the
            // WAI-ARIA pattern — done here instead of with `autoFocus`.
            if (id) queuedEditRef.current?.focus()
          },
          { flush: 'post' },
        )
      },
    },
  }
}
