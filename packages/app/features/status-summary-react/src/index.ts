/**
 * Status-page summary.
 *
 * Exports `<StatusSummary>`, `ComponentStatus`, `StatusComponent`, `StatusGroup` types.
 *
 * @example
 * ```tsx
 * import { StatusSummary } from '@molecule/app-status-summary-react'
 *
 * <StatusSummary
 *   groups={[
 *     {
 *       id: 'api',
 *       name: 'API',
 *       components: [
 *         { id: 'rest', name: 'REST API', status: 'operational' },
 *         { id: 'ws', name: 'WebSockets', status: 'degraded' },
 *       ],
 *     },
 *   ]}
 *   header={<span>Last updated: 2 min ago</span>}
 * />
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
 * - `header` renders inside the overall banner (last-updated stamp,
 *   subscribe button); `footer` renders below the grid (incident list).
 *
 * @module
 */

export * from './StatusSummary.js'
