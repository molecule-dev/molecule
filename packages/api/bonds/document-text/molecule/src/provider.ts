/**
 * molecule.dev hosted document text.
 *
 * `extract` parses a PDF document on molecule.dev — pdf.js in the API
 * process, no vendor, no browser — and returns its text: per page and
 * joined, plus page count and the document's declared metadata. Encrypted
 * documents take `password`.
 *
 * @module
 */

import type {
  DocumentTextOptions,
  DocumentTextProvider,
  DocumentTextResult,
} from '@molecule/api-document-text'

import type { MoleculeDocumentTextConfig } from './types.js'

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
export const DOCUMENT_TEXT_SERVICE_LIMITS = {
  maxPdfBytes: 8 * 1024 * 1024,
  maxTextChars: 500_000,
  maxPages: 500,
  maxPasswordChars: 256,
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
  401: 'Check MOLECULE_API_KEY: it must be a molecule project API key with the "broker" or "broker:pdf" scope, and not revoked.',
  402: "The molecule project's owner has used the included allowance. Enable usage billing on molecule.dev, or extract text in-process with @molecule/api-document-text-pdfjs.",
  413: 'The document is limited to 8 MB and the returned text to 500,000 characters.',
  429: 'Too many requests for this project right now. Slow down and retry.',
  503: 'molecule.dev has paused this service briefly. Retry after the Retry-After delay.',
}

/**
 * Document text provider backed by molecule.dev's hosted service.
 *
 * The bytes are parsed by pdf.js in the API process — nothing about the
 * document leaves molecule's infrastructure except the extracted text in
 * the response.
 */
export class MoleculeDocumentTextProvider implements DocumentTextProvider {
  readonly name = 'molecule'

  private readonly apiKey: string
  private readonly servicesUrl: string
  private readonly timeoutMs: number

  /**
   * Create the provider.
   *
   * @param config - Options; each falls back to its env var.
   */
  constructor(config: MoleculeDocumentTextConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.MOLECULE_API_KEY ?? ''
    this.servicesUrl = resolveServicesUrl(
      config.servicesUrl ?? process.env.MOLECULE_SERVICES_URL ?? DEFAULT_SERVICES_URL,
    )
    this.timeoutMs = config.timeoutMs ?? 60_000
  }

  /**
   * Extracts the text of one PDF document on the hosted service.
   *
   * @param input - The document bytes, plus a password for an encrypted document.
   * @param options - Extract options (page bound, per-page texts).
   * @returns The extracted text.
   */
  async extract(
    input: { data: Uint8Array; password?: string },
    options?: DocumentTextOptions,
  ): Promise<DocumentTextResult> {
    const body = this.plan(input, options)
    return this.request('pdf/to-text', body)
  }

  /** Validates one extraction locally, so a bad call never leaves the process. */
  private plan(
    input: { data?: Uint8Array; password?: string },
    options?: DocumentTextOptions,
  ): Record<string, unknown> {
    if (typeof input !== 'object' || input === null || !(input.data instanceof Uint8Array)) {
      throw new MoleculeServiceError(
        '"data" must be non-empty PDF bytes (Uint8Array or Buffer).',
        400,
        'hostedServices.error.invalidInput',
      )
    }
    if (input.data.length === 0) {
      throw new MoleculeServiceError(
        '"data" must be non-empty PDF bytes (Uint8Array or Buffer).',
        400,
        'hostedServices.error.invalidInput',
      )
    }
    if (input.data.length > DOCUMENT_TEXT_SERVICE_LIMITS.maxPdfBytes) {
      throw new MoleculeServiceError(
        `The document is ${input.data.length} bytes; the limit is ${DOCUMENT_TEXT_SERVICE_LIMITS.maxPdfBytes}.`,
        413,
        'hostedServices.error.inputTooLarge',
      )
    }
    const out: Record<string, unknown> = { pdf: Buffer.from(input.data).toString('base64') }
    if (input.password !== undefined || options !== undefined) {
      const opt: Record<string, unknown> = {}
      if (input.password !== undefined) {
        if (typeof input.password !== 'string' || input.password.length === 0) {
          throw new MoleculeServiceError(
            '"password" must be non-empty text when given.',
            400,
            'hostedServices.error.invalidInput',
          )
        }
        if (input.password.length > DOCUMENT_TEXT_SERVICE_LIMITS.maxPasswordChars) {
          throw new MoleculeServiceError(
            `"password" is ${input.password.length} characters; the limit is ${DOCUMENT_TEXT_SERVICE_LIMITS.maxPasswordChars}.`,
            400,
            'hostedServices.error.invalidInput',
          )
        }
        opt.password = input.password
      }
      if (options !== undefined) {
        if (typeof options !== 'object' || options === null) {
          throw new MoleculeServiceError(
            '"options" must be an object.',
            400,
            'hostedServices.error.invalidInput',
          )
        }
        if (options.maxPages !== undefined) {
          if (
            typeof options.maxPages !== 'number' ||
            !Number.isInteger(options.maxPages) ||
            options.maxPages < 1 ||
            options.maxPages > DOCUMENT_TEXT_SERVICE_LIMITS.maxPages
          ) {
            throw new MoleculeServiceError(
              `"options.maxPages" must be an integer from 1 to ${DOCUMENT_TEXT_SERVICE_LIMITS.maxPages}.`,
              400,
              'hostedServices.error.invalidInput',
            )
          }
          opt.maxPages = options.maxPages
        }
        if (options.includePages !== undefined) {
          if (typeof options.includePages !== 'boolean') {
            throw new MoleculeServiceError(
              '"options.includePages" must be a boolean.',
              400,
              'hostedServices.error.invalidInput',
            )
          }
          opt.includePages = options.includePages
        }
      }
      if (Object.keys(opt).length > 0) out.options = opt
    }
    return out
  }

  /** One POST to the hosted service. */
  private async request(path: string, body: Record<string, unknown>): Promise<DocumentTextResult> {
    if (!this.apiKey) {
      throw new MoleculeServiceError(
        'MOLECULE_API_KEY is not set. Create a project API key on molecule.dev (or with `mlcl apikey create`) and put it in the API .env.',
        401,
        'hostedServices.error.tokenInvalid',
      )
    }
    const response = await fetch(`${this.servicesUrl}/${path}`, {
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
        `molecule.dev ${path} failed (${response.status}): ${err.error ?? 'error'}${hint ? ` ${hint}` : ''}`,
        response.status,
        err.errorKey,
      )
    }
    const result = data as DocumentTextResult
    if (typeof result.text !== 'string' || typeof result.pageCount !== 'number') {
      throw new MoleculeServiceError(
        'molecule.dev returned no extracted text.',
        502,
        'hostedServices.error.upstreamFailed',
      )
    }
    return result
  }
}

/**
 * Create a hosted document text provider.
 *
 * @param config - Options; each falls back to its env var.
 * @returns A `DocumentTextProvider` backed by molecule.dev.
 */
export function createProvider(config?: MoleculeDocumentTextConfig): DocumentTextProvider {
  return new MoleculeDocumentTextProvider(config)
}
