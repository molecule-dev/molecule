# @molecule/app-ai-models

App-side AI model catalog client.

Framework-agnostic loader, types, and UI-only constants (`PROVIDER_BRAND_COLORS`,
`formatTokenCount`). Hosts the lazy fetch of `GET /ai/models`. Framework
bindings (e.g. `useAIModels` in `@molecule/app-react`) wrap this loader.

## Type
`core`

## Installation
```bash
npm install @molecule/app-ai-models
```

## API

### Interfaces

#### `AppModelDefinition`

Client-visible model metadata. Mirrors every field of the server-side
`ModelDefinition`; no field is currently hidden from authenticated clients.

```typescript
interface AppModelDefinition {
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
  /**
   * Provider-native reasoning-effort value per supported abstract level (e.g.
   * `{ S: 'low', M: 'high', L: 'xhigh', XL: 'max' }` on current Anthropic
   * models). Present only on models driven by a native effort/level param;
   * useful for showing the provider's own level names next to the abstract
   * `S/M/L/XL` labels. Mirrors the server-side `ModelDefinition` field.
   */
  effortNativeByLevel?: Partial<Record<EffortLevel, string>>
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
```

#### `EffortOption`

One selectable effort option for a specific model.

```typescript
interface EffortOption {
  /** Internal persisted encoding (`project.settings.effortByMode` / legacy `effortLevel`). */
  level: EffortLevel
  /**
   * What the user sees and types — the model's OWN effort value (e.g.
   * `'xhigh'`), or a scaled thinking-budget size (e.g. `'16K'`) on
   * budget-scaled models, or the bare abstract level as a last resort for
   * unknown models.
   */
  native: string
}
```

#### `ListAIModelsResponse`

Wire-shape response returned by `GET /ai/models`.

```typescript
interface ListAIModelsResponse {
  models: AppModelDefinition[]
}
```

### Types

#### `AIProviderID`

AI provider identifier shipped with each model. Stays in sync with the
server-side `AIProviderID` by convention; any drift here will surface as a
mismatch with `PROVIDER_BRAND_COLORS`.

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

Abstract effort scale, smallest to largest. Mirrors the server-side
`EffortLevel` in `@molecule/api-resource-ai-models`; keep the two in sync.
Kept provider-agnostic — provider-native level names (`'high'` / `'xhigh'` /
`'max'`) are surfaced only as display labels, never baked into this type.

```typescript
type EffortLevel = 'S' | 'M' | 'L' | 'XL'
```

### Functions

#### `effortOptionsForModel(model)`

The effort options a user can pick for a specific model, in ascending order.

- Native-level models → the catalog's `effortNativeByLevel` values.
- Budget-scaled models → the scaled thinking budgets (`'8K'`, `'16K'`, …),
  clamped exactly like the server clamps the real request budget.
- Fixed-reasoning models → `[]` (nothing to tune; effort still scales the
  agent-loop budget server-side, but there is no per-model value to choose).
- Unknown models (`undefined`) → the abstract levels themselves, so a
  custom/unlisted model never loses the setting entirely.

```typescript
function effortOptionsForModel(model: AppModelDefinition | undefined): EffortOption[]
```

- `model` — The model to build options for, or `undefined` when unknown.

**Returns:** The selectable options in `S → XL` order.

#### `formatTokenCount(tokens)`

Format a token count for display (e.g. `200000` -> `"200K"`, `1000000` -> `"1M"`).

```typescript
function formatTokenCount(tokens: number): string
```

- `tokens` — Token count.

**Returns:** Formatted string.

#### `isDeprecated(model, now)`

Returns `true` when the model is deprecated as of `now`. A model is deprecated
if `deprecatedAt` is set and lexicographically `<=` the `now` date (YYYY-MM-DD
strings compare as dates). Models with a future `deprecatedAt` are still
current — useful for scheduling deprecations.

```typescript
function isDeprecated(model: Pick<AppModelDefinition, "deprecatedAt">, now?: string): boolean
```

- `model` — Model to check.
- `now` — Today's date as YYYY-MM-DD. Defaults to the current UTC date.

**Returns:** `true` if the model is deprecated as of `now`.

#### `loadAIModels(http, path)`

Fetches the AI model catalog from the API and returns the models array.

```typescript
function loadAIModels(http: HttpClient, path?: string): Promise<AppModelDefinition[]>
```

- `http` — HTTP client bonded by the host app.
- `path` — Endpoint path, defaults to `'/ai/models'` (the http client supplies the base URL).

**Returns:** The list of models available to the current session.

#### `nativeEffortName(model, level)`

The user-facing name of a persisted effort level under a specific model —
the native value the level resolves to on that model.

A persisted level outside the model's supported set degrades to the nearest
supported option (ties resolve toward less effort), mirroring the
server-side clamp, so the display always matches what the backend will
actually send.

```typescript
function nativeEffortName(model: AppModelDefinition | undefined, level: EffortLevel): string | null
```

- `model` — The active model (or `undefined` when unknown).
- `level` — The persisted abstract level.

**Returns:** The native display name, or `null` when the model's reasoning is
 *   fixed (nothing to display — callers show their own "fixed" copy).

#### `partitionByDeprecation(models, now)`

Splits a model catalog into current and deprecated entries based on each
model's `deprecatedAt` relative to `now`. Order within each partition is
preserved. `disabled` models are dropped entirely — they belong in neither
partition (the listing already excludes them, and they must not surface in
the picker's current or "Older models" section).

```typescript
function partitionByDeprecation(models: readonly AppModelDefinition[], now?: string): { current: AppModelDefinition[]; deprecated: AppModelDefinition[]; }
```

- `models` — Loaded model catalog.
- `now` — Today's date as YYYY-MM-DD. Defaults to the current UTC date.

**Returns:** Object with `current` and `deprecated` arrays.

#### `pickFreeTierModel(models)`

Returns the free-tier model from a list, or `undefined` if none is marked.
`disabled` models are ignored — a retired model is never picked as the
free-tier default even if it still carries the flag.

```typescript
function pickFreeTierModel(models: readonly AppModelDefinition[]): AppModelDefinition | undefined
```

- `models` — Loaded model catalog.

**Returns:** The single non-disabled model with `freeTier: true`, or `undefined`.

### Constants

#### `DEFAULT_EFFORT_LEVEL`

Default abstract effort level when none is persisted.

```typescript
const DEFAULT_EFFORT_LEVEL: EffortLevel
```

#### `EFFORT_LEVELS`

All abstract effort levels in ascending order (internal encoding).

```typescript
const EFFORT_LEVELS: readonly EffortLevel[]
```

#### `PROVIDER_BRAND_COLORS`

Brand colors keyed by provider ID. Used as accent colors in picker rows.

```typescript
const PROVIDER_BRAND_COLORS: Readonly<Record<AIProviderID, string>>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-http` ^1.0.0
