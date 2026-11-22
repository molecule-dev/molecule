/**
 * `chat:auto-send` — the initial message, the host's pending messages and the
 * deferred auto-fix sends, ported from React's two `chat:auto-send` regions.
 * The slice exposes no values: its work is entirely effect-driven, in the order
 * React registers it.
 *
 * React's `useEffect` mount + dependency re-run becomes `onMounted` for the
 * first run plus a `watch` of the same sources (never `immediate`, which would
 * run during setup — before the children — and reverse React's order). Each
 * body guards itself through a plain ref, exactly as React's does, so a
 * re-run that React's dependency list would trigger sends nothing twice.
 *
 * @module
 */

import { onMounted, watch } from 'vue'

import { COMMANDS, matchesSideChannelCommand } from '@molecule/app-ide-panel-logic/panels'

import type { ChatCtx, ChatEffect, MutableRef } from './context.js'

/** What the `chat:auto-send` slice exposes. */
export interface ChatAutoSendSlice {
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:auto-send:1` — the initial message, once. */
    readonly 1: ChatEffect
    /** `#effect chat:auto-send:2` — the host's pending message. */
    readonly 2: ChatEffect
    /** `#effect chat:auto-send:3` — a deferred auto-fix message. */
    readonly 3: ChatEffect
    /** `#effect chat:auto-send:4` — the user-edited-file check. */
    readonly 4: ChatEffect
  }
}

/**
 * Builds the `chat:auto-send` slice.
 *
 * @param ctx - The panel context (the composer's send path and the transcript).
 * @returns The auto-send slice.
 */
export function createChatAutoSend(ctx: ChatCtx): ChatAutoSendSlice {
  // The message the initial send already dispatched (or consumed), so it is
  // never retried — React's `sentInitialRef`.
  const sentInitialRef: MutableRef<string | null> = { current: null }
  // The pending-message key the last dispatch read, so the same key sends once.
  const lastPendingKeyRef: MutableRef<number | undefined> = { current: ctx.props.pendingMessageKey }
  // The user-edit key the last check read, so one edit reaches the queue once.
  const lastUserEditKeyRef: MutableRef<number | undefined> = {
    current: ctx.props.userEditedFileKey,
  }

  /**
   * Sends the initial message once: skipped when a conversation already exists,
   * when the viewer is read-only (the ref is consumed so it never retries), and
   * when this exact message already went out.
   */
  const runInitialSend = (): void => {
    const initialMessage = ctx.props.initialMessage
    if (!initialMessage || ctx.env.hasConversation.value) return
    // A read-only VIEWER never auto-sends the initial prompt: the host sources
    // it from PROJECT-keyed localStorage, which survives a role demotion and a
    // shared browser — a stale entry would auto-POST an agent turn the server
    // 403s, surfacing a spurious red error on mount. Consume the ref so it is
    // never retried either.
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
        ctx.props.extraCommands?.length ? [...COMMANDS, ...ctx.props.extraCommands] : COMMANDS,
        initialMessage,
      )
    void ctx.chat.sendMessage(
      initialMessage,
      undefined,
      sideChannel ? { suppressUserMessage: true } : undefined,
    )
    ctx.props.onInitialMessageSent?.()
  }

  /**
   * Dispatches the host's pending message: immediately when the agent is idle,
   * deferred while a turn streams, and never for a read-only viewer (the key is
   * still consumed so it does not retry).
   */
  const runPendingSend = (): void => {
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
    // A pending message is ALWAYS system-composed (an auto-fix prompt, a preview-failure
    // report, a "Fix with AI" request) — never text the user typed. So it must NEVER
    // render as a normal user bubble: either it's suppressed entirely (hidden build
    // kickoff) or it stays visible but flagged `automatic` so the chat shows it as sent
    // by Synthase on the user's behalf (distinct avatar + accent), not typed by the user.
    // Suppressed or not, a pending message is platform-composed, so it ALWAYS
    // carries `automatic` (+ `userInitiated` when a direct click requested it).
    // A suppressed send without `automatic` used to bypass the server's
    // user-stop gate — the hidden build kickoff resumed a plan turn ~37s
    // after an explicit Stop (prod 2026-08-13).
    const sendOpts = {
      ...(ctx.props.pendingMessageSuppressUser ? { suppressUserMessage: true } : {}),
      automatic: true,
      ...(ctx.props.pendingMessageUserInitiated ? { userInitiated: true } : {}),
    }
    if (ctx.chat.isLoading.value) {
      // AI is busy — defer until streaming ends
      ctx.autoFix.deferredPendingRef.current = pendingMessage
      ctx.autoFix.deferredPendingSuppressRef.current = !!ctx.props.pendingMessageSuppressUser
      ctx.autoFix.deferredPendingUserInitiatedRef.current = !!ctx.props.pendingMessageUserInitiated
    } else {
      ctx.autoFix.deferredPendingRef.current = null
      void ctx.chat.sendMessage(pendingMessage, undefined, sendOpts)
    }
  }

  /**
   * Sends the deferred pending message once streaming ends. (A user Stop also
   * ends streaming, but `handleAbort` drops the deferred message first — and
   * useChat's stop guard would drop an autonomous automatic send anyway — so a
   * stopped turn is never auto-resumed by a fix that queued up mid-stream.)
   */
  const runDeferredSend = (): void => {
    if (!ctx.chat.isLoading.value && ctx.autoFix.deferredPendingRef.current) {
      const msg = ctx.autoFix.deferredPendingRef.current
      const suppress = ctx.autoFix.deferredPendingSuppressRef.current
      const userInitiated = ctx.autoFix.deferredPendingUserInitiatedRef.current
      ctx.autoFix.deferredPendingRef.current = null
      ctx.autoFix.deferredPendingSuppressRef.current = false
      ctx.autoFix.deferredPendingUserInitiatedRef.current = false
      // A viewer never dispatches platform-composed sends (same as the
      // immediate path above) — the refs are already drained, so it just drops.
      if (ctx.props.canEdit === false || ctx.systemCards.blockDisabledTeamMessage(msg)) return
      // Same rule as the immediate path: a deferred pending message is system-composed —
      // always `automatic` (suppressed or visible), never a plain user bubble.
      void ctx.chat.sendMessage(msg, undefined, {
        ...(suppress ? { suppressUserMessage: true } : {}),
        automatic: true,
        ...(userInitiated ? { userInitiated: true } : {}),
      })
    }
  }

  /**
   * Drops the queued auto-fix messages that reference the file the user just
   * edited, once per edit key.
   */
  const runUserEditCheck = (): void => {
    if (
      ctx.props.userEditedFile &&
      ctx.props.userEditedFileKey !== undefined &&
      ctx.props.userEditedFileKey !== lastUserEditKeyRef.current
    ) {
      lastUserEditKeyRef.current = ctx.props.userEditedFileKey
      ctx.chat.clearQueuedForFile(ctx.props.userEditedFile)
    }
  }

  return {
    effects: {
      1: () => {
        onMounted(runInitialSend)
        watch(
          [
            () => ctx.props.initialMessage,
            () => ctx.env.hasConversation.value,
            () => ctx.props.onInitialMessageSent,
            () => ctx.props.extraCommands,
            () => ctx.props.canEdit,
            () => ctx.props.canSendTeamMessages,
          ],
          runInitialSend,
          { flush: 'post' },
        )
      },
      2: () => {
        onMounted(runPendingSend)
        watch(
          [
            () => ctx.props.pendingMessage,
            () => ctx.props.pendingMessageKey,
            () => ctx.props.pendingMessageSuppressUser,
            () => ctx.props.pendingMessageUserInitiated,
            () => ctx.chat.isLoading.value,
            () => ctx.props.canEdit,
          ],
          runPendingSend,
          { flush: 'post' },
        )
      },
      3: () => {
        onMounted(runDeferredSend)
        watch([() => ctx.chat.isLoading.value, () => ctx.props.canEdit], runDeferredSend, {
          flush: 'post',
        })
      },
      4: () => {
        onMounted(runUserEditCheck)
        watch(
          [() => ctx.props.userEditedFile, () => ctx.props.userEditedFileKey],
          runUserEditCheck,
          { flush: 'post' },
        )
      },
    },
  }
}
