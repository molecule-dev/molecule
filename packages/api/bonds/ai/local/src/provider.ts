/**
 * Local implementation of AIProvider.
 *
 * Streams chat completions from any OpenAI-compatible LOCAL inference server
 * (Ollama, LM Studio, llama.cpp, vLLM) over `POST {baseUrl}/chat/completions`
 * using raw `fetch` — no SDK. It is the OpenAI provider with (a) a configurable
 * `baseUrl`, (b) an OPTIONAL/absent API key (the `Authorization` header is sent
 * only when a key is present), and (c) no "API key required" throw at
 * construction (local runs are keyless).
 *
 * @module
 */

// Side-effect import: registers this bond's OPTIONAL secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type {
  AIProvider,
  AITool,
  ChatEvent,
  ChatMessage,
  ChatParams,
  ContentBlock,
} from '@molecule/api-ai'
import { getLogger } from '@molecule/api-bond'

import type { LocalConfig } from './types.js'

const logger = getLogger()

/** Ollama's OpenAI-compatible endpoint (base URL includes the `/v1` segment). */
const DEFAULT_BASE_URL = 'http://localhost:11434/v1'
/** Default model when none is configured or requested. */
const DEFAULT_MODEL = 'llama3.1'
/** Default max output tokens. */
const DEFAULT_MAX_TOKENS = 4096

/** Mutable streaming state for the OpenAI-compatible parser. */
interface LocalStreamState {
  /** Total prompt tokens (cached + uncached), as reported by the API. */
  inputTokens: number
  outputTokens: number
  /** Cached prompt tokens (subset of inputTokens), from prompt_tokens_details. */
  cachedTokens: number
  pendingTools: Map<number, { id: string; name: string; argsJson: string; started: boolean }>
}

/**
 * Local (OpenAI-compatible) chat provider implementing the `AIProvider`
 * interface. Mirrors `@molecule/api-ai-openai` so the same handler code can
 * dispatch to a local endpoint.
 */
export class LocalAIProvider implements AIProvider {
  readonly name = 'local'
  private apiKey: string
  private defaultModel: string
  private maxTokens: number
  private baseUrl: string

  constructor(config: LocalConfig = {}) {
    // Keyless by default — many local servers ignore auth. Empty string means
    // "no key", so no Authorization header is sent. NEVER throws for a missing
    // key at construction.
    this.apiKey = config.apiKey ?? process.env.LOCAL_AI_API_KEY ?? ''
    this.defaultModel = config.model ?? process.env.LOCAL_AI_MODEL ?? DEFAULT_MODEL
    this.maxTokens = DEFAULT_MAX_TOKENS
    this.baseUrl =
      config.baseUrl ??
      process.env.LOCAL_AI_BASE_URL ??
      process.env.OLLAMA_BASE_URL ??
      DEFAULT_BASE_URL
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

    // Reasoning depth: the caller resolves the model's native reasoning_effort
    // value from the model catalog and passes it as `thinking.effort`. Local
    // servers that don't support it typically ignore an unknown field.
    if (params.thinking?.effort) {
      body.reasoning_effort = params.thinking.effort
    }

    const tools = params.tools?.length ? this.formatTools(params.tools) : null
    if (tools) {
      body.tools = tools
      if (params.toolChoice === 'required') {
        body.tool_choice = 'required'
      } else if (typeof params.toolChoice === 'object' && params.toolChoice?.type === 'tool') {
        body.tool_choice = { type: 'function', function: { name: params.toolChoice.name } }
      }
    }

    const useStream = params.stream !== false
    if (useStream) {
      body.stream = true
      body.stream_options = { include_usage: true }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    // Only authenticate when a key is configured — local servers are keyless.
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`

    const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000
    const signal = params.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS)

    const url = `${this.baseUrl}/chat/completions`

    try {
      const MAX_RETRIES = 3
      let response: Response | null = null
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal,
        })

        if (response.status === 429 || response.status === 503) {
          if (attempt < MAX_RETRIES) {
            // Retry-After is equally-valid as delta-seconds or an HTTP-date;
            // parseInt on the date form yields NaN, degrading the backoff to
            // a ~0ms retry against an already-busy local endpoint. Guard it.
            const retryAfter = response.headers.get('retry-after')
            const parsedRetryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : NaN
            const delayMs =
              Number.isFinite(parsedRetryAfterSeconds) && parsedRetryAfterSeconds >= 0
                ? Math.min(parsedRetryAfterSeconds * 1000, 60_000)
                : Math.min(1000 * 2 ** attempt, 30_000)
            logger.warn('Local AI endpoint busy, retrying', {
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
          // Best-effort: detail already has an HTTP-status fallback; malformed body just stays as-is.
          if (errorBody.length > 0 && errorBody.length < 200) detail = errorBody
        }
        logger.error('Local AI endpoint error', { status: response!.status, url, detail })
        const clientMessage =
          response!.status === 429
            ? 'AI rate limit exceeded. Please try again shortly.'
            : response!.status === 401 || response!.status === 403
              ? 'AI service configuration error.'
              : response!.status === 404
                ? 'Local AI endpoint or model not found. Is the server running and the model pulled?'
                : response!.status === 400 &&
                    /context.*length|maximum context|too many tokens|prompt is too long/i.test(
                      detail,
                    )
                  ? "Conversation too long for the model's context window."
                  : response!.status === 400
                    ? 'AI request was invalid — check the model and request parameters.'
                    : response!.status === 503 || response!.status === 502
                      ? 'AI service is temporarily overloaded. Please try again in a moment.'
                      : 'AI service error. Please try again.'
        // Non-OK is a soft failure surfaced as an in-band error EVENT then a
        // graceful return — matching the 8 sibling providers. molecule-dev's
        // chat-handler consumes this via its `case 'error':` branch, which is a
        // different path from its outer try/catch; throwing here would break
        // that consumer contract.
        yield { type: 'error', message: clientMessage, errorKey: 'ai.error.apiError' }
        return
      }

      if (!useStream) {
        const data = (await response!.json()) as Record<string, unknown>
        yield* this.parseNonStreamingResponse(data)
        return
      }

      yield* this.parseStreamingResponse(response!)
    } catch (error) {
      // A deliberate abort — client disconnect via `params.signal`, or the
      // internal stream timeout — must PROPAGATE as a rejection with NO error
      // event: the metering-snapshot contract books the usage of a cut stream,
      // and this matches the sibling providers. Every other failure (a network
      // error like connection-refused — common for a local server that isn't
      // running — or a stream/parse error) becomes a sanitized error event +
      // graceful return, never a throw.
      if (signal.aborted) throw error
      logger.error('Local AI endpoint request failed', { url, error })
      yield {
        type: 'error',
        message: 'AI service error. Please try again.',
        errorKey: 'ai.error.apiError',
      }
      return
    }
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

  /**
   * Parse a non-streaming `/chat/completions` response.
   *
   * @param data - The parsed JSON response body.
   * @yields {ChatEvent} Text, tool-use, and done events extracted from the response.
   */
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
        } catch (_error) {
          // Best-effort: malformed tool-call arguments are unusable; fall back to empty object.
        }
        yield {
          type: 'tool_use',
          id: String(call.id ?? ''),
          name: String(fn?.name ?? ''),
          input,
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
   * Parse a streaming SSE response from `/chat/completions`.
   *
   * @param response - The fetch Response whose body is an SSE stream.
   * @yields {ChatEvent} Incremental text, tool-use progress, keep-alive, and done events.
   */
  private async *parseStreamingResponse(response: Response): AsyncIterable<ChatEvent> {
    const reader = response.body?.getReader()
    if (!reader) {
      yield {
        type: 'error',
        message: 'No response body from the local AI endpoint.',
        errorKey: 'ai.error.noResponseBody',
      }
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    const state: LocalStreamState = {
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      pendingTools: new Map(),
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
          // A mid-stream error (rate-limit/overload during high load, sent as a
          // `data: {"error": {...}}` chunk) means the turn was truncated. Stop
          // here and do NOT fall through to the trailing `done`, which would
          // report the truncated turn as a successful completion and skip the
          // consumer's overload/retry recovery.
          if (event.type === 'error') return
        }
        // Received data but produced no ChatEvent (a keepalive comment, an empty
        // delta, a ping). The model is still alive — signal liveness so the
        // consumer's inter-event stream timeout doesn't false-fire mid-generation.
        if (!yielded) yield { type: 'keep_alive' }
      }
      if (buffer.trim()) {
        for (const event of this.processSSELines(buffer.split('\n'), state)) {
          yield event
          if (event.type === 'error') return
        }
      }

      // Flush any pending tool calls with their accumulated arguments.
      for (const tool of state.pendingTools.values()) {
        let input: unknown = {}
        try {
          input = tool.argsJson ? JSON.parse(tool.argsJson) : {}
        } catch (_error) {
          // Best-effort: streaming tool arguments arrived malformed; fall back to empty object.
        }
        yield { type: 'tool_use', id: tool.id, name: tool.name, input }
      }
      state.pendingTools.clear()
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
   * Process SSE lines from an OpenAI-compatible `chat/completions` stream.
   *
   * @param lines - Individual SSE lines to parse.
   * @param state - Mutable stream state tracking tokens and pending tool calls.
   * @yields {ChatEvent} Text, tool-use progress, and usage events parsed from the SSE data lines.
   */
  private *processSSELines(lines: string[], state: LocalStreamState): Iterable<ChatEvent> {
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const json = line.slice(6).trim()
      if (json === '[DONE]') continue
      try {
        const event = JSON.parse(json) as Record<string, unknown>
        // A mid-stream error arrives as a `data: {"error": {...}}` chunk (no
        // `choices`) — most importantly rate-limit/overload when a shared local
        // endpoint is under load. Without this it matches no branch below and is
        // silently dropped, so the stream falls through to a misleading `done`
        // and the truncated turn reads as a successful completion. Surface it as
        // a real error event (also satisfies the no-silent-swallow rule).
        const streamError = event.error as
          | { message?: string; type?: string; code?: string }
          | undefined
        if (streamError) {
          const detail = `${streamError.code ?? streamError.type ?? ''} ${streamError.message ?? ''}`
          logger.error('Local AI streaming error event', {
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
        const choices = event.choices as Array<Record<string, unknown>> | undefined
        if (choices) {
          for (const choice of choices) {
            const delta = choice.delta as Record<string, unknown> | undefined
            if (typeof delta?.content === 'string' && delta.content.length > 0) {
              yield { type: 'text', content: delta.content }
            }
            const toolCalls = delta?.tool_calls as Array<Record<string, unknown>> | undefined
            if (toolCalls) {
              yield* this.processToolCallDeltas(toolCalls, state)
            }
          }
        }
        const usage = event.usage as
          | {
              prompt_tokens?: number
              completion_tokens?: number
              prompt_tokens_details?: { cached_tokens?: number }
            }
          | undefined
        if (usage) {
          if (typeof usage.prompt_tokens === 'number') state.inputTokens = usage.prompt_tokens
          if (typeof usage.completion_tokens === 'number')
            state.outputTokens = usage.completion_tokens
          if (typeof usage.prompt_tokens_details?.cached_tokens === 'number')
            state.cachedTokens = usage.prompt_tokens_details.cached_tokens
        }
      } catch (error) {
        logger.debug('Skipping malformed local AI SSE JSON line', { json, error })
      }
    }
  }

  /**
   * Accumulate a streamed `delta.tool_calls` chunk into `state`, emitting a
   * `tool_use_start` the first time a tool call is identified and a
   * `tool_input_delta` for each argument chunk — real progress that re-arms the
   * consumer's stream timeout instead of a silent `keep_alive` while a large
   * tool input streams in. The completed `tool_use` is flushed at stream end.
   *
   * @param toolCalls - The `delta.tool_calls` array from one SSE chunk.
   * @param state - Mutable stream state holding pending tool calls.
   * @yields {ChatEvent} `tool_use_start` and `tool_input_delta` progress events.
   */
  private *processToolCallDeltas(
    toolCalls: Array<Record<string, unknown>>,
    state: LocalStreamState,
  ): Iterable<ChatEvent> {
    for (const call of toolCalls) {
      const idx = Number(call.index ?? 0)
      const fn = call.function as { name?: string; arguments?: string } | undefined
      const existing = state.pendingTools.get(idx) ?? {
        id: String(call.id ?? ''),
        name: '',
        argsJson: '',
        started: false,
      }
      if (call.id) existing.id = String(call.id)
      if (fn?.name) existing.name = String(fn.name)
      // Surface the tool start (id + name) as soon as both are known so the
      // client shows activity before the full input finishes streaming.
      if (!existing.started && existing.id && existing.name) {
        existing.started = true
        state.pendingTools.set(idx, existing)
        yield { type: 'tool_use_start', id: existing.id, name: existing.name }
      }
      if (typeof fn?.arguments === 'string' && fn.arguments.length > 0) {
        existing.argsJson += fn.arguments
        state.pendingTools.set(idx, existing)
        // Emit the chunk's char count (+ raw partial-JSON chunk, server-side
        // only) as real progress rather than a silent keep_alive.
        yield {
          type: 'tool_input_delta',
          id: existing.id,
          chars: fn.arguments.length,
          text: fn.arguments,
        }
      }
      state.pendingTools.set(idx, existing)
    }
  }
}

/**
 * Create a local (OpenAI-compatible) AI provider instance.
 *
 * Constructs WITHOUT requiring any secret — local endpoints run keyless.
 *
 * @param config - Local provider configuration.
 * @returns An `AIProvider` backed by an OpenAI-compatible local endpoint.
 */
export function createProvider(config?: LocalConfig): AIProvider {
  return new LocalAIProvider(config)
}
