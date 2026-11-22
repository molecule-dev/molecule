/**
 * `chat:auto-send` — the initial, pending and deferred automatic sends
 * (React's two `chat:auto-send` regions and its four effects, ported by unit
 * U8).
 *
 * Three sources start a send without the composer: the `initialMessage` a mount
 * auto-sends once, a `pendingMessage` the host dispatches by changing its key
 * (either at once, or deferred while a turn streams), and the deferred message
 * that goes out when the stream ends. Every one of them keeps React's ref
 * guards, so an effect that re-runs never repeats a send, and a read-only
 * viewer never dispatches a platform-composed turn. The fourth effect drops
 * queued auto-fix messages once the user edits the file they were about.
 *
 * @module
 */

import { createEffect, on } from 'solid-js'

import { COMMANDS, matchesSideChannelCommand } from '@molecule/app-ide-panel-logic/panels'

import type { ChatInnerCtx, MutableRef, SliceEffects } from './context.js'

/** What other slices read from `chat:auto-send` (nothing yet). */
export interface ChatAutoSendSlice {
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:auto-send`.
 * @param ctx - The inner ctx (the props that dispatch a send, the live loading
 *   flag, and the deferred-message refs the auto-fix slice owns).
 * @returns The auto-send slice.
 */
export function createChatAutoSend(ctx: ChatInnerCtx): ChatAutoSendSlice {
  // The initial message already consumed (it never sends twice).
  const sentInitialRef: MutableRef<string | null> = { current: null }
  // The pending key the panel has seen (seeded with the mount value, so a
  // message counted before mount waits for a new key).
  const lastPendingKeyRef: MutableRef<number | undefined> = {
    current: ctx.props.pendingMessageKey,
  }
  // The user-edit key the panel has seen.
  const lastUserEditKeyRef: MutableRef<number | undefined> = {
    current: ctx.props.userEditedFileKey,
  }

  return {
    effects: {
      // #effect chat:auto-send:1 — auto-send the initial message. Skipped when a
      // conversation already exists (e.g. a page refresh with router state kept).
      1: () => {
        const run = (): void => {
          const initialMessage = ctx.props.initialMessage
          if (!initialMessage || ctx.env.hasConversation()) return
          // A read-only VIEWER never auto-sends the initial prompt: the host
          // sources it from PROJECT-keyed localStorage, which survives a role
          // demotion and a shared browser — a stale entry would auto-POST an
          // agent turn the server 403s. Consume the ref so it is never retried.
          if (ctx.props.canEdit === false) {
            sentInitialRef.current = initialMessage
            return
          }
          if (sentInitialRef.current === initialMessage) return
          sentInitialRef.current = initialMessage
          if (ctx.systemCards.blockDisabledTeamMessage(initialMessage)) {
            ctx.props.onInitialMessageSent?.()
            return
          }
          const sideChannel =
            ctx.props.canSendTeamMessages !== false &&
            matchesSideChannelCommand(
              ctx.props.extraCommands?.length
                ? [...COMMANDS, ...ctx.props.extraCommands]
                : COMMANDS,
              initialMessage,
            )
          ctx.chat.sendMessage(
            initialMessage,
            undefined,
            sideChannel ? { suppressUserMessage: true } : undefined,
          )
          ctx.props.onInitialMessageSent?.()
        }
        createEffect(
          on(
            () => [
              ctx.props.initialMessage,
              ctx.env.hasConversation(),
              ctx.props.onInitialMessageSent,
              ctx.props.extraCommands,
              ctx.props.canEdit,
              ctx.props.canSendTeamMessages,
            ],
            run,
            { defer: false },
          ),
        )
      },

      // #effect chat:auto-send:2 — when a new pending message arrives, either
      // send it immediately or defer it until streaming ends.
      2: () => {
        const run = (): void => {
          const pendingMessage = ctx.props.pendingMessage
          const pendingMessageKey = ctx.props.pendingMessageKey
          if (!pendingMessage || pendingMessageKey === undefined) return
          // A read-only VIEWER never dispatches platform-composed sends (build
          // kickoffs, auto-fixes, preview-failure reports): the server 403s
          // them. Consume the key so the same message is not retried.
          if (ctx.props.canEdit === false) {
            lastPendingKeyRef.current = pendingMessageKey
            return
          }
          if (pendingMessageKey === lastPendingKeyRef.current) return
          lastPendingKeyRef.current = pendingMessageKey
          if (ctx.systemCards.blockDisabledTeamMessage(pendingMessage)) return
          // A pending message is ALWAYS system-composed (an auto-fix prompt, a
          // preview-failure report, a "Fix with AI" request) — never text the
          // user typed. So it never renders as a normal user bubble: either it
          // is suppressed entirely (a hidden build kickoff) or it stays visible
          // but flagged `automatic`, so the chat shows it as sent by Synthase
          // on the user's behalf. A suppressed send without `automatic` used to
          // bypass the server's user-stop gate.
          const sendOpts = {
            ...(ctx.props.pendingMessageSuppressUser ? { suppressUserMessage: true } : {}),
            automatic: true,
            ...(ctx.props.pendingMessageUserInitiated ? { userInitiated: true } : {}),
          }
          if (ctx.chat.isLoading()) {
            // AI is busy — defer until streaming ends.
            ctx.autoFix.deferredPendingRef.current = pendingMessage
            ctx.autoFix.deferredPendingSuppressRef.current = !!ctx.props.pendingMessageSuppressUser
            ctx.autoFix.deferredPendingUserInitiatedRef.current =
              !!ctx.props.pendingMessageUserInitiated
          } else {
            ctx.autoFix.deferredPendingRef.current = null
            ctx.chat.sendMessage(pendingMessage, undefined, sendOpts)
          }
        }
        createEffect(
          on(
            () => [
              ctx.props.pendingMessage,
              ctx.props.pendingMessageKey,
              ctx.props.pendingMessageSuppressUser,
              ctx.props.pendingMessageUserInitiated,
              ctx.chat.isLoading(),
              ctx.props.canEdit,
            ],
            run,
            { defer: false },
          ),
        )
      },

      // #effect chat:auto-send:3 — when streaming ends, send any deferred
      // message. (A user Stop also ends streaming, but `handleAbort` drops the
      // deferred message first, so a stopped turn is never auto-resumed.)
      3: () => {
        const run = (): void => {
          if (ctx.chat.isLoading() || !ctx.autoFix.deferredPendingRef.current) return
          const msg = ctx.autoFix.deferredPendingRef.current
          const suppress = ctx.autoFix.deferredPendingSuppressRef.current
          const userInitiated = ctx.autoFix.deferredPendingUserInitiatedRef.current
          ctx.autoFix.deferredPendingRef.current = null
          ctx.autoFix.deferredPendingSuppressRef.current = false
          ctx.autoFix.deferredPendingUserInitiatedRef.current = false
          // A viewer never dispatches platform-composed sends (same as the
          // immediate path above) — the refs are already drained, so it drops.
          if (ctx.props.canEdit === false || ctx.systemCards.blockDisabledTeamMessage(msg)) return
          // Same rule as the immediate path: a deferred pending message is
          // system-composed — always `automatic`, never a plain user bubble.
          ctx.chat.sendMessage(msg, undefined, {
            ...(suppress ? { suppressUserMessage: true } : {}),
            automatic: true,
            ...(userInitiated ? { userInitiated: true } : {}),
          })
        }
        createEffect(on(() => [ctx.chat.isLoading(), ctx.props.canEdit], run, { defer: false }))
      },

      // #effect chat:auto-send:4 — auto-delete queued autofix messages when the
      // user edits a relevant file.
      4: () => {
        const run = (): void => {
          const userEditedFile = ctx.props.userEditedFile
          const userEditedFileKey = ctx.props.userEditedFileKey
          if (
            userEditedFile &&
            userEditedFileKey !== undefined &&
            userEditedFileKey !== lastUserEditKeyRef.current
          ) {
            lastUserEditKeyRef.current = userEditedFileKey
            ctx.chat.clearQueuedForFile(userEditedFile)
          }
        }
        createEffect(
          on(() => [ctx.props.userEditedFile, ctx.props.userEditedFileKey], run, {
            defer: false,
          }),
        )
      },
    },
  }
}
