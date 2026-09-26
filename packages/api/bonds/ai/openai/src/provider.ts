/**
 * OpenAI implementation of AIProvider.
 *
 * Calls OpenAI's Responses API (`/v1/responses`, see `responses.ts`) on
 * OpenAI's own endpoint, and `/v1/chat/completions` on any other base URL
 * (OpenAI-compatible servers). Mirrors the shape of `@molecule/api-ai-anthropic`
 * so the same handler code can dispatch to either provider.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type {
  AIProvider,
  AiRateLimitCallback,
  AITool,
  ChatEvent,
  ChatMessage,
  ChatParams,
  ContentBlock,
} from '@molecule/api-ai'
import { getLogger } from '@molecule/api-bond'

import {
  buildResponsesBody,
  parseResponsesNonStreaming,
  parseResponsesStream,
} from './responses.js'
import type { OpenaiApi, OpenaiConfig } from './types.js'
import { streamErrorEvent } from './utilities.js'

const logger = getLogger()

/** OpenAI's own API host — the only one assumed to serve `/v1/responses`. */
const OPENAI_API_HOST = 'api.openai.com'

/**
 * Pick the default endpoint for a base URL: Responses for OpenAI's own API,
 * chat/completions for anything else.
 *
 * @param baseUrl - The configured base URL.
 * @returns The endpoint to use.
 */
function defaultApiFor(baseUrl: string): OpenaiApi {
  try {
    return new URL(baseUrl).host === OPENAI_API_HOST ? 'responses' : 'chat-completions'
  } catch (_error) {
    // An unparseable base URL is not OpenAI's; the request itself will report it.
    return 'chat-completions'
  }
}

/** Mutable streaming state for the OpenAI parser. */
interface OpenaiStreamState {
  /** Total prompt tokens (cached + uncached), as reported by the API. */
  inputTokens: number
  outputTokens: number
  /** Cached prompt tokens (subset of inputTokens), from prompt_tokens_details. */
  cachedTokens: number
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
  private onRateLimit?: AiRateLimitCallback
  private api: OpenaiApi

  constructor(config: OpenaiConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.OPENAI_API_KEY ?? ''
    this.defaultModel = config.defaultModel ?? 'gpt-6-luna'
    this.maxTokens = config.maxTokens ?? 4096
    this.baseUrl = config.baseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com'
    this.onRateLimit = config.onRateLimit
    this.api = config.api ?? defaultApiFor(this.baseUrl)

    // Fail fast with an actionable local error rather than a cryptic 401 on the
    // first request. The default `provider` export constructs lazily on first
    // use (see index.ts), so this surfaces the moment the provider is actually
    // used, not at bond/module-load time. A key is required only for the
    // official endpoint — a custom baseUrl may target a keyless self-hosted /
    // local server (Ollama, LM Studio), where the auth header is omitted below.
    const usingCustomEndpoint = Boolean(config.baseUrl ?? process.env.OPENAI_BASE_URL)
    if (!this.apiKey && !usingCustomEndpoint) {
      throw new Error(
        'OPENAI_API_KEY is not set. Add it to your environment to use the OpenAI AI provider.',
      )
    }
  }

  /**
   * Build the request body for `POST /v1/chat/completions`.
   *
   * @param params - The caller's chat parameters.
   * @param model - The resolved model id.
   * @param maxTokens - The resolved output-token limit.
   * @param useStream - Whether to request an SSE stream.
   * @returns The JSON request body.
   */
  private buildChatCompletionsBody(
    params: ChatParams,
    model: string,
    maxTokens: number,
    useStream: boolean,
  ): Record<string, unknown> {
    const messages = this.formatMessages(params.messages, params.system)

    const body: Record<string, unknown> = {
      // BYO / provider-native tunables (reasoning_effort, enable_thinking, …).
      // Spread FIRST so the structural fields below (model, messages,
      // max_completion_tokens, tools, stream) always win and cannot be broken.
      ...(params.extraBody ?? {}),
      // Abuse attribution (see ChatParams.endUserId). OpenAI DEPRECATED `user`
      // and replaced it with `safety_identifier` for exactly this purpose —
      // their guidance is a hashed, stable per-user string, which is what
      // endUserId already is. Sibling OpenAI-compatible bonds keep `user`: it is
      // the field they actually implement, verified accepted by deepseek, xai,
      // moonshot, alibaba and zhipu against their live APIs.
      //
      // This bond is also pointed at arbitrary BYO OpenAI-compatible endpoints
      // (molecule-dev's custom providers), so the unknown-field question matters
      // here: those same five providers all returned 200 when sent an unknown
      // `safety_identifier`, i.e. tolerating unknown body params is the norm.
      // A BYO endpoint therefore ignores this rather than rejecting it — and BYO
      // runs on the user's OWN key, where attribution protects nothing of ours.
      ...(params.endUserId ? { safety_identifier: params.endUserId } : {}),
      model,
      messages,
      // `max_completion_tokens`, NOT `max_tokens`. Every GPT-5-family model
      // hard-rejects the latter — "Unsupported parameter: 'max_tokens' is not
      // supported with this model" (400) — and the catalog's OpenAI entries are
      // all gpt-5.6-*, so this bond could not call any of its own models. The
      // newer name is accepted by the older generations too (verified 200 on
      // gpt-4o-mini and gpt-3.5-turbo), so there is no need to branch per model.
      max_completion_tokens: maxTokens,
    }
    if (params.temperature !== undefined) body.temperature = params.temperature

    // Reasoning depth: the caller resolves the model's native reasoning_effort
    // value (none | low | medium | high | xhigh on GPT-5.4/5.5-family) from the
    // model catalog and passes it as `thinking.effort`. Without it, omit the
    // param entirely (the model's own default applies — medium on gpt-5.5).
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

    if (useStream) {
      body.stream = true
      body.stream_options = { include_usage: true }
    }
    return body
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
    const useStream = params.stream !== false
    const isResponses = this.api === 'responses'

    const body = isResponses
      ? buildResponsesBody(params, model, maxTokens, useStream)
      : this.buildChatCompletionsBody(params, model, maxTokens, useStream)
    const path = isResponses ? '/v1/responses' : '/v1/chat/completions'

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // Omitted for a keyless custom endpoint (a self-hosted / local server).
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
    }

    const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000
    const signal = params.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS)

    const MAX_RETRIES = 3
    let response: Response | null = null
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      })

      if (response.status === 429 || response.status === 503) {
        const willRetry = attempt < MAX_RETRIES
        // Retry-After is equally-valid as delta-seconds or an HTTP-date;
        // parseInt on the date form yields NaN, degrading the backoff to a
        // ~0ms retry against an already rate-limiting API. Guard it.
        const retryAfter = response.headers.get('retry-after')
        const parsedRetryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : NaN
        const hasRetryAfter =
          Number.isFinite(parsedRetryAfterSeconds) && parsedRetryAfterSeconds >= 0
        // Additive jitter (<500ms): concurrent callers rejected together must
        // not sleep identical delays and re-arrive as the same burst.
        const delayMs = willRetry
          ? (hasRetryAfter
              ? Math.min(parsedRetryAfterSeconds * 1000, 60_000)
              : Math.min(1000 * 2 ** attempt, 30_000)) + Math.floor(Math.random() * 500)
          : 0
        try {
          this.onRateLimit?.({
            provider: this.name,
            model,
            status: response.status,
            attempt: attempt + 1,
            willRetry,
            retryInMs: delayMs,
            ...(hasRetryAfter ? { retryAfterSeconds: parsedRetryAfterSeconds } : {}),
          })
        } catch (error) {
          // Host-app telemetry; its failure must never break the request.
          logger.warn('onRateLimit callback threw', { error })
        }
        if (willRetry) {
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
      } catch (_error) {
        // Best-effort: detail already has an HTTP-status fallback; malformed body just stays as-is.
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
              : response!.status === 400
                ? 'AI request was invalid — check the model and request parameters.'
                : response!.status === 503 || response!.status === 502
                  ? 'AI service is temporarily overloaded. Please try again in a moment.'
                  : 'AI service error. Please try again.'
      yield { type: 'error', message: clientMessage, errorKey: 'ai.error.apiError' }
      return
    }

    if (!useStream) {
      const data = (await response!.json()) as Record<string, unknown>
      yield* isResponses
        ? parseResponsesNonStreaming(data, model)
        : this.parseNonStreamingResponse(data)
      return
    }

    yield* isResponses
      ? parseResponsesStream(response!, model)
      : this.parseStreamingResponse(response!)
  }

  /**
   * Convert internal `ChatMessage` objects to the OpenAI message format.
   * The system prompt becomes a leading `{role:'system'}` message.
   *
   * `tool_use` and `tool_result` blocks are serialized STRUCTURALLY — a
   * `tool_use` becomes an assistant message carrying `tool_calls`, a
   * `tool_result` becomes its own `{role:'tool', tool_call_id, content}`
   * message — exactly as the Chat Completions API requires and as the sibling
   * OpenAI-compatible bonds (minimax/deepseek) already do. They used to be
   * flattened to placeholder text (`[tool_result for <id>]`), which silently
   * dropped every tool result: a multi-turn agentic loop fed the model empty
   * placeholders, so at temperature 0 it re-emitted the same opening tool call
   * forever and never finalized (observed 0/8 on gpt-5.6-luna in the
   * starting-point selftest — the failure was this serialization, NOT the
   * model). Single-shot text/vision requests are unaffected: they never carry
   * these block types.
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
      if (typeof m.content === 'string') {
        out.push({ role: m.role, content: m.content })
        continue
      }

      const parts: Array<Record<string, unknown>> = []
      const toolCalls: Array<Record<string, unknown>> = []
      const toolResults: Array<Record<string, unknown>> = []
      for (const block of m.content as ContentBlock[]) {
        switch (block.type) {
          case 'tool_use':
            toolCalls.push({
              id: block.id,
              type: 'function',
              function: { name: block.name, arguments: JSON.stringify(block.input ?? {}) },
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
            parts.push(this.formatBlock(block))
        }
      }

      // Tool results are standalone `role:'tool'` messages. An assistant turn
      // that made tool calls carries them on the message; a plain content
      // message (text/image/…) is emitted as-is. These are mutually exclusive
      // in practice (assistant emits tool_use, the next user turn the results).
      if (toolResults.length > 0) {
        for (const tr of toolResults) out.push(tr)
      } else if (toolCalls.length > 0) {
        out.push({
          role: 'assistant',
          content: parts.length > 0 ? parts : null,
          tool_calls: toolCalls,
        })
      } else {
        out.push({
          role: m.role,
          content: parts.length === 1 && parts[0].type === 'text' ? parts[0].text : parts,
        })
      }
    }
    return out
  }

  /**
   * Map a generic content-part `ContentBlock` (text/image/document/audio/video)
   * to OpenAI's content-part shape. `tool_use`/`tool_result` are handled
   * structurally in {@link formatMessages} and never reach here.
   */
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
      default:
        return { type: 'text', text: '' }
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
   * Parse a non-streaming `/v1/chat/completions` response.
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
   * Parse a streaming SSE response from `/v1/chat/completions`.
   *
   * @param response - The fetch Response whose body is an SSE stream.
   * @yields {ChatEvent} Incremental text, keep-alive, tool-use, and done events.
   */
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
        // delta, or buffered tool-call arguments streaming in). The model is
        // still alive — signal liveness so the consumer's inter-event stream
        // timeout doesn't false-fire mid-generation.
        if (!yielded) yield { type: 'keep_alive' }
      }
      if (buffer.trim()) {
        for (const event of this.processSSELines(buffer.split('\n'), state)) {
          yield event
          if (event.type === 'error') return
        }
      }

      // Flush any pending tool calls
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
   * Process SSE lines from OpenAI's `chat/completions` stream.
   *
   * @param lines - Individual SSE lines to parse.
   * @param state - Mutable stream state tracking tokens and pending tool calls.
   * @yields {ChatEvent} Text and no-op events parsed from the SSE data lines.
   */
  private *processSSELines(lines: string[], state: OpenaiStreamState): Iterable<ChatEvent> {
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
          { message?: string; type?: string; code?: string } | undefined
        if (streamError) {
          const detail = `${streamError.code ?? streamError.type ?? ''} ${streamError.message ?? ''}`
          logger.error('OpenAI streaming error event', {
            type: streamError.type,
            code: streamError.code,
            message: streamError.message,
          })
          yield streamErrorEvent(detail)
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
        logger.debug('Skipping malformed OpenAI SSE JSON line', { json, error })
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
