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
 * Abstract effort scale shared across the stack, smallest to largest.
 *
 * The `/effort` command, the per-turn reasoning/thinking budget, and the
 * agent-loop budget are all keyed off these four levels. Kept deliberately
 * provider-agnostic — provider-native names (`'high'` / `'xhigh'` / `'max'`)
 * are surfaced only as display labels, never baked into this type. Mirrored by
 * the client-side `EffortLevel` in `@molecule/app-ai-models`; keep the two in
 * sync. Re-declared (rather than imported) by the ide-react and molecule-dev
 * consumers per the cross-stack rule, but this catalog is the canonical home.
 */
export type EffortLevel = 'S' | 'M' | 'L' | 'XL'

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
  /**
   * Which abstract effort levels (`'S' | 'M' | 'L' | 'XL'`) are meaningful for
   * THIS model — the subset the `/effort` command should offer and accept.
   *
   * Molecule keeps a single abstract effort scale (see {@link EffortLevel});
   * this field declares which points on that scale actually change the model's
   * behavior, because models differ in real reasoning capability — some expose
   * a fully configurable thinking budget, others reason at a fixed budget or
   * not at all.
   *
   * Semantics:
   * - **Absent** → ALL levels are supported (back-compat default; a model that
   *   predates this field, or any future/external entry that omits it, keeps
   *   offering the full scale and nothing breaks).
   * - **Present** → only the listed levels are offered/accepted; a persisted
   *   level outside the set should degrade gracefully to the nearest supported
   *   one (the consumer clamps — see `model-selection.ts`).
   *
   * Population rule applied in `models.ts`: a model whose reasoning budget is
   * fully controllable (`thinkingConfigurable: true`) gets the full set
   * `['S', 'M', 'L', 'XL']`; a model whose reasoning is fixed
   * (`thinkingConfigurable: false`, whether it still thinks at a fixed budget
   * like `grok-code-fast-1` or does not think at all like the DeepSeek
   * executors) gets just the default level `['M']`. Every set includes the
   * default level (`'M'`) so the global `DEFAULT_EFFORT_LEVEL` is never outside
   * a model's supported set. This is curated data the team can tune later.
   */
  supportedEffortLevels?: EffortLevel[]
  /**
   * Provider-NATIVE reasoning-effort value sent for each supported abstract
   * level — the wire value the provider bond puts in its effort param (Anthropic
   * `output_config.effort`, OpenAI-compatible `reasoning_effort`, Gemini
   * `thinking_level`, …).
   *
   * Semantics:
   * - **Present** → this model is driven by a native effort/level param, NOT a
   *   token budget. The chat handler resolves the (clamped) abstract level to
   *   this map's value and passes it as `thinking.effort`; bonds prefer it over
   *   `budgetTokens`. Keys MUST match `supportedEffortLevels` and be monotone on
   *   the provider's own scale (S < M < L < XL). Convention: **`M` maps to the
   *   provider's default/recommended level for agentic coding** on this model —
   *   the level a user gets without touching `/effort`.
   * - **Absent** → the legacy token-budget path: effort scales
   *   `thinkingBudgetTokens` (e.g. Claude Haiku 4.5's `budget_tokens`), or does
   *   nothing beyond the loop budget when `thinkingConfigurable` is false.
   *
   * CRITICAL for Anthropic 4.6+ models (Fable 5, Opus 4.8/4.6, Sonnet 5 / 4.6):
   * these MUST carry this map — sending `budget_tokens` returns a 400 on
   * Fable 5 / Opus 4.8 / Sonnet 5 and is deprecated on the 4.6 family.
   */
  effortNativeByLevel?: Partial<Record<EffortLevel, string>>
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
  /**
   * Optional provider peak-hour pricing: during the listed UTC windows, ALL of
   * this model's token prices (input, output, cache read/write) bill at
   * `multiplier × ` the listed rates. Metering MUST price each request by its
   * own timestamp via `priceMultiplierAt()` — never assume the flat rate — or
   * peak-hour usage is under-metered and the platform eats the difference
   * (e.g. DeepSeek's announced 2× Beijing-business-hours pricing).
   *
   * Windows are minutes-since-midnight UTC, half-open `[start, end)`; a window
   * may wrap midnight (`start > end`).
   */
  peakPricing?: {
    windows: { startMinuteUtc: number; endMinuteUtc: number }[]
    multiplier: number
  }
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
  /**
   * Whether this model is fully disabled — removed from selection and the
   * public listing while remaining priceable for historical usage.
   *
   * Stronger than {@link deprecatedAt}: a deprecated model is still selectable
   * (the picker just tucks it into an "Older models" section), whereas a
   * disabled model vanishes from every *exposure* surface — it is excluded from
   * `MODEL_IDS`, `getAvailableModels()`, the `GET /ai/models` listing, and the
   * client-side free-tier / deprecation-partition helpers. Use it for a model
   * the provider has retired or deprecated (e.g. `grok-code-fast-1`).
   *
   * `getModel(id)` STILL returns a disabled entry so a saved selection or a
   * historical usage row can always be priced — NEVER delete a disabled model,
   * or its past usage silently meters as free. Omit entirely for active models.
   */
  disabled?: boolean
}

/**
 * Response shape returned by `GET /ai/models`.
 */
export interface ListModelsResponse {
  models: ModelDefinition[]
}
