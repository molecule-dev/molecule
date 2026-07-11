/**
 * Google Gemini implementation of AIProvider.
 *
 * Uses the Google Generative Language REST API
 * (`models/{model}:streamGenerateContent`) with raw `fetch` — no SDK — for
 * streaming chat completions with tool use. Mirrors the shape of
 * `@molecule/api-ai-anthropic` / `@molecule/api-ai-openai` so the same handler
 * code can dispatch to any provider.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
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
  TokenUsage,
} from '@molecule/api-ai'
import { getLogger } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { GoogleConfig } from './types.js'

const logger = getLogger()

/** Mutable state shared across SSE line-processing calls for the Gemini streaming parser. */
interface GoogleStreamState {
  /** Prompt token count reported by `usageMetadata.promptTokenCount`. */
  inputTokens: number
  /** Candidate (output) token count reported by `usageMetadata.candidatesTokenCount`. */
  outputTokens: number
  /** Cached-content token count reported by `usageMetadata.cachedContentTokenCount`. */
  cachedInputTokens: number
  /** Monotonic counter used to synthesize stable ids for streamed function calls. */
  toolCounter: number
}

/**
 * Builds a `TokenUsage` from the stream state's provider-reported counters —
 * shared by the mid-stream `usage` snapshots and the terminal `done` event so
 * the two can never diverge.
 *
 * @param state - The streaming parser state.
 * @returns The usage counters accumulated so far.
 */
function snapshotUsage(state: GoogleStreamState): TokenUsage {
  return {
    inputTokens: state.inputTokens,
    outputTokens: state.outputTokens,
    ...(state.cachedInputTokens ? { cacheReadInputTokens: state.cachedInputTokens } : {}),
  }
}

/**
 * Whether an error is an abort/timeout (a deliberate client disconnect or the
 * request timeout firing) rather than a genuine provider failure. Aborts are
 * propagated as-is without emitting an `error` ChatEvent — the consumer books
 * the last usage snapshot per the metering contract.
 *
 * @param error - The caught error.
 * @returns True if the error is an `AbortError`/`TimeoutError`.
 */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')
}

/**
 * Google Gemini AI provider that implements the `AIProvider` interface using
 * the Generative Language REST API with support for streaming, tool use,
 * multimodal content, and system instructions.
 */
class GoogleAIProvider implements AIProvider {
  readonly name = 'google'
  private apiKey: string
  private defaultModel: string
  private baseUrl: string

  constructor(config: GoogleConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.GOOGLE_AI_API_KEY ?? ''
    this.defaultModel = config.model ?? process.env.GOOGLE_AI_MODEL ?? 'gemini-2.0-flash'
    this.baseUrl = (
      config.baseUrl ??
      process.env.GOOGLE_AI_BASE_URL ??
      'https://generativelanguage.googleapis.com/v1beta'
    ).replace(/\/+$/, '')

    // Fail fast with an actionable local error rather than a cryptic 401 on the
    // first request. The default `provider` export constructs lazily on first
    // use, so this surfaces the moment the provider is actually used.
    if (!this.apiKey) {
      throw new Error(
        'GOOGLE_AI_API_KEY is not set. Add it to your environment to use the Google Gemini AI provider.',
      )
    }
  }

  /**
   * Sends a chat request and yields streamed events (text, thinking, tool use, usage, done/error).
   *
   * @param params - Chat parameters including messages, model, system prompt, and tools.
   * @yields {ChatEvent} Chat events including text chunks, tool use requests, usage snapshots, done signals, and errors.
   */
  async *chat(params: ChatParams): AsyncIterable<ChatEvent> {
    const model = params.model ?? this.defaultModel
    const streaming = params.stream !== false

    const body = this.buildRequestBody(params, model)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Default timeout of 5 minutes to prevent hung connections.
    // Caller can override via params.signal for custom timeouts / cancellation.
    const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000
    const signal = params.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS)

    // The key is passed as a query param (`?key=`) per Google's REST auth; the
    // URL is never logged, so the key is not leaked into logs.
    const method = streaming ? 'streamGenerateContent' : 'generateContent'
    const query = streaming ? 'alt=sse&key=' : 'key='
    const url = `${this.baseUrl}/models/${encodeURIComponent(model)}:${method}?${query}${encodeURIComponent(this.apiKey)}`

    // Retry with exponential backoff for rate limits (429) and transient
    // server errors (500 INTERNAL / 503 UNAVAILABLE).
    const MAX_RETRIES = 3
    let response: Response | null = null
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      })

      if (response.status === 429 || response.status === 500 || response.status === 503) {
        if (attempt < MAX_RETRIES) {
          const retryAfter = response.headers.get('retry-after')
          const delayMs = retryAfter
            ? Math.min(parseInt(retryAfter, 10) * 1000, 60_000)
            : Math.min(1000 * 2 ** attempt, 30_000)
          logger.warn('Google AI API rate limited, retrying', {
            status: response.status,
            attempt: attempt + 1,
            delayMs,
          })
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, delayMs)
            // If aborted while waiting, resolve immediately.
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
        // Best-effort: detail already has an HTTP-status fallback; a non-JSON
        // body is only used when short enough to be a real message, not a page.
        if (errorBody.length > 0 && errorBody.length < 200) detail = errorBody
      }
      // Log full detail server-side for debugging; return a sanitized message.
      logger.error('Google AI API error', { status: response!.status, detail })
      const clientMessage =
        response!.status === 429
          ? 'AI rate limit exceeded. Please try again shortly.'
          : response!.status === 401 || response!.status === 403
            ? 'AI service configuration error.'
            : response!.status === 400 &&
                /token count|exceeds the maximum|context.*length|too many tokens|input token/i.test(
                  detail,
                )
              ? "Conversation too long for the model's context window. Use /compact to free space, or start a new conversation."
              : response!.status === 500 || response!.status === 503
                ? 'AI service is temporarily overloaded. Please try again in a moment.'
                : 'AI service error. Please try again.'
      // Mirror the sibling providers (anthropic/openai/…): emit a sanitized
      // `error` event and return — do NOT throw. molecule-dev's chat-handler
      // routes an emitted error event through a `case 'error':` branch that is a
      // DIFFERENT path from its outer try/catch, so throwing here would take the
      // wrong consumer path and break cross-provider consistency.
      yield { type: 'error', message: clientMessage, errorKey: 'ai.error.apiError' }
      return
    }

    if (!streaming) {
      const data = (await response!.json()) as Record<string, unknown>
      yield* this.parseNonStreamingResponse(data)
      return
    }

    yield* this.parseStreamingResponse(response!)
  }

  /**
   * Maps `ChatParams` to a Gemini `generateContent` request body.
   *
   * @param params - The chat parameters.
   * @param model - The resolved model id (used to gate model-specific config).
   * @returns The Gemini request body.
   */
  private buildRequestBody(params: ChatParams, model: string): Record<string, unknown> {
    const toolNameMap = this.buildToolNameMap(params.messages)

    const body: Record<string, unknown> = {
      contents: this.formatMessages(params.messages, toolNameMap),
    }

    if (params.system) {
      body.systemInstruction = { parts: [{ text: params.system }] }
    }

    if (params.tools?.length) {
      body.tools = this.formatTools(params.tools)
      if (params.toolChoice) {
        const forceOne = typeof params.toolChoice === 'object' && params.toolChoice.type === 'tool'
        const functionCallingConfig: Record<string, unknown> = {
          // 'auto' → model decides; 'required' / forced-tool → must call a tool.
          mode: params.toolChoice === 'auto' ? 'AUTO' : 'ANY',
        }
        if (forceOne) {
          // Restrict ANY-mode to the single requested tool — stronger than
          // 'required', which only guarantees *some* tool.
          functionCallingConfig.allowedFunctionNames = [
            (params.toolChoice as { type: 'tool'; name: string }).name,
          ]
        }
        body.toolConfig = { functionCallingConfig }
      }
    }

    const generationConfig: Record<string, unknown> = {}
    if (params.temperature !== undefined) generationConfig.temperature = params.temperature
    if (params.maxTokens !== undefined) generationConfig.maxOutputTokens = params.maxTokens
    // Thinking is best-effort: only Gemini 2.5+ ("thinking") models accept
    // `thinkingConfig`; 2.0 / 1.5 reject it with a 400. Gate on the model so an
    // unsupported default (gemini-2.0-flash) never breaks the request.
    if (params.thinking && this.supportsThinking(model)) {
      const thinkingConfig: Record<string, unknown> = { includeThoughts: true }
      if (typeof params.thinking.budgetTokens === 'number') {
        thinkingConfig.thinkingBudget = params.thinking.budgetTokens
      }
      generationConfig.thinkingConfig = thinkingConfig
    }
    if (Object.keys(generationConfig).length > 0) body.generationConfig = generationConfig

    return body
  }

  /**
   * Whether a model id accepts `generationConfig.thinkingConfig`. Gemini 2.5+
   * (and explicit "thinking" variants) support it; older models 400 on it.
   *
   * @param model - The model id.
   * @returns True if the model supports thinking config.
   */
  private supportsThinking(model: string): boolean {
    return /gemini-2\.5|gemini-[3-9]|thinking/i.test(model)
  }

  /**
   * Indexes every `tool_use` block by its id → name across the whole
   * conversation. Gemini's `functionResponse` requires the function *name*, but
   * the generic `tool_result` block only carries the `tool_use_id`, so the name
   * is recovered from the matching earlier `tool_use`.
   *
   * @param messages - The chat messages.
   * @returns A map of tool-use id to tool name.
   */
  private buildToolNameMap(messages: ChatMessage[]): Map<string, string> {
    const map = new Map<string, string>()
    for (const m of messages) {
      if (typeof m.content === 'string') continue
      for (const block of m.content) {
        if (block.type === 'tool_use') map.set(block.id, block.name)
      }
    }
    return map
  }

  /**
   * Converts internal `ChatMessage` objects to Gemini `contents`, filtering out
   * system messages (handled separately via `systemInstruction`) and mapping
   * roles (user→user, assistant→model).
   *
   * @param messages - The chat messages to format.
   * @param toolNameMap - Map of tool-use id → name for resolving tool results.
   * @returns The Gemini `contents` array.
   */
  private formatMessages(
    messages: ChatMessage[],
    toolNameMap: Map<string, string>,
  ): Array<{ role: string; parts: unknown[] }> {
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts:
          typeof m.content === 'string'
            ? [{ text: m.content }]
            : (m.content as ContentBlock[]).map((block) => this.formatBlock(block, toolNameMap)),
      }))
  }

  /**
   * Maps a generic `ContentBlock` to a Gemini `Part`.
   *
   * @param block - The content block to format.
   * @param toolNameMap - Map of tool-use id → name for resolving tool results.
   * @returns The Gemini part representation.
   */
  private formatBlock(
    block: ContentBlock,
    toolNameMap: Map<string, string>,
  ): Record<string, unknown> {
    switch (block.type) {
      case 'text':
        return { text: block.text }
      case 'image':
      case 'document':
      case 'audio':
      case 'video':
        // Gemini accepts inline base64 media (images, PDFs, audio, video) as
        // `inlineData`; the model itself decides what it can interpret.
        return { inlineData: { mimeType: block.mediaType, data: block.data } }
      case 'tool_use':
        return { functionCall: { name: block.name, args: block.input ?? {} } }
      case 'tool_result':
        return {
          functionResponse: {
            name: toolNameMap.get(block.tool_use_id) ?? block.tool_use_id,
            response: this.normalizeToolResponse(block.content),
          },
        }
      default:
        return block as Record<string, unknown>
    }
  }

  /**
   * Normalizes a tool result's content into the JSON object Gemini's
   * `functionResponse.response` requires (a struct). Non-object content is
   * wrapped under a `result` key.
   *
   * @param content - The raw tool result content.
   * @returns A JSON object suitable for `functionResponse.response`.
   */
  private normalizeToolResponse(content: string | unknown): Record<string, unknown> {
    if (content !== null && typeof content === 'object' && !Array.isArray(content)) {
      return content as Record<string, unknown>
    }
    return { result: content }
  }

  /**
   * Converts internal `AITool` definitions to Gemini's single-entry `tools`
   * array of `functionDeclarations`.
   *
   * @param tools - The AI tool definitions to format.
   * @returns The Gemini `tools` array.
   */
  private formatTools(tools: AITool[]): Array<Record<string, unknown>> {
    return [
      {
        functionDeclarations: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        })),
      },
    ]
  }

  /**
   * Parses a non-streaming Gemini response into `ChatEvent` objects.
   *
   * @param data - The parsed JSON response body.
   * @yields {ChatEvent} Text, thinking, tool-use, and a final done event.
   */
  private *parseNonStreamingResponse(data: Record<string, unknown>): Iterable<ChatEvent> {
    const state: GoogleStreamState = {
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      toolCounter: 0,
    }
    const candidates = data.candidates as Array<Record<string, unknown>> | undefined
    for (const candidate of candidates ?? []) {
      const content = candidate.content as { parts?: Array<Record<string, unknown>> } | undefined
      for (const part of content?.parts ?? []) {
        yield* this.emitPart(part, state)
      }
    }
    this.applyUsage(data.usageMetadata, state)
    yield { type: 'done', usage: snapshotUsage(state) }
  }

  /**
   * Parses a streaming SSE response from Gemini's `streamGenerateContent`,
   * yielding `ChatEvent`s as they arrive (text, thinking, tool use, usage).
   *
   * @param response - The fetch Response with an SSE body stream.
   * @yields {ChatEvent} Chat events as they arrive from the SSE stream.
   */
  private async *parseStreamingResponse(response: Response): AsyncIterable<ChatEvent> {
    const reader = response.body?.getReader()
    if (!reader) {
      yield {
        type: 'error',
        message: t('ai.error.noResponseBody', undefined, {
          defaultValue: 'No response body from the AI provider.',
        }),
        errorKey: 'ai.error.noResponseBody',
      }
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    const state: GoogleStreamState = {
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
      toolCounter: 0,
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
        }
        // We received data from the API but it produced no ChatEvent — e.g. an
        // SSE comment/ping or an empty chunk. The connection is still alive, so
        // signal liveness to reset the consumer's inter-event stream timeout,
        // which would otherwise false-fire.
        if (!yielded) yield { type: 'keep_alive' }
      }

      // Flush any remaining data in the buffer after EOF.
      if (buffer.trim()) {
        yield* this.processSSELines(buffer.split('\n'), state)
      }
    } catch (error) {
      // A deliberate client abort / request timeout is not a provider failure:
      // propagate it as-is (throw) with NO `error` event — the consumer books
      // the last usage snapshot per the metering contract.
      if (isAbortError(error)) throw error
      // Any other stream/parse failure mirrors the sibling providers: emit a
      // sanitized `error` event and return (do NOT throw).
      logger.error('Google AI stream error', { error })
      yield {
        type: 'error',
        message: 'AI service error. Please try again.',
        errorKey: 'ai.error.apiError',
      }
      return
    } finally {
      reader.releaseLock()
    }

    yield { type: 'done', usage: snapshotUsage(state) }
  }

  /**
   * Processes an array of SSE lines from Gemini's streaming response, yielding
   * ChatEvents for text/thinking deltas, tool calls, and usage snapshots.
   *
   * @param lines - Raw SSE lines to process.
   * @param state - Mutable stream state (token counters, tool counter).
   * @yields {ChatEvent} Chat events extracted from the SSE lines.
   */
  private *processSSELines(lines: string[], state: GoogleStreamState): Iterable<ChatEvent> {
    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const json = line.slice(5).trim()
      if (!json || json === '[DONE]') continue

      try {
        const chunk = JSON.parse(json) as Record<string, unknown>
        const candidates = chunk.candidates as Array<Record<string, unknown>> | undefined
        for (const candidate of candidates ?? []) {
          const content = candidate.content as
            | { parts?: Array<Record<string, unknown>> }
            | undefined
          for (const part of content?.parts ?? []) {
            yield* this.emitPart(part, state)
          }
        }
        if (chunk.usageMetadata) {
          this.applyUsage(chunk.usageMetadata, state)
          // Metering snapshot (latest wins): if the stream is cut after this
          // point, the consumer books these provider-reported counts instead of
          // dropping the turn (see the ChatEvent 'usage' contract).
          yield { type: 'usage', usage: snapshotUsage(state) }
        }
      } catch (error) {
        logger.debug('Skipping malformed Google SSE JSON line', { json, error })
      }
    }
  }

  /**
   * Emits the ChatEvent(s) for a single Gemini `Part`: text, thinking (a part
   * flagged `thought: true`), or a function call (a synthesized `tool_use_start`
   * followed by the complete `tool_use` — Gemini delivers call args in one chunk
   * rather than streaming them).
   *
   * @param part - The Gemini part.
   * @param state - Mutable stream state (used to synthesize a stable tool id).
   * @yields {ChatEvent} The events for this part.
   */
  private *emitPart(part: Record<string, unknown>, state: GoogleStreamState): Iterable<ChatEvent> {
    if (typeof part.text === 'string' && part.text.length > 0) {
      if (part.thought === true) {
        yield { type: 'thinking', content: part.text }
      } else {
        yield { type: 'text', content: part.text }
      }
      return
    }

    const functionCall = part.functionCall as { name?: string; args?: unknown } | undefined
    if (functionCall) {
      const id = `call_${++state.toolCounter}`
      const name = String(functionCall.name ?? '')
      // Surface the tool start immediately so the client shows activity, then
      // the complete call (Gemini does not stream partial function-call args).
      yield { type: 'tool_use_start', id, name }
      yield { type: 'tool_use', id, name, input: functionCall.args ?? {} }
    }
  }

  /**
   * Folds a Gemini `usageMetadata` object into the stream state's counters.
   *
   * @param usageMetadata - The raw `usageMetadata` from a response chunk.
   * @param state - Mutable stream state to update.
   */
  private applyUsage(usageMetadata: unknown, state: GoogleStreamState): void {
    const usage = usageMetadata as
      | {
          promptTokenCount?: number
          candidatesTokenCount?: number
          cachedContentTokenCount?: number
        }
      | undefined
    if (!usage) return
    if (typeof usage.promptTokenCount === 'number') state.inputTokens = usage.promptTokenCount
    if (typeof usage.candidatesTokenCount === 'number') {
      state.outputTokens = usage.candidatesTokenCount
    }
    if (typeof usage.cachedContentTokenCount === 'number') {
      state.cachedInputTokens = usage.cachedContentTokenCount
    }
  }
}

/**
 * Creates a Google Gemini AI provider instance.
 *
 * @param config - Google-specific configuration (API key, base URL, model).
 * @returns An `AIProvider` backed by the Google Generative Language REST API.
 */
export function createProvider(config?: GoogleConfig): AIProvider {
  return new GoogleAIProvider(config)
}
