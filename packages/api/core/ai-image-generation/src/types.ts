/**
 * AIImageGeneration provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-image-generation implementation.
 *
 * @module
 */

/**
 * Supported output image formats.
 */
export type ImageOutputFormat = 'png' | 'jpeg' | 'webp'

/**
 * Parameters for text-to-image generation.
 */
export interface GenerateImageParams {
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

/**
 * Parameters for image-to-image transformation.
 */
export interface ImageToImageParams extends GenerateImageParams {
  /** The source image as a Buffer or base64-encoded string. */
  image: Buffer | string
  /** How much to transform the source image (0.0 = no change, 1.0 = full generation). */
  strength?: number
}

/**
 * Parameters for image upscaling.
 */
export interface UpscaleImageParams {
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

/**
 * A single generated image result.
 */
export interface GeneratedImage {
  /** The image data as a Buffer. */
  data: Buffer
  /** The MIME type of the image (e.g. 'image/png'). */
  mimeType: string
  /** The seed used to generate this image, for reproducibility. */
  seed?: number
  /** Base64-encoded image data, if requested. */
  base64?: string
}

/**
 * Result of an image generation request.
 */
export interface ImageGenerationResult {
  /** The generated images. */
  images: GeneratedImage[]
  /** The model that produced the images. */
  model: string
}

/**
 * AIImageGeneration provider interface.
 *
 * Providers generate images from text prompts, transform existing images,
 * and perform upscaling operations.
 */
export interface AIImageGenerationProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Generate images from a text prompt.
   *
   * @param params - Generation parameters including prompt, dimensions, and model.
   * @returns Generated images with metadata.
   */
  generate(params: GenerateImageParams): Promise<ImageGenerationResult>

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

/**
 * Base configuration for image generation providers.
 */
export interface AIImageGenerationConfig {
  /** API key for the image generation service. */
  apiKey?: string
  /** Default model to use. */
  defaultModel?: string
  /** Base URL override (for proxies or self-hosted endpoints). */
  baseUrl?: string
  /** Additional provider-specific options. */
  [key: string]: unknown
}
