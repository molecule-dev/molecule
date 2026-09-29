/**
 * molecule.dev hosted image generation.
 *
 * `generate` calls `POST <servicesUrl>/image-generation/generate` with the
 * project's API key. The response is the core's `ImageGenerationResult` with
 * base64 image data.
 *
 * @module
 */

import type {
  AIImageGenerationProvider,
  ImageGenerateParams,
  ImageGenerationResult,
} from '@molecule/api-ai-image-generation'

import type { MoleculeImageGenerationConfig } from './types.js'

/** Default hosted services base URL. */
export const DEFAULT_SERVICES_URL = 'https://api.molecule.dev/api/v1/services'

/**
 * Validates the hosted-services base URL and strips trailing slashes.
 *
 * The project API key rides as a Bearer token on every call, so a plain-http
 * base URL would send it in cleartext. Mirroring the docker sandbox bond's
 * plain-TCP production refusal, non-https URLs are refused unless they point
 * at loopback (http://localhost or http://127.0.0.1), where a self-hosted
 * services instance runs for local development. Duplicated across the molecule
 * service bonds on purpose: they are independent published packages with no
 * shared runtime dependency.
 *
 * @param raw - The configured or defaulted base URL.
 * @returns The validated base URL, without trailing slashes.
 * @throws {Error} When the URL is not https and not loopback http.
 */
function resolveServicesUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '')
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch (_error) {
    // Not a URL at all (e.g. a bare hostname) — refuse it with the fix spelled out.
    throw new Error(
      `Invalid MOLECULE_SERVICES_URL "${raw}" — it must be an absolute https URL (default ${DEFAULT_SERVICES_URL}).`,
      { cause: _error },
    )
  }
  const host = parsed.hostname.toLowerCase()
  const loopback = host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
  if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && loopback)) return trimmed
  throw new Error(
    `MOLECULE_SERVICES_URL "${raw}" must use https: the project API key is sent as a Bearer token on every request and would cross the network in cleartext. ` +
      `Point it at ${DEFAULT_SERVICES_URL} or a private https endpoint; only http://localhost or http://127.0.0.1 is allowed, for a local services instance.`,
  )
}

/** Per-request limits of the hosted service (mirrored locally, before any request). */
export const IMAGE_GENERATION_SERVICE_LIMITS = {
  maxPromptChars: 2000,
  maxImages: 4,
  models: ['gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini'],
  sizes: ['1024x1024', '1024x1536', '1536x1024'],
  qualities: ['low', 'medium', 'high'],
} as const

/** Error thrown for a refused or failed hosted-service call. */
export class MoleculeServiceError extends Error {
  /** HTTP status from molecule.dev. */
  readonly status: number
  /** Stable error key from molecule.dev, e.g. `broker.error.budgetExceeded`. */
  readonly errorKey: string | undefined

  /**
   * Create the error.
   *
   * @param message - Human-readable message.
   * @param status - HTTP status.
   * @param errorKey - Stable error key, when the service sent one.
   * @param cause - The underlying error, if any.
   */
  constructor(message: string, status: number, errorKey?: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'MoleculeServiceError'
    this.status = status
    this.errorKey = errorKey
  }
}

/** What to tell the developer for each refusal the service can return. */
const HINTS: Record<number, string> = {
  400: 'The prompt or an option was refused by content moderation — reword it and retry.',
  401: 'Check MOLECULE_API_KEY: it must be a molecule project API key with the "broker" or "broker:image-generation" scope, and not revoked.',
  402: "The molecule project's owner has used the included allowance. Enable usage billing on molecule.dev, or bond another image provider.",
  413: 'Prompts are limited to 2000 characters.',
  429: 'Too many requests for this project right now. Slow down and retry.',
  503: 'molecule.dev has paused this service briefly. Retry after the Retry-After delay.',
}

/**
 * Image generation provider backed by molecule.dev's hosted service.
 *
 * Only `generate` is implemented: the hosted service serves text-to-image.
 * `edit`/`imageToImage`/`upscale` are optional methods on the core contract
 * and are absent here — feature-detect (`if (provider.edit)`) as the core's
 * own remarks prescribe.
 */
export class MoleculeImageGenerationProvider implements AIImageGenerationProvider {
  readonly name = 'molecule'

  private readonly apiKey: string
  private readonly servicesUrl: string
  private readonly timeoutMs: number

  /**
   * Create the provider.
   *
   * @param config - Options; each falls back to its env var.
   */
  constructor(config: MoleculeImageGenerationConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.MOLECULE_API_KEY ?? ''
    this.servicesUrl = resolveServicesUrl(
      config.servicesUrl ?? process.env.MOLECULE_SERVICES_URL ?? DEFAULT_SERVICES_URL,
    )
    this.timeoutMs = config.timeoutMs ?? 120_000
  }

  /**
   * Generate images from a text prompt.
   *
   * Every generated image has passed molecule.dev's moderation classifier
   * before it is returned; a refused prompt or image throws
   * `MoleculeServiceError` with status 400 and errorKey
   * `hostedServices.error.contentFlagged`.
   *
   * @param params - Prompt plus the options the service prices: `model`,
   *   `size` and `quality`. `n` caps at 4. `responseFormat` is not forwarded —
   *   the service always returns base64 (it moderates the raw bytes).
   * @returns The generated images (base64 png) and the model that made them.
   */
  async generate(params: ImageGenerateParams): Promise<ImageGenerationResult> {
    if (typeof params.prompt !== 'string' || params.prompt.trim().length === 0) {
      throw new MoleculeServiceError('The prompt must be non-empty text.', 400)
    }
    if (params.prompt.length > IMAGE_GENERATION_SERVICE_LIMITS.maxPromptChars) {
      throw new MoleculeServiceError(
        `The prompt is ${params.prompt.length} characters. ${HINTS[413]}`,
        413,
        'hostedServices.error.inputTooLarge',
      )
    }
    if (
      params.n !== undefined &&
      (!Number.isInteger(params.n) ||
        params.n < 1 ||
        params.n > IMAGE_GENERATION_SERVICE_LIMITS.maxImages)
    ) {
      throw new MoleculeServiceError(
        `"n" must be an integer from 1 to ${IMAGE_GENERATION_SERVICE_LIMITS.maxImages}.`,
        400,
        'hostedServices.error.invalidInput',
      )
    }
    if (
      params.model !== undefined &&
      !(IMAGE_GENERATION_SERVICE_LIMITS.models as readonly string[]).includes(params.model)
    ) {
      throw new MoleculeServiceError(
        `"model" must be one of: ${IMAGE_GENERATION_SERVICE_LIMITS.models.join(', ')}.`,
        400,
        'hostedServices.error.invalidInput',
      )
    }
    if (
      params.size !== undefined &&
      !(IMAGE_GENERATION_SERVICE_LIMITS.sizes as readonly string[]).includes(params.size)
    ) {
      throw new MoleculeServiceError(
        `"size" must be one of: ${IMAGE_GENERATION_SERVICE_LIMITS.sizes.join(', ')}.`,
        400,
        'hostedServices.error.invalidInput',
      )
    }
    if (
      params.quality !== undefined &&
      !(IMAGE_GENERATION_SERVICE_LIMITS.qualities as readonly string[]).includes(params.quality)
    ) {
      throw new MoleculeServiceError(
        `"quality" must be one of: ${IMAGE_GENERATION_SERVICE_LIMITS.qualities.join(', ')} — "auto" is not served because it has no published per-image price.`,
        400,
        'hostedServices.error.invalidInput',
      )
    }
    return this.request({
      prompt: params.prompt,
      ...(params.n !== undefined ? { n: params.n } : {}),
      ...(params.model !== undefined ? { model: params.model } : {}),
      ...(params.size !== undefined ? { size: params.size } : {}),
      ...(params.quality !== undefined ? { quality: params.quality } : {}),
    })
  }

  // The core's optional operations are deliberately absent: the hosted service
  // is text-to-image only. (`edit`, `imageToImage`, `upscale`, `generateImage`)

  /** One POST to the hosted service. */
  private async request(body: Record<string, unknown>): Promise<ImageGenerationResult> {
    if (!this.apiKey) {
      throw new MoleculeServiceError(
        'MOLECULE_API_KEY is not set. Create a project API key on molecule.dev (or with `mlcl apikey create`) and put it in the API .env.',
        401,
        'hostedServices.error.tokenInvalid',
      )
    }
    const response = await fetch(`${this.servicesUrl}/image-generation/generate`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    const text = await response.text()
    let data: unknown
    try {
      data = text ? JSON.parse(text) : {}
    } catch (error) {
      // A proxy/gateway error page, not the service: report the status only.
      throw new MoleculeServiceError(
        `molecule.dev returned ${response.status} with a non-JSON body.`,
        response.status,
        undefined,
        error,
      )
    }
    if (!response.ok) {
      const err = data as { error?: string; errorKey?: string }
      const hint = HINTS[response.status]
      throw new MoleculeServiceError(
        `molecule.dev image-generation/generate failed (${response.status}): ${err.error ?? 'error'}${hint ? ` ${hint}` : ''}`,
        response.status,
        err.errorKey,
      )
    }
    const result = data as ImageGenerationResult
    if (!Array.isArray(result.images)) {
      throw new MoleculeServiceError(
        'molecule.dev returned a malformed image-generation response.',
        502,
        undefined,
      )
    }
    return {
      ...result,
      images: result.images.map((image) => ({
        // Provider URLs are molecule's and short-lived; only the portable
        // fields are handed on.
        base64: image.base64,
        revisedPrompt: image.revisedPrompt,
        ...(image.seed !== undefined ? { seed: image.seed } : {}),
      })),
    }
  }
}

/**
 * Create a hosted image generation provider.
 *
 * @param config - Options; each falls back to its env var.
 * @returns An `AIImageGenerationProvider` backed by molecule.dev.
 */
export function createProvider(config?: MoleculeImageGenerationConfig): AIImageGenerationProvider {
  return new MoleculeImageGenerationProvider(config)
}
