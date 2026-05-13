/**
 * `@molecule/app-activity-timeline-react` — vertical timeline of events
 * (calls, emails, meetings, deal stages, shipment hops, milestones).
 *
 * Sister package to `@molecule/app-activity-feed-react` (which is a
 * flat avatar-prose list). Use this one when the chronological
 * sequencing of events is the main affordance — connector line + dots
 * make ordering obvious at a glance.
 *
 * Extracted from the crm and employee-onboarding flagships.
 *
 * @example
 * ```tsx
 * import { ActivityTimeline } from '@molecule/app-activity-timeline-react'
 * import { Link } from 'react-router-dom'
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
 *   rowWrapper={(event, children) => <Link to={`/activities/${event.id}`}>{children}</Link>}
 * />
 * ```
 *
 * @module
 */

export * from './ActivityTimeline.js'
export * from './ActivityTimelineDot.js'
export * from './ActivityTimelineRow.js'
export * from './types.js'
