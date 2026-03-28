/**
 * AIImageGeneration provider interface.
 *
 * Defines the contract for image generation providers (DALL-E, Stability AI, etc.).
 * Bond packages implement this interface to provide concrete implementations.
 *
 * @module
 */

/**
<<<<<<< HEAD
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
=======
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
>>>>>>> stub-imggen-stability
 */
export interface ImageGenerationResult {
  /** The generated images. */
  images: GeneratedImage[]
<<<<<<< HEAD
  /** Model that produced the images. */
=======
  /** The model that produced the images. */
>>>>>>> stub-imggen-stability
  model: string
}

/**
 * AIImageGeneration provider interface.
 *
<<<<<<< HEAD
 * Providers generate images from text prompts and optionally support
 * editing existing images with text-guided inpainting.
=======
 * Providers generate images from text prompts, transform existing images,
 * and perform upscaling operations.
>>>>>>> stub-imggen-stability
 */
export interface AIImageGenerationProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Generate images from a text prompt.
   *
<<<<<<< HEAD
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
=======
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
>>>>>>> stub-imggen-stability
}

/**
 * Base configuration for image generation providers.
 */
export interface AIImageGenerationConfig {
  /** API key for the image generation service. */
  apiKey?: string
<<<<<<< HEAD
  /** Default model to use for generation. */
=======
  /** Default model to use. */
>>>>>>> stub-imggen-stability
  defaultModel?: string
  /** Base URL override (for proxies or self-hosted endpoints). */
  baseUrl?: string
  /** Additional provider-specific options. */
  [key: string]: unknown
}
