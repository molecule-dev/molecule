/**
 * The project-keyed transcript store every chat session shares, and the
 * refresh persistence of its queue and streaming flag.
 *
 * Internal to the chat session; not exported from the package barrel (the
 * public test reset is `resetChatStoresForTests` in `session.ts`).
 *
 * @module
 */

import { convergeHistory } from './history.js'
import type { ChatSendOptions, ChatSessionPersistence } from './session-types.js'
import type { BackgroundTaskState, ChatAttachment, ChatMessage, MessageBlock } from './types.js'

// ── Session persistence helpers ──────────────────────────────────────────────
// Persist the message queue and streaming state so that queued messages
// survive a page refresh and interrupted streams auto-resume.

const STORAGE_PREFIX = 'mol-chat-'

/** One message waiting to be delivered (queued behind a running turn). */
export type QueueEntry = {
  message: string
  attachments?: ChatAttachment[]
  userMsgId?: string
  /** Accepted by a durable provider queue; keep until the delivered message arrives. */
  durable?: boolean
  /** Server acceptance confirmed; absent while a submission might still be in flight. */
  accepted?: boolean
  suppressUserMessage?: boolean
  automatic?: boolean
  userInitiated?: boolean
  viaDictation?: boolean
}

/**
 * What a scheduled auto-retry should do when its countdown elapses.
 *
 * - `resume` — the server ACCEPTED the turn (at least one stream event arrived,
 *   so the user message is persisted server-side): re-enter the interrupted turn
 *   via the resume path (`sendMessage('', { resume: true })`).
 * - `resend` — the turn NEVER started server-side (the POST was rejected or the
 *   connection failed before any stream event): the user message was never
 *   persisted, so a resume would silently DROP it — re-send the original message
 *   instead. `userMsgId` is the optimistic local bubble to remove first so the
 *   re-send doesn't render a duplicate.
 */
export type RetryTarget =
  | { kind: 'resume'; id: string; content: string }
  | {
      kind: 'resend'
      message: string
      attachments?: ChatAttachment[]
      options?: ChatSendOptions
      userMsgId?: string
    }

/**
 * The default persistence: the browser's `sessionStorage`, looked up on each
 * call (so it can be absent — SSR, a sandboxed frame — without failing the
 * session; every caller treats a throw as "no persistence").
 */
export const browserSessionPersistence: ChatSessionPersistence = {
  getItem: (key) => globalThis.sessionStorage.getItem(key),
  setItem: (key, value) => globalThis.sessionStorage.setItem(key, value),
  removeItem: (key) => globalThis.sessionStorage.removeItem(key),
}

/**
 * Persist the pending message queue for a project.
 * @param persistence - Where to keep it.
 * @param projectId - The project identifier used as the storage key.
 * @param queue - The message queue entries to persist.
 */
export function persistQueue(
  persistence: ChatSessionPersistence,
  projectId: string,
  queue: QueueEntry[],
): void {
  try {
    if (queue.length > 0) {
      persistence.setItem(`${STORAGE_PREFIX}queue-${projectId}`, JSON.stringify(queue))
    } else {
      persistence.removeItem(`${STORAGE_PREFIX}queue-${projectId}`)
    }
  } catch (_error) {
    // Storage unavailable (SSR, private browsing quota exceeded) — safe to skip persistence
  }
}

/**
 * Load the persisted queue for a project without discarding unacknowledged work.
 * @param persistence - Where it is kept.
 * @param projectId - The project identifier used as the storage key.
 * @returns The previously persisted queue entries, or an empty array if none found.
 */
export function loadPersistedQueue(
  persistence: ChatSessionPersistence,
  projectId: string,
): QueueEntry[] {
  try {
    const raw = persistence.getItem(`${STORAGE_PREFIX}queue-${projectId}`)
    if (raw) {
      return JSON.parse(raw) as QueueEntry[]
    }
  } catch (_error) {
    // Ignore parse errors or unavailable storage — fall through to return []
  }
  return []
}

/**
 * Mark a project as actively streaming.
 * @param persistence - Where the flag is kept.
 * @param projectId - The project identifier to flag as streaming.
 */
export function setStreamingFlag(persistence: ChatSessionPersistence, projectId: string): void {
  try {
    persistence.setItem(`${STORAGE_PREFIX}streaming-${projectId}`, '1')
  } catch (_error) {
    // Storage unavailable — flag loss is safe; resume detection falls back gracefully
  }
}

/**
 * Clear the streaming flag for a project.
 * @param persistence - Where the flag is kept.
 * @param projectId - The project identifier whose streaming flag should be cleared.
 */
export function clearStreamingFlag(persistence: ChatSessionPersistence, projectId: string): void {
  try {
    persistence.removeItem(`${STORAGE_PREFIX}streaming-${projectId}`)
  } catch (_error) {
    // Storage unavailable — clearing the flag is best-effort, no functional impact
  }
}

/**
 * Check and clear the streaming flag — returns true if a stream was interrupted.
 * @param persistence - Where the flag is kept.
 * @param projectId - The project identifier to check for an interrupted stream.
 * @returns True if the streaming flag was set (indicating an interrupted stream), false otherwise.
 */
export function consumeStreamingFlag(
  persistence: ChatSessionPersistence,
  projectId: string,
): boolean {
  try {
    const val = persistence.getItem(`${STORAGE_PREFIX}streaming-${projectId}`)
    persistence.removeItem(`${STORAGE_PREFIX}streaming-${projectId}`)
    return val === '1'
  } catch (_error) {
    // Storage unavailable — treat as no interrupted stream
    return false
  }
}

// ── Conversation-keyed message store ─────────────────────────────────────────
// The chat history and live-stream state live HERE — in a module-level store
// keyed by project — NOT in a view's state. This is deliberate: a streaming
// turn writes events into the store regardless of whether (or which) chat view
// is mounted, and every mounted session just subscribes and renders "history +
// live". So remounting the panel (e.g. the boot view swapping to the IDE), a
// re-render that would unmount it, or any other lifecycle churn cannot drop
// history or cut a stream — the store outlives all of it. (A full page refresh
// clears the store; that path is covered separately by loadHistory +
// server-side stream resume.)

/**
 * Live store for one project's active conversation: its messages, whether a stream
 * is active, subscribers, and the id of the conversation currently held (used to
 * detect a genuine conversation switch vs a new conversation receiving its id).
 */
export type MessageStore = {
  messages: ChatMessage[]
  backgroundTasks: BackgroundTaskState[]
  pending: { current: QueueEntry[] }
  deliveredQueueIds: Set<string>
  streaming: boolean
  /**
   * True while a backend turn for this conversation streams WITHOUT this client
   * owning the request (another tab, a teammate, a server-side continuation).
   * Set only after the server's history `streaming` flag confirms it (see
   * startRemoteStreamPoll), and cleared when the server reports the turn done —
   * so the Stop control shows whenever ANY backend turn is live.
   */
  remoteStreaming: boolean
  /**
   * Set by a user Stop (abort). A stop is a user decision the platform must not
   * overrule: while set, autonomous `automatic` sends (preview-health /
   * verification auto-fixes) are dropped. Cleared by the user's next own send
   * (any non-automatic send, or an automatic one flagged `userInitiated`).
   */
  stoppedByUser: boolean
  /** Reject history metadata fetched before a newer local Stop or explicit send. */
  userIntentRevision: number
  /** Handle of the active remote-stream reconcile poll, or null when none runs. */
  remotePollTimer: ReturnType<typeof setTimeout> | null
  listeners: Set<() => void>
  conversationId?: string
  /**
   * Bumped on every GENUINE conversation switch (the session sees the endpoint
   * naming a DIFFERENT conversation than the store holds). The store is
   * project-keyed and deliberately outlives remounts so a live stream keeps
   * filling it across the boot→IDE remount — but that same property let a
   * still-running previous conversation's stream keep writing after the user
   * opened a new chat, streaming the old turn into the new conversation's
   * view. Streams snapshot the generation they started under; any write or
   * stream event carrying a stale generation is dropped. The old turn still
   * runs to completion server-side — switching back to that conversation
   * reloads it from history (and resumes if still streaming).
   */
  generation: number
}

const messageStores = new Map<string, MessageStore>()

/**
 * Get (creating if needed) the live message store for a conversation key.
 * @param key - The conversation/project storage key.
 * @returns The store for that key.
 */
export function getMessageStore(key: string): MessageStore {
  let store = messageStores.get(key)
  if (!store) {
    store = {
      messages: [],
      backgroundTasks: [],
      pending: { current: [] },
      deliveredQueueIds: new Set(),
      streaming: false,
      remoteStreaming: false,
      stoppedByUser: false,
      userIntentRevision: 0,
      remotePollTimer: null,
      listeners: new Set(),
      generation: 0,
    }
    messageStores.set(key, store)
  }
  return store
}

/** Clear every store (and its remote poll). */
export function clearMessageStores(): void {
  for (const store of messageStores.values()) {
    if (store.remotePollTimer !== null) clearTimeout(store.remotePollTimer)
  }
  messageStores.clear()
}

/**
 * Notify all subscribers of a conversation's store that it changed.
 * @param key - The conversation/project storage key.
 */
export function emitStore(key: string): void {
  const store = messageStores.get(key)
  if (store) for (const listener of store.listeners) listener()
}

/**
 * Replace or update a conversation's messages and notify subscribers. Safe to call
 * at any time — including after the view that started the stream has unmounted.
 * @param key - The conversation/project storage key.
 * @param updater - The next messages array, or a function of the previous array.
 */
export function setStoreMessages(
  key: string,
  updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]),
): void {
  const store = getMessageStore(key)
  store.messages = typeof updater === 'function' ? updater(store.messages) : updater
  emitStore(key)
}

/**
 * Update conversation-level work independently of any assistant message.
 * @param key - The conversation/project storage key.
 * @param tasks - Task states to merge in by id.
 */
export function mergeBackgroundTasks(key: string, tasks: BackgroundTaskState[]): void {
  const store = getMessageStore(key)
  const next = new Map(store.backgroundTasks.map((task) => [task.id, task]))
  for (const task of tasks) {
    const previous = next.get(task.id)
    if (previous && previous.status !== 'running' && task.status === 'running') continue
    next.set(task.id, {
      ...task,
      ...(previous?.outputChars != null
        ? { outputChars: Math.max(previous.outputChars, task.outputChars ?? 0) }
        : {}),
    })
  }
  store.backgroundTasks = [...next.values()]
  emitStore(key)
}

/**
 * Recover durable queue handles; the server keeps full attachment payloads behind each UUID.
 * @param persistence - Where the queue is kept.
 * @param key - The conversation/project storage key.
 * @param history - The fresh server history.
 * @param acceptedBeforeLoad - Queue ids the server had accepted before the history request.
 * @returns The history minus queued items already delivered.
 */
export function restoreQueuedMessages(
  persistence: ChatSessionPersistence,
  key: string,
  history: ChatMessage[],
  acceptedBeforeLoad: Set<string> = new Set(),
): ChatMessage[] {
  const pending = getMessageStore(key).pending
  const queuedIds = new Set(
    history.filter((message) => message.queued).map((message) => message.id),
  )
  const removed = new Set([...acceptedBeforeLoad].filter((id) => !queuedIds.has(id)))
  for (const id of removed) getMessageStore(key).deliveredQueueIds.add(id)
  pending.current = pending.current.filter(
    (entry) => !entry.userMsgId || !removed.has(entry.userMsgId),
  )
  if (removed.size > 0)
    setStoreMessages(key, (messages) =>
      messages.filter((message) => !message.queued || !removed.has(message.id)),
    )
  for (const message of history) {
    if (message.role !== 'user') continue
    const existing = pending.current.find((entry) => entry.userMsgId === message.id)
    if (message.queued) {
      if (getMessageStore(key).deliveredQueueIds.has(message.id)) continue
      if (existing) existing.accepted = true
      if (!existing)
        pending.current.push({
          message: message.content,
          userMsgId: message.id,
          durable: true,
          accepted: true,
          ...(message.automatic ? { automatic: true } : {}),
          ...(message.viaDictation ? { viaDictation: true } : {}),
        })
    } else {
      pending.current = pending.current.filter((entry) => entry.userMsgId !== message.id)
    }
  }
  persistQueue(persistence, key, pending.current)
  return history.filter(
    (message) => !message.queued || !getMessageStore(key).deliveredQueueIds.has(message.id),
  )
}

/**
 * Only acceptance known before a history request can be authoritatively reconciled by it.
 * @param key - The conversation/project storage key.
 * @returns Ids of queue entries the server has accepted.
 */
export function acceptedQueueIds(key: string): Set<string> {
  return new Set(
    getMessageStore(key)
      .pending.current.filter((entry) => entry.accepted && entry.userMsgId != null)
      .map((entry) => entry.userMsgId!),
  )
}

/**
 * Remove a queue item in every mounted view and reject delayed acceptance snapshots.
 * @param persistence - Where the queue is kept.
 * @param key - The conversation/project storage key.
 * @param messageId - The queued message's id.
 */
export function removeQueuedMessage(
  persistence: ChatSessionPersistence,
  key: string,
  messageId: string,
): void {
  const store = getMessageStore(key)
  store.pending.current = store.pending.current.filter((entry) => entry.userMsgId !== messageId)
  store.deliveredQueueIds.add(messageId)
  persistQueue(persistence, key, store.pending.current)
  setStoreMessages(key, (messages) =>
    messages.filter((message) => message.id !== messageId || !message.queued),
  )
}

/**
 * Set whether a conversation has an active stream, notifying subscribers on change.
 * @param key - The conversation/project storage key.
 * @param streaming - Whether a stream is currently active.
 */
export function setStoreStreaming(key: string, streaming: boolean): void {
  const store = getMessageStore(key)
  if (store.streaming !== streaming) {
    store.streaming = streaming
    emitStore(key)
  }
}

/**
 * Set whether a REMOTE backend turn (not owned by this client) is streaming,
 * notifying subscribers on change.
 * @param key - The conversation/project storage key.
 * @param remoteStreaming - Whether a remote backend turn is currently live.
 */
export function setStoreRemoteStreaming(key: string, remoteStreaming: boolean): void {
  const store = getMessageStore(key)
  if (store.remoteStreaming !== remoteStreaming) {
    store.remoteStreaming = remoteStreaming
    emitStore(key)
  }
}

/**
 * Stop a store's remote-stream reconcile poll (if any) and clear the flag.
 * @param key - The conversation/project storage key.
 */
export function stopRemoteStreamPoll(key: string): void {
  const store = getMessageStore(key)
  if (store.remotePollTimer !== null) {
    clearTimeout(store.remotePollTimer)
    store.remotePollTimer = null
  }
  setStoreRemoteStreaming(key, false)
}

/** Interval between remote-stream reconcile polls. */
const REMOTE_STREAM_POLL_MS = 3000

/** Upper bound on reconcile polls per remote turn (~5 min) so a poll can never leak. */
const REMOTE_STREAM_POLL_MAX = 100

/**
 * Merge a fresh server history into a conversation's live store. No-op while a
 * local send owns the store — the sender's own stream is authoritative and its
 * post-send reconcile handles history.
 *
 * @param key - The conversation/project storage key.
 * @param history - The messages from the server's history endpoint.
 */
function mergeRemoteHistory(key: string, history: ChatMessage[]): void {
  if (history.length === 0) return
  const store = getMessageStore(key)
  if (store.streaming) return
  setStoreMessages(key, (prev) => convergeHistory(prev, history))
}

/**
 * Confirm-and-track a remote backend turn. Called when a pushed (broadcast) chat
 * event arrives for the open conversation while this client has no send of its
 * own in flight — evidence that a backend turn is streaming somewhere else
 * (another tab, a teammate, a server-side continuation). Rather than trusting a
 * single sparse event (an own-echo card can arrive just after a local turn
 * ends), the server's history `streaming` flag is polled: the remote flag turns
 * on only once confirmed, stays on while the server reports streaming, and
 * clears when the turn finishes. Each poll ALSO reconciles the fetched history
 * into the store ({@link mergeRemoteHistory}) — the durable backstop under the
 * live pushed frames: it fills whatever a watcher missed before attaching (or
 * during a push-channel drop) within one poll interval, and applies the final
 * authoritative transcript when the turn ends. Single-flight per store; a local
 * send taking over (store.streaming) ends the poll immediately.
 *
 * @param key - The conversation/project storage key.
 * @param fetchRemoteState - Reloads history, resolving the messages and whether
 *   the server reports an active stream for this conversation.
 */
export function startRemoteStreamPoll(
  key: string,
  fetchRemoteState: () => Promise<{ streaming: boolean; history: ChatMessage[] }>,
): void {
  const store = getMessageStore(key)
  if (store.streaming || store.remotePollTimer !== null) return
  const poll = async (iteration: number): Promise<void> => {
    const s = getMessageStore(key)
    // A local send now owns the streaming state, nobody is subscribed anymore,
    // or the bound is hit — stop tracking.
    if (s.streaming || s.listeners.size === 0 || iteration >= REMOTE_STREAM_POLL_MAX) {
      s.remotePollTimer = null
      setStoreRemoteStreaming(key, false)
      return
    }
    let active: boolean
    try {
      const state = await fetchRemoteState()
      mergeRemoteHistory(key, state.history)
      active = state.streaming
    } catch (_error) {
      // History fetch failed (transient network) — keep the last known state and
      // let the next poll reconcile; the iteration bound still guarantees an end.
      active = s.remoteStreaming
    }
    setStoreRemoteStreaming(key, active)
    if (!active) {
      s.remotePollTimer = null
      return
    }
    s.remotePollTimer = setTimeout(() => void poll(iteration + 1), REMOTE_STREAM_POLL_MS)
  }
  // Mark the poll as started synchronously (single-flight), then confirm at once.
  store.remotePollTimer = setTimeout(() => void poll(0), 0)
}

/**
 * Mutable per-message streaming context — the live accumulator for ONE assistant
 * message (one server agentic-loop iteration), created on each `message_start` event.
 * Replaces the former one-blob-per-send model so the live transcript is the SAME
 * per-message structure the server persists (live === stored).
 */
export interface MsgStreamCtx {
  id: string
  assistantText: string
  blocks: MessageBlock[]
  toolCalls: NonNullable<ChatMessage['toolCalls']>
  loopLimitReached?: number
  scheduleFlush: (build: (m: ChatMessage) => Partial<ChatMessage>) => void
  flushNow: (build?: (m: ChatMessage) => Partial<ChatMessage>) => void
}

/**
 * Snapshot a streaming context's mutable state into a message-field update.
 *
 * @param ctx - The streaming context to snapshot.
 * @returns Partial message fields to merge.
 */
export function buildCtxUpdate(ctx: MsgStreamCtx): Partial<ChatMessage> {
  return {
    content: ctx.assistantText,
    blocks: [...ctx.blocks],
    toolCalls: [...ctx.toolCalls],
    ...(ctx.loopLimitReached != null ? { loopLimitReached: ctx.loopLimitReached } : {}),
  }
}
