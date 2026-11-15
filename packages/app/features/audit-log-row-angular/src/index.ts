/**
 * Angular audit / activity / event-log row.
 *
 * Exports `<AuditLogRow>` (the `AuditLogRow` component class) and the
 * `AuditLogEntry` type — the Angular counterpart of
 * `@molecule/app-audit-log-row-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { AuditLogRow } from '@molecule/app-audit-log-row-angular'
 *
 * @Component({
 *   selector: 'app-audit-log',
 *   standalone: true,
 *   imports: [AuditLogRow],
 *   template: `
 *     <div
 *       mol-audit-log-row
 *       [entry]="{
 *         id: 'evt-001',
 *         actor: 'alice@example.com',
 *         action: 'updated',
 *         target: 'Invoice #1042',
 *         timestamp: '2 min ago',
 *         oldValue: 'Draft',
 *         newValue: 'Sent',
 *       }"
 *       [onClick]="openDetail"
 *     />
 *   `,
 * })
 * export class AuditLog {}
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap — rendering throws otherwise.
 * - `entry` fields are display nodes: pass pre-formatted, translated values as
 *   text (string / number), or an `ng-template` reference where a node would
 *   render (projected through `NgTemplateOutlet`).
 * - With `onClick` the row carries `role="button"` + `tabindex="0"` and Enter
 *   / Space activate it, like a native button; without it the row is static.
 *
 * @module
 */

export * from './audit-log-row.component.js'
export * from './types.js'
