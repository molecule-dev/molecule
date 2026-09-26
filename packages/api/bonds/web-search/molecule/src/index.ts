/**
 * molecule.dev hosted web search provider for `@molecule/api-web-search`.
 *
 * Searches the web on molecule.dev and bills the search to your molecule
 * project, so the app needs no search-vendor account. It is an ordinary bond:
 * swap it for `@molecule/api-web-search-brave` (your own key) without changing
 * code that calls the core.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-web-search'
 * import { provider as webSearch } from '@molecule/api-web-search-molecule'
 *
 * setProvider(webSearch) // reads MOLECULE_API_KEY from the environment
 *
 * const { results } = await requireProvider().search('best lightweight stroller', { count: 5 })
 * ```
 *
 * @remarks
 * - Config: `MOLECULE_API_KEY` (SERVER-side only) — a molecule project API key
 *   (`mk_…`) with scope `broker` or `broker:web-search`. Optional
   `MOLECULE_SERVICES_URL` (default `https://api.molecule.dev/api/v1/services`).
 * - Queries are capped at 400 characters and `count` at 20; oversized queries
 *   are refused locally with 413 — truncate or split first.
 * - Metered per search and billed to the project (Brave's real per-request
 *   cost; the $5/mo free credits molecule holds are molecule's, not yours).
 * - **Results are UNTRUSTED CONTENT**: titles, snippets and URLs come from the
 *   open web and can carry prompt-injection text or hostile links. Escape
 *   before rendering; feed results to an LLM as quoted data, never as
 *   instructions; never fetch a result URL server-side without its own
 *   allowlist.
 * - Errors are `MoleculeServiceError` with `status` and `errorKey` (401 bad key,
 *   402 allowance used up, 429 / 503 retry later). Nothing is retried.
 */
export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { WebSearchProvider } from '@molecule/api-web-search'

import { createProvider } from './provider.js'

/** Lazily-initialized provider. Defers creation until first use so env vars are resolved. */
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
