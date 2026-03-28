/**
 * AIImageGeneration provider interface.
 *
 * Defines the contract for image generation providers (DALL-E, Stability AI, etc.).
 * Bond packages implement this interface to provide concrete implementations.
 *
 * @module
 */

/**
 * Format of the generated image data returned by the provider.
 */
export type ImageResponseFormat = 'url' | 'base64'

/**
 * Parameters for generating images from a text prompt.
 */
export interface ImageGenerateParams {
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

/**
 * Parameters for editing an existing image with a text prompt.
 */
export interface ImageEditParams {
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

/**
 * A single generated or edited image.
 */
export interface GeneratedImage {
  /** URL of the generated image (when responseFormat is 'url'). */
  url?: string
  /** Base64-encoded image data (when responseFormat is 'base64'). */
  base64?: string
  /** The prompt after provider revision (some providers rewrite prompts for safety/quality). */
  revisedPrompt?: string
}

/**
 * Result of an image generation or edit request.
 */
export interface ImageGenerationResult {
  /** The generated images. */
  images: GeneratedImage[]
  /** Model that produced the images. */
  model: string
}

/**
 * AIImageGeneration provider interface.
 *
 * Providers generate images from text prompts and optionally support
 * editing existing images with text-guided inpainting.
 */
export interface AIImageGenerationProvider {
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
   * Edit an existing image using a text prompt and optional mask.
   * Not all providers support this operation.
   *
   * @param params - Edit parameters including source image, prompt, and optional mask.
   * @returns Edited image(s) with metadata.
   */
  edit?(params: ImageEditParams): Promise<ImageGenerationResult>
}

/**
 * Base configuration for image generation providers.
 */
export interface AIImageGenerationConfig {
  /** API key for the image generation service. */
  apiKey?: string
  /** Default model to use for generation. */
  defaultModel?: string
  /** Base URL override (for proxies or self-hosted endpoints). */
  baseUrl?: string
  /** Additional provider-specific options. */
  [key: string]: unknown
}
