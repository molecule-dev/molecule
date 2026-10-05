/**
 * molecule.dev hosted AI decisions.
 *
 * `decide` calls `POST <servicesUrl>/ai-decisions/decide` with the project's
 * API key. The response is the core's `DecideResult`.
 *
 * @module
 */

import type {
  AIDecisionsProvider,
  DecideInput,
  DecideResult,
  DecisionQuestion,
} from '@molecule/api-ai-decisions'

import type { MoleculeDecisionsConfig } from './types.js'

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
export const DECISIONS_SERVICE_LIMITS = {
  maxStateChars: 100_000,
  maxStateJsonBytes: 200_000,
  maxQuestions: 10,
  maxImages: 3,
  maxImageBytes: 2 * 1024 * 1024,
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
  401: 'Check MOLECULE_API_KEY: it must be a molecule project API key with the "broker" or "broker:ai-decisions" scope, and not revoked.',
  402: "The molecule project's owner has used the included allowance. Enable usage billing on molecule.dev, or bond another AI decisions provider.",
  413: 'The state, questions or images exceed the service limits (100k chars of text / 10 questions / 3 images of 2 MB).',
  429: 'Too many requests for this project right now. Slow down and retry.',
  503: 'molecule.dev has paused this service briefly. Retry after the Retry-After delay.',
}

/**
 * AI decisions provider backed by molecule.dev's hosted service.
 *
 * The model is the SERVICE's choice — `DecideInput.model` (a self-hosted
 * bond's checkpoint selector) is not forwarded, so a call that sets it keeps
 * running on the hosted default instead of failing.
 */
export class MoleculeDecisionsProvider implements AIDecisionsProvider {
  readonly name = 'molecule'

  private readonly apiKey: string
  private readonly servicesUrl: string
  private readonly timeoutMs: number

  /**
   * Create the provider.
   *
   * @param config - Options; each falls back to its env var.
   */
  constructor(config: MoleculeDecisionsConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.MOLECULE_API_KEY ?? ''
    this.servicesUrl = resolveServicesUrl(
      config.servicesUrl ?? process.env.MOLECULE_SERVICES_URL ?? DEFAULT_SERVICES_URL,
    )
    this.timeoutMs = config.timeoutMs ?? 30_000
  }

  /**
   * Decide: answer the questions about the state.
   *
   * @param input - The state, questions, optional images and confidence floor.
   * @returns Typed answers keyed like the questions, with probabilities.
   */
  async decide<Q extends Record<string, DecisionQuestion> = Record<string, DecisionQuestion>>(
    input: DecideInput<Q>,
  ): Promise<DecideResult<Q>> {
    const questionCount = Object.keys(input.questions ?? {}).length
    if (questionCount === 0) {
      throw new MoleculeServiceError(
        '"questions" must be a non-empty object keyed by question id.',
        400,
        'hostedServices.error.invalidInput',
      )
    }
    if (questionCount > DECISIONS_SERVICE_LIMITS.maxQuestions) {
      throw new MoleculeServiceError(
        `${questionCount} questions is over the limit of ${DECISIONS_SERVICE_LIMITS.maxQuestions}. ${HINTS[413]}`,
        413,
        'hostedServices.error.inputTooLarge',
      )
    }
    if (
      typeof input.state === 'string' &&
      input.state.length > DECISIONS_SERVICE_LIMITS.maxStateChars
    ) {
      throw new MoleculeServiceError(
        `The state is ${input.state.length} characters; the limit is ${DECISIONS_SERVICE_LIMITS.maxStateChars}.`,
        413,
        'hostedServices.error.inputTooLarge',
      )
    }
    const body: Record<string, unknown> = {
      state: input.state,
      questions: input.questions,
      ...(input.images ? { images: input.images } : {}),
      ...(input.minConfidence !== undefined ? { minConfidence: input.minConfidence } : {}),
    }
    const signal = input.signal
      ? AbortSignal.any([input.signal, AbortSignal.timeout(this.timeoutMs)])
      : AbortSignal.timeout(this.timeoutMs)
    return this.request(body, signal) as Promise<DecideResult<Q>>
  }

  /** One POST to the hosted service. */
  private async request(
    body: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<DecideResult<Record<string, DecisionQuestion>>> {
    if (!this.apiKey) {
      throw new MoleculeServiceError(
        'MOLECULE_API_KEY is not set. Create a project API key on molecule.dev (or with `mlcl apikey create`) and put it in the API .env.',
        401,
        'hostedServices.error.tokenInvalid',
      )
    }
    const response = await fetch(`${this.servicesUrl}/ai-decisions/decide`, {
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
      const err = data as { error?: string; errorKey?: string }
      const hint = HINTS[response.status]
      throw new MoleculeServiceError(
        `molecule.dev ai-decisions/decide failed (${response.status}): ${err.error ?? 'error'}${hint ? ` ${hint}` : ''}`,
        response.status,
        err.errorKey,
      )
    }
    return data as DecideResult<Record<string, DecisionQuestion>>
  }
}

/**
 * Create a hosted AI decisions provider.
 *
 * @param config - Options; each falls back to its env var.
 * @returns An `AIDecisionsProvider` backed by molecule.dev.
 */
export function createProvider(config?: MoleculeDecisionsConfig): AIDecisionsProvider {
  return new MoleculeDecisionsProvider(config)
}
