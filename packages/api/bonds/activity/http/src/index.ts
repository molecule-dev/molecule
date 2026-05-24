/**
 * HTTP activity sink for molecule.dev.
 *
 * POSTs captured activity events to the molecule.dev activity endpoint for
 * sandboxed/managed apps. Best-effort — never throws on failure.
 *
 * @example
 * ```typescript
 * import { setSink } from '@molecule/api-activity'
 * import { provider } from '@molecule/api-activity-http'
 *
 * setSink(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
