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
  /** Output price per million tokens in USD. */
  outputPricePerMTok: number
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
  | 'meta'
  | 'moonshot'
  | 'minimax'
  | 'alibaba'
  | 'zhipu'
```

### Functions

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

#### `partitionByDeprecation(models, now)`

Splits a model catalog into current and deprecated entries based on each
model's `deprecatedAt` relative to `now`. Order within each partition is
preserved.

```typescript
function partitionByDeprecation(models: readonly AppModelDefinition[], now?: string): { current: AppModelDefinition[]; deprecated: AppModelDefinition[]; }
```

- `models` — Loaded model catalog.
- `now` — Today's date as YYYY-MM-DD. Defaults to the current UTC date.

**Returns:** Object with `current` and `deprecated` arrays.

#### `pickFreeTierModel(models)`

Returns the free-tier model from a list, or `undefined` if none is marked.

```typescript
function pickFreeTierModel(models: readonly AppModelDefinition[]): AppModelDefinition | undefined
```

- `models` — Loaded model catalog.

**Returns:** The single model with `freeTier: true`, or `undefined`.

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
