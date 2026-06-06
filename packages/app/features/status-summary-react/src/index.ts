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
 * @module
 */

export * from './StatusSummary.js'
