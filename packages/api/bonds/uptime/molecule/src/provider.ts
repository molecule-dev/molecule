/**
 * molecule.dev hosted uptime.
 *
 * `probe` asks molecule.dev to request the URL from ITS infrastructure — the
 * render machine the hosted web content, screenshots and PDF services run
 * on, behind its egress guard (public addresses only, DNS verified per
 * dial) — and returns the verdict: status, latency, the final HTTP status,
 * redirect count and the TLS certificate's remaining lifetime.
 *
 * @module
 */

import type { UptimeProbeResult, UptimeProbeSpec, UptimeProvider } from '@molecule/api-uptime'
import { validateProbeSpec } from '@molecule/api-uptime'

import type { MoleculeUptimeConfig } from './types.js'

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
  401: 'Check MOLECULE_API_KEY: it must be a molecule project API key with the "broker" or "broker:uptime" scope, and not revoked.',
  402: "The molecule project's owner has used the included allowance. Enable usage billing on molecule.dev, or bond your own provider (e.g. @molecule/api-uptime-fetch).",
  413: 'The URL is limited to 2,048 characters and the probe budget (timeoutMs) to 30,000.',
  429: 'Too many requests for this project right now. Slow down and retry.',
  503: 'molecule.dev has paused this service briefly. Retry after the Retry-After delay.',
}

/**
 * Uptime provider backed by molecule.dev's hosted service.
 *
 * The hosted machine probes HTTP(S) targets from PUBLIC addresses only —
 * loopback, private-network and link-local targets are refused before any
 * connection — so a user-supplied URL cannot reach your network from
 * molecule's render machine, and a probe of YOUR OWN site reads the public
 * internet's view of it, not your process's.
 */
export class MoleculeUptimeProvider implements UptimeProvider {
  readonly name = 'molecule'

  private readonly apiKey: string
  private readonly servicesUrl: string
  private readonly timeoutMs: number

  /**
   * Create the provider.
   *
   * @param config - Options; each falls back to its env var.
   */
  constructor(config: MoleculeUptimeConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.MOLECULE_API_KEY ?? ''
    this.servicesUrl = resolveServicesUrl(
      config.servicesUrl ?? process.env.MOLECULE_SERVICES_URL ?? DEFAULT_SERVICES_URL,
    )
    this.timeoutMs = config.timeoutMs ?? 45_000
  }

  /**
   * Probes one URL on the hosted service and returns the verdict.
   *
   * @param spec - What to probe and how to judge it.
   * @returns The probe's outcome — a `down` site included.
   */
  async probe(spec: UptimeProbeSpec): Promise<UptimeProbeResult> {
    // The service limits are mirrored LOCALLY (the core's validator is the
    // same contract the handler enforces), so a bad call never leaves the
    // process.
    const checked = validateProbeSpec(spec)
    if (!checked.ok) {
      throw new MoleculeServiceError(checked.message, 400, 'hostedServices.error.invalidInput')
    }
    return this.request('uptime/probe', checked.spec)
  }

  /** One POST to the hosted service. */
  private async request(path: string, body: Record<string, unknown>): Promise<UptimeProbeResult> {
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
    const result = data as UptimeProbeResult
    if (typeof result.status !== 'string' || typeof result.checkedAt !== 'string') {
      throw new MoleculeServiceError(
        'molecule.dev returned no probe verdict.',
        502,
        'hostedServices.error.upstreamFailed',
      )
    }
    return result
  }
}

/**
 * Create a hosted uptime provider.
 *
 * @param config - Options; each falls back to its env var.
 * @returns A `UptimeProvider` backed by molecule.dev.
 */
export function createProvider(config?: MoleculeUptimeConfig): UptimeProvider {
  return new MoleculeUptimeProvider(config)
}
