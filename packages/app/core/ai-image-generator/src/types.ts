/**
 * AIImageGenerator provider interface.
 *
 * Defines the contract for image generation providers. Bond packages
 * implement this interface to provide concrete image generation via
 * different backends (DALL-E, Stability AI, etc.).
 *
 * @module
 */

/** Standard image size presets supported by most generation APIs. */
export type ImageSize = '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024'

/** Output image format. */
export type ImageFormat = 'png' | 'jpeg' | 'webp'

/** Image generation quality preset. */
export type ImageQuality = 'standard' | 'hd'

/**
 * Request parameters for generating images.
 */
export interface ImageGenerationRequest {
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

/**
 * A single generated image result.
 */
export interface GeneratedImage {
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

/**
 * Configuration for image generation API requests.
 */
export interface ImageGenerationConfig {
  /** API endpoint path (e.g. `'/api/images/generate'`). */
  endpoint: string
  /** Default model to use for generation. */
  model?: string
}

/**
 * Events emitted during image generation.
 *
 * - `started` — generation request accepted by the server.
 * - `progress` — intermediate progress update (percent complete).
 * - `image` — a single generated image is ready.
 * - `done` — all images have been generated.
 * - `error` — generation failed.
 */
export type ImageGenerationEvent =
  | { type: 'started' }
  | { type: 'progress'; percent: number; message?: string }
  | { type: 'image'; image: GeneratedImage }
  | { type: 'done'; images: GeneratedImage[] }
  | { type: 'error'; message: string }

/**
 * Callback invoked for each event during image generation.
 *
 * @param event - The generation event.
 */
export type ImageGenerationEventHandler = (event: ImageGenerationEvent) => void

/**
 * Provider interface for AI image generation.
 *
 * Implement this in a bond package to provide a concrete
 * image generation backend.
 */
export interface AIImageGeneratorProvider {
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
