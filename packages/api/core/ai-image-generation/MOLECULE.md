# @molecule/api-ai-image-generation

AI image-generation core interface for molecule.dev.

Defines the `AIImageGenerationProvider` contract — generate images from text
prompts, plus optional edit (inpainting), image-to-image, and upscale
operations — and the accessor (`setProvider`/`getProvider`/`hasProvider`/
`requireProvider`). Interface-only: bond a provider package (e.g.
`@molecule/api-ai-image-generation-openai`,
`@molecule/api-ai-image-generation-stability`).

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/api-ai-image-generation'
import { createProvider } from '@molecule/api-ai-image-generation-openai'

// Wire at startup. See the bond package for its config/env (e.g. OPENAI_API_KEY).
setProvider(createProvider())

// Use anywhere after startup.
const { images } = await requireProvider().generate({
  prompt: 'A watercolor fox reading a book',
  size: '1024x1024',
  responseFormat: 'base64',
})
// images[0] may carry url, base64, or data — handle what the bonded provider returns.
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-image-generation
```

## API

### Interfaces

#### `AIImageGenerationConfig`

Base configuration for image generation providers.

```typescript
interface AIImageGenerationConfig {
  /** API key for the image generation service. */
  apiKey?: string
  /** Default model to use for generation. */
  defaultModel?: string
  /** Base URL override (for proxies or self-hosted endpoints). */
  baseUrl?: string
  /** Additional provider-specific options. */
  [key: string]: unknown
}
```

#### `AIImageGenerationProvider`

AIImageGeneration provider interface.

Providers generate images from text prompts, edit existing images with
text-guided inpainting, transform images, and perform upscaling operations.

```typescript
interface AIImageGenerationProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Generate images from a text prompt.
   *
   * @param params - Generation parameters including prompt, model, size, and quality.
   * @returns Generated image(s) with metadata.
   */
  generate(params: ImageGenerateParams): Promise<ImageGenerationResult>

  /**
   * Generate images from a text prompt (Stability AI-style params).
   *
   * @param params - Generation parameters including prompt, dimensions, and model.
   * @returns Generated images with metadata.
   */
  generateImage?(params: GenerateImageParams): Promise<ImageGenerationResult>

  /**
   * Edit an existing image using a text prompt and optional mask.
   * Not all providers support this operation.
   *
   * @param params - Edit parameters including source image, prompt, and optional mask.
   * @returns Edited image(s) with metadata.
   */
  edit?(params: ImageEditParams): Promise<ImageGenerationResult>

  /**
   * Transform an existing image guided by a text prompt (image-to-image).
   *
   * @param params - Transformation parameters including source image, prompt, and strength.
   * @returns Transformed images with metadata.
   */
  imageToImage?(params: ImageToImageParams): Promise<ImageGenerationResult>

  /**
   * Upscale an image to a higher resolution.
   *
   * @param params - Upscaling parameters including source image and target dimensions.
   * @returns Upscaled image with metadata.
   */
  upscale?(params: UpscaleImageParams): Promise<ImageGenerationResult>
}
```

#### `GeneratedImage`

A single generated or edited image.

```typescript
interface GeneratedImage {
  /** URL of the generated image (when responseFormat is 'url'). */
  url?: string
  /** Base64-encoded image data (when responseFormat is 'base64'). */
  base64?: string
  /** The prompt after provider revision (some providers rewrite prompts for safety/quality). */
  revisedPrompt?: string
  /** The image data as a Buffer (when returned as raw data). */
  data?: Buffer
  /** The MIME type of the image (e.g. 'image/png'). */
  mimeType?: string
  /** The seed used to generate this image, for reproducibility. */
  seed?: number
}
```

#### `GenerateImageParams`

Parameters for text-to-image generation (Stability AI-style).

```typescript
interface GenerateImageParams {
  /** The text prompt describing the desired image. */
  prompt: string
  /** Negative prompt — things to exclude from the image. */
  negativePrompt?: string
  /** Model to use for generation (provider-specific). */
  model?: string
  /** Width of the generated image in pixels. */
  width?: number
  /** Height of the generated image in pixels. */
  height?: number
  /** Number of images to generate. Defaults to 1. */
  count?: number
  /** Random seed for reproducible generation. */
  seed?: number
  /** Guidance scale / CFG scale — how closely to follow the prompt. */
  guidanceScale?: number
  /** Number of inference steps. Higher = more detail, slower. */
  steps?: number
  /** Output format. Defaults to 'png'. */
  outputFormat?: ImageOutputFormat
  /** Aspect ratio as a string (e.g. '16:9', '1:1'). Alternative to width/height. */
  aspectRatio?: string
  /** Style preset (provider-specific, e.g. 'photographic', 'anime'). */
  stylePreset?: string
}
```

#### `ImageEditParams`

Parameters for editing an existing image with a text prompt.

```typescript
interface ImageEditParams {
  /** The source image to edit, as a Buffer of PNG data or a base64-encoded string. */
  image: Buffer | string
  /** Text description of the desired edits. */
  prompt: string
  /** Optional mask indicating areas to edit (white = edit, black = keep). */
  mask?: Buffer | string
  /** Model to use for editing (provider-specific). */
  model?: string
  /** Number of edited images to generate. */
  n?: number
  /** Output image size as a "widthxheight" string. */
  size?: string
  /** Format of the returned image data. */
  responseFormat?: ImageResponseFormat
}
```

#### `ImageGenerateParams`

Parameters for generating images from a text prompt.

```typescript
interface ImageGenerateParams {
  /** Text description of the desired image(s). */
  prompt: string
  /** Model to use for generation (provider-specific). */
  model?: string
  /** Number of images to generate. */
  n?: number
  /** Image size as a "widthxheight" string (e.g. "1024x1024"). */
  size?: string
  /** Quality level (provider-specific, e.g. "standard", "hd", "high"). */
  quality?: string
  /** Style preset (provider-specific, e.g. "vivid", "natural"). */
  style?: string
  /** Format of the returned image data. */
  responseFormat?: ImageResponseFormat
}
```

#### `ImageGenerationResult`

Result of an image generation or edit request.

```typescript
interface ImageGenerationResult {
  /** The generated images. */
  images: GeneratedImage[]
  /** The model that produced the images. */
  model: string
}
```

#### `ImageToImageParams`

Parameters for image-to-image transformation.

```typescript
interface ImageToImageParams extends GenerateImageParams {
  /** The source image as a Buffer or base64-encoded string. */
  image: Buffer | string
  /** How much to transform the source image (0.0 = no change, 1.0 = full generation). */
  strength?: number
}
```

#### `UpscaleImageParams`

Parameters for image upscaling.

```typescript
interface UpscaleImageParams {
  /** The source image as a Buffer or base64-encoded string. */
  image: Buffer | string
  /** The desired output width in pixels. */
  width?: number
  /** The desired output height in pixels. */
  height?: number
  /** The upscale factor (e.g. 2, 4). Alternative to explicit width/height. */
  factor?: number
  /** Prompt to guide the upscaling (if supported). */
  prompt?: string
  /** Output format. Defaults to 'png'. */
  outputFormat?: ImageOutputFormat
}
```

### Types

#### `ImageOutputFormat`

Supported output image formats.

```typescript
type ImageOutputFormat = 'png' | 'jpeg' | 'webp'
```

#### `ImageResponseFormat`

Format of the generated image data returned by the provider.

```typescript
type ImageResponseFormat = 'url' | 'base64'
```

### Functions

#### `getProvider()`

Returns the bonded AI image generation provider, or `null` if none is registered.

```typescript
function getProvider(): AIImageGenerationProvider | null
```

**Returns:** The active provider, or `null`.

#### `hasProvider()`

Returns whether an AI image generation provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a provider is bonded.

#### `requireProvider()`

Returns the bonded AI image generation provider, throwing if none is configured.

```typescript
function requireProvider(): AIImageGenerationProvider
```

**Returns:** The active provider.

#### `setProvider(provider)`

Registers the AI image generation provider singleton.

```typescript
function setProvider(provider: AIImageGenerationProvider): void
```

- `provider` — The AI image generation provider implementation to register.

## Available Providers

| Provider | Package |
|----------|---------|
| Ai Image Generation | `@molecule/api-ai-image-generation-openai` |
| Ai Image Generation | `@molecule/api-ai-image-generation-stability` |

## Injection Notes

- **Wire it with THIS package's `setProvider()` — NOT `bond('ai-image-generation', …)`.**
  This core keeps its own singleton and does not read the `@molecule/api-bond`
  registry: a generic `bond(...)` call appears to succeed, but `requireProvider()`
  still throws at first use. Call `setProvider(...)` in the app's bond setup.
- **Feature-detect the optional methods.** Only `generate()` is required;
  `edit`/`imageToImage`/`upscale`/`generateImage` are optional — guard with
  `if (provider.edit)` and surface "not supported" instead of calling
  unconditionally (an absent method is a runtime TypeError that type-checks).
- **Two param dialects exist; only `prompt` (+ `model`) is portable.** The core
  ships `ImageGenerateParams` (`size: '1024x1024'`, `quality`, `n`) AND
  Stability-style `GenerateImageParams` (`width`/`height`, `negativePrompt`,
  `count`, `steps`). A provider honors ITS dialect and silently ignores the
  other's fields — check the bonded provider's docs before relying on anything
  beyond `prompt`.
- **Handle every result shape, and persist what you must keep.** A
  `GeneratedImage` may carry `url`, `base64`, or raw `data` bytes — provider URLs
  are typically short-lived, so download and store (e.g. via the uploads bond)
  anything the app needs to keep.
- **Server-side only, gated and budgeted.** Keep the provider key on the API;
  require auth and rate-limit user-triggered generation — every image is billed.

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
