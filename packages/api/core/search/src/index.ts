/**
 * Provider-agnostic full-text search interface for molecule.dev.
 *
 * Defines the `SearchProvider` interface for indexing, querying, and
 * autocomplete suggestions. Bond packages (Elasticsearch, Meilisearch,
 * Typesense, PostgreSQL, etc.) implement this interface. Application code
 * uses the convenience functions (`search`, `index`, `suggest`, etc.) which
 * delegate to the bonded provider.
 *
 * @example
 * ```typescript
 * import { setProvider, search, index, suggest } from '@molecule/api-search'
 * import { provider as elasticsearch } from '@molecule/api-search-elasticsearch'
 *
 * setProvider(elasticsearch)
 * await index('products', '1', { name: 'Widget', price: 9.99 })
 * const results = await search('products', { text: 'widget', highlight: true })
 * const suggestions = await suggest('products', 'wid', { limit: 5 })
 * ```
 *
 * @remarks
 * - **Empty/whitespace-only `SearchQuery.text` is "browse" mode** — every
 *   bundled bond matches ALL documents (filters/sort/pagination still
 *   apply) rather than erroring or returning zero hits. Build an initial
 *   "show everything" view with `search('products', { text: '' })` instead
 *   of special-casing an empty search box in application code.
 * - Bonds diverge on details the core contract does NOT standardize:
 *   facet support (PostgreSQL supports it via an extra `GROUP BY` query per
 *   field; the engine-backed bonds use native aggregations), highlight
 *   result shape (per-field for Elasticsearch/Meilisearch/Typesense vs. a
 *   single `_content` key for PostgreSQL), and filter semantics (exact
 *   `term`/`=` matching everywhere — declare filterable string fields as
 *   `keyword` for Elasticsearch). Check the bond's own module `@remarks`
 *   before debugging a result that looks wrong only on one provider.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Searching a term that exists in seeded data returns the matching records
 *   in the results UI.
 * - [ ] An empty search box shows the browse-everything view (empty `text` matches
 *   ALL documents by contract) — not zero results and not an error.
 * - [ ] A term with no matches shows a clear "no results" state.
 * - [ ] Index-on-write is wired: create a new record through the UI, then search
 *   for it — it must be findable without a manual reindex.
 * - [ ] If autocomplete/suggestions are surfaced, typing a prefix of a known
 *   record shows relevant suggestions.
 * - [ ] Search is scoped to the caller: one user's search never returns another
 *   user's private records.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
