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
  /** Input price per million tokens in USD. */
  inputPricePerMTok: number
  /** Output price per million tokens in USD. */
  outputPricePerMTok: number
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

### Functions

#### `getAvailableModels(availableProviders)`

Get models that are currently usable — filtered to only providers that are available.

The caller passes in which provider IDs are active (i.e. have a bond wired).

```typescript
function getAvailableModels(availableProviders: ReadonlySet<AIProviderID> | readonly AIProviderID[]): readonly ModelDefinition[]
```

- `availableProviders` — Set or array of provider IDs that have active bonds.

**Returns:** Models whose provider is in the available set.

#### `getModel(id)`

Look up a model definition by ID.

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

Set of valid model IDs for fast validation.

```typescript
const MODEL_IDS: ReadonlySet<string>
```

#### `MODELS`

All available AI models, grouped by provider, ordered from most to least capable.

To add or remove a model, edit this array. Both the server-side validation
and the public discovery endpoint will update automatically.

Sources (verified 2026-03-16):
- Anthropic: https://platform.claude.com/docs/en/docs/about-claude/models/all-models
- OpenAI: https://developers.openai.com/api/docs/models/gpt-5.4
- Google: https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview
- xAI: https://docs.x.ai/developers/models
- Meta: https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8
- Moonshot: https://openrouter.ai/moonshotai/kimi-k2.5
- MiniMax: https://openrouter.ai/minimax/minimax-m2.5
- Alibaba: https://openrouter.ai/qwen/qwen3-coder-plus
- Zhipu: https://openrouter.ai/z-ai/glm-5, https://docs.z.ai/guides/llm/glm-5

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
