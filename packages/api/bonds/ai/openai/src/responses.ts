/**
 * OpenAI Responses API (`/v1/responses`) wire format: request building and
 * response parsing for {@link OpenaiAIProvider}.
 *
 * Why this transport exists alongside `/v1/chat/completions`: on OpenAI's own
 * API, current reasoning models cannot combine function tools with reasoning on
 * chat/completions. gpt-5.6 / gpt-6-sol / gpt-6-luna return 400 for tools plus
 * any `reasoning_effort` other than `'none'`, and gpt-6-astra has no `'none'`
 * at all, so it cannot serve a tool-carrying request there at all. The same
 * requests return 200 on `/v1/responses`, which also carries OpenAI's
 * server-side tools (`web_search`). Verified live 2026-09-24.
 *
 * Requests are stateless (`store: false`): the full conversation is sent each
 * time, as with chat/completions. Prior tool calls are replayed as
 * `function_call` items WITHOUT an item `id` — an id makes the API look for the
 * stored reasoning item that preceded the call, which a stateless request does
 * not have.
 *
 * @module
 */

import type {
  AITool,
  ChatEvent,
  ChatMessage,
  ChatParams,
  ContentBlock,
  ServerTool,
  TokenUsage,
} from '@molecule/api-ai'
import { getLogger } from '@molecule/api-bond'

import { streamErrorEvent } from './utilities.js'

const logger = getLogger()

/** Usage object as reported on a Responses API `response`. */
interface ResponsesUsage {
  input_tokens?: number
  output_tokens?: number
  input_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number }
}

/**
 * Build the request body for `POST /v1/responses`.
 *
 * @param params - The caller's chat parameters.
 * @param model - The resolved model id.
 * @param maxTokens - The resolved output-token limit.
 * @param useStream - Whether to request an SSE stream.
 * @returns The JSON request body.
 */
export function buildResponsesBody(
  params: ChatParams,
  model: string,
  maxTokens: number,
  useStream: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    // Provider-native tunables first, so the structural fields below win.
    // On OpenAI's own endpoint these are Responses-API params (e.g. `text`,
    // `truncation`), not chat/completions ones.
    ...(params.extraBody ?? {}),
    ...(params.endUserId ? { safety_identifier: params.endUserId } : {}),
    model,
    input: formatResponsesInput(params.messages),
    max_output_tokens: maxTokens,
    store: false,
  }
  if (params.system) body.instructions = params.system
  if (params.temperature !== undefined) body.temperature = params.temperature
  if (params.thinking?.effort) body.reasoning = { effort: params.thinking.effort }

  const tools = formatResponsesTools(params.tools ?? [], params.serverTools ?? [])
  if (tools.length > 0) {
    body.tools = tools
    if (params.toolChoice === 'required') {
      body.tool_choice = 'required'
    } else if (typeof params.toolChoice === 'object' && params.toolChoice?.type === 'tool') {
      body.tool_choice = { type: 'function', name: params.toolChoice.name }
    }
  }
  if (useStream) body.stream = true
  return body
}

/**
 * Convert `ChatMessage`s to Responses API input items. Text and images become
 * message items; `tool_use` blocks become `function_call` items and
 * `tool_result` blocks `function_call_output` items, in block order.
 *
 * @param messages - The conversation.
 * @returns The `input` array.
 */
export function formatResponsesInput(messages: ChatMessage[]): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = []
  for (const m of messages) {
    if (m.role === 'system') {
      out.push({ role: 'system', content: typeof m.content === 'string' ? m.content : '' })
      continue
    }
    if (typeof m.content === 'string') {
      out.push({ role: m.role, content: m.content })
      continue
    }

    // Consecutive content parts collect into one message item; a tool block
    // flushes them first so the item order matches the block order.
    let parts: Array<Record<string, unknown>> = []
    const flush = (): void => {
      if (parts.length === 0) return
      out.push({ role: m.role, content: parts })
      parts = []
    }
    for (const block of m.content as ContentBlock[]) {
      switch (block.type) {
        case 'tool_use':
          flush()
          out.push({
            type: 'function_call',
            call_id: block.id,
            name: block.name,
            arguments: JSON.stringify(block.input ?? {}),
          })
          break
        case 'tool_result':
          flush()
          out.push({
            type: 'function_call_output',
            call_id: block.tool_use_id,
            output:
              typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
          })
          break
        default:
          parts.push(formatResponsesPart(block, m.role))
      }
    }
    flush()
  }
  return out
}

/**
 * Map a content-part block to a Responses API content part. Assistant text is
 * `output_text`; everything the user sends is an `input_*` part.
 *
 * @param block - A text/image/document/audio/video block.
 * @param role - The role of the message the block belongs to.
 * @returns The content part.
 */
function formatResponsesPart(block: ContentBlock, role: string): Record<string, unknown> {
  const textType = role === 'assistant' ? 'output_text' : 'input_text'
  switch (block.type) {
    case 'text':
      return { type: textType, text: block.text }
    case 'image':
      return { type: 'input_image', image_url: `data:${block.mediaType};base64,${block.data}` }
    case 'document':
    case 'audio':
    case 'video':
      return {
        type: textType,
        text: `[${block.type[0].toUpperCase()}${block.type.slice(1)} attachment (${block.mediaType}) — not supported by this provider]`,
      }
    default:
      return { type: textType, text: '' }
  }
}

/**
 * Convert function tools and provider-native server tools to the Responses
 * API `tools` array.
 *
 * Function tools set `strict: false` explicitly: callers' schemas use optional
 * properties and omit `additionalProperties: false`, which strict mode rejects.
 * Server tools are forwarded as `{ type, ...config }`; the abstract `name`
 * field is dropped because OpenAI's built-in tools are identified by `type`.
 *
 * @param tools - Function tools executed by the caller.
 * @param serverTools - Tools the provider executes (e.g. `{ type: 'web_search' }`).
 * @returns The `tools` array.
 */
export function formatResponsesTools(
  tools: AITool[],
  serverTools: ServerTool[],
): Array<Record<string, unknown>> {
  return [
    ...tools.map((tool) => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      strict: false,
    })),
    ...serverTools.map(({ name: _name, ...config }) => config),
  ]
}

/**
 * Normalize Responses API usage to `TokenUsage`. `input_tokens` includes the
 * cached and cache-written tokens; they are reported separately (Anthropic
 * semantics) so consumers do not double-count them.
 *
 * @param usage - The `usage` object of a completed response.
 * @returns The normalized usage.
 */
export function responsesUsage(
  usage: ResponsesUsage | undefined | null,
  webSearchCalls = 0,
): TokenUsage {
  const cached = usage?.input_tokens_details?.cached_tokens ?? 0
  const written = usage?.input_tokens_details?.cache_write_tokens ?? 0
  return {
    inputTokens: Math.max(0, (usage?.input_tokens ?? 0) - cached - written),
    outputTokens: usage?.output_tokens ?? 0,
    cacheReadInputTokens: cached,
    ...(written > 0 ? { cacheCreationInputTokens: written } : {}),
    ...(webSearchCalls > 0 ? { webSearchRequests: webSearchCalls } : {}),
  }
}

/**
 * Parse a function-call argument string, falling back to `{}` when malformed.
 *
 * @param args - The JSON argument string.
 * @returns The parsed input.
 */
function parseArgs(args: string | undefined): unknown {
  try {
    return args ? JSON.parse(args) : {}
  } catch (_error) {
    // Best-effort: malformed tool-call arguments are unusable; fall back to empty object.
    return {}
  }
}

/**
 * Parse a non-streaming `/v1/responses` result.
 *
 * @param data - The parsed JSON response body.
 * @yields {ChatEvent} Text, tool-use, and done events.
 */
export function* parseResponsesNonStreaming(data: Record<string, unknown>): Iterable<ChatEvent> {
  const output = (data.output as Array<Record<string, unknown>> | undefined) ?? []
  let webSearchCalls = 0
  for (const item of output) {
    if (item.type === 'web_search_call') webSearchCalls++
    if (item.type === 'message') {
      for (const part of (item.content as Array<Record<string, unknown>> | undefined) ?? []) {
        if (part.type === 'output_text' && typeof part.text === 'string' && part.text.length > 0) {
          yield { type: 'text', content: part.text }
        }
      }
    } else if (item.type === 'function_call') {
      yield {
        type: 'tool_use',
        id: String(item.call_id ?? ''),
        name: String(item.name ?? ''),
        input: parseArgs(item.arguments as string | undefined),
      }
    }
  }
  yield {
    type: 'done',
    usage: responsesUsage(data.usage as ResponsesUsage | undefined, webSearchCalls),
  }
}

/**
 * Parse a streaming SSE response from `/v1/responses`.
 *
 * @param response - The fetch Response whose body is an SSE stream.
 * @yields {ChatEvent} Text, tool-call progress, tool-use, keep-alive, and done events.
 */
export async function* parseResponsesStream(response: Response): AsyncIterable<ChatEvent> {
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
  let usage: TokenUsage | null = null
  /** Function calls in progress, keyed by output item id. */
  const calls = new Map<string, { callId: string; name: string }>()
  /**
   * `web_search_call` items started — OpenAI bills each one. Counted when the
   * call starts so a stream cut mid-search still meters it.
   */
  let webSearchCalls = 0

  /**
   * Turn one SSE data payload into zero or more ChatEvents.
   *
   * @param json - The `data:` payload.
   * @yields {ChatEvent}
   */
  function* handle(json: string): Iterable<ChatEvent> {
    let event: Record<string, unknown>
    try {
      event = JSON.parse(json) as Record<string, unknown>
    } catch (error) {
      logger.debug('Skipping malformed OpenAI Responses SSE JSON line', { json, error })
      return
    }
    const item = event.item as Record<string, unknown> | undefined
    switch (event.type) {
      case 'response.output_text.delta':
        if (typeof event.delta === 'string' && event.delta.length > 0) {
          yield { type: 'text', content: event.delta }
        }
        return
      case 'response.output_item.added':
        if (item?.type === 'web_search_call') {
          webSearchCalls++
          // Metering snapshot: the search is billed even if the turn is cut.
          yield {
            type: 'usage',
            usage: { inputTokens: 0, outputTokens: 0, webSearchRequests: webSearchCalls },
          }
        } else if (item?.type === 'function_call') {
          const callId = String(item.call_id ?? '')
          const name = String(item.name ?? '')
          calls.set(String(item.id ?? ''), { callId, name })
          yield { type: 'tool_use_start', id: callId, name }
        }
        return
      case 'response.function_call_arguments.delta': {
        const call = calls.get(String(event.item_id ?? ''))
        if (call && typeof event.delta === 'string') {
          yield {
            type: 'tool_input_delta',
            id: call.callId,
            chars: event.delta.length,
            text: event.delta,
          }
        }
        return
      }
      case 'response.output_item.done':
        if (item?.type === 'function_call') {
          calls.delete(String(item.id ?? ''))
          yield {
            type: 'tool_use',
            id: String(item.call_id ?? ''),
            name: String(item.name ?? ''),
            input: parseArgs(item.arguments as string | undefined),
          }
        }
        return
      case 'response.completed':
      case 'response.incomplete': {
        const res = event.response as { usage?: ResponsesUsage; incomplete_details?: unknown }
        usage = responsesUsage(res?.usage, webSearchCalls)
        if (event.type === 'response.incomplete') {
          logger.warn('OpenAI response incomplete', { details: res?.incomplete_details })
        }
        return
      }
      case 'response.failed':
      case 'error': {
        const err = (
          event.type === 'error'
            ? event
            : ((event.response as { error?: unknown } | undefined)?.error ?? {})
        ) as { message?: string; type?: string; code?: string }
        logger.error('OpenAI Responses streaming error event', {
          type: err.type,
          code: err.code,
          message: err.message,
        })
        yield streamErrorEvent(`${err.code ?? err.type ?? ''} ${err.message ?? ''}`)
        return
      }
      default:
      // Lifecycle, reasoning, and server-tool progress events carry nothing
      // to forward; the caller yields keep_alive for them.
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      let yielded = false
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        for (const event of handle(line.slice(6).trim())) {
          yielded = true
          yield event
          // A truncated turn must not fall through to a successful `done`.
          if (event.type === 'error') return
        }
      }
      if (!yielded) yield { type: 'keep_alive' }
    }
    if (buffer.startsWith('data: ')) {
      for (const event of handle(buffer.slice(6).trim())) {
        yield event
        if (event.type === 'error') return
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (!usage) {
    // The stream ended without response.completed / response.incomplete: the
    // connection was cut, so the turn is truncated, not finished.
    logger.error('OpenAI Responses stream ended without a terminal event')
    yield {
      type: 'error',
      message: 'AI service error. Please try again.',
      errorKey: 'ai.error.apiError',
    }
    return
  }
  yield { type: 'done', usage }
}
