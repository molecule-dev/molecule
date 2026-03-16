/**
 * HTTP/SSE AI chat provider implementation.
 *
 * Sends messages to the backend API and parses SSE streams
 * to deliver real-time AI responses.
 *
 * @module
 */

import type {
  ChatAttachment,
  ChatConfig,
  ChatEventHandler,
  ChatMessage,
  ChatProvider,
  ChatStreamEvent,
} from '@molecule/app-ai-chat'
import { t } from '@molecule/app-i18n'

import type { HttpChatConfig } from './types.js'

/**
 * HTTP/SSE-based implementation of `ChatProvider`. Sends messages via POST to a backend
 * endpoint and reads SSE (Server-Sent Events) streams for real-time AI responses.
 */
export class HttpChatProvider implements ChatProvider {
  readonly name = 'http'
  private config: HttpChatConfig
  private abortController: AbortController | null = null

  /**
   * Whether the server reported an active stream for the conversation
   * on the last `loadHistory` call. Used by the client to decide whether
   * to poll for updates after a page refresh.
   */
  isServerStreaming = false

  /** Maximum number of retries for HTTP 409 (server-side lock not yet released). */
  private static readonly CONFLICT_MAX_RETRIES = 10

  /** Base delay in ms between 409 retries (doubled each attempt). */
  private static readonly CONFLICT_BASE_DELAY = 500

  constructor(config: HttpChatConfig = {}) {
    this.config = config
  }

  /**
   * Sends a chat message to the backend and streams back SSE events.
   * @param message - The user message text.
   * @param config - Chat configuration including the API endpoint and model.
   * @param onEvent - Callback invoked for each SSE event (content chunks, errors, done signals).
   * @param attachments - Optional file attachments (images, PDFs, audio, video) as base64.
   */
  async sendMessage(
    message: string,
    config: ChatConfig,
    onEvent: ChatEventHandler,
    attachments?: ChatAttachment[],
  ): Promise<void> {
    // Abort any previous in-flight request before starting a new one.
    // Prevents stale streaming events from corrupting state when called concurrently
    // (e.g., React StrictMode double-mount or rapid message sends).
    this.abortController?.abort()
    this.abortController = new AbortController()
    const url = `${this.config.baseUrl ?? ''}${config.endpoint}`

    // Single try-catch wraps everything including the initial fetch so that
    // AbortErrors thrown at any stage (fetch, response.text(), reader.read())
    // are all handled uniformly rather than propagating to the caller.
    try {
      // Retry loop for HTTP 409 — the server holds a per-conversation lock
      // that may not be released yet after a page refresh or rapid resend.
      let response: Response | undefined
      for (let attempt = 0; attempt <= HttpChatProvider.CONFLICT_MAX_RETRIES; attempt++) {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.config.headers,
          },
          body: JSON.stringify({
            message,
            model: config.model,
            ...(attachments?.length ? { attachments } : {}),
            ...(config.resume ? { resume: true } : {}),
          }),
          signal: this.abortController.signal,
        })

        if (response.status !== 409) break

        // Consume the 409 response body to free the connection for the next attempt
        await response.text().catch(() => {})

        // 409 Conflict — server lock still held. Wait with exponential backoff.
        if (attempt < HttpChatProvider.CONFLICT_MAX_RETRIES) {
          const delay = HttpChatProvider.CONFLICT_BASE_DELAY * 2 ** attempt
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, delay)
            // If aborted while waiting, resolve immediately so the AbortError
            // is thrown on the next fetch attempt rather than hanging.
            this.abortController?.signal.addEventListener(
              'abort',
              () => {
                clearTimeout(timer)
                resolve()
              },
              { once: true },
            )
          })
        }
      }

      if (!response!.ok) {
        const text = await response!
          .text()
          .catch(() => t('chat.error.unknownError', undefined, { defaultValue: 'Unknown error' }))
        onEvent({
          type: 'error',
          message: t(
            'chat.error.httpError',
            { status: response!.status, text },
            { defaultValue: 'HTTP {{status}}: {{text}}' },
          ),
        })
        return
      }

      if (!response!.body) {
        onEvent({
          type: 'error',
          message: t('chat.error.noResponseBody', undefined, { defaultValue: 'No response body' }),
        })
        return
      }

      const reader = response!.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (!data) continue

          try {
            const event = JSON.parse(data) as ChatStreamEvent
            onEvent(event)
          } catch {
            // Skip malformed SSE data lines
          }
        }
      }

      // Process any remaining buffer
      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6).trim()
        if (data) {
          try {
            const event = JSON.parse(data) as ChatStreamEvent
            onEvent(event)
          } catch {
            // Skip malformed data
          }
        }
      }
    } catch (err) {
      // AbortError can be a DOMException or a plain Error depending on the environment.
      // Silently return — this request was superseded by a newer one.
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      const message =
        err instanceof Error
          ? err.message
          : t('chat.error.streamError', undefined, { defaultValue: 'Stream error' })
      onEvent({ type: 'error', message })
    } finally {
      this.abortController = null
    }
  }

  /** Aborts the current in-flight SSE stream, if any. */
  abort(): void {
    this.abortController?.abort()
    this.abortController = null
  }

  /**
   * Clears chat history on the server by sending a DELETE request to the chat endpoint.
   * @param config - Chat configuration with the endpoint URL.
   */
  async clearHistory(config: ChatConfig): Promise<void> {
    const url = `${this.config.baseUrl ?? ''}${config.endpoint}`
    await fetch(url, {
      method: 'DELETE',
      headers: this.config.headers,
    })
  }

  /**
   * Loads chat history from the server via GET request.
   * @param config - Chat configuration with the endpoint URL.
   * @returns An array of chat messages, or an empty array if the request fails.
   */
  async loadHistory(config: ChatConfig): Promise<ChatMessage[]> {
    const url = `${this.config.baseUrl ?? ''}${config.endpoint}`
    const response = await fetch(url, {
      headers: this.config.headers,
    })

    if (!response.ok) return []

    const data = (await response.json()) as {
      messages?: Record<string, unknown>[]
      streaming?: boolean
    }
    this.isServerStreaming = data.streaming ?? false
    return (data.messages ?? []).map((m, i) => {
      // Backend stores timestamps as ISO strings; frontend needs numbers
      const raw = m.timestamp
      const timestamp =
        typeof raw === 'number'
          ? raw
          : typeof raw === 'string'
            ? new Date(raw).getTime()
            : Date.now()

      const toolCalls = (m.toolCalls as ChatMessage['toolCalls'])?.map((tc) => ({
        ...tc,
        status:
          typeof tc.output === 'object' && tc.output !== null && 'error' in tc.output
            ? ('error' as const)
            : ('done' as const),
      }))

      // Reconstruct blocks from toolCalls when blocks aren't stored (legacy messages).
      // This ensures tool call cards render correctly from history.
      let blocks = m.blocks as ChatMessage['blocks']
      if (!blocks && ((m.content as string) || toolCalls?.length)) {
        blocks = []
        if (m.content) blocks.push({ type: 'text', content: m.content as string })
        if (toolCalls) {
          for (const tc of toolCalls) blocks.push({ type: 'tool_call', id: tc.id })
        }
      }

      return {
        id: (m.id as string) ?? `msg-${i}`,
        role: m.role as ChatMessage['role'],
        content: (m.content as string) ?? '',
        timestamp,
        blocks,
        toolCalls,
        commitRecord: m.commitRecord as ChatMessage['commitRecord'],
        attachments: m.attachments as ChatMessage['attachments'],
      }
    })
  }
}

/**
 * Creates an `HttpChatProvider` instance with optional base URL and custom headers.
 * @param config - HTTP-specific chat configuration (base URL, headers).
 * @returns An `HttpChatProvider` that communicates with the backend via HTTP/SSE.
 */
export function createProvider(config?: HttpChatConfig): HttpChatProvider {
  return new HttpChatProvider(config)
}
