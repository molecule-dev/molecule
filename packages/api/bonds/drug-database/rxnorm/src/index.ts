/**
 * RxNorm drug-database provider for molecule.dev.
 *
 * Implements the `DrugDatabaseProvider` interface against the public
 * NIH National Library of Medicine RxNav REST API at
 * `https://rxnav.nlm.nih.gov/REST/`. The endpoint is keyless and free
 * for any use.
 *
 * The NLM is deprecating the RxNorm interactions endpoint
 * (`/interaction/list.json`); this provider degrades gracefully, mapping
 * `404` / `410` / `503` responses from that endpoint onto an empty
 * `DrugInteraction[]` rather than throwing.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-drug-database'
 * import { provider } from '@molecule/api-drug-database-rxnorm'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
