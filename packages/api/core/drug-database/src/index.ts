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
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
