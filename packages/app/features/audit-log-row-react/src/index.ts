/**
 * Audit / activity / event-log row.
 *
 * Exports `<AuditLogRow>` and `AuditLogEntry` type.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { type AuditLogEntry, AuditLogRow } from '@molecule/app-audit-log-row-react'
 *
 * export function AuditLogPage() {
 *   const entries: AuditLogEntry[] = [
 *     { id: 'evt-002', actor: 'alice@example.com', action: 'updated', target: 'Invoice #1042', timestamp: '2 min ago', oldValue: 'Draft', newValue: 'Sent', environment: 'production' },
 *     { id: 'evt-001', actor: 'bob@example.com', action: 'created', target: 'Invoice #1042', timestamp: '1 h ago', traceId: 'trace-7f3a' },
 *   ]
 *   const [selectedId, setSelectedId] = useState<string | null>(null)
 *   return (
 *     <section>
 *       {entries.map((entry) => (
 *         <AuditLogRow key={entry.id} entry={entry} onClick={() => setSelectedId(entry.id)} />
 *       ))}
 *       <output>{selectedId}</output>
 *     </section>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Needs a ClassMap bond.** It styles itself via `getClassMap()`, which throws unless the app
 *   called `setClassMap(classMap)` (from `@molecule/app-ui`, e.g. with `@molecule/app-ui-tailwind`)
 *   at startup.
 * - One row only — render the list yourself and pass `key={entry.id}`; the component never reads
 *   `entry.id`. Every row carries the same `data-mol-id="audit-log-row"`.
 * - Display only: it does NOT fetch, record, or format anything. `timestamp` renders verbatim
 *   (format it first, e.g. "2 min ago"); the old → new line appears only when `oldValue` or
 *   `newValue` is set.
 * - With `onClick` the row becomes `role="button"` with `tabIndex=0` and Enter/Space activation;
 *   without it the row is plain, non-focusable text.
 *
 * @module
 */

export * from './AuditLogRow.js'
