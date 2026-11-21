/**
 * Angular moderation queue UI.
 *
 * Exports `<ModerationQueue>` — a list of flagged items with kind icon,
 * content preview, reason chip, severity color, per-row action buttons
 * (approve / reject / escalate / mute), and a bulk-select toolbar (select-all
 * checkbox + apply-to-selected action buttons) — and the `severityColor`
 * helper. It is the Angular counterpart of
 * `@molecule/app-moderation-queue-react`: same props (React names), same DOM
 * for the same input.
 *
 * All user-visible text is i18n'd via the companion locale bond
 * `@molecule/app-locales-moderation-queue`.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { ModerationQueue, type ModerationBulkAction } from '@molecule/app-moderation-queue-angular'
 *
 * @Component({
 *   selector: 'app-moderation',
 *   standalone: true,
 *   imports: [ModerationQueue],
 *   template: `
 *     <div
 *       mol-moderation-queue
 *       [items]="items"
 *       [onApprove]="approve"
 *       [onReject]="reject"
 *       [onEscalate]="escalate"
 *       [onMute]="mute"
 *       [onBulkAction]="bulk"
 *     />
 *   `,
 * })
 * export class Moderation {
 *   items = [
 *     {
 *       id: 'r-1',
 *       kind: 'comment',
 *       preview: 'Some flagged comment',
 *       reason: 'Hate speech',
 *       reportedBy: '@alice',
 *       reportedAt: '2 min ago',
 *       severity: 'high',
 *     },
 *   ]
 *   approve = (id: string) => api.approve(id)
 *   reject = (id: string) => api.reject(id)
 *   escalate = (id: string) => api.escalate(id)
 *   mute = (id: string) => api.mute(id)
 *   bulk = (action: ModerationBulkAction, ids: string[]) => api.bulk(action, ids)
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap — rendering throws otherwise.
 * - Node-valued item fields (`preview`, `reason`, `reportedBy`, `reportedAt`)
 *   and `emptyState` are `<ng-template>` refs or plain strings.
 * - Selection state is internal: the component reports a bulk action through
 *   `onBulkAction` and clears the selection afterwards.
 * - Rows are tracked by `item.id` (React's `key={item.id}`), so a row keeps its
 *   DOM node while its id is unchanged and moves with it on a reorder.
 *
 * @module
 */

export * from './moderation-queue.component.js'
export * from './types.js'
