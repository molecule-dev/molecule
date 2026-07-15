# @molecule/api-resource-ai-models

AI model catalog resource.

Server-side source of truth for available AI models plus an
authentication-gated discovery endpoint (`GET /ai/models`). Server consumers
(chat handler, compaction) import `MODELS` / `getModel` / `MODEL_IDS`
directly; authenticated clients fetch the filtered projection over HTTP. The
`list` handler enforces the session check itself and fails closed with `401`,
so the configured-model catalog is never disclosed to an unauthenticated
caller even if the route's `'authenticate'` middleware is stripped by codegen.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-ai-models @molecule/api-bond @molecule/api-i18n @molecule/api-resource
```

## API

### Interfaces

#### `ListModelsResponse`

Response shape returned by `GET /ai/models`.

```typescript
interface ListModelsResponse {
  models: ModelDefinition[]
}
```

#### `ModelDefinition`

Full server-side metadata for an AI model. Consumed directly by the chat
handler, compaction, and any other server-side cost / budget logic.

```typescript
interface ModelDefinition {
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
   * The model's OWN reasoning-effort levels, ordered ascending (least → most
   * effort) — the exact values a user picks, that get persisted, and that the
   * `/effort` command offers. There is NO abstract scale: these are the model's
   * real levels.
   *
   * - **Native-effort models** (Anthropic `output_config.effort`, OpenAI
   *   `reasoning_effort`, Gemini `thinking_level`, …) list their provider values
   *   verbatim, e.g. `['low', 'high', 'xhigh', 'max']` — each value is sent as
   *   the provider's effort param as-is.
   * - **Budget-configurable models** (a raw thinking-token budget, no native
   *   level names — e.g. Claude Haiku 4.5, Qwen3.7) list scaled-budget LABELS,
   *   e.g. `['4K', '8K', '16K', '32K']`, with {@link effortBudgetTokens} mapping
   *   each label to the actual token budget sent.
   * - **Fixed-reasoning models** (DeepSeek executors, Kimi, …) omit this field
   *   entirely — reasoning depth can't be tuned, so there is nothing to pick.
   *
   * A persisted value outside the active model's set degrades to the nearest one
   * (`model-selection.ts` `resolveEffortForModel`). Absent → no effort choice.
   */
  supportedEffortLevels?: EffortLevel[]
  /**
   * The model's default effort value — the one used when the user hasn't chosen.
   * MUST be a member of {@link supportedEffortLevels}. Absent only when the model
   * has no effort levels (fixed reasoning).
   */
  defaultEffortLevel?: EffortLevel
  /**
   * For budget-configurable models ONLY: maps each label in
   * {@link supportedEffortLevels} to the thinking-token budget it sends
   * (e.g. `{ '4K': 4000, '8K': 8000, '16K': 16000, '32K': 32000 }`). Its
   * presence is what marks a model as budget-driven rather than native-effort:
   * a model WITH this map sends `budget_tokens`; a model WITHOUT it sends its
   * chosen level as the provider's native effort param.
   *
   * CRITICAL for Anthropic 4.6+ models (Fable 5, Opus 4.8/4.6, Sonnet 5 / 4.6):
   * these must NOT carry this map — they are native-effort models, and sending
   * `budget_tokens` returns a 400 on Fable 5 / Opus 4.8 / Sonnet 5.
   */
  effortBudgetTokens?: Record<string, number>
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
```

### Types

#### `AIProviderID`

AI provider identifier.

Maps to the bond category used at runtime (e.g. `bond('ai', 'anthropic', anthropicProvider)`).
Adding a new provider here means a corresponding AI bond package must exist.

```typescript
type AIProviderID =
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
```

#### `EffortLevel`

A reasoning-effort value — a model's OWN native effort level.

There is no abstract cross-model scale: the value stored on a project and
sent to the provider IS the model's real level (e.g. `'high'` / `'xhigh'` /
`'max'` on current Claude models, `'medium'` on Grok, or a scaled
thinking-budget label like `'16K'` on budget-configurable models). Each model
declares its own ordered {@link ModelDefinition.supportedEffortLevels}; a
value that isn't in the active model's set degrades to the nearest one (see
`model-selection.ts`). Mirrored by the client-side `EffortLevel` in
`@molecule/app-ai-models`; keep the two in sync. Re-declared (rather than
imported) by the ide-react and molecule-dev consumers per the cross-stack
rule, but this catalog is the canonical home.

```typescript
type EffortLevel = string
```

### Functions

#### `getAvailableModels(availableProviders)`

Get models that are currently usable — filtered to only providers that are available.

The caller passes in which provider IDs are active (i.e. have a bond wired).
`disabled` models are excluded — they are never offered for selection.

```typescript
function getAvailableModels(availableProviders: ReadonlySet<AIProviderID> | readonly AIProviderID[]): readonly ModelDefinition[]
```

- `availableProviders` — Set or array of provider IDs that have active bonds.

**Returns:** Non-disabled models whose provider is in the available set.

#### `getModel(id)`

Look up a model definition by ID.

Returns `disabled` models too: a saved selection or a historical usage row
may reference a since-retired model, and it must stay priceable. Use
{@link MODEL_IDS} / {@link getAvailableModels} (which exclude disabled
models) to decide what is *selectable*.

```typescript
function getModel(id: string): ModelDefinition | undefined
```

- `id` — The API model ID.

**Returns:** The model definition, or `undefined` if not found.

#### `getModelsByProvider(provider)`

Get all models for a specific provider.

```typescript
function getModelsByProvider(provider: AIProviderID): readonly ModelDefinition[]
```

- `provider` — The provider ID.

**Returns:** Array of model definitions for that provider.

#### `list(_req, res)`

Returns models whose `provider` has a bond registered under the `'ai'`
category. When no AI providers are bonded the response is `{ models: [] }`,
which signals a misconfigured server rather than masking the issue.

Fails closed with `401` when there is no authenticated session, so the model
catalog is never disclosed to an unauthenticated caller even if the route's
`'authenticate'` middleware is dropped by codegen.

```typescript
function list(_req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `_req` — The request object (unused).
- `res` — The response object.

#### `priceMultiplierAt(modelDef, at)`

The price multiplier in effect for a model at a given instant.

Consults the model's {@link ModelDefinition.peakPricing} windows (UTC,
half-open, may wrap midnight). Metering MUST call this with each request's
own timestamp so peak-hour usage bills at the provider's real rate — pricing
everything at the flat rate silently under-meters peak traffic.

```typescript
function priceMultiplierAt(modelDef: ModelDefinition | undefined, at: Date): number
```

- `modelDef` — The model definition (or undefined).
- `at` — The instant the request was made.

**Returns:** The multiplier (`1` outside peak windows or when none are declared).

### Constants

#### `MODEL_IDS`

Set of *selectable* model IDs for fast validation.

Excludes `disabled` models so a retired model (e.g. `grok-code-fast-1`) can
never be chosen for a new chat, while {@link getModel} still resolves it for
historical pricing.

```typescript
const MODEL_IDS: ReadonlySet<string>
```

#### `MODELS`

All available AI models, grouped by provider, ordered from most to least capable.

To add or remove a model, edit this array. Both the server-side validation
and the public discovery endpoint will update automatically.

Effort is each model's OWN native value — there is no abstract scale (see
{@link ModelDefinition.supportedEffortLevels}):
- A model driven by a provider-native effort/level param lists its provider
  values verbatim in `supportedEffortLevels` (ascending), with
  `defaultEffortLevel` = the provider's default/recommended level for agentic
  coding. NO `effortBudgetTokens`.
- A model with a controllable token budget but no native level names (e.g.
  Claude Haiku 4.5's `budget_tokens`, Qwen's `thinking_budget`) lists
  scaled-budget labels (`['4K', '8K', '16K', '32K']`) with `effortBudgetTokens`
  mapping each label to the token budget it sends.
- A model whose reasoning is fixed (always-on or on/off only, no depth
  control) carries `thinkingConfigurable: false` and OMITS both fields —
  there is nothing to tune.

Sources (verified 2026-07-07):
- Anthropic: https://platform.claude.com/docs/en/about-claude/models/overview
  + /docs/en/build-with-claude/effort (fable-5 / opus-4-8 / sonnet-5 current;
  sonnet-4-6 + opus-4-6 legacy; effort = output_config.effort, adaptive
  thinking; budget_tokens 400s on fable-5/opus-4-8/sonnet-5)
- OpenAI: https://developers.openai.com/api/docs/models/gpt-5.5 + /pricing +
  /guides/reasoning (gpt-5.5 flagship; gpt-5.4 NOT deprecated; gpt-5.4-mini
  cheap tier; reasoning_effort none|low|medium|high|xhigh. GPT-5.6 “Sol” is
  limited-preview only — no public id/pricing yet; do not add until GA.)
- Google: https://ai.google.dev/gemini-api/docs/models + /docs/thinking
  (gemini-3.5-flash GA 2026-05-19 is the agentic/coding flagship;
  gemini-3.1-pro-preview is the pro tier — there is NO bare "gemini-3.1-pro"
  id and never was; thinking_level replaces thinking_budget)
- xAI: https://docs.x.ai/developers/models + /model-capabilities/text/reasoning
  (grok-4.3 flagship, reasoning_effort none|low|medium|high default low;
  grok-build-0.1 succeeds grok-code-fast-1, which retires 2026-08-15)
- DeepSeek: https://api-docs.deepseek.com/quick_start/pricing +
  /guides/thinking_mode (V4 permanent 75% price cut since 2026-05-23; 384K
  output; thinking default ENABLED w/ reasoning_effort high|max — we still
  run non-thinking, see entries. Peak-hour 2× pricing announced for
  mid-Jul 2026; re-verify pricing when the "V4 official" release lands.)
- Moonshot: https://platform.kimi.ai/docs/models (kimi-k2.6 = current
  general flagship; kimi-k2.7-code exists but REQUIRES replaying
  reasoning_content through tool loops — not added until the bond supports
  preserved thinking; kimi-k2.5 legacy but still served)
- MiniMax: https://platform.minimax.io/docs/guides/models-intro +
  /docs/guides/pricing-paygo.md (minimax-m3 flagship 2026-06-01, 1M ctx,
  multimodal; m2.7 repriced $0.30/$1.20, thinking not disableable)
- Alibaba: https://www.alibabacloud.com/help/en/model-studio/deep-thinking +
  /model-studio/qwen-coder (qwen3.7-max is the agentic flagship — Alibaba now
  recommends general-purpose models over Qwen-Coder; qwen3-coder-plus is
  NON-thinking, catalog previously wrong)
- Zhipu: https://docs.z.ai/guides/overview/pricing +
  /api-reference/llm/chat-completion (glm-5.2 standalone API live since
  2026-06-16 w/ reasoning_effort — effective levels high|max, default max;
  glm-5 repriced $1.00/$3.20)

Knowledge-cutoff dates on non-Anthropic entries are best-effort estimates
where the provider doesn't publish one; the provider sources above verify
id / pricing / context window.

```typescript
const MODELS: readonly ModelDefinition[]
```

#### `requestHandlerMap`

Map of request handlers for the AI model catalog routes.

```typescript
const requestHandlerMap: { readonly list: typeof list; }
```

#### `routes`

Route array for the AI model catalog: GET list of available models.

```typescript
const routes: readonly [{ readonly method: "get"; readonly path: "/ai/models"; readonly handler: "list"; readonly middlewares: readonly ["authenticate"]; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-resource` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`
- `@molecule/api-resource`
