/**
 * React's `chat:input` region of ChatPanel.tsx (lines 3265–3373): the
 * textarea's input handling and the caret helper voice/mention paths use.
 *
 * `handleInputChange` is one ordered pass over a keystroke: write the value,
 * prune dictated snippets, update the sendable flag, resize, persist the draft,
 * pause the auto-fix countdown, close the button-driven pickers, then derive
 * exactly ONE popup from the caret and the text (`@` mention, `/model`,
 * `/effort`, or the command menu) — the order React's body runs in, including
 * the early returns.
 *
 * `#effect chat:input:1` is the viewer composer's one-time `/teamsay ` prefill:
 * its mount body runs in the `mount()` pass, at this slice's position in React's
 * mount ledger (after the composer's own mount pass has seeded the draft), and
 * the registered effect re-runs it on each of React's dependencies (the viewer
 * capability, the conversation id and the transcript-only flag); the "already
 * ran" latch is the one the tips state re-arms, as in React.
 *
 * @module
 */

import { inject, Injectable, Injector } from '@angular/core'

import { parseEffortCommand, parseModelModeCommand } from '@molecule/app-ide-panel-logic/panels'

import { ChatAutoFix } from './chat-auto-fix.slice.js'
import { ChatChat } from './chat-chat.slice.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import { ChatMention } from './chat-mention.slice.js'
import { ChatPopups } from './chat-popups.slice.js'
import { ChatSounds } from './chat-sounds.slice.js'
import { ChatTips } from './chat-tips.slice.js'
import { ChatVoice } from './chat-voice.slice.js'

/** The identifiers other slices and sections read from the `chat:input` slice. */
export interface ChatInputSlice {
  /** React's mount I/O for the region: its one effect's prefill work. */
  mount(): void

  /** React's `#effect chat:input:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }

  /** Handles one `input` event from the textarea. */
  readonly handleInputChange: (event: Event) => void
  /** Sets the composer text, resizes and puts the caret at the end. */
  readonly setInputAndCursorEnd: (value: string) => void
}

/** React's `chat:input` slice: a keystroke's ordered consequences. */
@Injectable()
export class ChatInput implements ChatInputSlice {
  /** The shared state, read for the props and the env. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the prefill in. */
  private readonly injector = inject(Injector)

  /**
   * Handles one `input` event from the textarea — React's `onChange` on an
   * uncontrolled textarea, which is the native `input` event.
   *
   * @param event - The textarea's input event.
   */
  readonly handleInputChange = (event: Event): void => {
    const target = event.target as HTMLTextAreaElement
    const val = target.value
    const composer = this.state.slice(ChatComposer)
    composer.inputRef.current = val
    composer.pruneDictatedSnippets()
    composer.setHasInput(Boolean(val.trim()))
    composer.autoResize()
    composer.persistDraft()

    // Pause auto-fix countdown when user starts typing
    this.state.slice(ChatAutoFix).handleAutoFixPauseOnInput()

    const cursor = target.selectionStart ?? val.length
    const before = val.slice(0, cursor)

    // Close button-driven pickers when user starts typing — popups are
    // one-at-a-time, and these aren't managed by the input-parsing below
    this.state.slice(ChatSounds).setSoundsPicker(null)
    this.state.slice(ChatVoice).setMicPicker(null)

    const atMatch = before.match(/@(\S*)$/)
    if (atMatch) {
      this.state.slice(ChatPopups).setMentionStart(cursor - atMatch[0].length)
      void this.state.slice(ChatMention).openFilePicker(atMatch[1] ?? '')
      composer.setCommandMenu(null)
      return
    }
    this.state.slice(ChatPopups).setFilePicker(null)

    // Show model picker when typing "/model <filter>" — scoped to the mode a
    // --plan / --execute flag names, else to the LIVE conversation mode
    // (discovery = plan), so a plain pick changes the mode the user is in.
    const liveModelMode = this.state.slice(ChatChat).liveModelMode()
    const modelMatch = val.match(/^\/model\s+/i)
    if (modelMatch) {
      composer.setModelPicker({
        selectedIdx: -1,
        mode: parseModelModeCommand(val)?.mode ?? liveModelMode,
        text: val,
      })
      composer.setCommandMenu(null)
      return
    }
    composer.setModelPicker(null)

    // Show the effort picker while typing "/effort ..." — same live behavior
    // as /model. Text after the command (minus the --plan/--execute flag)
    // filters the level list; "?" keeps the textual status path instead. A
    // dropdown-chosen mode survives further keystrokes unless a flag names one.
    if (/^\/effort\s/i.test(val)) {
      const typed = parseEffortCommand(val)
      if (typed && (typed.kind === 'menu' || (typed.kind === 'set' && typed.arg !== '?'))) {
        const typedMode = typed.mode
        composer.setEffortPicker((p) => ({
          selectedIdx: -1,
          mode: typedMode ?? p?.mode ?? liveModelMode,
          text: val,
        }))
        composer.setCommandMenu(null)
        return
      }
    }
    composer.setEffortPicker(null)

    if (val.startsWith('/') && !val.includes(' ')) {
      composer.setCommandMenu({ selectedIdx: -1, text: val })
    } else {
      composer.setCommandMenu(null)
    }
  }

  /**
   * React's `setInputAndCursorEnd`: sets the textarea value and moves the
   * cursor to the end on the next tick.
   *
   * @param val - The text to put in the composer.
   */
  readonly setInputAndCursorEnd = (val: string): void => {
    const composer = this.state.slice(ChatComposer)
    composer.setInputValue(val)
    composer.autoResize()
    setTimeout(() => {
      const ta = composer.textareaRef.current
      if (ta) {
        ta.focus()
        ta.setSelectionRange(val.length, val.length)
      }
    }, 0)
  }

  /**
   * React's viewer composer prefill — its only effect's work, run at this
   * slice's position in the mount ledger. The box IS the team-chat input, so it
   * starts with "/teamsay " already typed (and handleSubmit re-fills it after
   * each sent team message). Once per mount, and never over text the user
   * already has (the done flag is declared with the tips state, whose switch
   * effect re-arms it).
   */
  mount(): void {
    this.runViewerPrefill()
  }

  /** Registers React's viewer-prefill effect; its first run is the mount pass. */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, (skip) => {
        this.runViewerPrefill(skip)
      })
    },
  }

  /**
   * Reads the prefill's inputs and performs it once, the way React's effect
   * does on mount and whenever one of its dependencies changes.
   *
   * @param skip - Whether this is the effect's first run (its dependencies are
   *   read anyway, so their changes stay tracked; the work is the mount pass).
   */
  private runViewerPrefill(skip = false): void {
    const transcriptOnly = this.state.env.transcriptOnly()
    const canEdit = this.state.props().canEdit
    // Read so a conversation change re-runs the prefill, as React's dep list does.
    this.state.env.conversationId()
    if (skip) return
    const done = this.state.slice(ChatTips).viewerPrefillDoneRef
    if (transcriptOnly || canEdit !== false || done.current) return
    done.current = true
    if (!this.state.slice(ChatComposer).inputRef.current.trim()) {
      this.setInputAndCursorEnd('/teamsay ')
    }
  }
}
