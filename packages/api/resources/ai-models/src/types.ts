/**
 * AI model catalog types.
 *
 * Single source of truth for model metadata. The full `ModelDefinition` is
 * consumed both by server-side code (chat handler, compaction) and over the
 * wire by `GET /ai/models`. Nothing in this shape is sensitive enough to hide
 * from authenticated clients today; if that changes, introduce a `PublicModel`
 * projection here and have the handler convert before responding.
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
  | 'deepseek'
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
  /** Input price per million *uncached* (fresh) input tokens in USD. */
  inputPricePerMTok: number
  /** Output price per million tokens in USD. */
  outputPricePerMTok: number
  /**
   * Price per million prompt-cache *read* (cache-hit) input tokens in USD.
   *
   * REQUIRED — never omit. Prompt caching is enabled for the agentic loop, so
   * for a long conversation the cache-read tokens are the DOMINANT input
   * category. Pricing them at `0` (the bug this field fixes) systematically
   * under-measures real upstream spend and lets cost-gated budgets be blown
   * past their caps. Conventionally a steep discount on `inputPricePerMTok`
   * (e.g. Anthropic / OpenAI / DeepSeek bill cache reads at ~0.1×). MUST be
   * `<= inputPricePerMTok` — a cache hit is never more expensive than fresh
   * input.
   */
  cacheReadPricePerMTok: number
  /**
   * Price per million prompt-cache *write* (cache-creation) input tokens in USD.
   *
   * REQUIRED — never omit. The first time a prefix is cached the provider may
   * charge a premium (Anthropic's 5-minute cache write is ~1.25× input);
   * providers that auto-cache at no extra charge (OpenAI, DeepSeek) set this
   * equal to `inputPricePerMTok`. MUST be `>= inputPricePerMTok` — a cache
   * write is never cheaper than fresh input. Only the Anthropic bond currently
   * emits `cacheCreationInputTokens`, but every model declares this so a new
   * cache-emitting bond can never silently bill cache writes at `0`.
   */
  cacheWritePricePerMTok: number
  /** Reliable knowledge cutoff date (YYYY-MM-DD). */
  knowledgeCutoff: string
  /**
   * When the model was (or will be) deprecated (YYYY-MM-DD).
   *
   * Past dates: still selectable, but the picker tucks them into an "Older
   * models" section so newcomers default to current entries. Saved selections
   * (a user previously picked this) keep working. Future dates: still treated
   * as current — useful for scheduling a deprecation in advance.
   *
   * Omit entirely for current models.
   */
  deprecatedAt?: string
}

/**
 * Response shape returned by `GET /ai/models`.
 */
export interface ListModelsResponse {
  models: ModelDefinition[]
}
