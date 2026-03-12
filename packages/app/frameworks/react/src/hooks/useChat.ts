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
  const { endpoint, projectId, loadOnMount = true, onFileChange, onModeChange } = options
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'plan' | 'execute'>('execute')
  const mountedRef = useRef(true)
  const idCounterRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const config: ChatConfig = {
    endpoint,
    projectId,
  }

  // Load history on mount
  useEffect(() => {
    if (!loadOnMount) return
    provider
      .loadHistory(config)
      .then((history) => {
        if (mountedRef.current && history.length > 0) {
          setMessages(history)
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

      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)
      setError(null)

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
                prev.map((m) => (m.id === assistantId ? { ...m, toolCalls: [...toolCalls!] } : m)),
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
            setIsLoading(false)
            break
          case 'error':
            setError(event.message)
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
            )
            setIsLoading(false)
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
          default:
            break
        }
      }

      try {
        await provider.sendMessage(message, config, onEvent, attachments)
      } catch (err) {
        if (mountedRef.current) {
          const msg =
            err instanceof Error
              ? err.message
              : t('chat.error.sendFailed', undefined, { defaultValue: 'Failed to send message' })
          setError(msg)
          setIsLoading(false)
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
          )
        }
      }
    },
    [provider, endpoint],
  )

  const abort = useCallback(() => {
    provider.abort()
    setIsLoading(false)
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false, aborted: true } : m)),
    )
  }, [provider])

  const clearHistory = useCallback(async () => {
    await provider.clearHistory(config)
    if (mountedRef.current) {
      setMessages([])
      setError(null)
    }
  }, [provider, endpoint])

  return { messages, isLoading, error, mode, sendMessage, abort, clearHistory }
}
