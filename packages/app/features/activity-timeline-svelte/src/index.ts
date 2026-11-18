/**
 * Svelte vertical activity timeline — the Svelte counterpart of
 * `@molecule/app-activity-timeline-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * A vertical timeline of events (calls, emails, meetings, deal stages,
 * shipment hops, milestones).
 *
 * Sister package to `@molecule/app-activity-feed-svelte` (which is a flat
 * avatar-prose list). Use this one when the chronological sequencing of events
 * is the main affordance — connector line + dots make ordering obvious at a
 * glance.
 *
 * Extracted from the crm and employee-onboarding flagships.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { ActivityTimeline } from '@molecule/app-activity-timeline-svelte'
 * </script>
 *
 * <ActivityTimeline
 *   events={activities.map((a) => ({
 *     id: a.id, kind: a.type, title: a.subject,
 *     description: a.description, meta: a.due_date,
 *   }))}
 *   toneByKind={{
 *     call: { icon: 'call', dotClass: 'bg-primary', iconClass: 'text-on-primary' },
 *     email: { icon: 'mail', dotClass: 'bg-secondary' },
 *   }}
 * >
 *   {#snippet header()}
 *     <h2>Recent activity</h2>
 *   {/snippet}
 * </ActivityTimeline>
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()`); rendering throws otherwise.
 * - Node-valued props (`header`, `footer`, and the event fields `title`,
 *   `description`, `meta`, `footer`) are snippets; a plain string or number
 *   renders as text, as React renders it.
 * - `rowWrapper` is a snippet called with the event and the row's own content,
 *   as React's render prop is; its result replaces the row's content, so a
 *   wrapper that shows the row renders the `children` snippet it is given.
 * - Rows are keyed by their `id` (a keyed each block), so a re-passed or
 *   re-ordered event list keeps each row's DOM the way React's `key` does.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
