# @molecule/api-resource-ai-models

AI model catalog resource.

Server-side source of truth for available AI models plus an
authentication-gated discovery endpoint (`GET /ai/models`). Server consumers
(chat handler, compaction) import `MODELS` / `getModel` / `MODEL_IDS`
directly; authenticated clients fetch the filtered projection over HTTP. The
`list` handler enforces the session check itself and fails closed with `401`,
so the configured-model catalog is never disclosed to an unauthenticated
caller even if the route's `'authenticate'` middleware is stripped by codegen.

## Quick Start

```typescript
import { getModel, MODEL_IDS } from '@molecule/api-resource-ai-models'

// Server-side validation of a client-selected model id:
if (!MODEL_IDS.has(requestedId)) {
  throw new Error('Unknown or retired model')
}
const model = getModel(requestedId)! // full definition (pricing, effort levels)
```

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
  /**
   * Per-mode server default model ids for the requester's tier. Optional —
   * servers that don't compute tier-aware defaults omit it, and clients fall
   * back to generic "default" labeling.
   */
  defaults?: ModeModelDefaults
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
   * The model cannot combine function tools with ANY reasoning on the provider's
   * chat-completions endpoint, so a request carrying tools must pin reasoning
   * OFF or it is rejected outright.
   *
   * Set for the gpt-5.6 family, which answers a tools request with:
   * `Function tools with reasoning_effort are not supported for <model> in
   * /v1/chat/completions. To use function tools, use /v1/responses or set
   * reasoning_effort to 'none'.` (400 — verified live, 2026-07-30). Omitting the
   * effort field entirely does NOT help: the model applies its own default and
   * still 400s. Only an explicit `'none'` works.
   *
   * This is a per-model API fact, so it lives in the catalogue rather than as a
   * model-name branch inside a bond.
   *
   * **This is a workaround, not the fix.** Pinning reasoning off means an agentic
   * caller — which always carries tools — never gets reasoning from these models.
   * The real fix is migrating the OpenAI bond to `/v1/responses`, which supports
   * both together; until then, working-without-reasoning beats 400.
   */
  toolsRequireReasoningOff?: boolean
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

#### `ModeModelDefaults`

The model ids the SERVER falls back to per mode/job when the user hasn't
picked one — already resolved for the requester's tier (a free-tier caller
sees the free-tier clamp ids, a paid caller the paid defaults). Lets the
client label an unset per-mode picker "Default (<model>)" instead of a
vague "default" the user can't decode.

```typescript
interface ModeModelDefaults {
  /** Model id used in plan mode when nothing is configured. */
  plan: string
  /** Model id used in execute mode when nothing is configured. */
  execute: string
  /** Model id used for commit-message generation when nothing is configured. */
  commit: string
  /** Model id used for conversation compaction when nothing is configured. */
  compact: string
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
  /**
   * A model served by a USER-configured endpoint + key (bring-your-own AI)
   * rather than a platform bond. Never appears in the static catalog — hosts
   * synthesize these definitions at runtime from per-project provider config,
   * with all prices 0 (the user pays their own provider directly).
   */
  | 'custom'
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

Sources (verified 2026-07-28):
- Anthropic: https://platform.claude.com/docs/en/about-claude/models/overview
  + /docs/en/build-with-claude/effort (fable-5 / opus-5 / sonnet-5 current;
  opus-4-8 superseded by opus-5 at identical pricing but still served — it is
  the recommended refusal-fallback model; effort ladder on all three current
  models is low|medium|high|xhigh|max; budget_tokens 400s on 4.7+)
- OpenAI: https://developers.openai.com/api/docs/pricing (GPT-5.6 family GA
  2026-07-09: gpt-5.6-sol $5/$30, -terra $2.50/$15, -luna $1/$6, cache read
  0.1× input; gpt-5.5/gpt-5.4 still listed as current; long-context 2×
  variants exist upstream — not modeled, same as the Gemini/Grok tiers)
- Google: https://ai.google.dev/gemini-api/docs/pricing (gemini-3.6-flash GA
  2026-07-21 $1.50/$7.50 supersedes 3.5-flash as the agentic flagship;
  gemini-3.1-pro-preview still the pro tier — "3.5 Pro" has NOT shipped as
  of 2026-07-28 despite the coming-soon badge; do not add until it has an id)
- xAI: https://docs.x.ai/developers/models + /developers/grok-4-5
  (grok-4.5 flagship 2026-07-08: $2/$6, 500K ctx, ≥200K prompts bill 2× —
  not modeled; reasoning_effort low|medium|high default high, image input;
  grok-4.3 still served at $1.25/$2.50 with the bigger 1M window;
  grok-code-fast-1 no longer listed — retires 2026-08-15)
- DeepSeek: https://api-docs.deepseek.com/quick_start/pricing (unchanged V4
  Pro/Flash pricing; legacy deepseek-chat/-reasoner ids fully retired
  2026-07-24 — never in this catalog; the announced peak-hour 2× surcharge is
  still NOT active as of 2026-07-28, see the entries)
- Moonshot: https://platform.kimi.ai/docs/models (kimi-k3 flagship 2026-07-16
  — 2.8T MoE, 1M ctx, $3/$15 — NOT added: thinking is forced-on with
  reasoning_content that must be replayed through tool loops, the same
  constraint that keeps kimi-k2.7-code out; add BOTH once the moonshot bond
  supports preserved thinking + reasoning_effort low|high|max. kimi-k2.6
  remains the newest model the bond can run correctly.)
- MiniMax: https://platform.minimax.io/docs/guides/pricing-paygo (unchanged;
  minimax-m3 $0.30/$1.20 is a "permanent 50% off" list rate)
- Alibaba: https://www.alibabacloud.com/help/en/model-studio/deep-thinking
  (unchanged; qwen3.8-max-preview, 2026-07-19, is Token-Plan-subscriber-only
  — not on the pay-as-you-go API, so it cannot be added yet; qwen3.7-max
  currently runs a 50%-off promo — still billed here at list, $2.50/$7.50)
- Zhipu: https://docs.z.ai/guides/overview/pricing (unchanged; glm-5.2 is
  the newest — "GLM-5.3/5.5" rumors have no released ids as of 2026-07-28)

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

- **No database, no migration — the catalog is code.** Add/retire models by
  editing `models.ts`; validation (`MODEL_IDS`) and the discovery endpoint
  update automatically.
- **`GET /ai/models` only lists models whose provider is BONDED.** The handler
  intersects `MODELS` with the names registered under the `'ai'` bond category,
  so `bond('ai', '<name>', provider)` names must equal
  `ModelDefinition.provider` ids. An empty `{ models: [] }` response means no
  AI bond is wired — fix the wiring; never hardcode a model list client-side.
- **Disabled models stay resolvable on purpose.** `getModel(id)` returns
  retired models so historical usage still prices correctly; gate what a user
  may SELECT with `MODEL_IDS` / `getAvailableModels()`, never with `getModel()`.
- The list handler enforces authentication in-handler (fails closed 401) — if
  you fork it, keep that check; route middleware alone can be stripped by
  codegen.
