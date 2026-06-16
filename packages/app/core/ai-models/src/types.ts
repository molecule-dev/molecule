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
 * Abstract effort scale, smallest to largest. Mirrors the server-side
 * `EffortLevel` in `@molecule/api-resource-ai-models`; keep the two in sync.
 * Kept provider-agnostic — provider-native level names (`'high'` / `'xhigh'` /
 * `'max'`) are surfaced only as display labels, never baked into this type.
 */
export type EffortLevel = 'S' | 'M' | 'L' | 'XL'

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
   * Which abstract effort levels (`'S' | 'M' | 'L' | 'XL'`) the `/effort`
   * command should offer/accept for THIS model. Absent → all levels are
   * supported (back-compat). Present → only the listed levels are valid;
   * consumers clamp a persisted out-of-set level to the nearest supported one.
   * Populated server-side per each model's real reasoning capability; see the
   * server-side `ModelDefinition` for the exact population rule.
   */
  supportedEffortLevels?: EffortLevel[]
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
