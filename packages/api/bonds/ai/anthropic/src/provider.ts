/**
 * Anthropic Claude implementation of AIProvider.
 *
 * Uses the Anthropic SDK for streaming chat completions with tool use.
 *
 * @module
 */

import type {
  AIProvider,
  AITool,
  ChatEvent,
  ChatMessage,
  ChatParams,
  ContentBlock,
} from '@molecule/api-ai'
import { getLogger } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

const logger = getLogger()

import type { AnthropicConfig } from './types.js'

/** Mutable state shared across SSE line-processing calls for the Anthropic streaming parser. */
interface AnthropicStreamState {
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  pendingTool: { id: string; name: string; inputJson: string } | null
  pendingThinking: string | null
}

/**
 * Anthropic Claude AI provider that implements the `AIProvider` interface
 * using Anthropic's Messages API with support for streaming, tool use,
 * and system prompts.
 */
class AnthropicAIProvider implements AIProvider {
  readonly name = 'anthropic'
  private apiKey: string
  private defaultModel: string
  private maxTokens: number
  private baseUrl: string

  constructor(config: AnthropicConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY ?? ''
    this.defaultModel = config.defaultModel ?? 'claude-opus-4-6'
    this.maxTokens = config.maxTokens ?? 4096
    this.baseUrl = config.baseUrl ?? 'https://api.anthropic.com'
  }

  /**
   * Sends a chat request and yields streamed events (text chunks, tool use, done/error).
   *
   * @param params - Chat parameters including messages, model, system prompt, and tools.
   * @yields {ChatEvent} Chat events including text chunks, tool use requests, done signals, and errors.
   */
  async *chat(params: ChatParams): AsyncIterable<ChatEvent> {
    const model = params.model ?? this.defaultModel
    const maxTokens = params.maxTokens ?? this.maxTokens

    const formattedMessages = this.formatMessages(params.messages)

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages: formattedMessages,
    }

    // Enable automatic prompt caching at the request level. The API places
    // the cache breakpoint on the last cacheable block and advances it as the
    // conversation grows — no manual breakpoint management needed for messages.
    // Explicit breakpoints on system + tools below provide additional stable
    // cache points (tools/system rarely change, so they cache independently).
    if (params.cacheControl) {
      body.cache_control = params.cacheControl
    }

    if (params.system) {
      if (params.cacheControl) {
        body.system = [{ type: 'text', text: params.system, cache_control: params.cacheControl }]
      } else {
        body.system = params.system
      }
    }
    // Merge custom tools (with input_schema) and server tools (provider-native, e.g. web_search)
    const customTools = params.tools?.length ? this.formatTools(params.tools) : []
    const serverTools = (params.serverTools ?? []).map((st) => ({ ...st }))
    const allTools = [...customTools, ...serverTools]
    if (allTools.length > 0) {
      if (params.cacheControl) {
        // Place cache breakpoint on the last tool so tools + system are cached together
        allTools[allTools.length - 1] = {
          ...allTools[allTools.length - 1],
          cache_control: params.cacheControl,
        }
      }
      body.tools = allTools
    }
    if (params.stream !== false) body.stream = true

    // Thinking requires temperature=1 (default); skip any explicit temperature override
    if (params.thinking) {
      body.thinking = { type: 'enabled', budget_tokens: params.thinking.budgetTokens }
    } else if (params.temperature !== undefined) {
      body.temperature = params.temperature
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
    }
    // Build anthropic-beta header — features that require beta flags.
    // Prompt caching is GA (no longer needs a beta flag).
    const betaFeatures: string[] = []
    if (params.thinking) betaFeatures.push('interleaved-thinking-2025-05-14')
    if (betaFeatures.length > 0) {
      headers['anthropic-beta'] = betaFeatures.join(',')
    }

    // Default timeout of 5 minutes to prevent hung connections.
    // Caller can override via params.signal for custom timeouts.
    const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000
    const signal = params.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS)

    // Retry with exponential backoff for rate limits (429) and overloaded (529/503)
    const MAX_RETRIES = 3
    let response: Response | null = null
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      })

      if (response.status === 429 || response.status === 529 || response.status === 503) {
        if (attempt < MAX_RETRIES) {
          // Use Retry-After header if provided, otherwise exponential backoff
          const retryAfter = response.headers.get('retry-after')
          const delayMs = retryAfter
            ? Math.min(parseInt(retryAfter, 10) * 1000, 60_000)
            : Math.min(1000 * 2 ** attempt, 30_000)
          logger.warn('Anthropic API rate limited, retrying', {
            status: response.status,
            attempt: attempt + 1,
            delayMs,
          })
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, delayMs)
            // If aborted while waiting, resolve immediately
            signal.addEventListener(
              'abort',
              () => {
                clearTimeout(timer)
                resolve()
              },
              { once: true },
            )
          })
          if (signal.aborted) break
          continue
        }
      }
      break
    }

    if (!response!.ok) {
      const errorBody = await response!.text()
      let detail = `HTTP ${response!.status}`
      try {
        const parsed = JSON.parse(errorBody) as { error?: { message?: string } }
        if (parsed.error?.message) detail = parsed.error.message
      } catch {
        if (errorBody.length > 0 && errorBody.length < 200) detail = errorBody
      }
      // Log full detail server-side for debugging
      logger.error('Anthropic API error', { status: response!.status, detail })
      // Return sanitized but actionable error to client
      const clientMessage =
        response!.status === 429
          ? 'AI rate limit exceeded. Please try again shortly.'
          : response!.status === 401
            ? 'AI service configuration error.'
            : response!.status === 400 &&
                /prompt is too long|too many tokens|token.*limit|context.*length/i.test(detail)
              ? "Conversation too long for the model's context window. Use /compact to free space, or start a new conversation."
              : response!.status === 529 || response!.status === 503
                ? 'AI service is temporarily overloaded. Please try again in a moment.'
                : 'AI service error. Please try again.'
      yield { type: 'error', message: clientMessage, errorKey: 'ai.error.apiError' }
      return
    }

    if (params.stream === false) {
      // Non-streaming: parse full response
      const data = (await response!.json()) as Record<string, unknown>
      yield* this.parseNonStreamingResponse(data)
      return
    }

    // Streaming: parse SSE events
    yield* this.parseStreamingResponse(response!)
  }

  /**
   * Converts internal `ChatMessage` objects to the Anthropic API message format,
   * filtering out system messages (handled separately via the `system` parameter).
   * Maps generic `ContentBlock` attachment types to Anthropic's native format.
   * @param messages - The chat messages to format.
   * @returns The formatted messages array for the Anthropic API.
   */
  private formatMessages(messages: ChatMessage[]): Array<{ role: string; content: unknown }> {
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role,
        content:
          typeof m.content === 'string'
            ? m.content
            : (m.content as ContentBlock[]).map((block) => this.formatBlock(block)),
      }))
  }

  /**
   * Maps a generic `ContentBlock` to the Anthropic API content block format.
   * @param block - The content block to format.
   * @returns The Anthropic-native block representation.
   */
  private formatBlock(block: ContentBlock): Record<string, unknown> {
    switch (block.type) {
      case 'text':
        return { type: 'text', text: block.text }
      case 'image':
        return {
          type: 'image',
          source: { type: 'base64', media_type: block.mediaType, data: block.data },
        }
      case 'document':
        return {
          type: 'document',
          source: { type: 'base64', media_type: block.mediaType, data: block.data },
        }
      case 'audio':
        return {
          type: 'text',
          text: `[Audio attachment (${block.mediaType}) — not supported by this provider]`,
        }
      case 'video':
        return {
          type: 'text',
          text: `[Video attachment (${block.mediaType}) — not supported by this provider]`,
        }
      case 'tool_use':
        return { type: 'tool_use', id: block.id, name: block.name, input: block.input }
      case 'tool_result':
        return { type: 'tool_result', tool_use_id: block.tool_use_id, content: block.content }
      default:
        return block as Record<string, unknown>
    }
  }

  /**
   * Converts internal `AITool` definitions to the Anthropic API tool format
   * with `name`, `description`, and `input_schema` fields.
   * @param tools - The AI tool definitions to format.
   * @returns The formatted tools array for the Anthropic API.
   */
  private formatTools(tools: AITool[]): Array<Record<string, unknown>> {
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }))
  }

  /**
   * Parses a non-streaming Anthropic API response into `ChatEvent` objects.
   * @param data - The raw API response data to parse.
   * @yields {ChatEvent} Chat events parsed from the response content blocks and usage data.
   */
  private *parseNonStreamingResponse(data: Record<string, unknown>): Iterable<ChatEvent> {
    const content = data.content as Array<Record<string, unknown>> | undefined
    if (content) {
      for (const block of content) {
        if (block.type === 'text') {
          yield { type: 'text', content: block.text as string }
        } else if (block.type === 'tool_use') {
          yield {
            type: 'tool_use',
            id: block.id as string,
            name: block.name as string,
            input: block.input,
          }
        }
      }
    }

    const usage = data.usage as
      | {
          input_tokens?: number
          output_tokens?: number
          cache_creation_input_tokens?: number | null
          cache_read_input_tokens?: number | null
        }
      | undefined
    yield {
      type: 'done',
      usage: {
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        ...(usage?.cache_creation_input_tokens
          ? { cacheCreationInputTokens: usage.cache_creation_input_tokens }
          : {}),
        ...(usage?.cache_read_input_tokens
          ? { cacheReadInputTokens: usage.cache_read_input_tokens }
          : {}),
      },
    }
  }

  /**
   * Parses a streaming SSE response from the Anthropic API, yielding
   * `ChatEvent` objects as they arrive (text deltas, tool use, done with usage).
   * @param response - The fetch Response with an SSE body stream.
   * @yields {ChatEvent} Chat events as they arrive from the SSE stream.
   */
  private async *parseStreamingResponse(response: Response): AsyncIterable<ChatEvent> {
    const reader = response.body?.getReader()
    if (!reader) {
      yield {
        type: 'error',
        message: t('ai.error.noResponseBody'),
        errorKey: 'ai.error.noResponseBody',
      }
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    const state: AnthropicStreamState = {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      pendingTool: null,
      pendingThinking: null,
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        yield* this.processSSELines(lines, state)
      }

      // Flush any remaining data in the buffer after EOF
      if (buffer.trim()) {
        yield* this.processSSELines(buffer.split('\n'), state)
      }

      // Emit any tool call still pending after stream ends (safety net for missing content_block_stop)
      if (state.pendingTool) {
        let input: unknown = {}
        try {
          input = JSON.parse(state.pendingTool.inputJson)
        } catch {
          // Fall back to empty object if JSON is malformed
        }
        yield {
          type: 'tool_use',
          id: state.pendingTool.id,
          name: state.pendingTool.name,
          input,
        }
        state.pendingTool = null
      }
    } finally {
      reader.releaseLock()
    }

    yield {
      type: 'done',
      usage: {
        inputTokens: state.inputTokens,
        outputTokens: state.outputTokens,
        ...(state.cacheCreationInputTokens
          ? { cacheCreationInputTokens: state.cacheCreationInputTokens }
          : {}),
        ...(state.cacheReadInputTokens ? { cacheReadInputTokens: state.cacheReadInputTokens } : {}),
      },
    }
  }

  /**
   * Processes an array of SSE lines from the Anthropic streaming response, yielding
   * ChatEvent objects for text deltas, thinking, tool use, and usage updates.
   *
   * @param lines - Raw SSE lines to process.
   * @param state - Mutable stream state (token counters, pending blocks).
   * @yields {ChatEvent} Chat events extracted from the SSE lines.
   */
  private *processSSELines(lines: string[], state: AnthropicStreamState): Iterable<ChatEvent> {
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const json = line.slice(6).trim()
      if (json === '[DONE]') continue

      try {
        const event = JSON.parse(json) as Record<string, unknown>
        const eventType = event.type as string

        if (eventType === 'content_block_delta') {
          const delta = event.delta as Record<string, unknown>
          if (delta.type === 'text_delta') {
            yield { type: 'text', content: delta.text as string }
          } else if (delta.type === 'input_json_delta' && state.pendingTool) {
            state.pendingTool.inputJson += delta.partial_json as string
          } else if (delta.type === 'thinking_delta' && state.pendingThinking !== null) {
            const chunk = delta.thinking as string
            state.pendingThinking += chunk
            yield { type: 'thinking', content: chunk }
          }
        } else if (eventType === 'content_block_start') {
          const block = event.content_block as Record<string, unknown>
          if (block.type === 'tool_use') {
            state.pendingTool = {
              id: block.id as string,
              name: block.name as string,
              inputJson: '',
            }
          } else if (block.type === 'thinking') {
            state.pendingThinking = ''
          }
        } else if (eventType === 'content_block_stop') {
          // Emit completed tool_use with accumulated input
          if (state.pendingTool) {
            let input: unknown = {}
            try {
              input = JSON.parse(state.pendingTool.inputJson)
            } catch {
              // Fall back to empty object if JSON is malformed
            }
            yield {
              type: 'tool_use',
              id: state.pendingTool.id,
              name: state.pendingTool.name,
              input,
            }
            state.pendingTool = null
          }
          // Thinking block complete — deltas were already yielded incrementally
          if (state.pendingThinking !== null) {
            state.pendingThinking = null
          }
        } else if (eventType === 'message_delta') {
          const usage = event.usage as { output_tokens?: number } | undefined
          if (usage?.output_tokens) state.outputTokens = usage.output_tokens
        } else if (eventType === 'message_start') {
          const message = event.message as Record<string, unknown>
          const usage = message?.usage as
            | {
                input_tokens?: number
                cache_creation_input_tokens?: number | null
                cache_read_input_tokens?: number | null
              }
            | undefined
          if (usage?.input_tokens) state.inputTokens = usage.input_tokens
          if (usage?.cache_creation_input_tokens)
            state.cacheCreationInputTokens = usage.cache_creation_input_tokens
          if (usage?.cache_read_input_tokens)
            state.cacheReadInputTokens = usage.cache_read_input_tokens
        }
      } catch {
        logger.debug('Skipping malformed SSE JSON line', { json })
      }
    }
  }
}

/**
 * Creates an Anthropic Claude AI provider instance.
 *
 * @param config - Anthropic-specific configuration (API key, model, max tokens, base URL).
 * @returns An `AIProvider` backed by the Anthropic Messages API.
 */
export function createProvider(config?: AnthropicConfig): AIProvider {
  return new AnthropicAIProvider(config)
}
