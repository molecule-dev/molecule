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
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string | unknown }

/**
 * Streaming event from an AI chat call.
 */
export type ChatEvent =
  | { type: 'text'; content: string }
  | { type: 'thinking'; content: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
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
  // input was being written. Deliberately a COUNT, not the content: the UI only
  // needs the magnitude, and forwarding the full input would duplicate what the
  // final `tool_use` (and `file_diff`, for writes) already carries.
  | { type: 'tool_input_delta'; id: string; chars: number }
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
}

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
  /** Provider-specific tool type identifier (e.g. `"web_search_20250305"`). */
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
  /** Enable extended thinking. Only supported by Sonnet/Opus models. */
  thinking?: { type: 'enabled'; budgetTokens: number }
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
