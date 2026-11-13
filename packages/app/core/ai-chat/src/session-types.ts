/**
 * Types for the framework-free chat session (`createChatSession`).
 *
 * Every framework binding's `useChat` is a thin adapter over one session: the
 * session owns the transcript, streaming, queueing, retries and recovery, and
 * the binding only turns {@link ChatSession.subscribe} / {@link ChatSession.getState}
 * into its own reactivity and calls {@link ChatSession.connect} while mounted.
 *
 * @module
 */

import type {
  BackgroundTaskState,
  ChatAttachment,
  ChatMessage,
  ChatProvider,
  ChatStreamEvent,
} from './types.js'

/** The agent's working mode: plan (read-only research) or execute (full access). */
export type ChatMode = 'plan' | 'execute'

/**
 * Synchronous key/value store the session uses to survive a page refresh: the
 * pending message queue and the "a stream was running" flag. Same shape as the
 * Web Storage API, so `window.sessionStorage` satisfies it.
 */
export interface ChatSessionPersistence {
  /** Returns the stored value, or `null` when there is none. */
  getItem(key: string): string | null
  /** Stores a value. */
  setItem(key: string, value: string): void
  /** Removes a value. */
  removeItem(key: string): void
}

/**
 * Options for one chat session (and for every binding's `useChat`).
 */
export interface ChatSessionOptions {
  /** Chat endpoint (e.g., '/projects/123/chat'). */
  endpoint: string
  /** Project ID for context. */
  projectId?: string
  /**
   * Display name of the AI coding agent, interpolated into user-facing chat
   * copy (e.g. the stalled-stream notice). The host passes its own agent brand
   * name; defaults to the neutral `DEFAULT_AGENT_NAME` so the shared session
   * never names a specific product.
   */
  agentName?: string
  /** Load history on mount. Read once, when the session is created. */
  loadOnMount?: boolean
  /**
   * This client may only WATCH the conversation (e.g. a read-only project
   * viewer): the session never issues chat POSTs on its behalf — no resume
   * request after a reload, no auto-retries. A live turn is followed through
   * the remote-watch path instead: pushed broadcast frames (applyRemoteEvent)
   * render it in real time and the history reconcile poll backstops gaps, with
   * `isRemoteStreaming` driving the activity indicator.
   */
  readOnly?: boolean
  /** Called when a file is created or modified by a tool call (path + new content). */
  onFileChange?: (path: string, content: string) => void
  /** Called when the AI switches between plan and execute modes. */
  onModeChange?: (mode: ChatMode) => void
  /** Called when the backend assigns or confirms a conversation ID. */
  onConversationId?: (id: string) => void
  /** Called for every streaming event — useful for notifications, sounds, etc. */
  onStreamEvent?: (event: ChatStreamEvent) => void
  /**
   * Where the pending queue and the interrupted-stream flag are kept across a
   * page refresh. Read once, when the session is created. Defaults to the
   * browser's `sessionStorage` when one is available (a refresh mid-turn then
   * resumes the turn and re-sends what was queued); anything that throws or is
   * missing is treated as no persistence.
   */
  persistence?: ChatSessionPersistence
}

/**
 * Options for {@link ChatSessionControls.sendMessage}.
 */
export interface ChatSendOptions {
  /** Reuse a queued message's UUID when delivering it after reconnecting. */
  messageId?: string
  /**
   * Skip the optimistic local user-message bubble. The text is still sent to
   * the server. Used for ask_user responses: the answer is folded into the
   * ask_user tool card (a checkmark on the chosen option, or the custom text
   * shown in-card) rather than echoed as a separate message below it.
   */
  suppressUserMessage?: boolean
  /**
   * Mark this send as issued automatically on the user's behalf (e.g. an
   * auto-fix prompt). The optimistic local bubble and the persisted message are
   * flagged `automatic` so the chat renders it in the distinct auto-sent style
   * (agent avatar + accent border) instead of looking like the user typed it.
   */
  automatic?: boolean
  /**
   * Mark this send as the answer to the pending `ask_user` question. The most
   * recent unanswered `ask_user` tool call in the store is resolved in place —
   * its `output` is set to this answer — so the chosen option stays checked
   * across remounts (e.g. the discovery→IDE transition) instead of relying on
   * ephemeral component state that the answer's selection would otherwise lose.
   * Distinct from {@link suppressUserMessage} (which the post-boot kickoff also
   * sets) so resolving never misfires on a non-ask_user suppressed send.
   */
  askUserAnswer?: boolean
  /**
   * Mark an {@link automatic} send as directly requested by the user (e.g. the
   * editor's "Fix with AI" action, the broken-preview overlay's "Fix with AI"
   * button) rather than dispatched autonomously by the platform. A user Stop
   * suppresses autonomous automatic sends until the user re-engages; a
   * user-initiated one IS that re-engagement — it clears the stop and sends.
   */
  userInitiated?: boolean
  /**
   * Send on the SIDE CHANNEL: a human-to-human message (e.g. a team note) the
   * server intercepts before running any agent turn. When the provider supports
   * `sendSideMessage`, the send goes out IMMEDIATELY on an independent request —
   * it never queues behind an active turn, never takes over the streaming
   * state, and never tears down remote-turn tracking (a viewer's note while
   * watching a teammate's turn must not stop the watching). Falls back to the
   * normal send path on providers without side-channel support.
   */
  sideChannel?: boolean
  /**
   * Mark this send as composed through voice dictation — the mic button's
   * transcript was still present in the composer at submit. The optimistic
   * bubble and the persisted message are flagged `viaDictation` so the chat
   * renders a mic badge on the message, live and after a reload.
   */
  viaDictation?: boolean
}

/**
 * Metadata about a limit-related error, for a contextual call-to-action.
 * `limitType` names the RULE the backend enforced; `billingAction` names the
 * REMEDY it resolved (e.g. `add_funds`, `add_payment_method`,
 * `raise_spend_cap`, `upgrade`, `none`) and is what the button should be
 * built from — the same limit needs a different button per account.
 * `upgradeTier` is the plan an upgrade would move to, explicitly `null` when
 * there is no higher tier. The backend owns these vocabularies, so the
 * action/tier are plain strings here.
 */
export interface ChatErrorMeta {
  /** The limit rule the backend enforced. */
  limitType?: string
  /** Whether the user must sign up to continue. */
  requiresSignup?: boolean
  /** The remedy the backend resolved for this account. */
  billingAction?: string
  /** The plan an upgrade would move to, or `null` when there is none. */
  upgradeTier?: string | null
}

/** A pending auto-retry countdown. */
export interface ChatRetryCountdown {
  /** Whole seconds until the retry fires. */
  secondsRemaining: number
  /** The 1-based retry number. */
  attempt: number
}

/**
 * Everything a chat view renders. {@link ChatSession.getState} returns the same
 * object until one of these values changes.
 */
export interface ChatSessionState {
  /** The transcript: history plus whatever is streaming, in order. */
  messages: ChatMessage[]
  /** True while this client's own send or resume streams. */
  isLoading: boolean
  /**
   * True while a backend turn for this conversation streams WITHOUT this client
   * owning the request — a turn started in another tab, by a teammate, or any
   * server-side continuation. Detected from pushed (broadcast) chat events and
   * confirmed/cleared against the server's `streaming` history flag, so the Stop
   * control can stay visible and functional whenever ANY backend turn is live —
   * not only for sends this session made.
   */
  isRemoteStreaming: boolean
  /** The error to show, or `null`. */
  error: string | null
  /** Limit metadata of the error, for its call-to-action (see {@link ChatErrorMeta}). */
  errorMeta: ChatErrorMeta | null
  /** Current agent mode — plan (read-only research) or execute (full access). */
  mode: ChatMode
  /**
   * Whether the conversation runs at the provider's fast/priority speed tier
   * (server-persisted per conversation; hydrated from the history load's
   * `fastMode` meta field, when the server provides one). Only meaningful for
   * models that support a fast tier — the server ignores it otherwise.
   */
  fastMode: boolean
  /**
   * Transient label for a background phase (e.g. the post-response verification
   * pass — "Type-checking the API", "Linting"), set by `status` stream events.
   * The UI shows it in place of the spinner's generic rotating messages; `null`
   * when no such phase is active.
   */
  streamingStatus: string | null
  /**
   * Commands the executor detached with `run_in_background`, newest last. Each
   * appears here the moment it starts and is replaced in place when it finishes,
   * so the UI can show work that outlives the tool call that started it.
   */
  backgroundTasks: BackgroundTaskState[]
  /**
   * Active backoff-retry countdown, or `null` when none is pending. After a
   * backend server error (HTTP 5XX) or a dropped connection the session does NOT
   * surface a terminal error — it shows this cancelable countdown and, when it
   * elapses, resumes the turn where the user left off (or re-sends a message the
   * server never received). `secondsRemaining` ticks down once per second;
   * `attempt` is the 1-based retry number (capped at 8). 4XX, limit/quota, and
   * signup-required errors never auto-retry.
   */
  retryCountdown: ChatRetryCountdown | null
}

/**
 * The actions a chat view calls. Each function keeps its identity for the life
 * of the session.
 */
export interface ChatSessionControls {
  /**
   * Tell the session a pushed (broadcast) chat event arrived for this
   * conversation. The host calls this from its push-channel handler; the
   * session then confirms against the server's `streaming` flag and, while a
   * remote turn is live, keeps `isRemoteStreaming` true until the server
   * reports it finished.
   */
  noteRemoteStreamEvent: () => void
  /** Update the local mode state (for instant mode toggle without an AI turn). */
  setMode: (mode: ChatMode) => void
  /** Update the local fast-mode state (for instant toggle without an AI turn). */
  setFastMode: (fastMode: boolean) => void
  /** Send a message (queued behind a running turn), streaming the reply into the transcript. */
  sendMessage: (
    message: string,
    attachments?: ChatAttachment[],
    options?: ChatSendOptions,
  ) => Promise<void>
  /** Stop the running turn, here and on the server, keeping everything streamed so far. */
  abort: () => void
  /**
   * Cancel a pending auto-retry. Clears the countdown and surfaces the
   * original error (via `error`) so the user sees why the turn failed.
   */
  cancelRetry: () => void
  /** Clear the conversation, on the server and locally. */
  clearHistory: () => Promise<void>
  /**
   * Edit the content of a queued (not yet sent) message. Resolves once the
   * edit is applied (after the provider accepts it, for a durable queue).
   */
  editQueuedMessage: (msgId: string, newContent: string) => void | Promise<void>
  /**
   * Remove a queued (not yet sent) message from the queue. Resolves once it is
   * removed (after the provider accepts it, for a durable queue).
   */
  deleteQueuedMessage: (msgId: string) => void | Promise<void>
  /** Remove queued auto-fix messages whose content references the given file path. */
  clearQueuedForFile: (filePath: string) => void
  /**
   * Append an inline transcript card (model / mode / skills / custom notice) as a
   * `role:'system'` card-message in the ONE message store. Used by the host to
   * render a TEAMMATE's broadcast `card` event live — this client's OWN cards
   * arrive through the stream and are appended internally. De-duped by the
   * server-assigned id.
   */
  appendCardMessage: (
    id: string,
    timestamp: number,
    card: NonNullable<ChatMessage['cardEvent']>,
  ) => void
  /**
   * Append a COMPLETE, non-streaming chat message (a `message` stream event — e.g.
   * a teammate's human-only team note) to the ONE message store. Used by the host
   * to render a TEAMMATE's broadcast `message` event live — this client's OWN
   * `message` events arrive through the stream and are appended internally.
   * De-duped by the server-assigned message id.
   */
  appendCompleteMessage: (message: ChatMessage) => void
  /**
   * Ingest ONE pushed (broadcast) stream frame from a turn running elsewhere —
   * a teammate's send, another tab, a server-side continuation — into the ONE
   * message store, through the same content applier as an own SSE stream: text/
   * thinking deltas, tool events, verification, cards, complete messages, done.
   * The host calls this from its push-channel handler for every broadcast frame
   * of the OPEN conversation. Own echoes are dropped while a local send is in
   * flight (the SSE stream is authoritative for the sender); complete
   * id-carrying items (cards, team notes) always apply, de-duped.
   */
  applyRemoteEvent: (event: ChatStreamEvent) => void
  /**
   * Reload history and converge the local view on the server transcript (and
   * re-enter a still-streaming turn). The page-lifecycle events run this
   * automatically; the host should ALSO call it whenever its chat push channel
   * (re)connects — a broadcast sent while that socket was down (a teammate's
   * team note against a backgrounded tab or a slept laptop) is otherwise lost
   * until the next lifecycle event happens to fire. Cheap when nothing changed:
   * an identical transcript is never re-applied.
   */
  reconcileHistory: () => Promise<void>
}

/** Options for `createChatSession`: the session options plus the chat provider. */
export interface CreateChatSessionOptions extends ChatSessionOptions {
  /** The chat provider (bond) the session talks to. */
  provider: ChatProvider
}

/**
 * One chat view's session: state, actions and lifecycle, with no framework in
 * it. Sessions for the same project share one transcript store, so several
 * views (or a view that remounts) show the same conversation and a stream
 * keeps filling it while no view is mounted.
 */
export interface ChatSession {
  /** The actions, stable for the life of the session. */
  controls: ChatSessionControls
  /** The current state; the same object until something in it changes. */
  getState: () => ChatSessionState
  /** The state to render on a server (an empty, idle chat); always the same object. */
  getServerState: () => ChatSessionState
  /**
   * Calls `listener` after every state change.
   *
   * @returns Unsubscribes.
   */
  subscribe: (listener: () => void) => () => void
  /**
   * Applies the latest options. A changed `endpoint` while connected is a
   * conversation change: the session detects a switch and loads that
   * conversation. A changed `projectId` moves the session to that project's
   * transcript store. Callbacks and `agentName`/`readOnly` take effect for
   * whatever happens next. `loadOnMount` and `persistence` are fixed at creation.
   */
  update: (options: CreateChatSessionOptions) => void
  /**
   * Starts the session for a mounted view: page-lifecycle recovery, the
   * unload hook, and the history load (when `loadOnMount`).
   *
   * @returns Stops it again (call on unmount). A stream already running keeps
   *   writing to the shared store.
   */
  connect: () => () => void
}
