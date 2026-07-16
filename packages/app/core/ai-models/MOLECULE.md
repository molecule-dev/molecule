# @molecule/app-ai-models

App-side AI model catalog client.

Framework-agnostic loader, types, and UI-only constants (`PROVIDER_BRAND_COLORS`,
`formatTokenCount`, effort helpers). Hosts the lazy fetch of `GET /ai/models`.
Framework bindings (e.g. `useAIModels` in `@molecule/app-react`) wrap this loader.

## Quick Start

```typescript
import { getClient } from '@molecule/app-http'
import { loadAIModels, partitionByDeprecation } from '@molecule/app-ai-models'

const models = await loadAIModels(getClient())
const { current, deprecated } = partitionByDeprecation(models)
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-ai-models @molecule/app-http
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
```

#### `EffortOption`

One selectable effort option for a model — its own native value.

```typescript
interface EffortOption {
  /** The native value the user sees, types, and that gets persisted. */
  value: string
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

A reasoning-effort value — a model's OWN native effort level (e.g. `'high'`,
`'xhigh'`, `'max'`, or a budget label like `'16K'`). There is no abstract
cross-model scale; the stored value is the model's real level. Mirrors the
server-side `EffortLevel` in `@molecule/api-resource-ai-models`; keep in sync.

```typescript
type EffortLevel = string
```

### Functions

#### `defaultEffortForModel(model)`

The model's default effort value (used when the user hasn't chosen), or `null`
when the model has no effort levels.

```typescript
function defaultEffortForModel(model: AppModelDefinition | undefined): string | null
```

- `model` — The model (or `undefined`).

**Returns:** The default native value, or `null`.

#### `effortOptionsForModel(model)`

The effort options a user can pick for a model, in ascending order — the
model's own `supportedEffortLevels`. Empty for fixed-reasoning models (and
unknown models), which expose no effort choice.

```typescript
function effortOptionsForModel(model: AppModelDefinition | undefined): EffortOption[]
```

- `model` — The model to build options for, or `undefined` when unknown.

**Returns:** The selectable options (empty when the model has no effort levels).

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

#### `nativeEffortName(model, value)`

Resolve a persisted effort value to the one the model will actually use — its
exact value, a legacy `S|M|L|XL` mapped by position, the nearest native level
by rank, or the model's default. `null` when the model has no effort levels
(fixed reasoning — callers show their own "fixed" copy). Mirrors the
server-side `resolveEffortForModel` so the display always matches what the
backend sends.

```typescript
function nativeEffortName(model: AppModelDefinition | undefined, value: string | undefined): string | null
```

- `model` — The active model (or `undefined`).
- `value` — The persisted effort value (or `undefined`).

**Returns:** The resolved native value, or `null` when reasoning is fixed.

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

#### `PROVIDER_BRAND_COLORS`

Brand colors keyed by provider ID. Used as accent colors in picker rows.

```typescript
const PROVIDER_BRAND_COLORS: Readonly<Record<AIProviderID, string>>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-http` ^1.0.0

### Runtime Dependencies

- `@molecule/app-http`

- **The server side is `@molecule/api-resource-ai-models`** — it serves the
  auth-gated `GET /ai/models` route this loader calls. Without that resource (or
  an equivalent route returning `ListAIModelsResponse`), `loadAIModels` fails.
  The route is session-gated: fetch with the app's authenticated HTTP client.
- `loadAIModels` does NOT cache — call it once and keep the result (the
  framework hook does this for you). Use `pickFreeTierModel` /
  `partitionByDeprecation` instead of re-deriving tier/deprecation logic;
  `disabled` models must never surface in a picker.
