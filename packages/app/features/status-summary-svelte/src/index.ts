/**
 * Svelte status-page summary.
 *
 * Exports `StatusSummary` — a grouped component list with colored
 * operational / degraded / outage badges and an overall banner derived from
 * the worst child status — plus the `ComponentStatus`, `StatusComponent`,
 * `StatusGroup` and `StatusSummaryProps` types.
 *
 * It is the Svelte counterpart of `@molecule/app-status-summary-react`: the
 * same props (React names) and the same DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { StatusSummary } from '@molecule/app-status-summary-svelte'
 *
 *   const groups = [
 *     {
 *       id: 'api',
 *       name: 'API',
 *       components: [
 *         { id: 'rest', name: 'REST API', status: 'operational' },
 *         { id: 'ws', name: 'WebSockets', status: 'degraded' },
 *       ],
 *     },
 *   ]
 * </script>
 *
 * <StatusSummary {groups}>
 *   {#snippet header()}
 *     <span>Last updated: 2 min ago</span>
 *   {/snippet}
 * </StatusSummary>
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
 * - Status labels use the `status.operational` … `status.maintenance` i18n
 *   keys, which the `common` locale bond ships in every language; the
 *   English fallbacks in code match its en.ts.
 * - `header` renders inside the overall banner (last-updated stamp,
 *   subscribe button); `footer` renders below the grid (incident list).
 *   Group and component names may be plain text or snippets.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
