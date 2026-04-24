# @molecule/api-ai-image-generation-openai

Openai ai-image-generation-openai provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-image-generation-openai
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
  /** Default quality level. Defaults to 'auto'. */
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-image-generation` >=1.0.0
