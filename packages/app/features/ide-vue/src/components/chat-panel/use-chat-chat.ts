/**
 * `chat:chat` — the shared chat session, ported from React's `chat:chat`
 * region: `useChat` itself, the panel-level wrappers around its controls, the
 * settings PATCH URL that names the open conversation, and the loading-state
 * report to the host.
 *
 * The session is the same one every framework binding wraps
 * (`@molecule/app-vue`'s `useChat`), created here at React's region position:
 * its connect/load-history work lands when the component mounts, after the
 * earlier regions' mount effects and before the later ones, as React's hook
 * order does.
 *
 * @module
 */

import { computed, type ComputedRef, onMounted, type Ref, ref, watch } from 'vue'

import type {
  BackgroundTaskState,
  ChatAttachment,
  ChatErrorMeta,
  ChatMessage,
  ChatMode,
  ChatRetryCountdown,
  ChatSendOptions,
  ChatStreamEvent,
} from '@molecule/app-ai-chat'
import { useChat } from '@molecule/app-vue/chat'

import type { ChatCtx, ChatEffect, MutableRef, SendMessage } from './context.js'

/** What the `chat:chat` slice exposes. */
export interface ChatChatSlice {
  /** The latest committed `sendMessage`, ref-stable across provider changes. */
  readonly sendLatestMessage: SendMessage
  /** Answers a pending `ask_user` card (suppresses the optimistic user bubble). */
  readonly handleAskUserResponse: (response: string) => void
  /** The settings PATCH URL for the open conversation. */
  readonly settingsPatchUrl: () => string
  /** Filled with the debounced pending-files fetch, so git can nudge it. */
  readonly debouncedFetchPendingFilesRef: MutableRef<(() => void) | null>
  /** The mode a model change should target when none is scoped. */
  readonly liveModelMode: ComputedRef<'plan' | 'execute'>
  /** Aborts the turn AND drops this panel's pending automatic follow-ups. */
  readonly handleAbort: () => void
  /** The transcript: history plus whatever is streaming, in order. */
  readonly messages: ComputedRef<ChatMessage[]>
  /** True while this client's own send or resume streams. */
  readonly isLoading: ComputedRef<boolean>
  /** True while a backend turn streams without this client owning the request. */
  readonly isRemoteStreaming: ComputedRef<boolean>
  /** Tells the session a pushed (broadcast) chat event arrived. */
  readonly noteRemoteStreamEvent: () => void
  /** The error to show, or `null`. */
  readonly error: ComputedRef<string | null>
  /** The error's limit metadata, for its call-to-action, or `null`. */
  readonly errorMeta: ComputedRef<ChatErrorMeta | null>
  /** The current agent mode — plan (research) or execute (full access). */
  readonly mode: ComputedRef<ChatMode>
  /** Whether the conversation runs at the provider's fast/priority speed tier. */
  readonly fastMode: ComputedRef<boolean>
  /** The active background phase's label, or `null` when none is active. */
  readonly streamingStatus: ComputedRef<string | null>
  /** Commands the executor detached with `run_in_background`, newest last. */
  readonly backgroundTasks: ComputedRef<BackgroundTaskState[]>
  /** Updates the local mode state (an instant toggle, no AI turn). */
  readonly setMode: (mode: ChatMode) => void
  /** Updates the local fast-mode state (an instant toggle, no AI turn). */
  readonly setFastMode: (fastMode: boolean) => void
  /** Sends a message, streaming the reply into the transcript. */
  readonly sendMessage: (
    message: string,
    attachments?: ChatAttachment[],
    options?: ChatSendOptions,
  ) => Promise<void>
  /** Clears the conversation, on the server and locally. */
  readonly clearHistory: () => Promise<void>
  /** Edits the content of a queued (not yet sent) message. */
  readonly editQueuedMessage: (msgId: string, newContent: string) => void | Promise<void>
  /** Removes a queued (not yet sent) message from the queue. */
  readonly deleteQueuedMessage: (msgId: string) => void | Promise<void>
  /** Removes queued auto-fix messages that reference the given file path. */
  readonly clearQueuedForFile: (filePath: string) => void
  /** Ingests one pushed (broadcast) stream frame from a turn running elsewhere. */
  readonly applyRemoteEvent: (event: ChatStreamEvent) => void
  /** Reloads history and converges the local view on the server transcript. */
  readonly reconcileHistory: () => Promise<void>
  /** The active backoff-retry countdown, or `null` when none is pending. */
  readonly retryCountdown: ComputedRef<ChatRetryCountdown | null>
  /** Cancels a pending auto-retry, surfacing the original error. */
  readonly cancelRetry: () => void
  /** The conversation the panel currently reads, advanced in React's effect order. */
  readonly conversationSource: Ref<string | null>
  /**
   * Records the conversation the panel now reads, re-arming the watchers that
   * React runs after the chat session's history load.
   */
  readonly noteConversationSource: () => void
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:chat:1` — reports the loading state to the host. */
    readonly 1: ChatEffect
  }
}

/**
 * Builds the `chat:chat` slice.
 *
 * @param ctx - The panel context (the stream handler the session reports to).
 * @returns The chat slice.
 */
export function createChatChat(ctx: ChatCtx): ChatChatSlice {
  const debouncedFetchPendingFilesRef: MutableRef<(() => void) | null> = { current: null }

  /**
   * React's `onFileChangeWrapped`: re-arms auto-commit, refreshes the pending
   * files bar mid-stream, cancels a now-irrelevant auto-fix countdown, opens a
   * freshly saved plan quietly, then reports the change to the host.
   *
   * @param path - The file the agent created or modified.
   * @param content - Its new content.
   */
  const onFileChangeWrapped = (path: string, content: string): void => {
    ctx.autoCommit.dispatchAutoCommit({ type: 'reset' })
    debouncedFetchPendingFilesRef.current?.()
    const countdown = ctx.autoFix.autoFixCountdown.value
    if (countdown) {
      const norm = path.replace(/^\/workspace\//, '')
      const isRelevant = countdown.changedPaths.some(
        (p) => p.replace(/^\/workspace\//, '') === norm,
      )
      if (isRelevant) ctx.autoFix.dispatchAutoFix({ type: 'cancel' })
    }
    // Make a saved plan available as a tab, but DON'T steal focus — the plan is
    // created automatically (often while the user is watching the preview) and is
    // already streamed into the chat, so opening it quietly (no pane switch) keeps
    // the user aware without yanking them off the preview.
    const cleanPath = path.replace(/^\/workspace\//, '')
    if (cleanPath.startsWith('.agents/plans/') && ctx.props.onFileOpen) {
      ctx.props.onFileOpen(cleanPath, { focus: false })
    }
    ctx.props.onFileChange?.(path, content)
  }

  // React's `useChat` reads the endpoint as a PROP, so its history load is one
  // effect among the panel's, in hook order: after the context-usage restore
  // (declared earlier) and before the activity-card restore (declared later).
  // The session watches the prop directly (the binding's own pre watcher), and
  // `conversationSource` is the signal the LATER regions follow, so their work
  // is queued after the load rather than beside it.
  const conversationSource = ref<string | null>(ctx.env.conversationId.value)
  const chat = useChat(() => ({
    endpoint: ctx.props.endpoint,
    projectId: ctx.props.projectId,
    agentName: ctx.props.agentName,
    // A read-only viewer never issues chat POSTs (no resume/retry) — a live turn
    // is watched via pushed frames + the reconcile poll instead.
    readOnly: ctx.props.canEdit === false,
    // ALWAYS load history on mount; a persisted conversation must restore on
    // refresh, even when an initial message is also present.
    loadOnMount: true,
    onFileChange: onFileChangeWrapped,
    onConversationId: (id) => {
      ctx.props.onConversationId?.(id)
    },
    onStreamEvent: (event) => {
      ctx.stream.handleStreamEvent(event)
    },
  }))

  // The mode a model CHANGE should target when the user hasn't scoped one
  // explicitly: the LIVE conversation mode.
  const liveModelMode = computed<'plan' | 'execute'>(() =>
    chat.mode.value === 'plan' ? 'plan' : 'execute',
  )

  /**
   * Records the conversation the panel now reads, re-arming the watchers
   * registered AFTER the chat session (the activity-card restore) so their work
   * lands after the history load, as React's later effects do. Called from the
   * context-usage effect — React's earlier effect — once the panel's endpoint
   * has changed.
   */
  const noteConversationSource = (): void => {
    conversationSource.value = ctx.env.conversationId.value
  }

  const settingsPatchUrl = (): string =>
    `/projects/${ctx.props.projectId}${
      ctx.env.conversationIdRef.current
        ? `?conversationId=${encodeURIComponent(ctx.env.conversationIdRef.current)}`
        : ''
    }`

  // One stable callback that calls the latest committed sendMessage: the
  // countdown effect and the handlers below use it.
  const sendLatestMessage: SendMessage = (message, attachments, options) => {
    void chat.sendMessage(message, attachments, options)
  }
  ctx.autoFix.sendMessageRef.current = chat.sendMessage

  // User Stop. Beyond killing the stream, drop every pending automatic
  // follow-up THIS panel holds: the deferred auto-fix message and the
  // verification auto-fix countdown.
  const handleAbort = (): void => {
    ctx.autoFix.deferredPendingRef.current = null
    ctx.autoFix.deferredPendingSuppressRef.current = false
    ctx.autoFix.deferredPendingUserInitiatedRef.current = false
    ctx.autoFix.dispatchAutoFix({ type: 'reset' })
    chat.abort()
  }

  const handleAskUserResponse = (response: string): void => {
    // `askUserAnswer` resolves the pending ask_user card in the store so the
    // chosen option STAYS checked across the discovery→IDE remount, without an
    // echoed user bubble.
    sendLatestMessage(response, undefined, {
      suppressUserMessage: true,
      askUserAnswer: true,
    })
  }

  return {
    sendLatestMessage,
    handleAskUserResponse,
    settingsPatchUrl,
    debouncedFetchPendingFilesRef,
    liveModelMode,
    handleAbort,
    messages: chat.messages,
    isLoading: chat.isLoading,
    isRemoteStreaming: chat.isRemoteStreaming,
    noteRemoteStreamEvent: chat.noteRemoteStreamEvent,
    error: chat.error,
    errorMeta: chat.errorMeta,
    mode: chat.mode,
    fastMode: chat.fastMode,
    streamingStatus: chat.streamingStatus,
    backgroundTasks: chat.backgroundTasks,
    setMode: chat.setMode,
    setFastMode: chat.setFastMode,
    sendMessage: chat.sendMessage,
    clearHistory: chat.clearHistory,
    editQueuedMessage: chat.editQueuedMessage,
    deleteQueuedMessage: chat.deleteQueuedMessage,
    clearQueuedForFile: chat.clearQueuedForFile,
    applyRemoteEvent: chat.applyRemoteEvent,
    reconcileHistory: chat.reconcileHistory,
    retryCountdown: chat.retryCountdown,
    cancelRetry: chat.cancelRetry,
    conversationSource,
    noteConversationSource,
    effects: {
      1: () => {
        // Surface the chat's loading state to the host on mount and on change.
        onMounted(() => {
          ctx.props.onLoadingChange?.(chat.isLoading.value)
        })
        watch(
          () => chat.isLoading.value,
          (loading) => {
            ctx.props.onLoadingChange?.(loading)
          },
          { flush: 'post' },
        )
      },
    },
  }
}
