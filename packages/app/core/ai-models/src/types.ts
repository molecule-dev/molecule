/**
 * App-side AI model types.
 *
 * Mirrors the wire shape returned by the API's `GET /ai/models` endpoint.
 * Re-declared locally rather than imported from the API package, per the
 * cross-stack rule — server and client communicate only via JSON. Keep in
 * sync with the server-side `ModelDefinition` in `@molecule/api-resource-ai-models`.
 *
 * @module
 */

/**
 * AI provider identifier shipped with each model. Stays in sync with the
 * server-side `AIProviderID` by convention; any drift here will surface as a
 * mismatch with `PROVIDER_BRAND_COLORS`.
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
 * A reasoning-effort value — a model's OWN native effort level (e.g. `'high'`,
 * `'xhigh'`, `'max'`, or a budget label like `'16K'`). There is no abstract
 * cross-model scale; the stored value is the model's real level. Mirrors the
 * server-side `EffortLevel` in `@molecule/api-resource-ai-models`; keep in sync.
 */
export type EffortLevel = string

/**
 * Client-visible model metadata. Mirrors every field of the server-side
 * `ModelDefinition`; no field is currently hidden from authenticated clients.
 */
export interface AppModelDefinition {
  /** API model ID. */
  id: string
  /** Which AI provider serves this model. */
  provider: AIProviderID
  /** Human-readable label for picker display. */
  label: string
  /** Short description for picker display. */
  description: string
  /** Maximum input context window in tokens. */
  contextWindow: number
  /** Maximum output tokens per response. */
  maxOutputTokens: number
  /** Whether the model supports extended thinking / chain-of-thought. */
  supportsThinking: boolean
  /** Default thinking budget in tokens (only relevant when `supportsThinking` is true). */
  thinkingBudgetTokens: number
  /** Whether the thinking budget can be controlled via API params. */
  thinkingConfigurable: boolean
  /**
   * The model's OWN effort levels, ordered ascending — the exact values the
   * `/effort` command offers and that get persisted. Native-effort models list
   * their provider values (`['low', 'high', 'xhigh', 'max']`); budget models
   * list scaled-budget labels (`['4K', '8K', '16K', '32K']`); fixed-reasoning
   * models omit it. A persisted value outside the set degrades to the nearest.
   * Mirrors the server-side `ModelDefinition` field.
   */
  supportedEffortLevels?: EffortLevel[]
  /** The model's default effort value (a member of `supportedEffortLevels`). */
  defaultEffortLevel?: EffortLevel
  /**
   * Budget-configurable models only: maps each `supportedEffortLevels` label to
   * the thinking-token budget it sends. Its presence marks a model as
   * budget-driven (sends `budget_tokens`) rather than native-effort (sends the
   * level as the provider's effort param). Mirrors the server-side field.
   */
  effortBudgetTokens?: Record<string, number>
  /** Whether the model supports vision (images, documents, etc.). */
  supportsVision: boolean
  /** Whether the model supports prompt caching. */
  supportsPromptCaching: boolean
  /** Whether the model supports tool use / function calling. */
  supportsTools: boolean
  /** Optional provider-specific server tool type for web search. */
  webSearchToolType?: string
  /** Optional provider-specific server tool type for code execution. */
  codeExecutionToolType?: string
  /** Optional provider-specific server tool type for web fetch. */
  webFetchToolType?: string
  /** Whether this model is available on the free tier. */
  freeTier?: boolean
  /** Input price per million *uncached* (fresh) input tokens in USD. */
  inputPricePerMTok: number
  /** Output price per million tokens in USD. */
  outputPricePerMTok: number
  /** Price per million prompt-cache *read* (cache-hit) input tokens in USD. */
  cacheReadPricePerMTok: number
  /** Price per million prompt-cache *write* (cache-creation) input tokens in USD. */
  cacheWritePricePerMTok: number
  /** Reliable knowledge cutoff date (YYYY-MM-DD). */
  knowledgeCutoff: string
  /**
   * When the model was (or will be) deprecated (YYYY-MM-DD).
   *
   * Past dates: still selectable, but the picker hides them in an "Older
   * models" section. Future dates: treated as current. Omit entirely for
   * current models.
   */
  deprecatedAt?: string
  /**
   * Whether this model is fully disabled — removed from selection and the
   * listing while remaining priceable for historical usage. Stronger than
   * {@link deprecatedAt} (which keeps the model selectable in an "Older models"
   * section): a disabled model is excluded from the free-tier / deprecation
   * partition helpers and never offered. Kept in sync with the server-side
   * `ModelDefinition.disabled`. Omit entirely for active models.
   */
  disabled?: boolean
}

/**
 * Wire-shape response returned by `GET /ai/models`.
 */
export interface ListAIModelsResponse {
  models: AppModelDefinition[]
}
