/**
 * AI model catalog types.
 *
 * Single source of truth for model metadata. The full `ModelDefinition`
 * (including pricing on both sides) is consumed by server-side code
 * (chat handler, compaction). The narrower `PublicModel` is the wire
 * shape returned by the public `/ai/models` endpoint — pricing on the
 * output side stays server-only.
 *
 * @module
 */

/**
 * AI provider identifier.
 *
 * Maps to the bond category used at runtime (e.g. `bond('ai', 'anthropic', anthropicProvider)`).
 * Adding a new provider here means a corresponding AI bond package must exist.
 */
export type AIProviderID =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'xai'
  | 'meta'
  | 'moonshot'
  | 'minimax'
  | 'alibaba'
  | 'zhipu'

/**
 * Full server-side metadata for an AI model. Consumed directly by the chat
 * handler, compaction, and any other server-side cost / budget logic.
 */
export interface ModelDefinition {
  /** API model ID (e.g. `'claude-sonnet-4-6'`, `'gpt-5.4'`). */
  id: string
  /** Which AI provider serves this model. */
  provider: AIProviderID
  /** Human-readable label (e.g. `'Claude Sonnet 4.6'`). */
  label: string
  /** Short description for UI display. */
  description: string
  /** Maximum input context window in tokens. */
  contextWindow: number
  /** Maximum output tokens per response. */
  maxOutputTokens: number
  /** Whether the model supports extended thinking / chain-of-thought. */
  supportsThinking: boolean
  /** Default thinking budget in tokens (only relevant when `supportsThinking` is true). */
  thinkingBudgetTokens: number
  /**
   * Whether the thinking budget can be controlled via API params.
   * When false, the model always reasons but does not accept a thinking / reasoning_effort param.
   */
  thinkingConfigurable: boolean
  /** Whether the model supports vision (images, documents, etc.). */
  supportsVision: boolean
  /** Whether the model supports prompt caching. */
  supportsPromptCaching: boolean
  /** Whether the model supports tool use / function calling. */
  supportsTools: boolean
  /**
   * Provider-specific server tool type for web search (e.g. `'web_search_20250305'`).
   * When set, the chat handler sends this as a ServerTool alongside custom tools.
   * Omit if the model / provider does not support native web search.
   */
  webSearchToolType?: string
  /**
   * Provider-specific server tool type for code execution (e.g. `'code_execution_20250825'`).
   * Omit if the model / provider does not support native code execution.
   */
  codeExecutionToolType?: string
  /**
   * Provider-specific server tool type for web fetch / URL context (e.g. `'web_fetch_20260209'`).
   * Omit if the model / provider does not support native web fetch.
   */
  webFetchToolType?: string
  /** Whether this model is available on the free tier (only one model should be true). */
  freeTier?: boolean
  /** Input price per million tokens in USD. */
  inputPricePerMTok: number
  /** Output price per million tokens in USD (server-only — not exposed to the client). */
  outputPricePerMTok: number
  /** Reliable knowledge cutoff date (YYYY-MM-DD). */
  knowledgeCutoff: string
}

/**
 * Public projection sent to the client by `GET /ai/models`. Mirrors the full
 * `ModelDefinition` except for fields kept server-only (`outputPricePerMTok`).
 * Client packages should redeclare a matching shape rather than importing
 * this type cross-stack.
 */
export type PublicModel = Omit<ModelDefinition, 'outputPricePerMTok'>

/**
 * Response shape returned by `GET /ai/models`.
 */
export interface ListModelsResponse {
  models: PublicModel[]
}
