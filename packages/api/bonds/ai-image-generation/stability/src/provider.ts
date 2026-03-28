/**
 * Stability AI implementation of AIImageGenerationProvider.
 *
 * Wraps the Stability AI REST API to provide text-to-image generation,
 * image-to-image transformation, and image upscaling via Stable Diffusion 3,
 * Stable Image Core, and Stable Image Ultra models.
 *
 * @module
 */

import type {
  AIImageGenerationProvider,
  GenerateImageParams,
  GeneratedImage,
  ImageGenerationResult,
  ImageToImageParams,
  UpscaleImageParams,
} from '@molecule/api-ai-image-generation'

import type { StabilityConfig } from './types.js'

/** Models that use the SD3 generation endpoint. */
const SD3_MODELS = new Set(['sd3.5-large', 'sd3.5-large-turbo', 'sd3.5-medium', 'sd3-large', 'sd3-large-turbo', 'sd3-medium'])

/** Models that use the Stable Image Core endpoint. */
const CORE_MODELS = new Set(['core'])

/** Models that use the Stable Image Ultra endpoint. */
const ULTRA_MODELS = new Set(['ultra'])

/** Default generation model. */
const DEFAULT_MODEL = 'sd3.5-large'

/** Default API base URL. */
const DEFAULT_BASE_URL = 'https://api.stability.ai'

/** Retryable HTTP status codes. */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 529])

/**
 * Stability AI image generation provider.
 *
 * Supports Stable Diffusion 3 (sd3.5-large, sd3.5-medium, sd3-large, etc.),
 * Stable Image Core, and Stable Image Ultra models via the Stability AI REST API.
 */
export class StabilityAIProvider implements AIImageGenerationProvider {
  /** @inheritdoc */
  readonly name = 'stability'

  private readonly apiKey: string
  private readonly defaultModel: string
  private readonly baseUrl: string
  private readonly maxRetries: number

  /**
   * Create a new Stability AI provider.
   *
   * @param config - Provider configuration. API key defaults to STABILITY_API_KEY env var.
   */
  constructor(config: StabilityConfig = {}) {
    const apiKey = config.apiKey ?? process.env['STABILITY_API_KEY']
    if (!apiKey) {
      throw new Error('Stability AI API key is required. Set STABILITY_API_KEY or pass apiKey in config.')
    }
    this.apiKey = apiKey
    this.defaultModel = config.defaultModel ?? DEFAULT_MODEL
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
    this.maxRetries = config.maxRetries ?? 3
  }

  /**
   * Generate images from a text prompt using the Stability AI API.
   *
   * @param params - Generation parameters.
   * @returns Generated images with metadata.
   */
  async generate(params: GenerateImageParams): Promise<ImageGenerationResult> {
    const model = params.model ?? this.defaultModel
    const endpoint = this.getGenerateEndpoint(model)

    const outputFormat = params.outputFormat ?? 'png'
    const images: GeneratedImage[] = []
    const count = params.count ?? 1

    for (let i = 0; i < count; i++) {
      const form = new FormData()
      form.append('prompt', params.prompt)

      if (params.negativePrompt) {
        form.append('negative_prompt', params.negativePrompt)
      }

      if (SD3_MODELS.has(model)) {
        form.append('model', model)
      }

      this.appendDimensionParams(form, params, model)

      if (params.seed !== undefined) {
        form.append('seed', String(params.seed + i))
      }

      if (params.guidanceScale !== undefined) {
        form.append('cfg_scale', String(params.guidanceScale))
      }

      if (params.steps !== undefined && SD3_MODELS.has(model)) {
        form.append('steps', String(params.steps))
      }

      if (params.stylePreset && !SD3_MODELS.has(model)) {
        form.append('style_preset', params.stylePreset)
      }

      form.append('output_format', outputFormat)

      const response = await this.sendRequest(endpoint, form)
      images.push(this.parseImageResponse(response, outputFormat))
    }

    return { images, model }
  }

  /**
   * Transform an existing image guided by a text prompt.
   *
   * @param params - Image-to-image parameters.
   * @returns Transformed images with metadata.
   */
  async imageToImage(params: ImageToImageParams): Promise<ImageGenerationResult> {
    const model = params.model ?? this.defaultModel
    const endpoint = `${this.baseUrl}/v2beta/stable-image/generate/sd3`

    const imageBuffer = typeof params.image === 'string'
      ? Buffer.from(params.image, 'base64')
      : params.image
    const outputFormat = params.outputFormat ?? 'png'
    const images: GeneratedImage[] = []
    const count = params.count ?? 1

    for (let i = 0; i < count; i++) {
      const form = new FormData()
      form.append('prompt', params.prompt)
      form.append('mode', 'image-to-image')
      form.append('image', new Blob([new Uint8Array(imageBuffer)]), 'image.png')

      if (SD3_MODELS.has(model)) {
        form.append('model', model)
      }

      if (params.strength !== undefined) {
        form.append('strength', String(params.strength))
      }

      if (params.negativePrompt) {
        form.append('negative_prompt', params.negativePrompt)
      }

      if (params.seed !== undefined) {
        form.append('seed', String(params.seed + i))
      }

      form.append('output_format', outputFormat)

      const response = await this.sendRequest(endpoint, form)
      images.push(this.parseImageResponse(response, outputFormat))
    }

    return { images, model }
  }

  /**
   * Upscale an image to a higher resolution using Stability AI's conservative upscaler.
   *
   * @param params - Upscale parameters.
   * @returns Upscaled image with metadata.
   */
  async upscale(params: UpscaleImageParams): Promise<ImageGenerationResult> {
    const endpoint = `${this.baseUrl}/v2beta/stable-image/upscale/conservative`

    const form = new FormData()

    const imageBuffer = typeof params.image === 'string'
      ? Buffer.from(params.image, 'base64')
      : params.image
    form.append('image', new Blob([new Uint8Array(imageBuffer)]), 'image.png')

    if (params.prompt) {
      form.append('prompt', params.prompt)
    }

    if (params.width) {
      form.append('width', String(params.width))
    }
    if (params.height) {
      form.append('height', String(params.height))
    }

    const outputFormat = params.outputFormat ?? 'png'
    form.append('output_format', outputFormat)

    const response = await this.sendRequest(endpoint, form)
    const image = this.parseImageResponse(response, outputFormat)

    return { images: [image], model: 'upscale-conservative' }
  }

  /**
   * Determine the generation endpoint URL for a given model.
   *
   * @param model - The model identifier.
   * @returns The full endpoint URL.
   */
  private getGenerateEndpoint(model: string): string {
    if (ULTRA_MODELS.has(model)) {
      return `${this.baseUrl}/v2beta/stable-image/generate/ultra`
    }
    if (CORE_MODELS.has(model)) {
      return `${this.baseUrl}/v2beta/stable-image/generate/core`
    }
    return `${this.baseUrl}/v2beta/stable-image/generate/sd3`
  }

  /**
   * Append width/height or aspect_ratio to the form data depending on the model.
   *
   * @param form - The FormData to append to.
   * @param params - The generation params.
   * @param model - The model being used.
   */
  private appendDimensionParams(form: FormData, params: GenerateImageParams, model: string): void {
    if (params.aspectRatio) {
      form.append('aspect_ratio', params.aspectRatio)
    } else if (params.width || params.height) {
      if (CORE_MODELS.has(model) || ULTRA_MODELS.has(model)) {
        const ratio = this.dimensionsToAspectRatio(params.width ?? 1024, params.height ?? 1024)
        form.append('aspect_ratio', ratio)
      } else {
        if (params.width) form.append('width', String(params.width))
        if (params.height) form.append('height', String(params.height))
      }
    }
  }

  /**
   * Convert pixel dimensions to the closest supported aspect ratio string.
   *
   * @param width - Image width in pixels.
   * @param height - Image height in pixels.
   * @returns An aspect ratio string (e.g. '16:9').
   */
  private dimensionsToAspectRatio(width: number, height: number): string {
    const ratio = width / height
    const supported: [string, number][] = [
      ['1:1', 1],
      ['16:9', 16 / 9],
      ['9:16', 9 / 16],
      ['21:9', 21 / 9],
      ['9:21', 9 / 21],
      ['2:3', 2 / 3],
      ['3:2', 3 / 2],
      ['4:5', 4 / 5],
      ['5:4', 5 / 4],
    ]
    let closest = '1:1'
    let closestDiff = Infinity
    for (const [name, value] of supported) {
      const diff = Math.abs(ratio - value)
      if (diff < closestDiff) {
        closestDiff = diff
        closest = name
      }
    }
    return closest
  }

  /**
   * Parse the raw API response into a GeneratedImage.
   *
   * @param response - The API response body as a Buffer.
   * @param outputFormat - The requested output format.
   * @returns A parsed GeneratedImage.
   */
  private parseImageResponse(response: StabilityResponse, outputFormat: string): GeneratedImage {
    const mimeType = `image/${outputFormat === 'jpeg' ? 'jpeg' : outputFormat}`

    if (response.image) {
      const data = Buffer.from(response.image, 'base64')
      return { data, mimeType, base64: response.image, seed: response.seed }
    }

    if (response.data) {
      return { data: response.data, mimeType, seed: response.seed }
    }

    throw new Error('Stability AI returned an unexpected response format.')
  }

  /**
   * Send a request to the Stability AI API with retry logic.
   *
   * @param endpoint - The API endpoint URL.
   * @param form - The multipart form data to send.
   * @returns The parsed response.
   */
  private async sendRequest(endpoint: string, form: FormData): Promise<StabilityResponse> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.getRetryDelay(attempt, lastError)
        await this.sleep(delay)
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
        body: form,
      })

      if (response.ok) {
        const contentType = response.headers.get('content-type') ?? ''

        if (contentType.includes('application/json')) {
          const json = await response.json() as StabilityJsonResponse
          return { image: json.image, seed: json.seed }
        }

        const data = Buffer.from(await response.arrayBuffer())
        const seed = response.headers.get('x-seed')
        return { data, seed: seed ? Number(seed) : undefined }
      }

      if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === this.maxRetries) {
        let message: string
        try {
          const errorBody = await response.json() as { message?: string; name?: string }
          message = errorBody.message ?? errorBody.name ?? response.statusText
        } catch {
          message = response.statusText
        }
        throw new Error(`Stability AI API error (${response.status}): ${message}`)
      }

      const retryAfter = response.headers.get('retry-after')
      lastError = new RetryableError(response.status, retryAfter)
    }

    throw lastError ?? new Error('Stability AI API request failed after retries.')
  }

  /**
   * Calculate retry delay with exponential backoff.
   *
   * @param attempt - The current retry attempt number (1-based).
   * @param error - The previous error, if any.
   * @returns Delay in milliseconds.
   */
  private getRetryDelay(attempt: number, error: Error | null): number {
    if (error instanceof RetryableError && error.retryAfter) {
      const seconds = Number(error.retryAfter)
      if (!Number.isNaN(seconds)) {
        return seconds * 1000
      }
    }
    return Math.min(1000 * 2 ** (attempt - 1), 30_000)
  }

  /**
   * Sleep for a given number of milliseconds.
   *
   * @param ms - Milliseconds to sleep.
   * @returns A promise that resolves after the delay.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Internal error class for retryable failures.
 */
class RetryableError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter: string | null,
  ) {
    super(`Retryable error (${status})`)
  }
}

/**
 * Shape of a parsed Stability AI API response.
 */
interface StabilityResponse {
  /** Base64-encoded image data (JSON response format). */
  image?: string
  /** Raw image data (binary response format). */
  data?: Buffer
  /** Generation seed. */
  seed?: number
}

/**
 * Shape of a Stability AI JSON API response body.
 */
interface StabilityJsonResponse {
  /** Base64-encoded image data. */
  image?: string
  /** The seed used for generation. */
  seed?: number
  /** Finish reason from the API. */
  finish_reason?: string
}

/**
 * Create a Stability AI image generation provider.
 *
 * @param config - Provider configuration. API key defaults to STABILITY_API_KEY env var.
 * @returns A configured StabilityAIProvider instance.
 */
export function createProvider(config?: StabilityConfig): StabilityAIProvider {
  return new StabilityAIProvider(config)
}
