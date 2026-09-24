/**
 * Status-page summary.
 *
 * Exports `<StatusSummary>`, `ComponentStatus`, `StatusComponent`, `StatusGroup` types.
 *
 * @example
 * ```tsx
 * import { type StatusGroup, StatusSummary } from '@molecule/app-status-summary-react'
 *
 * export function StatusPage() {
 *   const groups: StatusGroup[] = [
 *     {
 *       id: 'api',
 *       name: 'API',
 *       components: [
 *         { id: 'rest', name: 'REST API', status: 'operational', subtitle: '99.98% uptime' },
 *         { id: 'ws', name: 'WebSockets', status: 'degraded' },
 *       ],
 *     },
 *     {
 *       id: 'web',
 *       name: 'Website',
 *       components: [{ id: 'dashboard', name: 'Dashboard', status: 'operational' }],
 *     },
 *   ]
 *   return (
 *     <StatusSummary
 *       groups={groups}
 *       header={<span>Last updated: 2 min ago</span>}
 *       footer={<p>No incidents reported in the last 7 days.</p>}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Must render inside the app's i18n provider and with a ClassMap bond
 *   wired (`useTranslation()` / `getClassMap()` throw otherwise).
 * - `status` values are kebab-case: `'operational' | 'degraded' |
 *   'partial-outage' | 'major-outage' | 'maintenance'` (NOT `'down'`,
 *   `'outage'` or `'partialOutage'`).
 * - It is display-only: it does NOT fetch or poll health checks — load the
 *   data yourself and re-render.
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
 * - `header` renders inside the overall banner (last-updated stamp,
 *   subscribe button); `footer` renders below the grid (incident list).
 *
 * @module
 */

export * from './StatusSummary.js'
