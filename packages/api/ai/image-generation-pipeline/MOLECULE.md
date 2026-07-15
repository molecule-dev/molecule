# @molecule/api-ai-image-generation-pipeline

`@molecule/api-ai-image-generation-pipeline` — high-level pipeline
wrapping `@molecule/api-ai-image-generation` (vendor abstraction) with
style application, brand-model mapping, base64-to-data-URL
normalization, variation support, and chat-driven prompt enhancement.

Extracted from the ai-image-generator flagship. Use it when you need
end-to-end "user types prompt → image" semantics with graceful fallback
when no provider is bonded.

## Quick Start

```ts
import { runImageGeneration, enhancePrompt } from '@molecule/api-ai-image-generation-pipeline'

const enhanced = await enhancePrompt({ prompt: 'a cat' })
const result = await runImageGeneration({
  prompt: enhanced.text,
  size: '1024x1024',
  stylePromptModifier: 'photorealistic, golden hour lighting',
  model: 'reverie-xl-v3',
  provider: 'openai',
})
if (result.status === 'succeeded') console.log(result.imageUrl)
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-ai-image-generation-pipeline @molecule/api-ai @molecule/api-ai-image-generation
```

## API

### Interfaces

#### `EnhancePromptOptions`

Options accepted by {@link enhancePrompt}.

```typescript
interface EnhancePromptOptions {
  prompt: string
  /** AI provider name (e.g. 'anthropic'); falls back to default-bonded provider. */
  providerName?: string
  /** Override system instructions for the rewrite. */
  system?: string
  maxTokens?: number
  temperature?: number
}
```

#### `EnhancePromptResult`

Result returned by {@link enhancePrompt}.

```typescript
interface EnhancePromptResult {
  text: string
  enhanced: boolean
}
```

#### `ImageGenerationOutcome`

Normalized outcome returned by {@link runImageGeneration} for all terminal states.

```typescript
interface ImageGenerationOutcome {
  imageUrl: string | null
  revisedPrompt: string | null
  status: GenerationStatus
  error: string | null
}
```

#### `RunImageGenerationOptions`

Options accepted by {@link runImageGeneration}.

```typescript
interface RunImageGenerationOptions {
  prompt: string
  size?: string
  style?: string
  model?: string
  provider?: string
  /** Style modifier appended to the prompt before vendor dispatch. */
  stylePromptModifier?: string | null
  /** Optional brand→vendor model translation; defaults to {@link defaultResolveModel}. */
  resolveModel?: (brandModel: string | undefined, provider: string) => string | undefined
}
```

### Types

#### `GenerationStatus`

```typescript
type GenerationStatus = 'succeeded' | 'failed' | 'queued'
```

### Functions

#### `applyStyleToPrompt(prompt, modifier)`

Append a style modifier onto the user-typed prompt.

```typescript
function applyStyleToPrompt(prompt: string, modifier: string | null | undefined): string
```

#### `defaultResolveModel(brandModel, provider)`

Default brand-to-provider model mapper used by the flagship.
Override via {@link RunImageGenerationOptions.resolveModel}.

```typescript
function defaultResolveModel(brandModel: string | undefined, provider: string): string | undefined
```

#### `enhancePrompt(opts)`

Expand a short user prompt into a richer one via the bonded chat AI
provider. Returns `{ enhanced: false, text: prompt }` if no provider
is bonded or the stream errors — the endpoint stays contractually 200
so the calling UI flow remains testable without an AI key.

```typescript
function enhancePrompt(opts: EnhancePromptOptions): Promise<EnhancePromptResult>
```

#### `runImageGeneration(opts)`

Dispatch the bonded image-generation provider and normalize output.
Returns `status: 'queued'` if no provider is bonded (graceful no-op),
`status: 'failed'` with an error if the provider throws or returns no
image, and `status: 'succeeded'` with an `imageUrl` otherwise.

Base64 responses (e.g. gpt-image-1) are normalized to a `data:` URL.

```typescript
function runImageGeneration(opts: RunImageGenerationOptions): Promise<ImageGenerationOutcome>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-ai-image-generation` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-ai-image-generation`
