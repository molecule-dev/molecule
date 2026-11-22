/**
 * `chat:input` — the textarea's input handling, ported from React's
 * `chat:input` region: the live value, the sendable-content flag, the height
 * resize, the draft and the focus/caret helper the voice and mention paths use.
 *
 * `handleInputChange` is one ordered pass over a keystroke: write the value,
 * prune dictated snippets, update the sendable flag, resize, persist the draft,
 * pause the auto-fix countdown, then derive exactly one popup from the caret
 * and the text (`@` mention, `/model`, `/effort`, or the command menu) — the
 * order React's body runs in, including the early returns.
 *
 * @module
 */

import { onMounted, watch } from 'vue'

import { parseEffortCommand, parseModelModeCommand } from '@molecule/app-ide-panel-logic/panels'

import type { ChatCtx, ChatEffect } from './context.js'

/** What the `chat:input` slice exposes. */
export interface ChatInputSlice {
  /** Handles one change of the textarea's value (native `input`, or an unseen `change`). */
  readonly handleInputChange: (event: Event) => void
  /** Sets the composer text, resizes and puts the caret at the end. */
  readonly setInputAndCursorEnd: (value: string) => void
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:input:1` — the viewer composer's one-time `/teamsay ` prefill. */
    readonly 1: ChatEffect
  }
}

/**
 * Builds the `chat:input` slice.
 *
 * @param ctx - The panel context (the composer and every popup the keystroke touches).
 * @returns The input slice.
 */
export function createChatInput(ctx: ChatCtx): ChatInputSlice {
  // React's own value tracker for the uncontrolled element: the value it saw
  // at the last change/input event, kept by the composer because its
  // programmatic writes move the tracker as React's own element writes do. A
  // native event whose value it already saw (the `change` a blur fires after
  // typing, or after `setInputValue`) does not call the handler again, exactly
  // as React's onChange does not.
  const trackedValue = ctx.composer.trackedInputValue

  /**
   * Handles one change of the textarea's value — React's `onChange` on an
   * uncontrolled textarea, which is the native `input` event, plus the native
   * `change` a blur fires when the value differs from the last one it saw.
   *
   * @param event - The textarea's input or change event.
   */
  const handleInputChange = (event: Event): void => {
    const target = event.target as HTMLTextAreaElement
    if (target.value === trackedValue.current) return
    trackedValue.current = target.value
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
        mode: parseModelModeCommand(val)?.mode ?? ctx.chat.liveModelMode.value,
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
        ctx.composer.setEffortPicker((p) => ({
          selectedIdx: -1,
          mode: typedMode ?? p?.mode ?? ctx.chat.liveModelMode.value,
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

  /**
   * Sets the textarea value and moves the cursor to the end.
   *
   * @param val - The text to put in the composer.
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

  return {
    handleInputChange,
    setInputAndCursorEnd,
    effects: {
      1: () => {
        // Viewer composer prefill: the box IS the team-chat input, so it starts
        // with "/teamsay " already typed (and handleSubmit re-fills it after
        // each sent team message). Once per mount, and never over text the user
        // already has (the done flag is declared with the tips state, whose
        // switch effect re-arms it).
        const run = (): void => {
          if (
            ctx.env.transcriptOnly.value ||
            ctx.props.canEdit !== false ||
            ctx.tips.viewerPrefillDoneRef.current
          ) {
            return
          }
          ctx.tips.viewerPrefillDoneRef.current = true
          if (!ctx.composer.inputRef.current.trim()) setInputAndCursorEnd('/teamsay ')
        }
        onMounted(run)
        watch(
          [
            () => ctx.props.canEdit,
            () => ctx.env.conversationId.value,
            () => ctx.env.transcriptOnly.value,
          ],
          run,
          { flush: 'post' },
        )
      },
    },
  }
}
