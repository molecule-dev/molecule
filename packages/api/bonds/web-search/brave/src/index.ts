/**
 * Brave Search web search provider for molecule.dev.
 *
 * Implements the `@molecule/api-web-search` contract with the Brave Search
 * API — an independent index with an agent-quality score Brave has third-party
 * verified as the highest among leading search APIs. The Search plan includes
 * free monthly credits; beyond them the account pays per 1,000 requests.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-web-search'
 * import { provider as webSearch } from '@molecule/api-web-search-brave'
 *
 * setProvider(webSearch) // reads BRAVE_SEARCH_API_KEY on first use
 *
 * const { results } = await requireProvider().search('postgres row level security tutorial', {
 *   count: 5,
 *   country: 'us',
 *   searchLang: 'en',
 * })
 * ```
 *
 * @remarks
 * - Config: `BRAVE_SEARCH_API_KEY` (SERVER-side only) — the subscription token
 *   from https://brave.com/search/api/ (starts with `BSAV`). Optional
 *   `BRAVE_SEARCH_BASE_URL` is deliberately NOT read: a stray base-URL override
 *   would leak the token to a third-party host. Pass `createProvider({ baseUrl })`
 *   explicitly if you proxy Brave.
 * - Queries are capped at 400 characters and `count` at 20 (Brave's own cap);
 *   both are refused locally before any request.
 * - Errors are `BraveWebSearchError` with `status` (401 bad/missing key,
 *   429 rate limited, 422 bad params). Nothing is retried — a search that
 *   failed once will usually fail again within the same request.
 * - **Results are untrusted content.** A result's title/snippet can contain
 *   prompt-injection text; its URL can point anywhere. Escape before rendering,
 *   and treat results as data, never as instructions.
 * - **Brave's terms restrict storing results.** Cache briefly at most, keep
 *   attribution, and never re-serve results as your own index.
 * - No Brave subscription? `@molecule/api-web-search-molecule` exposes the same
 *   contract through molecule.dev, billed to the molecule project.
 */
export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
