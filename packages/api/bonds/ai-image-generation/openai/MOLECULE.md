# @molecule/api-ai-image-generation-openai

OpenAI image-generation provider for molecule.dev (gpt-image-1 + DALL·E 3).

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-image-generation-openai @molecule/api-ai-image-generation @molecule/api-secrets
```

## API

### Interfaces

#### `OpenaiImageGenerationConfig`

Configuration for the OpenAI image generation provider.

```typescript
interface OpenaiImageGenerationConfig {
  /** OpenAI API key. Defaults to OPENAI_API_KEY env var. */
  apiKey?: string
  /** Default model for generation. Defaults to 'gpt-image-1'. */
  defaultModel?: string
  /** Base URL for the OpenAI API. Defaults to 'https://api.openai.com'. */
  baseUrl?: string
  /** Default image size. Defaults to '1024x1024'. */
  defaultSize?: string
  /**
   * Default quality level. Omitted from requests unless set — 'auto' is only
   * valid for gpt-image-1; dall-e-3 accepts 'standard' | 'hd'. When unset,
   * OpenAI applies the model-appropriate default.
   */
  defaultQuality?: string
}
```

### Functions

#### `createProvider(config)`

Creates an OpenAI image generation provider instance.

```typescript
function createProvider(config?: OpenaiImageGenerationConfig): AIImageGenerationProvider
```

- `config` — OpenAI-specific configuration (API key, model, base URL, size, quality).

**Returns:** An `AIImageGenerationProvider` backed by the OpenAI Images API.

### Constants

#### `aiImageGenerationOpenaiSecretDefinitions`

Secret definitions required by the OpenAI image generation bond.

```typescript
const aiImageGenerationOpenaiSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-ai-image-generation` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-image-generation` >=1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `OPENAI_API_KEY` *(required)* — OpenAI API key
  - Setup: Create a secret key on the OpenAI platform (API keys page).
  - Get it here: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
  - Example: `sk-proj-...`

### Runtime Dependencies

- `@molecule/api-ai-image-generation`
- `@molecule/api-secrets`

This bond exports `createProvider()` ONLY — there is no eager `provider`
const (unlike sibling bonds). Wire it with the core's
`setProvider(createProvider())` from `@molecule/api-ai-image-generation` —
NOT `bond('ai-image-generation', …)`: that core keeps its own singleton and
never reads the bond registry (see the core's docs).

Config: `OPENAI_API_KEY` (SERVER-side only; NOT fail-fast — a missing key
surfaces as the upstream 401 on first use), optional `defaultModel`
(default `gpt-image-1`), `defaultSize` (default `1024x1024`), and `baseUrl`
(`OPENAI_BASE_URL` env var, for proxies/gateways).

Size/quality quirks are normalized for you: a requested `size` outside the
active model's whitelist is mapped to the closest supported one (dall-e-3:
1024x1024 | 1024x1792 | 1792x1024; gpt-image-1: 1024x1024 | 1024x1536 |
1536x1024 | auto), and `quality` is omitted unless explicitly set — 'auto'
is only valid for gpt-image-1; dall-e-3 accepts 'standard' | 'hd'.
