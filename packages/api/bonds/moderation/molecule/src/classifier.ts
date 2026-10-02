/**
 * molecule.dev hosted content classifier.
 *
 * `check` calls `POST <servicesUrl>/moderation/check` and `checkImage` calls
 * `POST <servicesUrl>/moderation/check-image` with the project's API key. The
 * response is the core's `ModerationResult`.
 *
 * @module
 */

import type {
  ContentClassifierProvider,
  ImageModerationOptions,
  ModerationOptions,
  ModerationResult,
} from '@molecule/api-content-moderation'

import type { MoleculeModerationConfig } from './types.js'

/** Default hosted services base URL. */
export const DEFAULT_SERVICES_URL = 'https://api.molecule.dev/api/v1/services'

/**
 * Validates the hosted-services base URL and strips trailing slashes.
 *
 * The project API key rides as a Bearer token on every call, so a plain-http
 * base URL must never send it across the PUBLIC internet in cleartext.
 * Mirroring the docker sandbox bond's plain-TCP production refusal, non-https
 * URLs are refused unless the host is loopback (a self-hosted services
 * instance for local development) or a PRIVATE-network endpoint — RFC 1918
 * addresses and `*.docker.internal` — which is how an in-sandbox app reaches
 * its platform's hosted-services gateway (`http://host.docker.internal:…`),
 * traffic that never leaves the host's virtual network. Public cleartext is
 * still refused. Duplicated across the molecule service bonds on purpose:
 * they are independent published packages with no shared runtime dependency.
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
    // Not a URL at all (e.g. a bare hostname) — refuse it with the fix spelled out.
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
 * Whether a plain-http URL to this host never leaves a trusted network: the
 * loopback addresses, the RFC 1918 private ranges (each octet range-checked —
 * a public address must not parse its way past this guard), and the docker
 * host-gateway names an in-sandbox app uses to reach its own platform.
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

/** Per-request limits of the hosted service. */
export const MODERATION_SERVICE_LIMITS = {
  /** Characters of text per check. */
  maxTextChars: 100_000,
  /** Bytes of image per check. */
  maxImageBytes: 4 * 1024 * 1024,
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
  401: 'Check MOLECULE_API_KEY: it must be a molecule project API key with the "broker" or "broker:moderation" scope, and not revoked.',
  402: "The molecule project's owner has used the included allowance. Enable usage billing on molecule.dev, or bond another classifier.",
  413: 'Text is limited to 100,000 characters and images to 4 MB per check.',
  429: 'Too many requests for this project right now. Slow down and retry.',
  503: 'molecule.dev has paused this service briefly. Retry after the Retry-After delay.',
}

/**
 * Classifier backed by molecule.dev's hosted moderation service.
 */
export class MoleculeContentClassifier implements ContentClassifierProvider {
  readonly name = 'molecule'

  private readonly apiKey: string
  private readonly servicesUrl: string
  private readonly timeoutMs: number

  /**
   * Create the classifier.
   *
   * @param config - Options; each falls back to its env var.
   */
  constructor(config: MoleculeModerationConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.MOLECULE_API_KEY ?? ''
    this.servicesUrl = resolveServicesUrl(
      config.servicesUrl ?? process.env.MOLECULE_SERVICES_URL ?? DEFAULT_SERVICES_URL,
    )
    this.timeoutMs = config.timeoutMs ?? 30_000
  }

  /**
   * Classify text.
   *
   * @param content - The text.
   * @param options - Category filter and threshold (see the core's docs).
   * @returns Per-category scores and the overall decision.
   */
  async check(content: string, options?: ModerationOptions): Promise<ModerationResult> {
    return this.request('check', { content, ...pick(options) })
  }

  /**
   * Classify an image.
   *
   * @param image - The image bytes (at most 4 MB).
   * @param options - Category filter, threshold and MIME type (default `image/jpeg`).
   * @returns Per-category scores and the overall decision.
   */
  async checkImage(image: Uint8Array, options?: ImageModerationOptions): Promise<ModerationResult> {
    if (image.byteLength > MODERATION_SERVICE_LIMITS.maxImageBytes) {
      throw new MoleculeServiceError(
        `The image is ${image.byteLength} bytes. ${HINTS[413]}`,
        413,
        'hostedServices.error.inputTooLarge',
      )
    }
    return this.request('check-image', {
      image: Buffer.from(image).toString('base64'),
      mimeType: options?.mimeType ?? 'image/jpeg',
      ...pick(options),
    })
  }

  /** One POST to the hosted service. */
  private async request(
    operation: string,
    body: Record<string, unknown>,
  ): Promise<ModerationResult> {
    if (!this.apiKey) {
      throw new MoleculeServiceError(
        'MOLECULE_API_KEY is not set. Create a project API key on molecule.dev (or with `mlcl apikey create`) and put it in the API .env.',
        401,
        'hostedServices.error.tokenInvalid',
      )
    }
    const response = await fetch(`${this.servicesUrl}/moderation/${operation}`, {
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
        `molecule.dev moderation/${operation} failed (${response.status}): ${err.error ?? 'error'}${hint ? ` ${hint}` : ''}`,
        response.status,
        err.errorKey,
      )
    }
    return data as ModerationResult
  }
}

/** The option fields the service accepts. */
function pick(options?: ModerationOptions): Record<string, unknown> {
  return {
    ...(options?.categories?.length ? { categories: options.categories } : {}),
    ...(options?.threshold !== undefined ? { threshold: options.threshold } : {}),
  }
}

/**
 * Create a hosted content classifier.
 *
 * @param config - Options; each falls back to its env var.
 * @returns A `ContentClassifierProvider` backed by molecule.dev.
 */
export function createClassifier(config?: MoleculeModerationConfig): ContentClassifierProvider {
  return new MoleculeContentClassifier(config)
}
