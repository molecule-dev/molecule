/**
 * React's `chat:chat` region of ChatPanel.tsx (lines 819–970): the shared chat
 * session (history load on mount, the send/abort/queue controls, the mode), the
 * file-change wrapper that keeps the uncommitted-files bar and the auto-fix
 * countdown in step, the settings URL and the stop/ask-user handlers, and the
 * effect that reports the loading state to the host.
 *
 * The session comes from the Svelte binding's `useChat`, which wraps the same
 * `@molecule/app-ai-chat` session React's hook creates and connects it at
 * React's position: this slice is built where React calls `useChat`, so its
 * connect effect runs after the context-usage restore and before the models
 * restore, as in React. The options are a store so a changed endpoint (a
 * host-controlled conversation switch, no remount) reaches the session the way
 * React's per-commit `session.update` does.
 *
 * @module
 */

import { untrack } from 'svelte'
import { fromStore, writable } from 'svelte/store'

import type {
  BackgroundTaskState,
  ChatErrorMeta,
  ChatMessage,
  ChatMode,
  ChatRetryCountdown,
  ChatSessionControls,
  ChatStreamEvent,
} from '@molecule/app-ai-chat'
import { useChat, type UseChatOptions } from '@molecule/app-svelte'

import type { ChatContext, ChatSendMessage, MutableRef } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:chat` slice. */
export interface ChatChatSlice {
  /** The transcript: history plus whatever is streaming, in order. */
  readonly messages: ChatMessage[]
  /** True while this client's own send or resume streams. */
  readonly isLoading: boolean
  /** True while a backend turn streams that this client does not own. */
  readonly isRemoteStreaming: boolean
  /** The error to show, or null. */
  readonly error: string | null
  /** The error's limit metadata, for its call-to-action. */
  readonly errorMeta: ChatErrorMeta | null
  /** The current agent mode. */
  readonly mode: ChatMode
  /** Whether the conversation runs at the provider's fast tier. */
  readonly fastMode: boolean
  /** The transient background-phase label, or null. */
  readonly streamingStatus: string | null
  /** The commands the executor detached, newest last. */
  readonly backgroundTasks: BackgroundTaskState[]
  /** The active backoff-retry countdown, or null. */
  readonly retryCountdown: ChatRetryCountdown | null
  /** Tells the session a pushed (broadcast) event arrived. */
  readonly noteRemoteStreamEvent: ChatSessionControls['noteRemoteStreamEvent']
  /** Changes the agent mode. */
  readonly setMode: ChatSessionControls['setMode']
  /** Changes the fast-tier preference. */
  readonly setFastMode: ChatSessionControls['setFastMode']
  /** Sends a message through the session. */
  readonly sendMessage: ChatSessionControls['sendMessage']
  /** Cancels a pending auto-retry. */
  readonly cancelRetry: ChatSessionControls['cancelRetry']
  /** Clears the conversation, on the server and locally. */
  readonly clearHistory: ChatSessionControls['clearHistory']
  /** Edits a queued message. */
  readonly editQueuedMessage: ChatSessionControls['editQueuedMessage']
  /** Deletes a queued message. */
  readonly deleteQueuedMessage: ChatSessionControls['deleteQueuedMessage']
  /** Drops every queued message that references a file. */
  readonly clearQueuedForFile: ChatSessionControls['clearQueuedForFile']
  /** Applies a teammate's broadcast event to the store. */
  readonly applyRemoteEvent: ChatSessionControls['applyRemoteEvent']
  /** Reloads history and converges the view on the server transcript. */
  readonly reconcileHistory: ChatSessionControls['reconcileHistory']
  /** The debounced git-status refresher, filled once the git slice exists. */
  readonly debouncedFetchPendingFilesRef: MutableRef<(() => void) | null>
  /** The mode a model change should target when the user did not scope one. */
  readonly liveModelMode: ChatMode
  /** The settings PATCH URL, naming the open conversation. */
  readonly settingsPatchUrl: () => string
  /** Sends through the latest committed `sendMessage`. */
  readonly sendLatestMessage: ChatSendMessage
  /** User Stop: kills the stream and every pending automatic follow-up. */
  readonly handleAbort: () => void
  /** Sends an ask-user answer without echoing a user bubble. */
  readonly handleAskUserResponse: (response: string) => void

  /** React's mount I/O for the region: none — `useChat` is created above. */
  mount(): void

  /** React's `#effect chat:chat:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }
}

/**
 * Creates the `chat:chat` slice.
 *
 * @param ctx - The shared chat context.
 * @returns The session's state and controls, the wrappers and effect 1.
 */
export function createChatChat(ctx: ChatContext): ChatChatSlice {
  // Filled once the git slice exists (it is created right after this one), with
  // a stable callback that refreshes the uncommitted-files bar; lets the
  // file-change callback refresh it LIVE while a turn is still streaming.
  const debouncedFetchPendingFilesRef: MutableRef<(() => void) | null> = { current: null }

  /**
   * The session's pushed/broadcast handler, read from the stream slice at call
   * time so a stream slice built later is still reached.
   *
   * @param event - The pushed stream event.
   */
  const onStreamEvent = (event: ChatStreamEvent): void => {
    ctx.stream.handleStreamEvent(event)
  }

  /**
   * Forwards a server-assigned conversation id to the host.
   *
   * @param id - The conversation's id.
   */
  const onConversationId = (id: string): void => {
    ctx.props.onConversationId?.(id)
  }

  /**
   * React's `onFileChangeWrapped`: restarts the auto-commit countdown, keeps the
   * uncommitted-files bar live mid-turn and opens a saved plan without stealing
   * focus.
   *
   * @param path - The path of the file the AI wrote.
   * @param content - The file's new content.
   */
  const onFileChangeWrapped = (path: string, content: string): void => {
    // A file changed (AI write) — restart the auto-commit countdown if armed.
    ctx.autoCommit.dispatchAutoCommit({ type: 'reset' })
    // Keep the uncommitted-files bar live DURING the turn — it must track files
    // as they stream in, not appear only once the turn ends.
    ctx.chat.debouncedFetchPendingFilesRef.current?.()
    const autoFixCountdown = ctx.autoFix.autoFixCountdown
    if (autoFixCountdown) {
      const norm = path.replace(/^\/workspace\//, '')
      const isRelevant = autoFixCountdown.changedPaths.some(
        (p) => p.replace(/^\/workspace\//, '') === norm,
      )
      if (isRelevant) ctx.autoFix.dispatchAutoFix({ type: 'cancel' })
    }
    // Make a saved plan available as a tab, but DON'T steal focus — the plan is
    // created automatically and already streamed into the chat.
    const cleanPath = path.replace(/^\/workspace\//, '')
    if (cleanPath.startsWith('.agents/plans/') && ctx.props.onFileOpen) {
      ctx.props.onFileOpen(cleanPath, { focus: false })
    }
    ctx.props.onFileChange?.(path, content)
  }

  // The session options as React passes them on its first render. A store so a
  // changed endpoint or project reaches the session the way React's per-commit
  // `session.update` does (a controlled conversation switch does not remount).
  const options = writable<UseChatOptions>({
    endpoint: ctx.props.endpoint,
    projectId: ctx.props.projectId,
    agentName: ctx.agentName,
    readOnly: ctx.props.canEdit === false,
    loadOnMount: true,
    onFileChange: onFileChangeWrapped,
    onConversationId,
    onStreamEvent,
  })
  $effect(() => {
    options.set({
      endpoint: ctx.props.endpoint,
      projectId: ctx.props.projectId,
      agentName: ctx.agentName,
      readOnly: ctx.props.canEdit === false,
      loadOnMount: true,
      onFileChange: onFileChangeWrapped,
      onConversationId,
      onStreamEvent,
    })
  })

  const chat = useChat(options)
  const messages = fromStore(chat.messages)
  const isLoading = fromStore(chat.isLoading)
  const isRemoteStreaming = fromStore(chat.isRemoteStreaming)
  const error = fromStore(chat.error)
  const errorMeta = fromStore(chat.errorMeta)
  const mode = fromStore(chat.mode)
  const fastMode = fromStore(chat.fastMode)
  const streamingStatus = fromStore(chat.streamingStatus)
  const backgroundTasks = fromStore(chat.backgroundTasks)
  const retryCountdown = fromStore(chat.retryCountdown)

  /**
   * Sends through the session's `sendMessage`; one stable callback for the
   * countdown and every handler (React's `useStableCallback(sendMessage)`).
   *
   * @param message - The message text.
   * @param attachments - Files that ride the message.
   * @param sendOptions - Suppression / automatic / ask-user flags.
   * @returns A promise resolved when the send is queued.
   */
  const sendLatestMessage: ChatSendMessage = (message, attachments, sendOptions) =>
    chat.sendMessage(message, attachments, sendOptions)

  // The countdown effect sends through this ref, filled once here.
  ctx.autoFix.sendMessageRef.current = chat.sendMessage

  return {
    get messages() {
      return messages.current
    },
    get isLoading(): boolean {
      return isLoading.current
    },
    get isRemoteStreaming(): boolean {
      return isRemoteStreaming.current
    },
    get error(): string | null {
      return error.current
    },
    get errorMeta() {
      return errorMeta.current
    },
    get mode() {
      return mode.current
    },
    get fastMode(): boolean {
      return fastMode.current
    },
    get streamingStatus(): string | null {
      return streamingStatus.current
    },
    get backgroundTasks() {
      return backgroundTasks.current
    },
    get retryCountdown() {
      return retryCountdown.current
    },
    noteRemoteStreamEvent(): void {
      chat.noteRemoteStreamEvent()
    },
    setMode(nextMode): void {
      chat.setMode(nextMode)
    },
    setFastMode(value: boolean): void {
      chat.setFastMode(value)
    },
    sendMessage(message, attachments, sendOptions): Promise<void> {
      return chat.sendMessage(message, attachments, sendOptions)
    },
    cancelRetry(): void {
      chat.cancelRetry()
    },
    clearHistory(): Promise<void> {
      return chat.clearHistory()
    },
    editQueuedMessage(msgId: string, newContent: string): void | Promise<void> {
      return chat.editQueuedMessage(msgId, newContent)
    },
    deleteQueuedMessage(msgId: string): void | Promise<void> {
      return chat.deleteQueuedMessage(msgId)
    },
    clearQueuedForFile(filePath: string): void {
      chat.clearQueuedForFile(filePath)
    },
    applyRemoteEvent(event: ChatStreamEvent): void {
      chat.applyRemoteEvent(event)
    },
    reconcileHistory(): Promise<void> {
      return chat.reconcileHistory()
    },
    debouncedFetchPendingFilesRef,
    get liveModelMode() {
      // Discovery runs in plan mode, so it maps to 'plan': changing the model
      // while discovering/planning changes the plan model.
      return mode.current === 'plan' ? 'plan' : 'execute'
    },
    settingsPatchUrl(): string {
      // Name the OPEN conversation so the server's shared setting card lands in
      // the transcript members are actually watching.
      const conversationId = ctx.env.conversationIdRef.current
      return `/projects/${ctx.props.projectId}${
        conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : ''
      }`
    },
    sendLatestMessage,
    handleAbort(): void {
      // A stop is a user decision the platform must not overrule — beyond
      // killing the stream, drop every pending automatic follow-up this panel
      // holds: the deferred auto-fix message and the verification countdown.
      ctx.autoFix.deferredPendingRef.current = null
      ctx.autoFix.deferredPendingSuppressRef.current = false
      ctx.autoFix.deferredPendingUserInitiatedRef.current = false
      ctx.autoFix.dispatchAutoFix({ type: 'reset' })
      chat.abort()
    },
    handleAskUserResponse(response: string): void {
      // The answer is reflected in the ask_user card itself rather than echoed
      // as a separate user message below it.
      void sendLatestMessage(response, undefined, {
        suppressUserMessage: true,
        askUserAnswer: true,
      })
    },
    mount(): void {
      // React's region reads its state and creates the session during render;
      // there is no additional mount I/O.
    },
    effects: {
      1: (): void => {
        $effect(() => {
          // Surface the chat's loading state to the host (the authoritative
          // "agent is actively building" signal). The callback is React's
          // `useEffectEvent`: read fresh, never a dependency.
          const loading = isLoading.current
          untrack(() => ctx.props.onLoadingChange?.(loading))
        })
      },
    },
  }
}
