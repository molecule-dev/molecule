/**
 * React's `chat:input` region of ChatPanel.tsx (lines 3265–3373): what a
 * keystroke in the composer means — the draft it persists, the auto-fix pause
 * it triggers, and the `/command`, `/model`, `/effort` and `@file` pickers the
 * text opens or closes — plus the caret-to-end writer the command handlers use,
 * and the viewer's one-shot `/teamsay ` prefill.
 *
 * @module
 */

import { parseEffortCommand } from '@molecule/app-ide-panel-logic/panels'
import { parseModelModeCommand } from '@molecule/app-ide-panel-logic/panels'

import type { ChatContext } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:input` slice. */
export interface ChatInputSlice {
  /** Mirrors the textarea's text into the composer slice. */
  readonly handleInputChange: (event: Event) => void
  /** Replaces the composer text and puts the caret at its end. */
  readonly setInputAndCursorEnd: (value: string) => void

  /** React's mount I/O for the region (none: the region declares handlers only). */
  mount(): void

  /** React's `#effect chat:input:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }
}

/**
 * Creates the `chat:input` slice.
 *
 * @param ctx - The shared chat context.
 * @returns The input handlers and React's viewer-prefill effect.
 */
export function createChatInput(ctx: ChatContext): ChatInputSlice {
  /**
   * Sets the textarea's value and moves its caret to the end.
   *
   * @param val - The new composer text.
   */
  const setInputAndCursorEnd = (val: string): void => {
    ctx.composer.setInputValue(val)
    ctx.composer.autoResize()
    setTimeout(() => {
      const ta = ctx.composer.textareaRef.current
      if (ta) {
        ta.focus()
        ta.setSelectionRange(val.length, val.length)
      }
    }, 0)
  }

  /**
   * Handles a composer edit: mirrors the text, pauses auto-fix, and opens,
   * moves or closes the popup the text now names.
   *
   * @param event - The textarea's input event.
   */
  const handleInputChange = (event: Event): void => {
    const target = event.target as HTMLTextAreaElement
    const val = target.value
    ctx.composer.inputRef.current = val
    ctx.composer.pruneDictatedSnippets()
    ctx.composer.setHasInput(Boolean(val.trim()))
    ctx.composer.autoResize()
    ctx.composer.persistDraft()

    // Pause auto-fix countdown when user starts typing
    ctx.autoFix.handleAutoFixPauseOnInput()

    const cursor = target.selectionStart ?? val.length
    const before = val.slice(0, cursor)

    // Close button-driven pickers when user starts typing — popups are
    // one-at-a-time, and these aren't managed by the input-parsing below
    ctx.sounds.setSoundsPicker(null)
    ctx.voice.setMicPicker(null)

    const atMatch = before.match(/@(\S*)$/)
    if (atMatch) {
      ctx.popups.setMentionStart(cursor - atMatch[0].length)
      void ctx.mention.openFilePicker(atMatch[1])
      ctx.composer.setCommandMenu(null)
      return
    }
    ctx.popups.setFilePicker(null)

    // Show model picker when typing "/model <filter>" — scoped to the mode a
    // --plan / --execute flag names, else to the LIVE conversation mode
    // (discovery = plan), so a plain pick changes the mode the user is in.
    const modelMatch = val.match(/^\/model\s+/i)
    if (modelMatch) {
      ctx.composer.setModelPicker({
        selectedIdx: -1,
        mode: parseModelModeCommand(val)?.mode ?? ctx.chat.liveModelMode,
        text: val,
      })
      ctx.composer.setCommandMenu(null)
      return
    }
    ctx.composer.setModelPicker(null)

    // Show the effort picker while typing "/effort ..." — same live behavior
    // as /model. Text after the command (minus the --plan/--execute flag)
    // filters the level list; "?" keeps the textual status path instead. A
    // dropdown-chosen mode survives further keystrokes unless a flag names one.
    if (/^\/effort\s/i.test(val)) {
      const typed = parseEffortCommand(val)
      if (typed && (typed.kind === 'menu' || (typed.kind === 'set' && typed.arg !== '?'))) {
        const typedMode = typed.mode
        ctx.composer.setEffortPicker((picker) => ({
          selectedIdx: -1,
          mode: typedMode ?? picker?.mode ?? ctx.chat.liveModelMode,
          text: val,
        }))
        ctx.composer.setCommandMenu(null)
        return
      }
    }
    ctx.composer.setEffortPicker(null)

    if (val.startsWith('/') && !val.includes(' ')) {
      ctx.composer.setCommandMenu({ selectedIdx: -1, text: val })
    } else {
      ctx.composer.setCommandMenu(null)
    }
  }

  return {
    handleInputChange,
    setInputAndCursorEnd,
    mount(): void {
      // React's region declares handlers only; there is no mount I/O to repeat.
    },
    effects: {
      1: (): void => {
        // Viewer composer prefill: the box IS the team-chat input, so it starts
        // with "/teamsay " already typed (and handleSubmit re-fills it after
        // each sent team message). Once per mount, and never over text the user
        // already has (the done flag is declared with the tips state, whose
        // switch effect re-arms it).
        $effect(() => {
          if (ctx.env.transcriptOnly || ctx.props.canEdit !== false) return
          if (ctx.tips.viewerPrefillDoneRef.current) return
          ctx.tips.viewerPrefillDoneRef.current = true
          if (!ctx.composer.inputRef.current.trim()) setInputAndCursorEnd('/teamsay ')
        })
      },
    },
  }
}
