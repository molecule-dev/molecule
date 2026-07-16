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
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Every auditable action the app defines (login, permission/role change,
 *   delete, export, settings change) performed in the UI actually WRITES an
 *   entry — `log()` is called from the handler that does the work, not merely
 *   defined. Confirm the entry exists via the audit view or a `query()`.
 * - [ ] Each written entry captures the real action + resource (+ resourceId)
 *   and a server-assigned timestamp — not a placeholder or the wrong resource.
 * - [ ] The recorded `actor` is the authenticated user from the server session:
 *   two different signed-in users produce two different actors, never a
 *   hardcoded/anonymous/client-supplied id.
 * - [ ] The audit log view (if the app exposes one) lists entries with correct
 *   details, and filtering by actor/action/resource/date range (`query`)
 *   narrows the results as expected.
 * - [ ] Reading or exporting the trail (`query`/`auditExport`) is admin-only — a
 *   normal user gets 403 / no UI and cannot read everyone else's activity.
 * - [ ] History is append-only / tamper-evident: no endpoint edits or deletes a
 *   past entry to cover tracks (the interface exposes only log/query/export) —
 *   try to mutate one and confirm there is no route.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
