/**
 * molecule.dev hosted AI summarization.
 *
 * `summarize` calls `POST <servicesUrl>/summarization/summarize` with the
 * project's API key. The response is the core's `SummarizeResult`.
 *
 * @module
 */

import type {
  AISummarizationProvider,
  SummarizeInput,
  SummarizeResult,
} from '@molecule/api-ai-summarization'

import type { MoleculeSummarizationConfig } from './types.js'

/** Default hosted services base URL. */
export const DEFAULT_SERVICES_URL = 'https://api.molecule.dev/api/v1/services'

/**
 * Validates the hosted-services base URL and strips trailing slashes.
 *
 * The project API key rides as a Bearer token on every call, so a plain-http
 * base URL must never send it across the PUBLIC internet in cleartext.
 * Non-https URLs are refused unless the host is loopback (a self-hosted
 * services instance for local development) or a PRIVATE-network endpoint —
 * RFC 1918 addresses and `*.docker.internal` — which is how an in-sandbox app
 * reaches its platform's hosted-services gateway
 * (`http://host.docker.internal:…`). Duplicated across the molecule service
 * bonds on purpose: they are independent published packages with no shared
 * runtime dependency.
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
export const SUMMARIZATION_SERVICE_LIMITS = {
  maxTextChars: 100_000,
  maxWords: 500,
  maxLength: 1000,
  maxSentences: 10,
  maxAttempts: 5,
  maxFocusChars: 2_000,
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
  401: 'Check MOLECULE_API_KEY: it must be a molecule project API key with the "broker" or "broker:ai-summarization" scope, and not revoked.',
  402: "The molecule project's owner has used the included allowance. Enable usage billing on molecule.dev, or bond another AI summarization provider.",
  413: 'The text exceeds the service limit (100k characters).',
  429: 'Too many requests for this project right now. Slow down and retry.',
  503: 'molecule.dev has paused this service briefly. Retry after the Retry-After delay.',
}

/** Formats for the summary. */
const FORMATS = ['paragraph', 'bullets', 'tldr'] as const

/**
 * AI summarization provider backed by molecule.dev's hosted service.
 *
 * The model is the SERVICE's choice — `SummarizeInput.model` and
 * `SummarizeInput.provider` (a self-hosted bond's ai-provider selectors) are
 * not forwarded, so a call that sets them keeps running on the hosted default
 * instead of failing.
 */
export class MoleculeSummarizationProvider implements AISummarizationProvider {
  readonly name = 'molecule'

  private readonly apiKey: string
  private readonly servicesUrl: string
  private readonly timeoutMs: number

  /**
   * Create the provider.
   *
   * @param config - Options; each falls back to its env var.
   */
  constructor(config: MoleculeSummarizationConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.MOLECULE_API_KEY ?? ''
    this.servicesUrl = resolveServicesUrl(
      config.servicesUrl ?? process.env.MOLECULE_SERVICES_URL ?? DEFAULT_SERVICES_URL,
    )
    this.timeoutMs = config.timeoutMs ?? 60_000
  }

  /**
   * Summarize the text.
   *
   * @param input - The source text plus optional shape/length/focus controls.
   * @returns The summary and metering metadata.
   */
  async summarize(input: SummarizeInput): Promise<SummarizeResult> {
    const limits = SUMMARIZATION_SERVICE_LIMITS
    if (typeof input.text !== 'string' || input.text.length === 0) {
      throw new MoleculeServiceError(
        '"text" must be non-empty text.',
        400,
        'hostedServices.error.invalidInput',
      )
    }
    if (input.text.length > limits.maxTextChars) {
      throw new MoleculeServiceError(
        `The text is ${input.text.length} characters; the limit is ${limits.maxTextChars}. ${HINTS[413]}`,
        413,
        'hostedServices.error.inputTooLarge',
      )
    }
    for (const [field, max] of [
      ['maxWords', limits.maxWords],
      ['maxLength', limits.maxLength],
      ['sentences', limits.maxSentences],
      ['attempts', limits.maxAttempts],
    ] as const) {
      const value = input[field]
      if (value !== undefined && (typeof value !== 'number' || !Number.isInteger(value))) {
        throw new MoleculeServiceError(
          `"${field}" must be an integer.`,
          400,
          'hostedServices.error.invalidInput',
        )
      }
      if (value !== undefined && (value < 1 || value > max)) {
        throw new MoleculeServiceError(
          `"${field}" must be between 1 and ${max}.`,
          400,
          'hostedServices.error.invalidInput',
        )
      }
    }
    if (
      input.focus !== undefined &&
      (typeof input.focus !== 'string' || input.focus.length > limits.maxFocusChars)
    ) {
      throw new MoleculeServiceError(
        `"focus" must be text of up to ${limits.maxFocusChars} characters.`,
        400,
        'hostedServices.error.invalidInput',
      )
    }
    if (input.format !== undefined && !(FORMATS as readonly string[]).includes(input.format)) {
      throw new MoleculeServiceError(
        `"format" must be one of: ${FORMATS.join(', ')}.`,
        400,
        'hostedServices.error.invalidInput',
      )
    }
    const body: Record<string, unknown> = {
      text: input.text,
      ...(input.maxLength !== undefined ? { maxLength: input.maxLength } : {}),
      ...(input.maxWords !== undefined ? { maxWords: input.maxWords } : {}),
      ...(input.sentences !== undefined ? { sentences: input.sentences } : {}),
      ...(input.attempts !== undefined ? { attempts: input.attempts } : {}),
      ...(input.format !== undefined ? { format: input.format } : {}),
      ...(input.focus !== undefined ? { focus: input.focus } : {}),
    }
    const signal = input.signal
      ? AbortSignal.any([input.signal, AbortSignal.timeout(this.timeoutMs)])
      : AbortSignal.timeout(this.timeoutMs)
    return this.request(body, signal)
  }

  /** One POST to the hosted service. */
  private async request(
    body: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<SummarizeResult> {
    if (!this.apiKey) {
      throw new MoleculeServiceError(
        'MOLECULE_API_KEY is not set. Create a project API key on molecule.dev (or with `mlcl apikey create`) and put it in the API .env.',
        401,
        'hostedServices.error.tokenInvalid',
      )
    }
    const response = await fetch(`${this.servicesUrl}/summarization/summarize`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
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
      const err = (typeof data === 'object' && data !== null ? data : {}) as {
        error?: unknown
        errorKey?: unknown
      }
      const hint = HINTS[response.status]
      const message = typeof err.error === 'string' ? err.error : 'error'
      throw new MoleculeServiceError(
        `molecule.dev summarization/summarize failed (${response.status}): ${message}${hint ? ` ${hint}` : ''}`,
        response.status,
        typeof err.errorKey === 'string' ? err.errorKey : undefined,
      )
    }
    if (
      typeof data !== 'object' ||
      data === null ||
      typeof (data as { summary?: unknown }).summary !== 'string'
    ) {
      throw new MoleculeServiceError(
        'molecule.dev returned a summarization response without a summary string.',
        response.status,
        'hostedServices.error.invalidResponse',
      )
    }
    return data as SummarizeResult
  }
}

/**
 * Create a hosted AI summarization provider.
 *
 * @param config - Options; each falls back to its env var.
 * @returns An `AISummarizationProvider` backed by molecule.dev.
 */
export function createProvider(config?: MoleculeSummarizationConfig): AISummarizationProvider {
  return new MoleculeSummarizationProvider(config)
}
