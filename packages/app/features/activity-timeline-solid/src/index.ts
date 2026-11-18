/**
 * Solid vertical activity timeline — the Solid counterpart of
 * `@molecule/app-activity-timeline-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * A vertical timeline of events (calls, emails, meetings, deal stages,
 * shipment hops, milestones).
 *
 * Sister package to `@molecule/app-activity-feed-solid` (which is a flat
 * avatar-prose list). Use this one when the chronological sequencing of events
 * is the main affordance — connector line + dots make ordering obvious at a
 * glance.
 *
 * Extracted from the crm and employee-onboarding flagships.
 *
 * @example
 * ```tsx
 * import { ActivityTimeline } from '@molecule/app-activity-timeline-solid'
 * import { A } from '@molecule/app-solid'
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
 *   rowWrapper={(event, children) => <A href={`/activities/${event.id}`}>{children}</A>}
 * />
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()`); rendering throws otherwise.
 * - Node-valued props (`header`, `footer`) are JSX values, as React passes
 *   `ReactNode`s.
 * - `rowWrapper` receives the event and the row's content, as React's render
 *   prop does; its result replaces the row's content, so a wrapper that shows
 *   the row renders the `children` it is given.
 * - Rows are keyed by `event.id` through stable per-id records (Solid's `For`
 *   keys by reference), so a re-passed or re-ordered event list keeps each
 *   row's DOM the way React's `key` does.
 *
 * @module
 */

export * from './ActivityTimeline.jsx'
export * from './ActivityTimelineDot.jsx'
export * from './ActivityTimelineRow.jsx'
export * from './types.js'
