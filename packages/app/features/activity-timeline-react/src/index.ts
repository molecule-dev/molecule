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
 * import { getClassMap } from '@molecule/app-ui'
 *
 * export function DealActivity() {
 *   const cm = getClassMap()
 *   const activities = [
 *     { id: 'a1', type: 'call', subject: 'Called Jane', notes: 'Left a voicemail', when: '2h ago' },
 *     { id: 'a2', type: 'email', subject: 'Sent the proposal', notes: 'Pricing v2 attached', when: 'Mar 5' },
 *   ]
 *   return (
 *     <ActivityTimeline
 *       events={activities.map((a) => ({
 *         id: a.id,
 *         kind: a.type,
 *         title: a.subject,
 *         description: a.notes,
 *         meta: a.when,
 *       }))}
 *       toneByKind={{
 *         call: { icon: 'call', dotClass: cm.bgPrimaryContainer, iconClass: cm.textOnPrimaryContainer },
 *         email: { icon: 'mail' },
 *       }}
 *       rowWrapper={(event, children) => <a href={`/activities/${event.id}`}>{children}</a>}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Needs a ClassMap bond.** It styles itself via `getClassMap()`, which throws unless the app
 *   called `setClassMap(classMap)` (from `@molecule/app-ui`, e.g. with `@molecule/app-ui-tailwind`)
 *   at startup.
 * - **Never pass raw CSS class strings** (`'bg-primary'`) as `dotClass`/`iconClass` — take them
 *   from `getClassMap()` (e.g. `cm.bgPrimaryContainer` + `cm.textOnPrimaryContainer`). Omit them
 *   to get the theme-aware default (`cm.bgPrimarySubtle` + `cm.textPrimary`).
 * - `icon` is a Material Symbols name (`'call'`, `'mail'`); without the Material Symbols Outlined
 *   font loaded (e.g. an `@molecule/app-fonts-*` bond) the raw name renders as text. Kinds missing
 *   from `toneByKind` fall back to `defaultTone`, then to the `'event'` icon.
 * - `occurredAt` and `href` on an event are NOT rendered — pass a pre-formatted `meta` label, and
 *   make rows clickable with `rowWrapper`. The component does not sort events.
 *
 * @module
 */

export * from './ActivityTimeline.js'
export * from './ActivityTimelineDot.js'
export * from './ActivityTimelineRow.js'
export * from './types.js'
