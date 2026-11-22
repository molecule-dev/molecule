/**
 * React's `chat:signals` region of ChatPanel.tsx (lines 4434–4484): the four
 * host-driven triggers. Each keeps a plain `{ current }` guard seeded from the
 * prop it watches (React's `useRef(initialValue)`), so mounting with a signal
 * already set acts on nothing — only a later change does:
 *
 * 1. `autoSubmitSignal` — submit the composer's current draft (the prompt→chat
 *    morph), unless the draft is blank.
 * 2. `openSettingsSignal` — open the `/settings` view, the slash command's path.
 * 3. `openReportSignal` — open the bug-report modal with an empty title.
 * 4. `openShareSignal` — open the share-link modal with the default role; a
 *    host below the share capability consumes the signal without opening.
 *
 * The guards are seeded on the registered effects' first (mount) run, which is
 * the commit React seeds them in; every action after that compares against the
 * last value the way React's effect body does.
 *
 * @module
 */

import { inject, Injectable, Injector } from '@angular/core'

import { DEFAULT_SHARE_ROLE } from '@molecule/app-ide-panel-logic'

import { ChatCommands } from './chat-commands.slice.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import { ChatPopups } from './chat-popups.slice.js'
import { ChatSubmit } from './chat-submit.slice.js'

/** The identifiers other slices and sections read from the `chat:signals` slice. */
export interface ChatSignalsSlice {
  /** React's mount I/O for the region (the region declares no mount work of its own). */
  mount(): void

  /** React's `#effect chat:signals:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void; 3: () => void; 4: () => void }
}

/** React's `chat:signals` slice: the four host-driven triggers. */
@Injectable()
export class ChatSignals implements ChatSignalsSlice {
  /** The shared state, read for the current props and the env. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the region's effects in. */
  private readonly injector = inject(Injector)

  /** React's `lastAutoSubmitRef` — the last signal value acted on. */
  private readonly lastAutoSubmitRef: { current: number | undefined } = { current: undefined }

  /** React's `lastOpenSettingsRef` — the last signal value acted on. */
  private readonly lastOpenSettingsRef: { current: number | undefined } = { current: undefined }

  /** React's `lastOpenReportRef` — the last signal value acted on. */
  private readonly lastOpenReportRef: { current: number | undefined } = { current: undefined }

  /** React's `lastOpenShareRef` — the last signal value acted on. */
  private readonly lastOpenShareRef: { current: number | undefined } = { current: undefined }

  /** React's mount I/O for the region: its work runs inside the four effects. */
  mount(): void {
    // `chat:signals` has no mount I/O outside its effects: React's `useRef`
    // seeds happen at render, and the guards are seeded on the first effect run.
  }

  /** React's `#effect chat:signals:<n>` entry points, at React's positions. */
  readonly effects = {
    /** `autoSubmitSignal`: submit the composer's current draft when it changes. */
    1: (): void => {
      registerChatEffect(this.injector, (skip) => {
        const next = this.state.props().autoSubmitSignal
        if (skip) {
          // React's `useRef(autoSubmitSignal)` mount seed: a value already set
          // at mount is the initial value, not a change.
          this.lastAutoSubmitRef.current = next
          return
        }
        if (next !== undefined && next !== this.lastAutoSubmitRef.current) {
          this.lastAutoSubmitRef.current = next
          if (this.state.slice(ChatComposer).inputRef.current.trim()) {
            void this.state.slice(ChatSubmit).handleSubmit()
          }
        }
      })
    },

    /** `openSettingsSignal`: open the `/settings` view when it changes. */
    2: (): void => {
      registerChatEffect(this.injector, (skip) => {
        const next = this.state.props().openSettingsSignal
        if (skip) {
          this.lastOpenSettingsRef.current = next
          return
        }
        if (next !== undefined && next !== this.lastOpenSettingsRef.current) {
          this.lastOpenSettingsRef.current = next
          void this.state.slice(ChatCommands).executeCommand('settings')
        }
      })
    },

    /** `openReportSignal`: open the bug-report modal when it changes. */
    3: (): void => {
      registerChatEffect(this.injector, (skip) => {
        const next = this.state.props().openReportSignal
        if (skip) {
          this.lastOpenReportRef.current = next
          return
        }
        if (next !== undefined && next !== this.lastOpenReportRef.current) {
          this.lastOpenReportRef.current = next
          this.state.slice(ChatPopups).setReportModal({ title: '' })
        }
      })
    },

    /**
     * `openShareSignal`: open the share-link modal when it changes — unless the
     * host lacks the share capability, which consumes the signal without opening.
     */
    4: (): void => {
      registerChatEffect(this.injector, (skip) => {
        const next = this.state.props().openShareSignal
        const shareAllowed = this.state.env.shareAllowed()
        if (skip) {
          this.lastOpenShareRef.current = next
          return
        }
        if (next === undefined) return
        if (!shareAllowed) {
          this.lastOpenShareRef.current = next
          return
        }
        if (next === this.lastOpenShareRef.current) return
        this.lastOpenShareRef.current = next
        this.state.slice(ChatPopups).setShareModal({ role: DEFAULT_SHARE_ROLE })
      })
    },
  }
}
