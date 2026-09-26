/**
 * molecule.dev hosted web search.
 *
 * `search` calls `POST <servicesUrl>/web-search/search` with the project's API
 * key. The response is the core's `WebSearchResult`.
 *
 * @module
 */

import type { WebSearchOptions, WebSearchProvider, WebSearchResult } from '@molecule/api-web-search'

import type { MoleculeWebSearchConfig } from './types.js'

/** Default hosted services base URL. */
export const DEFAULT_SERVICES_URL = 'https://api.molecule.dev/api/v1/services'

/** Per-request limits of the hosted service. */
export const WEB_SEARCH_SERVICE_LIMITS = {
  maxQueryChars: 400,
  maxCount: 20,
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
  401: 'Check MOLECULE_API_KEY: it must be a molecule project API key with the "broker" or "broker:web-search" scope, and not revoked.',
  402: "The molecule project's owner has used the included allowance. Enable usage billing on molecule.dev, or bond another search provider.",
  413: 'Queries are limited to 400 characters.',
  429: 'Too many requests for this project right now. Slow down and retry.',
  503: 'molecule.dev has paused this service briefly. Retry after the Retry-After delay.',
}

/**
 * Web search provider backed by molecule.dev's hosted service.
 */
export class MoleculeWebSearchProvider implements WebSearchProvider {
  readonly name = 'molecule'

  private readonly apiKey: string
  private readonly servicesUrl: string
  private readonly timeoutMs: number

  /**
   * Create the provider.
   *
   * @param config - Options; each falls back to its env var.
   */
  constructor(config: MoleculeWebSearchConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.MOLECULE_API_KEY ?? ''
    this.servicesUrl = (
      config.servicesUrl ??
      process.env.MOLECULE_SERVICES_URL ??
      DEFAULT_SERVICES_URL
    ).replace(/\/+$/, '')
    this.timeoutMs = config.timeoutMs ?? 15_000
  }

  /**
   * Search the web.
   *
   * @param query - The search query (at most 400 characters).
   * @param options - Count and localization hints.
   * @returns Results in the provider's relevance order.
   */
  async search(query: string, options?: WebSearchOptions): Promise<WebSearchResult> {
    if (query.length > WEB_SEARCH_SERVICE_LIMITS.maxQueryChars) {
      throw new MoleculeServiceError(
        `The query is ${query.length} characters. ${HINTS[413]}`,
        413,
        'hostedServices.error.inputTooLarge',
      )
    }
    return this.request({
      query,
      ...(options?.count !== undefined ? { count: options.count } : {}),
      ...(options?.country ? { country: options.country } : {}),
      ...(options?.searchLang ? { searchLang: options.searchLang } : {}),
    })
  }

  /** One POST to the hosted service. */
  private async request(body: Record<string, unknown>): Promise<WebSearchResult> {
    if (!this.apiKey) {
      throw new MoleculeServiceError(
        'MOLECULE_API_KEY is not set. Create a project API key on molecule.dev (or with `mlcl apikey create`) and put it in the API .env.',
        401,
        'hostedServices.error.tokenInvalid',
      )
    }
    const response = await fetch(`${this.servicesUrl}/web-search/search`, {
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
        `molecule.dev web-search/search failed (${response.status}): ${err.error ?? 'error'}${hint ? ` ${hint}` : ''}`,
        response.status,
        err.errorKey,
      )
    }
    return data as WebSearchResult
  }
}

/**
 * Create a hosted web search provider.
 *
 * @param config - Options; each falls back to its env var.
 * @returns A `WebSearchProvider` backed by molecule.dev.
 */
export function createProvider(config?: MoleculeWebSearchConfig): WebSearchProvider {
  return new MoleculeWebSearchProvider(config)
}
