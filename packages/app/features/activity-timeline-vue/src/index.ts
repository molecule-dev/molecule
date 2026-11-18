/**
 * Vue vertical activity timeline — the Vue counterpart of
 * `@molecule/app-activity-timeline-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * A vertical timeline of events (calls, emails, meetings, deal stages,
 * shipment hops, milestones).
 *
 * Sister package to `@molecule/app-activity-feed-vue` (which is a flat
 * avatar-prose list). Use this one when the chronological sequencing of events
 * is the main affordance — connector line + dots make ordering obvious at a
 * glance.
 *
 * Extracted from the crm and employee-onboarding flagships.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { ActivityTimeline } from '@molecule/app-activity-timeline-vue'
 *
 * const Timeline = defineComponent({
 *   setup() {
 *     return () =>
 *       h(ActivityTimeline, {
 *         events: activities.map((a) => ({
 *           id: a.id,
 *           kind: a.type,
 *           title: a.subject,
 *           description: a.description,
 *           meta: a.due_date,
 *         })),
 *         toneByKind: {
 *           call: { icon: 'call', dotClass: 'bg-primary', iconClass: 'text-on-primary' },
 *           email: { icon: 'mail', dotClass: 'bg-secondary' },
 *         },
 *         rowWrapper: (event, children) =>
 *           h(RouterLink, { to: `/activities/${event.id}` }, () => children),
 *       })
 *   },
 * })
 *
 * createApp(Timeline).mount('#app')
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()`); rendering throws otherwise.
 * - Node-valued props (`header`, `footer`) arrive as a prop AND a same-named
 *   slot — the component accepts either, the slot winning. Node-valued event
 *   fields (`title`, `description`, `meta`, `footer`) are VNodes.
 * - `rowWrapper` receives the event and the row's content, as React's render
 *   prop does; its result replaces the row's content, so a wrapper that shows
 *   the row renders the `children` it is given.
 * - Rows are keyed by their `id`, so a re-passed or re-ordered event list keeps
 *   each row's DOM the way React's `key` does.
 *
 * @module
 */

export * from './ActivityTimeline.js'
export * from './ActivityTimelineDot.js'
export * from './ActivityTimelineRow.js'
export * from './types.js'
