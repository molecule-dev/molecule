/**
 * vLLM-Omni implementation of AIImageGenerationProvider.
 *
 * Talks to a self-hosted vLLM-Omni server's OpenAI-compatible Images API:
 * `POST /v1/images/generations` (JSON) and `POST /v1/images/edits`
 * (multipart). Results are always base64 images — the server returns no URLs.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type {
  AIImageGenerationProvider,
  GeneratedImage,
  GenerateImageParams,
  ImageEditParams,
  ImageGenerateParams,
  ImageGenerationResult,
  ImageOutputFormat,
  ImageToImageParams,
} from '@molecule/api-ai-image-generation'
import { configNotConfiguredError } from '@molecule/api-secrets'

import {
  isQwenImage21,
  nearestQwenImage21Size,
  QWEN_IMAGE_2_1_MAX_REFERENCE_IMAGES,
  QWEN_IMAGE_2_1_MODEL,
  QWEN_IMAGE_2_1_SIZES,
} from './qwen-image.js'
import type { VllmOmniImageGenerationConfig } from './types.js'

/** Default per-request timeout: 2K diffusion runs take tens of seconds or more. */
export const DEFAULT_TIMEOUT_MS = 300_000

/** Shape of a single image object in a vLLM-Omni Images API response. */
interface VllmOmniImageObject {
  b64_json?: string | null
  url?: string | null
  revised_prompt?: string | null
}

/** Shape of a vLLM-Omni Images API response. */
interface VllmOmniImagesResponse {
  created?: number
  data?: VllmOmniImageObject[]
}

/**
 * Error thrown when the vLLM-Omni server refuses or fails a request. Carries
 * the server's HTTP `status` (0 when the server could not be reached or timed
 * out) and its error code when it sent one. Deliberately NOT tagged with
 * `statusCode`/`errorKey`, so API middleware answers its generic 500 instead
 * of echoing the upstream status to the caller.
 */
export class VllmOmniImageError extends Error {
  /** HTTP status from the vLLM-Omni server; 0 for a network failure or timeout. */
  readonly status: number
  /** Error code or type from the server's error body, when present. */
  readonly code: string | undefined

  /**
   * Create the error.
   *
   * @param message - Human-readable message.
   * @param status - HTTP status (0 for network failure/timeout).
   * @param code - Server error code, when it sent one.
   * @param cause - The underlying error, if any.
   */
  constructor(message: string, status: number, code?: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'VllmOmniImageError'
    this.status = status
    this.code = code
  }
}

/** Resolved per-call configuration. */
interface ResolvedConfig {
  baseUrl: string
  apiKey: string | undefined
  defaultModel: string
  timeoutMs: number
}

/**
 * Normalizes a server base URL: strips trailing slashes and a trailing `/v1`
 * (the bond appends `/v1/images/...` itself).
 *
 * @param raw - The configured base URL.
 * @returns The base URL without trailing slashes or `/v1`.
 */
function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '').replace(/\/v1$/, '')
}

/**
 * Picks the size to send: Qwen-Image-2.1 sizes are snapped to the nearest
 * native 2K size; other models get the requested size unchanged.
 *
 * @param size - Requested size, if any.
 * @param model - Model id being targeted.
 * @returns The size to send, or `undefined` to let the server choose.
 */
function resolveSize(size: string | undefined, model: string): string | undefined {
  if (!size) return undefined
  return isQwenImage21(model) ? nearestQwenImage21Size(size) : size
}

/**
 * Builds a size from Stability-style params: explicit width/height win, then
 * an aspect ratio (Qwen-Image-2.1 only — other models have no known native
 * size table, so their aspect ratio is ignored).
 *
 * @param params - Width/height/aspectRatio from the caller.
 * @param model - Model id being targeted.
 * @returns The size to send, or `undefined` to let the server choose.
 */
function sizeFromDimensions(
  params: Pick<GenerateImageParams, 'width' | 'height' | 'aspectRatio'>,
  model: string,
): string | undefined {
  if (params.width && params.height) return resolveSize(`${params.width}x${params.height}`, model)
  if (params.aspectRatio && isQwenImage21(model)) {
    const native = QWEN_IMAGE_2_1_SIZES[params.aspectRatio.trim()]
    if (native) return native
    const [w, h] = params.aspectRatio.split(':').map(Number)
    if (w && h) return nearestQwenImage21Size(`${w}x${h}`)
  }
  return undefined
}

/**
 * Converts a Buffer, base64 string or `data:` URL to a Blob for a multipart
 * upload, typed from the bytes' magic number (png, jpeg or webp).
 *
 * @param input - Buffer, base64 string, or base64 `data:` URL.
 * @returns A Blob carrying the image bytes.
 */
function toBlob(input: Buffer | string): Blob {
  const buf =
    typeof input === 'string'
      ? Buffer.from(input.replace(/^data:[^;,]+;base64,/, ''), 'base64')
      : input
  let type = 'image/png'
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) type = 'image/jpeg'
  else if (
    buf.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buf.subarray(8, 12).toString('latin1') === 'WEBP'
  )
    type = 'image/webp'
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  return new Blob([ab], { type })
}

/**
 * File extension for a Blob's MIME type, used for the multipart filename.
 *
 * @param blob - The image blob.
 * @returns `png`, `jpg` or `webp`.
 */
function extensionFor(blob: Blob): string {
  if (blob.type === 'image/jpeg') return 'jpg'
  if (blob.type === 'image/webp') return 'webp'
  return 'png'
}

/**
 * MIME type for an `output_format` value.
 *
 * @param format - The output format sent to the server.
 * @returns The matching MIME type.
 */
function mimeTypeFor(format: ImageOutputFormat | undefined): string {
  if (format === 'jpeg') return 'image/jpeg'
  if (format === 'webp') return 'image/webp'
  return 'image/png'
}

/**
 * Maps a vLLM-Omni image object to the provider-agnostic GeneratedImage.
 *
 * @param item - Image object from the response.
 * @param mimeType - MIME type of the returned bytes.
 * @param seed - Seed that was requested, echoed for reproducibility.
 * @returns A normalized GeneratedImage.
 */
function mapImage(item: VllmOmniImageObject, mimeType: string, seed?: number): GeneratedImage {
  const result: GeneratedImage = { mimeType }
  if (item.b64_json) result.base64 = item.b64_json
  if (item.url) result.url = item.url
  if (item.revised_prompt) result.revisedPrompt = item.revised_prompt
  if (seed !== undefined) result.seed = seed
  return result
}

/**
 * vLLM-Omni image generation provider implementing `AIImageGenerationProvider`
 * over the server's OpenAI-compatible Images API.
 */
class VllmOmniImageGenerationProvider implements AIImageGenerationProvider {
  readonly name = 'vllm-omni'
  private readonly config: VllmOmniImageGenerationConfig

  /**
   * Creates the provider. Nothing is read from the environment here — every
   * setting is resolved on each call so late-set secrets are honoured.
   *
   * @param config - Optional overrides; each falls back to its env var.
   */
  constructor(config: VllmOmniImageGenerationConfig = {}) {
    this.config = config
  }

  /**
   * Generate images from a text prompt via `POST /v1/images/generations`.
   * `quality`, `style` and `responseFormat` are not forwarded: results are
   * always base64 PNG.
   *
   * @param params - Prompt, model, count and size.
   * @returns Generated image(s) as base64 PNG.
   */
  async generate(params: ImageGenerateParams): Promise<ImageGenerationResult> {
    const cfg = this.resolveConfig()
    const model = params.model ?? cfg.defaultModel
    const body: Record<string, unknown> = {
      model,
      prompt: params.prompt,
      n: params.n ?? 1,
      response_format: 'b64_json',
    }
    const size = resolveSize(params.size, model)
    if (size) body.size = size

    const data = await this.callJson(cfg, '/v1/images/generations', body)
    return { images: (data.data ?? []).map((item) => mapImage(item, 'image/png')), model }
  }

  /**
   * Generate images with diffusion controls via `POST /v1/images/generations`:
   * `negativePrompt` → `negative_prompt`, `steps` → `num_inference_steps`,
   * `guidanceScale` → `true_cfg_scale`, `seed`, `width`/`height` → `size`.
   *
   * @param params - Prompt plus diffusion controls.
   * @returns Generated image(s) as base64 PNG.
   */
  async generateImage(params: GenerateImageParams): Promise<ImageGenerationResult> {
    const cfg = this.resolveConfig()
    const model = params.model ?? cfg.defaultModel
    const body: Record<string, unknown> = {
      model,
      prompt: params.prompt,
      n: params.count ?? 1,
      response_format: 'b64_json',
    }
    const size = sizeFromDimensions(params, model)
    if (size) body.size = size
    if (params.negativePrompt) body.negative_prompt = params.negativePrompt
    if (params.steps !== undefined) body.num_inference_steps = params.steps
    if (params.guidanceScale !== undefined) body.true_cfg_scale = params.guidanceScale
    if (params.seed !== undefined) body.seed = params.seed

    const data = await this.callJson(cfg, '/v1/images/generations', body)
    return {
      images: (data.data ?? []).map((item) => mapImage(item, 'image/png', params.seed)),
      model,
    }
  }

  /**
   * Edit an image via `POST /v1/images/edits` (multipart). `image` plus any
   * `images` are sent as repeated `image` parts (reference images), and
   * `mask` is sent as `mask_image` — not OpenAI's `mask`.
   *
   * @param params - Source image(s), prompt, optional mask, count and size.
   * @returns Edited image(s) as base64 PNG.
   */
  async edit(params: ImageEditParams): Promise<ImageGenerationResult> {
    const cfg = this.resolveConfig()
    const model = params.model ?? cfg.defaultModel
    const references = [params.image, ...(params.images ?? [])]
    if (isQwenImage21(model) && references.length > QWEN_IMAGE_2_1_MAX_REFERENCE_IMAGES) {
      throw new Error(
        `Qwen-Image-2.1 accepts at most ${QWEN_IMAGE_2_1_MAX_REFERENCE_IMAGES} reference images per edit; got ${references.length} (image + images).`,
      )
    }

    const form = new FormData()
    form.append('model', model)
    form.append('prompt', params.prompt)
    form.append('response_format', 'b64_json')
    if (params.n !== undefined) form.append('n', String(params.n))
    const size = resolveSize(params.size, model)
    if (size) form.append('size', size)
    references.forEach((ref, i) => {
      const blob = toBlob(ref)
      form.append('image', blob, `image-${i}.${extensionFor(blob)}`)
    })
    if (params.mask) {
      const mask = toBlob(params.mask)
      form.append('mask_image', mask, `mask.${extensionFor(mask)}`)
    }

    const data = await this.callForm(cfg, '/v1/images/edits', form)
    return { images: (data.data ?? []).map((item) => mapImage(item, 'image/png')), model }
  }

  /**
   * Transform one image guided by a prompt via `POST /v1/images/edits` with a
   * single `image`. `strength` is NOT forwarded (the edits API has no such
   * field); `guidanceScale` → `guidance_scale`, `steps` →
   * `num_inference_steps`, `outputFormat` → `output_format`.
   *
   * @param params - Source image, prompt and diffusion controls.
   * @returns Transformed image(s) as base64 in the requested format.
   */
  async imageToImage(params: ImageToImageParams): Promise<ImageGenerationResult> {
    const cfg = this.resolveConfig()
    const model = params.model ?? cfg.defaultModel

    const form = new FormData()
    form.append('model', model)
    form.append('prompt', params.prompt)
    form.append('response_format', 'b64_json')
    if (params.count !== undefined) form.append('n', String(params.count))
    const size = sizeFromDimensions(params, model)
    if (size) form.append('size', size)
    if (params.outputFormat) form.append('output_format', params.outputFormat)
    if (params.negativePrompt) form.append('negative_prompt', params.negativePrompt)
    if (params.steps !== undefined) form.append('num_inference_steps', String(params.steps))
    if (params.guidanceScale !== undefined)
      form.append('guidance_scale', String(params.guidanceScale))
    if (params.seed !== undefined) form.append('seed', String(params.seed))
    const blob = toBlob(params.image)
    form.append('image', blob, `image.${extensionFor(blob)}`)

    const data = await this.callForm(cfg, '/v1/images/edits', form)
    const mimeType = mimeTypeFor(params.outputFormat)
    return {
      images: (data.data ?? []).map((item) => mapImage(item, mimeType, params.seed)),
      model,
    }
  }

  /**
   * Resolves configuration from overrides and env vars, at call time.
   *
   * @returns The resolved configuration.
   * @throws {Error} The tagged `config.notConfigured` error when no base URL is set.
   */
  private resolveConfig(): ResolvedConfig {
    const rawBaseUrl = this.config.baseUrl ?? process.env.VLLM_OMNI_BASE_URL
    if (!rawBaseUrl || !rawBaseUrl.trim()) {
      throw configNotConfiguredError('VLLM_OMNI_BASE_URL', 'vLLM-Omni image generation')
    }
    return {
      baseUrl: normalizeBaseUrl(rawBaseUrl),
      apiKey: this.config.apiKey ?? (process.env.VLLM_OMNI_API_KEY || undefined),
      defaultModel:
        this.config.defaultModel ?? (process.env.VLLM_OMNI_MODEL || QWEN_IMAGE_2_1_MODEL),
      timeoutMs: this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    }
  }

  /**
   * POSTs a JSON body.
   *
   * @param cfg - Resolved configuration.
   * @param path - Endpoint path.
   * @param body - Request body.
   * @returns The parsed response.
   */
  private callJson(
    cfg: ResolvedConfig,
    path: string,
    body: Record<string, unknown>,
  ): Promise<VllmOmniImagesResponse> {
    return this.call(cfg, path, JSON.stringify(body), { 'Content-Type': 'application/json' })
  }

  /**
   * POSTs a multipart form (fetch sets the boundary header itself).
   *
   * @param cfg - Resolved configuration.
   * @param path - Endpoint path.
   * @param form - Multipart form.
   * @returns The parsed response.
   */
  private callForm(
    cfg: ResolvedConfig,
    path: string,
    form: FormData,
  ): Promise<VllmOmniImagesResponse> {
    return this.call(cfg, path, form, {})
  }

  /**
   * Sends one request. Nothing is retried: a diffusion run is expensive and a
   * 503 means the engine is not initialised yet, which a retry storm won't fix.
   *
   * @param cfg - Resolved configuration.
   * @param path - Endpoint path.
   * @param body - Request body.
   * @param headers - Extra headers.
   * @returns The parsed response.
   * @throws {VllmOmniImageError} On a network failure, timeout or non-2xx status.
   */
  private async call(
    cfg: ResolvedConfig,
    path: string,
    body: string | FormData,
    headers: Record<string, string>,
  ): Promise<VllmOmniImagesResponse> {
    const url = `${cfg.baseUrl}${path}`
    const allHeaders: Record<string, string> = { ...headers }
    if (cfg.apiKey) allHeaders.Authorization = `Bearer ${cfg.apiKey}`

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: allHeaders,
        body,
        signal: AbortSignal.timeout(cfg.timeoutMs),
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new VllmOmniImageError(
        `vLLM-Omni request to ${url} failed: ${reason}`,
        0,
        undefined,
        error,
      )
    }

    if (!response.ok) {
      const text = await response.text()
      let detail = `HTTP ${response.status}`
      let code: string | undefined
      try {
        const parsed = JSON.parse(text) as {
          error?: { message?: string; code?: string | number; type?: string }
          message?: string
          detail?: unknown
        }
        const message =
          parsed.error?.message ??
          parsed.message ??
          (typeof parsed.detail === 'string' ? parsed.detail : undefined)
        if (message) detail = message
        const rawCode = parsed.error?.code ?? parsed.error?.type
        if (rawCode !== undefined) code = String(rawCode)
      } catch (_error) {
        // Not JSON — keep the raw body as the detail when it is short enough to read.
        if (text.length > 0 && text.length < 300) detail = text
      }
      throw new VllmOmniImageError(
        `vLLM-Omni Images API error (${response.status}): ${detail}`,
        response.status,
        code,
      )
    }

    return (await response.json()) as VllmOmniImagesResponse
  }
}

/**
 * Creates a vLLM-Omni image generation provider.
 *
 * @param config - Optional overrides (base URL, API key, default model, timeout).
 * @returns An `AIImageGenerationProvider` backed by a vLLM-Omni server.
 */
export function createProvider(config?: VllmOmniImageGenerationConfig): AIImageGenerationProvider {
  return new VllmOmniImageGenerationProvider(config)
}

/**
 * The default provider, configured from env vars on each call (wire with
 * `setProvider`). Safe to import before secrets are loaded.
 */
export const provider: AIImageGenerationProvider = createProvider()
