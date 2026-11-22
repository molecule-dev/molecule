/**
 * `chat:signals` — the host's external signals: an auto-submit and the
 * `/settings`, `/report` and `/share` openers.
 *
 * Each signal is a number the host bumps. The port follows React's effects
 * exactly: a `last…Ref` seeded from the signal's value at creation, so mounting
 * with a signal already set opens nothing; the effect acts only when the value
 * changes afterwards. The share signal also consumes without opening when the
 * host does not allow sharing links, and the auto-submit only submits when the
 * composer holds non-blank text (`handleSubmit` clears the input as it sends).
 *
 * @module
 */

import { createEffect, on } from 'solid-js'

import { DEFAULT_SHARE_ROLE } from '@molecule/app-ide-panel-logic'

import type { ChatInnerCtx, SliceEffects } from './context.js'

/** What other slices read from `chat:signals` (nothing yet). */
export interface ChatSignalsSlice {
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:signals`.
 * @param ctx - The inner ctx (the host's signal props, the composer's input,
 *   `handleSubmit`, `executeCommand`, the share capability and the modal
 *   setters).
 * @returns The signals slice.
 */
export function createChatSignals(ctx: ChatInnerCtx): ChatSignalsSlice {
  // React's `useRef(signal)` seeds: the value at creation is already "seen", so
  // a panel that mounts with the signal set opens nothing.
  let lastAutoSubmit = ctx.props.autoSubmitSignal
  let lastOpenSettings = ctx.props.openSettingsSignal
  let lastOpenReport = ctx.props.openReportSignal
  let lastOpenShare = ctx.props.openShareSignal

  return {
    effects: {
      // #effect chat:signals:1 — external auto-submit, used by the prompt → chat
      // morph to send a prefilled prompt once the chat has docked into place.
      1: () => {
        createEffect(
          on(
            () => ctx.props.autoSubmitSignal,
            (signal) => {
              if (signal !== undefined && signal !== lastAutoSubmit) {
                lastAutoSubmit = signal
                if (ctx.composer.inputRef.current.trim()) void ctx.submit.handleSubmit()
              }
            },
            { defer: false },
          ),
        )
      },

      // #effect chat:signals:2 — external "open settings" from the header gear
      // button; the same path as the `/settings` slash command.
      2: () => {
        createEffect(
          on(
            () => ctx.props.openSettingsSignal,
            (signal) => {
              if (signal !== undefined && signal !== lastOpenSettings) {
                lastOpenSettings = signal
                void ctx.commands.executeCommand('settings')
              }
            },
            { defer: false },
          ),
        )
      },

      // #effect chat:signals:3 — external "open report" from the header
      // bug-report button; the same path as `/report` and `/bug`.
      3: () => {
        createEffect(
          on(
            () => ctx.props.openReportSignal,
            (signal) => {
              if (signal !== undefined && signal !== lastOpenReport) {
                lastOpenReport = signal
                ctx.popups.setReportModal({ title: '' })
              }
            },
            { defer: false },
          ),
        )
      },

      // #effect chat:signals:4 — external "open share" from the header share
      // button; the same path as `/share`. A host without the share capability
      // consumes the signal without opening.
      4: () => {
        createEffect(
          on(
            () => [ctx.props.openShareSignal, ctx.env.shareAllowed()] as const,
            ([signal]) => {
              if (signal === undefined) return
              if (!ctx.env.shareAllowed()) {
                lastOpenShare = signal
                return
              }
              if (signal === lastOpenShare) return
              lastOpenShare = signal
              ctx.popups.setShareModal({ role: DEFAULT_SHARE_ROLE })
            },
            { defer: false },
          ),
        )
      },
    },
  }
}
