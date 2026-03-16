/**
 * React hook for AI chat provider.
 *
 * @module
 */

import { useCallback, useContext, useEffect, useRef, useState } from 'react'

import type {
  ChatAttachment,
  ChatConfig,
  ChatMessage,
  ChatProvider,
  ChatStreamEvent,
  MessageBlock,
} from '@molecule/app-ai-chat'
import { t } from '@molecule/app-i18n'

import { ChatContext } from '../contexts.js'
import type { UseChatOptions, UseChatResult } from '../types.js'

// ── Session persistence helpers ──────────────────────────────────────────────
// Persist the message queue and streaming state to sessionStorage so that
// queued messages survive a page refresh and interrupted streams auto-resume.

const STORAGE_PREFIX = 'mol-chat-'

type QueueEntry = { message: string; attachments?: ChatAttachment[]; userMsgId?: string }

/** Persist the pending message queue for a project. */
function persistQueue(projectId: string, queue: QueueEntry[]): void {
  try {
    if (queue.length > 0) {
      sessionStorage.setItem(`${STORAGE_PREFIX}queue-${projectId}`, JSON.stringify(queue))
    } else {
      sessionStorage.removeItem(`${STORAGE_PREFIX}queue-${projectId}`)
    }
  } catch {
    // sessionStorage unavailable (SSR, private browsing quota exceeded)
  }
}

/** Load and clear the persisted queue for a project. */
function loadPersistedQueue(projectId: string): QueueEntry[] {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}queue-${projectId}`)
    if (raw) {
      sessionStorage.removeItem(`${STORAGE_PREFIX}queue-${projectId}`)
      return JSON.parse(raw) as QueueEntry[]
    }
  } catch {
    // Ignore parse errors or unavailable storage
  }
  return []
}

/** Mark a project as actively streaming. */
function setStreamingFlag(projectId: string): void {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}streaming-${projectId}`, '1')
  } catch {
    // Ignore
  }
}

/** Clear the streaming flag for a project. */
function clearStreamingFlag(projectId: string): void {
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}streaming-${projectId}`)
  } catch {
    // Ignore
  }
}

/** Check and clear the streaming flag — returns true if a stream was interrupted. */
function consumeStreamingFlag(projectId: string): boolean {
  try {
    const val = sessionStorage.getItem(`${STORAGE_PREFIX}streaming-${projectId}`)
    sessionStorage.removeItem(`${STORAGE_PREFIX}streaming-${projectId}`)
    return val === '1'
  } catch {
    return false
  }
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
    loadOnMount = true,
    onFileChange,
    onModeChange,
    onConversationId,
  } = options
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'plan' | 'execute'>('execute')
  const mountedRef = useRef(true)
  const idCounterRef = useRef(0)
  // Capture loadOnMount at mount time — prevents mid-session flips
  // (e.g. initialMessage consumed → loadOnMount becomes true → history
  // load overwrites streaming messages).
  const loadOnMountRef = useRef(loadOnMount)
  // Stable key for sessionStorage — falls back to 'default' when projectId is unset
  const storageKey = projectId ?? 'default'
  // Queue for messages sent while a request is already in-flight
  const sendingRef = useRef(false)
  const pendingRef = useRef<QueueEntry[]>([])
  // Stable ref to the latest sendMessage so effects can call it without dep issues
  const sendMessageRef = useRef<(message: string, attachments?: ChatAttachment[]) => Promise<void>>(
    () => Promise.resolve(),
  )

  // Track page unload so the streaming flag isn't cleared during refresh.
  // On refresh the browser aborts the in-flight fetch, which causes the
  // sendMessage while-loop to exit and run cleanup — clearing the flag
  // before the new page can read it. beforeunload fires synchronously
  // before the abort microtask, so the ref is set in time.
  const unloadingRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    const onBeforeUnload = (): void => {
      unloadingRef.current = true
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      mountedRef.current = false
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [])

  const config: ChatConfig = {
    endpoint,
    projectId,
  }

  // Ref for the resume function so the mount effect can call it.
  // Accepts the assistant message ID to resume into (avoids state timing issues).
  const resumeStreamRef = useRef<(assistantId: string, existingContent: string) => Promise<void>>(
    () => Promise.resolve(),
  )

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
        if (history.length > 0) {
          setMessages(history)
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
    async (message: string, attachments?: ChatAttachment[]) => {
      if (!mountedRef.current) return

      const userMsg: ChatMessage = {
        id: `user-${++idCounterRef.current}`,
        role: 'user',
        content: message,
        timestamp: Date.now(),
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
        userMsg.queued = true
        setMessages((prev) => [...prev, userMsg])
        pendingRef.current.push({ message, attachments, userMsgId: userMsg.id })
        persistQueue(storageKey, pendingRef.current)
        return
      }

      setMessages((prev) => [...prev, userMsg])

      sendingRef.current = true
      setIsLoading(true)
      setError(null)
      setStreamingFlag(storageKey)

      let current: QueueEntry | undefined = {
        message,
        attachments,
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

        const assistantMsg: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isStreaming: true,
          blocks: [],
        }

        setMessages((prev) => [...prev, assistantMsg])

        const onEvent = (event: ChatStreamEvent): void => {
          if (!mountedRef.current) return

          switch (event.type) {
            case 'text': {
              assistantText += event.content
              const last = blocks[blocks.length - 1]
              if (last?.type === 'text') {
                last.content += event.content
              } else {
                blocks.push({ type: 'text', content: event.content })
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: assistantText, blocks: [...blocks] } : m,
                ),
              )
              break
            }
            case 'tool_use':
              toolCalls!.push({
                id: event.id,
                name: event.name,
                input: event.input,
                status: 'running',
              })
              blocks.push({ type: 'tool_call', id: event.id })
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, toolCalls: [...toolCalls!], blocks: [...blocks] }
                    : m,
                ),
              )
              break
            case 'tool_result':
              if (toolCalls) {
                const tc = toolCalls.find((t) => t.id === event.id)
                if (tc) {
                  tc.output = event.output
                  tc.status = 'done'
                }
              }
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, toolCalls: [...toolCalls!] } : m)),
              )
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
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, toolCalls: [...toolCalls!] } : m,
                  ),
                )
              }
              // Notify host so open editor tabs can be refreshed
              onFileChange?.(event.path, event.newContent)
              break
            }
            case 'commit_suggestion':
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        commitSuggestion: {
                          files: event.files,
                          status: 'pending' as const,
                        },
                      }
                    : m,
                ),
              )
              break
            case 'loop_limit_reached':
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, loopLimitReached: event.maxLoops } : m,
                ),
              )
              break
            case 'done':
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
              )
              break
            case 'error':
              setError(event.message)
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
              )
              break
            case 'thinking': {
              const lastBlock = blocks[blocks.length - 1]
              if (lastBlock?.type === 'thinking') {
                lastBlock.content += event.content
              } else {
                blocks.push({ type: 'thinking', content: event.content })
              }
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, blocks: [...blocks] } : m)),
              )
              break
            }
            case 'mode':
              setMode(event.mode)
              onModeChange?.(event.mode)
              break
            case 'conversation':
              onConversationId?.(event.id)
              break
            default:
              break
          }
        }

        try {
          await provider.sendMessage(currentMsg, config, onEvent, currentAttachments)
        } catch (err) {
          if (mountedRef.current) {
            const msg =
              err instanceof Error
                ? err.message
                : t('chat.error.sendFailed', undefined, { defaultValue: 'Failed to send message' })
            setError(msg)
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
            )
          }
        }

        // Drain the queue: send next pending message, clearing any prior error
        current = pendingRef.current.shift()
        if (current) {
          setError(null)
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
    [provider, endpoint],
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
      setStreamingFlag(storageKey)

      // ── Phase 1: wait for the server to finish the old request ────────
      const POLL_INTERVAL = 1000
      const MAX_POLLS = 300
      const streamingProvider = provider as { isServerStreaming?: boolean }

      for (let i = 0; i < MAX_POLLS; i++) {
        if (!mountedRef.current) break

        await new Promise((r) => setTimeout(r, POLL_INTERVAL))
        if (!mountedRef.current) break

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
        } catch {
          // loadHistory failure — keep polling
        }
      }

      if (!mountedRef.current) {
        sendingRef.current = false
        return
      }

      // ── Phase 2: send a resume request with full SSE streaming ────────
      // Same event handler as sendMessage but targeting the existing message.
      let assistantText = existingContent
      const toolCalls: ChatMessage['toolCalls'] = []
      const blocks: MessageBlock[] = []

      // Seed blocks with a text block for the existing content so new text
      // appends correctly and new tool_use/thinking blocks interleave properly.
      if (existingContent) {
        blocks.push({ type: 'text', content: existingContent })
      }

      const onEvent = (event: ChatStreamEvent): void => {
        if (!mountedRef.current) return

        switch (event.type) {
          case 'text': {
            assistantText += event.content
            const last = blocks[blocks.length - 1]
            if (last?.type === 'text') {
              last.content += event.content
            } else {
              blocks.push({ type: 'text', content: event.content })
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === resumeId ? { ...m, content: assistantText, blocks: [...blocks] } : m,
              ),
            )
            break
          }
          case 'tool_use':
            toolCalls!.push({
              id: event.id,
              name: event.name,
              input: event.input,
              status: 'running',
            })
            blocks.push({ type: 'tool_call', id: event.id })
            setMessages((prev) =>
              prev.map((m) =>
                m.id === resumeId ? { ...m, toolCalls: [...toolCalls!], blocks: [...blocks] } : m,
              ),
            )
            break
          case 'tool_result':
            if (toolCalls) {
              const tc = toolCalls.find((t) => t.id === event.id)
              if (tc) {
                tc.output = event.output
                tc.status = 'done'
              }
            }
            setMessages((prev) =>
              prev.map((m) => (m.id === resumeId ? { ...m, toolCalls: [...toolCalls!] } : m)),
            )
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
              setMessages((prev) =>
                prev.map((m) => (m.id === resumeId ? { ...m, toolCalls: [...toolCalls!] } : m)),
              )
            }
            onFileChange?.(event.path, event.newContent)
            break
          }
          case 'commit_suggestion':
            setMessages((prev) =>
              prev.map((m) =>
                m.id === resumeId
                  ? {
                      ...m,
                      commitSuggestion: {
                        files: event.files,
                        status: 'pending' as const,
                      },
                    }
                  : m,
              ),
            )
            break
          case 'loop_limit_reached':
            setMessages((prev) =>
              prev.map((m) => (m.id === resumeId ? { ...m, loopLimitReached: event.maxLoops } : m)),
            )
            break
          case 'done':
            setMessages((prev) =>
              prev.map((m) => (m.id === resumeId ? { ...m, isStreaming: false } : m)),
            )
            break
          case 'error':
            setError(event.message)
            setMessages((prev) =>
              prev.map((m) => (m.id === resumeId ? { ...m, isStreaming: false } : m)),
            )
            break
          case 'thinking': {
            const lastBlock = blocks[blocks.length - 1]
            if (lastBlock?.type === 'thinking') {
              lastBlock.content += event.content
            } else {
              blocks.push({ type: 'thinking', content: event.content })
            }
            setMessages((prev) =>
              prev.map((m) => (m.id === resumeId ? { ...m, blocks: [...blocks] } : m)),
            )
            break
          }
          case 'mode':
            setMode(event.mode)
            onModeChange?.(event.mode)
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
          setMessages((prev) =>
            prev.map((m) => (m.id === resumeId ? { ...m, isStreaming: false } : m)),
          )
        }
      }

      // Drain any queued user messages
      let current = pendingRef.current.shift()
      while (current) {
        if (!mountedRef.current) break
        setError(null)
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
    provider.abort()
    pendingRef.current.length = 0
    sendingRef.current = false
    clearStreamingFlag(storageKey)
    persistQueue(storageKey, [])
    setIsLoading(false)
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false, aborted: true } : m)),
    )
  }, [provider, storageKey])

  const clearHistory = useCallback(async () => {
    pendingRef.current.length = 0
    clearStreamingFlag(storageKey)
    persistQueue(storageKey, [])
    await provider.clearHistory(config)
    if (mountedRef.current) {
      setMessages([])
      setError(null)
    }
  }, [provider, endpoint])

  return { messages, isLoading, error, mode, sendMessage, abort, clearHistory }
}
