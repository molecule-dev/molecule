/**
 * React's `chat:auto-send` regions of ChatPanel.tsx (lines 2199–2201 and
 * 2513–2647): the once-per-mount send of the initial message, the pending
 * message the host (or an auto-fix) asks the panel to send — immediately, or
 * deferred until the running turn ends — and the drop of queued auto-fix
 * messages when the user edits a relevant file.
 *
 * Each effect reads the props through `ctx` at run time, so a prop change
 * re-runs the same branch React's dependency array re-ran. The three refs
 * React declares here (`sentInitialRef`, `lastPendingKeyRef`,
 * `lastUserEditKeyRef`) are plain holders, and the deferred-send refs live on
 * the `chat:auto-fix` slice (`ctx.autoFix`) exactly where React declares them.
 *
 * @module
 */

import { COMMANDS } from '@molecule/app-ide-panel-logic'
import { matchesSideChannelCommand } from '@molecule/app-ide-panel-logic/panels'

import type { ChatContext, MutableRef } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:auto-send` slice. */
export interface ChatAutoSendSlice {
  /** React's mount I/O for the region (none: the region declares refs only). */
  mount(): void

  /** React's `#effect chat:auto-send:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void; 3: () => void; 4: () => void }
}

/**
 * Creates the `chat:auto-send` slice.
 *
 * @param ctx - The shared chat context.
 * @returns React's four auto-send effects, at their original positions.
 */
export function createChatAutoSend(ctx: ChatContext): ChatAutoSendSlice {
  /** React's `sentInitialRef` — the initial message already consumed. */
  const sentInitialRef: MutableRef<string | null> = { current: null }
  /** React's `lastPendingKeyRef` — the pending-message key already handled. */
  const lastPendingKeyRef: MutableRef<number | undefined> = { current: ctx.props.pendingMessageKey }
  /** React's `lastUserEditKeyRef` — the user-edit key already acted on. */
  const lastUserEditKeyRef: MutableRef<number | undefined> = {
    current: ctx.props.userEditedFileKey,
  }

  return {
    mount(): void {
      // React's regions declare refs only; there is no mount I/O to repeat.
    },
    effects: {
      1: (): void => {
        // ── Auto-send initial message ────────────────────────────────────────
        // Skip if a conversation already exists (e.g. page refresh with router
        // state preserved).
        $effect(() => {
          const initialMessage = ctx.props.initialMessage
          if (!initialMessage || ctx.env.hasConversation) return
          // A read-only VIEWER never auto-sends the initial prompt: the host
          // sources it from PROJECT-keyed localStorage, which survives a role
          // demotion and a shared browser — a stale entry would auto-POST an
          // agent turn the server 403s, surfacing a spurious red error on mount.
          // Consume the ref so it is never retried either.
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
          const extraCommands = ctx.props.extraCommands
          const sideChannel =
            ctx.props.canSendTeamMessages !== false &&
            matchesSideChannelCommand(
              extraCommands?.length ? [...COMMANDS, ...extraCommands] : COMMANDS,
              initialMessage,
            )
          ctx.chat.sendMessage(
            initialMessage,
            undefined,
            sideChannel ? { suppressUserMessage: true } : undefined,
          )
          ctx.props.onInitialMessageSent?.()
        })
      },
      2: (): void => {
        // ── Auto-send pending message (e.g. "Fix with AI", preview errors) ────
        // Defers sending while the AI is streaming to avoid queueing up auto-fix
        // messages during active work. Messages are sent once streaming ends.
        $effect(() => {
          const pendingMessage = ctx.props.pendingMessage
          const pendingMessageKey = ctx.props.pendingMessageKey
          if (!pendingMessage || pendingMessageKey === undefined) return
          // A read-only VIEWER never dispatches platform-composed sends (build
          // kickoffs, auto-fixes, preview-failure reports): the server 403s them
          // and the denial used to surface as a red error in the viewer's chat.
          // Consume the key so the same message isn't retried.
          if (ctx.props.canEdit === false) {
            lastPendingKeyRef.current = pendingMessageKey
            return
          }
          if (pendingMessageKey === lastPendingKeyRef.current) return
          lastPendingKeyRef.current = pendingMessageKey
          if (ctx.systemCards.blockDisabledTeamMessage(pendingMessage)) return
          // A pending message is ALWAYS system-composed (an auto-fix prompt, a
          // preview-failure report, a "Fix with AI" request) — never text the
          // user typed. So it must NEVER render as a normal user bubble: either
          // it's suppressed entirely (hidden build kickoff) or it stays visible
          // but flagged `automatic` so the chat shows it as sent by Synthase on
          // the user's behalf (distinct avatar + accent), not typed by the user.
          // Suppressed or not, a pending message is platform-composed, so it
          // ALWAYS carries `automatic` (+ `userInitiated` when a direct click
          // requested it). A suppressed send without `automatic` used to bypass
          // the server's user-stop gate — the hidden build kickoff resumed a
          // plan turn ~37s after an explicit Stop (prod 2026-08-13).
          const pendingMessageSuppressUser = ctx.props.pendingMessageSuppressUser
          const pendingMessageUserInitiated = ctx.props.pendingMessageUserInitiated
          const sendOpts = {
            ...(pendingMessageSuppressUser ? { suppressUserMessage: true } : {}),
            automatic: true,
            ...(pendingMessageUserInitiated ? { userInitiated: true } : {}),
          }
          if (ctx.chat.isLoading) {
            // AI is busy — defer until streaming ends
            ctx.autoFix.deferredPendingRef.current = pendingMessage
            ctx.autoFix.deferredPendingSuppressRef.current = !!pendingMessageSuppressUser
            ctx.autoFix.deferredPendingUserInitiatedRef.current = !!pendingMessageUserInitiated
          } else {
            ctx.autoFix.deferredPendingRef.current = null
            ctx.chat.sendMessage(pendingMessage, undefined, sendOpts)
          }
        })
      },
      3: (): void => {
        // When streaming ends, send any deferred message. (A user Stop also ends
        // streaming, but handleAbort drops the deferred message first — and
        // useChat's stop guard would drop an autonomous automatic send anyway —
        // so a stopped turn is never auto-resumed by a fix that queued up
        // mid-stream.)
        $effect(() => {
          const isLoading = ctx.chat.isLoading
          if (isLoading || !ctx.autoFix.deferredPendingRef.current) return
          const msg = ctx.autoFix.deferredPendingRef.current
          const suppress = ctx.autoFix.deferredPendingSuppressRef.current
          const userInitiated = ctx.autoFix.deferredPendingUserInitiatedRef.current
          ctx.autoFix.deferredPendingRef.current = null
          ctx.autoFix.deferredPendingSuppressRef.current = false
          ctx.autoFix.deferredPendingUserInitiatedRef.current = false
          // A viewer never dispatches platform-composed sends (same as the
          // immediate path above) — the refs are already drained, so it just
          // drops.
          if (ctx.props.canEdit === false || ctx.systemCards.blockDisabledTeamMessage(msg)) return
          // Same rule as the immediate path: a deferred pending message is
          // system-composed — always `automatic` (suppressed or visible), never
          // a plain user bubble.
          ctx.chat.sendMessage(msg, undefined, {
            ...(suppress ? { suppressUserMessage: true } : {}),
            automatic: true,
            ...(userInitiated ? { userInitiated: true } : {}),
          })
        })
      },
      4: (): void => {
        // ── Auto-delete queued autofix messages when the user edits a relevant file ──
        $effect(() => {
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
        })
      },
    },
  }
}
