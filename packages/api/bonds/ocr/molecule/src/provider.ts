/**
 * molecule.dev hosted OCR.
 *
 * `recognize` calls `POST <servicesUrl>/ocr/recognize` with the project's API
 * key. The response is the core's `OcrResult`.
 *
 * @module
 */

import type { OcrInput, OcrOptions, OcrProvider, OcrResult } from '@molecule/api-ocr'

import type { MoleculeOcrConfig } from './types.js'

/** Default hosted services base URL. */
export const DEFAULT_SERVICES_URL = 'https://api.molecule.dev/api/v1/services'

/** Per-request limits of the hosted service. */
export const OCR_SERVICE_LIMITS = {
  /** Bytes of image per recognition. */
  maxImageBytes: 8 * 1024 * 1024,
} as const

/** Image types the hosted service accepts. */
export const OCR_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const

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
  401: 'Check MOLECULE_API_KEY: it must be a molecule project API key with the "broker" or "broker:ocr" scope, and not revoked.',
  402: "The molecule project's owner has used the included allowance. Enable usage billing on molecule.dev, or bond another OCR provider.",
  413: 'Images are limited to 8 MB per recognition.',
  429: 'Too many requests for this project right now. Slow down and retry.',
  503: 'molecule.dev has paused this service briefly. Retry after the Retry-After delay.',
}

/**
 * OCR provider backed by molecule.dev's hosted service.
 */
export class MoleculeOcrProvider implements OcrProvider {
  readonly name = 'molecule'

  private readonly apiKey: string
  private readonly servicesUrl: string
  private readonly timeoutMs: number

  /**
   * Create the provider.
   *
   * @param config - Options; each falls back to its env var.
   */
  constructor(config: MoleculeOcrConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.MOLECULE_API_KEY ?? ''
    this.servicesUrl = (
      config.servicesUrl ??
      process.env.MOLECULE_SERVICES_URL ??
      DEFAULT_SERVICES_URL
    ).replace(/\/+$/, '')
    this.timeoutMs = config.timeoutMs ?? 60_000
  }

  /**
   * Recognize text in one image.
   *
   * @param input - The image bytes (at most 8 MB) and MIME type.
   * @param options - Optional language hint (any language name or BCP-47 tag).
   * @returns The recognized text, per page.
   */
  async recognize(input: OcrInput, options?: OcrOptions): Promise<OcrResult> {
    if (input.data.byteLength > OCR_SERVICE_LIMITS.maxImageBytes) {
      throw new MoleculeServiceError(
        `The image is ${input.data.byteLength} bytes. ${HINTS[413]}`,
        413,
        'hostedServices.error.inputTooLarge',
      )
    }
    return this.request({
      image: Buffer.from(input.data.buffer, input.data.byteOffset, input.data.byteLength).toString(
        'base64',
      ),
      mimeType: input.mimeType,
      ...(options?.language ? { language: options.language } : {}),
    })
  }

  /** One POST to the hosted service. */
  private async request(body: Record<string, unknown>): Promise<OcrResult> {
    if (!this.apiKey) {
      throw new MoleculeServiceError(
        'MOLECULE_API_KEY is not set. Create a project API key on molecule.dev (or with `mlcl apikey create`) and put it in the API .env.',
        401,
        'hostedServices.error.tokenInvalid',
      )
    }
    const response = await fetch(`${this.servicesUrl}/ocr/recognize`, {
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
        `molecule.dev ocr/recognize failed (${response.status}): ${err.error ?? 'error'}${hint ? ` ${hint}` : ''}`,
        response.status,
        err.errorKey,
      )
    }
    return data as OcrResult
  }
}

/**
 * Create a hosted OCR provider.
 *
 * @param config - Options; each falls back to its env var.
 * @returns An `OcrProvider` backed by molecule.dev.
 */
export function createProvider(config?: MoleculeOcrConfig): OcrProvider {
  return new MoleculeOcrProvider(config)
}
