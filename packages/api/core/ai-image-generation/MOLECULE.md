# @molecule/api-ai-image-generation

ai-image-generation core interface for molecule.dev.

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
