/**
 * molecule.dev hosted image transformation.
 *
 * Each `ImageProvider` method calls `POST <servicesUrl>/image/transform` with
 * the project's API key and a one-op pipeline; the response carries the
 * transformed image as base64 plus its metadata.
 *
 * @module
 */

import type {
  CropOptions,
  ImageFormat,
  ImageMetadata,
  ImageProvider,
  OptimizeOptions,
  ResizeOptions,
  RotateOptions,
} from '@molecule/api-image'

import type { MoleculeImageConfig } from './types.js'

/** Default hosted services base URL. */
export const DEFAULT_SERVICES_URL = 'https://api.molecule.dev/api/v1/services'

/**
 * Validates the hosted-services base URL and strips trailing slashes.
 *
 * The project API key rides as a Bearer token on every call, so a plain-http
 * base URL must never send it across the PUBLIC internet in cleartext.
 * Non-https URLs are refused unless the host is loopback (a self-hosted
 * services instance for local development) or a PRIVATE-network endpoint —
 * RFC 1918 addresses and `*.docker.internal`. Duplicated across the molecule
 * service bonds on purpose: they are independent published packages with no
 * shared runtime dependency.
 *
 * @param raw - The configured or defaulted base URL.
 * @returns The validated base URL, without trailing slashes.
 * @throws {Error} When the URL is not https and not loopback/private http.
 */
function resolveServicesUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '')
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch (_error) {
    throw new Error(
      `Invalid MOLECULE_SERVICES_URL "${raw}" — it must be an absolute https URL (default ${DEFAULT_SERVICES_URL}).`,
      { cause: _error },
    )
  }
  const host = parsed.hostname.toLowerCase()
  if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && isPrivateHttpHost(host))) {
    return trimmed
  }
  throw new Error(
    `MOLECULE_SERVICES_URL "${raw}" must use https: the project API key is sent as a Bearer token on every request and must not cross the public internet in cleartext. ` +
      `Point it at ${DEFAULT_SERVICES_URL} or a private https endpoint; only loopback and private-network (RFC 1918 / *.docker.internal) http is allowed, for a local services instance or an in-sandbox app reaching its own platform.`,
  )
}

/**
 * Whether a plain-http URL to this host never leaves a trusted network.
 *
 * @param host - Lowercased URL hostname.
 * @returns True when plain http to this host is a private-network hop.
 */
function isPrivateHttpHost(host: string): boolean {
  if (host === 'localhost' || host === '[::1]' || host === '::1' || host.startsWith('127.')) {
    return true
  }
  if (host === 'host.docker.internal' || host.endsWith('.docker.internal')) return true
  const octets = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!octets) return false
  const [a, b, c, d] = octets.slice(1).map(Number)
  if ([a, b, c, d].some((n) => n > 255)) return false
  if (a === 10) return true
  if (a === 172) return b >= 16 && b <= 31
  if (a === 192) return b === 168
  return false
}

/** Per-request limits of the hosted service (mirrored for local refusal). */
export const IMAGE_SERVICE_LIMITS = {
  maxImageBytes: 8 * 1024 * 1024,
  maxOps: 6,
} as const

/** Error thrown for a refused or failed hosted-service call. */
export class MoleculeServiceError extends Error {
  /** HTTP status from molecule.dev. */
  readonly status: number
  /** Stable error key from molecule.dev. */
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
  401: 'Check MOLECULE_API_KEY: it must be a molecule project API key with the "broker" or "broker:image" scope, and not revoked.',
  402: "The molecule project's owner has used the included allowance. Enable usage billing on molecule.dev, or bond your own image provider (e.g. @molecule/api-image-sharp).",
  413: 'Images are limited to 8 MB and pipelines to 6 operations.',
  429: 'Too many requests for this project right now. Slow down and retry.',
  503: 'molecule.dev has paused this service briefly. Retry after the Retry-After delay.',
}

/** The transform response the hosted service returns. */
export interface TransformResult {
  /** The transformed image, base64-encoded — no `data:` URL prefix. */
  data: string
  /** MIME type of the returned image. */
  mimeType: string
  /** Width in pixels. */
  width: number
  /** Height in pixels. */
  height: number
  /** Detected format (e.g. `'jpeg'`). */
  format: string
  /** Size in bytes. */
  bytes: number
}

/**
 * Image transformation provider backed by molecule.dev's hosted service.
 *
 * `getMetadata` is NOT implemented — the hosted service transforms images and
 * returns the final image's metadata with every response; read it there
 * (`transform()` on the raw class) instead of calling `getMetadata`.
 */
export class MoleculeImageProvider implements ImageProvider {
  readonly name = 'molecule'

  private readonly apiKey: string
  private readonly servicesUrl: string
  private readonly timeoutMs: number

  /**
   * Create the provider.
   *
   * @param config - Options; each falls back to its env var.
   */
  constructor(config: MoleculeImageConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.MOLECULE_API_KEY ?? ''
    this.servicesUrl = resolveServicesUrl(
      config.servicesUrl ?? process.env.MOLECULE_SERVICES_URL ?? DEFAULT_SERVICES_URL,
    )
    this.timeoutMs = config.timeoutMs ?? 30_000
  }

  /**
   * Runs an op pipeline against the hosted service and returns the decoded
   * image. Prefer this over the per-method wrappers when chaining several
   * operations — one round trip instead of one per step.
   *
   * @param input - The image bytes.
   * @param ops - The pipeline steps, exactly the service's op shapes.
   * @returns The transformed image plus its metadata.
   */
  async transform(input: Buffer, ops: Array<Record<string, unknown>>): Promise<TransformResult> {
    if (input.length === 0) {
      throw new MoleculeServiceError(
        'The image is empty.',
        400,
        'hostedServices.error.invalidInput',
      )
    }
    if (input.length > IMAGE_SERVICE_LIMITS.maxImageBytes) {
      throw new MoleculeServiceError(
        `The image is ${input.length} bytes; the limit is ${IMAGE_SERVICE_LIMITS.maxImageBytes}.`,
        413,
        'hostedServices.error.inputTooLarge',
      )
    }
    if (!Array.isArray(ops) || ops.length === 0) {
      throw new MoleculeServiceError(
        '"ops" must be a non-empty array of pipeline steps.',
        400,
        'hostedServices.error.invalidInput',
      )
    }
    if (ops.length > IMAGE_SERVICE_LIMITS.maxOps) {
      throw new MoleculeServiceError(
        `${ops.length} ops is over the limit of ${IMAGE_SERVICE_LIMITS.maxOps}.`,
        413,
        'hostedServices.error.inputTooLarge',
      )
    }
    return this.request({ image: input.toString('base64'), ops })
  }

  /** Runs a one-op resize pipeline through the hosted service. */
  async resize(input: Buffer, options: ResizeOptions): Promise<Buffer> {
    return this.transformToBuffer(input, [{ op: 'resize', ...options }])
  }

  /** Runs a one-op crop pipeline through the hosted service. */
  async crop(input: Buffer, options: CropOptions): Promise<Buffer> {
    return this.transformToBuffer(input, [{ op: 'crop', ...options }])
  }

  /** Runs a one-op convert pipeline through the hosted service. */
  async convert(input: Buffer, format: ImageFormat, quality?: number): Promise<Buffer> {
    return this.transformToBuffer(input, [
      { op: 'convert', format, ...(quality !== undefined ? { quality } : {}) },
    ])
  }

  /** Runs a one-op thumbnail pipeline through the hosted service. */
  async thumbnail(input: Buffer, size: number): Promise<Buffer> {
    return this.transformToBuffer(input, [{ op: 'thumbnail', size }])
  }

  /** Runs a one-op optimize pipeline through the hosted service. */
  async optimize(input: Buffer, options?: OptimizeOptions): Promise<Buffer> {
    return this.transformToBuffer(input, [{ op: 'optimize', ...(options ?? {}) }])
  }

  /** Runs a one-op rotate pipeline through the hosted service. */
  async rotate(input: Buffer, options: RotateOptions): Promise<Buffer> {
    return this.transformToBuffer(input, [{ op: 'rotate', ...options }])
  }

  /** Runs a one-op flip pipeline through the hosted service. */
  async flip(input: Buffer): Promise<Buffer> {
    return this.transformToBuffer(input, [{ op: 'flip' }])
  }

  /** Runs a one-op flop pipeline through the hosted service. */
  async flop(input: Buffer): Promise<Buffer> {
    return this.transformToBuffer(input, [{ op: 'flop' }])
  }

  /** Not hosted — the transform response already carries the result's metadata. */
  getMetadata(): Promise<ImageMetadata> {
    return Promise.reject(
      new MoleculeServiceError(
        "The hosted image service does not serve metadata-only reads — every transform() response carries the final image's width, height, format and bytes.",
        400,
        'hostedServices.error.invalidInput',
      ),
    )
  }

  /** One pipeline call, decoded to bytes. */
  private async transformToBuffer(
    input: Buffer,
    ops: Array<Record<string, unknown>>,
  ): Promise<Buffer> {
    const result = await this.transform(input, ops)
    return Buffer.from(result.data, 'base64')
  }

  /** One POST to the hosted service. */
  private async request(body: Record<string, unknown>): Promise<TransformResult> {
    if (!this.apiKey) {
      throw new MoleculeServiceError(
        'MOLECULE_API_KEY is not set. Create a project API key on molecule.dev (or with `mlcl apikey create`) and put it in the API .env.',
        401,
        'hostedServices.error.tokenInvalid',
      )
    }
    const response = await fetch(`${this.servicesUrl}/image/transform`, {
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
        `molecule.dev image/transform failed (${response.status}): ${err.error ?? 'error'}${hint ? ` ${hint}` : ''}`,
        response.status,
        err.errorKey,
      )
    }
    return data as TransformResult
  }
}

/**
 * Create a hosted image transformation provider.
 *
 * @param config - Options; each falls back to its env var.
 * @returns An `ImageProvider` backed by molecule.dev.
 */
export function createProvider(config?: MoleculeImageConfig): ImageProvider {
  return new MoleculeImageProvider(config)
}
