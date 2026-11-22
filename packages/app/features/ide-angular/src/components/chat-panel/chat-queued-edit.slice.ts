/**
 * React's `chat:queued-edit` region of ChatPanel.tsx (lines 2186–2197): the
 * inline editor over a queued message — which row is open for editing, the
 * draft text the editor starts from, the textarea the editor writes into, and
 * the focus move that follows the editor opening (`#effect chat:queued-edit:1`).
 *
 * Opening the editor is a user action, so moving focus into it is the WAI-ARIA
 * pattern — done by the effect rather than with `autoFocus`, exactly as React
 * does. The region declares one effect, so the slice mounts at that effect's
 * position in React's ledger, where `ChatInner` runs {@link mount}.
 *
 * @module
 */

import { inject, Injectable, Injector, signal } from '@angular/core'

import { registerChatEffect } from './chat-inner-state.js'
import type { ChatSetState } from './chat-popups.slice.js'

/** The identifiers other slices and sections read from the `chat:queued-edit` slice. */
export interface ChatQueuedEditSlice {
  /** React's mount I/O for the region (the region declares no mount work of its own). */
  mount(): void

  /** React's `#effect chat:queued-edit:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }

  /** The queued message being edited, or `null`. */
  readonly editingQueuedId: () => string | null
  /** Sets the message under edit. */
  readonly setEditingQueuedId: ChatSetState<string | null>
  /** The draft text of the edit. */
  readonly editingQueuedText: () => string
  /** Sets the edit's draft text. */
  readonly setEditingQueuedText: ChatSetState<string>
  /** The textarea of the inline editor. */
  readonly queuedEditRef: { current: HTMLTextAreaElement | null }
}

/** React's `chat:queued-edit` slice: the row under edit and its draft. */
@Injectable()
export class ChatQueuedEdit implements ChatQueuedEditSlice {
  /** The element injector `registerChatEffect` registers the focus effect in. */
  private readonly injector = inject(Injector)

  /** The queued message being edited, or `null` (React's `editingQueuedId`). */
  readonly editingQueuedId = signal<string | null>(null)

  /** The draft text of the edit (React's `editingQueuedText`). */
  readonly editingQueuedText = signal('')

  /** The textarea of the inline editor (React's ref, initial `null`). */
  readonly queuedEditRef: { current: HTMLTextAreaElement | null } = { current: null }

  /** React's mount I/O for the region: its only I/O is the registered focus effect. */
  mount(): void {
    // `chat:queued-edit` has no mount I/O outside its effect: the focus move is
    // a user-triggered update, so the registered entry below is its whole work.
  }

  /** Sets the message under edit (value or updater). */
  readonly setEditingQueuedId: ChatSetState<string | null> = (next) => {
    this.editingQueuedId.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** Sets the edit's draft text (value or updater). */
  readonly setEditingQueuedText: ChatSetState<string> = (next) => {
    this.editingQueuedText.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** React's `#effect chat:queued-edit:1`: focus the editor when a row opens. */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, (skip) => {
        const editingQueuedId = this.editingQueuedId()
        // The first run is React's mount run: no editor is open yet.
        if (skip) return
        if (editingQueuedId) this.queuedEditRef.current?.focus()
      })
    },
  }
}
