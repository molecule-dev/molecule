/**
 * Default HTTP/SSE implementation of AICopilotProvider.
 *
 * Sends editor context to a backend endpoint and streams back inline
 * suggestions via Server-Sent Events. Supports request cancellation
 * and feedback reporting (accept/reject).
 *
 * @module
 */

import type {
  AICopilotConfig,
  AICopilotProvider,
  CopilotContext,
  CopilotEvent,
  CopilotEventHandler,
  CopilotSuggestion,
} from '@molecule/app-ai-copilot'
import { t } from '@molecule/app-i18n'

import type { DefaultCopilotConfig } from './types.js'

/**
 * HTTP/SSE-based copilot provider. Sends document context via POST and
 * reads SSE streams for real-time inline suggestions.
 */
export class DefaultCopilotProvider implements AICopilotProvider {
  /** @inheritdoc */
  readonly name = 'default'

  private config: DefaultCopilotConfig
  private abortController: AbortController | null = null

  /**
   * Creates a new DefaultCopilotProvider.
   *
   * @param config - Optional provider-level configuration (base URL, headers).
   */
  constructor(config: DefaultCopilotConfig = {}) {
    this.config = config
  }

  /**
   * Requests inline suggestions from the backend.
   *
   * Aborts any previous in-flight request before starting a new one.
   * Parses the SSE stream and emits `CopilotEvent` objects via `onEvent`.
   *
   * @param context - Current editor context (prefix, suffix, language, etc.).
   * @param config - Request-level settings (endpoint, model, maxSuggestions).
   * @param onEvent - Callback for each streamed event.
   */
  async getSuggestions(
    context: CopilotContext,
    config: AICopilotConfig,
    onEvent: CopilotEventHandler,
  ): Promise<void> {
    this.abortController?.abort()
    const controller = new AbortController()
    this.abortController = controller
    const { signal } = controller
    const url = `${this.config.baseUrl ?? ''}${config.endpoint}`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify({
          prefix: context.prefix,
          suffix: context.suffix,
          language: context.language,
          filePath: context.filePath,
          cursorLine: context.cursorLine,
          cursorColumn: context.cursorColumn,
          model: config.model,
          maxSuggestions: config.maxSuggestions,
          projectId: config.projectId,
        }),
        signal,
      })

      if (!response.ok) {
        const text = await response
          .text()
          .catch(
            () =>
              t('copilot.error.unknownError', undefined, { defaultValue: 'Unknown error' }),
          )
        let errorMessage: string | undefined
        try {
          const body = JSON.parse(text) as Record<string, unknown>
          if (typeof body.error === 'string') errorMessage = body.error
        } catch {
          // Not JSON — use raw text
        }
        onEvent({
          type: 'error',
          message:
            errorMessage ??
            t(
              'copilot.error.httpError',
              { status: response.status, text },
              { defaultValue: 'HTTP {{status}}: {{text}}' },
            ),
        })
        return
      }

      if (!response.body) {
        onEvent({
          type: 'error',
          message: t('copilot.error.noResponseBody', undefined, {
            defaultValue: 'No response body',
          }),
        })
        return
      }

      const reader = response.body.getReader()
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
            const event = JSON.parse(data) as CopilotEvent
            onEvent(event)
          } catch {
            // Skip malformed SSE data lines
          }
        }

        // Yield to main thread between chunks
        await new Promise((r) => setTimeout(r, 0))
      }

      // Flush any remaining buffered data
      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6).trim()
        if (data) {
          try {
            const event = JSON.parse(data) as CopilotEvent
            onEvent(event)
          } catch {
            // Skip malformed data
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      const message =
        err instanceof Error
          ? err.message
          : t('copilot.error.streamError', undefined, { defaultValue: 'Stream error' })
      onEvent({ type: 'error', message })
    } finally {
      if (this.abortController === controller) {
        this.abortController = null
      }
    }
  }

  /**
   * Reports a suggestion acceptance to the backend for analytics/learning.
   *
   * @param suggestion - The suggestion the user accepted.
   * @param config - Request-level configuration (endpoint).
   */
  async acceptSuggestion(
    suggestion: CopilotSuggestion,
    config: AICopilotConfig,
  ): Promise<void> {
    const url = `${this.config.baseUrl ?? ''}${config.endpoint}/feedback`
    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify({
          suggestionId: suggestion.id,
          action: 'accept',
          text: suggestion.text,
          metadata: suggestion.metadata,
        }),
      })
    } catch {
      // Feedback is best-effort — do not propagate errors
    }
  }

  /**
   * Reports a suggestion rejection to the backend for analytics/learning.
   *
   * @param suggestion - The suggestion the user dismissed.
   * @param config - Request-level configuration (endpoint).
   */
  async rejectSuggestion(
    suggestion: CopilotSuggestion,
    config: AICopilotConfig,
  ): Promise<void> {
    const url = `${this.config.baseUrl ?? ''}${config.endpoint}/feedback`
    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify({
          suggestionId: suggestion.id,
          action: 'reject',
          metadata: suggestion.metadata,
        }),
      })
    } catch {
      // Feedback is best-effort — do not propagate errors
    }
  }

  /**
   * Cancels any in-flight suggestion request.
   */
  abort(): void {
    this.abortController?.abort()
    this.abortController = null
  }
}

/**
 * Creates a DefaultCopilotProvider instance.
 *
 * @param config - Optional provider-level configuration (base URL, headers).
 * @returns A new DefaultCopilotProvider.
 */
export function createProvider(config?: DefaultCopilotConfig): DefaultCopilotProvider {
  return new DefaultCopilotProvider(config)
}
