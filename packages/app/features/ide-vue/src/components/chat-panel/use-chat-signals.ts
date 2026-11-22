/**
 * `chat:signals` — the host's external signals, ported from React's
 * `chat:signals` region: the auto-submit, settings, report, share, model
 * selection and input-seed signals, each reacting to a changed value.
 *
 * The slice exposes no values: its work is entirely effect-driven, in the order
 * React registers it. Each effect keeps a plain `{ current }` ref of the last
 * signal value it acted on — React's `useRef` initialised to the mount prop —
 * so a signal already set at mount is consumed without opening anything, and a
 * repeated value does nothing.
 *
 * @module
 */

import { watch } from 'vue'

import { DEFAULT_SHARE_ROLE } from '@molecule/app-ide-panel-logic'

import type { ChatCtx, ChatEffect, MutableRef } from './context.js'

/** What the `chat:signals` slice exposes. */
export interface ChatSignalsSlice {
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:signals:1`. */
    readonly 1: ChatEffect
    /** `#effect chat:signals:2`. */
    readonly 2: ChatEffect
    /** `#effect chat:signals:3`. */
    readonly 3: ChatEffect
    /** `#effect chat:signals:4`. */
    readonly 4: ChatEffect
  }
}

/**
 * Builds the `chat:signals` slice.
 *
 * @param ctx - The panel context (the composer, the command dispatcher, the
 * popups and the env's share capability).
 * @returns The signals slice.
 */
export function createChatSignals(ctx: ChatCtx): ChatSignalsSlice {
  const lastAutoSubmitRef: MutableRef<number | undefined> = { current: ctx.props.autoSubmitSignal }
  const lastOpenSettingsRef: MutableRef<number | undefined> = {
    current: ctx.props.openSettingsSignal,
  }
  const lastOpenReportRef: MutableRef<number | undefined> = { current: ctx.props.openReportSignal }
  const lastOpenShareRef: MutableRef<number | undefined> = { current: ctx.props.openShareSignal }

  return {
    effects: {
      1: () => {
        // External auto-submit. When the signal changes, submit the current
        // input — used by the prompt → chat morph to send the prefilled prompt
        // once the chat has docked into place (handleSubmit clears the input as
        // it sends).
        watch(
          () => ctx.props.autoSubmitSignal,
          (autoSubmitSignal) => {
            if (autoSubmitSignal !== undefined && autoSubmitSignal !== lastAutoSubmitRef.current) {
              lastAutoSubmitRef.current = autoSubmitSignal
              if (ctx.composer.inputRef.current.trim()) void ctx.submit.handleSubmit()
            }
          },
          { flush: 'post' },
        )
      },
      2: () => {
        // External "open settings" trigger from the header gear button. When the
        // signal changes, open the /settings view (same path as the slash command).
        watch(
          () => ctx.props.openSettingsSignal,
          (openSettingsSignal) => {
            if (
              openSettingsSignal !== undefined &&
              openSettingsSignal !== lastOpenSettingsRef.current
            ) {
              lastOpenSettingsRef.current = openSettingsSignal
              void ctx.commands.executeCommand('settings')
            }
          },
          { flush: 'post' },
        )
      },
      3: () => {
        // External "open report" trigger from the header bug-report button. When
        // the signal changes, open the bug-report modal (same path as /report
        // and /bug).
        watch(
          () => ctx.props.openReportSignal,
          (openReportSignal) => {
            if (openReportSignal !== undefined && openReportSignal !== lastOpenReportRef.current) {
              lastOpenReportRef.current = openReportSignal
              ctx.popups.setReportModal({ title: '' })
            }
          },
          { flush: 'post' },
        )
      },
      4: () => {
        // External "open share" trigger from the header share button. When the
        // signal changes, open the share-link modal (same path as the /share
        // command).
        watch(
          [() => ctx.props.openShareSignal, () => ctx.env.shareAllowed.value],
          ([openShareSignal]) => {
            if (openShareSignal === undefined) return
            // A host without the share capability consumes the signal without
            // opening.
            if (!ctx.env.shareAllowed.value) {
              lastOpenShareRef.current = openShareSignal
              return
            }
            if (openShareSignal === lastOpenShareRef.current) return
            lastOpenShareRef.current = openShareSignal
            ctx.popups.setShareModal({ role: DEFAULT_SHARE_ROLE })
          },
          { flush: 'post' },
        )
      },
    },
  }
}
