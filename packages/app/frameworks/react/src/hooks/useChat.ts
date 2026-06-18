/**
 * React hook for AI chat provider.
 *
 * @module
 */

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import type {
  ChatAttachment,
  ChatConfig,
  ChatMessage,
  ChatProvider,
  ChatStreamEvent,
  MessageBlock,
} from '@molecule/app-ai-chat'
import { t } from '@molecule/app-i18n'

import { DEFAULT_AGENT_NAME } from '../agent-identity.js'
import { ChatContext } from '../contexts.js'
import type { SendMessageOptions, UseChatOptions, UseChatResult } from '../types.js'

// ── Session persistence helpers ──────────────────────────────────────────────
// Persist the message queue and streaming state to sessionStorage so that
// queued messages survive a page refresh and interrupted streams auto-resume.

const STORAGE_PREFIX = 'mol-chat-'

type QueueEntry = {
  message: string
  attachments?: ChatAttachment[]
  userMsgId?: string
  suppressUserMessage?: boolean
  automatic?: boolean
}

/** Prefix used by auto-fix messages so we can identify them in the queue. */
const AUTOFIX_PREFIX = 'Fix these issues:'

/**
 * Base backoff (in seconds) before the first auto-retry of a turn interrupted by
 * a 5XX backend error. The wait doubles each attempt → 5s, 10s, 20s.
 */
const RETRY_BASE_SECONDS = 5

/**
 * Maximum number of auto-retry attempts after a 5XX backend error before the
 * error is surfaced to the user (no more retries).
 */
const MAX_RETRY_ATTEMPTS = 3

/**
 * Persist the pending message queue for a project.
 * @param projectId - The project identifier used as the storage key.
 * @param queue - The message queue entries to persist.
 */
function persistQueue(projectId: string, queue: QueueEntry[]): void {
  try {
    if (queue.length > 0) {
      sessionStorage.setItem(`${STORAGE_PREFIX}queue-${projectId}`, JSON.stringify(queue))
    } else {
      sessionStorage.removeItem(`${STORAGE_PREFIX}queue-${projectId}`)
    }
  } catch (_error) {
    // sessionStorage unavailable (SSR, private browsing quota exceeded) — safe to skip persistence
  }
}

/**
 * Load and clear the persisted queue for a project.
 * @param projectId - The project identifier used as the storage key.
 * @returns The previously persisted queue entries, or an empty array if none found.
 */
function loadPersistedQueue(projectId: string): QueueEntry[] {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}queue-${projectId}`)
    if (raw) {
      sessionStorage.removeItem(`${STORAGE_PREFIX}queue-${projectId}`)
      return JSON.parse(raw) as QueueEntry[]
    }
  } catch (_error) {
    // Ignore parse errors or unavailable storage — fall through to return []
  }
  return []
}

/**
 * Mark a project as actively streaming.
 * @param projectId - The project identifier to flag as streaming.
 */
function setStreamingFlag(projectId: string): void {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}streaming-${projectId}`, '1')
  } catch (_error) {
    // sessionStorage unavailable — flag loss is safe; resume detection falls back gracefully
  }
}

/**
 * Clear the streaming flag for a project.
 * @param projectId - The project identifier whose streaming flag should be cleared.
 */
function clearStreamingFlag(projectId: string): void {
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}streaming-${projectId}`)
  } catch (_error) {
    // sessionStorage unavailable — clearing the flag is best-effort, no functional impact
  }
}

/**
 * Check and clear the streaming flag — returns true if a stream was interrupted.
 * @param projectId - The project identifier to check for an interrupted stream.
 * @returns True if the streaming flag was set (indicating an interrupted stream), false otherwise.
 */
function consumeStreamingFlag(projectId: string): boolean {
  try {
    const val = sessionStorage.getItem(`${STORAGE_PREFIX}streaming-${projectId}`)
    sessionStorage.removeItem(`${STORAGE_PREFIX}streaming-${projectId}`)
    return val === '1'
  } catch (_error) {
    // sessionStorage unavailable — treat as no interrupted stream
    return false
  }
}

// ── Conversation-keyed message store ─────────────────────────────────────────
// The chat history and live-stream state live HERE — in a module-level store
// keyed by conversation — NOT in component state. This is deliberate: a streaming
// turn writes events into the store regardless of whether (or which) ChatPanel is
// mounted, and every mounted useChat just subscribes and renders "history + live".
// So remounting the panel (e.g. the boot view swapping to the IDE), a re-render
// that would unmount it, or any other lifecycle churn cannot drop history or cut
// a stream — the store outlives all of it. (A full page refresh clears the store;
// that path is covered separately by loadHistory + server-side stream resume.)

/**
 * Live store for one project's active conversation: its messages, whether a stream
 * is active, subscribers, and the id of the conversation currently held (used to
 * detect a genuine conversation switch vs a new conversation receiving its id).
 */
type MessageStore = {
  messages: ChatMessage[]
  streaming: boolean
  listeners: Set<() => void>
  conversationId?: string
}

/** Stable empty array for the SSR/initial snapshot (useSyncExternalStore needs referential stability). */
const EMPTY_MESSAGES: ChatMessage[] = []

const messageStores = new Map<string, MessageStore>()

/**
 * Get (creating if needed) the live message store for a conversation key.
 * @param key - The conversation/project storage key.
 * @returns The store for that key.
 */
function getMessageStore(key: string): MessageStore {
  let store = messageStores.get(key)
  if (!store) {
    store = { messages: [], streaming: false, listeners: new Set() }
    messageStores.set(key, store)
  }
  return store
}

/**
 * Notify all subscribers of a conversation's store that it changed.
 * @param key - The conversation/project storage key.
 */
function emitStore(key: string): void {
  const store = messageStores.get(key)
  if (store) for (const listener of store.listeners) listener()
}

/**
 * Replace or update a conversation's messages and notify subscribers. Safe to call
 * at any time — including after the component that started the stream has unmounted.
 * @param key - The conversation/project storage key.
 * @param updater - The next messages array, or a function of the previous array.
 */
function setStoreMessages(
  key: string,
  updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]),
): void {
  const store = getMessageStore(key)
  store.messages = typeof updater === 'function' ? updater(store.messages) : updater
  emitStore(key)
}

/**
 * Set whether a conversation has an active stream, notifying subscribers on change.
 * @param key - The conversation/project storage key.
 * @param streaming - Whether a stream is currently active.
 */
function setStoreStreaming(key: string, streaming: boolean): void {
  const store = getMessageStore(key)
  if (store.streaming !== streaming) {
    store.streaming = streaming
    emitStore(key)
  }
}

/**
 * Test-only: clear all conversation stores. The store is module-level (it must
 * outlive component mounts), so it persists across test cases — reset it in a
 * `beforeEach` the same way tests clear `sessionStorage`.
 */
export function resetChatStoresForTests(): void {
  messageStores.clear()
}

/**
 * Access the chat provider from context.
 * @returns The ChatProvider instance from the nearest ChatContext.
 * @throws {Error} If called outside a ChatProvider.
 */
export function useChatProvider(): ChatProvider {
  const provider = useContext(ChatContext)
  if (!provider) {
    throw new Error(
      t('react.error.useChatOutsideProvider', undefined, {
        defaultValue: 'useChatProvider must be used within a ChatProvider',
      }),
    )
  }
  return provider
}

/**
 * Hook for AI chat with streaming support.
 *
 * Manages message state, sends messages to the backend, and handles
 * SSE streaming responses.
 *
 * @param options - Chat configuration including endpoint URL, project ID, and whether to load history on mount.
 * @returns Chat state and controls: messages, isLoading, error, sendMessage, abort, and clearHistory.
 */
export function useChat(options: UseChatOptions): UseChatResult {
  const provider = useChatProvider()
  const {
    endpoint,
    projectId,
    agentName = DEFAULT_AGENT_NAME,
    loadOnMount = true,
    onFileChange,
    onModeChange,
    onConversationId,
    onStreamEvent,
  } = options
  // Project-scoped key for the message store + sessionStorage. The store is keyed
  // by project (stable across the whole build flow — the conversation id is
  // assigned mid-stream, so keying on it directly would swap the store out from
  // under a live stream). Multi-conversation correctness is handled in the mount
  // effect, which tracks the store's conversation id and resets only on a genuine
  // switch (a DIFFERENT id), not when a new conversation first receives its id.
  const storageKey = projectId ?? 'default'
  // `messages` and `isLoading` are backed by the module-level conversation store
  // (getMessageStore) rather than component state, so they survive remounts and a
  // stream keeps filling them even if this component unmounts mid-turn. Every
  // mounted useChat for the same project subscribes to the same store.
  const subscribeStore = useCallback(
    (onStoreChange: () => void) => {
      const store = getMessageStore(storageKey)
      store.listeners.add(onStoreChange)
      return () => {
        store.listeners.delete(onStoreChange)
      }
    },
    [storageKey],
  )
  const messages = useSyncExternalStore(
    subscribeStore,
    () => getMessageStore(storageKey).messages,
    () => EMPTY_MESSAGES,
  )
  const isLoading = useSyncExternalStore(
    subscribeStore,
    () => getMessageStore(storageKey).streaming,
    () => false,
  )
  const setMessages = useCallback(
    (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) =>
      setStoreMessages(storageKey, updater),
    [storageKey],
  )
  const setIsLoading = useCallback(
    (streaming: boolean) => setStoreStreaming(storageKey, streaming),
    [storageKey],
  )
  const [error, setError] = useState<string | null>(null)
  const [errorMeta, setErrorMeta] = useState<{
    limitType?: string
    requiresSignup?: boolean
  } | null>(null)
  // Active 5XX backoff-retry countdown, or null when none is pending. When a
  // backend error is a server error (HTTP 5XX) the hook does NOT surface a
  // terminal error — it shows this cancelable countdown and, when it elapses,
  // auto-resumes the interrupted turn "where the user left off". `secondsRemaining`
  // ticks down once per second; `attempt` is the 1-based retry number.
  const [retryCountdown, setRetryCountdown] = useState<{
    secondsRemaining: number
    attempt: number
  } | null>(null)
  const [mode, setMode] = useState<'plan' | 'execute'>('execute')
  // Transient label for a background phase (e.g. the verification pass) surfaced
  // by `status` stream events. Shown in place of the spinner's rotating messages
  // so the user sees the current step; cleared (null) by the server's status
  // event when the phase ends, and defensively on send/stream-end.
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null)
  // Pace status labels. A small change's verification (type-check + lint over a
  // couple of files) finishes in well under a second, so its step labels were
  // emitted in a rapid burst — they flashed by unreadably, or React batched the
  // burst down to just the final clear and the spinner showed no text at all.
  // Queue them and surface each for a minimum dwell so the progression is legible
  // regardless of how fast (or how batched) they arrive.
  const STATUS_MIN_DWELL_MS = 650
  const statusQueueRef = useRef<Array<string | null>>([])
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pumpStatusRef = useRef<() => void>(() => {})
  pumpStatusRef.current = (): void => {
    const next = statusQueueRef.current.shift()
    if (next === undefined) {
      statusTimerRef.current = null
      return
    }
    setStreamingStatus(next)
    // Non-null labels dwell so they're readable; a null (phase end) clears at once.
    statusTimerRef.current = setTimeout(
      () => pumpStatusRef.current(),
      next === null ? 0 : STATUS_MIN_DWELL_MS,
    )
  }
  const enqueueStatus = useCallback((label: string | null): void => {
    const q = statusQueueRef.current
    if (q.length > 0 && q[q.length - 1] === label) return // collapse consecutive dups
    // Collapse a pending clear that's immediately superseded by a real label.
    // runVerification emits a trailing `null` before the runtime-probe phase
    // re-labels ("Checking the server responds", …); without this the queued
    // null would still get its turn and blank the spinner for one dwell between
    // phases. A standalone trailing null (genuine end of phase) is preserved.
    if (label !== null && q.length > 0 && q[q.length - 1] === null) q.pop()
    q.push(label)
    if (!statusTimerRef.current) pumpStatusRef.current()
  }, [])
  const resetStatusQueue = useCallback((): void => {
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current)
      statusTimerRef.current = null
    }
    statusQueueRef.current = []
    setStreamingStatus(null)
  }, [])
  useEffect(
    () => () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    },
    [],
  )
  const mountedRef = useRef(true)
  const idCounterRef = useRef(0)
  // Last phase/model surfaced as an inline `phase_marker` block, tracked across the
  // session (not per send) so a transition is detected even across the separate
  // sendMessage calls of one build — matching how a reloaded transcript derives the
  // same markers by comparing consecutive persisted messages.
  const lastPhaseModeRef = useRef<string | null>(null)
  const lastPhaseModelRef = useRef<string | null>(null)
  // Capture loadOnMount at mount time — prevents mid-session flips
  // (e.g. initialMessage consumed → loadOnMount becomes true → history
  // load overwrites streaming messages).
  const loadOnMountRef = useRef(loadOnMount)
  // Queue for messages sent while a request is already in-flight
  const sendingRef = useRef(false)
  const pendingRef = useRef<QueueEntry[]>([])
  // Set when the user clicks Stop, so the post-send reconcile does NOT overwrite
  // the locally-finalized streamed content with server history. The abort()
  // callback already finalizes the streaming message (keeping every streamed
  // char + tool card, flagged aborted); reloading history here could otherwise
  // win a race against the server's own post-abort persist and momentarily wipe
  // the streamed turn (C4 — "everything streamed disappeared, returned on refresh").
  const userAbortedRef = useRef(false)
  // Stable ref to the latest sendMessage so effects can call it without dep issues
  const sendMessageRef = useRef<
    (message: string, attachments?: ChatAttachment[], options?: SendMessageOptions) => Promise<void>
  >(() => Promise.resolve())
  // Stable ref to clearQueuedForFile so stream event handlers can call it
  const clearQueuedForFileRef = useRef<(filePath: string) => void>(() => {})

  // Track page unload so the streaming flag isn't cleared during refresh.
  // On refresh the browser aborts the in-flight fetch, which causes the
  // sendMessage while-loop to exit and run cleanup — clearing the flag
  // before the new page can read it. beforeunload fires synchronously
  // before the abort microtask, so the ref is set in time.
  const unloadingRef = useRef(false)

  // ── Throttled flush for streaming message updates ─────────────────────────
  // Instead of calling setMessages on every SSE event (130+ per response, each
  // doing an O(n) array scan + React reconciliation), we accumulate the latest
  // mutable state in a ref and flush to React on a 50ms throttle.
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Stores a function that, when called, performs the setMessages update for
  // the current streaming message. Replaced each time a new stream starts.
  const pendingFlushFnRef = useRef<(() => void) | null>(null)

  /**
   * Build a flush-scheduling toolkit for a single streaming message.
   *
   * Returns `{ scheduleFlush, flushNow }` that share the same timer.
   * - `scheduleFlush(buildUpdate)` — stores the update builder and schedules a
   *   50ms debounced flush (no-op if one is already pending).
   * - `flushNow(buildUpdate?)` — cancels any pending timer and flushes
   *   immediately. If `buildUpdate` is provided it replaces the stored one first.
   *
   * `buildUpdate` is a function `(msg: ChatMessage) => Partial<ChatMessage>`
   * that returns the fields to merge into the streaming message.
   */
  const createFlushScheduler = useMemo(
    () =>
      (
        targetId: string,
      ): {
        scheduleFlush: (buildUpdate: (msg: ChatMessage) => Partial<ChatMessage>) => void
        flushNow: (buildUpdate?: (msg: ChatMessage) => Partial<ChatMessage>) => void
      } => {
        const scheduleFlush = (buildUpdate: (msg: ChatMessage) => Partial<ChatMessage>): void => {
          // Always store the latest builder so when the timer fires we use the
          // most recent mutable state.
          pendingFlushFnRef.current = () => {
            setMessages((prev) =>
              prev.map((m) => (m.id === targetId ? { ...m, ...buildUpdate(m) } : m)),
            )
          }
          if (flushTimerRef.current === null) {
            flushTimerRef.current = setTimeout(() => {
              flushTimerRef.current = null
              pendingFlushFnRef.current?.()
              pendingFlushFnRef.current = null
            }, 50)
          }
        }

        const flushNow = (buildUpdate?: (msg: ChatMessage) => Partial<ChatMessage>): void => {
          if (flushTimerRef.current !== null) {
            clearTimeout(flushTimerRef.current)
            flushTimerRef.current = null
          }
          if (buildUpdate) {
            pendingFlushFnRef.current = () => {
              setMessages((prev) =>
                prev.map((m) => (m.id === targetId ? { ...m, ...buildUpdate(m) } : m)),
              )
            }
          }
          pendingFlushFnRef.current?.()
          pendingFlushFnRef.current = null
        }

        return { scheduleFlush, flushNow }
      },
    [],
  )

  // Clean up flush timer on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current !== null) {
        clearTimeout(flushTimerRef.current)
        flushTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const onBeforeUnload = (): void => {
      unloadingRef.current = true
      // Kill the server-side stream on page refresh/close so it doesn't
      // continue running in the background. Uses sendBeacon so it works
      // even during unload.
      if (sendingRef.current) {
        const p = provider as { abortOnServer?: (config: ChatConfig, cid?: string) => void }
        p.abortOnServer?.({ endpoint, projectId }, undefined)
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      mountedRef.current = false
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [provider, endpoint, projectId, storageKey])

  const config: ChatConfig = {
    endpoint,
    projectId,
  }

  // Ref for the resume function so the mount effect can call it.
  // Accepts the assistant message ID to resume into (avoids state timing issues).
  const resumeStreamRef = useRef<(assistantId: string, existingContent: string) => Promise<void>>(
    () => Promise.resolve(),
  )

  // ── 5XX backoff auto-retry machinery ──────────────────────────────────────
  // When a stream `error` event reports an HTTP 5XX status, we don't surface a
  // terminal error — we show a cancelable, once-per-second countdown and then
  // resume the turn "where the user left off" via the existing resume path
  // (provider.sendMessage('', { resume: true })). 4XX, limit/quota, and
  // signup-required errors never auto-retry. Bounded to MAX_RETRY_ATTEMPTS.

  // Retries already performed for the CURRENT incident. Reset to 0 on a clean
  // `done`, a new send, an abort, a clearHistory, or a cancel.
  const retryAttemptRef = useRef(0)
  // The live countdown interval handle (ticks once/second). Cleared on fire,
  // cancel, reset, and unmount so no interval ever leaks.
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Mirror of the countdown value driven by the interval, so the tick can decide
  // when to fire WITHOUT scheduling a side effect inside a state updater.
  const retrySecondsRef = useRef(0)
  // The turn to resume when the countdown elapses (the in-flight assistant
  // message id + the text streamed so far).
  const retryTargetRef = useRef<{ id: string; content: string } | null>(null)
  // The original error message to surface if the user cancels the countdown or
  // the retry budget is exhausted — so they always see WHY the turn failed.
  const pendingRetryErrorRef = useRef<string | null>(null)

  /** Stop the countdown interval, if one is running. */
  const clearRetryTimers = useCallback((): void => {
    if (retryIntervalRef.current !== null) {
      clearInterval(retryIntervalRef.current)
      retryIntervalRef.current = null
    }
  }, [])

  /**
   * Clear any pending retry WITHOUT surfacing the error — used when the user
   * moves on (sends a new message, aborts, or clears history) so a stale retry
   * and its interval never leak into the next turn.
   */
  const resetRetry = useCallback((): void => {
    clearRetryTimers()
    retryAttemptRef.current = 0
    retryTargetRef.current = null
    pendingRetryErrorRef.current = null
    setRetryCountdown(null)
  }, [clearRetryTimers])

  /**
   * Fire the scheduled retry: stop the countdown and resume the interrupted turn
   * "where the user left off" via the existing resume path (resume:true). The
   * retry budget (retryAttemptRef) is intentionally NOT reset here — a resume
   * that fails again with a 5XX re-arms the backoff up to the attempt cap.
   */
  const fireRetry = useCallback((): void => {
    clearRetryTimers()
    setRetryCountdown(null)
    const target = retryTargetRef.current
    retryTargetRef.current = null
    if (target && mountedRef.current) {
      resumeStreamRef.current(target.id, target.content)
    }
  }, [clearRetryTimers])

  /**
   * Schedule a cancelable, once-per-second countdown that auto-resumes the turn
   * when it elapses. Backoff curve: 5s, 10s, 20s (exponential, base 5s) for
   * attempts 1, 2, 3. Returns false (without scheduling) once the attempt cap is
   * reached, so the caller surfaces the terminal error instead.
   * @param target - The assistant message id + streamed-so-far content to resume into.
   * @param message - The error to surface if the user cancels or the budget runs out.
   * @returns True if a retry was scheduled; false if the budget is exhausted.
   */
  const scheduleRetry = useCallback(
    (target: { id: string; content: string }, message: string): boolean => {
      if (retryAttemptRef.current >= MAX_RETRY_ATTEMPTS) return false
      const attempt = retryAttemptRef.current + 1 // 1-based
      retryAttemptRef.current = attempt
      retryTargetRef.current = target
      pendingRetryErrorRef.current = message
      const waitSeconds = RETRY_BASE_SECONDS * 2 ** (attempt - 1) // 5, 10, 20
      retrySecondsRef.current = waitSeconds
      setRetryCountdown({ secondsRemaining: waitSeconds, attempt })
      clearRetryTimers()
      retryIntervalRef.current = setInterval(() => {
        retrySecondsRef.current -= 1
        if (retrySecondsRef.current <= 0) {
          fireRetry()
        } else {
          setRetryCountdown({ secondsRemaining: retrySecondsRef.current, attempt })
        }
      }, 1000)
      return true
    },
    [clearRetryTimers, fireRetry],
  )

  /**
   * Decide how to handle a stream `error` event: auto-retry on a 5XX backend
   * error (start the cancelable countdown + resume the turn), or surface a
   * terminal error for everything else — a 4XX, a limit/quota gate, a
   * signup-required error, a transport error (no status), or an exhausted budget.
   * @param event - The error stream event (carries an optional HTTP `status`).
   * @param target - The turn to resume if this is a retryable 5XX.
   */
  const handleStreamError = useCallback(
    (
      event: { message: string; status?: number; limitType?: string; requiresSignup?: boolean },
      target: { id: string; content: string },
    ): void => {
      const isServerError =
        typeof event.status === 'number' && event.status >= 500 && event.status < 600
      // Only a 5XX, and never a limit/quota gate or a signup-required error.
      const retryable = isServerError && !event.limitType && !event.requiresSignup
      if (retryable && scheduleRetry(target, event.message)) return
      // Not retryable (or the budget is spent) — surface the terminal error and
      // reset the budget so a future, independent failure starts fresh.
      retryAttemptRef.current = 0
      setError(event.message)
      setErrorMeta(
        event.limitType
          ? { limitType: event.limitType, requiresSignup: event.requiresSignup }
          : null,
      )
    },
    [scheduleRetry],
  )

  /**
   * Cancel a pending auto-retry (user-initiated) and surface the original error
   * (via `error`) so the user sees why the turn failed.
   */
  const cancelRetry = useCallback((): void => {
    clearRetryTimers()
    const message = pendingRetryErrorRef.current
    if (message !== null) {
      setError(message)
      setErrorMeta(null)
    }
    retryAttemptRef.current = 0
    retryTargetRef.current = null
    pendingRetryErrorRef.current = null
    setRetryCountdown(null)
  }, [clearRetryTimers])

  // Clear the countdown interval on unmount so no interval ever leaks.
  useEffect(() => clearRetryTimers, [clearRetryTimers])

  // Load history on mount and restore any persisted queue / interrupted stream
  useEffect(() => {
    if (!loadOnMountRef.current) return

    // Read persisted state synchronously before the async history fetch
    const persistedQueue = loadPersistedQueue(storageKey)
    const interrupted = consumeStreamingFlag(storageKey)

    provider
      .loadHistory(config)
      .then((history) => {
        if (!mountedRef.current) return

        // Restore mode from server (persisted in conversation.aiContext.mode).
        // Idempotent + cheap, so do it regardless of store state.
        const serverMode = (provider as { lastMode?: 'plan' | 'execute' }).lastMode
        if (serverMode && serverMode !== 'execute') {
          setMode(serverMode)
          onModeChange?.(serverMode)
        }

        // Multi-conversation handling. The store is project-keyed, so we track
        // which conversation it holds and only blow it away on a GENUINE switch.
        const store = getMessageStore(storageKey)
        const endpointConvId = endpoint.match(/conversationId=([^&]+)/)?.[1]
        // A switch = the endpoint names a DIFFERENT conversation than the store
        // currently holds. A brand-new conversation that just received its id
        // (store id undefined → defined) is NOT a switch — adopt the id and keep
        // the live messages, so the in-flight discovery/plan stream isn't wiped
        // the moment the conversation is created server-side.
        const isSwitch =
          !!endpointConvId && !!store.conversationId && endpointConvId !== store.conversationId
        if (endpointConvId) store.conversationId = endpointConvId

        // Same conversation with a live/populated store (e.g. the IDE ChatPanel
        // mounting after the boot panel, or a re-render): the store is the source
        // of truth — do NOT overwrite with server history (that would wipe
        // in-flight streaming messages) and do NOT resume (the original stream is
        // still writing to the store). Hydrate + resume only when the store is
        // empty (first mount / after refresh) or on a real switch.
        if (!isSwitch && store.messages.length > 0) return

        if (history.length > 0) {
          setMessages(history)
        } else if (isSwitch) {
          // Switched to an empty conversation — clear the previous one's messages.
          setMessages([])
        }

        // Also check the provider's streaming flag — the server tells us
        // directly whether a stream is active, even if sessionStorage was lost
        const serverStreaming =
          (provider as { isServerStreaming?: boolean }).isServerStreaming === true
        const shouldResume = (interrupted || serverStreaming) && history.length > 0

        if (shouldResume) {
          // Stream was interrupted — resume into the last assistant message,
          // or create a new placeholder if the last message is from the user
          // (the server hadn't saved the assistant response yet).
          const lastMsg = history[history.length - 1]
          let resumeTarget: { id: string; content: string }

          if (lastMsg?.role === 'assistant') {
            resumeTarget = { id: lastMsg.id, content: lastMsg.content }
          } else {
            // No assistant message after the last user message — create one
            const placeholderId = `assistant-${++idCounterRef.current}`
            const placeholder: ChatMessage = {
              id: placeholderId,
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
              isStreaming: true,
              blocks: [],
            }
            setMessages((prev) => [...prev, placeholder])
            resumeTarget = { id: placeholderId, content: '' }
          }

          pendingRef.current.push(...persistedQueue)
          const target = resumeTarget
          setTimeout(() => {
            if (mountedRef.current) {
              resumeStreamRef.current(target.id, target.content)
            }
          }, 0)
        } else if (persistedQueue.length > 0) {
          const [first, ...rest] = persistedQueue
          pendingRef.current.push(...rest)
          setTimeout(() => {
            if (mountedRef.current) {
              sendMessageRef.current(first.message, first.attachments)
            }
          }, 0)
        }
      })
      .catch(() => {
        // History load failure is not critical
      })
  }, [endpoint])

  const sendMessage = useCallback(
    async (message: string, attachments?: ChatAttachment[], options?: SendMessageOptions) => {
      if (!mountedRef.current) return

      // When suppressed (ask_user responses, the post-boot kickoff), the text is
      // still sent to the server but no local user-message bubble is appended —
      // the answer is reflected in the ask_user tool card, and the server marks
      // the persisted message hidden so it never reappears on refresh.
      const suppressUserMessage = options?.suppressUserMessage === true
      // Auto-sent on the user's behalf (e.g. an auto-fix prompt): kept visible
      // but flagged so it renders in the distinct auto-sent style, not like a
      // typed user message.
      const automatic = options?.automatic === true

      const userMsg: ChatMessage = {
        id: `user-${++idCounterRef.current}`,
        role: 'user',
        content: message,
        timestamp: Date.now(),
        ...(automatic ? { automatic: true } : {}),
        ...(attachments?.length
          ? {
              attachments: attachments.map((a) => ({
                filename: a.filename,
                mediaType: a.mediaType,
                size: a.size,
              })),
            }
          : {}),
      }

      // If a request is already in-flight, mark the message as queued and defer sending
      if (sendingRef.current) {
        if (!suppressUserMessage) {
          userMsg.queued = true
          setMessages((prev) => [...prev, userMsg])
        }
        pendingRef.current.push({
          message,
          attachments,
          ...(automatic ? { automatic: true } : {}),
          ...(suppressUserMessage ? { suppressUserMessage } : { userMsgId: userMsg.id }),
        })
        persistQueue(storageKey, pendingRef.current)
        return
      }

      if (!suppressUserMessage) setMessages((prev) => [...prev, userMsg])

      // A fresh user-initiated send clears any prior stop so the reconcile path
      // works normally for this turn.
      userAbortedRef.current = false
      sendingRef.current = true
      setIsLoading(true)
      setError(null)
      setErrorMeta(null)
      // A fresh user-initiated send abandons any pending 5XX auto-retry.
      resetRetry()
      resetStatusQueue()
      setStreamingFlag(storageKey)

      let current: QueueEntry | undefined = {
        message,
        attachments,
        ...(suppressUserMessage ? { suppressUserMessage: true } : {}),
        ...(automatic ? { automatic: true } : {}),
      }

      while (current) {
        if (!mountedRef.current) break

        // Clear queued indicator now that this message is being sent
        if (current.userMsgId) {
          const uid = current.userMsgId
          setMessages((prev) => prev.map((m) => (m.id === uid ? { ...m, queued: false } : m)))
        }

        const { message: currentMsg, attachments: currentAttachments } = current

        // Create a streaming assistant message
        const assistantId = `assistant-${++idCounterRef.current}`
        let assistantText = ''
        const toolCalls: ChatMessage['toolCalls'] = []
        const blocks: MessageBlock[] = []
        let loopLimitReached: number | undefined
        // Flips true on the response's first content block — used to re-stamp the
        // message timestamp to that moment (see the re-stamp in onEvent below).
        let contentStarted = false

        const assistantMsg: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isStreaming: true,
          blocks: [],
        }

        setMessages((prev) => [...prev, assistantMsg])

        // Create a throttled flush scheduler for this streaming message.
        // High-frequency events (text, thinking) call scheduleFlush() which
        // batches into a single setMessages every 50ms. Terminal events
        // (done, error) and file_diff call flushNow() for immediate commit.
        const { scheduleFlush, flushNow } = createFlushScheduler(assistantId)

        /**
         * Build the current snapshot of all mutable streaming state.
         * @returns Partial message fields to merge.
         */
        const buildFullUpdate = (): Partial<ChatMessage> => ({
          content: assistantText,
          blocks: [...blocks],
          toolCalls: [...toolCalls!],
          ...(loopLimitReached != null ? { loopLimitReached } : {}),
        })

        // Liveness watchdog + terminal-event tracking. The server has its own
        // 120s stream timeout, but if it goes silent WITHOUT closing the
        // connection (e.g. a hung tool that emits nothing), the client would
        // spin forever. Reset a generous watchdog on every event; if it fires,
        // abort so the stream can't hang. `receivedTerminal` lets us detect a
        // stream that closed without a done/error event (→ finalize + reconcile
        // instead of an eternal spinner).
        let receivedTerminal = false
        let stalled = false
        const STALL_MS = 180_000
        let stallTimer: ReturnType<typeof setTimeout> | null = null
        const resetStall = (): void => {
          if (stallTimer) clearTimeout(stallTimer)
          stallTimer = setTimeout(() => {
            stalled = true
            try {
              provider.abort()
            } catch (_error) {
              // provider.abort() may throw when no stream is active — safe to ignore in stall watchdog
            }
          }, STALL_MS)
        }

        const onEvent = (event: ChatStreamEvent): void => {
          // NB: intentionally NOT gated on mountedRef. Events write to the
          // conversation store (setMessages/scheduleFlush), which must keep
          // filling even if this component unmounted mid-turn (e.g. boot→IDE
          // swap) — a freshly-mounted ChatPanel subscribes to the same store and
          // sees the live stream. onStreamEvent targets the parent (Workspace),
          // which stays mounted across the panel swap.
          resetStall()
          onStreamEvent?.(event)

          switch (event.type) {
            case 'text': {
              assistantText += event.content
              const last = blocks[blocks.length - 1]
              if (last?.type === 'text') {
                last.content += event.content
              } else {
                blocks.push({ type: 'text', content: event.content })
              }
              scheduleFlush(() => ({ content: assistantText, blocks: [...blocks] }))
              break
            }
            case 'tool_use': {
              // tool_use_start may have already created the entry + block — fill
              // in the final input rather than pushing a duplicate.
              const existing = toolCalls!.find((t) => t.id === event.id)
              if (existing) {
                existing.name = event.name
                existing.input = event.input
                existing.status = 'running'
              } else {
                toolCalls!.push({
                  id: event.id,
                  name: event.name,
                  input: event.input,
                  status: 'running',
                })
                blocks.push({ type: 'tool_call', id: event.id })
              }
              scheduleFlush(() => ({ toolCalls: [...toolCalls!], blocks: [...blocks] }))
              break
            }
            case 'tool_use_start': {
              // The model has begun a tool call — create its entry + block now so
              // the activity label and tool card appear immediately, before the
              // (possibly large) input finishes streaming.
              if (!toolCalls!.some((t) => t.id === event.id)) {
                toolCalls!.push({
                  id: event.id,
                  name: event.name,
                  input: undefined,
                  status: 'running',
                  streamInputChars: 0,
                })
                blocks.push({ type: 'tool_call', id: event.id })
              }
              scheduleFlush(() => ({ toolCalls: [...toolCalls!], blocks: [...blocks] }))
              break
            }
            case 'tool_input_delta': {
              // Grow the live token estimate as the tool input streams in.
              const tc = toolCalls!.find((t) => t.id === event.id)
              if (tc) {
                tc.streamInputChars = (tc.streamInputChars ?? 0) + event.chars
                // Merge display fields extracted server-side (path/name/…) so the
                // in-flight card labels with the filename before args finish.
                if (event.partialInput) {
                  tc.input = {
                    ...(tc.input as Record<string, unknown> | undefined),
                    ...event.partialInput,
                  }
                }
              }
              scheduleFlush(() => ({ toolCalls: [...toolCalls!] }))
              break
            }
            case 'tool_result':
              if (toolCalls) {
                const tc = toolCalls.find((t) => t.id === event.id)
                if (tc) {
                  tc.output = event.output
                  tc.status = 'done'
                }
              }
              scheduleFlush(() => ({ toolCalls: [...toolCalls!] }))
              break
            case 'file_diff': {
              // Attach snapshot to the matching running tool call (for persistent diff review)
              // Normalize paths — strip /workspace/ prefix so resolved and raw paths match
              const normalizePath = (p: string): string => p.replace(/^\/workspace\//, '')
              const match = [...(toolCalls ?? [])]
                .reverse()
                .find(
                  (t) =>
                    (t.name === 'write_file' || t.name === 'edit_file') &&
                    normalizePath((t.input as { path?: string })?.path ?? '') ===
                      normalizePath(event.path),
                )
              if (match) {
                match.fileDiff = { original: event.oldContent ?? '', modified: event.newContent }
                // Schedule (not flushNow) — Monaco updates happen independently
                // via onFileChange below. Batching here avoids per-file React
                // re-renders that accumulate during rapid AI file writes.
                scheduleFlush(() => ({ toolCalls: [...toolCalls!] }))
              }
              // Auto-delete queued autofix messages that reference this file
              clearQueuedForFileRef.current(event.path)
              // Notify host so open editor tabs can be refreshed
              onFileChange?.(event.path, event.newContent)
              break
            }
            case 'commit_suggestion':
              scheduleFlush(() => ({
                commitSuggestion: {
                  files: event.files,
                  status: 'pending' as const,
                },
              }))
              break
            case 'verification_result':
              blocks.push({
                type: 'verification',
                status: event.status,
                ...(event.output ? { output: event.output } : {}),
                workspaces: event.workspaces,
                ...(event.categories ? { categories: event.categories } : {}),
              })
              scheduleFlush(() => ({ blocks: [...blocks] }))
              break
            case 'resource_limit':
              blocks.push({
                type: 'resource_limit',
                resource: event.resource,
                message: event.message,
              })
              scheduleFlush(() => ({ blocks: [...blocks] }))
              break
            case 'compaction':
              blocks.push({
                type: 'text',
                content: `**Context compacted** — ${event.compactedCount} older messages were summarized to free space.\n\n${event.summary}`,
              })
              scheduleFlush(() => ({ content: assistantText, blocks: [...blocks] }))
              break
            case 'loop_limit_reached':
              loopLimitReached = event.maxLoops
              scheduleFlush(() => ({ loopLimitReached: event.maxLoops }))
              break
            case 'done':
              receivedTerminal = true
              // A clean finish ends the incident — reset the 5XX retry budget.
              retryAttemptRef.current = 0
              // Flush immediately — commit final state and clear streaming flag
              flushNow(() => ({ ...buildFullUpdate(), isStreaming: false }))
              break
            case 'error':
              receivedTerminal = true
              // A 5XX backend error auto-retries (resume where we left off) behind
              // a cancelable countdown instead of surfacing a terminal error;
              // handleStreamError decides. Either way, finalize the partial turn.
              handleStreamError(event, { id: assistantId, content: assistantText })
              // Flush immediately — commit final state and clear streaming flag
              flushNow(() => ({ ...buildFullUpdate(), isStreaming: false }))
              break
            case 'thinking': {
              const lastBlock = blocks[blocks.length - 1] as
                | (MessageBlock & { _startedAt?: number; durationMs?: number })
                | undefined
              if (lastBlock?.type === 'thinking') {
                lastBlock.content += event.content
                lastBlock.durationMs = Date.now() - (lastBlock._startedAt ?? Date.now())
              } else {
                const now = Date.now()
                blocks.push(
                  Object.assign(
                    { type: 'thinking' as const, content: event.content, durationMs: 0 },
                    { _startedAt: now },
                  ),
                )
              }
              scheduleFlush(() => ({ blocks: [...blocks] }))
              break
            }
            case 'mode':
              setMode(event.mode)
              onModeChange?.(event.mode)
              // Entering execute mode → drop an INLINE "Building your app" marker at
              // this exact point in the stream (a block, not a floating card), so it
              // sits between the plan output and the build output.
              if (event.mode === 'execute' && lastPhaseModeRef.current !== 'execute') {
                blocks.push({ type: 'phase_marker', mode: 'execute' })
                scheduleFlush(() => ({ blocks: [...blocks] }))
              }
              lastPhaseModeRef.current = event.mode
              break
            case 'model': {
              // Model changed (e.g. planner → executor) → inline "Now using X" marker.
              // Only on an actual change from a previously-seen model (not the first).
              const modelLabel = event.label || event.model
              if (
                modelLabel &&
                lastPhaseModelRef.current &&
                lastPhaseModelRef.current !== modelLabel
              ) {
                blocks.push({ type: 'phase_marker', model: modelLabel })
                scheduleFlush(() => ({ blocks: [...blocks] }))
              }
              if (modelLabel) lastPhaseModelRef.current = modelLabel
              break
            }
            case 'status':
              enqueueStatus(event.label)
              break
            case 'conversation':
              onConversationId?.(event.id)
              break
            default:
              break
          }

          // Anchor the message's timeline position to when its CONTENT begins, not to
          // the empty placeholder created at turn-start (which shares the user
          // message's timestamp). A turn's preamble cards — "Building your app", the
          // model / "loaded N skills" notices, the onboarding tip — are all emitted
          // AFTER the placeholder but BEFORE the response content; re-stamping once
          // here lets them sort ABOVE the streamed response instead of below the whole
          // block. While still empty the message already sorts last (see
          // timelineSortKey), so this re-stamp keeps it last and never reorders.
          if (!contentStarted && blocks.length > 0) {
            contentStarted = true
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, timestamp: Date.now() } : m)),
            )
          }
        }

        resetStall()
        let resolvedCleanly = false
        // Per-send config carries the intent flags to the server so it can tag
        // the persisted message (hidden / automatic). config holds the stable
        // endpoint + projectId; spread the per-message flags on top.
        const sendConfig: ChatConfig = {
          ...config,
          ...(current.suppressUserMessage ? { suppressUserMessage: true } : {}),
          ...(current.automatic ? { automatic: true } : {}),
        }
        try {
          await provider.sendMessage(currentMsg, sendConfig, onEvent, currentAttachments)
          resolvedCleanly = true
        } catch (err) {
          if (mountedRef.current) {
            const msg = stalled
              ? t(
                  'chat.error.stalled',
                  { agentName },
                  {
                    defaultValue:
                      '{{agentName}} stopped responding. It may still be finishing in the background — reload to see the latest, or send a new message.',
                  },
                )
              : err instanceof Error
                ? err.message
                : t('chat.error.sendFailed', undefined, { defaultValue: 'Failed to send message' })
            setError(msg)
            // Flush immediately on catch — stream is over
            flushNow(() => ({ ...buildFullUpdate(), isStreaming: false }))
          }
        } finally {
          if (stallTimer) clearTimeout(stallTimer)
        }

        // Stream closed WITHOUT a terminal (done/error) event — e.g. the server
        // hit its own timeout and ended the connection without a final `done`,
        // or the connection dropped. Finalize so the spinner can't hang, then
        // reconcile with the server's persisted state: the turn has usually
        // completed (and persisted) server-side even though we lost the stream,
        // so reloading history surfaces the real result instead of a blank,
        // forever-spinning placeholder.
        //
        // EXCEPT on a user Stop (userAbortedRef): the abort() callback already
        // finalized this message with every streamed char + tool card kept. The
        // server is still persisting the partial turn, so a reload here can race
        // ahead of that write and momentarily replace the streamed content with
        // stale history (C4 — the bug where stopping wiped the chat until a
        // refresh). Trust the local finalization; a later manual reload reconciles.
        if (mountedRef.current && resolvedCleanly && !receivedTerminal && !userAbortedRef.current) {
          flushNow(() => ({ ...buildFullUpdate(), isStreaming: false }))
          try {
            const history = await provider.loadHistory(config)
            if (mountedRef.current && history.length > 0) setMessages(history)
          } catch (_error) {
            // Best-effort reconciliation — the finalized placeholder is already shown; dropping history here is safe
          }
        }

        // Drain the queue: send next pending message, clearing any prior error
        current = pendingRef.current.shift()
        if (current) {
          setError(null)
          setErrorMeta(null)
          persistQueue(storageKey, pendingRef.current)
        }
      }

      sendingRef.current = false
      setIsLoading(false)
      // During page refresh the browser aborts the fetch which unblocks this
      // code path. Skip clearing so the streaming flag survives for resume.
      if (!unloadingRef.current) {
        clearStreamingFlag(storageKey)
        persistQueue(storageKey, [])
      }
    },
    [provider, endpoint, agentName],
  )

  // Resume an interrupted stream after a page refresh. Two phases:
  // 1. Poll history until the server finishes the old request (lock clears)
  // 2. Send a resume request that continues the AI response with real streaming
  const resumeStream = useCallback(
    async (resumeId: string, existingContent: string) => {
      if (!mountedRef.current || sendingRef.current) return

      // Show the spinner on the last assistant message immediately
      setMessages((prev) => prev.map((m) => (m.id === resumeId ? { ...m, isStreaming: true } : m)))

      sendingRef.current = true
      setIsLoading(true)
      setError(null)
      setErrorMeta(null)
      resetStatusQueue()
      setStreamingFlag(storageKey)

      // ── Phase 1: wait for the server to finish the old request ────────
      const POLL_INTERVAL = 1000
      const MAX_POLLS = 300
      const streamingProvider = provider as { isServerStreaming?: boolean }

      for (let i = 0; i < MAX_POLLS; i++) {
        if (!mountedRef.current || !sendingRef.current) break

        await new Promise((r) => setTimeout(r, POLL_INTERVAL))
        if (!mountedRef.current || !sendingRef.current) break

        try {
          const history = await provider.loadHistory(config)
          if (!mountedRef.current) break

          // Update displayed messages while keeping the spinner
          if (history.length > 0) {
            setMessages(history.map((m) => (m.id === resumeId ? { ...m, isStreaming: true } : m)))
            // Track content for phase 2
            const updated =
              history.find((m) => m.id === resumeId) ??
              [...history].reverse().find((m) => m.role === 'assistant')
            if (updated) existingContent = updated.content
          }

          if (streamingProvider.isServerStreaming === false) break
        } catch (_error) {
          // loadHistory failure during resume poll — keep polling until MAX_POLLS
        }
      }

      if (!mountedRef.current || !sendingRef.current) {
        sendingRef.current = false
        setIsLoading(false)
        setMessages((prev) =>
          prev.map((m) => (m.id === resumeId ? { ...m, isStreaming: false } : m)),
        )
        return
      }

      // ── Phase 2: send a resume request with full SSE streaming ────────
      // Same event handler as sendMessage but targeting the existing message.
      let assistantText = existingContent
      const toolCalls: ChatMessage['toolCalls'] = []
      const blocks: MessageBlock[] = []
      let loopLimitReached: number | undefined

      // Seed blocks with a text block for the existing content so new text
      // appends correctly and new tool_use/thinking blocks interleave properly.
      if (existingContent) {
        blocks.push({ type: 'text', content: existingContent })
      }

      // Create a throttled flush scheduler for the resumed streaming message
      const { scheduleFlush, flushNow } = createFlushScheduler(resumeId)

      /**
       * Build the current snapshot of all mutable streaming state.
       * @returns Partial message fields to merge.
       */
      const buildFullUpdate = (): Partial<ChatMessage> => ({
        content: assistantText,
        blocks: [...blocks],
        toolCalls: [...toolCalls!],
        ...(loopLimitReached != null ? { loopLimitReached } : {}),
      })

      const onEvent = (event: ChatStreamEvent): void => {
        // Not gated on mountedRef — see the sendMessage onEvent above. The resumed
        // stream writes to the conversation store and must survive a remount too.
        // Forward to the parent (like the sendMessage handler) so client_action and
        // other side-effect events also fire during a resumed/auto-continued turn.
        onStreamEvent?.(event)
        switch (event.type) {
          case 'text': {
            assistantText += event.content
            const last = blocks[blocks.length - 1]
            if (last?.type === 'text') {
              last.content += event.content
            } else {
              blocks.push({ type: 'text', content: event.content })
            }
            scheduleFlush(() => ({ content: assistantText, blocks: [...blocks] }))
            break
          }
          case 'tool_use': {
            // tool_use_start may have already created the entry + block — fill in
            // the final input rather than pushing a duplicate.
            const existing = toolCalls!.find((t) => t.id === event.id)
            if (existing) {
              existing.name = event.name
              existing.input = event.input
              existing.status = 'running'
            } else {
              toolCalls!.push({
                id: event.id,
                name: event.name,
                input: event.input,
                status: 'running',
              })
              blocks.push({ type: 'tool_call', id: event.id })
            }
            scheduleFlush(() => ({ toolCalls: [...toolCalls!], blocks: [...blocks] }))
            break
          }
          case 'tool_use_start': {
            // The model has begun a tool call — create its entry + block now so
            // the activity label and tool card appear immediately.
            if (!toolCalls!.some((t) => t.id === event.id)) {
              toolCalls!.push({
                id: event.id,
                name: event.name,
                input: undefined,
                status: 'running',
                streamInputChars: 0,
              })
              blocks.push({ type: 'tool_call', id: event.id })
            }
            scheduleFlush(() => ({ toolCalls: [...toolCalls!], blocks: [...blocks] }))
            break
          }
          case 'tool_input_delta': {
            // Grow the live token estimate as the tool input streams in.
            const tc = toolCalls!.find((t) => t.id === event.id)
            if (tc) {
              tc.streamInputChars = (tc.streamInputChars ?? 0) + event.chars
              // Merge display fields extracted server-side (path/name/…) so the
              // in-flight card labels with the filename before args finish.
              if (event.partialInput) {
                tc.input = {
                  ...(tc.input as Record<string, unknown> | undefined),
                  ...event.partialInput,
                }
              }
            }
            scheduleFlush(() => ({ toolCalls: [...toolCalls!] }))
            break
          }
          case 'tool_result':
            if (toolCalls) {
              const tc = toolCalls.find((t) => t.id === event.id)
              if (tc) {
                tc.output = event.output
                tc.status = 'done'
              }
            }
            scheduleFlush(() => ({ toolCalls: [...toolCalls!] }))
            break
          case 'file_diff': {
            const normalizePath = (p: string): string => p.replace(/^\/workspace\//, '')
            const match = [...(toolCalls ?? [])]
              .reverse()
              .find(
                (t) =>
                  (t.name === 'write_file' || t.name === 'edit_file') &&
                  normalizePath((t.input as { path?: string })?.path ?? '') ===
                    normalizePath(event.path),
              )
            if (match) {
              match.fileDiff = { original: event.oldContent ?? '', modified: event.newContent }
              scheduleFlush(() => ({ toolCalls: [...toolCalls!] }))
            }
            // Auto-delete queued autofix messages that reference this file
            clearQueuedForFileRef.current(event.path)
            onFileChange?.(event.path, event.newContent)
            break
          }
          case 'commit_suggestion':
            scheduleFlush(() => ({
              commitSuggestion: {
                files: event.files,
                status: 'pending' as const,
              },
            }))
            break
          case 'verification_result':
            blocks.push({
              type: 'verification',
              status: event.status,
              ...(event.output ? { output: event.output } : {}),
              workspaces: event.workspaces,
              ...(event.categories ? { categories: event.categories } : {}),
            })
            scheduleFlush(() => ({ blocks: [...blocks] }))
            break
          case 'resource_limit':
            blocks.push({
              type: 'resource_limit',
              resource: event.resource,
              message: event.message,
            })
            scheduleFlush(() => ({ blocks: [...blocks] }))
            break
          case 'compaction':
            blocks.push({
              type: 'text',
              content: `> **Context compacted** — ${event.compactedCount} older messages were summarized to free space. The AI retains a summary of the compacted history.`,
            })
            scheduleFlush(() => ({ blocks: [...blocks] }))
            break
          case 'loop_limit_reached':
            loopLimitReached = event.maxLoops
            scheduleFlush(() => ({ loopLimitReached: event.maxLoops }))
            break
          case 'done':
            // A clean finish ends the incident — reset the 5XX retry budget.
            retryAttemptRef.current = 0
            // Flush immediately — commit final state and clear streaming flag
            flushNow(() => ({ ...buildFullUpdate(), isStreaming: false }))
            break
          case 'error':
            // A 5XX during a resume re-arms the backoff up to the attempt cap;
            // anything else surfaces. resumeId is the message we resume into.
            handleStreamError(event, { id: resumeId, content: assistantText })
            // Flush immediately — commit final state and clear streaming flag
            flushNow(() => ({ ...buildFullUpdate(), isStreaming: false }))
            break
          case 'thinking': {
            const lastBlock = blocks[blocks.length - 1] as
              | (MessageBlock & { _startedAt?: number; durationMs?: number })
              | undefined
            if (lastBlock?.type === 'thinking') {
              lastBlock.content += event.content
              lastBlock.durationMs = Date.now() - (lastBlock._startedAt ?? Date.now())
            } else {
              const now = Date.now()
              blocks.push(
                Object.assign(
                  { type: 'thinking' as const, content: event.content, durationMs: 0 },
                  { _startedAt: now },
                ),
              )
            }
            scheduleFlush(() => ({ blocks: [...blocks] }))
            break
          }
          case 'mode':
            setMode(event.mode)
            onModeChange?.(event.mode)
            break
          case 'status':
            enqueueStatus(event.label)
            break
          case 'conversation':
            onConversationId?.(event.id)
            break
          default:
            break
        }
      }

      try {
        await provider.sendMessage('', { ...config, resume: true }, onEvent)
      } catch (err) {
        if (mountedRef.current) {
          const msg =
            err instanceof Error
              ? err.message
              : t('chat.error.sendFailed', undefined, { defaultValue: 'Failed to send message' })
          setError(msg)
          // Flush immediately on catch — stream is over
          flushNow(() => ({ ...buildFullUpdate(), isStreaming: false }))
        }
      }

      // Drain any queued user messages
      let current = pendingRef.current.shift()
      while (current) {
        if (!mountedRef.current) break
        setError(null)
        setErrorMeta(null)
        persistQueue(storageKey, pendingRef.current)
        sendingRef.current = false
        await sendMessageRef.current(current.message, current.attachments)
        current = pendingRef.current.shift()
      }

      sendingRef.current = false
      setIsLoading(false)
      if (!unloadingRef.current) {
        clearStreamingFlag(storageKey)
        persistQueue(storageKey, [])
      }
    },
    [provider, endpoint],
  )

  // Keep refs in sync so the history-load effect can call the latest functions
  sendMessageRef.current = sendMessage
  resumeStreamRef.current = resumeStream

  const abort = useCallback(() => {
    // Mark this as a user Stop so the in-flight send's reconcile path leaves the
    // locally-finalized streamed content alone (see the reconcile guard above).
    userAbortedRef.current = true
    // Stop means the user took over — cancel any pending 5XX auto-retry + timers.
    resetRetry()
    try {
      provider.abort()
    } catch (_error) {
      // provider.abort() may throw when no stream is active — safe to ignore on user-initiated abort
    }
    // Also kill the server-side stream so it doesn't continue running
    const p = provider as { abortOnServer?: (config: ChatConfig, cid?: string) => void }
    p.abortOnServer?.({ endpoint, projectId }, undefined)
    // Apply the last throttled delta (the up-to-50ms of text/tool progress that
    // hadn't flushed yet) BEFORE finalizing, so Stop keeps every streamed char —
    // not just whatever landed in the previous flush window.
    if (flushTimerRef.current !== null) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }
    pendingFlushFnRef.current?.()
    pendingFlushFnRef.current = null
    pendingRef.current.length = 0
    sendingRef.current = false
    clearStreamingFlag(storageKey)
    persistQueue(storageKey, [])
    setIsLoading(false)
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false, aborted: true } : m)),
    )
  }, [provider, endpoint, projectId, storageKey])

  const clearHistory = useCallback(async () => {
    pendingRef.current.length = 0
    // Drop any pending 5XX auto-retry — the conversation is being cleared.
    resetRetry()
    clearStreamingFlag(storageKey)
    persistQueue(storageKey, [])
    await provider.clearHistory(config)
    if (mountedRef.current) {
      setMessages([])
      setError(null)
      setErrorMeta(null)
    }
  }, [provider, endpoint])

  const editQueuedMessage = useCallback(
    (msgId: string, newContent: string) => {
      const entry = pendingRef.current.find((e) => e.userMsgId === msgId)
      if (entry) {
        entry.message = newContent
        persistQueue(storageKey, pendingRef.current)
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId && m.queued ? { ...m, content: newContent } : m)),
      )
    },
    [storageKey],
  )

  const deleteQueuedMessage = useCallback(
    (msgId: string) => {
      pendingRef.current = pendingRef.current.filter((e) => e.userMsgId !== msgId)
      persistQueue(storageKey, pendingRef.current)
      setMessages((prev) => prev.filter((m) => !(m.id === msgId && m.queued)))
    },
    [storageKey],
  )

  /**
   * Remove queued auto-fix messages whose content references the given file path.
   * Called automatically when the AI writes to a file (file_diff event) and can
   * also be called externally when the user edits a file in the editor.
   */
  const clearQueuedForFile = useCallback(
    (filePath: string) => {
      const norm = filePath.replace(/^\/workspace\//, '')
      const toRemove = pendingRef.current.filter(
        (e) => e.message.startsWith(AUTOFIX_PREFIX) && e.message.includes(norm),
      )
      if (toRemove.length === 0) return
      const removeIds = new Set(toRemove.map((e) => e.userMsgId))
      pendingRef.current = pendingRef.current.filter((e) => !removeIds.has(e.userMsgId))
      persistQueue(storageKey, pendingRef.current)
      setMessages((prev) => prev.filter((m) => !(m.queued && removeIds.has(m.id))))
    },
    [storageKey],
  )

  // Sync clearQueuedForFile ref so stream event handlers can call the latest version
  clearQueuedForFileRef.current = clearQueuedForFile

  const exposedSetMode = useCallback(
    (newMode: 'plan' | 'execute') => {
      setMode(newMode)
      onModeChange?.(newMode)
    },
    [onModeChange],
  )

  return {
    messages,
    isLoading,
    error,
    errorMeta,
    mode,
    streamingStatus,
    retryCountdown,
    setMode: exposedSetMode,
    sendMessage,
    abort,
    cancelRetry,
    clearHistory,
    editQueuedMessage,
    deleteQueuedMessage,
    clearQueuedForFile,
  }
}
