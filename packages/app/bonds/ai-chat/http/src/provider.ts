/**
 * HTTP/SSE AI chat provider implementation.
 *
 * Sends messages to the backend API and parses SSE streams
 * to deliver real-time AI responses.
 *
 * @module
 */

import type {
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

  constructor(config: HttpChatConfig = {}) {
    this.config = config
  }

  /**
   * Sends a chat message to the backend and streams back SSE events.
   * @param message - The user message text.
   * @param config - Chat configuration including the API endpoint and model.
   * @param onEvent - Callback invoked for each SSE event (content chunks, errors, done signals).
   */
  async sendMessage(message: string, config: ChatConfig, onEvent: ChatEventHandler): Promise<void> {
    this.abortController = new AbortController()
    const url = `${this.config.baseUrl ?? ''}${config.endpoint}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      body: JSON.stringify({
        message,
        model: config.model,
      }),
      signal: this.abortController.signal,
    })

    if (!response.ok) {
      const text = await response
        .text()
        .catch(() => t('chat.error.unknownError', undefined, { defaultValue: 'Unknown error' }))
      onEvent({
        type: 'error',
        message: t(
          'chat.error.httpError',
          { status: response.status, text },
          { defaultValue: 'HTTP {{status}}: {{text}}' },
        ),
      })
      return
    }

    if (!response.body) {
      onEvent({
        type: 'error',
        message: t('chat.error.noResponseBody', undefined, { defaultValue: 'No response body' }),
      })
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
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
      if (err instanceof DOMException && err.name === 'AbortError') {
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

    const data = (await response.json()) as { messages?: ChatMessage[] }
    return (data.messages ?? []).map((m, i) => ({
      id: m.id ?? `msg-${i}`,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp ?? Date.now(),
      toolCalls: m.toolCalls,
    }))
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
