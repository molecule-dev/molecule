/**
 * OpenAI implementation of AIProvider.
 *
 * Uses the OpenAI HTTP API (`/v1/chat/completions`) for streaming chat
 * completions. Mirrors the shape of `@molecule/api-ai-anthropic` so the
 * same handler code can dispatch to either provider.
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

import type { OpenaiConfig } from './types.js'

const logger = getLogger()

/** Mutable streaming state for the OpenAI parser. */
interface OpenaiStreamState {
  inputTokens: number
  outputTokens: number
  pendingTools: Map<number, { id: string; name: string; argsJson: string }>
}

/**
 * OpenAI Chat Completions provider implementing the `AIProvider` interface.
 */
export class OpenaiAIProvider implements AIProvider {
  readonly name = 'openai'
  private apiKey: string
  private defaultModel: string
  private maxTokens: number
  private baseUrl: string

  constructor(config: OpenaiConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.OPENAI_API_KEY ?? ''
    this.defaultModel = config.defaultModel ?? 'gpt-4o-mini'
    this.maxTokens = config.maxTokens ?? 4096
    this.baseUrl = config.baseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com'
  }

  /**
   * Send a chat request and yield streamed `ChatEvent`s.
   *
   * @param params - Chat parameters.
   * @yields {ChatEvent}
   */
  async *chat(params: ChatParams): AsyncIterable<ChatEvent> {
    const model = params.model ?? this.defaultModel
    const maxTokens = params.maxTokens ?? this.maxTokens

    const messages = this.formatMessages(params.messages, params.system)

    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: maxTokens,
    }
    if (params.temperature !== undefined) body.temperature = params.temperature

    const tools = params.tools?.length ? this.formatTools(params.tools) : null
    if (tools) body.tools = tools

    const useStream = params.stream !== false
    if (useStream) {
      body.stream = true
      body.stream_options = { include_usage: true }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    }

    const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000
    const signal = params.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS)

    const MAX_RETRIES = 3
    let response: Response | null = null
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      })

      if (response.status === 429 || response.status === 503) {
        if (attempt < MAX_RETRIES) {
          const retryAfter = response.headers.get('retry-after')
          const delayMs = retryAfter
            ? Math.min(parseInt(retryAfter, 10) * 1000, 60_000)
            : Math.min(1000 * 2 ** attempt, 30_000)
          logger.warn('OpenAI API rate limited, retrying', {
            status: response.status,
            attempt: attempt + 1,
            delayMs,
          })
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, delayMs)
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
      logger.error('OpenAI API error', { status: response!.status, detail })
      const clientMessage =
        response!.status === 429
          ? 'AI rate limit exceeded. Please try again shortly.'
          : response!.status === 401
            ? 'AI service configuration error.'
            : response!.status === 400 &&
                /context.*length|maximum context|too many tokens|prompt is too long/i.test(detail)
              ? "Conversation too long for the model's context window."
              : response!.status === 503 || response!.status === 502
                ? 'AI service is temporarily overloaded. Please try again in a moment.'
                : 'AI service error. Please try again.'
      yield { type: 'error', message: clientMessage, errorKey: 'ai.error.apiError' }
      return
    }

    if (!useStream) {
      const data = (await response!.json()) as Record<string, unknown>
      yield* this.parseNonStreamingResponse(data)
      return
    }

    yield* this.parseStreamingResponse(response!)
  }

  /**
   * Convert internal `ChatMessage` objects to the OpenAI message format.
   * The system prompt becomes a leading `{role:'system'}` message.
   */
  private formatMessages(
    messages: ChatMessage[],
    systemPrompt: string | undefined,
  ): Array<Record<string, unknown>> {
    const out: Array<Record<string, unknown>> = []
    if (systemPrompt) out.push({ role: 'system', content: systemPrompt })
    for (const m of messages) {
      if (m.role === 'system') {
        out.push({ role: 'system', content: typeof m.content === 'string' ? m.content : '' })
        continue
      }
      const content =
        typeof m.content === 'string'
          ? m.content
          : (m.content as ContentBlock[]).map((b) => this.formatBlock(b))
      out.push({ role: m.role, content })
    }
    return out
  }

  /** Map a generic `ContentBlock` to OpenAI's content-part shape. */
  private formatBlock(block: ContentBlock): Record<string, unknown> {
    switch (block.type) {
      case 'text':
        return { type: 'text', text: block.text }
      case 'image':
        return {
          type: 'image_url',
          image_url: { url: `data:${block.mediaType};base64,${block.data}` },
        }
      case 'document':
        return {
          type: 'text',
          text: `[Document attachment (${block.mediaType}) — not supported by this provider]`,
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
        return { type: 'text', text: `[tool_use ${block.name}]` }
      case 'tool_result':
        return { type: 'text', text: `[tool_result for ${block.tool_use_id}]` }
      default:
        return block as Record<string, unknown>
    }
  }

  /** Convert internal `AITool` definitions to OpenAI's `tools` array. */
  private formatTools(tools: AITool[]): Array<Record<string, unknown>> {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))
  }

  /** Parse a non-streaming `/v1/chat/completions` response. */
  private *parseNonStreamingResponse(data: Record<string, unknown>): Iterable<ChatEvent> {
    const choices = data.choices as Array<Record<string, unknown>> | undefined
    const message = choices?.[0]?.message as Record<string, unknown> | undefined
    const content = message?.content
    if (typeof content === 'string' && content.length > 0) {
      yield { type: 'text', content }
    }
    const toolCalls = message?.tool_calls as Array<Record<string, unknown>> | undefined
    if (toolCalls) {
      for (const call of toolCalls) {
        const fn = call.function as { name?: string; arguments?: string } | undefined
        let input: unknown = {}
        try {
          input = fn?.arguments ? JSON.parse(fn.arguments) : {}
        } catch {
          // leave input = {}
        }
        yield {
          type: 'tool_use',
          id: String(call.id ?? ''),
          name: String(fn?.name ?? ''),
          input,
        }
      }
    }

    const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined
    yield {
      type: 'done',
      usage: {
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
      },
    }
  }

  /** Parse a streaming SSE response from `/v1/chat/completions`. */
  private async *parseStreamingResponse(response: Response): AsyncIterable<ChatEvent> {
    const reader = response.body?.getReader()
    if (!reader) {
      yield {
        type: 'error',
        message: 'No response body from OpenAI.',
        errorKey: 'ai.error.noResponseBody',
      }
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    const state: OpenaiStreamState = {
      inputTokens: 0,
      outputTokens: 0,
      pendingTools: new Map(),
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
      if (buffer.trim()) yield* this.processSSELines(buffer.split('\n'), state)

      // Flush any pending tool calls
      for (const tool of state.pendingTools.values()) {
        let input: unknown = {}
        try {
          input = tool.argsJson ? JSON.parse(tool.argsJson) : {}
        } catch {
          // leave input = {}
        }
        yield { type: 'tool_use', id: tool.id, name: tool.name, input }
      }
      state.pendingTools.clear()
    } finally {
      reader.releaseLock()
    }

    yield {
      type: 'done',
      usage: { inputTokens: state.inputTokens, outputTokens: state.outputTokens },
    }
  }

  /** Process SSE lines from OpenAI's `chat/completions` stream. */
  private *processSSELines(lines: string[], state: OpenaiStreamState): Iterable<ChatEvent> {
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const json = line.slice(6).trim()
      if (json === '[DONE]') continue
      try {
        const event = JSON.parse(json) as Record<string, unknown>
        const choices = event.choices as Array<Record<string, unknown>> | undefined
        if (choices) {
          for (const choice of choices) {
            const delta = choice.delta as Record<string, unknown> | undefined
            if (typeof delta?.content === 'string' && delta.content.length > 0) {
              yield { type: 'text', content: delta.content }
            }
            const toolCalls = delta?.tool_calls as Array<Record<string, unknown>> | undefined
            if (toolCalls) {
              for (const call of toolCalls) {
                const idx = Number(call.index ?? 0)
                const fn = call.function as { name?: string; arguments?: string } | undefined
                const existing = state.pendingTools.get(idx) ?? {
                  id: String(call.id ?? ''),
                  name: '',
                  argsJson: '',
                }
                if (call.id) existing.id = String(call.id)
                if (fn?.name) existing.name = String(fn.name)
                if (typeof fn?.arguments === 'string') existing.argsJson += fn.arguments
                state.pendingTools.set(idx, existing)
              }
            }
          }
        }
        const usage = event.usage as
          | { prompt_tokens?: number; completion_tokens?: number }
          | undefined
        if (usage) {
          if (typeof usage.prompt_tokens === 'number') state.inputTokens = usage.prompt_tokens
          if (typeof usage.completion_tokens === 'number')
            state.outputTokens = usage.completion_tokens
        }
      } catch {
        logger.debug('Skipping malformed OpenAI SSE JSON line', { json })
      }
    }
  }
}

/**
 * Create an OpenAI AI provider instance.
 *
 * @param config - OpenAI-specific configuration.
 * @returns An `AIProvider` backed by OpenAI's Chat Completions API.
 */
export function createProvider(config?: OpenaiConfig): AIProvider {
  return new OpenaiAIProvider(config)
}
