# @molecule/api-ai-image-generation-stability

Stability AI image generation provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-image-generation-stability @molecule/api-ai-image-generation @molecule/api-secrets
```

## API

### Interfaces

#### `StabilityConfig`

Configuration for the Stability AI image generation provider.

```typescript
interface StabilityConfig {
  /** Stability AI API key. Defaults to STABILITY_API_KEY env var. */
  apiKey?: string
  /** Default generation model. Defaults to 'sd3.5-large'. */
  defaultModel?: string
  /** Base URL for the Stability AI API. Defaults to 'https://api.stability.ai'. */
  baseUrl?: string
  /** Maximum number of retry attempts for transient failures. Defaults to 3. */
  maxRetries?: number
}
```

### Classes

#### `StabilityAIProvider`

Stability AI image generation provider.

Supports Stable Diffusion 3 (sd3.5-large, sd3.5-medium, sd3-large, etc.),
Stable Image Core, and Stable Image Ultra models via the Stability AI REST API.

### Functions

#### `createProvider(config)`

Create a Stability AI image generation provider.

```typescript
function createProvider(config?: StabilityConfig): StabilityAIProvider
```

- `config` — Provider configuration. API key defaults to STABILITY_API_KEY env var.

**Returns:** A configured StabilityAIProvider instance.

### Constants

#### `aiImageGenerationStabilitySecretDefinitions`

Secret definitions required by the Stability AI image generation bond.

```typescript
const aiImageGenerationStabilitySecretDefinitions: SecretDefinition[]
```

#### `provider`

The provider implementation.

```typescript
const provider: AIImageGenerationProvider
```

## Core Interface
Implements `@molecule/api-ai-image-generation` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-ai-image-generation'
import { provider } from '@molecule/api-ai-image-generation-stability'

export function setupAiImageGenerationStability(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-image-generation` >=1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `STABILITY_API_KEY` *(required)* — Stability AI API key
  - Setup: Create an API key under Account → API keys on the Stability platform.
  - Get it here: [https://platform.stability.ai/account/keys](https://platform.stability.ai/account/keys)
  - Example: `sk-...`

### Runtime Dependencies

- `@molecule/api-ai-image-generation`
- `@molecule/api-secrets`
