/**
 * xAI Grok implementation of AIProvider.
 *
 * Uses the xAI API (OpenAI-compatible) for streaming chat completions with tool use.
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

import type { XaiConfig } from './types.js'

/** Mutable token usage counters shared across SSE line-processing calls. */
interface XaiStreamState {
  /** Total prompt tokens (cached + uncached), as reported by the API. */
  inputTokens: number
  outputTokens: number
  /** Cached prompt tokens (subset of inputTokens), from prompt_tokens_details. */
  cachedTokens: number
}

/**
 * Fallback: map thinking budget tokens to an xAI reasoning_effort level when the
 * caller didn't resolve a native value from the model catalog. Current Grok
 * models (grok-4.3) accept `none | low | medium | high` (default `low`) —
 * callers should prefer passing `thinking.effort` with one of those values.
 *
 * @param budgetTokens - Requested thinking budget in tokens.
 * @returns Either `'high'` or `'low'` for the upstream effort hint.
 */
function budgetToEffort(budgetTokens: number): string {
  return budgetTokens >= 8_000 ? 'high' : 'low'
}

/**
 * xAI Grok AI provider that implements the `AIProvider` interface
 * using xAI's OpenAI-compatible Chat Completions API with support
 * for streaming, tool use, and reasoning.
 */
class XaiAIProvider implements AIProvider {
  readonly name = 'xai'
  private apiKey: string
  private defaultModel: string
  private maxTokens: number
  private baseUrl: string

  constructor(config: XaiConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.XAI_API_KEY ?? ''
    this.defaultModel = config.defaultModel ?? 'grok-code-fast-1'
    this.maxTokens = config.maxTokens ?? 4096
    this.baseUrl = config.baseUrl ?? process.env.XAI_BASE_URL ?? 'https://api.x.ai'

    // Fail fast with an actionable local error rather than a cryptic 401 on the
    // first request. The default `provider` export constructs lazily on first
    // use (see index.ts), so this surfaces the moment the provider is actually
    // used, not at bond/module-load time.
    if (!this.apiKey) {
      throw new Error(
        'XAI_API_KEY is not set. Add it to your environment to use the xAI Grok AI provider.',
      )
    }
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

    const messages = this.formatMessages(params.messages, params.system)

    const body: Record<string, unknown> = {
      model,
      max_completion_tokens: maxTokens,
      messages,
      stream: params.stream !== false,
      ...(params.stream !== false ? { stream_options: { include_usage: true } } : {}),
    }

    // Tools: merge custom tools (function format) and server tools
    const functions = params.tools?.length ? this.formatTools(params.tools) : []
    const serverTools = (params.serverTools ?? []).map((st) => ({ ...st }))
    const allTools = [...functions, ...serverTools]
    if (allTools.length > 0) {
      body.tools = allTools
      if (params.toolChoice === 'required') {
        body.tool_choice = 'required'
      } else if (typeof params.toolChoice === 'object' && params.toolChoice?.type === 'tool') {
        body.tool_choice = { type: 'function', function: { name: params.toolChoice.name } }
      }
    }

    if (params.thinking) {
      // Prefer the caller-resolved native value (none | low | medium | high on
      // grok-4.3, from the model catalog); fall back to the budget threshold.
      body.reasoning_effort = params.thinking.effort ?? budgetToEffort(params.thinking.budgetTokens)
    } else if (params.temperature !== undefined) {
      body.temperature = params.temperature
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    }

    const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000
    const signal = params.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS)

    // Retry with exponential backoff for rate limits (429) and overloaded (503)
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
          // Retry-After is equally-valid as delta-seconds or an HTTP-date;
          // parseInt on the date form yields NaN, degrading the backoff to a
          // ~0ms retry against an already rate-limiting API. Guard it.
          const retryAfter = response.headers.get('retry-after')
          const parsedRetryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : NaN
          const delayMs =
            Number.isFinite(parsedRetryAfterSeconds) && parsedRetryAfterSeconds >= 0
              ? Math.min(parsedRetryAfterSeconds * 1000, 60_000)
              : Math.min(1000 * 2 ** attempt, 30_000)
          logger.warn('xAI API rate limited, retrying', {
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
      } catch (_error) {
        // errorBody is not valid JSON; use the raw text as the detail string instead
        if (errorBody.length > 0 && errorBody.length < 200) detail = errorBody
      }
      logger.error('xAI API error', { status: response!.status, detail, errorBody })
      const clientMessage =
        response!.status === 429
          ? 'AI rate limit exceeded. Please try again shortly.'
          : response!.status === 401
            ? 'AI service configuration error.'
            : response!.status === 400 &&
                /prompt is too long|too many tokens|token.*limit|context.*length/i.test(detail)
              ? "Conversation too long for the model's context window. Use /compact to free space, or start a new conversation."
              : response!.status === 400
                ? 'AI request was invalid — check the model and request parameters.'
                : response!.status === 503
                  ? 'AI service is temporarily overloaded. Please try again in a moment.'
                  : 'AI service error. Please try again.'
      yield { type: 'error', message: clientMessage, errorKey: 'ai.error.apiError' }
      return
    }

    if (params.stream === false) {
      const data = (await response!.json()) as Record<string, unknown>
      yield* this.parseNonStreamingResponse(data)
      return
    }

    yield* this.parseStreamingResponse(response!)
  }

  /**
   * Converts internal `ChatMessage` objects to the OpenAI-compatible message format.
   * System prompt is prepended as a system role message.
   *
   * @param messages - The chat messages to format.
   * @param system - Optional system prompt to prepend.
   * @returns The formatted messages array for the xAI API.
   */
  private formatMessages(messages: ChatMessage[], system?: string): Array<Record<string, unknown>> {
    const formatted: Array<Record<string, unknown>> = []

    if (system) {
      formatted.push({ role: 'system', content: system })
    }

    for (const m of messages) {
      if (m.role === 'system') continue // handled above

      if (typeof m.content === 'string') {
        formatted.push({ role: m.role, content: m.content })
        continue
      }

      // Content blocks — convert to OpenAI format
      const blocks = m.content as ContentBlock[]
      const parts: Array<Record<string, unknown>> = []
      const toolCalls: Array<Record<string, unknown>> = []
      const toolResults: Array<Record<string, unknown>> = []

      for (const block of blocks) {
        switch (block.type) {
          case 'text':
            parts.push({ type: 'text', text: block.text })
            break
          case 'image':
            parts.push({
              type: 'image_url',
              image_url: { url: `data:${block.mediaType};base64,${block.data}` },
            })
            break
          case 'tool_use':
            toolCalls.push({
              id: block.id,
              type: 'function',
              function: { name: block.name, arguments: JSON.stringify(block.input) },
            })
            break
          case 'tool_result':
            toolResults.push({
              role: 'tool',
              tool_call_id: block.tool_use_id,
              content:
                typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
            })
            break
          default:
            // document, audio, video — unsupported, skip
            break
        }
      }

      if (toolResults.length > 0) {
        // Tool results are separate messages in OpenAI format
        for (const tr of toolResults) {
          formatted.push(tr)
        }
      } else if (toolCalls.length > 0) {
        // Assistant message with tool calls
        formatted.push({
          role: 'assistant',
          content: parts.length > 0 ? parts : null,
          tool_calls: toolCalls,
        })
      } else {
        formatted.push({
          role: m.role,
          content: parts.length === 1 && parts[0].type === 'text' ? parts[0].text : parts,
        })
      }
    }

    return formatted
  }

  /**
   * Converts internal `AITool` definitions to the OpenAI function calling format.
   *
   * @param tools - The AI tool definitions to format.
   * @returns The formatted tools array for the xAI API.
   */
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

  /**
   * Parses a non-streaming OpenAI-compatible response into `ChatEvent` objects.
   *
   * @param data - The raw API response data to parse.
   * @yields {ChatEvent} Chat events parsed from the response.
   */
  private *parseNonStreamingResponse(data: Record<string, unknown>): Iterable<ChatEvent> {
    const choices = data.choices as Array<Record<string, unknown>> | undefined
    if (choices?.length) {
      const message = choices[0].message as Record<string, unknown>
      if (message) {
        // Reasoning/thinking content
        if (message.reasoning_content && typeof message.reasoning_content === 'string') {
          yield { type: 'thinking', content: message.reasoning_content }
        }

        if (message.content && typeof message.content === 'string') {
          yield { type: 'text', content: message.content }
        }

        const toolCalls = message.tool_calls as Array<Record<string, unknown>> | undefined
        if (toolCalls) {
          for (const tc of toolCalls) {
            const fn = tc.function as Record<string, unknown>
            let input: unknown = {}
            try {
              input = JSON.parse(fn.arguments as string)
            } catch (_error) {
              // API returned unparseable arguments JSON; fall back to empty object so tool_use is still emitted
            }
            yield {
              type: 'tool_use',
              id: tc.id as string,
              name: fn.name as string,
              input,
            }
          }
        }
      }
    }

    const usage = data.usage as
      | {
          prompt_tokens?: number
          completion_tokens?: number
          prompt_tokens_details?: { cached_tokens?: number }
        }
      | undefined
    const cached = usage?.prompt_tokens_details?.cached_tokens ?? 0
    yield {
      type: 'done',
      usage: {
        // Report uncached input + cached separately (Anthropic semantics) so the
        // consumer's context/cost math doesn't double-count the cached subset.
        inputTokens: Math.max(0, (usage?.prompt_tokens ?? 0) - cached),
        outputTokens: usage?.completion_tokens ?? 0,
        cacheReadInputTokens: cached,
      },
    }
  }

  /**
   * Parses a streaming SSE response from the xAI API (OpenAI-compatible format),
   * yielding `ChatEvent` objects as they arrive.
   *
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
    const state: XaiStreamState = { inputTokens: 0, outputTokens: 0, cachedTokens: 0 }

    // Track pending tool calls (accumulated across deltas). `started` guards the
    // one-shot tool_use_start emission once the id + name are first known.
    const pendingTools: Map<number, { id: string; name: string; args: string; started: boolean }> =
      new Map()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        let yieldedContent = false
        for (const event of this.processSSELines(lines, pendingTools, state)) {
          yieldedContent = true
          yield event
          // A mid-stream error (rate-limit/overload during high load, sent as a
          // `data: {"error": {...}}` chunk) means the turn was truncated. Stop
          // here and do NOT fall through to the trailing `done`, which would
          // report the truncated turn as a successful completion and skip the
          // consumer's overload/retry recovery.
          if (event.type === 'error') return
        }

        // Signal liveness when the API sends data but no content events were produced
        // (e.g., during extended reasoning with empty chunks or keepalive comments).
        // This resets the consumer's stream timeout without forwarding to the client.
        if (!yieldedContent) {
          yield { type: 'keep_alive' }
        }
      }

      // Flush any remaining data in the buffer after EOF
      if (buffer.trim()) {
        for (const event of this.processSSELines(buffer.split('\n'), pendingTools, state)) {
          yield event
          if (event.type === 'error') return
        }
      }

      // Emit any tool calls still pending after stream ends (safety net for missing finish_reason)
      if (pendingTools.size > 0) {
        for (const [, pending] of pendingTools) {
          let input: unknown = {}
          try {
            input = JSON.parse(pending.args)
          } catch (_error) {
            // Accumulated args are not valid JSON (e.g. partial stream); fall back to empty object
          }
          yield { type: 'tool_use', id: pending.id, name: pending.name, input }
        }
        pendingTools.clear()
      }
    } finally {
      reader.releaseLock()
    }

    yield {
      type: 'done',
      usage: {
        inputTokens: Math.max(0, state.inputTokens - state.cachedTokens),
        outputTokens: state.outputTokens,
        cacheReadInputTokens: state.cachedTokens,
      },
    }
  }

  /**
   * Processes an array of SSE lines from the xAI streaming response, yielding
   * ChatEvent objects for text, thinking, tool use, and tool completion.
   *
   * @param lines - Raw SSE lines to process.
   * @param pendingTools - Mutable map tracking tool call deltas accumulated across chunks.
   * @param state - Mutable token usage counters.
   * @yields {ChatEvent} Chat events extracted from the SSE lines.
   */
  private *processSSELines(
    lines: string[],
    pendingTools: Map<number, { id: string; name: string; args: string; started: boolean }>,
    state: XaiStreamState,
  ): Iterable<ChatEvent> {
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const json = line.slice(6).trim()
      if (json === '[DONE]') continue

      try {
        const event = JSON.parse(json) as Record<string, unknown>

        // A mid-stream error arrives as a `data: {"error": {...}}` chunk (no
        // `choices`) — most importantly rate-limit/overload during high load.
        // Without this it matches no branch below and is silently dropped, so the
        // stream falls through to a misleading `done` and the truncated turn reads
        // as a successful completion. Surface it as a real error event (also
        // satisfies the no-silent-swallow rule).
        const streamError = event.error as
          | { message?: string; type?: string; code?: string }
          | undefined
        if (streamError) {
          const detail = `${streamError.code ?? streamError.type ?? ''} ${streamError.message ?? ''}`
          logger.error('xAI streaming error event', {
            type: streamError.type,
            code: streamError.code,
            message: streamError.message,
          })
          const clientMessage = /overload|capacity|503|529/i.test(detail)
            ? 'AI service is temporarily overloaded. Please try again in a moment.'
            : /rate.?limit|429|quota/i.test(detail)
              ? 'AI rate limit exceeded. Please try again shortly.'
              : 'AI service error. Please try again.'
          yield { type: 'error', message: clientMessage, errorKey: 'ai.error.apiError' }
          continue
        }

        // Usage info (may appear in the final chunk)
        const usage = event.usage as
          | {
              prompt_tokens?: number
              completion_tokens?: number
              prompt_tokens_details?: { cached_tokens?: number }
            }
          | undefined
        if (usage) {
          if (usage.prompt_tokens) state.inputTokens = usage.prompt_tokens
          if (usage.completion_tokens) state.outputTokens = usage.completion_tokens
          if (usage.prompt_tokens_details?.cached_tokens)
            state.cachedTokens = usage.prompt_tokens_details.cached_tokens
        }

        const choices = event.choices as Array<Record<string, unknown>> | undefined
        if (!choices?.length) continue

        const choice = choices[0]
        const delta = choice.delta as Record<string, unknown> | undefined
        if (!delta) continue

        // Reasoning/thinking content
        if (delta.reasoning_content && typeof delta.reasoning_content === 'string') {
          yield { type: 'thinking', content: delta.reasoning_content }
        }

        // Text content
        if (delta.content && typeof delta.content === 'string') {
          yield { type: 'text', content: delta.content }
        }

        // Tool calls (accumulated across deltas)
        const toolCalls = delta.tool_calls as Array<Record<string, unknown>> | undefined
        if (toolCalls) {
          for (const tc of toolCalls) {
            const idx = tc.index as number
            const fn = tc.function as Record<string, unknown> | undefined

            if (!pendingTools.has(idx)) {
              pendingTools.set(idx, {
                id: (tc.id as string) ?? '',
                name: fn?.name ? (fn.name as string) : '',
                args: '',
                started: false,
              })
            }

            const pending = pendingTools.get(idx)!
            if (tc.id) pending.id = tc.id as string
            if (fn?.name) pending.name = fn.name as string
            // Surface the tool start once id + name are known, before the
            // arguments finish streaming, so the client shows activity immediately.
            if (!pending.started && pending.id && pending.name) {
              pending.started = true
              yield { type: 'tool_use_start', id: pending.id, name: pending.name }
            }
            if (fn?.arguments) {
              const chunk = fn.arguments as string
              pending.args += chunk
              // Emit the chunk's char count as real progress (drives the live
              // token counter; re-arms the stream timeout) rather than a silent
              // keep_alive — fixes the dead loading indicator during long writes.
              // Just the count, not the content (the consumer coalesces these).
              yield { type: 'tool_input_delta', id: pending.id, chars: chunk.length, text: chunk }
            }
          }
        }

        // finish_reason signals completion
        const finishReason = choice.finish_reason as string | null
        if (finishReason === 'tool_calls' || finishReason === 'stop') {
          // Emit any accumulated tool calls
          for (const [, pending] of pendingTools) {
            let input: unknown = {}
            try {
              input = JSON.parse(pending.args)
            } catch (_error) {
              // Accumulated args are not valid JSON (e.g. partial stream); fall back to empty object
            }
            yield {
              type: 'tool_use',
              id: pending.id,
              name: pending.name,
              input,
            }
          }
          pendingTools.clear()
        }
      } catch (error) {
        logger.debug('Skipping malformed SSE JSON line', { json, error })
      }
    }
  }
}

/**
 * Creates an xAI Grok AI provider instance.
 *
 * @param config - xAI-specific configuration (API key, model, max tokens, base URL).
 * @returns An `AIProvider` backed by the xAI Chat Completions API.
 */
export function createProvider(config?: XaiConfig): AIProvider {
  return new XaiAIProvider(config)
}
