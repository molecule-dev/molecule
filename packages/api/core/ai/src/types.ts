/**
 * AI provider interface.
 *
 * Model-agnostic interface for AI chat with streaming and tool use.
 * Implement this in a bond package (e.g., `@molecule/api-ai-anthropic`).
 *
 * @module
 */

/**
 * Chat message in a conversation.
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentBlock[]
  /**
   * Model-native reasoning text produced alongside this (assistant) message —
   * e.g. an OpenAI-compatible provider's `reasoning_content`. Some providers
   * (Moonshot's Kimi K3 / k2.7-code and other preserved-thinking models)
   * require it to be replayed verbatim on subsequent requests within a
   * tool-call loop to keep reasoning continuity; callers that captured
   * `thinking` stream events should set it when rebuilding history. Bonds
   * whose provider has no such requirement ignore it.
   */
  reasoning?: string
}

/**
 * Rich content block within a message.
 *
 * Includes text, tool interactions, and file attachments (images, documents,
 * audio, video). Provider bonds map these generic blocks to their native API
 * format (e.g., Anthropic base64 source, OpenAI image_url, etc.).
 */
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: string; data: string }
  | { type: 'document'; mediaType: string; data: string; filename?: string }
  | { type: 'audio'; mediaType: string; data: string }
  | { type: 'video'; mediaType: string; data: string }
  // `signature` is a provider-opaque replay token attached to the tool call
  // (Gemini 3.x `thoughtSignature`). Callers that persist tool calls and replay
  // them in later requests MUST carry it back on the replayed block verbatim —
  // Gemini rejects a replayed functionCall without it (400 "Function call is
  // missing a thought_signature"). Providers without such a token omit it, and
  // every bond ignores it when it has no native equivalent.
  | { type: 'tool_use'; id: string; name: string; input: unknown; signature?: string }
  | { type: 'tool_result'; tool_use_id: string; content: string | unknown }

/**
 * Streaming event from an AI chat call.
 */
export type ChatEvent =
  | { type: 'text'; content: string }
  | { type: 'thinking'; content: string }
  // `signature`: provider-opaque replay token for this tool call (see the
  // ContentBlock tool_use variant) — consumers must persist it alongside
  // id/name/input and echo it on the replayed tool_use block.
  | { type: 'tool_use'; id: string; name: string; input: unknown; signature?: string }
  // Emitted as soon as the model BEGINS a tool call — id + name are known but the
  // input is still streaming. Lets consumers show what's happening immediately
  // (e.g. "Writing the plan") instead of staring at a frozen spinner for the
  // seconds-to-minutes it takes to generate a large tool input (a file, a plan).
  | { type: 'tool_use_start'; id: string; name: string }
  // Progress for a tool call's input as the model streams its arguments:
  // `chars` is the number of input characters in this chunk. Carries real
  // progress (re-arms the stream-progress timeout; ticks the UI's live token
  // estimate) where previously these chunks produced only `keep_alive` (no
  // content) — the root cause of the dead loading indicator while a big tool
  // input was being written. `chars` is a COUNT, not the full content (the UI
  // only needs the magnitude, and forwarding the whole input would duplicate the
  // final `tool_use`). `text` is the raw partial-JSON CHUNK for this delta —
  // consumed SERVER-SIDE only (a coalescing consumer accumulates it to extract a
  // few short display fields, e.g. the file `path`, so the UI can label the
  // in-flight tool card before the args finish). It is never echoed wholesale to
  // the client. Optional so non-streaming/legacy providers can omit it.
  | { type: 'tool_input_delta'; id: string; chars: number; text?: string }
  // Incremental usage SNAPSHOT — the provider's own token counts as reported so
  // far on the wire (e.g. Anthropic's message_start carries the full input +
  // cache token counts before any output streams). LATEST WINS; `done.usage`
  // remains the authoritative final figure. METERING CONTRACT: consumers MUST
  // retain the latest snapshot and book it when a stream ends WITHOUT a `done`
  // (client abort, disconnect, progress timeout, provider error) — the upstream
  // provider bills those tokens even though the stream was cut, and dropping
  // them silently under-meters real spend. Providers whose wire protocol only
  // reports usage at stream end (OpenAI-compatible `include_usage`) cannot emit
  // mid-stream snapshots; consumers must estimate aborted turns for those.
  | { type: 'usage'; usage: TokenUsage }
  | { type: 'done'; usage: TokenUsage }
  | { type: 'error'; message: string; errorKey?: string }
  // Liveness signal. PROVIDER CONTRACT: every streaming provider MUST yield
  // `keep_alive` whenever it receives data from the upstream API that produces
  // no other ChatEvent — e.g. an SSE ping/keepalive, an empty delta, or buffered
  // tool-input/argument chunks streaming in. Consumers use a (long) inter-event
  // timeout to detect a dead stream; without keep_alive that timeout false-fires
  // while the model is alive but producing only silent chunks (e.g. streaming a
  // large tool input). Not forwarded to end clients. Enforced by the provider
  // conformance test in this package's __tests__.
  | { type: 'keep_alive' }

/**
 * Token usage from a chat completion.
 */
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  /** Number of input tokens written to the prompt cache. */
  cacheCreationInputTokens?: number
  /** Number of input tokens read from the prompt cache. */
  cacheReadInputTokens?: number
  /**
   * Number of web searches the provider ran for this request through a server
   * tool (`ServerTool`, e.g. web search / search grounding). Providers bill
   * these per search, on top of tokens, so bonds MUST report every search the
   * provider executed — absent means none ran. Counted the way the provider
   * bills: Anthropic reports it (`server_tool_use.web_search_requests`),
   * OpenAI bills per `web_search_call`, Gemini per search query issued.
   */
  webSearchRequests?: number
  /**
   * The speed tier the provider REPORTS the request ran at (Anthropic wires it
   * as `usage.speed` per the fast-mode docs, and as `usage.service_tier` on
   * observed live responses — bonds read both). Only set by bonds whose
   * provider has a fast/priority tier — absent means unreported. Metering
   * prefers THIS field over the requested `ChatParams.speed`; when a
   * fast-requested turn succeeds with no report, callers may conservatively
   * bill the requested tier (Anthropic enforces fast-mode entitlement with a
   * hard 429, so a successful fast request was served fast).
   */
  speed?: 'standard' | 'fast'
}

/**
 * Details of one rate-limited or overloaded upstream response, reported via a
 * provider config's `onRateLimit` callback each time the provider receives an
 * HTTP 429/503 (or a provider-specific overload status such as Anthropic's
 * 529), before any retry sleep. This surfaces the hits the provider's internal
 * retry loop goes on to recover — the early-warning signal that capacity is
 * running out, which a terminal error event alone would miss entirely.
 */
export interface AiRateLimitEvent {
  /** Provider name (e.g. 'anthropic'). */
  provider: string
  /** Model the rejected request targeted. */
  model: string
  /** HTTP status the upstream returned (429, 503, or 529). */
  status: number
  /** 1-based attempt number that was rejected. */
  attempt: number
  /** Whether the provider will retry this request again after a delay. */
  willRetry: boolean
  /** Delay before the next retry in milliseconds; 0 when `willRetry` is false. */
  retryInMs: number
  /** The response's parsed `Retry-After` header in seconds, when present and valid. */
  retryAfterSeconds?: number
}

/**
 * Callback invoked on each rate-limited/overloaded upstream response. Must not
 * throw (providers guard it anyway); keep it fast — it runs on the request path.
 */
export type AiRateLimitCallback = (event: AiRateLimitEvent) => void

/**
 * Details of one upstream stream that accepted the request and then produced no
 * CONTENT for the whole first-token window — reported via a provider config's
 * `onStreamStall` callback the moment the provider's first-token watchdog gives
 * up on that attempt.
 *
 * A stall is NOT an HTTP failure and NOT a rate limit: the provider answered
 * 200 and opened a stream, then sat there. It is invisible to every other
 * signal the platform has — a 200 with no content looks like a healthy request
 * until the bytes stop — so without this callback a multi-minute pause cannot
 * be told apart from a long think, a platform hold, or a retry backoff after
 * the fact (X0 xr-molecule-flash-m71, 2026-10-16: a 3 min 15 s gap that
 * production could not classify).
 */
export interface AiStreamStallEvent {
  /** Provider name (e.g. 'deepseek'). */
  provider: string
  /** Model the stalled request targeted. */
  model: string
  /**
   * Which bound the stream broke: `before_content` is the first-token window
   * (retryable — the reply never started), `after_content` is the inter-chunk
   * silence window (not retryable — a partial reply is already on the wire).
   */
  phase: 'before_content' | 'after_content'
  /** How long the attempt waited for its first content event, in milliseconds. */
  stallMs: number
  /** 1-based attempt number that stalled. */
  attempt: number
  /** Whether the provider retries this request with a fresh stream. */
  willRetry: boolean
  /**
   * Content characters the stalled attempt streamed before it was abandoned —
   * always 0 for a first-token stall, and non-zero only for a post-content
   * stall, where a retry is impossible and the partial reply is kept.
   */
  streamedChars: number
  /**
   * Liveness frames the attempt received, counted as data arrived that carried
   * no content. Distinguishes the two stall shapes: 0 is a stream that went
   * completely silent, a high count is an upstream that is OPEN and dripping
   * empty frames (DeepSeek's `: keep-alive` comments during a long prefill),
   * which no byte-level idle timeout can see.
   */
  keepAlives: number
}

/**
 * Callback invoked on each stalled upstream stream. Must not throw (providers
 * guard it anyway); keep it fast — it runs on the request path.
 */
export type AiStreamStallCallback = (event: AiStreamStallEvent) => void

/**
 * JSON Schema subset for tool parameter definitions.
 */
export interface JSONSchema {
  type: string
  properties?: Record<string, JSONSchema>
  items?: JSONSchema
  required?: string[]
  description?: string
  enum?: unknown[]
  [key: string]: unknown
}

/**
 * Tool definition that the AI model can invoke.
 */
export interface AITool {
  name: string
  description: string
  parameters: JSONSchema
  execute: (input: unknown) => Promise<unknown>
}

/**
 * Provider-native tool handled server-side (e.g., Anthropic's `web_search`).
 *
 * Unlike `AITool`, server tools are executed by the AI provider itself —
 * no client-side `execute` callback is needed. The provider passes them
 * through to the API alongside custom tools.
 */
export interface ServerTool {
  /**
   * Provider-specific tool type identifier — a VERSIONED string the provider
   * publishes (e.g. Anthropic's `"web_search_20260209"` on current models;
   * older models use earlier variants like `"web_search_20250305"`). Copy the
   * exact value from the provider's docs for the model in use.
   */
  type: string
  /** Tool name. */
  name: string
  /** Allow additional provider-specific fields (max_uses, etc.). */
  [key: string]: unknown
}

/**
 * Parameters for a chat call.
 */
export interface ChatParams {
  messages: ChatMessage[]
  tools?: AITool[]
  /** Provider-native server tools (e.g. web search) — executed by the provider, not the caller. */
  serverTools?: ServerTool[]
  system?: string
  stream?: boolean
  maxTokens?: number
  temperature?: number
  model?: string
  /**
   * Enable extended thinking / reasoning on models that support it.
   *
   * `budgetTokens` is the abstract reasoning budget; bonds without a native
   * token-budget param translate it (e.g. via thresholds) into their provider's
   * control. `effort` — when present — is the PROVIDER-NATIVE effort value for
   * the active model, resolved by the caller from the model catalog (the model's
   * own `supportedEffortLevels`), e.g. Anthropic `output_config.effort`
   * (`'low' | 'medium' | 'high' | 'xhigh' | 'max'`) or an OpenAI-compatible
   * `reasoning_effort`. Bonds MUST prefer `effort` over
   * `budgetTokens` when set: on current Anthropic models (Fable 5 / Opus 4.8 /
   * Sonnet 5) a raw `budget_tokens` request is rejected with a 400 — adaptive
   * thinking + effort is the only control.
   */
  thinking?: { type: 'enabled'; budgetTokens: number; effort?: string }
  /**
   * Request the provider's fast/priority speed tier for this call (e.g.
   * Anthropic's `speed: "fast"` — same model, faster output, premium pricing).
   *
   * Callers should only set `'fast'` for models whose catalog entry declares
   * `fastPricing` (that field is the capability flag). Bonds whose provider has
   * no speed tier ignore it. Bonds that support it MUST report the speed the
   * provider says the request actually ran at in `TokenUsage.speed`, so
   * metering prices the served tier, not the requested one. No automatic
   * fallback is performed here: a fast-tier rate limit surfaces as a normal
   * error/retry, and the caller decides whether to drop back to standard.
   */
  speed?: 'standard' | 'fast'
  /** Enable prompt caching. Providers that support it will cache system prompts and tools. */
  cacheControl?: { type: 'ephemeral' }
  /** Abort signal to cancel in-flight API requests when the client disconnects. */
  signal?: AbortSignal
  /**
   * Control whether the model must call a tool. 'auto' (default) lets the model
   * decide; 'required' forces at least one tool call (any tool); `{ type: 'tool',
   * name }` forces that ONE specific tool — stronger than 'required', which only
   * guarantees *some* tool and can let the model drift to a different one when the
   * conversation history is biased toward it.
   */
  toolChoice?: 'auto' | 'required' | { type: 'tool'; name: string }
  /**
   * Opaque, stable identifier for the END USER on whose behalf this request is
   * made — forwarded to providers that accept one (Anthropic `metadata.user_id`,
   * OpenAI-compatible `user`).
   *
   * This is an ABUSE-ATTRIBUTION control, and it is the difference between a
   * provider suspending one account and suspending your organization's key. With
   * nothing sent, every request from every tenant is indistinguishable from the
   * platform itself, so the only enforcement action available to the provider is
   * against the key that serves all of them.
   *
   * It MUST be opaque — a hash/uuid, never an email, name, phone or anything else
   * that identifies a person to the provider — and it MUST be stable per user, so
   * a repeat offender is recognizable across sessions. Callers are expected to
   * derive it (e.g. an HMAC of their internal user id) and to keep the mapping on
   * their side so an abuse report naming this value can be traced back.
   *
   * Bonds whose provider has no equivalent field ignore it.
   */
  endUserId?: string
  /**
   * Extra provider-native request-body params, shallow-merged into the outgoing
   * request body as a BASE — the bond's own structural fields (model, messages,
   * tools, stream, and its computed token limit) are applied AFTER and always
   * win, so this can add or override tunables the SDK does not model
   * (`reasoning_effort`, `enable_thinking`, `top_k`, `top_p`, penalties, …)
   * without ever corrupting the wire protocol.
   *
   * Primarily for "bring your own AI" endpoints whose server accepts params
   * this SDK has no typed field for. Bonds merge it at the request-body ROOT;
   * for a nested-config wire format (Gemini) a `generationConfig` object here is
   * merged INTO the bond's `generationConfig` rather than replacing it. Values
   * must be JSON-serializable. Bonds that build a fixed body ignore it.
   */
  extraBody?: Record<string, unknown>
}

/**
 * AI provider interface.
 *
 * Each bond package (Anthropic, OpenAI, Gemini, etc.) implements
 * this interface to provide model-specific chat functionality.
 */
export interface AIProvider {
  readonly name: string

  /**
   * Send a chat request and stream back events.
   *
   * Returns an async iterable of ChatEvent objects.
   * Always yields a final 'done' event with token usage.
   * @returns An async iterable that yields `ChatEvent` objects (text chunks, tool calls, done, or error).
   */
  chat(params: ChatParams): AsyncIterable<ChatEvent>
}

/**
 * AI provider configuration.
 */
export interface AIConfig {
  /** Default model to use when not specified in ChatParams. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Default temperature. */
  temperature?: number
}
