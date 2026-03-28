/**
 * Audit core interface for molecule.dev.
 *
 * Provides the `AuditProvider` interface for recording and querying audit
 * trail entries. Bond a concrete provider (e.g. `@molecule/api-audit-database`,
 * `@molecule/api-audit-file`) at startup via `setProvider()`.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, log, query } from '@molecule/api-audit'
 * import { provider } from '@molecule/api-audit-database'
 *
 * // Wire the provider at startup
 * setProvider(provider)
 *
 * // Record an audit entry
 * await log({ actor: 'user:1', action: 'create', resource: 'project', resourceId: 'proj-42' })
 *
 * // Query audit records
 * const results = await query({ actor: 'user:1', page: 1, perPage: 20 })
 * ```
 */

export * from './provider.js'
export * from './types.js'
