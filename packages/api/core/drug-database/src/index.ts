/**
 * Provider-agnostic drug-database interface for molecule.dev.
 *
 * Defines the {@link DrugDatabaseProvider} interface for drug catalog +
 * interaction lookups (free-text search, full-detail lookup, interaction
 * checking, NDC enumeration). Bond packages (RxNorm, openFDA, etc.)
 * implement this interface. Application code uses the convenience
 * functions (`searchDrug`, `getDrug`, `checkInteractions`, `getNDCs`)
 * which delegate to the bonded provider.
 *
 * @example
 * ```typescript
 * import { setProvider, searchDrug, checkInteractions } from '@molecule/api-drug-database'
 * import { provider as rxnorm } from '@molecule/api-drug-database-rxnorm'
 *
 * setProvider(rxnorm)
 * const matches = await searchDrug('metformin')
 * const interactions = await checkInteractions(['860975', '1191'])
 * ```
 *
 * @remarks
 * - **An empty `checkInteractions()` result is NOT a safety verdict.** The
 *   contract lets providers degrade to `[]` when their upstream lacks
 *   interaction coverage — render it as "no known interactions found" with any
 *   medical disclaimer intact, never as "safe to combine".
 * - **`DrugId` is provider-specific** (e.g. an RxNorm RXCUI). Obtain ids from
 *   `searchDrug()` results or store what the bonded provider returned — never
 *   hardcode ids from a different vendor's catalogue.
 * - **Server-side only.** Lookups belong in API handlers; expose app endpoints
 *   for the UI. Upstream medical APIs are rate-limited — debounce user-typed
 *   search and cache `getDrug()` detail lookups.
 * - `getDrug()` resolves `null` for an unknown id — map it to a 404, not a 500.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
