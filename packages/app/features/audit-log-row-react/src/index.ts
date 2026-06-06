/**
 * Audit / activity / event-log row.
 *
 * Exports `<AuditLogRow>` and `AuditLogEntry` type.
 *
 * @example
 * ```tsx
 * import { AuditLogRow } from '@molecule/app-audit-log-row-react'
 *
 * <AuditLogRow
 *   entry={{
 *     id: 'evt-001',
 *     actor: 'alice@example.com',
 *     action: 'updated',
 *     target: 'Invoice #1042',
 *     timestamp: '2 min ago',
 *     oldValue: 'Draft',
 *     newValue: 'Sent',
 *   }}
 *   onClick={() => openDetail('evt-001')}
 * />
 * ```
 *
 * @module
 */

export * from './AuditLogRow.js'
