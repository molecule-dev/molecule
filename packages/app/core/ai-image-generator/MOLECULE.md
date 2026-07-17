# @molecule/app-ai-image-generator

AI image generation core interface for molecule.dev.

Defines the `AIImageGeneratorProvider` contract for prompt-to-image features:
`generate(request, config, onEvent)` streams progress/image/done/error events
and resolves with the generated images; `loadHistory` / `deleteImage` manage
previously generated images; `abort()` cancels an in-flight generation.

## Quick Start

```typescript
import { requireProvider, setProvider } from '@molecule/app-ai-image-generator'
import { createProvider } from '@molecule/app-ai-image-generator-default'

setProvider(createProvider()) // at startup

const generator = requireProvider()
const images = await generator.generate(
  { prompt: 'A watercolor fox', size: '1024x1024', count: 1 },
  { endpoint: '/api/images/generate' },
  (event) => {
    if (event.type === 'progress') setProgress(event.percent)
    if (event.type === 'error') showError(event.message)
  },
)
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-ai-image-generator
```

## API

### Interfaces

#### `AIImageGeneratorProvider`

Provider interface for AI image generation.

Implement this in a bond package to provide a concrete
image generation backend.

```typescript
interface AIImageGeneratorProvider {
  /** Unique name identifying this provider implementation. */
  readonly name: string

  /**
   * Generates images from a text prompt.
   *
   * @param request - The generation parameters (prompt, size, count, etc.).
   * @param config - API endpoint and model configuration.
   * @param onEvent - Callback invoked for progress, image, done, and error events.
   * @returns The array of generated images on success.
   */
  generate(
    request: ImageGenerationRequest,
    config: ImageGenerationConfig,
    onEvent: ImageGenerationEventHandler,
  ): Promise<GeneratedImage[]>

  /**
   * Aborts the current in-flight generation request, if any.
   */
  abort(): void

  /**
   * Loads previously generated images from the server.
   *
   * @param config - API endpoint configuration.
   * @returns An array of previously generated images, newest first.
   */
  loadHistory(config: ImageGenerationConfig): Promise<GeneratedImage[]>

  /**
   * Deletes a previously generated image.
   *
   * @param id - The image ID to delete.
   * @param config - API endpoint configuration.
   */
  deleteImage(id: string, config: ImageGenerationConfig): Promise<void>
}
```

#### `GeneratedImage`

A single generated image result.

```typescript
interface GeneratedImage {
  /** Unique image identifier. */
  id: string
  /** URL to the generated image (may be temporary). */
  url: string
  /** The prompt that was used to generate this image. */
  prompt: string
  /** The revised/expanded prompt the model actually used, if different. */
  revisedPrompt?: string
  /** Image width in pixels. */
  width: number
  /** Image height in pixels. */
  height: number
  /** Creation timestamp (ms since epoch). */
  createdAt: number
}
```

#### `ImageGenerationConfig`

Configuration for image generation API requests.

```typescript
interface ImageGenerationConfig {
  /** API endpoint path (e.g. `'/api/images/generate'`). */
  endpoint: string
  /** Default model to use for generation. */
  model?: string
}
```

#### `ImageGenerationRequest`

Request parameters for generating images.

```typescript
interface ImageGenerationRequest {
  /** Text description of the desired image. */
  prompt: string
  /** Text description of elements to exclude from the image. */
  negativePrompt?: string
  /** Image dimensions as a preset string. */
  size?: ImageSize
  /** Number of images to generate (1–10). */
  count?: number
  /** Output image format. */
  format?: ImageFormat
  /** Quality preset. */
  quality?: ImageQuality
  /** Optional model identifier override. */
  model?: string
  /** Optional style preset (e.g. `'vivid'`, `'natural'`). */
  style?: string
}
```

### Types

#### `ImageFormat`

Output image format.

```typescript
type ImageFormat = 'png' | 'jpeg' | 'webp'
```

#### `ImageGenerationEvent`

Events emitted during image generation.

- `started` — generation request accepted by the server.
- `progress` — intermediate progress update (percent complete).
- `image` — a single generated image is ready.
- `done` — all images have been generated.
- `error` — generation failed.

```typescript
type ImageGenerationEvent =
  | { type: 'started' }
  | { type: 'progress'; percent: number; message?: string }
  | { type: 'image'; image: GeneratedImage }
  | { type: 'done'; images: GeneratedImage[] }
  | { type: 'error'; message: string }
```

#### `ImageGenerationEventHandler`

Callback invoked for each event during image generation.

```typescript
type ImageGenerationEventHandler = (event: ImageGenerationEvent) => void
```

#### `ImageQuality`

Image generation quality preset.

```typescript
type ImageQuality = 'standard' | 'hd'
```

#### `ImageSize`

Standard image size presets supported by most generation APIs.

```typescript
type ImageSize = '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024'
```

### Functions

#### `getProvider()`

Returns the bonded image generator provider, or `null` if none is set.

```typescript
function getProvider(): AIImageGeneratorProvider | null
```

**Returns:** The active provider or `null`.

#### `hasProvider()`

Checks whether an image generator provider has been bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a provider is configured.

#### `requireProvider()`

Returns the bonded image generator provider or throws if none is configured.

```typescript
function requireProvider(): AIImageGeneratorProvider
```

**Returns:** The active provider.

#### `setProvider(provider)`

Registers the active image generator provider.

```typescript
function setProvider(provider: AIImageGeneratorProvider): void
```

- `provider` — The provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Ai Image Generator | `@molecule/app-ai-image-generator-default` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

- **Wire it with THIS package's `setProvider()` or
  `bond('ai-image-generator', …)`.** `setProvider()` delegates into the shared
  `@molecule/app-bond` registry, so both write the same slot;
  `requireProvider()` throws until one has run.
- **Generation goes through YOUR backend** (`config.endpoint`), which calls
  the image model server-side (see `@molecule/api-ai-image-generation`) — the
  vendor key never reaches the browser.
- **`GeneratedImage.url` may be TEMPORARY** (signed/expiring upstream URLs).
  If the app keeps a gallery, have the server download and persist the bytes
  (e.g. via the uploads package) and store YOUR url — storing the returned
  url alone ships dead links.
- `count` is bounded 1–10; generation is slow — drive the UI from the
  `progress` / `image` events rather than blocking on the promise alone.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Entering a prompt and generating renders the resulting
  `GeneratedImage`(s) as real pixels on screen: the `image` / `done` events
  deliver objects whose `url` loads to a visible picture, not a broken or
  placeholder tile.
- [ ] A generating indicator shows while the request is in flight — driven
  by the `started` / `progress` (`progress.percent`) events — and clears
  when `done` fires and `generate()` resolves; it never spins forever.
- [ ] A generation failure surfaces visibly: the `error` event's `message`
  (provider failure, or a moderation-rejected prompt) renders as a message
  in the UI, never a silent no-op or a stuck spinner.
- [ ] When the request sets `count` > 1 (bounded 1–10), ALL requested images
  render — the `done` event's `images` array length matches what was asked,
  not just the first one.
- [ ] The request's `size` preset (e.g. `'1024x1024'` vs `'1792x1024'`) is
  honored in the output: the rendered image's `width` / `height` match the
  requested dimensions rather than a default square.
- [ ] The generated image is usable downstream as the app wires it
  (insert / download / select), carrying the real `GeneratedImage` data
  (`id`, `url`); because `url` may be temporary, an image kept in a gallery
  still loads after a full reload — proving the app persisted the bytes, not
  a dead upstream link.
- [ ] Generations are scoped to the requesting user: `loadHistory` / the
  gallery returns only that user's own images, and a moderation-rejected
  prompt shows the rejection rather than a blank tile.
