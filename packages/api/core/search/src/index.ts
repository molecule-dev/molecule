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
 * import { deleteDocument, hasProvider, index, search, setProvider } from '@molecule/api-search'
 * import { createProvider } from '@molecule/api-search-meilisearch'
 *
 * // Startup: bond the engine ONLY when one is provisioned — unbonded, search() throws.
 * if (process.env.MEILISEARCH_URL) {
 *   setProvider(
 *     createProvider({
 *       host: process.env.MEILISEARCH_URL,
 *       apiKey: process.env.MEILISEARCH_API_KEY ?? '',
 *     }),
 *   )
 * }
 *
 * // Write path: the index starts EMPTY — index on every create/update, delete on delete.
 * if (hasProvider()) {
 *   await index('products', 'p1', { name: 'Blue Widget', category: 'tools', price: 9.99 })
 *   await index('products', 'p2', { name: 'Red Wagon', category: 'toys', price: 49 })
 *   await deleteDocument('products', 'p2')
 * }
 *
 * // Read path: '' = browse everything; null = no engine → fall back to a DataStore query.
 * const searchProducts = async (text: string) =>
 *   hasProvider() ? search('products', { text, page: 1, perPage: 20, highlight: true }) : null
 *
 * const results = await searchProducts('widget')
 * // results?.hits[0] → { id: 'p1', score, document: { name: 'Blue Widget', … }, highlights }
 * ```
 *
 * @remarks
 * - **A `search()` route needs BOTH halves wired, or it ships dead.** (1) The
 *   index starts EMPTY — you must `index(collection, id, doc)` each record on
 *   create/update (and `deleteDocument()` on delete), or a query returns zero
 *   hits forever (nothing was ever indexed). (2) The engine can be ABSENT —
 *   unbonded, or no service URL in dev/CI/sandboxes — so a bare `search()`
 *   throws and the endpoint 500s. Guard and degrade: call `search()` only when
 *   `hasProvider()` is true, wrap it in try/catch, and on absence or failure
 *   fall back to a DataStore query — `findMany(coll, { where: [{ field,
 *   operator: 'ilike', value: `%${text}%` }] })` — so the feature works WITH or
 *   WITHOUT the engine. For a small, already-loaded list, filtering client-side
 *   is fine — just don't ship a `search()` route no page calls and no writer
 *   indexes.
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
