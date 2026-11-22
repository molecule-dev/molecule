/**
 * `chat:input` — the textarea's input handling and the cursor-end setter the
 * commands and voice slices write through (React's `chat:input` region and its
 * one effect, ported by unit P4).
 *
 * `handleInputChange` is one ordered pass over a keystroke: write the value,
 * prune dictated snippets, update the sendable flag, resize, persist the draft,
 * pause the auto-fix countdown, then derive exactly one popup from the caret and
 * the text (`@` mention, `/model`, `/effort`, or the command menu) — the order
 * React's body runs in, including the early returns.
 *
 * React's `onChange` on an uncontrolled textarea fires for the native `input`
 * event and, once more, for the native `change` a blur fires — but only when the
 * value differs from the last one it saw. The port keeps React's value tracker
 * so a repeated event never runs the handler twice.
 *
 * @module
 */

import { createEffect, on, onMount } from 'solid-js'

import { parseEffortCommand, parseModelModeCommand } from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, MutableRef, SliceEffects } from './context.js'

/** What other slices read from `chat:input`. */
export interface ChatInputSlice {
  /** Mirrors the textarea's text into the composer slice. */
  handleInputChange: (event: Event) => void
  /** Replaces the composer text and puts the caret at its end. */
  setInputAndCursorEnd: (value: string) => void
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:input`.
 * @param ctx - The inner ctx (the composer and every popup a keystroke touches).
 * @returns The input slice.
 */
export function createChatInput(ctx: ChatInnerCtx): ChatInputSlice {
  // React's value tracker for the uncontrolled element (shared with the
  // composer, so a programmatic rewrite counts too): a native event whose value
  // it already saw (the `change` a blur fires after typing) does not call the
  // handler again, exactly as React's onChange does not.
  const trackedValue: MutableRef<string> = ctx.composer.trackedInputValueRef

  /**
   * Handles one change of the textarea's value — React's `onChange` on an
   * uncontrolled textarea, which is the native `input` event plus the native
   * `change` a blur fires when the value differs from the last one it saw.
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
        mode: parseModelModeCommand(val)?.mode ?? ctx.chat.liveModelMode(),
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
          mode: typedMode ?? picker?.mode ?? ctx.chat.liveModelMode(),
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
      // #effect chat:input:1 — the viewer composer's one-time `/teamsay `
      // prefill. The box IS the team-chat input, so it starts with the command
      // already typed (and handleSubmit re-fills it after each sent team
      // message). Never over text the user already has; the done flag is
      // declared with the tips state, whose switch effect re-arms it.
      1: () => {
        // The conversation the prefill last ran for. A real switch re-arms the
        // one-time prefill, as React's tips effect does — done here too because
        // Solid may run this effect before that one (its order follows the last
        // re-run, not declaration), and the prefill must not miss its turn.
        let prefilledConversation: string | null = ctx.env.conversationId()
        const run = (): void => {
          const conversationId = ctx.env.conversationId()
          if (conversationId !== prefilledConversation) {
            if (prefilledConversation != null) ctx.tips.viewerPrefillDoneRef.current = false
            prefilledConversation = conversationId
          }
          if (
            ctx.env.transcriptOnly() ||
            ctx.props.canEdit !== false ||
            ctx.tips.viewerPrefillDoneRef.current
          ) {
            return
          }
          ctx.tips.viewerPrefillDoneRef.current = true
          if (!ctx.composer.inputRef.current.trim()) setInputAndCursorEnd('/teamsay ')
        }
        onMount(run)
        // React's dependency list: the role, the conversation and the
        // transcript flag. `defer` keeps the mount run to `onMount`, so the
        // prefill happens once at React's position.
        createEffect(
          on(
            () => [ctx.props.canEdit, ctx.env.conversationId(), ctx.env.transcriptOnly()],
            () => run(),
            { defer: true },
          ),
        )
      },
    },
  }
}
