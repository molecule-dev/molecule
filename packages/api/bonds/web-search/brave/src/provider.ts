/**
 * Brave Search implementation of WebSearchProvider.
 *
 * Calls Brave's Web Search endpoint (`GET /res/v1/web/search`) with the
 * account's subscription token and maps `web.results` into the core's result
 * shape. Brave's plan includes free monthly credits; spend beyond them bills
 * the account per 1,000 requests (the dashboard shows the rate).
 *
 * @module
 */

import type { WebSearchOptions, WebSearchProvider, WebSearchResult } from '@molecule/api-web-search'

import type { BraveWebSearchConfig } from './types.js'

/** The core's query bound; Brave accepts long queries but URLs do not. */
const MAX_QUERY_CHARS = 400

/** Brave rejects result counts above 20. */
const MAX_COUNT = 20

/** Error thrown when the search endpoint refuses or fails. */
export class BraveWebSearchError extends Error {
  /** HTTP status from Brave (0 when the request never completed). */
  readonly status: number

  /**
   * Create the error.
   *
   * @param message - Human-readable message.
   * @param status - HTTP status.
   */
  constructor(message: string, status: number) {
    super(message)
    this.name = 'BraveWebSearchError'
    this.status = status
  }
}

/**
 * Web search provider backed by the Brave Search API.
 */
export class BraveWebSearchProvider implements WebSearchProvider {
  readonly name = 'brave'

  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly defaults: { count?: number; country?: string; searchLang?: string }

  /**
   * Create the provider.
   *
   * @param config - Options; each falls back to an env var or default.
   */
  constructor(config: BraveWebSearchConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.BRAVE_SEARCH_API_KEY ?? ''
    this.baseUrl = (config.baseUrl ?? 'https://api.search.brave.com').replace(/\/+$/, '')
    this.timeoutMs = config.timeoutMs ?? 15_000
    this.defaults = { count: config.count, country: config.country, searchLang: config.searchLang }
  }

  /**
   * Search the web.
   *
   * @param query - The search query (at most 400 characters).
   * @param options - Count (1–20) and localization hints.
   * @returns Results in Brave's relevance order.
   */
  async search(query: string, options?: WebSearchOptions): Promise<WebSearchResult> {
    if (typeof query !== 'string' || query.trim().length === 0) {
      throw new BraveWebSearchError('"query" must be non-empty text.', 0)
    }
    if (query.length > MAX_QUERY_CHARS) {
      throw new BraveWebSearchError(
        `The query is ${query.length} characters; the limit is ${MAX_QUERY_CHARS}.`,
        0,
      )
    }
    const count = Math.max(1, Math.min(MAX_COUNT, options?.count ?? this.defaults.count ?? 5))
    const params = new URLSearchParams({ q: query, count: String(count) })
    const country = options?.country ?? this.defaults.country
    const searchLang = options?.searchLang ?? this.defaults.searchLang
    if (country) params.set('country', country)
    if (searchLang) params.set('search_lang', searchLang)

    if (!this.apiKey) {
      throw new BraveWebSearchError(
        'BRAVE_SEARCH_API_KEY is not set. Create a subscription at https://brave.com/search/api/ and put the key in the API .env.',
        0,
      )
    }
    const response = await fetch(`${this.baseUrl}/res/v1/web/search?${params}`, {
      headers: { Accept: 'application/json', 'X-Subscription-Token': this.apiKey },
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    const text = await response.text()
    if (!response.ok) {
      throw new BraveWebSearchError(
        `Brave web search failed (${response.status}): ${text.slice(0, 200)}`,
        response.status,
      )
    }
    let data: {
      query?: { original?: string }
      web?: { results?: Array<{ title?: string; url?: string; description?: string }> }
    }
    try {
      data = JSON.parse(text)
    } catch (_error) {
      // A proxy/gateway error page, not JSON: report the status, not the body.
      throw new BraveWebSearchError(
        `Brave returned ${response.status} with a non-JSON body.`,
        response.status,
      )
    }
    const results = (data.web?.results ?? []).map((r) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      ...(r.description ? { description: r.description } : {}),
    }))
    return { query: data.query?.original ?? query, results }
  }
}

/**
 * Create a Brave web search provider.
 *
 * @param config - Options; each falls back to an env var or default.
 * @returns A `WebSearchProvider` backed by the Brave Search API.
 */
export function createProvider(config?: BraveWebSearchConfig): WebSearchProvider {
  return new BraveWebSearchProvider(config)
}

/** Lazily-initialized provider singleton. Defers creation until first use so env vars are resolved. */
let _provider: WebSearchProvider | null = null
/**
 * The provider implementation (wire with `setProvider`).
 */
export const provider: WebSearchProvider = new Proxy({} as WebSearchProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
