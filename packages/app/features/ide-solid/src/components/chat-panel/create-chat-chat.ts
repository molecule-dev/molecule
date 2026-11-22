/**
 * `chat:chat` — the shared chat session (`useChat`) and the panel-level
 * callbacks around it: the file-change wrapper, the settings PATCH URL, the
 * latest-send callback, Stop and the ask-user answer (React's `chat:chat`
 * region and its one effect, ported by unit P3).
 *
 * React's `useChat` creates the session during render and connects it in the
 * same hook; here the session is created during render too, but its connect is
 * registered at the slice's ledger position (`effects[1]`), so the
 * context-usage restore issued by an earlier effect is the first request of a
 * mount, exactly as it is in React.
 *
 * @module
 */

import type { Accessor } from 'solid-js'
import { createEffect, createMemo, createSignal, on, onCleanup, onMount, untrack } from 'solid-js'

import type {
  BackgroundTaskState,
  ChatErrorMeta,
  ChatMessage,
  ChatRetryCountdown,
  ChatSessionControls,
  ChatSessionOptions,
  ChatSessionState,
} from '@molecule/app-ai-chat'
import { createChatSession } from '@molecule/app-ai-chat'
import { useChatProvider } from '@molecule/app-solid'

import type { ChatInnerCtx, MutableRef, SendChatMessage, SliceEffects } from './context.js'

/** The chat mode the session runs in. */
export type ChatMode = 'plan' | 'execute'

/** What the rest of the panel reads from `chat:chat`. */
export interface ChatChatSlice {
  /** The transcript: history plus whatever is streaming, in order. */
  messages: Accessor<ChatMessage[]>
  /** True while this client's own send or resume streams. */
  isLoading: Accessor<boolean>
  /** True while a backend turn streams that this client does not own. */
  isRemoteStreaming: Accessor<boolean>
  /** The error to show, or null. */
  error: Accessor<string | null>
  /** The error's limit metadata, for its call-to-action. */
  errorMeta: Accessor<ChatErrorMeta | null>
  /** The current agent mode. */
  mode: Accessor<ChatMode>
  /** Whether the conversation runs at the provider's fast tier. */
  fastMode: Accessor<boolean>
  /** The transient background-phase label, or null. */
  streamingStatus: Accessor<string | null>
  /** The commands the executor detached, newest last. */
  backgroundTasks: Accessor<BackgroundTaskState[]>
  /** The active backoff-retry countdown, or null. */
  retryCountdown: Accessor<ChatRetryCountdown | null>
  /** Tells the session a pushed (broadcast) event arrived. */
  noteRemoteStreamEvent: ChatSessionControls['noteRemoteStreamEvent']
  /** Changes the agent mode. */
  setMode: ChatSessionControls['setMode']
  /** Changes the fast-tier preference. */
  setFastMode: ChatSessionControls['setFastMode']
  /** Sends a message through the session. */
  sendMessage: ChatSessionControls['sendMessage']
  /** Stops the running turn. */
  abort: ChatSessionControls['abort']
  /** Cancels a pending auto-retry. */
  cancelRetry: ChatSessionControls['cancelRetry']
  /** Clears the conversation, on the server and locally. */
  clearHistory: ChatSessionControls['clearHistory']
  /** Edits a queued message. */
  editQueuedMessage: ChatSessionControls['editQueuedMessage']
  /** Deletes a queued message. */
  deleteQueuedMessage: ChatSessionControls['deleteQueuedMessage']
  /** Drops every queued message that references a file. */
  clearQueuedForFile: ChatSessionControls['clearQueuedForFile']
  /** Applies a teammate's broadcast event to the store. */
  applyRemoteEvent: ChatSessionControls['applyRemoteEvent']
  /** Reloads history and converges the view on the server transcript. */
  reconcileHistory: ChatSessionControls['reconcileHistory']
  /** The debounced git-status refresher, filled once the git slice exists. */
  debouncedFetchPendingFilesRef: MutableRef<(() => void) | null>
  /** React's `onFileChangeWrapped`: the AI wrote a file. */
  onFileChangeWrapped: (path: string, content: string) => void
  /** The mode a model change should target when the user did not scope one. */
  liveModelMode: Accessor<'plan' | 'execute'>
  /** The settings PATCH URL, naming the open conversation. */
  settingsPatchUrl: () => string
  /** Sends through the latest committed `sendMessage`. */
  sendLatestMessage: SendChatMessage
  /** User Stop: kills the stream and every pending automatic follow-up. */
  handleAbort: () => void
  /** Sends an ask-user answer without echoing a user bubble. */
  handleAskUserResponse: (response: string) => void
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:chat`.
 * @param ctx - The inner ctx (its props, the stream handler and the auto-fix
 *   and auto-commit slices the callbacks drive).
 * @returns The chat slice.
 */
export function createChatChat(ctx: ChatInnerCtx): ChatChatSlice {
  const provider = useChatProvider()
  const debouncedFetchPendingFilesRef: MutableRef<(() => void) | null> = { current: null }

  /** React's `onFileChangeWrapped`: an AI write reached a file. */
  const onFileChangeWrapped = (path: string, content: string): void => {
    // A file changed (AI write) — restart the auto-commit countdown if armed.
    ctx.autoCommit.dispatchAutoCommit({ type: 'reset' })
    // Keep the uncommitted-files bar live DURING the turn — it must track
    // files as they stream in, not appear only once the turn ends.
    debouncedFetchPendingFilesRef.current?.()
    const countdown = ctx.autoFix.autoFixCountdown()
    if (countdown) {
      const norm = path.replace(/^\/workspace\//, '')
      const isRelevant = countdown.changedPaths.some(
        (changed) => changed.replace(/^\/workspace\//, '') === norm,
      )
      if (isRelevant) ctx.autoFix.dispatchAutoFix({ type: 'cancel' })
    }
    // Make a saved plan available as a tab, but DON'T steal focus — the plan is
    // created automatically and already streamed into the chat, so opening it
    // quietly keeps the user aware without yanking them off the preview.
    const cleanPath = path.replace(/^\/workspace\//, '')
    if (cleanPath.startsWith('.agents/plans/') && ctx.props.onFileOpen) {
      ctx.props.onFileOpen(cleanPath, { focus: false })
    }
    ctx.props.onFileChange?.(path, content)
  }

  /** The latest options, as React hands them to its session on every commit. */
  const sessionOptions = (): ChatSessionOptions => ({
    endpoint: ctx.props.endpoint,
    projectId: ctx.props.projectId,
    agentName: ctx.props.agentName,
    // A read-only viewer never issues chat POSTs (no resume/retry) — a live turn
    // is watched via pushed frames + the reconcile poll instead.
    readOnly: ctx.props.canEdit === false,
    // ALWAYS load history on mount: a persisted conversation must restore on
    // refresh even when an initialMessage / initialInputValue is also present.
    loadOnMount: true,
    onFileChange: onFileChangeWrapped,
    onConversationId: ctx.props.onConversationId,
    onStreamEvent: ctx.stream.handleStreamEvent,
  })

  const session = createChatSession({ ...untrack(sessionOptions), provider })
  const initialState = session.getState()
  const [state, setState] = createSignal<ChatSessionState>(initialState)
  // `isLoading` as its own signal, written only when the boolean flips. The
  // store emits on every streaming flush; React's effects depend on the VALUE,
  // so they must not re-run (and Solid must not reorder them) on each flush.
  const [isLoading, setIsLoading] = createSignal<boolean>(initialState.isLoading)
  // The transcript array as its own signal, written only when the ARRAY changes
  // (the store emits on every flush, including ones that leave the transcript
  // untouched). React's `useMemo`s key on the array identity, so a derived view
  // must not recompute — and re-run a custom card factory — on a same-array
  // notification.
  const [messages, setMessages] = createSignal<ChatMessage[]>(initialState.messages)
  // React's `useSyncExternalStore` delivers a store notification inside the
  // current event's batch: its re-render and the effects it drives run after
  // the synchronous work that caused the change (e.g. the git-status refresh
  // effect runs AFTER `sendMessage` issued its POST). Solid notifies
  // subscribers synchronously, which would run those effects in the middle of
  // `sendMessage` and issue the git-status GET first. One queued microtask per
  // batch restores React's order; repeated notifications in one turn coalesce
  // into a single read, as React's batching does.
  const deliver = (): void => {
    const next = session.getState()
    setState(next)
    if (messages() !== next.messages) setMessages(next.messages)
    if (isLoading() !== next.isLoading) setIsLoading(next.isLoading)
  }
  let deliveryScheduled = false
  const scheduleDelivery = (): void => {
    if (deliveryScheduled) return
    deliveryScheduled = true
    queueMicrotask(() => {
      if (!deliveryScheduled) return
      deliveryScheduled = false
      deliver()
    })
  }
  onCleanup(session.subscribe(scheduleDelivery))

  /**
   * Applies a teammate's broadcast frame and delivers the resulting state now:
   * React renders a synchronous external-store update outside an event batch,
   * so a caller reading the DOM right after the push must see it.
   * @param event - The pushed stream frame.
   */
  const applyRemoteEvent: ChatSessionControls['applyRemoteEvent'] = (event) => {
    session.controls.applyRemoteEvent(event)
    if (deliveryScheduled) {
      deliveryScheduled = false
      deliver()
    }
  }

  // React's `useCommittedRef(sendMessageRef, sendMessage)`: the countdown effect
  // reaches the latest send through the auto-fix slice's ref.
  ctx.autoFix.sendMessageRef.current = session.controls.sendMessage

  const sendLatestMessage: SendChatMessage = (message, attachments, options) =>
    session.controls.sendMessage(message, attachments, options)

  /** The mode a model CHANGE should target when the user hasn't scoped one. */
  const liveModelMode = createMemo<'plan' | 'execute'>(() =>
    state().mode === 'plan' ? 'plan' : 'execute',
  )

  /** Target for a settings PATCH, naming the OPEN conversation. */
  const settingsPatchUrl = (): string =>
    `/projects/${ctx.props.projectId}${
      ctx.env.conversationIdRef.current
        ? `?conversationId=${encodeURIComponent(ctx.env.conversationIdRef.current)}`
        : ''
    }`

  /**
   * User Stop. A stop is a user decision the platform must not overrule — so
   * beyond killing the stream, drop every pending automatic follow-up THIS
   * panel holds: the deferred auto-fix message and the verification auto-fix
   * countdown. Without this, the deferred-send effect fired the moment the Stop
   * flipped isLoading off — restarting the executor seconds after the user
   * explicitly stopped it.
   */
  const handleAbort = (): void => {
    ctx.autoFix.deferredPendingRef.current = null
    ctx.autoFix.deferredPendingSuppressRef.current = false
    ctx.autoFix.deferredPendingUserInitiatedRef.current = false
    ctx.autoFix.dispatchAutoFix({ type: 'reset' })
    session.controls.abort()
  }

  return {
    messages,
    isLoading,
    isRemoteStreaming: () => state().isRemoteStreaming,
    error: () => state().error,
    errorMeta: () => state().errorMeta,
    mode: () => state().mode,
    fastMode: () => state().fastMode,
    streamingStatus: () => state().streamingStatus,
    backgroundTasks: () => state().backgroundTasks,
    retryCountdown: () => state().retryCountdown,
    noteRemoteStreamEvent: session.controls.noteRemoteStreamEvent,
    setMode: session.controls.setMode,
    setFastMode: session.controls.setFastMode,
    sendMessage: session.controls.sendMessage,
    abort: session.controls.abort,
    cancelRetry: session.controls.cancelRetry,
    clearHistory: session.controls.clearHistory,
    editQueuedMessage: session.controls.editQueuedMessage,
    deleteQueuedMessage: session.controls.deleteQueuedMessage,
    clearQueuedForFile: session.controls.clearQueuedForFile,
    applyRemoteEvent,
    reconcileHistory: session.controls.reconcileHistory,
    debouncedFetchPendingFilesRef,
    onFileChangeWrapped,
    liveModelMode,
    settingsPatchUrl,
    sendLatestMessage,
    handleAbort,
    // The answer is reflected in the ask_user card itself (a checkmark on the
    // chosen option, or the custom text shown in-card), never echoed as a
    // separate message below it.
    handleAskUserResponse: (response) => {
      session.controls.sendMessage(response, undefined, {
        suppressUserMessage: true,
        askUserAnswer: true,
      })
    },
    effects: {
      // #effect chat:chat:1
      1: () => {
        // React's `useChat` reaches the session with the latest options after
        // every commit (its dependency-less effect); defer skips the mount run
        // React also makes — with option values that are already the session's.
        createEffect(
          on(
            () => [
              ctx.props.endpoint,
              ctx.props.projectId,
              ctx.props.agentName,
              ctx.props.canEdit,
              ctx.props.onConversationId,
            ],
            () => session.update({ ...sessionOptions(), provider }),
            { defer: true },
          ),
        )
        // React's `useEffect(() => session.connect(), [session])`: the mounted
        // view's lifecycle wiring and the mount-time history load.
        onMount(() => {
          const disconnect = session.connect()
          onCleanup(disconnect)
        })
        // Surface the chat's loading state to the host (the authoritative
        // "agent is actively building" signal, which drives the preview's
        // building overlay).
        // React's dependency is the VALUE of `isLoading`: the store emits on
        // every flush with the same loading value, and the host must hear each
        // change once, not once per flush.
        let previous: boolean | undefined
        createEffect(() => {
          const loading = isLoading()
          if (previous === loading) return
          previous = loading
          ctx.props.onLoadingChange?.(loading)
        })
      },
    },
  }
}
