/**
 * molecule.dev hosted embeddings provider.
 *
 * Calls `POST <servicesUrl>/embeddings/embed` with the project's API key. The
 * request and response are the `@molecule/api-ai-embeddings` core's own
 * `EmbedParams` / `EmbeddingResult`, so this bond is a thin client: it splits
 * large inputs into requests the service accepts, sums usage, and turns error
 * responses into errors that say what to do.
 *
 * @module
 */

import type {
  AIEmbeddingsProvider,
  EmbeddingResult,
  EmbedParams,
} from '@molecule/api-ai-embeddings'

import type { MoleculeEmbeddingsConfig } from './types.js'

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

/**
 * Per-request limits of the hosted service. Larger inputs are split into
 * several requests by this provider, never sent whole.
 */
export const SERVICE_LIMITS = {
  maxInputs: 256,
  maxCharsPerInput: 32_000,
  maxTotalChars: 400_000,
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
  401: 'Check MOLECULE_API_KEY: it must be a molecule project API key with the "broker" or "broker:embeddings" scope, and not revoked.',
  402: "The molecule project's owner has used the included allowance. Enable usage billing on molecule.dev, or bond another embeddings provider.",
  429: 'Too many requests for this project right now. Slow down and retry.',
  503: 'molecule.dev has paused this service briefly. Retry after the Retry-After delay.',
}

/**
 * Split inputs into batches that each fit the service's per-request limits.
 *
 * @param inputs - The texts to embed.
 * @returns Batches in order.
 */
export function batchInputs(inputs: string[]): string[][] {
  const batches: string[][] = []
  let current: string[] = []
  let chars = 0
  for (const text of inputs) {
    if (text.length > SERVICE_LIMITS.maxCharsPerInput) {
      throw new MoleculeServiceError(
        `One input is ${text.length} characters; the hosted service accepts at most ${SERVICE_LIMITS.maxCharsPerInput} per input. Split long documents into chunks before embedding.`,
        413,
        'hostedServices.error.inputTooLarge',
      )
    }
    if (
      current.length > 0 &&
      (current.length >= SERVICE_LIMITS.maxInputs ||
        chars + text.length > SERVICE_LIMITS.maxTotalChars)
    ) {
      batches.push(current)
      current = []
      chars = 0
    }
    current.push(text)
    chars += text.length
  }
  if (current.length > 0) batches.push(current)
  return batches
}

/**
 * Embeddings through molecule.dev's hosted service.
 */
export class MoleculeEmbeddingsProvider implements AIEmbeddingsProvider {
  readonly name = 'molecule'

  private readonly apiKey: string
  private readonly servicesUrl: string
  private readonly defaultModel: string
  private readonly defaultDimensions: number | undefined
  private readonly timeoutMs: number

  /**
   * Create the provider.
   *
   * @param config - Options; each falls back to its env var.
   */
  constructor(config: MoleculeEmbeddingsConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.MOLECULE_API_KEY ?? ''
    this.servicesUrl = resolveServicesUrl(
      config.servicesUrl ?? process.env.MOLECULE_SERVICES_URL ?? DEFAULT_SERVICES_URL,
    )
    this.defaultModel = config.defaultModel ?? 'text-embedding-3-small'
    this.defaultDimensions = config.dimensions
    this.timeoutMs = config.timeoutMs ?? 60_000
  }

  /**
   * Embed one or more texts. Inputs beyond one request's limits are sent as
   * several requests, in order, and their usage is summed.
   *
   * @param params - Input text(s), model and dimensions.
   * @returns Vectors in input order, the model that served them, and usage.
   */
  async embed(params: EmbedParams): Promise<EmbeddingResult> {
    if (!this.apiKey) {
      throw new MoleculeServiceError(
        'MOLECULE_API_KEY is not set. Create a project API key on molecule.dev (or with `mlcl apikey create`) and put it in the API .env.',
        401,
        'hostedServices.error.tokenInvalid',
      )
    }
    const inputs = typeof params.input === 'string' ? [params.input] : params.input
    if (inputs.length === 0)
      return {
        embeddings: [],
        model: params.model ?? this.defaultModel,
        usage: { promptTokens: 0, totalTokens: 0 },
      }

    const model = params.model ?? this.defaultModel
    const dimensions = params.dimensions ?? this.defaultDimensions
    const result: EmbeddingResult = {
      embeddings: [],
      model,
      usage: { promptTokens: 0, totalTokens: 0 },
    }
    for (const batch of batchInputs(inputs)) {
      const part = await this.request({
        input: batch,
        model,
        ...(dimensions ? { dimensions } : {}),
      })
      result.embeddings.push(...part.embeddings)
      result.model = part.model
      result.usage.promptTokens += part.usage.promptTokens
      result.usage.totalTokens += part.usage.totalTokens
    }
    return result
  }

  /**
   * Embed a single query string.
   *
   * @param text - The query.
   * @returns Its vector.
   */
  async embedQuery(text: string): Promise<number[]> {
    const { embeddings } = await this.embed({ input: text })
    return embeddings[0]
  }

  /**
   * Embed many documents.
   *
   * @param texts - The documents.
   * @returns One vector per document, in order.
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    const { embeddings } = await this.embed({ input: texts })
    return embeddings
  }

  /** One POST to the hosted service. */
  private async request(body: EmbedParams): Promise<EmbeddingResult> {
    const response = await fetch(`${this.servicesUrl}/embeddings/embed`, {
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
        `molecule.dev embeddings failed (${response.status}): ${err.error ?? 'error'}${hint ? ` ${hint}` : ''}`,
        response.status,
        err.errorKey,
      )
    }
    return data as EmbeddingResult
  }
}

/**
 * Create a hosted embeddings provider.
 *
 * @param config - Options; each falls back to its env var.
 * @returns An `AIEmbeddingsProvider` backed by molecule.dev.
 */
export function createProvider(config?: MoleculeEmbeddingsConfig): AIEmbeddingsProvider {
  return new MoleculeEmbeddingsProvider(config)
}
