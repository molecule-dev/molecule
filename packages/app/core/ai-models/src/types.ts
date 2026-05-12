/**
 * App-side AI model types.
 *
 * Mirrors the wire shape returned by the API's `GET /ai/models` endpoint.
 * Re-declared locally rather than imported from the API package, per the
 * cross-stack rule — server and client communicate only via JSON.
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
  | 'meta'
  | 'moonshot'
  | 'minimax'
  | 'alibaba'
  | 'zhipu'

/**
 * Client-visible model metadata. Mirrors the API's `PublicModel` projection —
 * every server field except `outputPricePerMTok`, which stays server-only.
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
  /** Input price per million tokens in USD. */
  inputPricePerMTok: number
  /** Reliable knowledge cutoff date (YYYY-MM-DD). */
  knowledgeCutoff: string
}

/**
 * Wire-shape response returned by `GET /ai/models`.
 */
export interface ListAIModelsResponse {
  models: AppModelDefinition[]
}
