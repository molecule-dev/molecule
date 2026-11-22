/**
 * React's `chat:auto-send` regions of ChatPanel.tsx (lines 2199–2201 and
 * 2513–2647): the sends a host or the platform starts without the user pressing
 * send — the `initialMessage` a mount auto-sends, the host's `pendingMessage`
 * dispatched by a key change (sent at once, or deferred while a turn streams),
 * the deferred message sent once the turn ends, and the queued auto-fix drop
 * that follows the user editing a relevant file.
 *
 * Each React `useEffect` runs once at mount and again when its dependencies
 * change. Angular runs each effect's mount work on the effect's own first run,
 * registered at its ledger position, so an initial or pending send lands in
 * React's order relative to the other regions' mount work (the history load,
 * the model catalog, the files list). Each body guards itself through a plain
 * ref, exactly as React's does, so a run React's dependency list would trigger
 * sends nothing twice.
 *
 * @module
 */

import { inject, Injectable, Injector } from '@angular/core'

import { COMMANDS, matchesSideChannelCommand } from '@molecule/app-ide-panel-logic/panels'

import { ChatAutoFix } from './chat-auto-fix.slice.js'
import { ChatChat } from './chat-chat.slice.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import { ChatSystemCards } from './chat-system-cards.slice.js'

/** The identifiers other slices and sections read from the `chat:auto-send` slice. */
export interface ChatAutoSendSlice {
  /** React's mount I/O for the region: every effect's first run, in React's order. */
  mount(): void

  /** React's `#effect chat:auto-send:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void; 3: () => void; 4: () => void }
}

/** React's `chat:auto-send` slice: the initial, pending, deferred and edit-triggered sends. */
@Injectable()
export class ChatAutoSend implements ChatAutoSendSlice {
  /** The shared state, read for the props and the env at call time. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the update effects in. */
  private readonly injector = inject(Injector)

  /** The message the initial send already dispatched (or consumed), so it never retries. */
  private readonly sentInitialRef: { current: string | null } = { current: null }

  /** The pending-message key the last dispatch read, so the same key sends once. */
  private readonly lastPendingKeyRef: { current: number | undefined } = { current: undefined }

  /** The user-edit key the last check read, so one edit reaches the queue once. */
  private readonly lastUserEditKeyRef: { current: number | undefined } = { current: undefined }

  /**
   * React's mount I/O for the region: each effect's first run happens inside
   * the effect itself, at its own ledger position, so the initial send lands in
   * React's order relative to the other regions' mount work.
   */
  mount(): void {
    // The effects' first runs perform the region's mount work; nothing mounts here.
  }

  /** React's `#effect chat:auto-send:<n>` entries, with React's first-run semantics. */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, () => this.runInitialSend())
    },
    2: (): void => {
      registerChatEffect(this.injector, (skip) => this.runPendingSend(skip))
    },
    3: (): void => {
      registerChatEffect(this.injector, (skip) => this.runDeferredSend(skip))
    },
    4: (): void => {
      registerChatEffect(this.injector, (skip) => this.runUserEditCheck(skip))
    },
  }

  /**
   * Sends the initial message once: skipped when a conversation already exists,
   * when the viewer is read-only (the ref is consumed so it never retries), and
   * when this exact message already went out.
   */
  private runInitialSend(): void {
    const props = this.state.props()
    const initialMessage = props.initialMessage
    const hasConversation = this.state.env.hasConversation()
    const canEdit = props.canEdit
    const canSendTeamMessages = props.canSendTeamMessages
    const extraCommands = props.extraCommands
    if (!initialMessage || hasConversation) return
    // A read-only VIEWER never auto-sends the initial prompt: the host sources
    // it from PROJECT-keyed localStorage, which survives a role demotion and a
    // shared browser — a stale entry would auto-POST an agent turn the server
    // 403s, surfacing a spurious red error on mount. Consume the ref so it is
    // never retried either.
    if (canEdit === false) {
      this.sentInitialRef.current = initialMessage
      return
    }
    if (this.sentInitialRef.current === initialMessage) return
    this.sentInitialRef.current = initialMessage
    if (this.state.slice(ChatSystemCards).blockDisabledTeamMessage(initialMessage)) {
      props.onInitialMessageSent?.()
      return
    }
    const sideChannel =
      canSendTeamMessages !== false &&
      matchesSideChannelCommand(
        extraCommands?.length ? [...COMMANDS, ...extraCommands] : COMMANDS,
        initialMessage,
      )
    void this.state
      .slice(ChatChat)
      .sendMessage(
        initialMessage,
        undefined,
        sideChannel ? { suppressUserMessage: true } : undefined,
      )
    props.onInitialMessageSent?.()
  }

  /**
   * Dispatches the host's pending message: immediately when the agent is idle,
   * deferred while a turn streams, and never for a read-only viewer (the key is
   * still consumed so it does not retry).
   *
   * @param skip - Whether this is the registered effect's first run, where
   *   React's `useRef(pendingMessageKey)` seeds the key from this render — so
   *   the key compares equal and nothing is sent.
   */
  private runPendingSend(skip: boolean): void {
    const props = this.state.props()
    const pendingMessage = props.pendingMessage
    const pendingMessageKey = props.pendingMessageKey
    const pendingMessageSuppressUser = props.pendingMessageSuppressUser
    const pendingMessageUserInitiated = props.pendingMessageUserInitiated
    const isLoading = this.state.slice(ChatChat).isLoading()
    const canEdit = props.canEdit
    if (skip) {
      // React's `useRef(pendingMessageKey)` initializer, read by the first run.
      this.lastPendingKeyRef.current = pendingMessageKey
      return
    }
    if (!pendingMessage || pendingMessageKey === undefined) return
    // A read-only VIEWER never dispatches platform-composed sends (build
    // kickoffs, auto-fixes, preview-failure reports): the server 403s them
    // and the denial used to surface as a red error in the viewer's chat.
    // Consume the key so the same message isn't retried.
    if (canEdit === false) {
      this.lastPendingKeyRef.current = pendingMessageKey
      return
    }
    if (pendingMessageKey === this.lastPendingKeyRef.current) return
    this.lastPendingKeyRef.current = pendingMessageKey
    const autoFix = this.state.slice(ChatAutoFix)
    if (this.state.slice(ChatSystemCards).blockDisabledTeamMessage(pendingMessage)) return
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
      ...(pendingMessageSuppressUser ? { suppressUserMessage: true } : {}),
      automatic: true,
      ...(pendingMessageUserInitiated ? { userInitiated: true } : {}),
    }
    if (isLoading) {
      // AI is busy — defer until streaming ends
      autoFix.deferredPendingRef.current = pendingMessage
      autoFix.deferredPendingSuppressRef.current = !!pendingMessageSuppressUser
      autoFix.deferredPendingUserInitiatedRef.current = !!pendingMessageUserInitiated
    } else {
      autoFix.deferredPendingRef.current = null
      void this.state.slice(ChatChat).sendMessage(pendingMessage, undefined, sendOpts)
    }
  }

  /**
   * Sends the deferred pending message once streaming ends. (A user Stop also
   * ends streaming, but `handleAbort` drops the deferred message first — and
   * useChat's stop guard would drop an autonomous automatic send anyway — so a
   * stopped turn is never auto-resumed by a fix that queued up mid-stream.)
   *
   * @param skip - Whether this is the registered effect's first run; React's
   *   first run finds no deferred message, so this one does nothing either.
   */
  private runDeferredSend(skip: boolean): void {
    const isLoading = this.state.slice(ChatChat).isLoading()
    const canEdit = this.state.props().canEdit
    if (skip) return
    const autoFix = this.state.slice(ChatAutoFix)
    if (!isLoading && autoFix.deferredPendingRef.current) {
      const msg = autoFix.deferredPendingRef.current
      const suppress = autoFix.deferredPendingSuppressRef.current
      const userInitiated = autoFix.deferredPendingUserInitiatedRef.current
      autoFix.deferredPendingRef.current = null
      autoFix.deferredPendingSuppressRef.current = false
      autoFix.deferredPendingUserInitiatedRef.current = false
      // A viewer never dispatches platform-composed sends (same as the
      // immediate path above) — the refs are already drained, so it just drops.
      if (canEdit === false || this.state.slice(ChatSystemCards).blockDisabledTeamMessage(msg)) {
        return
      }
      // Same rule as the immediate path: a deferred pending message is system-composed —
      // always `automatic` (suppressed or visible), never a plain user bubble.
      void this.state.slice(ChatChat).sendMessage(msg, undefined, {
        ...(suppress ? { suppressUserMessage: true } : {}),
        automatic: true,
        ...(userInitiated ? { userInitiated: true } : {}),
      })
    }
  }

  /**
   * Drops the queued auto-fix messages that reference the file the user just
   * edited, once per edit key.
   *
   * @param skip - Whether this is the registered effect's first run, where
   *   React's `useRef(userEditedFileKey)` seeds the key from this render — so
   *   the key compares equal and nothing is dropped.
   */
  private runUserEditCheck(skip: boolean): void {
    const props = this.state.props()
    const userEditedFile = props.userEditedFile
    const userEditedFileKey = props.userEditedFileKey
    if (skip) {
      // React's `useRef(userEditedFileKey)` initializer, read by the first run.
      this.lastUserEditKeyRef.current = userEditedFileKey
      return
    }
    if (
      userEditedFile &&
      userEditedFileKey !== undefined &&
      userEditedFileKey !== this.lastUserEditKeyRef.current
    ) {
      this.lastUserEditKeyRef.current = userEditedFileKey
      this.state.slice(ChatChat).clearQueuedForFile(userEditedFile)
    }
  }
}
