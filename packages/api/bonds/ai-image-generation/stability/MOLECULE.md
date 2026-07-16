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

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Entering a prompt in the UI and submitting produces a REAL rendered
  image in the live preview — not a broken img (image icon / alt text), a
  grey placeholder, or an error toast. Confirm the `img` element actually
  decoded (its `naturalWidth`/`naturalHeight` are non-zero) and the picture
  visibly reflects the prompt (a "red bicycle" prompt shows a red bicycle).
- [ ] Two different prompts produce two visibly different images — a fixed
  stub, or a cached first result that never changes, is a broken integration.
- [ ] The image is STORED AND SERVED FROM THE APP'S OWN ORIGIN: the rendered
  `img` `src` (and any saved record) points at the app's uploads/storage, not
  the provider's temporary URL. Provider `url` results expire — reload the
  page (or revisit the record later) and the image must still load. Download
  the provider result server-side and persist it (uploads bond); never
  hotlink the provider URL — it 404s later and can leak the API request
  context. (`base64`/`data` results must likewise be saved, not held only in
  the response.)
- [ ] Any exposed generation options take effect: changing size/dimensions
  yields a differently-sized image; requesting a count (`n`) of N renders N
  images. If the UI exposes no such options, this box is n/a — say so.
- [ ] A rejected or policy-violating prompt, or a provider/rate-limit error,
  surfaces a clear message in the UI — not a crash, a blank screen, or a
  silently-broken img. The user can recover and try another prompt.
- [ ] Generation is server-side and authorized: the provider API key never
  reaches the browser (check the network tab / built client bundle — no key,
  no direct provider call from the page), the generate endpoint requires
  auth, and a caller cannot run unbounded costly generations through an open
  or unrate-limited route. Every image is billed.
