/**
 * React's `chat:chat` region of ChatPanel.tsx (lines 820–971): the shared chat
 * session (`useChat` and the panel-level use of its controls), the file-change
 * wrapper that re-arms auto-commit and refreshes the pending-files bar, the
 * settings PATCH URL that names the open conversation, Stop's cleanup of the
 * panel's deferred follow-ups, and the loading-state report to the host
 * (`#effect chat:chat:1`).
 *
 * The session itself is the shared, framework-neutral one from
 * `@molecule/app-ai-chat` (`createChatSession`) — the same object React's and
 * every binding's `useChat` wraps; this slice wires it for Angular. It is
 * created at construction and connected on the first run of the registered
 * `chat:chat` connect effect, which is React's mount position: React's
 * `useChat` connects in an effect declared in this region, so the history load
 * lands after the earlier regions' mount effects and before the model catalog's
 * fetch. A props change updates the session, the way React's re-render reaches
 * `useChat`.
 *
 * @module
 */

import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  Injector,
  signal,
  untracked,
} from '@angular/core'

import type {
  BackgroundTaskState,
  ChatErrorMeta,
  ChatMessage,
  ChatMode,
  ChatRetryCountdown,
  ChatSessionControls,
  ChatSessionOptions,
  ChatSessionState,
} from '@molecule/app-ai-chat'
import { createChatSession } from '@molecule/app-ai-chat'
import { useChatProvider } from '@molecule/app-angular/chat'

import { ChatAutoCommit } from './chat-auto-commit.slice.js'
import { ChatAutoFix } from './chat-auto-fix.slice.js'
import {
  ChatInnerState,
  type ChatSendMessage,
  isInsideChatEffect,
  registerChatEffect,
} from './chat-inner-state.js'
import { ChatStream } from './chat-stream.slice.js'

/** The identifiers other slices and sections read from the `chat:chat` slice. */
export interface ChatChatSlice {
  /** React's mount I/O for the region (its history load runs on the first effect run). */
  mount(): void

  /** React's `#effect chat:chat:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }

  /** The transcript: history plus whatever is streaming, in order. */
  readonly messages: () => ChatMessage[]
  /** True while this client's own send or resume streams. */
  readonly isLoading: () => boolean
  /** True while a backend turn for this conversation streams without this client owning it. */
  readonly isRemoteStreaming: () => boolean
  /** Tells the session a pushed (broadcast) chat event arrived for this conversation. */
  readonly noteRemoteStreamEvent: ChatSessionControls['noteRemoteStreamEvent']
  /** The error to show, or `null`. */
  readonly error: () => string | null
  /** The error's limit metadata, for its call-to-action. */
  readonly errorMeta: () => ChatErrorMeta | null
  /** The current agent mode — plan or execute. */
  readonly mode: () => ChatMode
  /** Whether the conversation runs at the provider's fast/priority speed tier. */
  readonly fastMode: () => boolean
  /** The transient background-phase label, or `null`. */
  readonly streamingStatus: () => string | null
  /** Commands the executor detached with `run_in_background`, newest last. */
  readonly backgroundTasks: () => BackgroundTaskState[]
  /** Updates the local mode state. */
  readonly setMode: ChatSessionControls['setMode']
  /** Updates the local fast-mode state. */
  readonly setFastMode: ChatSessionControls['setFastMode']
  /** Sends a message, streaming the reply into the transcript. */
  readonly sendMessage: ChatSessionControls['sendMessage']
  /** Clears the conversation, on the server and locally. */
  readonly clearHistory: ChatSessionControls['clearHistory']
  /** Edits the content of a queued message. */
  readonly editQueuedMessage: ChatSessionControls['editQueuedMessage']
  /** Removes a queued message from the queue. */
  readonly deleteQueuedMessage: ChatSessionControls['deleteQueuedMessage']
  /** Removes queued auto-fix messages that reference the given file path. */
  readonly clearQueuedForFile: ChatSessionControls['clearQueuedForFile']
  /** Ingests one pushed (broadcast) stream frame into the message store. */
  readonly applyRemoteEvent: ChatSessionControls['applyRemoteEvent']
  /** Reloads history and converges the local view on the server transcript. */
  readonly reconcileHistory: ChatSessionControls['reconcileHistory']
  /** The active backoff-retry countdown, or `null`. */
  readonly retryCountdown: () => ChatRetryCountdown | null
  /** Cancels a pending auto-retry. */
  readonly cancelRetry: ChatSessionControls['cancelRetry']
  /** The mode a model change should target when none is scoped. */
  readonly liveModelMode: () => 'plan' | 'execute'
  /** The settings PATCH URL for the open conversation. */
  readonly settingsPatchUrl: () => string
  /** The latest committed `sendMessage`, stable across provider changes. */
  readonly sendLatestMessage: ChatSendMessage
  /** Aborts the turn AND drops this panel's pending automatic follow-ups. */
  readonly handleAbort: () => void
  /** Answers a pending `ask_user` card. */
  readonly handleAskUserResponse: (response: string) => void
  /** Filled with the debounced pending-files fetch, so git can nudge it. */
  readonly debouncedFetchPendingFilesRef: { current: (() => void) | null }
}

/** React's `chat:chat` slice: the shared session and its panel-level wrappers. */
@Injectable()
export class ChatChat implements ChatChatSlice {
  /** The shared state, read for the current props and the env. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the region's effects in. */
  private readonly injector = inject(Injector)

  /** Disconnects the session when the panel unmounts. */
  private readonly destroyRef = inject(DestroyRef)

  /** The bonded chat provider the session loads history and sends through. */
  private readonly provider = useChatProvider()

  /** The shared chat session (the same one every framework binding wraps). */
  private readonly session = createChatSession({
    ...this.readOptions(),
    provider: this.provider,
  })

  /** The session's current state, refreshed on every notification. */
  private readonly sessionState = signal<ChatSessionState>(this.session.getState())

  /** The session subscription, released with the panel. */
  private unsubscribeSession: () => void = () => {}

  /** The active session connection, ended with the panel (React's cleanup). */
  private disconnectSession: (() => void) | null = null

  /** The transcript: history plus whatever is streaming, in order. */
  readonly messages = computed(() => this.sessionState().messages)

  /** True while this client's own send or resume streams. */
  readonly isLoading = computed(() => this.sessionState().isLoading)

  /** True while a backend turn streams without this client owning it. */
  readonly isRemoteStreaming = computed(() => this.sessionState().isRemoteStreaming)

  /** The error to show, or `null`. */
  readonly error = computed(() => this.sessionState().error)

  /** The error's limit metadata, for its call-to-action. */
  readonly errorMeta = computed(() => this.sessionState().errorMeta)

  /** The current agent mode — plan or execute. */
  readonly mode = computed(() => this.sessionState().mode)

  /** Whether the conversation runs at the provider's fast/priority speed tier. */
  readonly fastMode = computed(() => this.sessionState().fastMode)

  /** The transient background-phase label, or `null`. */
  readonly streamingStatus = computed(() => this.sessionState().streamingStatus)

  /** Commands the executor detached with `run_in_background`, newest last. */
  readonly backgroundTasks = computed(() => this.sessionState().backgroundTasks)

  /** The active backoff-retry countdown, or `null`. */
  readonly retryCountdown = computed(() => this.sessionState().retryCountdown)

  /** The mode a model change should target (`mode === 'plan' ? 'plan' : 'execute'`). */
  readonly liveModelMode = computed<'plan' | 'execute'>(() =>
    this.mode() === 'plan' ? 'plan' : 'execute',
  )

  /** Filled with the debounced pending-files fetch, so git can nudge it (React's ref). */
  readonly debouncedFetchPendingFilesRef: { current: (() => void) | null } = { current: null }

  /** Tells the session a pushed (broadcast) chat event arrived. */
  readonly noteRemoteStreamEvent: ChatSessionControls['noteRemoteStreamEvent'] = () =>
    this.session.controls.noteRemoteStreamEvent()

  /** Updates the local mode state. */
  readonly setMode: ChatSessionControls['setMode'] = (mode) => this.session.controls.setMode(mode)

  /** Updates the local fast-mode state. */
  readonly setFastMode: ChatSessionControls['setFastMode'] = (fastMode) =>
    this.session.controls.setFastMode(fastMode)

  /** Sends a message, streaming the reply into the transcript. */
  readonly sendMessage: ChatSessionControls['sendMessage'] = (message, attachments, options) =>
    this.session.controls.sendMessage(message, attachments, options)

  /** Clears the conversation, on the server and locally. */
  readonly clearHistory: ChatSessionControls['clearHistory'] = () =>
    this.session.controls.clearHistory()

  /** Edits the content of a queued message. */
  readonly editQueuedMessage: ChatSessionControls['editQueuedMessage'] = (msgId, newContent) =>
    this.session.controls.editQueuedMessage(msgId, newContent)

  /** Removes a queued message from the queue. */
  readonly deleteQueuedMessage: ChatSessionControls['deleteQueuedMessage'] = (msgId) =>
    this.session.controls.deleteQueuedMessage(msgId)

  /** Removes queued auto-fix messages that reference the given file path. */
  readonly clearQueuedForFile: ChatSessionControls['clearQueuedForFile'] = (filePath) =>
    this.session.controls.clearQueuedForFile(filePath)

  /** Ingests one pushed (broadcast) stream frame into the message store. */
  readonly applyRemoteEvent: ChatSessionControls['applyRemoteEvent'] = (event) =>
    this.session.controls.applyRemoteEvent(event)

  /** Reloads history and converges the local view on the server transcript. */
  readonly reconcileHistory: ChatSessionControls['reconcileHistory'] = () =>
    this.session.controls.reconcileHistory()

  /** Cancels a pending auto-retry. */
  readonly cancelRetry: ChatSessionControls['cancelRetry'] = () =>
    this.session.controls.cancelRetry()

  /** The latest committed `sendMessage`, stable across provider changes. */
  readonly sendLatestMessage: ChatSendMessage = (message, attachments, options): void => {
    void this.sendMessage(message, attachments, options)
  }

  /** React's mount I/O for the region: its history load runs on the first effect run. */
  mount(): void {
    // `chat:chat` has no mount I/O outside its effects: the session connects on
    // the first run of the registered connect effect, which is React's position.
  }

  /**
   * The settings PATCH URL that names the open conversation, so the server's
   * shared setting card lands in the transcript members are watching.
   *
   * @returns The project's settings URL, with the open conversation when there is one.
   */
  settingsPatchUrl(): string {
    const conversationId = this.state.env.conversationIdRef.current
    return `/projects/${this.state.props().projectId}${
      conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : ''
    }`
  }

  /** Aborts the turn AND drops this panel's pending automatic follow-ups. */
  readonly handleAbort = (): void => {
    const autoFix = this.state.slice(ChatAutoFix)
    autoFix.deferredPendingRef.current = null
    autoFix.deferredPendingSuppressRef.current = false
    autoFix.deferredPendingUserInitiatedRef.current = false
    autoFix.dispatchAutoFix({ type: 'reset' })
    this.session.controls.abort()
  }

  /** Answers a pending `ask_user` card (suppressing the optimistic user bubble). */
  readonly handleAskUserResponse = (response: string): void => {
    this.sendLatestMessage(response, undefined, {
      suppressUserMessage: true,
      askUserAnswer: true,
    })
  }

  /**
   * Registers React's `chat:chat` effects: `useChat`'s update and connect
   * effects (its first connect run is React's mount effect) and the loading
   * report, each registered at this region's position.
   */
  readonly effects = {
    1: (): void => {
      // React's `useChat` applies new options on every commit; the effect reads
      // the props signal, so a conversation or project change reaches the session.
      registerChatEffect(this.injector, () => {
        this.session.update({ ...this.readOptions(), provider: this.provider })
        // React re-renders from the store's newest snapshot after this update;
        // apply it now so this same flush's later effects (tips, git, tests-bar)
        // read the open conversation rather than the store the session was
        // constructed against before the inputs were bound.
        untracked(() => this.sessionState.set(this.session.getState()))
      })
      registerChatEffect(this.injector, () => {
        // Connect once: React's `useChat` connects in a mount-only effect whose
        // position is this region's, right after the update effect.
        if (!this.disconnectSession) this.disconnectSession = this.session.connect()
      })
      registerChatEffect(this.injector, () => {
        const loading = this.isLoading()
        untracked(() => this.state.props().onLoadingChange?.(loading))
      })
    },
  }

  /**
   * Builds the session options from the current props, read at call time.
   *
   * @returns The session options for this render's props.
   */
  private readOptions(): ChatSessionOptions {
    const props = this.state.props()
    return {
      endpoint: props.endpoint,
      projectId: props.projectId,
      agentName: props.agentName,
      // A read-only viewer never issues chat POSTs (no resume/retry) — a live
      // turn is watched via pushed frames + the reconcile poll instead.
      readOnly: props.canEdit === false,
      // ALWAYS load history on mount: a persisted conversation must restore on
      // refresh, even when an initial message is also present.
      loadOnMount: true,
      onFileChange: (path, content) => this.onFileChangeWrapped(path, content),
      onConversationId: (id) => {
        this.state.props().onConversationId?.(id)
      },
      onStreamEvent: (event) => {
        this.state.slice(ChatStream).handleStreamEvent(event)
      },
    }
  }

  /**
   * React's `onFileChangeWrapped`: re-arms auto-commit, refreshes the
   * pending-files bar mid-stream, cancels a now-irrelevant auto-fix countdown,
   * opens a freshly saved plan quietly, then reports the change to the host.
   *
   * @param path - The file the agent created or modified.
   * @param content - Its new content.
   */
  private onFileChangeWrapped(path: string, content: string): void {
    const autoFix = this.state.slice(ChatAutoFix)
    this.state.slice(ChatAutoCommit).dispatchAutoCommit({ type: 'reset' })
    // Keep the uncommitted-files bar live DURING the turn — it must track files
    // as they stream in, not appear only once the turn ends.
    this.debouncedFetchPendingFilesRef.current?.()
    const countdown = autoFix.autoFixCountdown()
    if (countdown) {
      const norm = path.replace(/^\/workspace\//, '')
      const isRelevant = countdown.changedPaths.some(
        (candidate) => candidate.replace(/^\/workspace\//, '') === norm,
      )
      if (isRelevant) autoFix.dispatchAutoFix({ type: 'cancel' })
    }
    // Make a saved plan available as a tab, but DON'T steal focus — the plan is
    // created automatically and already streamed into the chat, so opening it
    // quietly keeps the user aware without yanking them off the preview.
    const cleanPath = path.replace(/^\/workspace\//, '')
    const props = this.state.props()
    if (cleanPath.startsWith('.agents/plans/') && props.onFileOpen) {
      props.onFileOpen(cleanPath, { focus: false })
    }
    props.onFileChange?.(path, content)
  }

  /** Subscribes to the session, fills the refs and wires the unmount cleanup. */
  constructor() {
    /**
     * Applies the session's newest snapshot the way React applies
     * `useSyncExternalStore`'s store change: immediately outside the panel's
     * effects, and as a NEXT-render update (a microtask) when the store notified
     * during the passive-effect flush, because React processes a state update
     * made there only after every effect of that flush has run.
     */
    let refreshQueued = false
    this.unsubscribeSession = this.session.subscribe(() => {
      if (!isInsideChatEffect()) {
        this.sessionState.set(this.session.getState())
        return
      }
      if (refreshQueued) return
      refreshQueued = true
      queueMicrotask(() => {
        refreshQueued = false
        this.sessionState.set(this.session.getState())
      })
    })
    // React's `useCommittedRef(sendMessageRef, sendMessage)`: the deferred
    // auto-fix path always calls the latest committed sender.
    this.state.slice(ChatAutoFix).sendMessageRef.current = this.sendLatestMessage
    this.destroyRef.onDestroy(() => {
      this.unsubscribeSession()
      this.disconnectSession?.()
      this.disconnectSession = null
    })
  }
}
