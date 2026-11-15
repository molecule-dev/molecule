/**
 * Solid audit / activity / event-log row.
 *
 * Exports `<AuditLogRow>` and the `AuditLogEntry` type — the Solid counterpart
 * of `@molecule/app-audit-log-row-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { render } from 'solid-js/web'
 * import { AuditLogRow } from '@molecule/app-audit-log-row-solid'
 *
 * render(
 *   () => (
 *     <AuditLogRow
 *       entry={{
 *         id: 'evt-001',
 *         actor: 'alice@example.com',
 *         action: 'updated',
 *         target: 'Invoice #1042',
 *         timestamp: '2 min ago',
 *         oldValue: 'Draft',
 *         newValue: 'Sent',
 *       }}
 *       onClick={() => openDetail('evt-001')}
 *     />
 *   ),
 *   document.getElementById('root')!,
 * )
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap — rendering throws otherwise.
 * - `entry` fields are display nodes: pass pre-formatted, translated values.
 *   Solid JSX works anywhere a string does.
 * - With `onClick` the row carries `role="button"` + `tabindex="0"` and Enter
 *   / Space activate it, like a native button; without it the row is static.
 *
 * @module
 */

export * from './AuditLogRow.jsx'
export * from './types.js'
