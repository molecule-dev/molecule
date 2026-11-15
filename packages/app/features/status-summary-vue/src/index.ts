/**
 * Vue status-page summary.
 *
 * Exports `<StatusSummary>` — a grouped component list with colored
 * operational / degraded / outage badges and an overall banner derived from
 * the worst child status — plus the `ComponentStatus`, `StatusComponent`,
 * `StatusGroup` and `StatusSummaryProps` types.
 *
 * It is the Vue counterpart of `@molecule/app-status-summary-react`: the same
 * props (React names) and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { StatusSummary } from '@molecule/app-status-summary-vue'
 *
 * const Page = defineComponent({
 *   setup() {
 *     return () =>
 *       h(StatusSummary, {
 *         groups: [
 *           {
 *             id: 'api',
 *             name: 'API',
 *             components: [
 *               { id: 'rest', name: 'REST API', status: 'operational' },
 *               { id: 'ws', name: 'WebSockets', status: 'degraded' },
 *             ],
 *           },
 *         ],
 *       }, {
 *         header: () => [h('span', 'Last updated: 2 min ago')],
 *       })
 *   },
 * })
 *
 * createApp(Page).mount('#app')
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
 * - Node-valued props (`header`, `footer`) arrive as a prop AND a
 *   same-named slot; group and component names may be nodes too.
 *
 * @module
 */

export * from './StatusSummary.js'
export * from './types.js'
