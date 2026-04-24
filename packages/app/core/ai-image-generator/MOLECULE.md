# @molecule/app-ai-image-generator

ai-image-generator core interface for molecule.dev.

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
