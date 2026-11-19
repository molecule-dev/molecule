/**
 * MiniMax implementation of AIImageGenerationProvider.
 *
 * Talks to MiniMax's hosted H3-Image API on `api.minimax.io` (the same host
 * and key the `@molecule/api-ai-minimax` chat bond uses): synchronous
 * `POST /v1/images/generations` (text-to-image) and `POST /v1/images/edits`
 * (multi-reference editing, up to 16 references), both JSON with Bearer auth.
 * Nothing is retried — the endpoint is not idempotent and a retry generates
 * and charges again.
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
  ImageEditParams,
  ImageGenerateParams,
  ImageGenerationResult,
} from '@molecule/api-ai-image-generation'
import { getLogger } from '@molecule/api-bond'
import { configNotConfiguredError } from '@molecule/api-secrets'

import type { MinimaxImageGenerationConfig, MinimaxImageProvider } from './types.js'

const logger = getLogger()

/** Default API base URL — MiniMax's international platform host. */
export const DEFAULT_BASE_URL = 'https://api.minimax.io'

/** Default model: the quality H3-Image tier. */
export const DEFAULT_MODEL = 'MiniMax-H3-Image'

/** The image model ids the API's `model` enum accepts. */
export const MINIMAX_IMAGE_MODELS = ['MiniMax-H3-Image', 'MiniMax-H3-Image-Highspeed'] as const

/** Most reference images a single edit accepts. */
export const MINIMAX_IMAGE_MAX_REFERENCE_IMAGES = 16

/**
 * Default per-request timeout. The API is SYNCHRONOUS and its server waits up
 * to 600 s before answering, so the client timeout sits just above that wait.
 */
export const DEFAULT_TIMEOUT_MS = 610_000

/** Shape of a single image object in the API's `ImagesResponse.data[]`. */
interface MinimaxImageObject {
  url?: string | null
  b64_json?: string | null
  revised_prompt?: string | null
  error?: { code?: string | number | null; message?: string | null } | null
}

/** Shape of the API's `ImagesResponse`. */
interface MinimaxImagesResponse {
  created?: number
  data?: MinimaxImageObject[] | null
  output_format?: string
  request_id?: string | null
}

/** Shape of a MiniMax API error response body. */
interface MinimaxErrorResponse {
  error?: {
    message?: string
    type?: string
    code?: string | number
  } | null
}

/**
 * Error thrown when the MiniMax API refuses or fails a request. Carries the
 * API's HTTP `status` (0 when it could not be reached or timed out) and the
 * error code from its error body, when present. Deliberately NOT tagged with
 * `statusCode`/`errorKey`, so API middleware answers its generic 500 instead
 * of echoing the vendor's status to the caller.
 */
export class MinimaxImageError extends Error {
  /** HTTP status from the MiniMax API; 0 for a network failure or timeout. */
  readonly status: number
  /** Error code from the MiniMax error body, when present. */
  readonly code: string | undefined

  /**
   * Create the error.
   *
   * @param message - Human-readable message.
   * @param status - HTTP status (0 for network failure/timeout).
   * @param code - MiniMax error code, when it sent one.
   * @param cause - The underlying error, if any.
   */
  constructor(message: string, status: number, code?: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'MinimaxImageError'
    this.status = status
    this.code = code
  }
}

/** Resolved per-call configuration. */
interface ResolvedConfig {
  baseUrl: string
  apiKey: string
  defaultModel: string
  timeoutMs: number
  disablePromptEnhanced: boolean
}

/**
 * Normalizes an API base URL: strips trailing slashes.
 *
 * @param raw - The configured base URL.
 * @returns The base URL without trailing slashes.
 */
function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '')
}

/**
 * Converts an edit reference to the `image_url` form the edits API accepts:
 * a public URL, an `mm_file://{file_id}` URI or a `data:` URI passes through
 * unchanged; a Buffer or bare base64 string is wrapped in a `data:` URI with
 * the MIME type sniffed from the bytes' magic number.
 *
 * @param input - Buffer, base64 string, data URI, `mm_file:` URI or public URL.
 * @returns The value for the item's `image_url` field.
 */
function toImageUrl(input: Buffer | string): string {
  if (typeof input === 'string' && /^(https?:\/\/|mm_file:|data:)/i.test(input.trim())) {
    return input.trim()
  }
  const buf =
    typeof input === 'string'
      ? Buffer.from(input.replace(/^data:[^;,]+;base64,/, ''), 'base64')
      : input
  let mimeType = 'image/png'
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) mimeType = 'image/jpeg'
  else if (
    buf.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buf.subarray(8, 12).toString('latin1') === 'WEBP'
  )
    mimeType = 'image/webp'
  return `data:${mimeType};base64,${buf.toString('base64')}`
}

/**
 * Maps an API image object to the provider-agnostic `GeneratedImage`.
 *
 * @param item - Image object from the response.
 * @returns A normalized GeneratedImage.
 */
function mapImage(item: MinimaxImageObject): GeneratedImage {
  const result: GeneratedImage = {}
  if (item.url) result.url = item.url
  if (item.b64_json) result.base64 = item.b64_json
  if (item.revised_prompt) result.revisedPrompt = item.revised_prompt
  return result
}

/**
 * MiniMax image generation provider implementing `AIImageGenerationProvider`
 * over the hosted H3-Image API on api.minimax.io.
 */
class MinimaxImageGenerationProvider implements AIImageGenerationProvider {
  readonly name = 'minimax'
  private readonly config: MinimaxImageGenerationConfig

  /**
   * Creates the provider. Nothing is read from the environment here — every
   * setting is resolved on each call so late-set secrets are honoured.
   *
   * @param config - Optional overrides; each falls back to its env var.
   */
  constructor(config: MinimaxImageGenerationConfig = {}) {
    this.config = config
  }

  /**
   * Generate images from a text prompt via `POST /v1/images/generations`.
   * `quality` and `style` are not forwarded — the API has no such fields.
   *
   * @param params - Prompt, model, count, size and response format.
   * @returns Generated image(s); per-item failures inside the HTTP 200 are
   *   logged and skipped, and an answer with zero successful images throws.
   */
  async generate(params: ImageGenerateParams): Promise<ImageGenerationResult> {
    const cfg = this.resolveConfig()
    const model = this.resolveModel(params.model ?? cfg.defaultModel)
    const body: Record<string, unknown> = {
      model,
      prompt: params.prompt,
      n: this.resolveCount(params.n),
    }
    const size = this.resolveSize(params.size)
    if (size) body.size = size
    // The API default is `url`; only a caller asking for base64 needs the field.
    if (params.responseFormat === 'base64') body.response_format = 'b64_json'
    if (cfg.disablePromptEnhanced) body.disable_prompt_enhanced = true

    const data = await this.callJson(cfg, '/v1/images/generations', body)
    return this.collectImages(data, model, 'generations')
  }

  /**
   * Edit one or more reference images via `POST /v1/images/edits` (JSON, not
   * multipart). `image` plus any `images` become the `images[]` array in
   * order — upload order maps to `<Picture 1>`, `<Picture 2>`, … in the
   * prompt. There is no masked editing: a `mask` is refused here because the
   * API answers it with HTTP 400.
   *
   * @param params - Source image(s), prompt, count, size and response format.
   * @returns Edited image(s); per-item failures inside the HTTP 200 are
   *   logged and skipped, and an answer with zero successful images throws.
   */
  async edit(params: ImageEditParams): Promise<ImageGenerationResult> {
    const cfg = this.resolveConfig()
    const model = this.resolveModel(params.model ?? cfg.defaultModel)
    if (params.mask !== undefined) {
      throw new MinimaxImageError(
        'MiniMax H3-Image has no masked editing — the edits API rejects a mask with HTTP 400. Describe the edit in the prompt instead.',
        400,
      )
    }
    const references = [params.image, ...(params.images ?? [])]
    if (references.length > MINIMAX_IMAGE_MAX_REFERENCE_IMAGES) {
      throw new MinimaxImageError(
        `MiniMax H3-Image accepts at most ${MINIMAX_IMAGE_MAX_REFERENCE_IMAGES} reference images per edit; got ${references.length} (image + images).`,
        400,
      )
    }
    const body: Record<string, unknown> = {
      model,
      prompt: params.prompt,
      n: this.resolveCount(params.n),
      images: references.map((reference) => ({ image_url: toImageUrl(reference) })),
    }
    const size = this.resolveSize(params.size)
    if (size) body.size = size
    if (params.responseFormat === 'base64') body.response_format = 'b64_json'
    if (cfg.disablePromptEnhanced) body.disable_prompt_enhanced = true

    const data = await this.callJson(cfg, '/v1/images/edits', body)
    return this.collectImages(data, model, 'edits')
  }

  // The core's optional `generateImage`/`imageToImage`/`upscale` are
  // deliberately absent: the hosted API exposes exactly text-to-image and
  // reference editing (no strength control, no upscaler). Feature-detect
  // (`if (provider.upscale)`) as the core prescribes.

  /**
   * Normalizes the images out of an HTTP 200 answer. The API returns HTTP 200
   * whenever at least one image succeeds and reports failures PER ITEM
   * (`data[]` always has `n` entries) — so a partial failure is not a request
   * failure: successful images are returned and every failed item is logged.
   * An answer where every item failed delivers nothing and throws.
   *
   * @param data - The parsed ImagesResponse.
   * @param model - The model that served the request.
   * @param endpoint - Which endpoint answered (for the log line).
   * @returns The successful images, normalized.
   * @throws {MinimaxImageError} When `data[]` carries no successful image.
   */
  private collectImages(
    data: MinimaxImagesResponse,
    model: string,
    endpoint: 'generations' | 'edits',
  ): ImageGenerationResult {
    const items = data.data ?? []
    const images: GeneratedImage[] = []
    const failures: Array<{ code?: string; message?: string }> = []
    for (const item of items) {
      if (item.error) {
        const code =
          item.error.code !== undefined && item.error.code !== null
            ? String(item.error.code)
            : undefined
        const message = item.error.message ?? undefined
        failures.push({ ...(code ? { code } : {}), ...(message ? { message } : {}) })
        // A failed item is not a failed request (the HTTP 200 may carry other
        // successful images) — but it must not vanish silently either: the
        // caller asked for `n` images and got fewer.
        logger.warn('MiniMax image generation item failed', {
          endpoint,
          model,
          ...(code ? { code } : {}),
          ...(message ? { itemMessage: message } : {}),
        })
        continue
      }
      images.push(mapImage(item))
    }
    if (images.length === 0) {
      const detail = failures
        .map((failure) => `[${failure.code ?? 'no code'}] ${failure.message ?? 'no message'}`)
        .join('; ')
      throw new MinimaxImageError(
        `MiniMax Images API returned ${failures.length} failed image(s) and no successes: ${detail || 'data[] was empty'}.`,
        502,
        failures[0]?.code,
      )
    }
    return { images, model }
  }

  /**
   * Resolves and validates the model id against the API's enum.
   *
   * @param model - The requested model id.
   * @returns The model id, when the API accepts it.
   * @throws {MinimaxImageError} When the id is not in the API's model enum.
   */
  private resolveModel(model: string): string {
    if (!(MINIMAX_IMAGE_MODELS as readonly string[]).includes(model)) {
      throw new MinimaxImageError(
        `"model" must be one of: ${MINIMAX_IMAGE_MODELS.join(', ')} (got "${model}").`,
        400,
      )
    }
    return model
  }

  /**
   * Resolves `n`: an integer in [1, 10] (the API's range). `undefined` is the
   * API default (1).
   *
   * @param n - The requested count, if any.
   * @returns The count to send.
   * @throws {MinimaxImageError} When the count is not an integer in [1, 10].
   */
  private resolveCount(n: number | undefined): number {
    if (n === undefined) return 1
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      throw new MinimaxImageError(`"n" must be an integer between 1 and 10 (got ${n}).`, 400)
    }
    return n
  }

  /**
   * Resolves `size`: a `WIDTHxHEIGHT` string or `'auto'` (the API default —
   * returned undefined here so the field is omitted).
   *
   * @param size - The requested size, if any.
   * @returns The size to send, or `undefined` to let the API choose.
   * @throws {MinimaxImageError} When the size is neither `WxH` nor `auto`.
   */
  private resolveSize(size: string | undefined): string | undefined {
    if (size === undefined || size === 'auto') return undefined
    if (!/^\d+x\d+$/.test(size.trim())) {
      throw new MinimaxImageError(
        `"size" must be a "WIDTHxHEIGHT" string or "auto" (got "${size}").`,
        400,
      )
    }
    return size.trim()
  }

  /**
   * Resolves configuration from overrides and env vars, at call time.
   *
   * @returns The resolved configuration.
   * @throws {Error} The tagged `config.notConfigured` error when no API key is set.
   */
  private resolveConfig(): ResolvedConfig {
    const apiKey = this.config.apiKey ?? process.env.MINIMAX_API_KEY
    if (!apiKey || !apiKey.trim()) {
      throw configNotConfiguredError('MINIMAX_API_KEY', 'MiniMax image generation')
    }
    return {
      baseUrl: normalizeBaseUrl(
        this.config.baseUrl ?? process.env.MINIMAX_BASE_URL ?? DEFAULT_BASE_URL,
      ),
      apiKey,
      defaultModel: this.config.defaultModel ?? (process.env.MINIMAX_IMAGE_MODEL || DEFAULT_MODEL),
      timeoutMs: this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      disablePromptEnhanced: this.config.disablePromptEnhanced === true,
    }
  }

  /**
   * Sends one JSON POST with Bearer auth. NOTHING is retried, on any status:
   * the endpoint is not idempotent — the server finishes the generation and
   * charges for successful images even if the client times out, and a retry
   * generates and charges again.
   *
   * @param cfg - Resolved configuration.
   * @param path - Endpoint path.
   * @param body - Request body.
   * @returns The parsed response.
   * @throws {MinimaxImageError} On a network failure, timeout, non-2xx status,
   *   or a 2xx response whose body is not JSON.
   */
  private async callJson(
    cfg: ResolvedConfig,
    path: string,
    body: Record<string, unknown>,
  ): Promise<MinimaxImagesResponse> {
    const url = `${cfg.baseUrl}${path}`
    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(cfg.timeoutMs),
      })
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new MinimaxImageError(
        `MiniMax request to ${url} failed: ${reason}`,
        0,
        undefined,
        error,
      )
    }

    if (!response.ok) {
      // Best-effort body read: the upstream already answered non-2xx, and a
      // connection reset while that body streams must not upgrade the typed
      // error to a raw `TypeError: terminated` — the status is what callers
      // key on; an unreadable body only degrades the detail message.
      const text = await response.text().catch((_error: unknown) => '')
      let detail = `HTTP ${response.status}`
      let code: string | undefined
      try {
        const parsed = JSON.parse(text) as MinimaxErrorResponse
        if (parsed.error?.message) detail = parsed.error.message
        const rawCode = parsed.error?.code ?? parsed.error?.type
        if (rawCode !== undefined && rawCode !== null) code = String(rawCode)
      } catch (_error) {
        // Not JSON — keep the raw body as the detail when it is short enough to read.
        if (text.length > 0 && text.length < 300) detail = text
      }
      throw new MinimaxImageError(
        `MiniMax Images API error (${response.status}): ${detail}`,
        response.status,
        code,
      )
    }

    try {
      return (await response.json()) as MinimaxImagesResponse
    } catch (error) {
      // A 2xx with a non-JSON body (a proxy/WAF interstitial, an empty 204)
      // must still surface as the typed error the contract promises — a raw
      // SyntaxError carries no `status`, so caller logic keyed on it never
      // fires. 502 = "the upstream's answer is unusable".
      const reason = error instanceof Error ? error.message : String(error)
      throw new MinimaxImageError(
        `MiniMax Images API error (502): 2xx response with a non-JSON body (HTTP ${response.status}): ${reason}`,
        502,
        undefined,
        error,
      )
    }
  }
}

/**
 * Creates a MiniMax image generation provider.
 *
 * @param config - Optional overrides (API key, base URL, default model, timeout).
 * @returns A provider backed by the MiniMax hosted API, with `edit` always present.
 */
export function createProvider(config?: MinimaxImageGenerationConfig): MinimaxImageProvider {
  return new MinimaxImageGenerationProvider(config)
}

/**
 * The default provider, configured from env vars on each call (wire with
 * `setProvider`). Safe to import before secrets are loaded.
 */
export const provider: AIImageGenerationProvider = createProvider()
