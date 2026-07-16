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
 *
 * @remarks
 * - **Decide failure behavior per call site.** `log()` throws when no provider is
 *   bonded and rejects when the provider fails — `await` it where the audit record
 *   is a hard requirement (fail the operation), or `.catch()`-and-log where it is
 *   best-effort telemetry. Never leave a bare fire-and-forget promise.
 * - **The export function is `auditExport(options, format)`** (`'csv' | 'json'`,
 *   returns a `Buffer`) — named to avoid the reserved word `export`.
 * - **Record entries server-side, in the handler that performs the action** — never
 *   from the client (an endpoint that writes caller-supplied entries lets anyone
 *   forge the trail). Gate `query`/`auditExport` endpoints behind admin-level
 *   permissions.
 * - **Log identifiers and outcomes, not payloads.** `details` is persisted verbatim
 *   and readable by anyone who can query the trail — no secrets, tokens, or raw PII.
 * - `query()` paginates with 1-based `page` + `perPage` and returns
 *   `PaginatedResult` (`data`, `total`, `page`, `perPage`).
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
