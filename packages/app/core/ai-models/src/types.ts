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
   * A model served by a USER-configured endpoint + key (bring-your-own AI).
   * Appears only in project-scoped listings (`GET /ai/models?projectId=…`);
   * pricing fields are 0 (the user pays their own provider directly).
   */
  | 'custom'

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
  /**
   * Regions in which this model is free-tier selectable even though the model
   * as a whole is not `freeTier` (regional hosts can price very differently).
   * Ignored when `freeTier` is true; omitted → no per-region free access.
   * Mirrors the API catalog's `ModelDefinition.freeTierRegions`.
   */
  freeTierRegions?: string[]
  /**
   * Processing regions this model can run in (arbitrary region codes; FIRST
   * entry is the model's default region). Omit for `['us']`. A single-entry
   * list pins the model to that region. Mirrors the server-side
   * `ModelDefinition.regions`.
   */
  regions?: string[]
  /**
   * Per-region price overrides in USD per MTok for regions billed differently
   * from the base rates (the native provider's list prices). A region with no
   * entry bills at the base rates; omitted cache fields fall back to the
   * region's `inputPricePerMTok`. Mirrors the server-side
   * `ModelDefinition.regionPricing`.
   */
  regionPricing?: Record<
    string,
    {
      /** Region input price per million uncached tokens in USD. */
      inputPricePerMTok: number
      /** Region output price per million tokens in USD. */
      outputPricePerMTok: number
      /** Region prompt-cache read price per million tokens in USD. */
      cacheReadPricePerMTok?: number
      /** Region prompt-cache write price per million tokens in USD. */
      cacheWritePricePerMTok?: number
    }
  >
  /** Input price per million *uncached* (fresh) input tokens in USD. */
  inputPricePerMTok: number
  /** Output price per million tokens in USD. */
  outputPricePerMTok: number
  /** Price per million prompt-cache *read* (cache-hit) input tokens in USD. */
  cacheReadPricePerMTok: number
  /** Price per million prompt-cache *write* (cache-creation) input tokens in USD. */
  cacheWritePricePerMTok: number
  /**
   * Provider peak-hour pricing: during these UTC windows every one of this
   * model's token rates bills at `multiplier ×` the listed values. Mirrors the
   * server-side `ModelDefinition.peakPricing`.
   *
   * Surfaced to the user because it is not a rounding error — DeepSeek's native
   * windows are a flat 2×, so the same conversation costs twice as much inside
   * them. A cost figure that silently ignores this tells users their allowance
   * drains at a rate it does not. The rate the picker shows is always the one
   * in force NOW ({@link modelUsageRate}), with the windows named alongside so
   * a number that changes during the day is explained rather than surprising.
   *
   * Windows are minutes-since-midnight UTC, half-open `[start, end)`; a window
   * may wrap midnight (`start > end`).
   *
   * Applies to the BASE rates only. A region with a `regionPricing` override is
   * a different host billing its own card, which generally has no time-of-day
   * component — so peak never applies there, matching `priceMultiplierAt`.
   */
  peakPricing?: {
    windows: { startMinuteUtc: number; endMinuteUtc: number }[]
    multiplier: number
  }
  /**
   * Fast-mode ("priority speed") pricing. PRESENCE marks the model as
   * fast-mode capable — the ⚡ composer toggle and the picker's `fast` badge
   * key off this field. Mirrors the server-side `ModelDefinition.fastPricing`.
   */
  fastPricing?: {
    /** Fast-mode input price per million uncached tokens in USD. */
    inputPricePerMTok: number
    /** Fast-mode output price per million tokens in USD. */
    outputPricePerMTok: number
    /** Fast-mode prompt-cache read price per million tokens in USD. */
    cacheReadPricePerMTok: number
    /** Fast-mode prompt-cache write price per million tokens in USD. */
    cacheWritePricePerMTok: number
  }
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
  /**
   * The id of the newer-generation model that replaces this one, set on the
   * OLDER entry (e.g. `qwen3.7-max` carries `supersededBy: 'qwen3.8-max'`).
   *
   * Treated like {@link disabled} by the picker helpers — a superseded model is
   * never offered, so the user sees exactly one generation of each model family
   * — but it stays priceable for historical usage, and the successor id is the
   * migration target for a saved selection. A server that filters properly
   * never sends these; the helpers drop them anyway so an older API can't
   * reintroduce them. Kept in sync with the server-side
   * `ModelDefinition.supersededBy`. Omit entirely for current models.
   */
  supersededBy?: string
}

/**
 * The model ids the SERVER falls back to per mode/job when the user hasn't
 * picked one — already resolved for the requester's tier. Mirrors the server's
 * `ModeModelDefaults`. Lets the picker label an unset per-mode selection
 * "Default (<model>)" instead of a vague "default".
 */
export interface AppModeModelDefaults {
  /** Model id used in plan mode when nothing is configured. */
  plan: string
  /** Model id used in execute mode when nothing is configured. */
  execute: string
  /** Model id used for commit-message generation when nothing is configured. */
  commit: string
  /** Model id used for conversation compaction when nothing is configured. */
  compact: string
}

/**
 * Wire-shape response returned by `GET /ai/models`.
 */
export interface ListAIModelsResponse {
  models: AppModelDefinition[]
  /**
   * Per-mode server default model ids for the requester's tier. Optional —
   * servers that don't compute them omit it, and clients fall back to generic
   * "default" labeling.
   */
  defaults?: AppModeModelDefaults
}
