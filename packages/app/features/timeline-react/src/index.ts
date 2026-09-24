/**
 * React chronological timeline primitives.
 *
 * Exports:
 * - `<Timeline>` — vertical list of events with optional date separators.
 * - `<TimelineEvent>` — one event row with rail (marker + connector) + content.
 * - `<TimelineRail>` — standalone rail (marker + connector) for custom rows.
 * - `<TimelineDate>` — date separator rendered between groups.
 * - `TimelineEventData` type for event records.
 *
 * Use for activity chronologies, deal timelines, order tracking, audit logs.
 *
 * @example
 * ```tsx
 * import { Timeline, TimelineDate, type TimelineEventData } from '@molecule/app-timeline-react'
 *
 * export function OrderActivity() {
 *   const activity = [
 *     { id: 'a1', at: '2026-03-12T09:15:00Z', title: 'Order placed' },
 *     { id: 'a2', at: '2026-03-12T09:16:00Z', title: 'Payment confirmed', body: 'Visa ending 4242' },
 *     { id: 'a3', at: '2026-03-13T14:02:00Z', title: 'Item shipped' },
 *   ]
 *   const day = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
 *   const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
 *   const dayOf = new Map(activity.map((a) => [a.id, day.format(new Date(a.at))]))
 *   const events: TimelineEventData[] = activity.map((a) => ({
 *     id: a.id,
 *     timestamp: time.format(new Date(a.at)),
 *     title: a.title,
 *     body: a.body,
 *   }))
 *   return (
 *     <Timeline
 *       events={events}
 *       renderDateSeparator={(event, prev) =>
 *         !prev || dayOf.get(event.id) !== dayOf.get(prev.id) ? <TimelineDate>{dayOf.get(event.id)}</TimelineDate> : null
 *       }
 *       emptyState={<p>No activity yet.</p>}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond (`setClassMap(classMap)` from
 * `@molecule/app-ui`; `getClassMap()` throws otherwise). No i18n provider
 * is needed — it renders no text of its own.
 *
 * It does NOT sort or group events: they render in array order, and date
 * headers appear only where your `renderDateSeparator(event, prev)` returns
 * a node (it gets `prev === undefined` for the first event). `events` holds
 * only `TimelineEventData` fields, so keep extra per-event data (like the
 * day key in the example) in your own lookup.
 *
 * This is NOT the React binding for `@molecule/app-timeline` (the headless
 * provider core wired via `setProvider`) — it is standalone presentational
 * markup with no provider. For domain-specific rows see the sibling
 * `@molecule/app-{activity,order,status,stage,day}-timeline-react` packages.
 *
 * `TimelineEventData.accent` is currently INERT — no component reads it, so
 * setting it changes nothing; color a row by passing a custom `marker` node
 * instead. `timestamp` is a display node — format/translate it before
 * passing. The prop surface (documented on the exported `TimelineProps`,
 * `TimelineEventProps`, `TimelineRailProps` and `TimelineDateProps`
 * interfaces): Timeline(events, renderDateSeparator, emptyState, className),
 * TimelineEvent(event, isLast, className), TimelineRail(marker, connector,
 * className), TimelineDate(children, className).
 *
 * @module
 */

export * from './Timeline.js'
export * from './TimelineDate.js'
export * from './TimelineEvent.js'
export * from './TimelineRail.js'
export * from './types.js'
