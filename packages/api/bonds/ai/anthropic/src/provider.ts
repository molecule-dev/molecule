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

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      messages: this.formatMessages(params.messages),
    }

    if (params.system) body.system = params.system
    if (params.tools?.length) body.tools = this.formatTools(params.tools)
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
    if (params.thinking) {
      headers['anthropic-beta'] = 'interleaved-thinking-2025-05-14'
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      let detail = `HTTP ${response.status}`
      try {
        const parsed = JSON.parse(errorBody) as { error?: { message?: string } }
        if (parsed.error?.message) detail = parsed.error.message
      } catch {
        if (errorBody.length > 0 && errorBody.length < 200) detail = errorBody
      }
      logger.error('Anthropic API error', { status: response.status, detail })
      yield { type: 'error', message: detail, errorKey: 'ai.error.apiError' }
      return
    }

    if (params.stream === false) {
      // Non-streaming: parse full response
      const data = (await response.json()) as Record<string, unknown>
      yield* this.parseNonStreamingResponse(data)
      return
    }

    // Streaming: parse SSE events
    yield* this.parseStreamingResponse(response)
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
  private formatTools(
    tools: AITool[],
  ): Array<{ name: string; description: string; input_schema: unknown }> {
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

    const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined
    yield {
      type: 'done',
      usage: {
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
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
    let inputTokens = 0
    let outputTokens = 0

    // Track pending content blocks to accumulate streamed deltas
    let pendingTool: { id: string; name: string; inputJson: string } | null = null
    let pendingThinking: string | null = null

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

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
              } else if (delta.type === 'input_json_delta' && pendingTool) {
                pendingTool.inputJson += delta.partial_json as string
              } else if (delta.type === 'thinking_delta' && pendingThinking !== null) {
                pendingThinking += delta.thinking as string
              }
            } else if (eventType === 'content_block_start') {
              const block = event.content_block as Record<string, unknown>
              if (block.type === 'tool_use') {
                pendingTool = {
                  id: block.id as string,
                  name: block.name as string,
                  inputJson: '',
                }
              } else if (block.type === 'thinking') {
                pendingThinking = ''
              }
            } else if (eventType === 'content_block_stop') {
              // Emit completed tool_use with accumulated input
              if (pendingTool) {
                let input: unknown = {}
                try {
                  input = JSON.parse(pendingTool.inputJson)
                } catch {
                  // Fall back to empty object if JSON is malformed
                }
                yield {
                  type: 'tool_use',
                  id: pendingTool.id,
                  name: pendingTool.name,
                  input,
                }
                pendingTool = null
              }
              // Emit completed thinking block
              if (pendingThinking !== null) {
                if (pendingThinking.length > 0) {
                  yield { type: 'thinking', content: pendingThinking }
                }
                pendingThinking = null
              }
            } else if (eventType === 'message_delta') {
              const usage = event.usage as { output_tokens?: number } | undefined
              if (usage?.output_tokens) outputTokens = usage.output_tokens
            } else if (eventType === 'message_start') {
              const message = event.message as Record<string, unknown>
              const usage = message?.usage as { input_tokens?: number } | undefined
              if (usage?.input_tokens) inputTokens = usage.input_tokens
            }
          } catch {
            logger.debug('Skipping malformed SSE JSON line', { json })
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    yield { type: 'done', usage: { inputTokens, outputTokens } }
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
