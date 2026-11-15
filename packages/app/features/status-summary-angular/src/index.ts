/**
 * Angular status-page summary — the counterpart of
 * `@molecule/app-status-summary-react`: the same props and the same DOM for
 * the same input.
 *
 * Exports `<StatusSummary>` — a grouped component list with colored
 * operational / degraded / outage badges and an overall banner derived from
 * the worst child status — plus the `ComponentStatus`, `StatusComponent`,
 * `StatusGroup` and `StatusSummaryProps` types.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { StatusSummary } from '@molecule/app-status-summary-angular'
 *
 * @Component({
 *   selector: 'app-status-page',
 *   standalone: true,
 *   imports: [StatusSummary],
 *   template: `
 *     <div
 *       mol-status-summary
 *       [groups]="[
 *         {
 *           id: 'api',
 *           name: 'API',
 *           components: [
 *             { id: 'rest', name: 'REST API', status: 'operational' },
 *             { id: 'ws', name: 'WebSockets', status: 'degraded' }
 *           ]
 *         }
 *       ]"
 *     >
 *       <span slot="header">Last updated: 2 min ago</span>
 *     </div>
 *   `,
 * })
 * export class StatusPage {}
 * ```
 *
 * @remarks
 * - Must render inside the app's i18n provider and with a ClassMap bond
 *   wired (`useTranslation()` / `getClassMap()` throw otherwise).
 * - When `overallStatus` is omitted the banner shows the WORST status
 *   found across all components (major-outage > partial-outage >
 *   degraded > maintenance > operational).
 * - Status colors are a fixed hex palette applied via inline styles
 *   (green/yellow/orange/red/blue with white text) — they ignore the
 *   app theme and cannot be restyled via ClassMap; acceptable for
 *   status pages, but know they will not follow a rebrand.
 * - Status labels use `status.operational` … `status.maintenance` i18n
 *   keys with English fallbacks; no locale bond currently ships these
 *   keys, so register your own translations if the app is multilingual.
 * - Node props are projected content: `header` and `footer` are selected
 *   by `[slot=header]` / `[slot=footer]`. Group and component names may be
 *   `ng-template` references or plain text.
 *
 * @module
 */

export * from './status-summary.component.js'
export * from './types.js'
