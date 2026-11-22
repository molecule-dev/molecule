/**
 * React's `chat:signals` region of ChatPanel.tsx (lines 4434–4484): the host's
 * external triggers — auto-submit, open-settings, open-report and open-share.
 *
 * Each trigger is a numeric/undefined prop the host bumps, paired with a ref
 * that remembers the last value the panel acted on. React seeds each ref with
 * the value of the first render, so a signal already set when the panel mounts
 * counts as consumed and opens nothing; only a later change acts. This slice
 * keeps that guard by initializing the refs from the props at construction and
 * reading the live props inside the effects, so a host bump reaches the action
 * the same way React's dependency arrays do.
 *
 * @module
 */

import { DEFAULT_SHARE_ROLE } from '@molecule/app-ide-panel-logic'

import type { ChatContext, MutableRef } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:signals` slice. */
export interface ChatSignalsSlice {
  /** React's mount I/O for the region (none: the refs are seeded at creation). */
  mount(): void

  /** React's `#effect chat:signals:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void; 3: () => void; 4: () => void }
}

/**
 * Creates the `chat:signals` slice.
 *
 * @param ctx - The shared chat context (the host's signal props, the composer's
 *   input, the submit and command actions, the share availability, the popups).
 * @returns The four signal effects, with their mount guard seeded from the
 *   props' first-render values.
 */
export function createChatSignals(ctx: ChatContext): ChatSignalsSlice {
  // React's `useRef(<signal>)`: the value the panel has already acted on. Seeded
  // from the first render so a signal set at mount opens nothing.
  const lastAutoSubmitRef: MutableRef<number | undefined> = { current: ctx.props.autoSubmitSignal }
  const lastOpenSettingsRef: MutableRef<number | undefined> = {
    current: ctx.props.openSettingsSignal,
  }
  const lastOpenReportRef: MutableRef<number | undefined> = { current: ctx.props.openReportSignal }
  const lastOpenShareRef: MutableRef<number | undefined> = { current: ctx.props.openShareSignal }

  return {
    mount(): void {
      // React's region declares state only; the refs are seeded above.
    },
    effects: {
      1: (): void => {
        // External auto-submit: a changed signal submits the current input (the
        // prompt → chat morph sends its prefilled prompt once docked; handleSubmit
        // clears the input as it sends).
        $effect(() => {
          const signal = ctx.props.autoSubmitSignal
          if (signal !== undefined && signal !== lastAutoSubmitRef.current) {
            lastAutoSubmitRef.current = signal
            if (ctx.composer.inputRef.current.trim()) void ctx.submit.handleSubmit()
          }
        })
      },
      2: (): void => {
        // External "open settings" trigger from the header gear button.
        $effect(() => {
          const signal = ctx.props.openSettingsSignal
          if (signal !== undefined && signal !== lastOpenSettingsRef.current) {
            lastOpenSettingsRef.current = signal
            void ctx.commands.executeCommand('settings')
          }
        })
      },
      3: (): void => {
        // External "open report" trigger from the header bug-report button.
        $effect(() => {
          const signal = ctx.props.openReportSignal
          if (signal !== undefined && signal !== lastOpenReportRef.current) {
            lastOpenReportRef.current = signal
            ctx.popups.setReportModal({ title: '' })
          }
        })
      },
      4: (): void => {
        // External "open share" trigger from the header share button.
        $effect(() => {
          const signal = ctx.props.openShareSignal
          if (signal === undefined) return
          // A host without the share capability consumes the signal without opening.
          if (!ctx.env.shareAllowed) {
            lastOpenShareRef.current = signal
            return
          }
          if (signal === lastOpenShareRef.current) return
          lastOpenShareRef.current = signal
          ctx.popups.setShareModal({ role: DEFAULT_SHARE_ROLE })
        })
      },
    },
  }
}
