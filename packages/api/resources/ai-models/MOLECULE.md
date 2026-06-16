# @molecule/api-resource-ai-models

AI model catalog resource.

Server-side source of truth for available AI models plus a public discovery
endpoint (`GET /ai/models`). Server consumers (chat handler, compaction)
import `MODELS` / `getModel` / `MODEL_IDS` directly; clients fetch the
filtered public projection over HTTP.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-ai-models
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

Abstract effort scale shared across the stack, smallest to largest.

The `/effort` command, the per-turn reasoning/thinking budget, and the
agent-loop budget are all keyed off these four levels. Kept deliberately
provider-agnostic — provider-native names (`'high'` / `'xhigh'` / `'max'`)
are surfaced only as display labels, never baked into this type. Mirrored by
the client-side `EffortLevel` in `@molecule/app-ai-models`; keep the two in
sync. Re-declared (rather than imported) by the ide-react and molecule-dev
consumers per the cross-stack rule, but this catalog is the canonical home.

```typescript
type EffortLevel = 'S' | 'M' | 'L' | 'XL'
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

```typescript
function list(_req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `_req` — The request object (unused).
- `res` — The response object.

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

`supportedEffortLevels` rule (see {@link ModelDefinition.supportedEffortLevels}):
a model with a fully controllable reasoning budget (`thinkingConfigurable:
true`) carries the full abstract scale `['S', 'M', 'L', 'XL']`; a model whose
reasoning is fixed (`thinkingConfigurable: false` — whether it thinks at a
fixed budget like `grok-code-fast-1` or does not think at all like the
DeepSeek executors) carries only the default level `['M']`. Every set
includes the default `'M'` so `DEFAULT_EFFORT_LEVEL` is always in range.
Omitting the field is still valid and means "all levels" — the catalog just
sets it explicitly on every entry so each model's effort capability is
self-evident and tunable.

Sources (verified 2026-06-16):
- Anthropic: https://platform.claude.com/docs/en/about-claude/models/overview
  (claude-fable-5 + claude-opus-4-8 current; claude-opus-4-6 deprecated)
- OpenAI: https://developers.openai.com/api/docs/models/gpt-5.5
  (gpt-5.5 current; gpt-5.4 deprecated)
- Google: https://ai.google.dev/gemini-api/docs/models
  (gemini-3.1-pro GA, 2M context; gemini-3.1-pro-preview deprecated)
- xAI: https://docs.x.ai/developers/models
  (grok-4.3 current flagship; grok-4.20 deprecated; grok-code-fast-1 retired/disabled)
- DeepSeek: https://api-docs.deepseek.com/quick_start/pricing
  (deepseek-v4-pro / deepseek-v4-flash current — released 2026-04-24)
- Meta: https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8
- Moonshot: https://openrouter.ai/moonshotai/kimi-k2.6
  (kimi-k2.6 current; kimi-k2.5 deprecated)
- MiniMax: https://openrouter.ai/minimax/minimax-m2.7
  (minimax-m2.7 current; minimax-m2.5 deprecated)
- Alibaba: https://openrouter.ai/qwen/qwen3-coder-plus (current)
- Zhipu: https://openrouter.ai/z-ai/glm-5, https://docs.z.ai/guides/llm/glm-5
  (glm-5 current; glm-5.2 launched 2026-06-13 but its standalone API + per-token
  pricing are not yet published — Coding-Plan-only at launch — so not added yet)

Knowledge-cutoff dates on the bumped non-Anthropic entries are best-effort
estimates; the provider sources above verify id / pricing / context window.

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
- `@molecule/api-resource` ^1.0.0
