/**
 * Anthropic Claude implementation of AIProvider.
 *
 * Talks to the Anthropic Messages API (`POST {baseUrl}/v1/messages`) directly
 * over `fetch` — no `@anthropic-ai/sdk` dependency — parsing the SSE stream
 * into `ChatEvent`s (text, thinking, tool use, usage snapshots, done).
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
  TokenUsage,
} from '@molecule/api-ai'
import { getLogger } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

const logger = getLogger()

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

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
 * Builds a `TokenUsage` from the stream state's provider-reported counters —
 * shared by the mid-stream `usage` snapshots and the terminal `done` event so
 * the two can never diverge.
 *
 * @param state - The streaming parser state.
 * @returns The usage counters accumulated so far.
 */
function snapshotUsage(state: AnthropicStreamState): TokenUsage {
  return {
    inputTokens: state.inputTokens,
    outputTokens: state.outputTokens,
    ...(state.cacheCreationInputTokens
      ? { cacheCreationInputTokens: state.cacheCreationInputTokens }
      : {}),
    ...(state.cacheReadInputTokens ? { cacheReadInputTokens: state.cacheReadInputTokens } : {}),
  }
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
    this.baseUrl = config.baseUrl ?? process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com'

    // Fail fast with an actionable local error rather than a cryptic 401 on the
    // first request. The default `provider` export constructs lazily on first
    // use (see index.ts), so this surfaces the moment the provider is actually
    // used, not at bond/module-load time.
    if (!this.apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Add it to your environment to use the Anthropic Claude AI provider.',
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
      if (params.toolChoice === 'required') {
        body.tool_choice = { type: 'any' }
      } else if (typeof params.toolChoice === 'object' && params.toolChoice?.type === 'tool') {
        body.tool_choice = { type: 'tool', name: params.toolChoice.name }
      }
    }
    if (params.stream !== false) body.stream = true

    // Thinking requires temperature=1 (default); skip any explicit temperature override.
    //
    // Two thinking paths, keyed off the caller-resolved native effort value:
    // - `effort` present (Fable 5, Opus 4.8/4.6, Sonnet 5 / 4.6, per the model
    //   catalog): adaptive thinking + output_config.effort. Manual
    //   `budget_tokens` is REJECTED with a 400 on Fable 5 / Opus 4.8 / Sonnet 5
    //   and deprecated on the 4.6 family, so this path is load-bearing.
    //   Adaptive thinking auto-enables interleaved thinking — no beta header.
    // - `effort` absent (Claude Haiku 4.5 and older models): legacy manual
    //   extended thinking with `budget_tokens` + the interleaved-thinking beta.
    const nativeEffort = params.thinking?.effort
    if (params.thinking && nativeEffort) {
      body.thinking = { type: 'adaptive' }
      body.output_config = { effort: nativeEffort }
    } else if (params.thinking) {
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
    // Prompt caching is GA (no longer needs a beta flag). Interleaved thinking
    // needs its beta flag only on the legacy budget_tokens path — adaptive
    // thinking interleaves automatically.
    const betaFeatures: string[] = []
    if (params.thinking && !nativeEffort) betaFeatures.push('interleaved-thinking-2025-05-14')
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
          // Use Retry-After header if provided, otherwise exponential backoff.
          // Retry-After is equally-valid as delta-seconds ('30') or an
          // HTTP-date ('Wed, 21 Oct ... GMT'); parseInt on the date form
          // yields NaN, which previously produced setTimeout(resolve, NaN) —
          // fires ~immediately, degrading the backoff to rapid-fire retries
          // against an already rate-limiting API. Guard the parse and fall
          // back to exponential backoff for any non-finite/negative value.
          const retryAfter = response.headers.get('retry-after')
          const parsedRetryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : NaN
          const delayMs =
            Number.isFinite(parsedRetryAfterSeconds) && parsedRetryAfterSeconds >= 0
              ? Math.min(parsedRetryAfterSeconds * 1000, 60_000)
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
      } catch (_error) {
        // Best-effort: if the error body isn't valid JSON, use it as plain text
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
              : response!.status === 400
                ? // A permanently-invalid request (bad param, e.g. temperature on a
                  // model that rejects sampling params, a malformed tool schema)
                  // is NOT retryable — distinguish it from the generic fallback so
                  // a caller (or an executor retrying blindly) doesn't loop on a
                  // request that can never succeed.
                  'AI request was invalid — check the model and request parameters.'
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
        } else if (block.type === 'thinking') {
          // The streaming path yields 'thinking' events via thinking_delta;
          // a non-streaming response (params.stream === false) carries the
          // same content as a single 'thinking' block that was previously
          // silently dropped here — callers using stream:false with thinking
          // enabled lost the thinking output with no signal it ever existed.
          yield { type: 'thinking', content: block.thinking as string }
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

        let yielded = false
        for (const event of this.processSSELines(lines, state)) {
          yielded = true
          yield event
          // A mid-stream provider error (Anthropic sends `overloaded_error` as an
          // SSE `error` event AFTER a 200 OK during high load) means the turn was
          // truncated. Stop here and do NOT fall through to the trailing `done` —
          // a `done` reports the truncated turn to the consumer as a successful
          // completion, so the caller's overload/retry recovery never fires.
          // Mirrors the HTTP-level error path (yield error; return).
          if (event.type === 'error') return
        }
        // We received data from the API but it produced no ChatEvent — e.g. a
        // `ping` or an empty/keepalive event. (Tool-input chunks now yield a
        // `tool_input_delta` instead of falling through here, so a large
        // streaming tool input keeps the UI live rather than going silent.) The
        // connection is still alive, so signal liveness to reset the consumer's
        // inter-event stream timeout, which would otherwise false-fire.
        if (!yielded) yield { type: 'keep_alive' }
      }

      // Flush any remaining data in the buffer after EOF
      if (buffer.trim()) {
        for (const event of this.processSSELines(buffer.split('\n'), state)) {
          yield event
          if (event.type === 'error') return
        }
      }

      // Emit any tool call still pending after stream ends (safety net for missing content_block_stop)
      if (state.pendingTool) {
        let input: unknown = {}
        try {
          input = JSON.parse(state.pendingTool.inputJson)
        } catch (_error) {
          // Best-effort: malformed JSON from a truncated stream yields an empty input object
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

    yield { type: 'done', usage: snapshotUsage(state) }
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
            const chunk = delta.partial_json as string
            state.pendingTool.inputJson += chunk
            // Emit the chunk's char count as real progress (re-arms the
            // consumer's stream timeout and drives the live token counter)
            // instead of letting it fall through to a silent keep_alive — the
            // root cause of the dead loading indicator while a large tool input
            // streams in. Just the count, not the content (the consumer
            // coalesces these and only needs the magnitude).
            yield {
              type: 'tool_input_delta',
              id: state.pendingTool.id,
              chars: chunk.length,
              // Raw partial-JSON chunk — server-side only; the handler accumulates
              // it to extract short display fields (e.g. file path) for the live
              // tool-card label before the args finish streaming.
              text: chunk,
            }
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
            // Surface the tool start immediately (id + name) so the client shows
            // activity before the full input finishes streaming.
            yield { type: 'tool_use_start', id: block.id as string, name: block.name as string }
          } else if (block.type === 'thinking') {
            state.pendingThinking = ''
          }
        } else if (eventType === 'content_block_stop') {
          // Emit completed tool_use with accumulated input
          if (state.pendingTool) {
            let input: unknown = {}
            try {
              input = JSON.parse(state.pendingTool.inputJson)
            } catch (_error) {
              // Best-effort: malformed accumulated JSON falls back to empty input object
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
          if (usage?.output_tokens) {
            state.outputTokens = usage.output_tokens
            // Metering snapshot (latest wins): if the stream is cut after this
            // point, the consumer books these provider-reported counts instead
            // of dropping the turn (see the ChatEvent 'usage' contract).
            yield { type: 'usage', usage: snapshotUsage(state) }
          }
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
          // message_start carries the FULL input-side counts (fresh + cache read
          // + cache write) before any output streams — for long-context agentic
          // turns this is the bulk of the turn's cost. Snapshot it immediately so
          // an abort mid-generation still meters the input the provider bills.
          if (usage) {
            yield { type: 'usage', usage: snapshotUsage(state) }
          }
        } else if (eventType === 'error') {
          // Anthropic can emit an `error` SSE event MID-STREAM (after a 200 OK) —
          // most commonly `overloaded_error` during high load, the streaming
          // analogue of an HTTP 529. It matches no content branch above, so
          // without this it was silently dropped and the stream fell through to a
          // misleading `done` — a truncated turn reported as a successful
          // completion. Surface it as a real `error` event (mapped to the same
          // actionable messages as the HTTP-level path) so the consumer's overload
          // handling fires instead. Also satisfies the no-silent-swallow rule.
          const streamError = event.error as { type?: string; message?: string } | undefined
          const errorType = streamError?.type ?? ''
          logger.error('Anthropic streaming error event', {
            errorType,
            message: streamError?.message,
          })
          const clientMessage =
            errorType === 'overloaded_error'
              ? 'AI service is temporarily overloaded. Please try again in a moment.'
              : errorType === 'rate_limit_error'
                ? 'AI rate limit exceeded. Please try again shortly.'
                : 'AI service error. Please try again.'
          yield { type: 'error', message: clientMessage, errorKey: 'ai.error.apiError' }
        }
      } catch (error) {
        logger.debug('Skipping malformed SSE JSON line', { json, error })
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
