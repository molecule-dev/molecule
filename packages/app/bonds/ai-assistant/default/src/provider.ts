/**
 * Default HTTP/SSE implementation of the AI assistant provider.
 *
 * Manages panel state, streams responses via Server-Sent Events,
 * and supports context injection and session persistence.
 *
 * @module
 */

import type {
  AIAssistantConfig,
  AIAssistantProvider,
  AssistantContext,
  AssistantEventHandler,
  AssistantMessage,
  AssistantPanelState,
  AssistantStateListener,
  AssistantStreamEvent,
} from '@molecule/app-ai-assistant'

import type { DefaultAssistantConfig } from './types.js'

/**
 * Create the initial panel state.
 *
 * @returns A fresh panel state snapshot
 */
function createInitialState(): AssistantPanelState {
  return {
    isOpen: false,
    position: 'right',
    messages: [],
    isLoading: false,
    error: null,
    suggestions: [],
    context: [],
  }
}

/**
 * Default AI assistant provider using HTTP/SSE for streaming.
 *
 * Manages an internal panel state store with subscriber notifications,
 * streams assistant responses via SSE, and supports context-enriched
 * messaging.
 */
export class DefaultAssistantProvider implements AIAssistantProvider {
  readonly name = 'default'

  private readonly baseUrl: string
  private readonly defaultHeaders: Record<string, string>
  private state: AssistantPanelState
  private listeners: Set<AssistantStateListener> = new Set()
  private abortController: AbortController | null = null
  private messageCounter = 0

  /**
   * Create a new default assistant provider.
   *
   * @param config - Provider-specific configuration
   */
  constructor(config: DefaultAssistantConfig = {}) {
    this.baseUrl = config.baseUrl ?? ''
    this.defaultHeaders = config.headers ?? {}
    this.state = createInitialState()
  }

  /** Open the assistant panel. */
  open(config: AIAssistantConfig): void {
    this.setState({
      isOpen: true,
      position: config.position ?? this.state.position,
      suggestions: config.suggestions ?? this.state.suggestions,
    })
  }

  /** Close the assistant panel. */
  close(): void {
    this.abort()
    this.setState({ isOpen: false })
  }

  /** Toggle the assistant panel open/closed. */
  toggle(config: AIAssistantConfig): void {
    if (this.state.isOpen) {
      this.close()
    } else {
      this.open(config)
    }
  }

  /**
   * Send a message and stream the response via SSE.
   *
   * @param message - The user's message text
   * @param config - Assistant configuration
   * @param onEvent - Callback for stream events
   */
  async sendMessage(
    message: string,
    config: AIAssistantConfig,
    onEvent: AssistantEventHandler,
  ): Promise<void> {
    this.abort()

    const userMessage: AssistantMessage = {
      id: `msg-${this.messageCounter++}`,
      role: 'user',
      content: message,
      timestamp: Date.now(),
    }

    const assistantMessage: AssistantMessage = {
      id: `msg-${this.messageCounter++}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    }

    const messages = this.trimMessages(
      [...this.state.messages, userMessage, assistantMessage],
      config.maxMessages,
    )

    this.setState({ messages, isLoading: true, error: null })

    const controller = new AbortController()
    this.abortController = controller

    const url = `${this.baseUrl}${config.endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
      ...(config.headers ?? {}),
    }

    const body: Record<string, unknown> = { message }
    if (config.systemContext) {
      body.systemContext = config.systemContext
    }
    if (this.state.context.length > 0) {
      body.context = this.state.context
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText)
        const errorEvent: AssistantStreamEvent = {
          type: 'error',
          message: `HTTP ${response.status}: ${text}`,
        }
        onEvent(errorEvent)
        this.finalizeStream(assistantMessage.id, errorEvent.message)
        return
      }

      if (!response.body) {
        const errorEvent: AssistantStreamEvent = {
          type: 'error',
          message: 'No response body',
        }
        onEvent(errorEvent)
        this.finalizeStream(assistantMessage.id, errorEvent.message)
        return
      }

      await this.consumeStream(response.body, assistantMessage.id, onEvent)
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        this.markAborted(assistantMessage.id)
        return
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorEvent: AssistantStreamEvent = {
        type: 'error',
        message: errorMessage,
      }
      onEvent(errorEvent)
      this.finalizeStream(assistantMessage.id, errorMessage)
    }
  }

  /** Abort the current streaming response. */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  /**
   * Set the current context items.
   *
   * @param context - Array of context items
   */
  setContext(context: AssistantContext[]): void {
    this.setState({ context })
  }

  /** Clear all context items. */
  clearContext(): void {
    this.setState({ context: [] })
  }

  /**
   * Clear conversation history on the backend and locally.
   *
   * @param config - Assistant configuration
   */
  async clearHistory(config: AIAssistantConfig): Promise<void> {
    const url = `${this.baseUrl}${config.endpoint}`
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(config.headers ?? {}),
    }

    try {
      await fetch(url, { method: 'DELETE', headers })
    } catch {
      // Best-effort — local state is cleared regardless
    }

    this.messageCounter = 0
    this.setState({
      messages: [],
      error: null,
      suggestions: config.suggestions ?? [],
    })
  }

  /**
   * Load conversation history from the backend.
   *
   * @param config - Assistant configuration
   * @returns Array of past messages
   */
  async loadHistory(config: AIAssistantConfig): Promise<AssistantMessage[]> {
    const url = `${this.baseUrl}${config.endpoint}`
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(config.headers ?? {}),
    }

    try {
      const response = await fetch(url, { method: 'GET', headers })
      if (!response.ok) {
        return []
      }

      const data = (await response.json()) as { messages?: unknown[] }
      const raw = data.messages ?? []

      const messages = raw.map((msg: unknown, index: number): AssistantMessage => {
        const m = msg as Record<string, unknown>
        return {
          id: (m.id as string) ?? `msg-${index}`,
          role: (m.role as AssistantMessage['role']) ?? 'user',
          content: (m.content as string) ?? '',
          timestamp: (m.timestamp as number) ?? Date.now(),
        }
      })

      this.messageCounter = messages.length
      this.setState({ messages })
      return messages
    } catch {
      return []
    }
  }

  /**
   * Get the current panel state snapshot.
   *
   * @returns The current state
   */
  getState(): AssistantPanelState {
    return { ...this.state }
  }

  /**
   * Subscribe to panel state changes.
   *
   * @param listener - Callback invoked on every state change
   * @returns Unsubscribe function
   */
  subscribe(listener: AssistantStateListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Consume an SSE stream, parsing events and updating state.
   *
   * @param body - The ReadableStream from the fetch response
   * @param assistantMsgId - The ID of the assistant message being streamed
   * @param onEvent - Callback for stream events
   */
  private async consumeStream(
    body: ReadableStream<Uint8Array>,
    assistantMsgId: string,
    onEvent: AssistantEventHandler,
  ): Promise<void> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const json = line.slice(6)
          let event: AssistantStreamEvent
          try {
            event = JSON.parse(json) as AssistantStreamEvent
          } catch {
            continue
          }

          onEvent(event)
          this.applyStreamEvent(event, assistantMsgId)
        }
      }

      // Process any remaining buffer
      if (buffer.startsWith('data: ')) {
        const json = buffer.slice(6)
        try {
          const event = JSON.parse(json) as AssistantStreamEvent
          onEvent(event)
          this.applyStreamEvent(event, assistantMsgId)
        } catch {
          // Incomplete data — ignore
        }
      }
    } finally {
      reader.releaseLock()
    }

    // If stream ended without a done/error event, finalize
    const lastMsg = this.state.messages.find((m) => m.id === assistantMsgId)
    if (lastMsg?.isStreaming) {
      this.finalizeStream(assistantMsgId, null)
    }
  }

  /**
   * Apply a stream event to the internal state.
   *
   * @param event - The stream event to apply
   * @param assistantMsgId - The ID of the assistant message being streamed
   */
  private applyStreamEvent(event: AssistantStreamEvent, assistantMsgId: string): void {
    switch (event.type) {
      case 'text': {
        const messages = this.state.messages.map((m) =>
          m.id === assistantMsgId ? { ...m, content: m.content + event.content } : m,
        )
        this.setState({ messages })
        break
      }
      case 'suggestion': {
        this.setState({ suggestions: event.suggestions })
        break
      }
      case 'done': {
        this.finalizeStream(assistantMsgId, null)
        break
      }
      case 'error': {
        this.finalizeStream(assistantMsgId, event.message)
        break
      }
      // 'thinking' events are forwarded to onEvent but don't alter panel state
    }
  }

  /**
   * Finalize a streaming message — mark it as no longer streaming
   * and update loading/error state.
   *
   * @param assistantMsgId - The ID of the assistant message
   * @param error - Error message, or null if successful
   */
  private finalizeStream(assistantMsgId: string, error: string | null): void {
    const messages = this.state.messages.map((m) =>
      m.id === assistantMsgId ? { ...m, isStreaming: false } : m,
    )
    this.abortController = null
    this.setState({ messages, isLoading: false, error })
  }

  /**
   * Mark a streaming message as aborted.
   *
   * @param assistantMsgId - The ID of the assistant message
   */
  private markAborted(assistantMsgId: string): void {
    const messages = this.state.messages.map((m) =>
      m.id === assistantMsgId ? { ...m, isStreaming: false, aborted: true } : m,
    )
    this.abortController = null
    this.setState({ messages, isLoading: false })
  }

  /**
   * Trim messages to the configured maximum, keeping the most recent.
   *
   * @param messages - The full message array
   * @param maxMessages - Maximum number of messages to retain
   * @returns Trimmed array
   */
  private trimMessages(messages: AssistantMessage[], maxMessages?: number): AssistantMessage[] {
    if (!maxMessages || messages.length <= maxMessages) return messages
    return messages.slice(messages.length - maxMessages)
  }

  /**
   * Update the internal state and notify all subscribers.
   *
   * @param partial - Partial state to merge
   */
  private setState(partial: Partial<AssistantPanelState>): void {
    this.state = { ...this.state, ...partial }
    const snapshot = this.getState()
    for (const listener of this.listeners) {
      listener(snapshot)
    }
  }
}

/**
 * Create a new default assistant provider instance.
 *
 * @param config - Optional provider-specific configuration
 * @returns A new DefaultAssistantProvider instance
 */
export function createProvider(config?: DefaultAssistantConfig): DefaultAssistantProvider {
  return new DefaultAssistantProvider(config)
}
