/**
 * molecule.dev hosted web content.
 *
 * `fetch` reads a URL on molecule.dev's render machine — the same
 * headless-Chrome machine the hosted screenshots and PDF services run on,
 * behind its egress guard (public addresses only, DNS verified per dial) —
 * and returns the page's readable content: the article as markdown/text plus
 * title, description and optional links. `extract` reads HTML the caller
 * already has. `mode: 'browser'` renders the page with JavaScript enabled;
 * `'raw'` (default) reads the served markup without running its scripts.
 *
 * @module
 */

import type {
  WebContentOptions,
  WebContentProvider,
  WebContentResult,
} from '@molecule/api-web-content'

import type { MoleculeWebContentConfig } from './types.js'

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
export const WEB_CONTENT_SERVICE_LIMITS = {
  maxUrlChars: 2048,
  maxHtmlChars: 2_000_000,
  maxContentChars: 500_000,
  maxLinks: 200,
  maxSettleMs: 5000,
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
  401: 'Check MOLECULE_API_KEY: it must be a molecule project API key with the "broker" or "broker:web-content" scope, and not revoked.',
  402: "The molecule project's owner has used the included allowance. Enable usage billing on molecule.dev, or bond your own provider (e.g. @molecule/api-web-content-readability).",
  413: 'HTML is limited to 2,000,000 characters, the URL to 2,048, and the returned content to 500,000.',
  429: 'Too many requests for this project right now. Slow down and retry.',
  503: 'molecule.dev has paused this service briefly. Retry after the Retry-After delay.',
}

/**
 * Web content provider backed by molecule.dev's hosted service.
 *
 * The hosted machine fetches HTTP(S) targets from PUBLIC addresses only —
 * loopback, private-network and link-local targets are refused before any
 * connection — so a user-supplied URL cannot reach your network from
 * molecule's render machine.
 */
export class MoleculeWebContentProvider implements WebContentProvider {
  readonly name = 'molecule'

  private readonly apiKey: string
  private readonly servicesUrl: string
  private readonly timeoutMs: number

  /**
   * Create the provider.
   *
   * @param config - Options; each falls back to its env var.
   */
  constructor(config: MoleculeWebContentConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.MOLECULE_API_KEY ?? ''
    this.servicesUrl = resolveServicesUrl(
      config.servicesUrl ?? process.env.MOLECULE_SERVICES_URL ?? DEFAULT_SERVICES_URL,
    )
    this.timeoutMs = config.timeoutMs ?? 60_000
  }

  /**
   * Reads one page on the hosted service and returns its readable content.
   *
   * @param source - The page to read (`url` required).
   * @param options - Read options (mode, format, links, settle).
   * @returns The readable content.
   */
  async fetch(
    source: { url: string } & Partial<{ html: string; baseUrl: string }>,
    options?: WebContentOptions,
  ): Promise<WebContentResult> {
    const plan = this.plan(source, options)
    if (plan.url === undefined) {
      throw new MoleculeServiceError(
        'Pass exactly one of "url" or "html".',
        400,
        'hostedServices.error.invalidInput',
      )
    }
    return this.request('web-content/fetch', {
      url: plan.url,
      ...(plan.options !== undefined ? { options: plan.options } : {}),
    })
  }

  /**
   * Extracts readable content from HTML the caller already has — no page is
   * fetched.
   *
   * @param source - The HTML to read (`html` required; optional `baseUrl`).
   * @param options - Extract options (format, links).
   * @returns The readable content.
   */
  async extract(
    source: { html: string; baseUrl?: string } & Partial<{ url: string }>,
    options?: WebContentOptions,
  ): Promise<WebContentResult> {
    const plan = this.plan(source, options)
    if (plan.html === undefined) {
      throw new MoleculeServiceError(
        'Pass exactly one of "url" or "html".',
        400,
        'hostedServices.error.invalidInput',
      )
    }
    return this.request('web-content/extract', {
      html: plan.html,
      ...(plan.baseUrl !== undefined ? { baseUrl: plan.baseUrl } : {}),
      ...(plan.options !== undefined ? { options: plan.options } : {}),
    })
  }

  /** Validates one read locally, so a bad call never leaves the process. */
  private plan(
    source: { url?: string; html?: string; baseUrl?: string },
    options?: WebContentOptions,
  ): { url?: string; html?: string; baseUrl?: string; options?: Record<string, unknown> } {
    if (typeof source !== 'object' || source === null) {
      throw new MoleculeServiceError(
        'Pass exactly one of "url" or "html".',
        400,
        'hostedServices.error.invalidInput',
      )
    }
    const { url, html, baseUrl } = source
    if ((typeof url === 'string') === (typeof html === 'string')) {
      throw new MoleculeServiceError(
        'Pass exactly one of "url" or "html".',
        400,
        'hostedServices.error.invalidInput',
      )
    }
    if (url !== undefined) {
      if (url.length === 0 || url.length > WEB_CONTENT_SERVICE_LIMITS.maxUrlChars) {
        throw new MoleculeServiceError(
          `"url" must be 1-${WEB_CONTENT_SERVICE_LIMITS.maxUrlChars} characters.`,
          400,
          'hostedServices.error.invalidInput',
        )
      }
      try {
        const parsed = new URL(url)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('scheme')
      } catch (_error) {
        // Intentional: the parse failure becomes the field error below.
        throw new MoleculeServiceError(
          '"url" must be an absolute http(s) URL.',
          400,
          'hostedServices.error.invalidInput',
        )
      }
    }
    if (html !== undefined) {
      if (html.length === 0) {
        throw new MoleculeServiceError(
          '"html" must be non-empty text.',
          400,
          'hostedServices.error.invalidInput',
        )
      }
      if (html.length > WEB_CONTENT_SERVICE_LIMITS.maxHtmlChars) {
        throw new MoleculeServiceError(
          `"html" is ${html.length} characters; the limit is ${WEB_CONTENT_SERVICE_LIMITS.maxHtmlChars}.`,
          413,
          'hostedServices.error.inputTooLarge',
        )
      }
    }
    if (baseUrl !== undefined) {
      try {
        const parsed = new URL(baseUrl)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('scheme')
      } catch (_error) {
        // Intentional: the parse failure becomes the field error below.
        throw new MoleculeServiceError(
          '"baseUrl" must be an absolute http(s) URL.',
          400,
          'hostedServices.error.invalidInput',
        )
      }
    }
    let out: Record<string, unknown> | undefined
    if (options !== undefined) {
      if (typeof options !== 'object' || options === null) {
        throw new MoleculeServiceError(
          '"options" must be an object.',
          400,
          'hostedServices.error.invalidInput',
        )
      }
      const o = options as Record<string, unknown>
      out = {}
      if (o.mode !== undefined) {
        if (o.mode !== 'raw' && o.mode !== 'browser') {
          throw new MoleculeServiceError(
            '"options.mode" must be "raw" or "browser".',
            400,
            'hostedServices.error.invalidInput',
          )
        }
        out.mode = o.mode
      }
      if (o.format !== undefined) {
        if (o.format !== 'markdown' && o.format !== 'text') {
          throw new MoleculeServiceError(
            '"options.format" must be "markdown" or "text".',
            400,
            'hostedServices.error.invalidInput',
          )
        }
        out.format = o.format
      }
      if (o.includeLinks !== undefined) {
        if (typeof o.includeLinks !== 'boolean') {
          throw new MoleculeServiceError(
            '"options.includeLinks" must be a boolean.',
            400,
            'hostedServices.error.invalidInput',
          )
        }
        out.includeLinks = o.includeLinks
      }
      if (o.settleMs !== undefined) {
        if (
          !Number.isInteger(o.settleMs) ||
          (o.settleMs as number) < 0 ||
          (o.settleMs as number) > WEB_CONTENT_SERVICE_LIMITS.maxSettleMs
        ) {
          throw new MoleculeServiceError(
            `"options.settleMs" must be an integer from 0 to ${WEB_CONTENT_SERVICE_LIMITS.maxSettleMs}.`,
            400,
            'hostedServices.error.invalidInput',
          )
        }
        out.settleMs = o.settleMs
      }
    }
    return { url, html, baseUrl, options: out }
  }

  /** One POST to the hosted service. */
  private async request(path: string, body: Record<string, unknown>): Promise<WebContentResult> {
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
    const result = data as WebContentResult
    if (typeof result.content !== 'string') {
      throw new MoleculeServiceError(
        'molecule.dev returned no content.',
        502,
        'hostedServices.error.upstreamFailed',
      )
    }
    return result
  }
}

/**
 * Create a hosted web content provider.
 *
 * @param config - Options; each falls back to its env var.
 * @returns A `WebContentProvider` backed by molecule.dev.
 */
export function createProvider(config?: MoleculeWebContentConfig): WebContentProvider {
  return new MoleculeWebContentProvider(config)
}
