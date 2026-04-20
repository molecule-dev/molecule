/**
 * OpenAI implementation of AIImageGenerationProvider.
 *
 * Uses the OpenAI Images API to generate and edit images via
 * DALL-E 3 and gpt-image-1 models.
 *
 * @module
 */

import type {
  AIImageGenerationProvider,
  GeneratedImage,
  ImageEditParams,
  ImageGenerateParams,
  ImageGenerationResult,
} from '@molecule/api-ai-image-generation'

import type { OpenaiImageGenerationConfig } from './types.js'

/** Shape of a single image object in the OpenAI Images API response. */
interface OpenAIImageObject {
  url?: string
  b64_json?: string
  revised_prompt?: string
}

/** Shape of the OpenAI Images API response. */
interface OpenAIImagesResponse {
  created: number
  data: OpenAIImageObject[]
}

/** Shape of an OpenAI API error response. */
interface OpenAIErrorResponse {
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

/**
 * Maps the provider-agnostic `ImageResponseFormat` to the OpenAI API's `output_format` values.
 * DALL-E 3 uses `response_format` with 'url' | 'b64_json'.
 * gpt-image-1 uses `output_format` with 'png' | 'jpeg' | 'webp' and always returns base64.
 *
 * @param responseFormat - The provider-agnostic format.
 * @param model - The model being used.
 * @returns The API parameter name and value to use.
 */
function mapResponseFormat(
  responseFormat: string | undefined,
  model: string,
): Record<string, string> {
  if (model.startsWith('gpt-image')) {
    // gpt-image-1 always returns base64; output_format controls the image encoding
    return { output_format: 'png' }
  }
  // DALL-E models use response_format
  if (responseFormat === 'base64') {
    return { response_format: 'b64_json' }
  }
  return { response_format: 'url' }
}

/**
 * OpenAI image generation provider that implements the `AIImageGenerationProvider`
 * interface using the OpenAI Images API with support for DALL-E 3 and gpt-image-1.
 */
class OpenaiImageGenerationProvider implements AIImageGenerationProvider {
  readonly name = 'openai'
  private apiKey: string
  private defaultModel: string
  private baseUrl: string
  private defaultSize: string
  private defaultQuality: string

  /**
   * Creates a new OpenAI image generation provider.
   *
   * @param config - Provider configuration. API key defaults to OPENAI_API_KEY env var.
   */
  constructor(config: OpenaiImageGenerationConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.OPENAI_API_KEY ?? ''
    this.defaultModel = config.defaultModel ?? 'gpt-image-1'
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com'
    this.defaultSize = config.defaultSize ?? '1024x1024'
    this.defaultQuality = config.defaultQuality ?? 'auto'
  }

  /**
   * Generate images from a text prompt via the OpenAI Images API.
   *
   * @param params - Generation parameters including prompt, model, size, quality, and style.
   * @returns Generated image(s) with optional revised prompts.
   */
  async generate(params: ImageGenerateParams): Promise<ImageGenerationResult> {
    const model = params.model ?? this.defaultModel
    const body: Record<string, unknown> = {
      model,
      prompt: params.prompt,
      n: params.n ?? 1,
      size: params.size ?? this.defaultSize,
      ...mapResponseFormat(params.responseFormat, model),
    }

    if (params.quality) {
      body.quality = params.quality
    } else {
      body.quality = this.defaultQuality
    }

    if (params.style) {
      body.style = params.style
    }

    const data = await this.callJsonApi('/v1/images/generations', body)

    return {
      images: data.data.map(mapImage),
      model,
    }
  }

  /**
   * Edit an existing image using a text prompt and optional mask
   * via the OpenAI Images Edits API.
   *
   * Uses multipart/form-data since the API expects file uploads.
   *
   * @param params - Edit parameters including source image, prompt, and optional mask.
   * @returns Edited image(s) with metadata.
   */
  async edit(params: ImageEditParams): Promise<ImageGenerationResult> {
    const model = params.model ?? this.defaultModel

    const formData = new FormData()
    formData.append('model', model)
    formData.append('prompt', params.prompt)

    if (params.n !== undefined) {
      formData.append('n', String(params.n))
    }
    if (params.size) {
      formData.append('size', params.size)
    }

    // Append image as a file Blob
    const imageBlob = toBlob(params.image)
    formData.append('image', imageBlob, 'image.png')

    if (params.mask) {
      const maskBlob = toBlob(params.mask)
      formData.append('mask', maskBlob, 'mask.png')
    }

    const data = await this.callFormApi('/v1/images/edits', formData)

    return {
      images: data.data.map(mapImage),
      model,
    }
  }

  /**
   * Makes a JSON API call to an OpenAI Images endpoint with retry logic.
   *
   * @param path - API endpoint path (e.g. '/v1/images/generations').
   * @param body - Request body object.
   * @returns Parsed API response.
   */
  private async callJsonApi(
    path: string,
    body: Record<string, unknown>,
  ): Promise<OpenAIImagesResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    }

    return this.callWithRetry(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  }

  /**
   * Makes a multipart form-data API call to an OpenAI Images endpoint with retry logic.
   *
   * @param path - API endpoint path (e.g. '/v1/images/edits').
   * @param formData - FormData object with image uploads.
   * @returns Parsed API response.
   */
  private async callFormApi(path: string, formData: FormData): Promise<OpenAIImagesResponse> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    }

    return this.callWithRetry(path, {
      method: 'POST',
      headers,
      body: formData,
    })
  }

  /**
   * Executes a fetch request with exponential backoff retry for
   * rate-limit (429) and server error (500, 503, 529) responses.
   *
   * @param path - API endpoint path.
   * @param init - Fetch RequestInit options.
   * @returns Parsed API response.
   * @throws {Error} on non-retryable API errors or after exhausting retries.
   */
  private async callWithRetry(path: string, init: RequestInit): Promise<OpenAIImagesResponse> {
    const MAX_RETRIES = 3
    let response: Response | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(`${this.baseUrl}${path}`, init)

      if (response.status === 429 || response.status === 503 || response.status === 529) {
        if (attempt < MAX_RETRIES) {
          const retryAfter = response.headers.get('retry-after')
          const delayMs = retryAfter
            ? Math.min(parseInt(retryAfter, 10) * 1000, 60_000)
            : Math.min(1000 * 2 ** attempt, 30_000)
          await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
          continue
        }
      }
      break
    }

    if (!response!.ok) {
      const errorBody = await response!.text()
      let detail = `HTTP ${response!.status}`
      try {
        const parsed = JSON.parse(errorBody) as OpenAIErrorResponse
        if (parsed.error?.message) detail = parsed.error.message
      } catch {
        if (errorBody.length > 0 && errorBody.length < 200) detail = errorBody
      }

      throw new Error(`OpenAI Images API error: ${detail}`)
    }

    return (await response!.json()) as OpenAIImagesResponse
  }
}

/**
 * Converts a Buffer or base64 string to a Blob suitable for FormData upload.
 *
 * @param input - Buffer or base64-encoded string.
 * @returns A Blob with image/png content type.
 */
function toBlob(input: Buffer | string): Blob {
  const buf = typeof input === 'string' ? Buffer.from(input, 'base64') : input
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  return new Blob([ab], { type: 'image/png' })
}

/**
 * Maps an OpenAI image response object to the provider-agnostic GeneratedImage type.
 *
 * @param item - OpenAI image response object.
 * @returns A normalized GeneratedImage.
 */
function mapImage(item: OpenAIImageObject): GeneratedImage {
  const result: GeneratedImage = {}
  if (item.url) result.url = item.url
  if (item.b64_json) result.base64 = item.b64_json
  if (item.revised_prompt) result.revisedPrompt = item.revised_prompt
  return result
}

/**
 * Creates an OpenAI image generation provider instance.
 *
 * @param config - OpenAI-specific configuration (API key, model, base URL, size, quality).
 * @returns An `AIImageGenerationProvider` backed by the OpenAI Images API.
 */
export function createProvider(config?: OpenaiImageGenerationConfig): AIImageGenerationProvider {
  return new OpenaiImageGenerationProvider(config)
}
